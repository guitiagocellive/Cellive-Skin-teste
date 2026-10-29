/* CSS da primeira dobra dentro do próprio HTML (só na oferta do quiz: oferta.html).

   node scripts/css-critico.mjs   (o gerar-v2.mjs já roda no fim)

   Abre a página num navegador (Playwright), separa as regras do CSS que
   desenham a primeira dobra (topo, faixa, produto, galeria, escolha do kit,
   depoimentos e dúvidas rápidas) e coloca essas regras num <style> no <head>.
   O CSS completo continua vindo do arquivo, mas sem segurar a primeira tela
   (rel="preload" que vira stylesheet ao chegar).

   O bloco fica entre os marcadores CSS-CRITICO. Rodar de novo troca o bloco,
   então ele acompanha qualquer mudança no CSS. A v2 (OP) não usa: o
   gerar-v2.mjs tira o bloco antes de montar a v2. */
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const RAIZ = new URL("../", import.meta.url);
const PAGINA = new URL("oferta.html", RAIZ);
const INICIO = "<!-- CSS-CRITICO:INICIO";
const FIM = "<!-- CSS-CRITICO:FIM -->";

// tira o bloco e devolve o <link> normal do CSS (usado aqui e no gerar-v2.mjs)
export function semCssCritico(html) {
  const i = html.indexOf(INICIO);
  if (i < 0) return html;
  const f = html.indexOf(FIM, i);
  const bloco = html.slice(i, f + FIM.length);
  const href = bloco.match(/<noscript><link rel="stylesheet" href="([^"]+)"><\/noscript>/)[1];
  return html.slice(0, i) + `<link rel="stylesheet" href="${href}">` + html.slice(f + FIM.length);
}

async function gerar() {
  let playwright;
  try {
    playwright = createRequire(import.meta.url)("playwright");
  } catch (e) {
    console.warn("css-critico: Playwright não está instalado; a página ficou com o CSS normal.");
    await writeFile(PAGINA, semCssCritico(await readFile(PAGINA, "utf8")));
    return;
  }
  const original = semCssCritico(await readFile(PAGINA, "utf8"));
  await writeFile(PAGINA, original);
  const link = original.match(/<link rel="stylesheet" href="(assets\/min\/oferta\.css\?v=[0-9a-f]+)">/);
  if (!link) { console.error("css-critico: não encontrei o <link> do oferta.css"); process.exit(1); }

  // servidor local só para o navegador abrir a página (por file:// ele não deixa ler o CSS)
  const TIPOS = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".ico": "image/x-icon" };
  const servidor = createServer(async (req, res) => {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "oferta.html";
    try {
      const corpo = await readFile(new URL(caminho, RAIZ));
      res.writeHead(200, { "content-type": TIPOS[extname(caminho)] || "application/octet-stream" });
      res.end(corpo);
    } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  const porta = servidor.address().port;

  const navegador = await playwright.chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  await pagina.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // nada de fora (fontes, rastreio)
  await pagina.goto(`http://127.0.0.1:${porta}/oferta.html`, { waitUntil: "load" });
  await pagina.waitForTimeout(600);
  const css = await pagina.evaluate(() => {
    // elementos da primeira dobra (e os que ficam em volta deles)
    const raizes = [".promo-faixa", ".oferta-topo", ".oferta-dobra", ".barra-compra"]
      .map((s) => document.querySelector(s)).filter(Boolean);
    const alvo = new Set([document.documentElement, document.body]);
    raizes.forEach((r) => {
      alvo.add(r);
      r.querySelectorAll("*").forEach((e) => alvo.add(e));
      for (let p = r.parentElement; p; p = p.parentElement) alvo.add(p);
    });
    const ESTADOS = /::?(before|after|placeholder|selection|marker|hover|focus-visible|focus-within|focus|active|visited|-webkit-[\w-]+)/g;
    // estados que só aparecem depois de rolar ou tocar (topo de vidro, barra de compra,
    // kit escolhido): ficam sempre, para não "piscar" se o CSS completo ainda não chegou
    const SEMPRE = /oferta-topo|topo-|barra-compra|plano|faixa|galeria|miniatura|faq|depo|circulado|is-visivel|rv-palavra|data-revelar|data-linha/;
    const usa = (sel) => SEMPRE.test(sel) || sel.split(",").some((s) => {
      const limpo = s.replace(ESTADOS, "").trim() || "*";
      try {
        for (const e of document.querySelectorAll(limpo)) if (alvo.has(e)) return true;
      } catch (err) { return true; } // seletor que o navegador não entende: fica
      return false;
    });
    const animacoes = new Set();
    const juntar = (regras) => {
      let saida = "";
      for (const r of regras) {
        if (r instanceof CSSStyleRule) {
          if (usa(r.selectorText)) {
            saida += r.cssText + "\n";
            const a = r.style.animationName || "";
            a.split(",").forEach((n) => n.trim() && n.trim() !== "none" && animacoes.add(n.trim()));
          }
        } else if (r instanceof CSSMediaRule) {
          const dentro = juntar(r.cssRules);
          if (dentro) saida += `@media ${r.conditionText} {\n${dentro}}\n`;
        } else if (r instanceof CSSSupportsRule) {
          const dentro = juntar(r.cssRules);
          if (dentro) saida += `@supports ${r.conditionText} {\n${dentro}}\n`;
        } else if (r instanceof CSSFontFaceRule) {
          saida += r.cssText + "\n";
        }
      }
      return saida;
    };
    const folha = [...document.styleSheets].find((s) => s.href && s.href.includes("/assets/min/oferta.css"));
    let saida = juntar(folha.cssRules);
    // animações usadas pela primeira dobra
    for (const r of folha.cssRules) {
      if (r instanceof CSSKeyframesRule && animacoes.has(r.name)) saida += r.cssText + "\n";
    }
    return saida;
  });
  await navegador.close();
  servidor.close();

  const { code } = await transform(css, { loader: "css", minify: true });
  const href = link[1];
  // À prova de falha: até o CSS completo chegar, o que fica abaixo da primeira dobra
  // não aparece sem estilo (classe css-espera). Ela sai quando o CSS é aplicado, se ele
  // falhar, ou depois de 4 s. Sem JavaScript nada é escondido (o <noscript> carrega o CSS).
  const livrar = "document.documentElement.classList.remove('css-espera')";
  const bloco = `${INICIO} (gerado por scripts/css-critico.mjs; não edite aqui) -->
  <script>document.documentElement.classList.add("css-espera");setTimeout(function(){${livrar}},4000)</script>
  <style>${code.trim()}html.css-espera main.oferta>:not(.oferta-dobra),html.css-espera .rodape{visibility:hidden}</style>
  <link rel="preload" href="${href}" as="style" onload="this.onload=function(){${livrar}};this.rel='stylesheet'" onerror="${livrar}">
  <noscript><link rel="stylesheet" href="${href}"></noscript>
  ${FIM}`;
  await writeFile(PAGINA, original.replace(link[0], bloco));
  console.log(`css-critico: ${(code.length / 1024).toFixed(1)} KB de CSS da primeira dobra dentro do oferta.html.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await gerar();
export { gerar };
