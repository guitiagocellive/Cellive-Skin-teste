/* Gera o v2.html (oferta direta, para anúncios) a partir do oferta.html.

   A v2 é a mesma página de oferta, sem a parte "feita para você" do quiz:
   só troca os textos da lista TROCAS. Assim, toda mudança feita no
   oferta.html chega na v2 rodando:  node scripts/gerar-v2.mjs

   Se algum texto da lista não for encontrado (porque o oferta.html mudou),
   o script para com erro em vez de gerar uma página pela metade. */
import { readFile, writeFile } from "node:fs/promises";

const RAIZ = new URL("../", import.meta.url);

const TROCAS = [
  // marca a página como v2 (o painel separa os números por versão)
  ['<html lang="pt-BR" data-pagina="oferta">', '<html lang="pt-BR" data-pagina="oferta" data-versao="v2">'],
  ["<title>Fórmula Revitalizadora | Cellive Skin</title>", "<title>Sérum Revitalizador | Cellive Skin</title>"],
  // seção da fórmula: fala da fórmula em geral, não de uma fórmula montada pelo quiz
  ["<!-- ===================== DOBRA 7: sua fórmula personalizada =====================\n         Montada pelo assets/js/oferta-formula.js com as respostas do quiz. -->",
    "<!-- ===================== DOBRA 7: a fórmula (versão sem quiz) =====================\n         Montada pelo assets/js/oferta-formula.js com os ativos e seus benefícios. -->"],
  ['<p class="fp-chamada">Feita só para você</p>', '<p class="fp-chamada">O que tem dentro</p>'],
  ['<span class="titulo-leve">Sua fórmula</span> <strong>personalizada</strong>', '<span class="titulo-leve">Uma fórmula</span> <strong>completa</strong>'],
  ['data-rastreio="quero-minha-formula">Quero minha fórmula</a>', 'data-rastreio="quero-minha-formula">Quero o meu Sérum</a>'],
  // a v2 mostra os 24 ativos da fórmula (lista em assets/js/oferta-formula.js)
  ["<strong>mais de 25 ativos</strong> que agem na sua pele", "<strong>24 ativos</strong> que agem na sua pele"],
  ["a Cellive uniu 25 ativos em um único sérum", "a Cellive uniu 24 ativos em um único sérum"],
  ['<p class="fp-resumo" data-formula-resumo>12 ativos que trabalham juntos na sua pele</p>', '<p class="fp-resumo" data-formula-resumo>24 ativos em uma única fórmula</p>'],
];

let html = await readFile(new URL("oferta.html", RAIZ), "utf8");
const faltando = [];
for (const [de, para] of TROCAS) {
  if (!html.includes(de)) { faltando.push(de); continue; }
  html = html.split(de).join(para);
}
if (faltando.length) {
  console.error("Não encontrei no oferta.html:\n- " + faltando.join("\n- "));
  process.exit(1);
}
html = html.replace("<!doctype html>", "<!doctype html>\n<!-- GERADO por scripts/gerar-v2.mjs a partir do oferta.html. Não edite aqui: edite o oferta.html e rode o script. -->");
await writeFile(new URL("v2.html", RAIZ), html);
console.log("v2.html gerado (" + TROCAS.length + " trocas).");
