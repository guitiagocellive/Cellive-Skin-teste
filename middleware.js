/* Endereços próprios (rodam antes da Vercel entregar o index.html; uma regra "rewrites"
   no vercel.json não pega a página inicial, porque o arquivo index.html tem prioridade).

   - op.celliveskin.com     → página inicial é a oferta direta (v2). Os parâmetros (UTMs) continuam.
   - analises.celliveskin.com → página inicial é o painel (o painel continua pedindo a senha);
     quiz.celliveskin.com/painel e op.celliveskin.com/painel levam para lá.

   - /favicon.ico: ícone preto na OP, azul no quiz.

   Só atua em "/", "/painel" e "/favicon.ico"; o resto do site não passa por aqui. */
import { rewrite } from "@vercel/functions";

export const config = { matcher: ["/", "/painel", "/favicon.ico"] };

const PAINEL = "analises.celliveskin.com";

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // ícone do site: preto na OP; azul (o favicon.ico da raiz) no quiz e no resto
  if (url.pathname === "/favicon.ico") {
    if (host === "op.celliveskin.com" || host.startsWith("v2.")) {
      url.pathname = "/assets/img/icone/op.ico";
      return rewrite(url);
    }
    return;
  }

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
