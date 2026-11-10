/* Produtos da aba "Produto" do painel (tabela produtos): leitura, produto inicial e os custos
   que a aba Estratégia usa no lucro estimado. Arquivos com "_" em /api não viram endereços. */
import { randomUUID } from "node:crypto";

// produto inicial: os números da planilha de custos do Sérum (dá para mudar tudo no painel)
export const PRODUTO_INICIAL = {
  nome: "Sérum Revitalizador Noturno 30ml",
  status: "ativo",
  custosUnidade: [
    { nome: "Custo unitário do produto", valor: 14.85, fixo: true },
    { nome: "Embalagem (frasco, pote...)", valor: 14.99, fixo: true },
    { nome: "Rótulo", valor: 0.95, fixo: true },
    { nome: "Caixa Cartucho", valor: 1.9 },
  ],
  custosPedido: { caixa: 1, envio: 25, cac: 80, cacTipo: "reais", outros: [] },
  taxas: { impostos: 6, plataforma: 5, afiliado: 20 },
  margemAlvo: 30,
  kits: [
    { nome: "Kit 1 unidade", unidades: 1, preco: 197.9, caixa: null, envio: null },
    { nome: "Kit 2 unidades", unidades: 2, preco: 297.9, caixa: null, envio: null },
    { nome: "Kit 3 unidades", unidades: 3, preco: 397.9, caixa: null, envio: null },
  ],
  ficha: {
    marca: "Cellive Skin", categoria: "Sérum facial", volume: "30 ml", uso: "Noturno, 1 passo: aplicar no rosto limpo à noite.",
    ativos: "24 ativos. Destaques (ação SRRP): GHK-Cu, Retinal (retinaldeído 0,05%), PDRN e microespículas.",
    registro: "Regularizado na Anvisa", testes: "Testado dermatologicamente", garantia: "30 dias (reembolso de 100%)",
    validade: "", fornecedor: "", ean: "", observacoes: "",
  },
  criativos: {
    publico: "", promessa: "", dores: "", beneficios: "", diferenciais: "", provas: "", objecoes: "", proibido: "", angulos: "", referencias: "",
  },
};

export async function tabela(q) {
  await q("CREATE TABLE IF NOT EXISTS produtos (id TEXT PRIMARY KEY, dados JSONB NOT NULL, criado BIGINT NOT NULL, atualizado BIGINT NOT NULL)");
}

export async function lerProdutos(q) {
  await tabela(q);
  let linhas = await q("SELECT id, dados, criado, atualizado FROM produtos ORDER BY criado ASC");
  if (!linhas.length) {
    const id = randomUUID(), agora = Date.now();
    await q("INSERT INTO produtos (id, dados, criado, atualizado) VALUES ($1, $2::jsonb, $3, $3) ON CONFLICT (id) DO NOTHING", [id, JSON.stringify(PRODUTO_INICIAL), agora]);
    linhas = await q("SELECT id, dados, criado, atualizado FROM produtos ORDER BY criado ASC");
  }
  return linhas.map((l) => Object.assign({}, l.dados, { id: l.id, criado: Number(l.criado), atualizado: Number(l.atualizado) }));
}


/* Custos para o lucro estimado da aba Estratégia, a partir do produto ativo (ou o primeiro):
   custo por frasco = soma dos custos por unidade; frete por pedido = caixa + envio (+ outros por pedido);
   impostos = só o % de impostos (a taxa da B4You já sai do "você recebe"). */
export function custosDoProduto(p) {
  if (!p) return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const cp = p.custosPedido || {};
  return {
    custo_frasco: (p.custosUnidade || []).reduce((s, c) => s + n(c.valor), 0),
    frete_pedido: n(cp.caixa) + n(cp.envio) + (cp.outros || []).reduce((s, c) => s + n(c.valor), 0),
    imposto_pct: n((p.taxas || {}).impostos),
    produto: p.nome || "Produto",
  };
}
