/* POST /api/evento — recebe os eventos do rastreio.js e grava no banco. */
import { banco, json } from "./_db.js";

const TIPOS = new Set(["pagina", "etapa", "resposta", "voltar", "quiz_fim", "secao", "plano", "checkout", "clique", "saida", "erro"]);
const corta = (v, n) => (v == null ? null : String(v).slice(0, n));

export async function POST(request) {
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

  let q;
  try { q = await banco(); } catch (e) { return json({ ok: false, erro: "banco" }, 503); }
  if (!q) return json({ ok: false, erro: "sem banco" }, 503);

  // país vem do cabeçalho da Vercel
  const pais = corta(request.headers.get("x-vercel-ip-country"), 4);
  const agora = Date.now();
  const COLS = 17;
  const valores = [];
  const linhas = lista.map((e, i) => {
    const ts = typeof e.ts === "number" && Math.abs(agora - e.ts) < 6 * 3600e3 ? Math.round(e.ts) : agora;
    let extra = null;
    if (e.x && typeof e.x === "object") {
      const txt = JSON.stringify(e.x);
      if (txt.length <= 500) extra = txt;
    }
    valores.push(
      ts, corta(e.v, 40), corta(e.s, 40), e.t, corta(e.p, 40), corta(e.e, 80), corta(e.val, 300), extra,
      corta(e.u && e.u.fonte, 80) || "direto", corta(e.u && e.u.campanha, 120), corta(e.u && e.u.midia, 80), corta(e.u && e.u.conteudo, 120),
      corta(e.ap, 20), corta(e.so, 20), corta(e.nav, 20), pais, !!e.novo
    );
    const base = i * COLS;
    return "(" + Array.from({ length: COLS }, (_, k) => "$" + (base + k + 1) + (k === 7 ? "::jsonb" : "")).join(",") + ")";
  });
  try {
    await q(`INSERT INTO eventos
      (ts, visitante, sessao, tipo, pagina, etapa, valor, extra, fonte, campanha, midia, conteudo, aparelho, sistema, navegador, pais, novo)
      VALUES ${linhas.join(",")}`, valores);
  } catch (e) {
    return json({ ok: false }, 500);
  }
  return json({ ok: true, n: lista.length });
}

export function GET() {
  return json({ ok: false }, 405);
}
