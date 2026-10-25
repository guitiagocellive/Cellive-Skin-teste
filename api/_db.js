/* Conexão com o banco Postgres (Neon, instalado pela Vercel).
   A Vercel cria a variável DATABASE_URL ao conectar o banco ao projeto.
   Para testar no computador com um Postgres comum, use BANCO_LOCAL=1.
   Arquivos que começam com "_" dentro de /api não viram endereços públicos. */

let consultar = null;
let tabelaPronta = false;

async function conexao() {
  if (consultar) return consultar;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
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
    tabelaPronta = true;
  }
  return q;
}

export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
