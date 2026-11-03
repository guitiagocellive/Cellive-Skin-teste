/* Gera a VARIAÇÃO minimalista da OP (op.celliveskin.com/variacao) a partir da v2 atual.

   node scripts/gerar-variacao.mjs   (o gerar-v2.mjs não roda este; rode depois dele)

   Mesmo CSS, JS e textos da v2; só muda o HTML:
   - sem o selo "Testado dermatologicamente" abaixo das fotos;
   - "Esgotando rápido" sem a frase "Devido à alta demanda...";
   - "O seu novo aliado" (benefícios) vem logo depois de "O que tem dentro" (fórmula),
     e a "Fórmula com ação SRRP" vai para o lugar onde estava o aliado.
   Por enquanto é página de avaliação: sem rastreio do painel e fora do Google. */
import { readFile, writeFile } from "node:fs/promises";

const RAIZ = new URL("../", import.meta.url);
let html = await readFile(new URL("v2.html", RAIZ), "utf8");
const erro = (m) => { console.error("gerar-variacao: " + m); process.exit(1); };
const trocar = (de, para, nome) => { if (!html.includes(de)) erro("não encontrei " + nome); html = html.split(de).join(para); };

trocar("<!-- GERADO por scripts/gerar-v2.mjs a partir do oferta.html. Não edite aqui: edite o oferta.html e rode o script. -->",
  "<!-- VARIAÇÃO MINIMALISTA, GERADA por scripts/gerar-variacao.mjs a partir do v2.html. Não edite aqui. -->", "cabeçalho");
trocar('<html lang="pt-BR" data-pagina="oferta" data-versao="v2">', '<html lang="pt-BR" data-pagina="oferta" data-versao="v2-minimalista">', "<html>");
// espaços entre as seções que trocaram de vizinhas (mesmo respiro do resto da página)
const AJUSTE = `<style>
    html[data-versao="v2-minimalista"] .oferta-aliado { margin-top: calc(var(--vao-secao) - 22px); }
    html[data-versao="v2-minimalista"] .oferta-inimigo { margin-top: var(--vao-secao); }
    html[data-versao="v2-minimalista"] .oferta-srrp { margin-top: calc(var(--vao-secao) - 41px); }
    html[data-versao="v2-minimalista"] .oferta-micro { margin-top: calc(var(--vao-secao) - 21px); }
    @media (min-width: 1024px) {
      html[data-versao="v2-minimalista"] .oferta-aliado { margin-top: calc(var(--vao-secao) - 30px); }
      html[data-versao="v2-minimalista"] .oferta-inimigo { margin-top: calc(var(--vao-secao) + 11px); }
      html[data-versao="v2-minimalista"] .oferta-srrp { margin-top: calc(var(--vao-secao) - 72px); }
      html[data-versao="v2-minimalista"] .oferta-micro { margin-top: calc(var(--vao-secao) - 30px); }
    }
  </style>`;
trocar("<title>Sérum Revitalizador | Cellive Skin</title>",
  '<title>Sérum Revitalizador | Cellive Skin</title>\n  <meta name="robots" content="noindex, nofollow">\n  ' + AJUSTE, "<title>");

// 1) selo abaixo das fotos
const seloIni = html.indexOf("      <!-- Selo abaixo das fotos");
if (seloIni < 0) erro("não encontrei o selo");
const seloFim = html.indexOf("      </div>\n", html.indexOf('<div class="selo-derm">', seloIni)) + "      </div>\n".length;
html = html.slice(0, seloIni) + html.slice(seloFim).replace(/^\n/, "");

// 2) frase do estoque
html = html.replace(/\s*<p class="estoque-texto">[^<]*<\/p>/, () => "");
if (html.includes('class="estoque-texto"')) erro("a frase do estoque continua");

// 3) troca de lugar: SRRP <-> O seu novo aliado
const secao = (nome) => {
  const ini = html.indexOf(`<section data-secao="${nome}"`);
  if (ini < 0) erro("não encontrei a seção " + nome);
  return [ini, html.indexOf("</section>", ini) + "</section>".length];
};
const [sI, sF] = secao("srrp"), [aI, aF] = secao("aliado");
if (!(sF < aI)) erro("ordem inesperada entre srrp e aliado");
const srrp = html.slice(sI, sF), aliado = html.slice(aI, aF);
html = html.slice(0, sI) + aliado + html.slice(sF, aI) + srrp + html.slice(aF);

// sem rastreio do painel (avaliação não entra nos números)
html = html.replace(/\s*<!-- Rastreamento próprio[^>]*-->\s*<script src="assets\/(?:js|min)\/rastreio\.js[^"]*" defer><\/script>/, "");
if (html.includes("rastreio.js")) erro("não consegui tirar o rastreio.js");

await writeFile(new URL("variacao.html", RAIZ), html);
console.log("variacao.html gerado (variação minimalista da OP).");
