/* Cópia dos dados do banco antigo (Neon) para o D1 — usada uma vez, no dia da troca.
   Precisa da senha do painel e do segredo DATABASE_URL (endereço do Neon) no Worker.
   Depois da troca, apague o segredo DATABASE_URL: este endereço passa a responder "sem-neon".

   GET  /api/migrar                      → quantas linhas cada tabela tem no Neon e no D1
   POST /api/migrar {tabela, depois}     → copia a próxima parte da tabela (até 400 linhas)
        depois = null na primeira chamada: apaga o que houver no D1 nessa tabela antes de copiar.
        Responde {copiadas, depois, fim}; chame de novo com o "depois" recebido até fim = true.
   POST /api/migrar {tabela, depois, complemento: true}
        → depois da troca: copia só o que chegou no Neon depois do "depois" (o último número
          copiado), sem apagar nada e deixando o D1 dar números novos (não colide com o que já
          chegou direto no D1).
   A página /migrar faz essas chamadas em sequência. */
import { autorizado, banco, json } from "./_db.js";

const TABELAS = {
  eventos: {
    chave: "id",
    colunas: ["id", "ts", "visitante", "sessao", "tipo", "pagina", "etapa", "valor", "extra", "fonte", "campanha", "midia", "conteudo", "aparelho", "sistema", "navegador", "pais", "novo", "versao"],
    numeros: ["id", "ts"],
  },
  leads: {
    chave: "id",
    colunas: ["id", "criado", "atualizado", "nome", "whatsapp", "email", "kit", "versao", "fonte", "campanha", "midia", "conteudo", "visitante", "sessao"],
    numeros: ["id", "criado", "atualizado"],
  },
  vendas_b4you: {
    chave: "id",
    colunas: ["id", "recebido", "evento", "venda", "grupo", "status", "valor", "comissao", "oferta", "oferta_nome", "quantidade", "produto", "tipo", "pagamento", "parcelas",
      "fonte", "campanha", "midia", "conteudo", "termo", "src", "sck", "email_hash", "pago_em", "dados",
      "funil", "sessao", "comprador_nome", "comprador_email", "comprador_telefone", "comprador_cidade", "comprador_uf"],
    numeros: ["id", "recebido", "valor", "comissao", "quantidade", "parcelas"],
  },
  webhook_tentativas: {
    chave: "id",
    colunas: ["id", "ts", "metodo", "resposta", "motivo", "tipo", "tamanho", "tem_codigo", "agente", "previa"],
    numeros: ["id", "ts", "resposta", "tamanho"],
  },
  produtos: { colunas: ["id", "dados", "criado", "atualizado"], numeros: ["criado", "atualizado"] },
  configuracoes: { colunas: ["chave", "valor", "atualizado"], numeros: ["atualizado"] },
  analises: { colunas: ["chave", "criado", "dados"], numeros: ["criado"] },
  agente_uso: { colunas: ["ts"], numeros: ["ts"] },
};
const POR_VEZ = 400;

let neonSql = null;
async function neon() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!neonSql) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    neonSql = (texto, params = []) => sql.query(texto, params);
  }
  return neonSql;
}

function converter(v, numero) {
  if (v == null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  if (numero && typeof v === "string" && v !== "" && Number.isFinite(Number(v))) return Number(v);
  return v;
}

async function contar(consulta, tabela) {
  try { return Number((await consulta(`SELECT COUNT(*) AS n FROM ${tabela}`))[0].n); } catch (e) { return null; }
}

export async function GET(request) {
  if (autorizado(request) !== "ok") return json({ erro: "senha" }, 401);
  const n = await neon();
  if (!n) return json({ erro: "sem-neon" }, 503);
  const q = await banco();
  if (!q) return json({ erro: "sem-banco" }, 503);
  const tabelas = {};
  for (const t of Object.keys(TABELAS)) tabelas[t] = { neon: await contar(n, t), d1: await contar(q, t) };
  return json({ ok: true, tabelas });
}

export async function POST(request) {
  if (autorizado(request) !== "ok") return json({ erro: "senha" }, 401);
  let corpo;
  try { corpo = await request.json(); } catch (e) { return json({ erro: "formato" }, 400); }
  const nome = String(corpo.tabela || "");
  const T = Object.hasOwn(TABELAS, nome) ? TABELAS[nome] : null;
  if (!T) return json({ erro: "tabela" }, 400);
  const n = await neon();
  if (!n) return json({ erro: "sem-neon" }, 503);
  const q = await banco();
  if (!q) return json({ erro: "sem-banco" }, 503);

  const complemento = !!corpo.complemento && !!T.chave;
  if (complemento && corpo.depois == null) return json({ erro: "depois" }, 400);
  const primeira = corpo.depois == null;
  const cols = T.colunas.join(", ");
  const colsD1 = complemento ? T.colunas.filter((c) => c !== T.chave) : T.colunas;
  let linhas;
  try {
    if (T.chave) {
      linhas = await n(`SELECT ${cols} FROM ${nome} WHERE ${T.chave} > $1 ORDER BY ${T.chave} LIMIT ${POR_VEZ}`, [primeira ? -1 : Number(corpo.depois)]);
    } else {
      linhas = await n(`SELECT ${cols} FROM ${nome}`); // tabelas pequenas: tudo de uma vez
    }
  } catch (e) {
    // tabela que nunca foi criada no Neon (nenhum dado): nada a copiar
    if (/does not exist/i.test(String(e && e.message))) return json({ ok: true, copiadas: 0, depois: null, fim: true, aviso: "sem tabela no Neon" });
    return json({ erro: "neon", detalhe: String(e && e.message).slice(0, 300) }, 500);
  }

  const consultas = [];
  if (primeira) consultas.push([`DELETE FROM ${nome}`, []]);
  const porInsert = Math.max(1, Math.floor(100 / colsD1.length)); // limite de 100 valores por consulta no D1
  const num = new Set(T.numeros);
  for (let i = 0; i < linhas.length; i += porInsert) {
    const grupo = linhas.slice(i, i + porInsert);
    const valores = [], marcas = [];
    grupo.forEach((l, j) => {
      marcas.push("(" + colsD1.map((c, k) => "$" + (j * colsD1.length + k + 1)).join(",") + ")");
      for (const c of colsD1) valores.push(converter(l[c], num.has(c)));
    });
    consultas.push([`INSERT${complemento ? " OR IGNORE" : ""} INTO ${nome} (${colsD1.join(", ")}) VALUES ${marcas.join(",")}`, valores]);
  }
  try {
    if (consultas.length) await q.lote(consultas);
  } catch (e) {
    return json({ erro: "d1", detalhe: String(e && e.message).slice(0, 300) }, 500);
  }
  const fim = !T.chave || linhas.length < POR_VEZ;
  const depois = T.chave && linhas.length ? Number(linhas[linhas.length - 1][T.chave]) : (primeira ? -1 : Number(corpo.depois));
  return json({ ok: true, copiadas: linhas.length, depois, fim });
}
