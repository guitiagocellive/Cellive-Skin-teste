/* Leitura das vendas da B4You (tabela vendas_b4you), usada pelas abas Vendas e Estratégia.
   Uma venda pode ter vários avisos (aguardando → aprovada → reembolsada): vale o último.
   A venda entra no período pela data em que foi aprovada (ou do último aviso, se nunca foi).
   Arquivos que começam com "_" dentro de /api não viram endereços públicos. */

// aviso de teste da B4You (botão "Testar" em Apps e Webhooks): não conta
const TESTE_VENDAS = new Set(["9f1e2d3c-4b5a-4978-8f1e-2d3c4b5a6978"]);
const TESTE_PRODUTOS = new Set(["Curso de Marketing Digital"]);

export function classe(status, evento) {
  const t = (String(status || "") + " " + String(evento || "")).toLowerCase();
  if (/chargeback|contest|dispute/.test(t)) return "chargeback";
  if (/refund|reembols|estorn/.test(t)) return "reembolso";
  if (/refus|recus|denied|negad|fail|cancel|expir/.test(t)) return "recusada";
  if (/pend|wait|aguard|generated|gerad|created|criad|billet-|pix-/.test(t)) return "pendente";
  if (/paid|approved|aprovad|complete|pago/.test(t)) return "aprovada";
  return "outro";
}


export async function lerVendas(q) {
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

  return [...porVenda.values()].map((v) => Object.assign(v, { data: v.aprovadaEm || v.ultimo }));
}

// frascos de uma venda: pelo nome da oferta ("2 unidades", "Kit 3") ou pela quantidade; upsell = 1
export function frascosDaVenda(v) {
  if (/upsell/i.test(v.tipo || "")) return 1;
  const m = String(v.oferta || "").match(/(\d+)\s*(un|frasc|kit|x\b)/i) || String(v.oferta || "").match(/kit\s*(\d+)/i);
  if (m) return Math.max(1, Math.min(12, Number(m[1])));
  return v.quantidade && v.quantidade > 1 ? Math.min(12, v.quantidade) : 1;
}
