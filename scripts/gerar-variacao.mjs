/* Gera a VARIAÇÃO minimalista da OP (op.celliveskin.com/variacao) a partir da v2 atual.

   node scripts/gerar-variacao.mjs   (o gerar-v2.mjs não roda este; rode depois dele)

   Mesmo CSS, JS e textos da v2; só muda o HTML:
   - (no momento igual à OP: as mudanças testadas aqui já foram para todas as páginas)
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

// (o que a variação tirava — selo, frase do estoque e título dos planos — agora saiu de todas
// as páginas; aqui ficam só as diferenças de teste que existirem)

// sem rastreio do painel (avaliação não entra nos números)
html = html.replace(/\s*<!-- Rastreamento próprio[^>]*-->\s*<script src="assets\/(?:js|min)\/rastreio\.js[^"]*" defer><\/script>/, "");
if (html.includes("rastreio.js")) erro("não consegui tirar o rastreio.js");


await writeFile(new URL("variacao.html", RAIZ), html);
console.log("variacao.html gerado (variação minimalista da OP).");
