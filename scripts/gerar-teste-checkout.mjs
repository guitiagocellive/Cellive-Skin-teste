/* Páginas de TESTE da escolha do kit: teste-checkout-1.html a teste-checkout-4.html
   (op.celliveskin.com/teste-checkout-1 ...), feitas a partir da prévia do lançamento
   da v2 (lancamento.html) com assets/css/kits-teste.css e assets/js/kits-teste.js.
   São temporárias: para tirar, apague os 4 arquivos, este script e os dois kits-teste.* */
import { readFile, writeFile } from "node:fs/promises";

const RAIZ = new URL("../", import.meta.url);
const base = await readFile(new URL("lancamento.html", RAIZ), "utf8");
const NOMES = { 1: "três colunas + por que esse kit", 2: "três colunas + frase e vantagens", 3: "cartões com benefícios", 4: "colunas com frascos + você economiza" };

for (const n of [1, 2, 3, 4]) {
  let html = base
    .replace(/<!-- PRÉVIA DO LANÇAMENTO[^>]*-->/, `<!-- TESTE DA ESCOLHA DO KIT (versão ${n}: ${NOMES[n]}), GERADA por scripts/gerar-teste-checkout.mjs. Página temporária. -->`)
    .replace('data-pagina="lancamento-previa"', `data-pagina="teste-checkout" data-kit-teste="${n}"`)
    .replace(/<title>PRÉVIA DO LANÇAMENTO · /, `<title>TESTE CHECKOUT ${n} · `)
    .replace('<link rel="stylesheet" href="/assets/css/oferta.css">', '<link rel="stylesheet" href="/assets/css/oferta.css">\n  <link rel="stylesheet" href="/assets/css/kits-teste.css">')
    .replace(/(<script src="\/assets\/js\/oferta-avaliacoes\.js" defer><\/script>)/, '$1\n  <script src="/assets/js/kits-teste.js" defer></script>');
  for (const marca of [`data-kit-teste="${n}"`, "kits-teste.css", "kits-teste.js", "noindex"]) {
    if (!html.includes(marca)) { console.error(`teste-checkout-${n}: faltou ${marca}`); process.exit(1); }
  }
  await writeFile(new URL(`teste-checkout-${n}.html`, RAIZ), html);
}
console.log("teste-checkout-1 a 4 gerados.");
