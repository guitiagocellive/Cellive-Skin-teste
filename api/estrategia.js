/* GET  /api/estrategia?de=<ms>&ate=<ms> — números para a aba "Estratégia" do painel (senha do painel).
   POST /api/estrategia — salva os custos usados no lucro estimado: { custo_frasco, frete_pedido, imposto_pct }.

   Cruza o rastreio do site (tabela eventos) com as vendas da B4You (vendas_b4you, via _vendas.js):
   - comparativo: período escolhido × período anterior do mesmo tamanho;
   - lucro estimado: o que você recebe − gasto na Meta − custo dos frascos − frete − impostos;
   - campanhas e anúncios: visitas, cliques em comprar, vendas, faturamento e (com a Meta ligada) gasto,
     retorno e custo por venda, cruzados pelo nome (utm_campaign / utm_content);
   - o que faz vender: taxa de clique em comprar de quem viu × quem não viu cada seção da oferta;
   - jornada do comprador: tempo e número de visitas até comprar, aparelho, primeira fonte × última;
   - kits: cliques em comprar × vendas de cada kit;
   - horários: vendas e cliques por dia da semana e hora (Brasília).
   Vendas ligadas a uma visita só existem a partir de quando o site passou a mandar src/sck ao checkout. */
import { autorizado, banco, json } from "./_db.js";
import { insightsMeta, gastoPorNivel } from "./_meta.js";
import { lerVendas, frascosDaVenda } from "./_vendas.js";

const PADRAO = { custo_frasco: 0, frete_pedido: 0, imposto_pct: 0 };
const BR = (ms) => new Date(Number(ms) - 3 * 3600e3); // horário de Brasília (sem horário de verão)
const DIA = (ms) => BR(ms).toISOString().slice(0, 10);
const norm = (t) => String(t || "").trim().toLowerCase();
const ehUpsell = (v) => /upsell/i.test(v.tipo || "");
const mediana = (l) => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function lerCustos(q) {
  try {
    await q("CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor JSONB NOT NULL, atualizado BIGINT NOT NULL)");
    const r = await q("SELECT valor FROM configuracoes WHERE chave = 'custos'");
    return Object.assign({}, PADRAO, (r[0] && r[0].valor) || {});
  } catch (e) { return Object.assign({}, PADRAO); }
}

export async function POST(request) {
  if (autorizado(request) !== "ok") return json({ erro: "senha" }, 401);
  let corpo;
  try { corpo = await request.json(); } catch (e) { return json({ erro: "formato" }, 400); }
  const num = (v, max) => { const x = Number(String(v ?? 0).replace(",", ".")); return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };
  const custos = { custo_frasco: num(corpo.custo_frasco, 10000), frete_pedido: num(corpo.frete_pedido, 10000), imposto_pct: num(corpo.imposto_pct, 100) };
  let q;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return json({ erro: "sem-banco" }, 503);
  await lerCustos(q); // cria a tabela se preciso
  await q(`INSERT INTO configuracoes (chave, valor, atualizado) VALUES ('custos', $1::jsonb, $2)
    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado = EXCLUDED.atualizado`, [JSON.stringify(custos), Date.now()]);
  return json({ ok: true, custos });
}

export async function GET(request) {
  const auth = autorizado(request);
  if (auth === "sem-senha") return json({ erro: "sem-senha" }, 401);
  if (auth !== "ok") return json({ erro: "senha" }, 401);
  const url = new URL(request.url);
  const ate = Number(url.searchParams.get("ate")) || Date.now() + 864e5;
  const de = Number(url.searchParams.get("de")) || ate - 7 * 864e5;
  const deAnt = de - (ate - de), ateAnt = de;

  let q;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return json({ erro: "sem-banco" }, 503);
  const ler = async (sql, args) => { try { return await q(sql, args); } catch (e) { return []; } };

  const [custos, todas] = await Promise.all([lerCustos(q), lerVendas(q)]);
  const naJanela = (a, b) => todas.filter((v) => v.data >= a && v.data < b);
  const aprov = (l) => l.filter((v) => v.classe === "aprovada");

  /* ---------- comparativo e lucro ---------- */
  async function metricas(a, b) {
    const vs = naJanela(a, b), ap = aprov(vs), principais = ap.filter((v) => !ehUpsell(v));
    const soma = (l, c) => l.reduce((s, v) => s + (Number(v[c]) || 0), 0);
    const site = await ler(`SELECT COUNT(DISTINCT CASE WHEN tipo = 'pagina' THEN sessao END) AS visitas,
        COUNT(DISTINCT CASE WHEN tipo = 'checkout' THEN sessao END) AS cliques FROM eventos WHERE ts >= $1 AND ts < $2`, [a, b]);
    let gasto = null;
    try { const m = await insightsMeta(q, DIA(a), DIA(b - 1), ""); if (m && m.ok) gasto = Number(m.gasto) || 0; } catch (e) { gasto = null; }
    const faturamento = soma(ap, "valor"), comissao = soma(ap, "comissao");
    const frascos = ap.reduce((s, v) => s + frascosDaVenda(v), 0);
    const custoProdutos = frascos * custos.custo_frasco, frete = principais.length * custos.frete_pedido;
    const impostos = faturamento * custos.imposto_pct / 100;
    const lucro = comissao - (gasto || 0) - custoProdutos - frete - impostos;
    const visitas = Number(site[0] && site[0].visitas) || 0, cliques = Number(site[0] && site[0].cliques) || 0;
    return {
      visitas, cliques, vendas: principais.length, upsells: ap.length - principais.length,
      faturamento, comissao, ticket: ap.length ? faturamento / ap.length : null,
      conversao: visitas ? principais.length / visitas : null, conversao_checkout: cliques ? principais.length / cliques : null,
      gasto, roas: gasto ? faturamento / gasto : null, cpa: gasto && principais.length ? gasto / principais.length : null,
      frascos, custo_produtos: custoProdutos, frete, impostos, lucro, margem: faturamento ? lucro / faturamento : null,
      devolvidas: vs.filter((v) => v.classe === "reembolso" || v.classe === "chargeback").length,
    };
  }
  const [atual, anterior] = await Promise.all([metricas(de, ate), metricas(deAnt, ateAnt)]);

  const vendasJ = naJanela(de, ate), apJ = aprov(vendasJ), principaisJ = apJ.filter((v) => !ehUpsell(v));

  /* ---------- campanhas e anúncios ---------- */
  async function porUtm(colEvento, campoVenda, nivelMeta) {
    const site = await ler(`SELECT COALESCE(NULLIF(${colEvento}, ''), '(sem utm)') AS nome,
        COUNT(DISTINCT sessao) AS visitas, COUNT(DISTINCT CASE WHEN tipo = 'checkout' THEN sessao END) AS cliques
      FROM eventos WHERE ts >= $1 AND ts < $2 GROUP BY 1`, [de, ate]);
    const mapa = new Map();
    const pegar = (nome) => {
      const k = norm(nome) || "(sem utm)";
      if (!mapa.has(k)) mapa.set(k, { nome: nome || "(sem utm)", visitas: 0, cliques: 0, vendas: 0, faturamento: 0, gasto: null, cliques_meta: null });
      return mapa.get(k);
    };
    for (const s of site) { const g = pegar(s.nome); g.visitas += Number(s.visitas) || 0; g.cliques += Number(s.cliques) || 0; }
    for (const v of principaisJ) { const g = pegar(v[campoVenda]); g.vendas++; }
    for (const v of apJ) { const g = pegar(v[campoVenda]); g.faturamento += Number(v.valor) || 0; }
    let meta = null;
    try { meta = await gastoPorNivel(q, DIA(de), DIA(ate - 1), nivelMeta); } catch (e) { meta = null; }
    if (meta && meta.ok) for (const m of meta.itens) {
      const g = pegar(m.nome);
      g.gasto = (g.gasto || 0) + m.gasto; g.cliques_meta = (g.cliques_meta || 0) + m.cliques_no_link;
    }
    const linhas = [...mapa.values()].map((g) => Object.assign(g, {
      conversao: g.visitas ? g.vendas / g.visitas : null,
      roas: g.gasto ? g.faturamento / g.gasto : null, cpa: g.gasto && g.vendas ? g.gasto / g.vendas : null,
    }));
    linhas.sort((a, b) => b.faturamento - a.faturamento || (b.gasto || 0) - (a.gasto || 0) || b.visitas - a.visitas);
    return { linhas: linhas.slice(0, 50), meta: meta ? (meta.ok ? "ok" : meta.erro) : null };
  }
  const [campanhas, anuncios] = await Promise.all([porUtm("campanha", "campanha", "campaign"), porUtm("conteudo", "anuncio", "ad")]);

  /* ---------- o que faz vender (seções da oferta) ---------- */
  const sessoesVenda = principaisJ.map((v) => v.sessao).filter(Boolean);
  const [secRows, ofertaTot] = await Promise.all([
    ler(`WITH oferta AS (SELECT DISTINCT sessao FROM eventos WHERE tipo = 'pagina' AND pagina = 'oferta' AND ts >= $1 AND ts < $2),
           clique AS (SELECT DISTINCT sessao FROM eventos WHERE tipo = 'checkout' AND ts >= $1 AND ts < $2)
      SELECT e.etapa AS secao, COUNT(DISTINCT e.sessao) AS viram,
        COUNT(DISTINCT CASE WHEN c.sessao IS NOT NULL THEN e.sessao END) AS clicaram,
        COUNT(DISTINCT CASE WHEN e.sessao = ANY($3::text[]) THEN e.sessao END) AS compraram
      FROM eventos e JOIN oferta o ON o.sessao = e.sessao LEFT JOIN clique c ON c.sessao = e.sessao
      WHERE e.tipo = 'secao' AND e.ts >= $1 AND e.ts < $2 GROUP BY 1`, [de, ate, sessoesVenda]),
    ler(`WITH oferta AS (SELECT DISTINCT sessao FROM eventos WHERE tipo = 'pagina' AND pagina = 'oferta' AND ts >= $1 AND ts < $2)
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE sessao IN (SELECT sessao FROM eventos WHERE tipo = 'checkout' AND ts >= $1 AND ts < $2)) AS clicaram,
        COUNT(*) FILTER (WHERE sessao = ANY($3::text[])) AS compraram FROM oferta`, [de, ate, sessoesVenda]),
  ]);
  const T = { total: Number(ofertaTot[0] && ofertaTot[0].total) || 0, clicaram: Number(ofertaTot[0] && ofertaTot[0].clicaram) || 0, compraram: Number(ofertaTot[0] && ofertaTot[0].compraram) || 0 };
  const secoes = secRows.map((r) => {
    const viram = Number(r.viram) || 0, clicaram = Number(r.clicaram) || 0, naoViram = T.total - viram, naoClicaram = T.clicaram - clicaram;
    return {
      secao: r.secao, viram, alcance: T.total ? viram / T.total : null,
      clique_viram: viram ? clicaram / viram : null, clique_nao_viram: naoViram > 0 ? Math.max(0, naoClicaram) / naoViram : null,
      compraram: Number(r.compraram) || 0,
    };
  }).filter((s) => s.viram >= 5).sort((a, b) => (b.clique_viram || 0) - (a.clique_viram || 0));

  /* ---------- jornada do comprador ---------- */
  const comVisita = principaisJ.filter((v) => v.sessao);
  let jornada = { identificadas: comVisita.length, total: principaisJ.length };
  if (comVisita.length) {
    const ses = await ler(`SELECT sessao, MIN(visitante) AS visitante, MIN(aparelho) AS aparelho FROM eventos WHERE sessao = ANY($1::text[]) GROUP BY sessao`, [comVisita.map((v) => v.sessao)]);
    const porSessao = new Map(ses.map((s) => [s.sessao, s]));
    const visitantes = [...new Set(ses.map((s) => s.visitante).filter(Boolean))];
    const hist = visitantes.length ? await ler(`SELECT visitante, sessao, MIN(ts) AS ts, MIN(fonte) AS fonte FROM eventos WHERE visitante = ANY($1::text[]) GROUP BY visitante, sessao`, [visitantes]) : [];
    const porVisitante = new Map();
    for (const h of hist) { if (!porVisitante.has(h.visitante)) porVisitante.set(h.visitante, []); porVisitante.get(h.visitante).push({ ts: Number(h.ts), fonte: h.fonte, sessao: h.sessao }); }
    const horas = [], visitas = [], aparelhos = {}, caminhos = {};
    let primeira = 0;
    for (const v of comVisita) {
      const s = porSessao.get(v.sessao);
      if (!s) continue;
      const ap = s.aparelho || "desconhecido";
      aparelhos[ap] = aparelhos[ap] || { vendas: 0, faturamento: 0 };
      aparelhos[ap].vendas++; aparelhos[ap].faturamento += Number(v.valor) || 0;
      const lista = (porVisitante.get(s.visitante) || []).filter((h) => h.ts <= v.data).sort((a, b) => a.ts - b.ts);
      if (!lista.length) continue;
      horas.push((v.data - lista[0].ts) / 3600e3);
      visitas.push(lista.length);
      if (lista.length === 1) primeira++;
      const c = (lista[0].fonte || "direto") + " → " + (v.fonte || lista[lista.length - 1].fonte || "direto");
      caminhos[c] = (caminhos[c] || 0) + 1;
    }
    jornada = Object.assign(jornada, {
      medidas: horas.length,
      horas_mediana: mediana(horas), visitas_media: visitas.length ? visitas.reduce((a, b) => a + b, 0) / visitas.length : null,
      primeira_visita: horas.length ? primeira / horas.length : null,
      caminhos: Object.entries(caminhos).map(([nome, n]) => ({ nome, vendas: n })).sort((a, b) => b.vendas - a.vendas).slice(0, 8),
      aparelhos_vendas: aparelhos,
    });
  }
  const porAparelho = (await ler(`SELECT COALESCE(aparelho, 'desconhecido') AS aparelho, COUNT(DISTINCT sessao) AS visitas,
      COUNT(DISTINCT CASE WHEN tipo = 'checkout' THEN sessao END) AS cliques FROM eventos WHERE ts >= $1 AND ts < $2 GROUP BY 1 ORDER BY 2 DESC`, [de, ate]))
    .map((r) => {
      const vv = (jornada.aparelhos_vendas || {})[r.aparelho] || { vendas: 0, faturamento: 0 };
      return { aparelho: r.aparelho, visitas: Number(r.visitas) || 0, cliques: Number(r.cliques) || 0, vendas: vv.vendas, faturamento: vv.faturamento };
    });

  /* ---------- kits: cliques × vendas ---------- */
  const cliquesKit = await ler(`SELECT valor AS kit, COUNT(DISTINCT sessao) AS cliques FROM eventos WHERE tipo = 'checkout' AND ts >= $1 AND ts < $2 GROUP BY 1`, [de, ate]);
  const kits = ["1", "2", "3"].map((k) => {
    const c = cliquesKit.find((x) => String(x.kit) === k);
    const vs = principaisJ.filter((v) => String(frascosDaVenda(v)) === k);
    return { kit: k, cliques: c ? Number(c.cliques) || 0 : 0, vendas: vs.length, faturamento: vs.reduce((s, v) => s + (Number(v.valor) || 0), 0) };
  });

  /* ---------- horários (Brasília) ---------- */
  const vendasHora = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const v of principaisJ) { const d = BR(v.data); vendasHora[d.getUTCDay()][d.getUTCHours()]++; }
  const cliquesHora = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of await ler(`SELECT EXTRACT(DOW FROM to_timestamp(ts / 1000.0) AT TIME ZONE 'America/Sao_Paulo')::int AS dia,
      EXTRACT(HOUR FROM to_timestamp(ts / 1000.0) AT TIME ZONE 'America/Sao_Paulo')::int AS hora, COUNT(DISTINCT sessao) AS n
      FROM eventos WHERE tipo = 'checkout' AND ts >= $1 AND ts < $2 GROUP BY 1, 2`, [de, ate])) {
    if (cliquesHora[r.dia]) cliquesHora[r.dia][r.hora] = Number(r.n) || 0;
  }

  return json({
    periodo: { de, ate, deAnt, ateAnt }, custos, atual, anterior,
    campanhas, anuncios, secoes, secoes_total: T, jornada, porAparelho, kits,
    horarios: { vendas: vendasHora, cliques: cliquesHora },
  });
}
