/* Endereço da oferta direta (v2): op.celliveskin.com abre a v2 na página inicial.
   Roda antes da Vercel entregar o index.html (uma regra "rewrites" no vercel.json não
   pega a página inicial, porque o arquivo index.html tem prioridade). Só atua em "/";
   o resto do site não passa por aqui. Os parâmetros (UTMs) continuam na URL. */
import { rewrite } from "@vercel/functions";

export const config = { matcher: "/" };

export default function middleware(request) {
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];
  if (host === "op.celliveskin.com" || host.startsWith("v2.")) {
    const url = new URL(request.url);
    url.pathname = "/v2";
    return rewrite(url);
  }
}
