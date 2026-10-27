/* Escolha do kit — versões de TESTE (só nas páginas teste-checkout-1 a 4).

   Troca a lista de planos e o resumo de preço pela versão indicada em
   <html data-kit-teste="N">. A escolha continua passando pelos planos
   originais (escondidos): tocar num kit marca o plano correspondente, então
   o "Comprar Agora" segue usando o link de checkout de cada kit.
   Apagar junto com as páginas de teste. */
(function () {
  "use strict";

  var versao = document.documentElement.getAttribute("data-kit-teste");
  var secao = document.getElementById("planos");
  var listaOriginal = secao && secao.querySelector(".planos");
  var comprar = secao && secao.querySelector("[data-comprar]");
  if (!versao || !listaOriginal || !comprar) return;

  var K = [
    { n: 1, nome: "1 Unidade", curto: "1 frasco", dias: "30 dias", total: "R$ 197,90", pf: "R$ 197,90", de: null, off: null, ganho: null, tag: null,
      frase: "Ideal para experimentar", sub: "30 dias para conhecer o sérum e sentir a textura na sua rotina." },
    { n: 2, nome: "2 Unidades", curto: "2 frascos", dias: "60 dias", total: "R$ 297,90", pf: "R$ 148,95", de: "R$ 395,80", off: "24% OFF", ganho: "R$ 97,90", tag: ["Mais vendido", "ink"],
      frase: "Para resultados mais visíveis", sub: "60 dias de uso contínuo: tempo para acompanhar a evolução da pele." },
    { n: 3, nome: "3 Unidades", curto: "3 frascos", dias: "90 dias", total: "R$ 397,90", pf: "R$ 132,63", de: "R$ 593,70", off: "33% OFF", ganho: "R$ 195,80", tag: ["Mais econômico", "claro"],
      frase: "Mais econômico e resultados mais consistentes", sub: "90 dias de uso contínuo com o menor preço por frasco." },
  ];
  var PARC = "em até 12x no cartão";
  var IC = {
    pct: '<svg viewBox="0 0 24 24"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/></svg>',
    frete: '<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    escudo: '<svg viewBox="0 0 24 24"><path d="M12 3l7 2.8v5.4c0 4.6-3 7.8-7 9.8-4-2-7-5.2-7-9.8V5.8z"/><path d="m9 12 2 2 4-4"/></svg>',
  };
  var icone = function (svg) { return svg.replace("<svg ", '<svg class="ic" '); };

  // seleção começa no plano marcado na página (kit 2)
  var marcado = listaOriginal.querySelector("input:checked");
  var sel = marcado ? Number(marcado.value) : 2;

  var tagA = function (k) { return k.tag ? '<span class="tag tag-' + (k.tag[1] === "ink" ? "ink" : "blue") + '">' + k.tag[0] + "</span>" : ""; };
  var tagB = function (k) { return k.tag ? '<span class="tag t-' + k.tag[1] + '">' + k.tag[0] + "</span>" : ""; };
  var on = function (k) { return k.n === sel ? " on" : ""; };
  var frascos = function (n) { var s = ""; for (var i = 0; i < n; i++) s += '<img src="/assets/img/oferta/frasco-tampa.webp" alt="">'; return '<div class="frascos n' + n + '">' + s + "</div>"; };
  var total = function (k) {
    return '<div class="totlin"><span class="rot">Total</span><span>' + (k.de ? '<span class="de">' + k.de + "</span> " : "") +
      "<strong>" + k.total + '</strong></span></div><div class="parc">à vista ou ' + PARC + "</div>";
  };

  var colunas = function () {
    return '<div class="kv s2 kt-sel" role="radiogroup" aria-label="Kits">' + K.map(function (k) {
      return '<div class="k' + on(k) + '" role="radio" tabindex="0" aria-checked="' + (k.n === sel) + '" data-kit="' + k.n + '">' + tagA(k) +
        '<div class="num">' + k.n + '</div><div class="un">' + (k.n > 1 ? "Frascos" : "Frasco") + '</div><div class="dias">' + k.dias + "</div>" +
        '<div class="pf">' + k.pf + '</div><div class="pfl">por frasco</div><div class="off">' + (k.off ? '<span class="tag tag-off">' + k.off + "</span>" : "") + "</div></div>";
    }).join("") + "</div>";
  };

  var V = {
    // 1: três colunas + "por que esse kit"
    1: {
      sel: colunas,
      res: function (k) {
        return '<div class="kv kv-res r1"><div class="proposito">' + k.frase + '</div><div class="sub">' + k.sub + '</div><ul class="ck">' +
          "<li><span><b>" + k.curto + "</b> · " + k.dias + " de tratamento</span></li>" +
          (k.ganho ? "<li><span>Você economiza <b>" + k.ganho + "</b> (" + k.off + ")</span></li>" : "") +
          "<li><span><b>Frete grátis</b> para todo o Brasil</span></li><li><span>Garantia de <b>30 dias</b></span></li></ul>" +
          '<div class="totbox">' + total(k) + "</div></div>";
      },
    },
    // 2: três colunas + frase e vantagens
    2: {
      sel: colunas,
      res: function (k) {
        return '<div class="kv kv-res r3"><div class="frase"><div class="proposito">' + k.frase + "</div><small>" + k.sub + "</small></div>" +
          '<div class="ganhos"><div class="' + (k.ganho ? "forte" : "") + '">' + IC.pct + "<b>" + (k.ganho ? "−" + k.ganho : "Preço cheio") + "</b><small>" + (k.off || "sem desconto") + "</small></div>" +
          "<div>" + IC.frete + "<b>Grátis</b><small>frete</small></div><div>" + IC.escudo + "<b>30 dias</b><small>de garantia</small></div></div>" +
          '<div class="centro">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") + "<strong>" + k.total + "</strong><div>à vista ou " + PARC + "</div></div></div>";
      },
    },
    // 3: cartões com benefícios + bloco preto
    3: {
      sel: function () {
        return '<div class="kv g kt-sel" role="radiogroup" aria-label="Kits">' + K.map(function (k) {
          return '<div class="k' + on(k) + '" role="radio" tabindex="0" aria-checked="' + (k.n === sel) + '" data-kit="' + k.n + '">' + tagB(k) +
            '<div class="topo"><span class="radio"></span><div class="info"><div class="nome">' + k.nome + '</div><div class="sub">' + k.dias + " · " + k.pf + "/frasco</div></div>" +
            '<div class="preco">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") + "<strong>" + k.total + "</strong></div></div>" +
            '<div class="benes"><span class="bene">' + icone(IC.frete) + "Frete grátis</span>" +
            (k.off ? '<span class="bene forte">' + icone(IC.pct) + k.off + '</span><span class="bene">Economize ' + k.ganho + "</span>" : '<span class="bene">Preço cheio</span>') + "</div></div>";
        }).join("") + "</div>";
      },
      res: function (k) {
        return '<div class="kv kv-res resG"><div class="esq"><small>Seu kit</small><b>' + k.nome + " · " + k.dias + "</b><small>Frete grátis · " + PARC + "</small></div>" +
          '<div class="dir"><strong>' + k.total + "</strong><small>" + (k.ganho ? "você economiza " + k.ganho : "frete grátis") + "</small></div></div>";
      },
    },
    // 4: colunas com os frascos + "você economiza"
    4: {
      sel: function () {
        return '<div class="kv v2c kt-sel" role="radiogroup" aria-label="Kits">' + K.map(function (k) {
          return '<div class="k' + on(k) + '" role="radio" tabindex="0" aria-checked="' + (k.n === sel) + '" data-kit="' + k.n + '">' + tagB(k) + frascos(k.n) +
            '<div class="nome">' + k.nome + '</div><div class="total">' + k.total + '</div><div class="pf">' + k.pf + "/frasco</div>" +
            '<div class="off">' + (k.off ? '<span class="tag ' + (k.n === sel ? "t-ink" : "t-cinza") + '">' + k.off + "</span>" : '<span class="tag t-cinza">Frete grátis</span>') + "</div></div>";
        }).join("") + "</div>";
      },
      res: function (k) {
        return '<div class="kv kv-res res2">' + (k.ganho ? '<span class="eco">' + icone(IC.pct) + "Você economiza " + k.ganho + "</span>" : '<span class="eco">' + icone(IC.frete) + "Frete grátis incluso</span>") +
          '<div class="total">' + (k.de ? '<span class="de">' + k.de + "</span>" : "") + k.total + '</div><div class="parc">à vista ou ' + PARC + "</div>" +
          '<div class="selos"><span>' + icone(IC.frete) + "Frete grátis</span><span>" + icone(IC.escudo) + "Garantia de 30 dias</span></div></div>";
      },
    },
  }[versao];
  if (!V) return;

  // esconde a lista e o resumo originais (continuam na página, por trás)
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
    // marca o plano original: o "Comprar Agora" usa o checkout desse kit
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
