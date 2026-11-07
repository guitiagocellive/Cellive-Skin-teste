/* Aba "Vendas" do painel: vendas que a B4You avisa pelo webhook.

   Busca /api/vendas (com a senha do painel) quando a aba é aberta e de novo a cada
   atualização do painel enquanto ela estiver aberta. Segue o período escolhido no topo.
   Mostra: números do período (vendas, faturamento, quanto você recebe, ticket, conversão,
   retorno sobre o gasto na Meta), vendas por dia, de onde vieram (fonte, campanha, anúncio),
   kits/ofertas, formas de pagamento e as últimas vendas. No modo demonstração, usa vendas fictícias.
   Também monta o cartão "Vendas no período" da aba Resumo (busca a cada atualização do painel)
   e mostra quiz × oferta direta e a lista de compradores (com planilha). */
(function () {
  "use strict";

  var App = window.PainelApp;
  var secao = document.querySelector('[data-painel-aba="vendas"]');
  var resumoCartao = document.querySelector("[data-vend-resumo]");
  if (!App || !secao) return;

  var $ = function (s) { return secao.querySelector(s); };
  var NUM = new Intl.NumberFormat("pt-BR");
  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var dados = null, grupo = "porFonte", carregando = false, chaveAtual = "";

  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function limpar(no) { while (no.firstChild) no.removeChild(no.firstChild); return no; }
  function n(v) { return NUM.format(v || 0); }
  function r$(v) { return BRL.format(v || 0); }
  function pct(a, b) { return b ? (100 * a / b).toFixed(1).replace(".", ",") + "%" : "–"; }
  function diaIso(t) { var d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function intervalo() {
    var p = App.periodo(); // dias "AAAA-MM-DD" no horário do aparelho
    var de = new Date(p.de + "T00:00:00"), ate = new Date(p.ate + "T00:00:00");
    ate.setDate(ate.getDate() + 1);
    return { de: de.getTime(), ate: ate.getTime() };
  }

  var CLASSES = {
    aprovada: { nome: "Aprovada", cor: "is-ok" }, pendente: { nome: "Aguardando pagamento", cor: "is-espera" },
    recusada: { nome: "Recusada", cor: "is-ruim" }, reembolso: { nome: "Reembolsada", cor: "is-ruim" },
    chargeback: { nome: "Chargeback", cor: "is-ruim" }, outro: { nome: "Outro status", cor: "is-espera" },
  };
  var PAGAMENTOS = { card: "Cartão", credit_card: "Cartão", pix: "Pix", billet: "Boleto", boleto: "Boleto" };
  var nomePagamento = function (p) { return PAGAMENTOS[String(p || "").toLowerCase()] || p || "Não informado"; };

  /* ---------- dados ---------- */
  function demo(r) {
    var semente = 7, rnd = function () { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
    var ofertas = [["Kit 1 unidade (exemplo)", 197.9], ["Kit 2 unidades (exemplo)", 297.9], ["Kit 3 unidades (exemplo)", 397.9]];
    var fontes = ["facebook", "instagram", "google", "Sem UTM"], camps = ["botox", "pele-mais-velha", "rotina-coreana"];
    var vendas = [];
    for (var i = 0; i < 48; i++) {
      var o = ofertas[rnd() < 0.25 ? 0 : rnd() < 0.8 ? 1 : 2], k = rnd();
      vendas.push({
        data: r.de + Math.floor(rnd() * (Math.min(r.ate, Date.now()) - r.de)),
        classe: k < 0.8 ? "aprovada" : k < 0.9 ? "pendente" : k < 0.96 ? "recusada" : "reembolso",
        valor: o[1], oferta: o[0], tipo: rnd() < 0.15 ? "upsell" : "main", pagamento: rnd() < 0.7 ? "card" : "pix", parcelas: 1 + Math.floor(rnd() * 6),
        fonte: fontes[Math.floor(rnd() * fontes.length)], campanha: camps[Math.floor(rnd() * camps.length)], anuncio: "video-" + (1 + Math.floor(rnd() * 5)),
      });
    }
    vendas.sort(function (a, b) { return b.data - a.data; });
    var ap = vendas.filter(function (v) { return v.classe === "aprovada"; });
    var soma = function (l) { return l.reduce(function (s, v) { return s + v.valor; }, 0); };
    var agrupar = function (campo) {
      var m = {};
      ap.forEach(function (v) { var x = campo === "pagamento" ? v[campo] : v[campo]; m[x] = m[x] || { nome: x, vendas: 0, valor: 0 }; m[x].vendas++; m[x].valor += v.valor; });
      return Object.keys(m).map(function (x) { return m[x]; }).sort(function (a, b) { return b.valor - a.valor; });
    };
    var porDia = {};
    ap.forEach(function (v) { var d = diaIso(v.data); porDia[d] = porDia[d] || { vendas: 0, valor: 0 }; porDia[d].vendas++; porDia[d].valor += v.valor; });
    var ups = ap.filter(function (v) { return v.tipo === "upsell"; });
    return {
      resumo: {
        aprovadas: ap.length, faturamento: soma(ap), comissao: soma(ap) * 0.92, ticket: ap.length ? soma(ap) / ap.length : 0,
        principais: ap.length - ups.length, upsells: ups.length, upsell_valor: soma(ups),
        pendentes: vendas.filter(function (v) { return v.classe === "pendente"; }).length,
        pendentes_valor: soma(vendas.filter(function (v) { return v.classe === "pendente"; })),
        recusadas: vendas.filter(function (v) { return v.classe === "recusada"; }).length,
        devolvidas: vendas.filter(function (v) { return v.classe === "reembolso"; }).length,
        devolvidas_valor: soma(vendas.filter(function (v) { return v.classe === "reembolso"; })),
        aprovacao: 0.86, pix_gerados: 14, pix_pagos: 9, compradores: Math.min(12, ap.length), recompra: 3,
      },
      cliques: ap.length * 4, gasto: soma(ap) / 2.6,
      porOferta: agrupar("oferta"), porPagamento: agrupar("pagamento"), porFonte: agrupar("fonte"),
      porCampanha: agrupar("campanha"), porAnuncio: agrupar("anuncio"), porDia: porDia, ultimas: vendas.slice(0, 40),
      porFunil: [
        { funil: "quiz", nome: "Funil do quiz", vendas: Math.round(ap.length * 0.45), valor: soma(ap) * 0.45, upsells: 4, visitas: 1240, cliques: 96 },
        { funil: "oferta-direta", nome: "Oferta direta", vendas: Math.round(ap.length * 0.55), valor: soma(ap) * 0.55, upsells: 5, visitas: 2310, cliques: 52 },
      ],
      compradores: ap.slice(0, 12).map(function (v, i) {
        return { nome: "Compradora " + (i + 1) + " (exemplo)", email: "exemplo" + (i + 1) + "@email.com", telefone: "5561999" + String(100000 + i * 7919).slice(0, 6),
          cidade: ["Brasília", "São Paulo", "Goiânia", "Rio de Janeiro"][i % 4], uf: ["DF", "SP", "GO", "RJ"][i % 4],
          compras: i % 5 === 0 ? 2 : 1, upsells: i % 3 === 0 ? 1 : 0, total: v.valor * (i % 5 === 0 ? 2 : 1), devolvidas: 0, ultima: v.data, ofertas: [v.oferta], funil: i % 2 ? "quiz" : "oferta-direta", fonte: v.fonte };
      }),
    };
  }

  function carregar() {
    var r = intervalo();
    if (App.estado.demo) { dados = demo(r); desenharResumo(); desenhar(); return; }
    if (!App.estado.senha || carregando) return;
    var chave = r.de + "-" + r.ate;
    carregando = true;
    if (!dados || chave !== chaveAtual) $("[data-vend-aviso]").textContent = "Carregando as vendas…";
    fetch("/api/vendas?de=" + r.de + "&ate=" + r.ate, { headers: { authorization: "Bearer " + App.estado.senha } })
      .then(function (resp) { if (!resp.ok) throw new Error(String(resp.status)); return resp.json(); })
      .then(function (d) { dados = d; chaveAtual = chave; desenharResumo(); if (!secao.hidden) desenhar(); })
      .catch(function () { $("[data-vend-aviso]").textContent = "Não foi possível carregar as vendas agora. Toque em atualizar no topo."; })
      .then(function () { carregando = false; });
  }

  /* ---------- números do período ---------- */
  function cartaoNum(rotulo, valor, detalhe, destaque) {
    var c = el("div", "lanc-kpi" + (destaque ? " is-destaque" : ""));
    c.appendChild(el("span", "lanc-kpi-rotulo", rotulo));
    c.appendChild(el("strong", "lanc-kpi-valor", valor));
    if (detalhe) c.appendChild(el("span", "lanc-kpi-detalhe", detalhe));
    return c;
  }

  function desenharNumeros() {
    var s = dados.resumo, box = limpar($("[data-vend-kpis]")), box2 = limpar($("[data-vend-kpis2]"));
    box.appendChild(cartaoNum("Vendas aprovadas", n(s.aprovadas), s.upsells ? n(s.principais) + " do kit + " + n(s.upsells) + " de upsell" : "no período", true));
    box.appendChild(cartaoNum("Faturamento", r$(s.faturamento), "vendas aprovadas"));
    box.appendChild(cartaoNum("Você recebe", r$(s.comissao), "depois das taxas da B4You"));
    box.appendChild(cartaoNum("Ticket médio", r$(s.ticket), "por venda aprovada"));
    if (dados.cliques != null) box.appendChild(cartaoNum("Conversão do checkout", pct(s.principais, dados.cliques), n(dados.cliques) + " pessoas clicaram em comprar"));
    if (dados.gasto) {
      box.appendChild(cartaoNum("Retorno sobre o anúncio", (s.faturamento / dados.gasto).toFixed(2).replace(".", ",") + "x", r$(dados.gasto) + " gastos na Meta"));
      box.appendChild(cartaoNum("Custo por venda", s.principais ? r$(dados.gasto / s.principais) : "–", "gasto na Meta ÷ vendas do kit"));
    }
    box2.appendChild(cartaoNum("Aguardando pagamento", n(s.pendentes), s.pendentes ? r$(s.pendentes_valor) + " em Pix ou boleto" : "Pix e boleto em aberto"));
    box2.appendChild(cartaoNum("Recusadas", n(s.recusadas), "pagamento não aprovado"));
    box2.appendChild(cartaoNum("Reembolsos e chargebacks", n(s.devolvidas), s.devolvidas ? r$(s.devolvidas_valor) + " devolvidos" : "nenhum no período"));
    box2.appendChild(cartaoNum("Aprovação de pagamento", s.aprovacao != null ? pct(s.aprovacao, 1) : "–", "das tentativas aprovadas"));
    box2.appendChild(cartaoNum("Pix pagos", s.pix_gerados ? pct(s.pix_pagos, s.pix_gerados) : "–", n(s.pix_pagos) + " de " + n(s.pix_gerados) + " Pix gerados"));
    box2.appendChild(cartaoNum("Compradores", n(s.compradores), s.recompra ? n(s.recompra) + " compraram mais de uma vez" : "pessoas diferentes"));
    box2.appendChild(cartaoNum("Upsell", s.principais ? pct(s.upsells, s.principais) : "–", n(s.upsells) + " de " + n(s.principais) + " compradores · " + r$(s.upsell_valor)));
  }

  /* ---------- vendas por dia ---------- */
  function desenharDias() {
    var r = intervalo(), dias = [];
    var fim = Math.min(r.ate, Date.now() + 864e5), d0 = new Date(r.de);
    d0.setHours(12, 0, 0, 0);
    // até 45 dias na tela (os mais recentes)
    while (d0.getTime() < fim) { dias.push(diaIso(d0)); d0.setDate(d0.getDate() + 1); }
    dias = dias.slice(-45);
    var porDia = dados.porDia || {};
    var maior = Math.max(1, Math.max.apply(null, dias.map(function (d) { return (porDia[d] || {}).valor || 0; })));
    var box = limpar($("[data-vend-dias]")), info = $("[data-vend-dia-info]");
    var mostrarDia = function (d, b) {
      Array.prototype.forEach.call(box.children, function (x) { x.classList.toggle("is-ativo", x === b); });
      var p = d.split("-"), v = porDia[d] || { vendas: 0, valor: 0 };
      info.textContent = p[2] + "/" + p[1] + ": " + n(v.vendas) + (v.vendas === 1 ? " venda" : " vendas") + " · " + r$(v.valor);
    };
    dias.forEach(function (d, i) {
      var b = el("button", "lanc-dia vend-dia"), v = porDia[d] || { vendas: 0, valor: 0 };
      b.type = "button";
      b.setAttribute("aria-label", d.split("-").reverse().slice(0, 2).join("/") + ": " + v.vendas + " vendas");
      var col = el("i");
      col.style.transform = "scaleY(" + Math.max(v.valor ? 0.04 : 0.015, v.valor / maior).toFixed(4) + ")";
      col.style.setProperty("--i", i);
      b.appendChild(col);
      b.addEventListener("click", function () { mostrarDia(d, b); });
      box.appendChild(b);
    });
    if (dias.length) mostrarDia(dias[dias.length - 1], box.lastChild);
  }

  /* ---------- listas com barra (origem, ofertas, pagamento) ---------- */
  function desenharGrupo(alvo, itens, nomear) {
    var box = limpar($(alvo));
    if (!itens || !itens.length) { box.appendChild(el("p", "lanc-vazio", "Nenhuma venda aprovada no período.")); return; }
    var maior = Math.max.apply(null, itens.map(function (g) { return g.valor || 0; })) || 1;
    var total = itens.reduce(function (s, g) { return s + g.valor; }, 0);
    itens.forEach(function (g) {
      var linha = el("div", "lanc-kit");
      var topo = el("div", "lanc-kit-topo");
      topo.appendChild(el("span", "lanc-kit-nome", nomear ? nomear(g.nome) : g.nome));
      linha.appendChild(topo);
      var barra = el("div", "lanc-kit-barra"), cheio = el("i");
      cheio.style.transform = "scaleX(" + ((g.valor || 0) / maior).toFixed(4) + ")";
      barra.appendChild(cheio);
      linha.appendChild(barra);
      var nums = el("div", "lanc-kit-nums");
      nums.appendChild(el("span", null, n(g.vendas) + (g.vendas === 1 ? " venda" : " vendas")));
      nums.appendChild(el("span", null, pct(g.valor, total)));
      nums.appendChild(el("strong", null, r$(g.valor)));
      linha.appendChild(nums);
      box.appendChild(linha);
    });
  }

  /* ---------- últimas vendas ---------- */
  function desenharLista() {
    var ul = limpar($("[data-vend-lista]"));
    if (!dados.ultimas || !dados.ultimas.length) { ul.appendChild(el("li", "lanc-vazio", "Nenhuma venda no período.")); return; }
    dados.ultimas.forEach(function (v) {
      var li = el("li", "lanc-pessoa");
      var topo = el("div", "lanc-pessoa-topo");
      topo.appendChild(el("strong", "lanc-pessoa-nome", (v.oferta || "Venda") + (v.tipo && /upsell/i.test(v.tipo) ? " · upsell" : "")));
      var c = CLASSES[v.classe] || CLASSES.outro;
      topo.appendChild(el("span", "vend-status " + c.cor, c.nome));
      li.appendChild(topo);
      var d = new Date(v.data);
      var quando = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + " às " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      var pag = nomePagamento(v.pagamento) + (v.parcelas > 1 ? " em " + v.parcelas + "x" : "");
      li.appendChild(el("p", "lanc-pessoa-info", quando + " · " + r$(v.valor) + " · " + pag));
      var origem = [v.fonte || "sem UTM", v.campanha, v.anuncio].filter(Boolean).join(" › ");
      var funil = v.funil === "quiz" ? "quiz" : v.funil === "oferta-direta" ? "oferta direta" : null;
      li.appendChild(el("p", "lanc-pessoa-info vend-origem", "Origem: " + origem + (funil ? " · " + funil : "")));
      if (v.nome || v.cidade) li.appendChild(el("p", "lanc-pessoa-info", [v.nome, [v.cidade, v.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ")));
      ul.appendChild(li);
    });
  }

  /* ---------- quiz × oferta direta ---------- */
  function cartaoFunil(g) {
    var c = el("div", "vend-f");
    c.appendChild(el("p", "vend-f-nome", g.nome));
    c.appendChild(el("p", "vend-f-valor", n(g.vendas) + (g.vendas === 1 ? " venda" : " vendas")));
    var partes = [r$(g.valor)];
    if (g.cliques) partes.push(pct(g.vendas, g.cliques) + " de quem clicou em comprar");
    if (g.visitas) partes.push(pct(g.vendas, g.visitas) + " das visitas");
    c.appendChild(el("p", "vend-f-sub", partes.join(" · ")));
    return c;
  }
  function desenharPorFunil() {
    var box = limpar($("[data-vend-porfunil]"));
    var lista = dados.porFunil || [];
    if (!lista.length) { box.appendChild(el("p", "lanc-vazio", "Sem dados de funil no período.")); return; }
    var tabela = el("div", "vend-funis");
    lista.forEach(function (g) { tabela.appendChild(cartaoFunil(g)); });
    box.appendChild(tabela);
    var linhas = el("div", "lanc-kits");
    linhas.style.marginTop = "16px";
    lista.forEach(function (g) {
      var l = el("div", "lanc-kit");
      var topo = el("div", "lanc-kit-topo");
      topo.appendChild(el("span", "lanc-kit-nome", g.nome));
      l.appendChild(topo);
      var nums = el("div", "lanc-kit-nums");
      nums.appendChild(el("span", null, n(g.visitas || 0) + " visitas"));
      nums.appendChild(el("span", null, n(g.cliques || 0) + " cliques em comprar"));
      nums.appendChild(el("strong", null, n(g.vendas) + " vendas" + (g.upsells ? " + " + n(g.upsells) + " upsell" : "")));
      l.appendChild(nums);
      linhas.appendChild(l);
    });
    box.appendChild(linhas);
    if (lista.some(function (g) { return g.funil === "nao-identificado"; }))
      box.appendChild(el("p", "lanc-nota", "\"Não identificado\" = vendas de antes do site passar a informar o funil para a B4You."));
  }

  /* ---------- compradores ---------- */
  function linkZap(t) {
    var d = String(t || "").replace(/\D/g, "");
    if (d.length < 10) return null;
    if (d.length <= 11) d = "55" + d;
    return "https://wa.me/" + d;
  }
  function desenharCompradores() {
    var ul = limpar($("[data-vend-compradores]")), cont = $("[data-vend-compradores-cont]");
    var lista = dados.compradores || [];
    cont.textContent = lista.length ? n(lista.length) + (lista.length === 1 ? " pessoa" : " pessoas") + " no período" : "";
    if (!lista.length) { ul.appendChild(el("li", "lanc-vazio", "Nenhum comprador no período.")); return; }
    lista.forEach(function (c) {
      var li = el("li", "lanc-pessoa");
      var topo = el("div", "vend-comprador-topo");
      topo.appendChild(el("strong", "lanc-pessoa-nome", c.nome || c.email || "Comprador sem nome"));
      topo.appendChild(el("span", "vend-comprador-total", r$(c.total)));
      li.appendChild(topo);
      var info = [];
      info.push(n(c.compras) + (c.compras === 1 ? " compra" : " compras") + (c.upsells ? " + " + n(c.upsells) + " upsell" : ""));
      if (c.devolvidas) info.push(n(c.devolvidas) + " devolvida" + (c.devolvidas > 1 ? "s" : ""));
      if (c.cidade || c.uf) info.push([c.cidade, c.uf].filter(Boolean).join("/"));
      if (c.funil) info.push(c.funil === "quiz" ? "quiz" : c.funil === "oferta-direta" ? "oferta direta" : c.funil);
      if (c.fonte) info.push(c.fonte);
      li.appendChild(el("p", "lanc-pessoa-info", info.join(" · ")));
      if (c.ofertas && c.ofertas.length) li.appendChild(el("p", "lanc-pessoa-info", c.ofertas.join(" + ")));
      var acoes = el("div", "lanc-pessoa-acoes");
      var zap = linkZap(c.telefone);
      if (zap) { var a = el("a", "lanc-acao lanc-zap", "WhatsApp"); a.href = zap; a.target = "_blank"; a.rel = "noopener"; acoes.appendChild(a); }
      if (c.email) { var m = el("a", "lanc-acao", c.email); m.href = "mailto:" + c.email; acoes.appendChild(m); }
      if (acoes.childNodes.length) li.appendChild(acoes);
      ul.appendChild(li);
    });
  }
  function baixarCompradores() {
    if (App.estado.demo) { alert("Entre com a senha do painel para baixar a lista de compradores."); return; }
    var r = intervalo();
    fetch("/api/vendas?formato=csv&de=" + r.de + "&ate=" + r.ate, { headers: { authorization: "Bearer " + App.estado.senha } })
      .then(function (resp) { if (!resp.ok) throw new Error(); return resp.blob(); })
      .then(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cellive-compradores-" + diaIso(Date.now()) + ".csv";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      })
      .catch(function () { alert("Não foi possível baixar a lista agora."); });
  }

  /* ---------- cartão "Vendas no período" da aba Resumo ---------- */
  function desenharResumo() {
    if (!resumoCartao || !dados) return;
    var s = dados.resumo, funis = dados.porFunil || [];
    var visitas = funis.reduce(function (t, g) { return t + (g.visitas || 0); }, 0);
    var box = limpar(resumoCartao.querySelector("[data-vend-resumo-kpis]"));
    box.appendChild(cartaoNum("Vendas aprovadas", n(s.aprovadas), s.upsells ? n(s.principais) + " do kit + " + n(s.upsells) + " de upsell" : "no período", true));
    box.appendChild(cartaoNum("Faturamento", r$(s.faturamento), "você recebe " + r$(s.comissao)));
    box.appendChild(cartaoNum("Conversão", visitas ? pct(s.principais, visitas) : "–", "das visitas viraram venda"));
    box.appendChild(dados.gasto ? cartaoNum("Retorno sobre o anúncio", (s.faturamento / dados.gasto).toFixed(2).replace(".", ",") + "x", r$(dados.gasto) + " gastos na Meta")
      : cartaoNum("Ticket médio", r$(s.ticket), "por venda aprovada"));
    // mini funil: visitas → clicaram em comprar → compraram
    var etapas = [["Visitas", visitas, null], ["Clicaram em comprar", dados.cliques || 0, visitas], ["Compraram", s.principais, dados.cliques || 0]];
    var maior = Math.max(1, visitas);
    var fbox = limpar(resumoCartao.querySelector("[data-vend-resumo-funil]"));
    etapas.forEach(function (e) {
      var l = el("div");
      var topo = el("div", "vend-etapa-topo");
      topo.appendChild(el("span", null, e[0]));
      topo.appendChild(el("strong", null, n(e[1])));
      l.appendChild(topo);
      var barra = el("div", "lanc-kit-barra"), cheio = el("i");
      cheio.style.transform = "scaleX(" + Math.max(e[1] ? 0.01 : 0, e[1] / maior).toFixed(4) + ")";
      barra.appendChild(cheio); l.appendChild(barra);
      if (e[2] != null) l.appendChild(el("span", "vend-etapa-sub", pct(e[1], e[2]) + " da etapa anterior"));
      fbox.appendChild(l);
    });
    var fun = limpar(resumoCartao.querySelector("[data-vend-resumo-funis]"));
    funis.forEach(function (g) { fun.appendChild(cartaoFunil(g)); });
  }

  function desenhar() {
    if (!dados) return;
    var s = dados.resumo;
    var aviso = $("[data-vend-aviso]");
    var nada = !s.aprovadas && !s.pendentes && !s.recusadas && !s.devolvidas;
    aviso.textContent = App.estado.demo ? "Modo demonstração: vendas fictícias." :
      nada ? "Nenhuma venda da B4You neste período. Elas aparecem aqui assim que a B4You avisa (aprovadas, aguardando pagamento, recusadas e reembolsos)." :
      "Vendas avisadas pela B4You. Segue só o período escolhido no topo.";
    desenharNumeros();
    desenharDias();
    desenharGrupo("[data-vend-origem]", dados[grupo]);
    desenharGrupo("[data-vend-ofertas]", dados.porOferta);
    desenharGrupo("[data-vend-pagamentos]", dados.porPagamento, nomePagamento);
    desenharPorFunil();
    desenharCompradores();
    desenharLista();
  }

  /* ---------- interface ---------- */
  Array.prototype.forEach.call(secao.querySelectorAll("[data-vend-grupo]"), function (b) {
    b.addEventListener("click", function () {
      grupo = b.getAttribute("data-vend-grupo");
      Array.prototype.forEach.call(secao.querySelectorAll("[data-vend-grupo]"), function (x) { x.classList.toggle("is-ativo", x === b); });
      if (dados) desenharGrupo("[data-vend-origem]", dados[grupo]);
    });
  });

  $("[data-vend-baixar]").addEventListener("click", baixarCompradores);
  var irVendas = document.querySelector("[data-vend-ir]");
  var botaoAba = document.querySelector('[data-aba="vendas"]');
  if (irVendas && botaoAba) irVendas.addEventListener("click", function () { botaoAba.click(); window.scrollTo({ top: 0, behavior: "smooth" }); });

  // abriu a aba: desenha (ou carrega); cada atualização do painel (ou troca de período) busca de novo,
  // porque o cartão "Vendas no período" fica na aba Resumo
  if (botaoAba) botaoAba.addEventListener("click", function () { if (dados && chaveAtual === intervalo().de + "-" + intervalo().ate || App.estado.demo) { if (App.estado.demo) dados = demo(intervalo()); desenhar(); } else carregar(); });
  document.addEventListener("painel:montado", carregar);
})();
