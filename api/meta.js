/* GET /api/meta?de=AAAA-MM-DD&ate=AAAA-MM-DD[&campanha=nome]
   Números dos anúncios da Meta no período (precisa da senha do painel).
   Sem META_TOKEN/META_CONTA na Vercel, responde {erro:"sem-meta"} e o
   painel usa os campos para digitar à mão. */
import { autorizado, banco, json } from "./_db.js";
import { insightsMeta } from "./_meta.js";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request) {
  if (autorizado(request) !== "ok") return json({ erro: "senha" }, 401);
  const url = new URL(request.url);
  const de = url.searchParams.get("de"), ate = url.searchParams.get("ate");
  if (!DATA.test(de || "") || !DATA.test(ate || "")) return json({ erro: "datas" }, 400);
  let q = null;
  try { q = await banco(); } catch (e) { q = null; }
  const r = await insightsMeta(q, de <= ate ? de : ate, de <= ate ? ate : de, (url.searchParams.get("campanha") || "").slice(0, 200));
  return json(r, r.erro === "sem-meta" ? 200 : r.erro ? 502 : 200);
}
