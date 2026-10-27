/* Prévias do lançamento: como as ofertas ficam DEPOIS do lançamento (preços,
   "Comprar Agora" e checkout), sem mexer nas páginas oficiais.

   oferta.html → oferta/lancamento.html   (quiz.celliveskin.com/oferta/lancamento)
   v2.html     → lancamento.html          (op.celliveskin.com/lancamento)

   Tira o pré-lançamento, não carrega o rastreio do painel (prévias não entram nos
   números), não aparece no Google e usa caminhos a partir da raiz (a página fica
   dentro de /oferta/). Roda sozinho no fim do scripts/gerar-v2.mjs. */
import { readFile, writeFile, mkdir } from "node:fs/promises";

const RAIZ = new URL("../", import.meta.url);

async function gerar(origem, destino, rotulo) {
  let html = await readFile(new URL(origem, RAIZ), "utf8");
  html = html
    .replace(/<!-- GERADO por scripts\/gerar-v2\.mjs[^>]*-->\n?/, "")
    .replace("<!doctype html>", `<!doctype html>\n<!-- PRÉVIA DO LANÇAMENTO, GERADA por scripts/gerar-lancamento.mjs a partir do ${origem}. Não edite aqui. -->`)
    .replace(/<body class="oferta-body" data-pre-lancamento>/, '<body class="oferta-body">')
    .replace(/(<html lang="pt-BR") data-pagina="oferta"( data-versao="v2")?>/, '$1 data-pagina="lancamento-previa">')
    .replace(/<title>([^<]*)<\/title>/, `<title>PRÉVIA DO LANÇAMENTO · $1</title>\n  <meta name="robots" content="noindex, nofollow">`)
    .replace(/\s*<!-- Rastreamento próprio[^>]*-->\s*<script src="assets\/js\/rastreio\.js" defer><\/script>/, "")
    .replace(/(src|href|data-src|data-foto|data-poster|poster)="assets\//g, '$1="/assets/')
    .replace(/href="politica-de-privacidade"/g, 'href="/politica-de-privacidade"')
    .replace(/href="\.\/"/g, 'href="/"');
  const erros = [];
  if (html.includes("data-pre-lancamento>")) erros.push("pré-lançamento continua ligado");
  if (html.includes("rastreio.js")) erros.push("rastreio continua na página");
  if (/="assets\//.test(html)) erros.push("sobrou caminho relativo de assets");
  if (erros.length) { console.error(rotulo + ": " + erros.join("; ")); process.exit(1); }
  await mkdir(new URL(destino.replace(/[^/]*$/, ""), RAIZ), { recursive: true });
  await writeFile(new URL(destino, RAIZ), html);
}

await gerar("oferta.html", "oferta/lancamento.html", "oferta");
await gerar("v2.html", "lancamento.html", "v2");
console.log("Prévias do lançamento geradas: oferta/lancamento.html e lancamento.html.");
