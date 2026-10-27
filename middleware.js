/* Endereços próprios (rodam antes da Vercel entregar o index.html; uma regra "rewrites"
   no vercel.json não pega a página inicial, porque o arquivo index.html tem prioridade).

   - op.celliveskin.com     → página inicial é a oferta direta (v2). Os parâmetros (UTMs) continuam.
   - analises.celliveskin.com → página inicial é o painel (o painel continua pedindo a senha);
     quiz.celliveskin.com/painel e op.celliveskin.com/painel levam para lá.

   Só atua em "/" e "/painel"; o resto do site não passa por aqui. */
import { rewrite } from "@vercel/functions";

export const config = { matcher: ["/", "/painel"] };

const PAINEL = "analises.celliveskin.com";

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  if (host === PAINEL) {
    // analises.celliveskin.com/painel → analises.celliveskin.com/
    if (url.pathname === "/painel") return Response.redirect(new URL("/" + url.search, url), 308);
    url.pathname = "/painel";
    return rewrite(url);
  }

  // painel nos outros endereços do site (quiz.…/painel, op.…/painel) → endereço próprio
  if (url.pathname === "/painel" && host.endsWith("celliveskin.com")) {
    return Response.redirect("https://" + PAINEL + "/" + url.search, 308);
  }

  if (url.pathname === "/" && (host === "op.celliveskin.com" || host.startsWith("v2."))) {
    url.pathname = "/v2";
    return rewrite(url);
  }
}
