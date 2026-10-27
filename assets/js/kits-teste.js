/* Escolha do kit — versões de TESTE (só nas páginas teste-checkout-1 a 6).

   Troca a lista de planos e o resumo de preço pela versão indicada em
   <html data-kit-teste="N">. A escolha continua passando pelos planos
   originais (escondidos): tocar num kit marca o plano correspondente, então
   o "Comprar Agora" segue usando o link de checkout de cada kit.
   Parcelas: total ÷ 12 (referência; confirmar com a plataforma de pagamento).
   Apagar junto com as páginas de teste. */
(function () {
  "use strict";

  var versao = document.documentElement.getAttribute("data-kit-teste");
  var secao = document.getElementById("planos");
  var listaOriginal = secao && secao.querySelector(".planos");
  var comprar = secao && secao.querySelector("[data-comprar]");
  if (!versao || !listaOriginal || !comprar) return;

  var K = [
    { n: 1, nome: "1 Unidade", curto: "1 frasco", dias: "30 dias", total: "R$ 197,90", pf: "R$ 197,90", de: null, off: null, ganho: null, tag: null, parc: "R$ 16,49" },
    { n: 2, nome: "2 Unidades", curto: "2 frascos", dias: "60 dias", total: "R$ 297,90", pf: "R$ 148,95", de: "R$ 395,80", off: "24% OFF", ganho: "R$ 97,90", tag: ["Mais vendido", "ink"], parc: "R$ 24,83" },
    { n: 3, nome: "3 Unidades", curto: "3 frascos", dias: "90 dias", total: "R$ 397,90", pf: "R$ 132,63", de: "R$ 593,70", off: "33% OFF", ganho: "R$ 195,80", tag: ["Mais econômico", "claro"], parc: "R$ 33,16" },
  ];
  var IC = {
    pct: '<svg class="ic" viewBox="0 0 24 24"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/></svg>',
    frete: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  };

  var marcado = listaOriginal.querySelector("input:checked");
  var sel = marcado ? Number(marcado.value) : 2;

  var on = function (k) { return k.n === sel ? " on" : ""; };
  var attrs = function (k) { return ' role="radio" tabindex="0" aria-checked="' + (k.n === sel) + '" data-kit="' + k.n + '"'; };
  var tagCol = function (k) { return k.tag ? '<span class="tag tag-' + (k.tag[1] === "ink" ? "ink" : "blue") + '">' + k.tag[0] + "</span>" : ""; };
  var tag = function (k) { return k.tag ? '<span class="tag t-' + k.tag[1] + '">' + k.tag[0] + "</span>" : ""; };
  var grupo = function (cls, itens) { return '<div class="kv ' + cls + ' kt-sel" role="radiogroup" aria-label="Kits">' + itens + "</div>"; };

  /* ---------- resumos ---------- */
  var checks = function (k) {
    return '<div class="lin"><span>Frete <b>grátis</b> para todo o Brasil</span></div>' +
      (k.ganho ? '<div class="lin"><span><b>' + k.off + "</b> · você economiza <b>" + k.ganho + "</b></span></div>"
               : '<div class="lin"><span><b>' + k.curto + "</b> · " + k.dias + " de tratamento</span></div>") +
      '<div class="lin"><span>Garantia de <b>30 dias</b></span></div>';
  };
  var resumo = function (k, cls) {
    return '<div class="kv kv-res rs ' + (cls || "") + '">' + checks(k) +
      '<div class="tot"><span class="rot">Total</span><span class="val">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") +
      "<strong>" + k.total + '</strong></span></div><div class="parc">ou <b>12x de ' + k.parc + "</b> no cartão</div></div>";
  };
  var resumoParcela = function (k) {
    return '<div class="kv kv-res rs parcgrande">' + checks(k) +
      '<div class="tot"><span class="rot">Total</span><span class="val"><span class="p12">12x de <b>' + k.parc + "</b></span>" +
      "<small>ou " + k.total + " à vista" + (k.de ? " · de " + k.de : "") + "</small></span></div></div>";
  };
  var resumoNota = function (k) {
    return '<div class="kv kv-res nota2"><div class="l"><span>' + k.curto + " · " + k.dias + "</span><b>" + (k.de || k.total) + "</b></div>" +
      (k.ganho ? '<div class="l d"><span>Desconto do kit (' + k.off.replace(" OFF", "") + ")</span><b>− " + k.ganho + "</b></div>" : "") +
      '<div class="l"><span>Frete</span><b>Grátis</b></div><div class="l"><span>Garantia</span><b>30 dias</b></div>' +
      '<div class="t"><span>Total</span><strong>' + k.total + '</strong></div><div class="p">ou <b>12x de ' + k.parc + "</b> no cartão</div></div>";
  };

  /* ---------- seleções ---------- */
  var colunas = function () {
    return grupo("s2", K.map(function (k) {
      return '<div class="k' + on(k) + '"' + attrs(k) + ">" + tagCol(k) +
        '<div class="num">' + k.n + '</div><div class="un">' + (k.n > 1 ? "Frascos" : "Frasco") + '</div><div class="dias">' + k.dias + "</div>" +
        '<div class="pf">' + k.pf + '</div><div class="pfl">por frasco</div><div class="off">' + (k.off ? '<span class="tag tag-off">' + k.off + "</span>" : "") + "</div></div>";
    }).join(""));
  };
  var cartoes = function () {
    return grupo("g", K.map(function (k) {
      return '<div class="k' + on(k) + '"' + attrs(k) + ">" + tag(k) +
        '<div class="topo"><span class="radio"></span><div class="info"><div class="nome">' + k.nome + '</div><div class="sub">' + k.dias + " · " + k.pf + "/frasco</div></div>" +
        '<div class="preco">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") + "<strong>" + k.total + "</strong></div></div>" +
        '<div class="benes"><span class="bene">' + IC.frete + "Frete grátis</span>" +
        (k.off ? '<span class="bene forte">' + IC.pct + k.off + '</span><span class="bene">Economize ' + k.ganho + "</span>" : '<span class="bene">Preço cheio</span>') + "</div></div>";
    }).join(""));
  };
  var compactos = function () {
    return grupo("c3", K.map(function (k) {
      return '<div class="k' + on(k) + '"' + attrs(k) + ">" + tag(k) + '<span class="radio"></span><div class="nome">' + k.nome + "</div>" +
        '<div class="preco">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") + "<strong>" + k.total + "</strong></div>" +
        '<div class="bl"><span>' + IC.frete + "Frete grátis</span><span>" + k.dias + "</span>" +
        (k.off ? "<span><b>" + k.off + " · −" + k.ganho + "</b></span>" : "<span>" + k.pf + "/frasco</span>") + "</div></div>";
    }).join(""));
  };
  var economia = function () {
    return grupo("c5", K.map(function (k) {
      return '<div class="k' + on(k) + '"' + attrs(k) + ">" + tag(k) + '<span class="radio"></span><div class="info"><div class="nome">' + k.nome + "</div>" +
        '<div class="sub">' + k.dias + " · " + k.pf + '/frasco</div></div><div class="dir"><span class="ec' + (k.ganho ? "" : " zero") + '">' +
        (k.ganho ? "Economize " + k.ganho : "Preço cheio") + "</span><small>" + k.total + "</small></div></div>";
    }).join(""));
  };
  var emPreto = function () {
    return grupo("c8", K.map(function (k) {
      return '<div class="k' + on(k) + '"' + attrs(k) + ">" + tag(k) + '<span class="radio"></span><div class="info"><div class="nome">' + k.nome + "</div>" +
        '<div class="sub">' + k.dias + " · " + k.pf + '/frasco</div><div class="chips"><span>Frete grátis</span>' + (k.off ? '<span class="forte">' + k.off + "</span>" : "") + "</div></div>" +
        '<div class="preco">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") + "<strong>" + k.total + "</strong></div></div>";
    }).join(""));
  };

  var V = {
    1: { sel: colunas, res: function (k) { return resumo(k); } },          // três colunas + lista de vantagens
    2: { sel: colunas, res: resumoNota },                                   // três colunas + nota do pedido
    3: { sel: cartoes, res: function (k) { return resumo(k); } },          // cartões com benefícios
    4: { sel: compactos, res: function (k) { return resumo(k, "escuro"); } }, // cartões compactos + bloco preto
    5: { sel: economia, res: resumoParcela },                               // economia + parcela em destaque
    6: { sel: emPreto, res: function (k) { return resumo(k); } },          // escolhido em preto
  }[versao];
  if (!V) return;

  listaOriginal.classList.add("kt-oculto");
  Array.prototype.forEach.call(secao.querySelectorAll(".resumo, .pre-resumo"), function (e) { e.classList.add("kt-oculto"); });

  var aviso = document.createElement("p");
  aviso.className = "kt-aviso";
  aviso.textContent = "PÁGINA DE TESTE · VERSÃO " + versao + " DA ESCOLHA DO KIT";
  var titulo = secao.querySelector(".secao-titulo");
  if (titulo) titulo.parentNode.insertBefore(aviso, titulo);

  var caixaSel = document.createElement("div");
  listaOriginal.parentNode.insertBefore(caixaSel, listaOriginal.nextSibling);
  var caixaRes = document.createElement("div");
  comprar.parentNode.insertBefore(caixaRes, comprar);

  function desenhar(animar) {
    caixaSel.innerHTML = V.sel();
    caixaRes.innerHTML = V.res(K[sel - 1]);
    if (animar && caixaRes.firstChild) caixaRes.firstChild.classList.add("kt-res");
  }

  function escolher(n) {
    if (n === sel) return;
    sel = n;
    var input = listaOriginal.querySelector('input[value="' + n + '"]');
    if (input) { input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); }
    desenhar(true);
    var novo = caixaSel.querySelector('[data-kit="' + n + '"]');
    if (novo) novo.focus({ preventScroll: true });
  }

  caixaSel.addEventListener("click", function (ev) {
    var alvo = ev.target.closest("[data-kit]");
    if (alvo) escolher(Number(alvo.getAttribute("data-kit")));
  });
  caixaSel.addEventListener("keydown", function (ev) {
    var alvo = ev.target.closest("[data-kit]");
    if (!alvo) return;
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); escolher(Number(alvo.getAttribute("data-kit"))); }
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") { ev.preventDefault(); escolher(Math.min(3, sel + 1)); }
    if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") { ev.preventDefault(); escolher(Math.max(1, sel - 1)); }
  });

  desenhar(false);
})();
