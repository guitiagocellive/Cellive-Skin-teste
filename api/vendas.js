/* GET /api/vendas?de=<ms>&ate=<ms> — vendas da B4You para a aba "Vendas" do painel
   (precisa da senha do painel). As vendas chegam pelo webhook (api/venda.js) e ficam
   na tabela vendas_b4you, um registro por aviso. Uma mesma venda pode ter vários avisos
   (aguardando pagamento → aprovada → reembolsada): aqui vale o último de cada venda.
   A venda entra no período pela data em que foi aprovada (ou do último aviso, se nunca foi).
   Funil: o site manda sck = quiz | oferta-direta no link do checkout (vendas antigas = "não identificado").
   Compradores: agrupados por e-mail, com nome, telefone, cidade e UF (só com a senha do painel).
   &formato=csv baixa a lista de compradores do período como planilha. */
import { autorizado, banco, json } from "./_db.js";
import { insightsMeta } from "./_meta.js";

// aviso de teste da B4You (botão "Testar" em Apps e Webhooks): não conta
const TESTE_VENDAS = new Set(["9f1e2d3c-4b5a-4978-8f1e-2d3c4b5a6978"]);
const TESTE_PRODUTOS = new Set(["Curso de Marketing Digital"]);

function classe(status, evento) {
  const t = (String(status || "") + " " + String(evento || "")).toLowerCase();
  if (/chargeback|contest|dispute/.test(t)) return "chargeback";
  if (/refund|reembols|estorn/.test(t)) return "reembolso";
  if (/refus|recus|denied|negad|fail|cancel|expir/.test(t)) return "recusada";
  if (/pend|wait|aguard|generated|gerad|created|criad|billet-|pix-/.test(t)) return "pendente";
  if (/paid|approved|aprovad|complete|pago/.test(t)) return "aprovada";
  return "outro";
}

const DIA_BR = (ms) => new Date(Number(ms) - 3 * 3600e3).toISOString().slice(0, 10); // dia no horário de Brasília

export async function GET(request) {
  const auth = autorizado(request);
  if (auth === "sem-senha") return json({ erro: "sem-senha" }, 401);
  if (auth !== "ok") return json({ erro: "senha" }, 401);
  const url = new URL(request.url);
  const de = Number(url.searchParams.get("de")) || 0;
  const ate = Number(url.searchParams.get("ate")) || Date.now() + 864e5;

  let q;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return json({ erro: "sem-banco" }, 503);

  let linhas = [];
  try {
    linhas = await q(`SELECT id, recebido, evento, venda, status, valor, comissao, oferta, oferta_nome, quantidade,
      produto, tipo, pagamento, parcelas, fonte, campanha, midia, conteudo, src, sck, email_hash,
      funil, sessao, comprador_nome, comprador_email, comprador_telefone, comprador_cidade, comprador_uf
      FROM vendas_b4you ORDER BY id ASC LIMIT 50000`);
  } catch (e) {
    // colunas novas ainda não criadas (nenhum aviso desde a atualização): lê o básico
    try {
      linhas = await q(`SELECT id, recebido, evento, venda, status, valor, comissao, oferta, oferta_nome, quantidade,
        produto, tipo, pagamento, parcelas, fonte, campanha, midia, conteudo, src, sck, email_hash
        FROM vendas_b4you ORDER BY id ASC LIMIT 50000`);
    } catch (e2) { linhas = []; } // tabela ainda não existe = nenhuma venda
  }

  // junta os avisos de cada venda
  const porVenda = new Map();
  for (const l of linhas) {
    if (TESTE_VENDAS.has(l.venda) || TESTE_PRODUTOS.has(l.produto)) continue;
    const chave = l.venda || "sem-id-" + l.id;
    const c = classe(l.status, l.evento);
    const atual = porVenda.get(chave) || { aprovadaEm: null };
    const v = Object.assign(atual, {
      venda: chave, classe: c, ultimo: Number(l.recebido),
      valor: l.valor != null ? Number(l.valor) : atual.valor ?? null,
      comissao: l.comissao != null ? Number(l.comissao) : atual.comissao ?? null,
      oferta: l.oferta_nome || atual.oferta || l.oferta || null,
      quantidade: l.quantidade != null ? Number(l.quantidade) : atual.quantidade ?? null,
      produto: l.produto || atual.produto || null,
      tipo: l.tipo || atual.tipo || null,
      pagamento: l.pagamento || atual.pagamento || null,
      parcelas: l.parcelas != null ? Number(l.parcelas) : atual.parcelas ?? null,
      fonte: l.fonte || atual.fonte || null,
      campanha: l.campanha || atual.campanha || null,
      midia: l.midia || atual.midia || null,
      anuncio: l.conteudo || atual.anuncio || null,
      funil: l.funil || (/^(quiz|oferta-direta)$/.test(l.sck || "") ? l.sck : null) || atual.funil || null,
      sessao: l.sessao || atual.sessao || null,
      cliente: l.comprador_email || l.email_hash || atual.cliente || null,
      nome: l.comprador_nome || atual.nome || null,
      email: l.comprador_email || atual.email || null,
      telefone: l.comprador_telefone || atual.telefone || null,
      cidade: l.comprador_cidade || atual.cidade || null,
      uf: l.comprador_uf || atual.uf || null,
      pixGerado: atual.pixGerado || (/pix/i.test(String(l.pagamento || "") + String(l.evento || "")) && c === "pendente"),
    });
    if (c === "aprovada" && !v.aprovadaEm) v.aprovadaEm = Number(l.recebido);
    porVenda.set(chave, v);
  }

  const vendas = [...porVenda.values()]
    .map((v) => Object.assign(v, { data: v.aprovadaEm || v.ultimo }))
    .filter((v) => v.data >= de && v.data < ate)
    .sort((a, b) => b.data - a.data);

  const soma = (lista, campo) => lista.reduce((s, v) => s + (Number(v[campo]) || 0), 0);
  const aprovadas = vendas.filter((v) => v.classe === "aprovada");
  // reembolso e chargeback contam como vendas que foram aprovadas e depois voltaram
  const devolvidas = vendas.filter((v) => v.classe === "reembolso" || v.classe === "chargeback");
  const principais = aprovadas.filter((v) => !/upsell|order.?bump|bump/i.test(v.tipo || ""));
  const upsells = aprovadas.filter((v) => /upsell/i.test(v.tipo || ""));

  const agrupar = (campo, vazio) => {
    const m = new Map();
    for (const v of aprovadas) {
      const k = v[campo] || vazio;
      const g = m.get(k) || { nome: k, vendas: 0, valor: 0 };
      g.vendas++; g.valor += Number(v.valor) || 0;
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.valor - a.valor || b.vendas - a.vendas).slice(0, 30);
  };

  // por funil (quiz × oferta direta)
  const NOME_FUNIL = { quiz: "Funil do quiz", "oferta-direta": "Oferta direta", teste: "Página de teste" };
  const porFunil = ["quiz", "oferta-direta", null].map((f) => {
    const lista = aprovadas.filter((v) => (v.funil || null) === f && !/upsell/i.test(v.tipo || ""));
    const ups = upsells.filter((v) => (v.funil || null) === f);
    return { funil: f || "nao-identificado", nome: f ? NOME_FUNIL[f] : "Não identificado", vendas: lista.length,
      valor: soma(lista, "valor") + soma(ups, "valor"), upsells: ups.length };
  }).filter((g) => g.vendas || g.upsells || g.funil !== "nao-identificado");

  // compradores (vendas aprovadas e devolvidas), agrupados por e-mail
  const mapaC = new Map();
  for (const v of vendas) {
    if (v.classe !== "aprovada" && v.classe !== "reembolso" && v.classe !== "chargeback") continue;
    const k = v.cliente || "venda-" + v.venda;
    const c = mapaC.get(k) || { nome: null, email: null, telefone: null, cidade: null, uf: null, compras: 0, upsells: 0, total: 0, devolvidas: 0, ultima: 0, ofertas: [], funil: null, fonte: null };
    if (v.classe === "aprovada") {
      if (/upsell/i.test(v.tipo || "")) c.upsells++; else c.compras++;
      c.total += Number(v.valor) || 0;
    } else c.devolvidas++;
    c.nome = c.nome || v.nome; c.email = c.email || v.email; c.telefone = c.telefone || v.telefone;
    c.cidade = c.cidade || v.cidade; c.uf = c.uf || v.uf; c.funil = c.funil || v.funil; c.fonte = c.fonte || v.fonte;
    if (v.data > c.ultima) c.ultima = v.data;
    if (v.oferta && c.ofertas.indexOf(v.oferta) < 0) c.ofertas.push(v.oferta);
    mapaC.set(k, c);
  }
  const compradores = [...mapaC.values()].sort((a, b) => b.ultima - a.ultima);

  if (url.searchParams.get("formato") === "csv") {
    const cel = (x) => '"' + String(x == null ? "" : x).replace(/"/g, '""') + '"';
    const linhasCsv = [["Nome", "E-mail", "Telefone", "Cidade", "UF", "Compras aprovadas", "Upsells", "Total (R$)", "Devolvidas", "Última compra", "Ofertas", "Funil", "Fonte"].map(cel).join(";")];
    for (const c of compradores) {
      linhasCsv.push([c.nome, c.email, c.telefone, c.cidade, c.uf, c.compras, c.upsells, c.total.toFixed(2).replace(".", ","), c.devolvidas,
        new Date(c.ultima - 3 * 3600e3).toISOString().slice(0, 16).replace("T", " "), c.ofertas.join(" + "),
        c.funil ? NOME_FUNIL[c.funil] || c.funil : "", c.fonte || ""].map(cel).join(";"));
    }
    return new Response("\ufeff" + linhasCsv.join("\n"), { headers: {
      "content-type": "text/csv; charset=utf-8", "cache-control": "no-store",
      "content-disposition": 'attachment; filename="cellive-compradores.csv"' } });
  }

  // aprovação: aprovadas (inclui as que depois voltaram) ÷ (essas + recusadas)
  const recusadas = vendas.filter((v) => v.classe === "recusada").length;
  const jaAprovadas = aprovadas.length + devolvidas.length;
  // Pix: quantos Pix gerados foram pagos
  const pixGerados = vendas.filter((v) => v.pixGerado || (/pix/i.test(v.pagamento || "") && v.classe !== "recusada"));
  const pixPagos = pixGerados.filter((v) => v.classe === "aprovada" || v.classe === "reembolso" || v.classe === "chargeback");

  const porDia = {};
  for (const v of aprovadas) {
    const d = DIA_BR(v.data);
    porDia[d] = porDia[d] || { vendas: 0, valor: 0 };
    porDia[d].vendas++; porDia[d].valor += Number(v.valor) || 0;
  }

  // cliques em "Comprar" no site no mesmo período (para a conversão do checkout)
  let cliques = null;
  const porFunilSite = { quiz: { visitas: 0, cliques: 0 }, "oferta-direta": { visitas: 0, cliques: 0 } };
  try {
    const r = await q(`SELECT CASE WHEN versao = 'v2' THEN 'oferta-direta' ELSE 'quiz' END AS funil,
        COUNT(DISTINCT CASE WHEN tipo = 'pagina' THEN sessao END) AS visitas,
        COUNT(DISTINCT CASE WHEN tipo = 'checkout' THEN sessao END) AS cliques
      FROM eventos WHERE ts >= $1 AND ts < $2 GROUP BY 1`, [de, ate]);
    cliques = 0;
    for (const x of r) {
      porFunilSite[x.funil] = { visitas: Number(x.visitas) || 0, cliques: Number(x.cliques) || 0 };
      cliques += Number(x.cliques) || 0;
    }
  } catch (e) { cliques = null; }
  for (const g of porFunil) Object.assign(g, porFunilSite[g.funil] || {});

  // gasto nos anúncios da Meta no período (se a conta estiver conectada)
  let gasto = null;
  try {
    const m = await insightsMeta(q, DIA_BR(Math.max(de, Date.parse("2024-01-01"))), DIA_BR(ate - 1), "");
    if (m && m.ok) gasto = Number(m.gasto) || 0;
  } catch (e) { gasto = null; }

  const faturamento = soma(aprovadas, "valor");
  return json({
    resumo: {
      aprovadas: aprovadas.length,
      faturamento,
      comissao: soma(aprovadas, "comissao"),
      ticket: aprovadas.length ? faturamento / aprovadas.length : 0,
      principais: principais.length,
      upsells: upsells.length,
      upsell_valor: soma(upsells, "valor"),
      pendentes: vendas.filter((v) => v.classe === "pendente").length,
      pendentes_valor: soma(vendas.filter((v) => v.classe === "pendente"), "valor"),
      recusadas: vendas.filter((v) => v.classe === "recusada").length,
      devolvidas: devolvidas.length,
      devolvidas_valor: soma(devolvidas, "valor"),
      aprovacao: jaAprovadas + recusadas ? jaAprovadas / (jaAprovadas + recusadas) : null,
      pix_gerados: pixGerados.length,
      pix_pagos: pixPagos.length,
      compradores: compradores.filter((c) => c.compras || c.upsells).length,
      recompra: compradores.filter((c) => c.compras > 1).length,
    },
    porFunil,
    compradores: compradores.slice(0, 200),
    cliques, gasto,
    porOferta: agrupar("oferta", "Sem nome da oferta"),
    porPagamento: agrupar("pagamento", "Não informado"),
    porFonte: agrupar("fonte", "Sem UTM"),
    porCampanha: agrupar("campanha", "Sem campanha"),
    porAnuncio: agrupar("anuncio", "Sem anúncio (utm_content)"),
    porDia,
    ultimas: vendas.slice(0, 40).map((v) => ({
      data: v.data, classe: v.classe, valor: v.valor, oferta: v.oferta, tipo: v.tipo,
      pagamento: v.pagamento, parcelas: v.parcelas, fonte: v.fonte, campanha: v.campanha, anuncio: v.anuncio,
      funil: v.funil, nome: v.nome, cidade: v.cidade, uf: v.uf,
    })),
  });
}
