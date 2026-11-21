/* Banco de dados D1 da Cloudflare (SQLite), ligado ao Worker pelo nome DB (wrangler.jsonc).
   As funções usam q(texto, parâmetros) com $1, $2... no texto, como antes; aqui viram ?1, ?2.
   - listas (arrays) viram texto JSON: use "IN (SELECT value FROM json_each($1))"
   - verdadeiro/falso viram 1/0
   - colunas JSON voltam como texto: use lerJson()
   O D1 aceita no máximo 100 parâmetros por consulta; para muitas linhas use q.lote().
   Arquivos que começam com "_" dentro de /api não viram endereços públicos. */

import { env } from "cloudflare:workers";
import { timingSafeEqual } from "node:crypto";

// Todas as tabelas, criadas na primeira consulta de cada instância (se ainda não existirem)
const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY,
    ts INTEGER NOT NULL,
    visitante TEXT, sessao TEXT NOT NULL,
    tipo TEXT NOT NULL, pagina TEXT, etapa TEXT, valor TEXT, extra TEXT,
    fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT,
    aparelho TEXT, sistema TEXT, navegador TEXT, pais TEXT, novo INTEGER,
    versao TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS ev_ts ON eventos(ts)",
  "CREATE INDEX IF NOT EXISTS ev_sessao ON eventos(sessao, id)",
  "CREATE INDEX IF NOT EXISTS ev_tipo ON eventos(tipo, ts)",
  "CREATE INDEX IF NOT EXISTS ev_visitante ON eventos(visitante)",
  // uso do chat do Estrategista (para o limite diário)
  "CREATE TABLE IF NOT EXISTS agente_uso (ts INTEGER NOT NULL)",
  // números da Meta guardados por 30 min
  "CREATE TABLE IF NOT EXISTS meta_cache (chave TEXT PRIMARY KEY, criado INTEGER NOT NULL, dados TEXT NOT NULL)",
  // relatórios da IA já gerados (para não pagar duas vezes pela mesma análise)
  "CREATE TABLE IF NOT EXISTS analises (chave TEXT PRIMARY KEY, criado INTEGER NOT NULL, dados TEXT NOT NULL)",
  // lista de lançamento: quem deixou nome, WhatsApp e e-mail (um cadastro por e-mail)
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY,
    criado INTEGER NOT NULL, atualizado INTEGER NOT NULL,
    nome TEXT NOT NULL, whatsapp TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    kit TEXT, versao TEXT, fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT,
    visitante TEXT, sessao TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS leads_criado ON leads(criado)",
  // custos digitados na aba Estratégia
  "CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor TEXT NOT NULL, atualizado INTEGER NOT NULL)",
  // cartões da aba Produto
  "CREATE TABLE IF NOT EXISTS produtos (id TEXT PRIMARY KEY, dados TEXT NOT NULL, criado INTEGER NOT NULL, atualizado INTEGER NOT NULL)",
  // avisos que chegam no webhook de vendas (só para diagnóstico; ficam os 300 mais recentes)
  `CREATE TABLE IF NOT EXISTS webhook_tentativas (
    id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, metodo TEXT, resposta INTEGER, motivo TEXT,
    tipo TEXT, tamanho INTEGER, tem_codigo INTEGER, agente TEXT, previa TEXT
  )`,
  // vendas da B4You (um registro por aviso recebido)
  `CREATE TABLE IF NOT EXISTS vendas_b4you (
    id INTEGER PRIMARY KEY, recebido INTEGER NOT NULL,
    evento TEXT, venda TEXT, grupo TEXT, status TEXT, valor REAL, comissao REAL,
    oferta TEXT, oferta_nome TEXT, quantidade REAL, produto TEXT, tipo TEXT, pagamento TEXT, parcelas REAL,
    fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT, termo TEXT, src TEXT, sck TEXT,
    email_hash TEXT, pago_em TEXT, dados TEXT NOT NULL,
    funil TEXT, sessao TEXT,
    comprador_nome TEXT, comprador_email TEXT, comprador_telefone TEXT, comprador_cidade TEXT, comprador_uf TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS vendas_b4you_recebido ON vendas_b4you(recebido)",
  "CREATE INDEX IF NOT EXISTS vendas_b4you_venda ON vendas_b4you(venda)",
];

let pronto = null;

function valor(v) {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (Array.isArray(v) || (v && typeof v === "object")) return JSON.stringify(v);
  return v;
}

function preparar(texto, params = []) {
  return env.DB.prepare(texto.replace(/\$(\d+)/g, "?$1")).bind(...params.map(valor));
}

export async function banco() {
  if (!env.DB) return null;
  if (!pronto) pronto = env.DB.batch(ESQUEMA.map((s) => env.DB.prepare(s))).catch((e) => { pronto = null; throw e; });
  await pronto;
  const q = async (texto, params = []) => (await preparar(texto, params).all()).results;
  // várias gravações de uma vez (tudo ou nada): q.lote([[texto, params], ...])
  q.lote = (lista) => env.DB.batch(lista.map(([t, p]) => preparar(t, p)));
  return q;
}

/* Colunas JSON voltam como texto no D1 */
export function lerJson(v, padrao = null) {
  if (v == null) return padrao;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch (e) { return padrao; }
}

/* Confere a senha do painel (segredo PAINEL_SENHA na Cloudflare). */
export function autorizado(request) {
  const senha = process.env.PAINEL_SENHA;
  if (!senha) return "sem-senha";
  const recebida = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebida), b = Buffer.from(senha);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "negado";
}

/* "production" no ar; nas versões de teste (prévias) os números não são gravados */
export const ehPrevia = () => process.env.AMBIENTE === "preview";

export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
