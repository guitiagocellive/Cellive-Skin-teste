/* Gera a VARIAÇÃO minimalista da OP (op.celliveskin.com/variacao) a partir da v2 atual.

   node scripts/gerar-variacao.mjs   (o gerar-v2.mjs não roda este; rode depois dele)

   Mesmo CSS, JS e textos da v2; só muda o HTML:
   - sem o selo "Testado dermatologicamente" abaixo das fotos;
   - "Esgotando rápido" sem a frase de baixo;
   Por enquanto é página de avaliação: sem rastreio do painel e fora do Google. */
import { readFile, writeFile } from "node:fs/promises";

const RAIZ = new URL("../", import.meta.url);
let html = await readFile(new URL("v2.html", RAIZ), "utf8");
const erro = (m) => { console.error("gerar-variacao: " + m); process.exit(1); };
const trocar = (de, para, nome) => { if (!html.includes(de)) erro("não encontrei " + nome); html = html.split(de).join(para); };

trocar("<!-- GERADO por scripts/gerar-v2.mjs a partir do oferta.html. Não edite aqui: edite o oferta.html e rode o script. -->",
  "<!-- VARIAÇÃO MINIMALISTA, GERADA por scripts/gerar-variacao.mjs a partir do v2.html. Não edite aqui. -->", "cabeçalho");
trocar('<html lang="pt-BR" data-pagina="oferta" data-versao="v2">', '<html lang="pt-BR" data-pagina="oferta" data-versao="v2-minimalista">', "<html>");
trocar("<title>Sérum Revitalizador | Cellive Skin</title>",
  '<title>Sérum Revitalizador | Cellive Skin</title>\n  <meta name="robots" content="noindex, nofollow">', "<title>");

// 1) selo abaixo das fotos
const seloIni = html.indexOf("      <!-- Selo abaixo das fotos");
if (seloIni < 0) erro("não encontrei o selo");
const seloFim = html.indexOf("      </div>\n", html.indexOf('<div class="selo-derm">', seloIni)) + "      </div>\n".length;
html = html.slice(0, seloIni) + html.slice(seloFim).replace(/^\n/, "");

// 1b) cópia do selo embaixo das miniaturas (computador)
html = html.replace(/\s*<!-- Computador: o selo fica aqui[^>]*-->\s*<div class="selo-derm selo-derm--galeria"[\s\S]*?\n          <\/div>\n/, "\n");
if (html.includes("selo-derm")) erro("o selo continua na página");

// 1c) sem o título "Selecione seu plano ideal" (os kits vêm logo depois do "Esgotando rápido")
trocar('      <h2 class="secao-titulo" data-pos><span class="titulo-leve">Selecione seu</span> <strong>plano ideal</strong></h2>\n', "", "título dos planos");

// espaços: benefícios → "Esgotando rápido" e "Esgotando rápido" → kits
const AJUSTE = `<style>
    html[data-versao="v2-minimalista"] .oferta-planos { margin-top: 28px; }
    html[data-versao="v2-minimalista"] .planos { margin-top: 28px; }
  </style>`;
trocar("</head>", "  " + AJUSTE + "\n</head>", "</head>");

// 2) frase do estoque
html = html.replace(/\s*<p class="estoque-texto">[\s\S]*?<\/p>/, () => "");
if (html.includes('class="estoque-texto"')) erro("a frase do estoque continua");

// sem rastreio do painel (avaliação não entra nos números)
html = html.replace(/\s*<!-- Rastreamento próprio[^>]*-->\s*<script src="assets\/(?:js|min)\/rastreio\.js[^"]*" defer><\/script>/, "");
if (html.includes("rastreio.js")) erro("não consegui tirar o rastreio.js");


await writeFile(new URL("variacao.html", RAIZ), html);
console.log("variacao.html gerado (variação minimalista da OP).");
