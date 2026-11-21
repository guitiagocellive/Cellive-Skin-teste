/* Porta de entrada do site na Cloudflare.
   As páginas, imagens e vídeos saem direto dos arquivos (sem passar por aqui), exceto os
   endereços listados em "run_worker_first" no wrangler.jsonc: "/", "/painel", "/favicon.ico" e "/api/*".

   Endereços próprios (o que antes era o middleware.js da Vercel):
   - op.celliveskin.com        → a página inicial é a oferta direta (v2). Os parâmetros (UTMs) continuam.
   - analises.celliveskin.com  → a página inicial é o painel (o painel continua pedindo a senha);
     quiz.celliveskin.com/painel e op.celliveskin.com/painel levam para lá.
   - /favicon.ico: ícone preto na OP, azul no quiz.
   - /api/<nome> chama a função de api/<nome>.js (GET, POST... exportados por ela);
     /api/venda/<código> = /api/venda?t=<código> (endereço do webhook da B4You). */

import * as agente from "../api/agente.js";
import * as analise from "../api/analise.js";
import * as estrategia from "../api/estrategia.js";
import * as evento from "../api/evento.js";
import * as lead from "../api/lead.js";
import * as meta from "../api/meta.js";
import * as migrar from "../api/migrar.js";
import * as painel from "../api/painel.js";
import * as produtos from "../api/produtos.js";
import * as venda from "../api/venda.js";
import * as vendas from "../api/vendas.js";

const FUNCOES = { agente, analise, estrategia, evento, lead, meta, migrar, painel, produtos, venda, vendas };
const PAINEL = "analises.celliveskin.com";

const naoIndexar = (resposta) => {
  const r = new Response(resposta.body, resposta);
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  return r;
};

async function api(request, url) {
  const partes = url.pathname.slice(5).split("/").filter(Boolean); // depois de "/api/"
  const nome = partes[0] || "";
  const mod = Object.hasOwn(FUNCOES, nome) ? FUNCOES[nome] : null;
  if (!mod) return Response.json({ erro: "nao-encontrado" }, { status: 404, headers: { "cache-control": "no-store" } });
  let req = request;
  if (nome === "venda" && partes[1]) {
    // /api/venda/<código> → /api/venda?t=<código>
    const nova = new URL(url);
    nova.pathname = "/api/venda";
    nova.searchParams.set("t", decodeURIComponent(partes[1]));
    req = new Request(nova, request);
  }
  const metodo = request.method.toUpperCase();
  const fn = mod[metodo] || (metodo === "HEAD" && mod.GET);
  if (typeof fn !== "function") {
    return new Response(null, { status: 405, headers: { allow: Object.keys(mod).filter((k) => /^[A-Z]+$/.test(k)).join(", "), "cache-control": "no-store" } });
  }
  try {
    const r = await fn(req);
    if (!r.headers.has("cache-control")) {
      const c = new Response(r.body, r);
      c.headers.set("cache-control", "no-store");
      return c;
    }
    return r;
  } catch (e) {
    console.error("erro em /api/" + nome, e && e.stack ? e.stack : e);
    return Response.json({ erro: "interno" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (url.pathname.startsWith("/api/")) return api(request, url);

    const arquivo = (caminho) => {
      const u = new URL(url);
      u.pathname = caminho;
      return env.ASSETS.fetch(new Request(u, request));
    };
    const ehOp = host === "op.celliveskin.com" || host.startsWith("v2.");

    // ícone do site: preto na OP; azul (o favicon.ico da raiz) no quiz e no resto
    if (url.pathname === "/favicon.ico") return arquivo(ehOp ? "/assets/img/icone/op.ico" : "/favicon.ico");

    if (host === PAINEL) {
      // analises.celliveskin.com/painel → analises.celliveskin.com/
      if (url.pathname === "/painel") return Response.redirect(new URL("/" + url.search, url), 308);
      if (url.pathname === "/") return naoIndexar(await arquivo("/painel"));
      return naoIndexar(await env.ASSETS.fetch(request));
    }

    // painel nos outros endereços do site (quiz.…/painel, op.…/painel) → endereço próprio
    if (url.pathname === "/painel") {
      if (host.endsWith("celliveskin.com")) return Response.redirect("https://" + PAINEL + "/" + url.search, 308);
      return naoIndexar(await env.ASSETS.fetch(request)); // endereço de teste (.workers.dev)
    }

    if (url.pathname === "/" && ehOp) return arquivo("/v2");

    return env.ASSETS.fetch(request);
  },
};
