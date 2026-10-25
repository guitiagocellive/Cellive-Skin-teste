/* GET /api/painel                — números do painel (precisa da senha).
   GET /api/painel?formato=csv    — baixa os eventos do período em CSV.
   A senha fica na variável PAINEL_SENHA (Vercel > Settings > Environment Variables). */
import { autorizado, banco, json } from "./_db.js";

const FUSO = "America/Sao_Paulo";
const DIA = `to_char(to_timestamp(ts / 1000.0) AT TIME ZONE '${FUSO}', 'YYYY-MM-DD')`;
const HORA = `EXTRACT(HOUR FROM to_timestamp(ts / 1000.0) AT TIME ZONE '${FUSO}')::int`;
const SEMANA = `EXTRACT(DOW FROM to_timestamp(ts / 1000.0) AT TIME ZONE '${FUSO}')::int`;
const MS = "(extra->>'ms')::numeric";

// Campos que são texto (os outros números chegam como texto do Postgres e viram número)
const TEXTO = new Set(["valor", "etapa", "nome", "pagina", "dia", "campo", "v"]);
function numeros(linhas) {
  return linhas.map((l) => {
    const o = {};
    for (const k in l) {
      const v = l[k];
      o[k] = !TEXTO.has(k) && typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    }
    return o;
  });
}

// Troca os "?" da consulta por $1, $2...
function sql(texto) {
  let i = 0;
  return texto.replace(/\?/g, () => "$" + ++i);
}

const ehV2 = (url) => url.searchParams.get("versao") === "v2";

function filtros(url, deslocamento = 0) {
  const de = Number(url.searchParams.get("de")) || 0;
  const ate = Number(url.searchParams.get("ate")) || Date.now();
  const dur = ate - de;
  const cond = ["ts >= ?", "ts < ?"];
  const args = [de - deslocamento * dur, ate - deslocamento * dur];
  for (const campo of ["fonte", "campanha", "aparelho"]) {
    const v = url.searchParams.get(campo);
    if (v) { cond.push(`${campo} = ?`); args.push(v); }
  }
  // versão do funil: "v2" = oferta direta (anúncios); padrão = funil com quiz
  cond.push(ehV2(url) ? "versao = 'v2'" : "versao IS DISTINCT FROM 'v2'");
  return { where: cond.join(" AND "), args };
}

/* Números do painel para um período/filtro (objeto simples).
   Usado pelo GET abaixo e pelo agente estrategista (api/agente.js). */
export async function dadosPainel(q, url) {
  const todos = async (texto, args) => numeros(await q(sql(texto), args));
  const F = filtros(url), ANT = filtros(url, 1);
  const W = F.where, A = F.args;
  // "visita" = abriu a primeira página do funil (capa/quiz; na v2, a própria oferta)
  const ENTRADA = ehV2(url) ? "pagina = 'oferta'" : "pagina IN ('capa','quiz')";

  const kpiSql = (w) => `SELECT
      COUNT(DISTINCT sessao) AS sessoes,
      COUNT(DISTINCT visitante) AS visitantes,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND ${ENTRADA} THEN sessao END) AS entrada,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='capa' THEN sessao END) AS capa,
      COUNT(DISTINCT CASE WHEN tipo='clique' AND etapa='cta-capa' THEN sessao END) AS cta_capa,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='quiz' THEN sessao END) AS quiz,
      COUNT(DISTINCT CASE WHEN tipo='resposta' THEN sessao END) AS iniciaram,
      COUNT(DISTINCT CASE WHEN tipo='etapa' AND etapa='montagem' THEN sessao END) AS concluiram,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='oferta' THEN sessao END) AS oferta,
      COUNT(DISTINCT CASE WHEN tipo='secao' AND etapa='planos' THEN sessao END) AS viram_planos,
      COUNT(DISTINCT CASE WHEN tipo='plano' THEN sessao END) AS escolheram_plano,
      COUNT(DISTINCT CASE WHEN tipo='checkout' THEN sessao END) AS checkout,
      COALESCE(SUM(CASE WHEN tipo='checkout' THEN 1 ELSE 0 END), 0) AS checkout_cliques
    FROM eventos WHERE ${w}`;
  const conv = `SELECT DISTINCT sessao FROM eventos WHERE tipo='checkout' AND ${W}`;
  const ha90 = Date.now() - 90 * 864e5;
  const origem = (c) => todos(`SELECT COALESCE(${c},'(sem)') AS nome,
      COUNT(DISTINCT sessao) AS visitas,
      COUNT(DISTINCT CASE WHEN tipo='resposta' THEN sessao END) AS iniciaram,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='oferta' THEN sessao END) AS formulas,
      COUNT(DISTINCT CASE WHEN tipo='checkout' THEN sessao END) AS checkouts
    FROM eventos WHERE ${W} GROUP BY 1 ORDER BY visitas DESC LIMIT 30`, A);

  const [
    kpi, kpiAnt, diario, etapas, paradas, respostas, tempoPergunta, planos, checkoutPlano, secoes, cliques,
    porFonte, porCampanha, porAparelho, porSistema, porPais, porHora, duracoes, tempoOferta, rolagem, opcoes, aoVivo, erros, novos,
  ] = await Promise.all([
    todos(kpiSql(W), A),
    todos(kpiSql(ANT.where), ANT.args),
    todos(`SELECT ${DIA} AS dia,
        COUNT(DISTINCT CASE WHEN tipo='pagina' AND ${ENTRADA} THEN sessao END) AS visitas,
        COUNT(DISTINCT CASE WHEN tipo='resposta' THEN sessao END) AS iniciaram,
        COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='oferta' THEN sessao END) AS formulas,
        COUNT(DISTINCT CASE WHEN tipo='checkout' THEN sessao END) AS checkouts
      FROM eventos WHERE ${W} GROUP BY 1 ORDER BY 1`, A),
    todos(`SELECT etapa, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='etapa' AND ${W} GROUP BY etapa`, A),
    // onde cada sessão parou: a última tela do quiz de quem não chegou na oferta
    todos(`WITH ultimas AS (
        SELECT sessao, etapa, ROW_NUMBER() OVER (PARTITION BY sessao ORDER BY id DESC) AS r
        FROM eventos WHERE tipo='etapa' AND ${W})
      SELECT etapa, COUNT(*) AS n FROM ultimas
      WHERE r = 1 AND sessao NOT IN (SELECT sessao FROM eventos WHERE tipo='pagina' AND pagina='oferta' AND ${W})
      GROUP BY etapa`, [...A, ...A]),
    // última resposta de cada sessão em cada pergunta, e quantas foram ao checkout
    todos(`WITH ult AS (
        SELECT sessao, etapa, valor, ROW_NUMBER() OVER (PARTITION BY sessao, etapa ORDER BY id DESC) AS r
        FROM eventos WHERE tipo='resposta' AND ${W})
      SELECT etapa, valor, COUNT(*) AS n,
        SUM(CASE WHEN sessao IN (${conv}) THEN 1 ELSE 0 END) AS conv
      FROM ult WHERE r = 1 GROUP BY etapa, valor`, [...A, ...A]),
    todos(`SELECT etapa, AVG(${MS})::float AS ms, COUNT(*) AS n
      FROM eventos WHERE tipo='resposta' AND ${MS} < 600000 AND ${W} GROUP BY etapa`, A),
    todos(`SELECT valor, COUNT(DISTINCT sessao) AS n, COUNT(*) AS cliques FROM eventos WHERE tipo='plano' AND ${W} GROUP BY valor`, A),
    todos(`SELECT valor, COUNT(DISTINCT sessao) AS n, COUNT(*) AS cliques FROM eventos WHERE tipo='checkout' AND ${W} GROUP BY valor`, A),
    todos(`SELECT etapa, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='secao' AND ${W} GROUP BY etapa`, A),
    todos(`SELECT pagina, etapa, valor, COUNT(*) AS cliques, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='clique' AND ${W} GROUP BY pagina, etapa, valor`, A),
    origem("fonte"), origem("campanha"), origem("aparelho"), origem("sistema"), origem("pais"),
    todos(`SELECT ${HORA} AS hora, ${SEMANA} AS semana, COUNT(DISTINCT sessao) AS n
      FROM eventos WHERE tipo='pagina' AND ${W} GROUP BY 1, 2`, A),
    todos(`SELECT valor::bigint AS ms FROM eventos WHERE tipo='quiz_fim' AND valor ~ '^[0-9]+$' AND ${W} ORDER BY 1 LIMIT 20000`, A),
    todos(`SELECT ${MS}::bigint AS ms FROM eventos WHERE tipo='saida' AND pagina='oferta' AND jsonb_exists(extra, 'ms') AND ${W} ORDER BY 1 LIMIT 20000`, A),
    todos(`SELECT pagina, (extra->>'rolagem')::int AS r FROM eventos WHERE tipo='saida' AND ${W} LIMIT 40000`, A),
    todos(`SELECT 'fonte' AS campo, fonte AS v FROM eventos WHERE ts >= ? GROUP BY fonte
      UNION ALL SELECT 'campanha', campanha FROM eventos WHERE ts >= ? AND campanha IS NOT NULL GROUP BY campanha
      UNION ALL SELECT 'aparelho', aparelho FROM eventos WHERE ts >= ? GROUP BY aparelho`, [ha90, ha90, ha90]),
    todos(`SELECT COUNT(DISTINCT sessao) AS n FROM eventos WHERE ts >= ?`, [Date.now() - 5 * 60e3]),
    todos(`SELECT valor, COUNT(*) AS n FROM eventos WHERE tipo='erro' AND ${W} GROUP BY valor ORDER BY n DESC LIMIT 10`, A),
    todos(`SELECT CASE WHEN novo THEN 1 ELSE 0 END AS novo, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='pagina' AND ${W} GROUP BY 1`, A),
  ]);

  return {
    gerado: Date.now(),
    versao: ehV2(url) ? "v2" : "v1",
    ia: !!process.env.ANTHROPIC_API_KEY, // a análise com o Claude está ligada?
    kpi: kpi[0], kpiAnt: kpiAnt[0], diario, etapas, paradas, respostas, tempoPergunta, planos, checkoutPlano, secoes, cliques,
    origem: { fonte: porFonte, campanha: porCampanha, aparelho: porAparelho, sistema: porSistema, pais: porPais },
    porHora, duracoes: duracoes.map((d) => d.ms), tempoOferta: tempoOferta.map((d) => d.ms), rolagem, opcoes, aoVivo: aoVivo[0].n, erros, novos,
  };
}

async function csv(q, url) {
  const F = filtros(url);
  const linhas = await q(sql(`SELECT * FROM eventos WHERE ${F.where} ORDER BY id LIMIT 100000`), F.args);
  const cols = ["id", "ts", "visitante", "sessao", "tipo", "pagina", "etapa", "valor", "extra", "fonte", "campanha", "midia", "conteudo", "aparelho", "sistema", "navegador", "pais", "novo", "versao"];
  const texto = (v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  const esc = (v) => { const t = texto(v); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const corpo = [cols.concat("data_hora").join(",")]
    .concat(linhas.map((l) => cols.map((c) => esc(l[c])).concat(new Date(Number(l.ts)).toISOString()).join(",")))
    .join("\n");
  return new Response("﻿" + corpo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="cellive-eventos.csv"',
      "cache-control": "no-store",
    },
  });
}

export async function GET(request) {
  const a = autorizado(request);
  if (a === "sem-senha") return json({ erro: "sem-senha" }, 503);
  if (a !== "ok") return json({ erro: "senha" }, 401);
  let q;
  try { q = await banco(); } catch (e) { return json({ erro: "sem-banco", detalhe: String(e && e.message) }, 503); }
  if (!q) return json({ erro: "sem-banco" }, 503);
  const url = new URL(request.url);
  try {
    return url.searchParams.get("formato") === "csv" ? await csv(q, url) : json(await dadosPainel(q, url));
  } catch (e) {
    return json({ erro: "falha", detalhe: String(e && e.message) }, 500);
  }
}
