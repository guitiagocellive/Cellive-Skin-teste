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
    /* "Amado por +5.000 mulheres": cartões mais estreitos e texto em 3 linhas com "Ver mais"
       (abre o texto de todos os cartões de uma vez; "Ver menos" fecha) */
    html[data-versao="v2-minimalista"] .depo { flex-basis: 70%; }
    html[data-versao="v2-minimalista"] .oferta-depoimentos .depo-texto {
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
      padding-bottom: 0; border-bottom: 12px solid var(--blue-mist); /* a 4ª linha não aparece no respiro de baixo */
    }
    html[data-versao="v2-minimalista"] .oferta-depoimentos .depo-corpo { padding: 16px 16px 18px; }
    html[data-versao="v2-minimalista"] .oferta-depoimentos .depo-corpo .estrelas { width: 84px; height: 16px; }
    html[data-versao="v2-minimalista"] .depos-abertos .depo-texto { display: block; -webkit-line-clamp: unset; }
    html[data-versao="v2-minimalista"] .depo-mais {
      grid-column: 1 / -1; justify-self: center; margin: 10px 0 0; padding: 4px 0; border: 0; background: none;
      color: var(--blue); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    html[data-versao="v2-minimalista"] .depo-mais::after {
      content: ""; display: inline-block; width: 7px; height: 7px; margin: 0 0 3px 7px;
      border: solid currentColor; border-width: 0 2px 2px 0; transform: rotate(45deg); transition: transform 0.25s ease;
    }
    html[data-versao="v2-minimalista"] .depos-abertos .depo-mais::after { transform: translateY(3px) rotate(-135deg); }
    @media (min-width: 1024px) {
      html[data-versao="v2-minimalista"] .depo { flex-basis: 66%; }
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

// "Ver mais" nos cartões de depoimento (só aparece se o texto não couber nas 3 linhas)
const VER_MAIS = `<script>
  (function () {
    var depos = document.querySelector("[data-depos]");
    if (!depos) return;
    var textos = depos.querySelectorAll(".depo-texto");
    var botoes = [];
    Array.prototype.forEach.call(textos, function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "depo-mais"; b.textContent = "Ver mais";
      b.setAttribute("data-rastreio", "depoimentos-ver-mais");
      b.addEventListener("click", function () {
        var abrir = !depos.classList.contains("depos-abertos");
        depos.classList.toggle("depos-abertos", abrir);
        botoes.forEach(function (x) { x.textContent = abrir ? "Ver menos" : "Ver mais"; x.setAttribute("aria-expanded", abrir); });
      });
      t.insertAdjacentElement("afterend", b);
      botoes.push(b);
    });
    var conferir = function () {
      if (depos.classList.contains("depos-abertos")) return;
      var algum = false;
      Array.prototype.forEach.call(textos, function (t, i) {
        var corta = t.scrollHeight > t.clientHeight + 2;
        botoes[i].hidden = !corta; if (corta) algum = true;
      });
    };
    conferir();
    window.addEventListener("load", conferir);
    window.addEventListener("resize", conferir);
  })();
  </script>`;
trocar("</body>", VER_MAIS + "\n</body>", "</body>");

await writeFile(new URL("variacao.html", RAIZ), html);
console.log("variacao.html gerado (variação minimalista da OP).");
