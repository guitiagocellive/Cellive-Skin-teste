/* Conexão com o banco Postgres (Neon, instalado pela Vercel).
   A Vercel cria a variável DATABASE_URL ao conectar o banco ao projeto.
   Para testar no computador com um Postgres comum, use BANCO_LOCAL=1.
   Arquivos que começam com "_" dentro de /api não viram endereços públicos. */

import { timingSafeEqual } from "node:crypto";

let consultar = null;
let tabelaPronta = false;

async function conexao() {
  if (consultar) return consultar;
  // nome da variável depende do prefixo escolhido ao conectar o Neon na Vercel
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL;
  if (!url) return null;
  if (process.env.BANCO_LOCAL === "1") {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: url, max: 4 });
    consultar = async (texto, params = []) => (await pool.query(texto, params)).rows;
  } else {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    consultar = (texto, params = []) => sql.query(texto, params);
  }
  return consultar;
}

export async function banco() {
  const q = await conexao();
  if (!q) return null;
  if (!tabelaPronta) {
    await q(`CREATE TABLE IF NOT EXISTS eventos (
      id BIGSERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      visitante TEXT, sessao TEXT NOT NULL,
      tipo TEXT NOT NULL, pagina TEXT, etapa TEXT, valor TEXT, extra JSONB,
      fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT,
      aparelho TEXT, sistema TEXT, navegador TEXT, pais TEXT, novo BOOLEAN
    )`);
    await q("CREATE INDEX IF NOT EXISTS ev_ts ON eventos(ts)");
    await q("CREATE INDEX IF NOT EXISTS ev_sessao ON eventos(sessao, id)");
    await q("CREATE INDEX IF NOT EXISTS ev_tipo ON eventos(tipo, ts)");
    // versão do funil (v2 = oferta direta para anúncios); vazio = funil com quiz
    await q("ALTER TABLE eventos ADD COLUMN IF NOT EXISTS versao TEXT");
    // uso do chat do Estrategista (para o limite diário)
    await q("CREATE TABLE IF NOT EXISTS agente_uso (ts BIGINT NOT NULL)");
    // relatórios da IA já gerados (para não pagar duas vezes pela mesma análise)
    await q(`CREATE TABLE IF NOT EXISTS analises (
      chave TEXT PRIMARY KEY, criado BIGINT NOT NULL, dados JSONB NOT NULL
    )`);
    tabelaPronta = true;
  }
  return q;
}

/* Confere a senha do painel (variável PAINEL_SENHA na Vercel). */
export function autorizado(request) {
  const senha = process.env.PAINEL_SENHA;
  if (!senha) return "sem-senha";
  const recebida = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebida), b = Buffer.from(senha);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "negado";
}

export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
