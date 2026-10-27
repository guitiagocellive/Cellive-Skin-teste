/* Gera a página de TESTE (op.celliveskin.com/teste) a partir da v2 atual.

   Serve para ver no ar uma versão nova da oferta sem mexer nas páginas oficiais:
   usa cópias próprias do CSS e do JS (oferta-teste.css / oferta-teste.js), não
   carrega o rastreio do painel (testes não entram nos números) e o cadastro do
   grupo VIP não é gravado (/api/lead?teste=1). Rodar: node scripts/gerar-teste.mjs */
import { readFile, writeFile, copyFile } from "node:fs/promises";

const RAIZ = new URL("../", import.meta.url);
let html = await readFile(new URL("v2.html", RAIZ), "utf8");
const TROCAS = [
  ["<!-- GERADO por scripts/gerar-v2.mjs a partir do oferta.html. Não edite aqui: edite o oferta.html e rode o script. -->",
    "<!-- PÁGINA DE TESTE, GERADA por scripts/gerar-teste.mjs a partir do v2.html. Não edite aqui. -->"],
  ['<html lang="pt-BR" data-pagina="oferta" data-versao="v2">', '<html lang="pt-BR" data-pagina="teste">'],
  ["<title>Sérum Revitalizador | Cellive Skin</title>", '<title>TESTE · Sérum Revitalizador | Cellive Skin</title>\n  <meta name="robots" content="noindex, nofollow">'],
  ['href="assets/css/oferta.css"', 'href="assets/css/oferta-teste.css"'],
  ['src="assets/js/oferta.js"', 'src="assets/js/oferta-teste.js"'],
];
for (const [de, para] of TROCAS) {
  if (!html.includes(de)) { console.error("Não encontrei no v2.html: " + de); process.exit(1); }
  html = html.split(de).join(para);
}
// sem rastreio do painel
html = html.replace(/\s*<!-- Rastreamento próprio[^>]*-->\s*<script src="assets\/js\/rastreio\.js" defer><\/script>/, "");
if (html.includes("rastreio.js")) { console.error("Não consegui tirar o rastreio.js"); process.exit(1); }
await writeFile(new URL("teste.html", RAIZ), html);
await copyFile(new URL("assets/css/oferta.css", RAIZ), new URL("assets/css/oferta-teste.css", RAIZ));
let js = await readFile(new URL("assets/js/oferta.js", RAIZ), "utf8");
if (!js.includes('fetch("/api/lead"')) { console.error("Não encontrei o envio do cadastro no oferta.js"); process.exit(1); }
js = js.replace('fetch("/api/lead"', 'fetch("/api/lead?teste=1"');
await writeFile(new URL("assets/js/oferta-teste.js", RAIZ), js);
console.log("teste.html, oferta-teste.css e oferta-teste.js gerados.");
