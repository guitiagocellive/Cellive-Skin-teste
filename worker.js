/* Cellive Skin — servidor do site (Cloudflare Worker).
   - Serve as páginas estáticas (pasta do projeto).
   - POST /api/evento   recebe os eventos de rastreamento e grava no banco (D1).
   - GET  /api/painel   devolve os números do painel (precisa da senha).
   - GET  /api/painel/csv  baixa os eventos do período em CSV (precisa da senha).
   A senha do painel fica no segredo PAINEL_SENHA (Cloudflare > Worker >
   Configurações > Variáveis e segredos). */

const FUSO = "-3 hours"; // horário de Brasília para agrupar por dia e hora

const TIPOS = new Set(["pagina", "etapa", "resposta", "voltar", "quiz_fim", "secao", "plano", "checkout", "clique", "saida", "erro"]);

let tabelaPronta = false;

async function prepararBanco(db) {
  if (tabelaPronta) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      visitante TEXT, sessao TEXT NOT NULL,
      tipo TEXT NOT NULL, pagina TEXT, etapa TEXT, valor TEXT, extra TEXT,
      fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT,
      aparelho TEXT, sistema TEXT, navegador TEXT, pais TEXT, novo INTEGER
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS ev_ts ON eventos(ts)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ev_sessao ON eventos(sessao, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS ev_tipo ON eventos(tipo, ts)"),
  ]);
  tabelaPronta = true;
}

const corta = (v, n) => (v == null ? null : String(v).slice(0, n));

function json(dados, status = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

/* ---------------- Recebe eventos ---------------- */
async function receberEventos(request, env) {
  if (!env.DB) return json({ ok: false, erro: "sem banco" }, 503);
  let lista;
  try {
    const texto = await request.text();
    if (texto.length > 60000) return json({ ok: false }, 413);
    lista = JSON.parse(texto);
  } catch (e) {
    return json({ ok: false }, 400);
  }
  if (!Array.isArray(lista)) lista = [lista];
  lista = lista.slice(0, 60).filter((e) => e && TIPOS.has(e.t) && typeof e.s === "string");
  if (!lista.length) return json({ ok: true, n: 0 });

  await prepararBanco(env.DB);
  const pais = (request.cf && request.cf.country) || null;
  const agora = Date.now();
  const sql = env.DB.prepare(`INSERT INTO eventos
    (ts, visitante, sessao, tipo, pagina, etapa, valor, extra, fonte, campanha, midia, conteudo, aparelho, sistema, navegador, pais, novo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const lote = lista.map((e) => {
    // usa a hora do aparelho só se for próxima da do servidor (eventos enviados em lote)
    const ts = typeof e.ts === "number" && Math.abs(agora - e.ts) < 6 * 3600e3 ? e.ts : agora;
    return sql.bind(
      ts, corta(e.v, 40), corta(e.s, 40), e.t, corta(e.p, 40), corta(e.e, 80), corta(e.val, 300),
      e.x ? corta(JSON.stringify(e.x), 500) : null,
      corta(e.u && e.u.fonte, 80) || "direto", corta(e.u && e.u.campanha, 120), corta(e.u && e.u.midia, 80), corta(e.u && e.u.conteudo, 120),
      corta(e.ap, 20), corta(e.so, 20), corta(e.nav, 20), corta(pais, 4), e.novo ? 1 : 0
    );
  });
  await env.DB.batch(lote);
  return json({ ok: true, n: lote.length });
}

/* ---------------- Painel ---------------- */
function autorizado(request, env) {
  if (!env.PAINEL_SENHA) return "sem-senha";
  const cab = request.headers.get("authorization") || "";
  const senha = cab.replace(/^Bearer\s+/i, "");
  // comparação em tempo constante
  const a = new TextEncoder().encode(senha), b = new TextEncoder().encode(env.PAINEL_SENHA);
  if (a.length !== b.length) return "negado";
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0 ? "ok" : "negado";
}

// Filtros comuns: período (ms) e atributos da sessão
function filtros(url, deslocamento = 0) {
  const de = Number(url.searchParams.get("de")) || 0;
  const ate = Number(url.searchParams.get("ate")) || Date.now();
  const dur = ate - de;
  const cond = ["ts >= ?", "ts < ?"];
  const args = [de - deslocamento * dur, ate - deslocamento * dur];
  for (const [campo, nome] of [["fonte", "fonte"], ["campanha", "campanha"], ["aparelho", "aparelho"]]) {
    const v = url.searchParams.get(nome);
    if (v) { cond.push(`${campo} = ?`); args.push(v); }
  }
  return { where: cond.join(" AND "), args };
}

async function todos(db, sql, args) {
  const r = await db.prepare(sql).bind(...args).all();
  return r.results || [];
}

async function painel(url, env) {
  const db = env.DB;
  await prepararBanco(db);
  const F = filtros(url);
  const W = F.where, A = F.args;
  const ANT = filtros(url, 1);

  const kpiSql = (w) => `SELECT
      COUNT(DISTINCT sessao) AS sessoes,
      COUNT(DISTINCT visitante) AS visitantes,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='capa' THEN sessao END) AS capa,
      COUNT(DISTINCT CASE WHEN tipo='clique' AND etapa='cta-capa' THEN sessao END) AS cta_capa,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='quiz' THEN sessao END) AS quiz,
      COUNT(DISTINCT CASE WHEN tipo='resposta' THEN sessao END) AS iniciaram,
      COUNT(DISTINCT CASE WHEN tipo='etapa' AND etapa='montagem' THEN sessao END) AS concluiram,
      COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='oferta' THEN sessao END) AS oferta,
      COUNT(DISTINCT CASE WHEN tipo='secao' AND etapa='planos' THEN sessao END) AS viram_planos,
      COUNT(DISTINCT CASE WHEN tipo='plano' THEN sessao END) AS escolheram_plano,
      COUNT(DISTINCT CASE WHEN tipo='checkout' THEN sessao END) AS checkout,
      SUM(CASE WHEN tipo='checkout' THEN 1 ELSE 0 END) AS checkout_cliques
    FROM eventos WHERE ${w}`;

  const conv = `SELECT DISTINCT sessao FROM eventos WHERE tipo='checkout' AND ${W}`;

  const [
    kpi, kpiAnt, diario, etapas, paradas, respostas, tempoPergunta, planos, checkoutPlano, secoes, cliques,
    porFonte, porCampanha, porAparelho, porSistema, porPais, porHora, duracoes, tempoOferta, rolagem, opcoes, aoVivo, erros, novos,
  ] = await Promise.all([
    todos(db, kpiSql(W), A),
    todos(db, kpiSql(ANT.where), ANT.args),
    todos(db, `SELECT date(ts/1000,'unixepoch','${FUSO}') AS dia,
        COUNT(DISTINCT sessao) AS visitas,
        COUNT(DISTINCT CASE WHEN tipo='resposta' THEN sessao END) AS iniciaram,
        COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='oferta' THEN sessao END) AS formulas,
        COUNT(DISTINCT CASE WHEN tipo='checkout' THEN sessao END) AS checkouts
      FROM eventos WHERE ${W} GROUP BY dia ORDER BY dia`, A),
    todos(db, `SELECT etapa, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='etapa' AND ${W} GROUP BY etapa`, A),
    // onde cada sessão parou: a última etapa do quiz de quem não chegou na oferta
    todos(db, `WITH ultimas AS (
        SELECT sessao, etapa, ROW_NUMBER() OVER (PARTITION BY sessao ORDER BY id DESC) AS r
        FROM eventos WHERE tipo='etapa' AND ${W})
      SELECT etapa, COUNT(*) AS n FROM ultimas
      WHERE r = 1 AND sessao NOT IN (SELECT sessao FROM eventos WHERE tipo='pagina' AND pagina='oferta' AND ${W})
      GROUP BY etapa`, [...A, ...A]),
    // última resposta de cada sessão em cada pergunta, e quantas dessas foram ao checkout
    todos(db, `WITH ult AS (
        SELECT sessao, etapa, valor, ROW_NUMBER() OVER (PARTITION BY sessao, etapa ORDER BY id DESC) AS r
        FROM eventos WHERE tipo='resposta' AND ${W})
      SELECT etapa, valor, COUNT(*) AS n,
        SUM(CASE WHEN sessao IN (${conv}) THEN 1 ELSE 0 END) AS conv
      FROM ult WHERE r = 1 GROUP BY etapa, valor`, [...A, ...A]),
    todos(db, `SELECT etapa, AVG(CAST(json_extract(extra,'$.ms') AS REAL)) AS ms, COUNT(*) AS n
      FROM eventos WHERE tipo='resposta' AND json_extract(extra,'$.ms') < 600000 AND ${W} GROUP BY etapa`, A),
    todos(db, `SELECT valor, COUNT(DISTINCT sessao) AS n, COUNT(*) AS cliques FROM eventos WHERE tipo='plano' AND ${W} GROUP BY valor`, A),
    todos(db, `SELECT valor, COUNT(DISTINCT sessao) AS n, COUNT(*) AS cliques FROM eventos WHERE tipo='checkout' AND ${W} GROUP BY valor`, A),
    todos(db, `SELECT etapa, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='secao' AND ${W} GROUP BY etapa`, A),
    todos(db, `SELECT pagina, etapa, valor, COUNT(*) AS cliques, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='clique' AND ${W} GROUP BY pagina, etapa, valor`, A),
    ...["fonte", "campanha", "aparelho", "sistema", "pais"].map((c) =>
      todos(db, `SELECT COALESCE(${c},'(sem)') AS nome,
          COUNT(DISTINCT sessao) AS visitas,
          COUNT(DISTINCT CASE WHEN tipo='resposta' THEN sessao END) AS iniciaram,
          COUNT(DISTINCT CASE WHEN tipo='pagina' AND pagina='oferta' THEN sessao END) AS formulas,
          COUNT(DISTINCT CASE WHEN tipo='checkout' THEN sessao END) AS checkouts
        FROM eventos WHERE ${W} GROUP BY nome ORDER BY visitas DESC LIMIT 30`, A)
    ),
    todos(db, `SELECT CAST(strftime('%H', ts/1000,'unixepoch','${FUSO}') AS INTEGER) AS hora,
        CAST(strftime('%w', ts/1000,'unixepoch','${FUSO}') AS INTEGER) AS semana,
        COUNT(DISTINCT sessao) AS n
      FROM eventos WHERE tipo='pagina' AND ${W} GROUP BY hora, semana`, A),
    todos(db, `SELECT CAST(valor AS INTEGER) AS ms FROM eventos WHERE tipo='quiz_fim' AND ${W} ORDER BY ms LIMIT 20000`, A),
    todos(db, `SELECT CAST(json_extract(extra,'$.ms') AS INTEGER) AS ms FROM eventos WHERE tipo='saida' AND pagina='oferta' AND ${W} ORDER BY ms LIMIT 20000`, A),
    todos(db, `SELECT pagina, CAST(json_extract(extra,'$.rolagem') AS INTEGER) AS r FROM eventos WHERE tipo='saida' AND ${W} LIMIT 40000`, A),
    todos(db, `SELECT 'fonte' AS campo, fonte AS v FROM eventos WHERE ts >= ? GROUP BY fonte
      UNION ALL SELECT 'campanha', campanha FROM eventos WHERE ts >= ? AND campanha IS NOT NULL GROUP BY campanha
      UNION ALL SELECT 'aparelho', aparelho FROM eventos WHERE ts >= ? GROUP BY aparelho`, [Date.now() - 90 * 864e5, Date.now() - 90 * 864e5, Date.now() - 90 * 864e5]),
    todos(db, `SELECT COUNT(DISTINCT sessao) AS n FROM eventos WHERE ts >= ?`, [Date.now() - 5 * 60e3]),
    todos(db, `SELECT valor, COUNT(*) AS n FROM eventos WHERE tipo='erro' AND ${W} GROUP BY valor ORDER BY n DESC LIMIT 10`, A),
    todos(db, `SELECT novo, COUNT(DISTINCT sessao) AS n FROM eventos WHERE tipo='pagina' AND ${W} GROUP BY novo`, A),
  ]);

  return json({
    gerado: Date.now(),
    kpi: kpi[0], kpiAnt: kpiAnt[0], diario, etapas, paradas, respostas, tempoPergunta, planos, checkoutPlano, secoes, cliques,
    origem: { fonte: porFonte, campanha: porCampanha, aparelho: porAparelho, sistema: porSistema, pais: porPais },
    porHora, duracoes: duracoes.map((d) => d.ms), tempoOferta: tempoOferta.map((d) => d.ms), rolagem, opcoes, aoVivo: aoVivo[0].n, erros, novos,
  });
}

async function csv(url, env) {
  await prepararBanco(env.DB);
  const F = filtros(url);
  const linhas = await todos(env.DB, `SELECT * FROM eventos WHERE ${F.where} ORDER BY id LIMIT 100000`, F.args);
  const cols = ["id", "ts", "visitante", "sessao", "tipo", "pagina", "etapa", "valor", "extra", "fonte", "campanha", "midia", "conteudo", "aparelho", "sistema", "navegador", "pais", "novo"];
  const esc = (v) => (v == null ? "" : /[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
  const corpo = [cols.concat("data_hora").join(",")]
    .concat(linhas.map((l) => cols.map((c) => esc(l[c])).concat(new Date(l.ts).toISOString()).join(",")))
    .join("\n");
  return new Response("﻿" + corpo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cellive-eventos.csv"`,
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/evento") {
      if (request.method !== "POST") return json({ ok: false }, 405);
      try { return await receberEventos(request, env); } catch (e) { return json({ ok: false }, 500); }
    }

    if (url.pathname === "/api/painel" || url.pathname === "/api/painel/csv") {
      const a = autorizado(request, env);
      if (a === "sem-senha") return json({ erro: "sem-senha" }, 503);
      if (a !== "ok") return json({ erro: "senha" }, 401);
      if (!env.DB) return json({ erro: "sem-banco" }, 503);
      try {
        return url.pathname.endsWith("/csv") ? await csv(url, env) : await painel(url, env);
      } catch (e) {
        return json({ erro: "falha", detalhe: String(e && e.message) }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
