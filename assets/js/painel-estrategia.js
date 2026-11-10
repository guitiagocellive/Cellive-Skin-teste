/* Aba "Estratégia" do painel: cruza o rastreio do site com as vendas da B4You.

   Busca /api/estrategia (com a senha do painel) quando a aba é aberta e a cada atualização do
   painel com ela aberta. Segue o período do topo e compara com o período anterior do mesmo tamanho.
   Mostra: comparativo, lucro estimado (com os custos editáveis), campanhas e anúncios (com gasto e
   retorno da Meta quando ligada), o que faz vender (seções), jornada do comprador, aparelhos,
   kits (clique × compra) e melhores horários. No modo demonstração, usa números fictícios. */
(function () {
  "use strict";

  var App = window.PainelApp;
  var secao = document.querySelector('[data-painel-aba="estrategia"]');
  if (!App || !secao) return;

  var $ = function (s) { return secao.querySelector(s); };
  var NUM = new Intl.NumberFormat("pt-BR");
  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var dados = null, nivel = "campanhas", mapaTipo = "cliques", carregando = false;

  var SECOES = {
    produto: "Produto (topo)", planos: "Planos e preços", depoimentos: "Depoimentos (+5.000 mulheres)", "duvidas-topo": "Dúvidas rápidas",
    envelhece: "Você envelhece", conheca: "Conheça o Sérum", formula: "Fórmula completa", srrp: "Ação SRRP", inimigo: "O verdadeiro inimigo",
    reset: "O reset", aliado: "O que ele te proporciona", microagulhamento: "Microagulhamento", clientes: "Um pouco dos nossos clientes",
    garantia: "Garantia", resultados: "Resultados reais", faixa: "Faixa de benefícios", videos: "Vídeos (stories)",
    confianca: "Resultado para confiar", numeros: "Os números falam por si", jornada: "Como ele age na pele", duvidas: "Principais dúvidas",
    avaliacoes: "Avaliação dos clientes", "chamada-final": "Comece hoje o seu reset", rodape: "Rodapé",
  };
  var DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function limpar(no) { while (no.firstChild) no.removeChild(no.firstChild); return no; }
  function n(v) { return v == null ? "–" : NUM.format(Math.round(v)); }
  function r$(v) { return v == null ? "–" : BRL.format(v); }
  function pct(v, casas) { return v == null ? "–" : (100 * v).toFixed(casas == null ? 1 : casas).replace(".", ",") + "%"; }
  function vezes(v) { return v == null ? "–" : v.toFixed(2).replace(".", ",") + "x"; }
  function horas(h) { if (h == null) return "–"; if (h < 1) return Math.round(h * 60) + " min"; if (h < 48) return (Math.round(h * 10) / 10).toString().replace(".", ",") + " h"; return Math.round(h / 24) + " dias"; }
  function dataCurta(ms) { var d = new Date(ms); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
  function intervalo() {
    var p = App.periodo();
    var de = new Date(p.de + "T00:00:00"), ate = new Date(p.ate + "T00:00:00");
    ate.setDate(ate.getDate() + 1);
    return { de: de.getTime(), ate: ate.getTime() };
  }

  /* ---------- dados ---------- */
  function demo(r) {
    var m = function (vis, cl, vd, fat, gasto) {
      var com = fat * 0.92, prod = vd * 1.6 * 32, fr = vd * 18, imp = fat * 0.06, lucro = com - gasto - prod - fr - imp;
      return { visitas: vis, cliques: cl, vendas: vd, upsells: Math.round(vd * 0.3), faturamento: fat, comissao: com, ticket: fat / vd, conversao: vd / vis,
        conversao_checkout: vd / cl, gasto: gasto, roas: fat / gasto, cpa: gasto / vd, frascos: Math.round(vd * 1.6), custo_produtos: prod, frete: fr, impostos: imp,
        lucro: lucro, margem: lucro / fat, devolvidas: 1 };
    };
    var linha = function (nome, vis, cl, vd, fat, gasto) { return { nome: nome, visitas: vis, cliques: cl, vendas: vd, faturamento: fat, gasto: gasto, conversao: vd / vis, roas: gasto ? fat / gasto : null, cpa: gasto && vd ? gasto / vd : null }; };
    var horasM = function (pico) { return DIAS.map(function (_, d) { return Array.from({ length: 24 }, function (_, h) { var base = Math.max(0, Math.round((Math.sin((h - 6) / 24 * Math.PI * 2 - 1.2) + 1) * pico)); return base + (d === 0 || d === 6 ? 1 : 0); }); }); };
    return {
      periodo: { de: r.de, ate: r.ate, deAnt: r.de - (r.ate - r.de), ateAnt: r.de },
      custos: { custo_frasco: 32, frete_pedido: 18, imposto_pct: 6 },
      atual: m(3550, 148, 28, 11022.3, 4239.35), anterior: m(3120, 121, 21, 8460.1, 3810.2),
      campanhas: { meta: "ok", linhas: [linha("botox (exemplo)", 1480, 70, 14, 5310, 1820), linha("pele-mais-velha (exemplo)", 1210, 48, 9, 3420, 1550), linha("rotina-coreana (exemplo)", 610, 21, 4, 1590, 869.35), linha("(sem utm)", 250, 9, 1, 702.3, null)] },
      anuncios: { meta: "ok", linhas: [linha("video-pe-de-galinha (exemplo)", 990, 52, 11, 4100, 1210), linha("video-botox-congela (exemplo)", 820, 38, 8, 3010, 1190), linha("video-rotina-noite (exemplo)", 700, 25, 5, 1890, 980), linha("video-teste-expressao (exemplo)", 790, 24, 3, 1320, 859.35)] },
      secoes: [["videos", 0.42, 0.081, 0.031], ["avaliacoes", 0.38, 0.072, 0.035], ["garantia", 0.55, 0.064, 0.028], ["depoimentos", 0.81, 0.051, 0.022], ["formula", 0.66, 0.049, 0.036], ["numeros", 0.47, 0.06, 0.033]]
        .map(function (s) { return { secao: s[0], alcance: s[1], viram: Math.round(s[1] * 2900), clique_viram: s[2], clique_nao_viram: s[3], compraram: Math.round(s[1] * 20) }; }),
      secoes_total: { total: 2900, clicaram: 148, compraram: 28 },
      jornada: { identificadas: 24, total: 28, medidas: 24, horas_mediana: 5.5, visitas_media: 1.8, primeira_visita: 0.58,
        caminhos: [{ nome: "facebook → facebook", vendas: 13 }, { nome: "instagram → facebook", vendas: 5 }, { nome: "direto → whatsapp", vendas: 3 }, { nome: "google → google", vendas: 3 }] },
      porAparelho: [{ aparelho: "celular", visitas: 3010, cliques: 121, vendas: 22, faturamento: 8640 }, { aparelho: "computador", visitas: 470, cliques: 24, vendas: 5, faturamento: 2080 }, { aparelho: "tablet", visitas: 70, cliques: 3, vendas: 1, faturamento: 302.3 }],
      kits: [{ kit: "1", cliques: 34, vendas: 6, faturamento: 1187.4 }, { kit: "2", cliques: 82, vendas: 16, faturamento: 4766.4 }, { kit: "3", cliques: 32, vendas: 6, faturamento: 2387.4 }],
      horarios: { cliques: horasM(3), vendas: horasM(0.7) },
    };
  }

  function carregar() {
    var r = intervalo();
    if (App.estado.demo) { dados = demo(r); desenhar(); return; }
    if (!App.estado.senha || carregando) return;
    carregando = true;
    if (!dados) $("[data-est-aviso]").textContent = "Carregando os números…";
    fetch("/api/estrategia?de=" + r.de + "&ate=" + r.ate, { headers: { authorization: "Bearer " + App.estado.senha } })
      .then(function (resp) { if (!resp.ok) throw new Error(String(resp.status)); return resp.json(); })
      .then(function (d) { dados = d; desenhar(); })
      .catch(function () { $("[data-est-aviso]").textContent = "Não foi possível carregar agora. Toque em atualizar no topo."; })
      .then(function () { carregando = false; });
  }

  /* ---------- comparativo ---------- */
  function cartaoComp(rotulo, atual, anterior, fmt, maiorMelhor) {
    var c = el("div", "est-c");
    c.appendChild(el("span", "est-c-rotulo", rotulo));
    c.appendChild(el("strong", "est-c-valor", fmt(atual)));
    var linha = el("span", "est-c-delta");
    if (atual != null && anterior != null && atual === anterior) {
      linha.textContent = "= igual";
      linha.classList.add("is-neutro");
    } else if (atual != null && anterior != null && anterior !== 0) {
      var d = (atual - anterior) / Math.abs(anterior);
      var bom = maiorMelhor === null ? null : (d >= 0) === maiorMelhor;
      linha.textContent = (d >= 0 ? "▲ " : "▼ ") + pct(Math.abs(d), 0);
      linha.classList.add(bom === null ? "is-neutro" : bom ? "is-bom" : "is-ruim");
    } else if (atual != null && (anterior == null || anterior === 0) && atual !== 0) {
      linha.textContent = "novo no período";
      linha.classList.add("is-neutro");
    } else linha.textContent = " ";
    c.appendChild(linha);
    c.appendChild(el("span", "est-c-antes", "antes: " + fmt(anterior)));
    return c;
  }
  function desenharComparativo() {
    var a = dados.atual, b = dados.anterior, p = dados.periodo;
    $("[data-est-periodos]").textContent = dataCurta(p.de) + " a " + dataCurta(p.ate - 1) + " comparado com " + dataCurta(p.deAnt) + " a " + dataCurta(p.ateAnt - 1);
    var box = limpar($("[data-est-comp]"));
    [
      ["Faturamento", "faturamento", r$, true], ["Você recebe", "comissao", r$, true], ["Lucro estimado", "lucro", r$, true],
      ["Vendas do kit", "vendas", n, true], ["Ticket médio", "ticket", r$, true], ["Visitas", "visitas", n, true],
      ["Conversão (visita → venda)", "conversao", function (v) { return pct(v, 2); }, true],
      ["Conversão do checkout", "conversao_checkout", function (v) { return pct(v); }, true],
      ["Gasto na Meta", "gasto", r$, null], ["Retorno sobre o anúncio", "roas", vezes, true], ["Custo por venda", "cpa", r$, false],
      ["Reembolsos", "devolvidas", n, false],
    ].forEach(function (x) { box.appendChild(cartaoComp(x[0], a[x[1]], b[x[1]], x[2], x[3])); });
  }

  /* ---------- lucro ---------- */
  function desenharLucro() {
    var a = dados.atual, c = dados.custos, box = limpar($("[data-est-lucro]"));
    var semCustos = !c.custo_frasco && !c.frete_pedido && !c.imposto_pct;
    var linhas = [
      ["Você recebe da B4You", a.comissao, "+"],
      ["Anúncios na Meta", a.gasto, "−", a.gasto == null ? "Meta não conectada ao painel" : null],
      ["Produto (" + n(a.frascos) + " frascos × " + r$(c.custo_frasco) + ")", a.custo_produtos, "−"],
      ["Frete (" + n(a.vendas) + " pedidos × " + r$(c.frete_pedido) + ")", a.frete, "−"],
      ["Impostos (" + String(c.imposto_pct).replace(".", ",") + "% do faturamento)", a.impostos, "−"],
    ];
    linhas.forEach(function (l) {
      var row = el("div", "est-l");
      row.appendChild(el("span", "est-l-nome", l[0]));
      row.appendChild(el("span", "est-l-valor" + (l[2] === "−" ? " is-menos" : ""), l[1] == null ? (l[3] || "–") : (l[2] === "−" ? "− " : "") + r$(l[1])));
      box.appendChild(row);
    });
    var total = el("div", "est-l est-l-total");
    total.appendChild(el("span", "est-l-nome", "Lucro estimado"));
    total.appendChild(el("strong", "est-l-valor" + (a.lucro < 0 ? " is-ruim" : " is-bom"), r$(a.lucro) + (a.margem != null ? " · " + pct(a.margem, 0) + " do faturamento" : "")));
    box.appendChild(total);
    if (semCustos) box.appendChild(el("p", "lanc-nota", "Os custos ainda não foram preenchidos: abra \"Ajustar os custos\" abaixo para o lucro ficar real."));
    var f = $("[data-est-custos]");
    if (document.activeElement && f.contains(document.activeElement)) return; // não apaga o que a pessoa está digitando
    f.custo_frasco.value = c.custo_frasco || ""; f.frete_pedido.value = c.frete_pedido || ""; f.imposto_pct.value = c.imposto_pct || "";
  }

  /* ---------- campanhas e anúncios ---------- */
  function desenharTabela() {
    var bloco = dados[nivel] || { linhas: [] }, t = limpar($("[data-est-tabela]"));
    var cab = el("tr");
    ["Nome", "Visitas", "Cliques", "Vendas", "Conv.", "Faturamento", "Gasto", "Retorno", "Custo/venda"].forEach(function (h) { cab.appendChild(el("th", null, h)); });
    var thead = el("thead"); thead.appendChild(cab); t.appendChild(thead);
    var tb = el("tbody");
    if (!bloco.linhas.length) {
      var tr0 = el("tr"), td0 = el("td", "est-vazio", "Sem visitas com UTM no período."); td0.colSpan = 9; tr0.appendChild(td0); tb.appendChild(tr0);
    }
    var melhor = Math.max.apply(null, bloco.linhas.map(function (l) { return l.roas || 0; }).concat([0]));
    bloco.linhas.forEach(function (l) {
      var tr = el("tr");
      tr.appendChild(el("td", "est-nome", l.nome));
      [n(l.visitas), n(l.cliques), n(l.vendas), pct(l.conversao), r$(l.faturamento), l.gasto == null ? "–" : r$(l.gasto)].forEach(function (v) { tr.appendChild(el("td", null, v)); });
      var tdR = el("td", l.roas == null ? null : l.roas >= 2 ? "is-bom" : l.roas < 1 ? "is-ruim" : null, vezes(l.roas));
      if (l.roas && l.roas === melhor) tdR.classList.add("is-melhor");
      tr.appendChild(tdR);
      tr.appendChild(el("td", null, l.cpa == null ? "–" : r$(l.cpa)));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    var nota = $("[data-est-tabela-nota]");
    nota.textContent = bloco.meta === "sem-meta"
      ? "Gasto, retorno e custo por venda aparecem quando a conta de anúncios da Meta estiver conectada ao painel (META_TOKEN e META_CONTA na Vercel)."
      : "Para o gasto bater com as vendas, use nos anúncios: utm_campaign={{campaign.name}} e utm_content={{ad.name}}. Retorno em verde = 2x ou mais; em vermelho = menos de 1x.";
  }

  /* ---------- o que faz vender ---------- */
  function desenharSecoes() {
    var box = limpar($("[data-est-secoes]")), lista = dados.secoes || [];
    if (!lista.length) { box.appendChild(el("p", "lanc-vazio", "Ainda sem visitas suficientes na página de oferta neste período.")); return; }
    var maior = Math.max.apply(null, lista.map(function (s) { return Math.max(s.clique_viram || 0, s.clique_nao_viram || 0); }).concat([0.0001]));
    lista.forEach(function (s) {
      var l = el("div", "est-s");
      var topo = el("div", "est-s-topo");
      topo.appendChild(el("span", "est-s-nome", SECOES[s.secao] || s.secao));
      var lift = s.clique_nao_viram ? s.clique_viram / s.clique_nao_viram : null;
      topo.appendChild(el("span", "est-s-lift" + (lift && lift >= 1.2 ? " is-bom" : ""), lift ? (Math.round(lift * 10) / 10).toString().replace(".", ",") + "x mais cliques" : pct(s.alcance, 0) + " viram"));
      l.appendChild(topo);
      [["Viram", s.clique_viram, "is-viu"], ["Não viram", s.clique_nao_viram, "is-nao"]].forEach(function (b) {
        if (b[1] == null) return;
        var r = el("div", "est-s-barra-linha");
        r.appendChild(el("span", "est-s-rot", b[0]));
        var barra = el("span", "est-s-barra"), cheio = el("i", b[2]);
        cheio.style.transform = "scaleX(" + (b[1] / maior).toFixed(4) + ")";
        barra.appendChild(cheio); r.appendChild(barra);
        r.appendChild(el("span", "est-s-num", pct(b[1])));
        l.appendChild(r);
      });
      l.appendChild(el("span", "vend-etapa-sub", n(s.viram) + " pessoas viram (" + pct(s.alcance, 0) + " de quem abriu a oferta)" + (s.compraram ? " · " + n(s.compraram) + " compraram" : "")));
      box.appendChild(l);
    });
  }

  /* ---------- jornada ---------- */
  function cartaoNum(rotulo, valor, detalhe, destaque) {
    var c = el("div", "lanc-kpi" + (destaque ? " is-destaque" : ""));
    c.appendChild(el("span", "lanc-kpi-rotulo", rotulo));
    c.appendChild(el("strong", "lanc-kpi-valor", valor));
    if (detalhe) c.appendChild(el("span", "lanc-kpi-detalhe", detalhe));
    return c;
  }
  function desenharJornada() {
    var j = dados.jornada || {}, box = limpar($("[data-est-jornada]")), cam = limpar($("[data-est-caminhos]"));
    if (!j.medidas) {
      box.appendChild(cartaoNum("Vendas com jornada", n(j.identificadas || 0) + " de " + n(j.total || 0), "aparece conforme chegam vendas ligadas a uma visita do site"));
      return;
    }
    box.appendChild(cartaoNum("Tempo até comprar", horas(j.horas_mediana), "metade compra em menos que isso, desde a 1ª visita", true));
    box.appendChild(cartaoNum("Compram na 1ª visita", pct(j.primeira_visita, 0), "o resto volta outro dia"));
    box.appendChild(cartaoNum("Visitas até comprar", j.visitas_media == null ? "–" : j.visitas_media.toFixed(1).replace(".", ","), "em média"));
    box.appendChild(cartaoNum("Vendas com jornada", n(j.identificadas) + " de " + n(j.total), "ligadas a uma visita do site"));
    if (j.caminhos && j.caminhos.length) {
      cam.appendChild(el("p", "est-sub", "Primeira fonte → fonte da compra"));
      var maior = j.caminhos[0].vendas || 1;
      j.caminhos.forEach(function (c) {
        var l = el("div", "lanc-kit");
        var topo = el("div", "lanc-kit-topo"); topo.appendChild(el("span", "lanc-kit-nome", c.nome)); l.appendChild(topo);
        var barra = el("div", "lanc-kit-barra"), cheio = el("i"); cheio.style.transform = "scaleX(" + (c.vendas / maior).toFixed(4) + ")"; barra.appendChild(cheio); l.appendChild(barra);
        var nums = el("div", "lanc-kit-nums"); nums.appendChild(el("span", null, "")); nums.appendChild(el("strong", null, n(c.vendas) + (c.vendas === 1 ? " venda" : " vendas"))); l.appendChild(nums);
        cam.appendChild(l);
      });
    }
  }

  function desenharAparelhos() {
    var t = limpar($("[data-est-aparelhos]"));
    var cab = el("tr");
    ["Aparelho", "Visitas", "Cliques", "Vendas", "Conv.", "Faturamento"].forEach(function (h) { cab.appendChild(el("th", null, h)); });
    var thead = el("thead"); thead.appendChild(cab); t.appendChild(thead);
    var tb = el("tbody");
    (dados.porAparelho || []).forEach(function (a) {
      var tr = el("tr");
      tr.appendChild(el("td", "est-nome", a.aparelho));
      [n(a.visitas), n(a.cliques), n(a.vendas), a.visitas ? pct(a.vendas / a.visitas, 2) : "–", r$(a.faturamento)].forEach(function (v) { tr.appendChild(el("td", null, v)); });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }

  /* ---------- kits ---------- */
  function desenharKits() {
    var box = limpar($("[data-est-kits]")), lista = dados.kits || [];
    var maior = Math.max.apply(null, lista.map(function (k) { return k.cliques; }).concat([1]));
    lista.forEach(function (k) {
      var l = el("div", "lanc-kit");
      var topo = el("div", "lanc-kit-topo");
      topo.appendChild(el("span", "lanc-kit-nome", "Kit " + k.kit));
      topo.appendChild(el("span", "lanc-kit-desc", k.kit === "1" ? "1 unidade" : k.kit + " unidades"));
      l.appendChild(topo);
      var barra = el("div", "lanc-kit-barra est-kit-barra"), clique = el("i", "is-clique"), venda = el("i", "is-venda");
      clique.style.transform = "scaleX(" + (k.cliques / maior).toFixed(4) + ")";
      venda.style.transform = "scaleX(" + (k.vendas / maior).toFixed(4) + ")";
      barra.appendChild(clique); barra.appendChild(venda); l.appendChild(barra);
      var nums = el("div", "lanc-kit-nums");
      nums.appendChild(el("span", null, n(k.cliques) + " cliques · " + n(k.vendas) + " vendas"));
      nums.appendChild(el("span", null, k.cliques ? pct(k.vendas / k.cliques, 0) + " pagaram" : "–"));
      nums.appendChild(el("strong", null, r$(k.faturamento)));
      l.appendChild(nums);
      box.appendChild(l);
    });
    box.appendChild(el("p", "lanc-nota", "Barra clara = cliques em comprar; verde = vendas pagas. A diferença é quem desistiu no checkout ou ainda não pagou."));
  }

  /* ---------- melhores horários ---------- */
  function desenharMapa() {
    var m = (dados.horarios || {})[mapaTipo] || [], box = limpar($("[data-est-mapa]")), info = $("[data-est-mapa-info]");
    var maior = Math.max.apply(null, m.flat ? m.flat().concat([1]) : [1]);
    var total = 0, melhor = { v: -1 };
    var grade = el("div", "est-grade");
    grade.appendChild(el("span", "est-g-canto", ""));
    for (var h = 0; h < 24; h++) grade.appendChild(el("span", "est-g-hora", h % 3 === 0 ? String(h) : ""));
    var ordem = [1, 2, 3, 4, 5, 6, 0];
    ordem.forEach(function (d) {
      grade.appendChild(el("span", "est-g-dia", DIAS[d]));
      for (var h2 = 0; h2 < 24; h2++) {
        var v = (m[d] || [])[h2] || 0;
        total += v;
        if (v > melhor.v) melhor = { v: v, d: d, h: h2 };
        var c = el("span", "est-g-c");
        c.style.setProperty("--a", v ? (0.15 + 0.85 * v / maior).toFixed(3) : "0");
        c.title = DIAS[d] + " " + h2 + "h: " + v;
        grade.appendChild(c);
      }
    });
    box.appendChild(grade);
    info.textContent = total ? "Pico: " + DIAS[melhor.d] + " às " + melhor.h + "h (" + n(melhor.v) + (mapaTipo === "vendas" ? " vendas" : " cliques") + ") · total " + n(total) : "Sem dados no período.";
  }

  function desenhar() {
    if (!dados) return;
    $("[data-est-aviso]").textContent = App.estado.demo ? "Modo demonstração: números fictícios." : "Vendas da B4You cruzadas com as visitas do site. Segue o período escolhido no topo.";
    desenharComparativo();
    desenharLucro();
    desenharTabela();
    desenharSecoes();
    desenharJornada();
    desenharAparelhos();
    desenharKits();
    desenharMapa();
  }

  /* ---------- interface ---------- */
  Array.prototype.forEach.call(secao.querySelectorAll("[data-est-nivel]"), function (b) {
    b.addEventListener("click", function () {
      nivel = b.getAttribute("data-est-nivel");
      Array.prototype.forEach.call(secao.querySelectorAll("[data-est-nivel]"), function (x) { x.classList.toggle("is-ativo", x === b); });
      if (dados) desenharTabela();
    });
  });
  Array.prototype.forEach.call(secao.querySelectorAll("[data-est-h]"), function (b) {
    b.addEventListener("click", function () {
      mapaTipo = b.getAttribute("data-est-h");
      Array.prototype.forEach.call(secao.querySelectorAll("[data-est-h]"), function (x) { x.classList.toggle("is-ativo", x === b); });
      if (dados) desenharMapa();
    });
  });
  $("[data-est-custos]").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = ev.target, msg = $("[data-est-custos-msg]");
    var corpo = { custo_frasco: f.custo_frasco.value, frete_pedido: f.frete_pedido.value, imposto_pct: f.imposto_pct.value };
    if (App.estado.demo) { msg.textContent = "No modo demonstração os custos não são salvos."; return; }
    msg.textContent = "Salvando…";
    fetch("/api/estrategia", { method: "POST", headers: { authorization: "Bearer " + App.estado.senha, "content-type": "application/json" }, body: JSON.stringify(corpo) })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function () { msg.textContent = "Custos salvos."; if (document.activeElement) document.activeElement.blur(); carregar(); })
      .catch(function () { msg.textContent = "Não foi possível salvar agora."; });
  });

  var botaoAba = document.querySelector('[data-aba="estrategia"]');
  if (botaoAba) botaoAba.addEventListener("click", carregar);
  document.addEventListener("painel:montado", function () {
    if (!secao.hidden) carregar();
    else dados = null;
  });
})();
