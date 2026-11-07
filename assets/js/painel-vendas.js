/* Aba "Vendas" do painel: vendas que a B4You avisa pelo webhook.

   Busca /api/vendas (com a senha do painel) quando a aba é aberta e de novo a cada
   atualização do painel enquanto ela estiver aberta. Segue o período escolhido no topo.
   Mostra: números do período (vendas, faturamento, quanto você recebe, ticket, conversão,
   retorno sobre o gasto na Meta), vendas por dia, de onde vieram (fonte, campanha, anúncio),
   kits/ofertas, formas de pagamento e as últimas vendas. No modo demonstração, usa vendas fictícias. */
(function () {
  "use strict";

  var App = window.PainelApp;
  var secao = document.querySelector('[data-painel-aba="vendas"]');
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
      },
      cliques: ap.length * 4, gasto: soma(ap) / 2.6,
      porOferta: agrupar("oferta"), porPagamento: agrupar("pagamento"), porFonte: agrupar("fonte"),
      porCampanha: agrupar("campanha"), porAnuncio: agrupar("anuncio"), porDia: porDia, ultimas: vendas.slice(0, 40),
    };
  }

  function carregar() {
    var r = intervalo();
    if (App.estado.demo) { dados = demo(r); desenhar(); return; }
    if (!App.estado.senha || carregando) return;
    var chave = r.de + "-" + r.ate;
    carregando = true;
    if (!dados || chave !== chaveAtual) $("[data-vend-aviso]").textContent = "Carregando as vendas…";
    fetch("/api/vendas?de=" + r.de + "&ate=" + r.ate, { headers: { authorization: "Bearer " + App.estado.senha } })
      .then(function (resp) { if (!resp.ok) throw new Error(String(resp.status)); return resp.json(); })
      .then(function (d) { dados = d; chaveAtual = chave; desenhar(); })
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
      li.appendChild(el("p", "lanc-pessoa-info vend-origem", "Origem: " + origem));
      ul.appendChild(li);
    });
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

  // abriu a aba: carrega; atualização do painel (ou troca de período) com a aba aberta: carrega de novo
  var botaoAba = document.querySelector('[data-aba="vendas"]');
  if (botaoAba) botaoAba.addEventListener("click", carregar);
  document.addEventListener("painel:montado", function () {
    if (!secao.hidden) carregar();
    else if (App.estado.demo || chaveAtual) dados = null;
  });
})();
