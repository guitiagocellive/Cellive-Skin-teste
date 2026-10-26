/* Liga ou desliga o pré-lançamento nas duas ofertas (quiz e v2).

   node scripts/lancar.mjs          → LANÇA: preços, descontos, estoque, "Comprar Agora"
                                      e checkout voltam exatamente como eram antes
   node scripts/lancar.mjs --voltar → volta para o pré-lançamento (lista do grupo VIP)

   Só troca o atributo data-pre-lancamento do <body> do oferta.html e gera o v2.html
   de novo. Antes de lançar, confere se cada kit tem o link do checkout. */
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const RAIZ = new URL("../", import.meta.url);
const ARQ = new URL("oferta.html", RAIZ);
const PRE = '<body class="oferta-body" data-pre-lancamento>';
const POS = '<body class="oferta-body">';
const voltar = process.argv.includes("--voltar");

let html = await readFile(ARQ, "utf8");
if (voltar) {
  if (!html.includes(POS)) { console.log("A página já está em pré-lançamento."); process.exit(0); }
  html = html.replace(POS, PRE);
} else {
  if (!html.includes(PRE)) { console.log("A página já está lançada."); process.exit(0); }
  const semLink = [...html.matchAll(/<label class="plano[^"]*" data-resumo="([^"]+)"[^>]*data-link="([^"]*)"/g)]
    .filter((m) => !m[2] || m[2] === "#").map((m) => m[1]);
  if (semLink.length && !process.argv.includes("--sem-checkout")) {
    console.error("Falta o link do checkout (data-link no oferta.html) em:\n- " + semLink.join("\n- ") +
      "\nColoque os links e rode de novo (ou use --sem-checkout para lançar mesmo assim).");
    process.exit(1);
  }
  html = html.replace(PRE, POS);
}
await writeFile(ARQ, html);
execFileSync(process.execPath, [new URL("gerar-v2.mjs", import.meta.url).pathname], { stdio: "inherit" });
console.log(voltar ? "Pré-lançamento ligado (oferta e v2)." : "Lançado: preços e checkout de volta (oferta e v2).");
