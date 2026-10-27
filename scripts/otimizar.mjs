/* Velocidade: compacta o CSS e o JS das páginas e versiona os arquivos.

   node scripts/otimizar.mjs

   - CSS: assets/min/style.css (capa, quiz, política, 404) e assets/min/oferta.css
     (style.css + oferta.css num arquivo só, para a oferta, v2 e prévias).
   - JS: cada script de assets/js vira uma versão compactada em assets/min/.
   - Nas páginas, troca os links pelos compactados e acrescenta ?v=<código do
     conteúdo> em CSS, JS e imagens. Com isso o vercel.json pode mandar o celular
     guardar esses arquivos por 1 ano: quando um arquivo muda, o código muda junto
     e o celular baixa o novo.

   Os arquivos que se editam continuam sendo os de assets/css e assets/js.
   Rode este script sempre depois de mexer neles (o gerar-v2.mjs já roda no fim).
   Pode rodar quantas vezes quiser: o resultado é sempre o mesmo. */
import { transform } from "esbuild";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";

const RAIZ = new URL("../", import.meta.url);
const arq = (p) => new URL(p.replace(/^\//, ""), RAIZ);
const existe = (p) => access(arq(p)).then(() => true, () => false);
const codigo = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

const CSS = {
  "assets/min/style.css": ["assets/css/style.css"],
  "assets/min/oferta.css": ["assets/css/style.css", "assets/css/oferta.css"],
};
const JS = ["rastreio", "proxima", "oferta", "oferta-formula", "oferta-avaliacoes", "quiz-perguntas", "quiz"];
// páginas públicas (painel e a página /teste antiga ficam de fora)
const PAGINAS = ["index.html", "quiz.html", "oferta.html", "v2.html", "lancamento.html", "oferta/lancamento.html",
  "politica-de-privacidade.html", "404.html"];

await mkdir(arq("assets/min/"), { recursive: true });

// 1) CSS compactado
for (const [saida, fontes] of Object.entries(CSS)) {
  const texto = (await Promise.all(fontes.map((f) => readFile(arq(f), "utf8")))).join("\n");
  const { code } = await transform(texto, { loader: "css", minify: true });
  await writeFile(arq(saida), code);
}

// 2) JS compactado (o proxima.js vai por último: ele leva os endereços já versionados)
const jsExiste = [];
for (const nome of JS) if (await existe(`assets/js/${nome}.js`)) jsExiste.push(nome);
const minificar = async (nome, ajuste) => {
  let texto = await readFile(arq(`assets/js/${nome}.js`), "utf8");
  if (ajuste) texto = await ajuste(texto);
  const { code } = await transform(texto, { loader: "js", minify: true, legalComments: "none" });
  await writeFile(arq(`assets/min/${nome}.js`), code);
};
for (const nome of jsExiste) if (nome !== "proxima") await minificar(nome);

// 3) endereço versionado de cada arquivo
const cache = new Map();
async function versionar(caminho) {
  // caminho sem barra no começo e sem ?v=
  let p = caminho;
  if (p === "assets/css/style.css") p = "assets/min/style.css";
  else if (p === "assets/css/oferta.css") p = "assets/min/oferta.css";
  else {
    const m = p.match(/^assets\/js\/([\w-]+)\.js$/);
    if (m && jsExiste.includes(m[1])) p = `assets/min/${m[1]}.js`;
  }
  if (!cache.has(p)) cache.set(p, (await existe(p)) ? codigo(await readFile(arq(p))) : null);
  const v = cache.get(p);
  return v ? `${p}?v=${v}` : p;
}
const TOKEN = /(^|[\s,"'])(\/?)(assets\/[^\s"',?]+)(\?v=[0-9a-f]+)?/g;
async function trocarTokens(texto) {
  const partes = [];
  let ultimo = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(texto))) {
    partes.push(texto.slice(ultimo, m.index), m[1], m[2], await versionar(m[3]));
    ultimo = m.index + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return partes.join("");
}

if (jsExiste.includes("proxima")) {
  await minificar("proxima", async (texto) => {
    // só as listas de arquivos (strings "assets/...")
    let saida = "", ultimo = 0, m;
    const STR = /"((?:\/)?assets\/[^"]+)"/g;
    while ((m = STR.exec(texto))) {
      saida += texto.slice(ultimo, m.index) + '"' + (await trocarTokens(m[1])) + '"';
      ultimo = m.index + m[0].length;
    }
    return saida + texto.slice(ultimo);
  });
  cache.delete("assets/min/proxima.js");
}

// 4) páginas: junta style+oferta num link só e versiona os atributos
const ATRIBUTO = /\b(src|href|data-src|srcset|data-srcset|imagesrcset|poster|data-poster|data-foto)="([^"]*)"/g;
let mudadas = 0;
for (const pagina of PAGINAS) {
  if (!(await existe(pagina))) continue;
  const antes = await readFile(arq(pagina), "utf8");
  let html = antes.replace(
    /<link rel="stylesheet" href="(\/?)assets\/(?:css|min)\/style\.css(?:\?v=[0-9a-f]+)?">\s*<link rel="stylesheet" href="\1assets\/(?:css|min)\/oferta\.css(?:\?v=[0-9a-f]+)?">/,
    '<link rel="stylesheet" href="$1assets/min/oferta.css">');
  let saida = "", ultimo = 0, m;
  ATRIBUTO.lastIndex = 0;
  while ((m = ATRIBUTO.exec(html))) {
    saida += html.slice(ultimo, m.index) + `${m[1]}="${await trocarTokens(m[2])}"`;
    ultimo = m.index + m[0].length;
  }
  html = saida + html.slice(ultimo);
  if (html !== antes) { await writeFile(arq(pagina), html); mudadas++; }
}
console.log(`otimizar: CSS e JS compactados em assets/min/; ${mudadas} página(s) atualizada(s).`);
