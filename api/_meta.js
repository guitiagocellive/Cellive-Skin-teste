/* Números dos anúncios da Meta (API de Marketing / Insights).
   Liga quando existem na Vercel:
     META_TOKEN  – token de acesso com permissão ads_read (usuário do sistema
                   do Gerenciador de Negócios)
     META_CONTA  – ID da conta de anúncios (só os números, ou "act_123…")
     META_API_VERSAO (opcional) – versão da API, padrão v23.0
   Devolve gasto, cliques no link, impressões, CPM, CTR e visualizações da
   página de destino do período (horário da conta de anúncios). Guarda o
   resultado por 30 minutos para não consultar a Meta toda hora. */
const VALIDADE = 30 * 60e3;

export function metaLigada() {
  return !!(process.env.META_TOKEN && process.env.META_CONTA);
}

function conta() {
  const c = String(process.env.META_CONTA || "").trim();
  return c.startsWith("act_") ? c : "act_" + c.replace(/\D/g, "");
}

function numero(v) {
  const x = Number(v);
  return isFinite(x) ? x : 0;
}

function acao(lista, tipo) {
  const a = (lista || []).find((x) => x.action_type === tipo);
  return a ? numero(a.value) : 0;
}

/* de/ate: "AAAA-MM-DD" (ate incluído). campanha: nome exato (opcional). */
export async function insightsMeta(q, de, ate, campanha) {
  if (!metaLigada()) return { erro: "sem-meta" };
  const chave = [de, ate, campanha || ""].join("|");
  if (q) {
    try {
      const salvo = await q("SELECT dados, criado FROM meta_cache WHERE chave = $1", [chave]);
      if (salvo.length && Date.now() - Number(salvo[0].criado) < VALIDADE) return salvo[0].dados;
    } catch (e) { /* segue sem cache */ }
  }
  const versao = process.env.META_API_VERSAO || "v23.0";
  const base = `${process.env.META_API_URL || "https://graph.facebook.com"}/${versao}/${conta()}/insights`;
  const params = new URLSearchParams({
    fields: "spend,impressions,clicks,inline_link_clicks,cpm,ctr,actions,account_currency",
    time_range: JSON.stringify({ since: de, until: ate }),
    level: "account",
    access_token: process.env.META_TOKEN,
  });
  if (campanha) params.set("filtering", JSON.stringify([{ field: "campaign.name", operator: "EQUAL", value: campanha }]));
  const diario = new URLSearchParams(params);
  diario.set("time_increment", "1");
  diario.set("fields", "spend,inline_link_clicks,actions");

  let total, dias;
  try {
    const [r1, r2] = await Promise.all([fetch(base + "?" + params), fetch(base + "?" + diario)]);
    const j1 = await r1.json(), j2 = await r2.json();
    if (!r1.ok || j1.error) return { erro: "meta", detalhe: (j1.error && j1.error.message) || String(r1.status) };
    total = (j1.data || [])[0] || {};
    dias = r2.ok && !j2.error ? j2.data || [] : [];
  } catch (e) {
    return { erro: "meta", detalhe: "sem conexão com a Meta" };
  }

  const dados = {
    ok: true,
    de, ate, campanha: campanha || null,
    moeda: total.account_currency || "BRL",
    gasto: numero(total.spend),
    impressoes: numero(total.impressions),
    cliques: numero(total.clicks),
    cliques_no_link: numero(total.inline_link_clicks),
    cpm: numero(total.cpm),
    ctr_pct: numero(total.ctr),
    visualizacoes_da_pagina: acao(total.actions, "landing_page_view"),
    por_dia: dias.map((d) => ({ dia: d.date_start, gasto: numero(d.spend), cliques_no_link: numero(d.inline_link_clicks), visualizacoes_da_pagina: acao(d.actions, "landing_page_view") })),
    atualizado: Date.now(),
  };
  if (q) {
    try {
      await q(`INSERT INTO meta_cache (chave, criado, dados) VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (chave) DO UPDATE SET criado = EXCLUDED.criado, dados = EXCLUDED.dados`, [chave, Date.now(), JSON.stringify(dados)]);
    } catch (e) { /* sem cache, tudo bem */ }
  }
  return dados;
}
