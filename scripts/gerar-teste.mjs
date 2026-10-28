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
  ['<html lang="pt-BR" data-pagina="oferta" data-versao="v2">', '<html lang="pt-BR" data-pagina="teste" data-versao="v2">'],
  // a página de teste mostra a oferta DEPOIS do lançamento (preços, "Comprar Agora" e checkout)
  ['<body class="oferta-body" data-pre-lancamento>', '<body class="oferta-body">'],
  ["<title>Sérum Revitalizador | Cellive Skin</title>", '<title>TESTE · Sérum Revitalizador | Cellive Skin</title>\n  <meta name="robots" content="noindex, nofollow">'],
];
// CSS e JS da oferta → cópias de teste (a v2 pode apontar para assets/css ou para assets/min com ?v=)
for (const [re, para] of [
  // o assets/min/oferta.css junta style.css + oferta.css; no teste vão os dois separados
  [/<link rel="stylesheet" href="assets\/(?:css|min)\/oferta\.css(?:\?v=[a-f0-9]+)?">/,
    '<link rel="stylesheet" href="assets/css/style.css">\n  <link rel="stylesheet" href="assets/css/oferta-teste.css">'],
  [/src="assets\/(?:js|min)\/oferta\.js(?:\?v=[a-f0-9]+)?"/, 'src="assets/js/oferta-teste.js"'],
]) {
  if (!re.test(html)) { console.error("Não encontrei no v2.html: " + re); process.exit(1); }
  html = html.replace(re, para);
}
for (const [de, para] of TROCAS) {
  if (!html.includes(de)) { console.error("Não encontrei no v2.html: " + de); process.exit(1); }
  html = html.split(de).join(para);
}
// sem rastreio do painel
html = html.replace(/\s*<!-- Rastreamento próprio[^>]*-->\s*<script src="assets\/(?:js|min)\/rastreio\.js[^"]*" defer><\/script>/, "");
if (html.includes("rastreio.js")) { console.error("Não consegui tirar o rastreio.js"); process.exit(1); }
await writeFile(new URL("teste.html", RAIZ), html);
await copyFile(new URL("assets/css/oferta.css", RAIZ), new URL("assets/css/oferta-teste.css", RAIZ));
let js = await readFile(new URL("assets/js/oferta.js", RAIZ), "utf8");
if (!js.includes('fetch("/api/lead"')) { console.error("Não encontrei o envio do cadastro no oferta.js"); process.exit(1); }
js = js.replace('fetch("/api/lead"', 'fetch("/api/lead?teste=1"');
await writeFile(new URL("assets/js/oferta-teste.js", RAIZ), js);
// variações do selo da garantia (/teste-selo-1 a 3), para comparar
const SELO_ATUAL = /<span class="garantia-selo"[\s\S]*?<\/svg>\s*<\/span>/;
const SELOS = {
  // 1 · carimbo: texto girando em volta e "30 dias" no meio
  1: `<span class="garantia-selo" role="img" aria-label="Garantia de 30 dias">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <defs><path id="selo-anel-caminho" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs>
              <circle cx="100" cy="100" r="97" fill="#ffffff" stroke="#b1c7de" stroke-width="5"/>
              <circle cx="100" cy="100" r="60" fill="#e0e9f2"/>
              <g class="selo-setas"><text class="selo-anel-texto"><textPath href="#selo-anel-caminho">GARANTIA • REEMBOLSO • GARANTIA • REEMBOLSO •</textPath></text></g>
              <text class="selo-30-escuro" x="100" y="108" text-anchor="middle">30</text>
              <text class="selo-dias-escuro" x="100" y="136" text-anchor="middle">DIAS</text>
            </svg>
          </span>`,
  // 2 · medalha com fitas
  2: `<span class="garantia-selo" role="img" aria-label="Garantia de 30 dias">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <defs><linearGradient id="selo-medalha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e0e9f2"/></linearGradient></defs>
              <path d="M62 128 L40 196 L66 184 L80 206 L98 140Z" fill="#b1c7de"/>
              <path d="M138 128 L160 196 L134 184 L120 206 L102 140Z" fill="#4d74a8"/>
              <circle cx="100" cy="92" r="84" fill="#b1c7de"/>
              <circle cx="100" cy="92" r="74" fill="url(#selo-medalha)"/>
              <circle cx="100" cy="92" r="64" fill="none" stroke="#b1c7de" stroke-width="2" stroke-dasharray="4 5"/>
              <text class="selo-palavra" x="100" y="62" text-anchor="middle">GARANTIA</text>
              <text class="selo-30-escuro" x="100" y="118" text-anchor="middle">30</text>
              <text class="selo-dias-escuro" x="100" y="144" text-anchor="middle">DIAS</text>
            </svg>
          </span>`,
  // 3 · escudo com check
  3: `<span class="garantia-selo" role="img" aria-label="Garantia de 30 dias">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <defs><linearGradient id="selo-escudo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e9f2"/><stop offset="1" stop-color="#b1c7de"/></linearGradient></defs>
              <path d="M100 4 L178 32 V96 C178 146 144 180 100 196 C56 180 22 146 22 96 V32Z" fill="#ffffff" stroke="#b1c7de" stroke-width="6"/>
              <path d="M100 20 L164 43 V96 C164 137 136 166 100 180 C64 166 36 137 36 96 V43Z" fill="url(#selo-escudo)"/>
              <circle cx="100" cy="46" r="13" fill="#ffffff"/>
              <path d="m93 46 5 5 9-10" fill="none" stroke="#4d74a8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
              <text class="selo-30-escuro" x="100" y="122" text-anchor="middle">30</text>
              <text class="selo-dias-escuro" x="100" y="150" text-anchor="middle">DIAS</text>
            </svg>
          </span>`,
};
if (!SELO_ATUAL.test(html)) { console.error("Não encontrei o selo da garantia"); process.exit(1); }
for (const n of [1, 2, 3]) {
  const versao = html
    .replace(SELO_ATUAL, SELOS[n])
    .replace("<title>TESTE · ", "<title>TESTE SELO " + n + " · ");
  await writeFile(new URL("teste-selo-" + n + ".html", RAIZ), versao);
}
// dúvidas rápidas em pílulas: cinza (/teste-pilula-cinza) e azul bebê (/teste-pilula-azul), para comparar
for (const [nome, classe] of [["cinza", "faq-mini faq-mini--v4"], ["azul", "faq-mini faq-mini--v4 faq-mini--azul"]]) {
  const versao = html
    .replace('class="faq-mini faq-mini--v4"', 'class="' + classe + '"')
    .replace("<title>TESTE · ", "<title>TESTE PÍLULA " + nome.toUpperCase() + " · ");
  await writeFile(new URL("teste-pilula-" + nome + ".html", RAIZ), versao);
}
console.log("teste.html, teste-pilula-cinza e -azul, oferta-teste.css e oferta-teste.js gerados.");
