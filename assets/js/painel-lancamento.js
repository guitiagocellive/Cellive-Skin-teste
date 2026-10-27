/* Aba "Lançamento" do painel: quem preencheu o cadastro do grupo VIP.

   Busca a lista completa em /api/lead?formato=json (com a senha do painel) quando
   a aba é aberta, e de novo a cada atualização do painel enquanto ela estiver
   aberta. Mostra: números gerais, kits de interesse (pessoas e frascos),
   cadastros por dia e a lista de pessoas com busca, filtros e atalhos para
   WhatsApp e e-mail. No modo demonstração, usa pessoas fictícias. */
(function () {
  "use strict";

  var App = window.PainelApp;
  var secao = document.querySelector('[data-painel-aba="lancamento"]');
  if (!App || !secao) return;

  var $ = function (s) { return secao.querySelector(s); };
  var NUM = new Intl.NumberFormat("pt-BR");
  var KITS = { 1: "1 unidade · 30 dias", 2: "2 unidades · 60 dias", 3: "3 unidades · 90 dias" };
  var POR_PAGINA = 30;

  var lista = null;      // cadastros (mais recente primeiro)
  var filtro = "todos";
  var busca = "";
  var mostrando = POR_PAGINA;
  var carregando = false;

  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function limpar(no) { while (no.firstChild) no.removeChild(no.firstChild); return no; }
  function n(v) { return NUM.format(v || 0); }
  function diaIso(t) { var d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function telefone(w) {
    var d = String(w || "").replace(/\D/g, "").replace(/^55/, "");
    if (d.length < 10) return w || "";
    var meio = d.length > 10 ? 7 : 6;
    return "(" + d.slice(0, 2) + ") " + d.slice(2, meio) + "-" + d.slice(meio);
  }
  function semAcento(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* ---------- dados ---------- */
  function demo() {
    var nomes = ["Ana", "Beatriz", "Carla", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patrícia", "Renata", "Sabrina", "Tatiane", "Vanessa"];
    var semente = 11, rnd = function () { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
    var agora = Date.now(), r = [];
    for (var i = 0; i < 64; i++) {
      var k = rnd();
      r.push({
        criado: agora - Math.floor(Math.pow(rnd(), 1.6) * 28 * 864e5),
        nome: nomes[i % nomes.length] + " (exemplo)", whatsapp: "55619" + String(10000000 + Math.floor(rnd() * 89999999)),
        email: "exemplo" + (i + 1) + "@email.com", kit: k < 0.22 ? "1" : k < 0.75 ? "2" : k < 0.95 ? "3" : null,
        pagina: rnd() < 0.6 ? "quiz" : "v2", fonte: ["facebook", "instagram", "direto"][Math.floor(rnd() * 3)], campanha: null, anuncio: null,
      });
    }
    return r.sort(function (a, b) { return b.criado - a.criado; });
  }

  function carregar() {
    if (carregando) return;
    if (App.estado.demo) { lista = demo(); desenhar(); return; }
    if (!App.estado.senha) return;
    carregando = true;
    if (!lista) $("[data-lanc-contagem]").textContent = "Carregando a lista…";
    fetch("/api/lead?formato=json", { headers: { authorization: "Bearer " + App.estado.senha } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) { lista = d.leads || []; desenhar(); })
      .catch(function () { if (!lista) $("[data-lanc-contagem]").textContent = "Não foi possível carregar a lista agora. Toque em atualizar no topo."; })
      .then(function () { carregando = false; });
  }

  /* ---------- números gerais ---------- */
  function cartaoNum(rotulo, valor, detalhe, destaque) {
    var c = el("div", "lanc-kpi" + (destaque ? " is-destaque" : ""));
    c.appendChild(el("span", "lanc-kpi-rotulo", rotulo));
    c.appendChild(el("strong", "lanc-kpi-valor", valor));
    if (detalhe) c.appendChild(el("span", "lanc-kpi-detalhe", detalhe));
    return c;
  }

  function desenharNumeros() {
    var hoje = diaIso(Date.now()), seteDias = Date.now() - 7 * 864e5;
    var nHoje = 0, n7 = 0, frascos = 0;
    lista.forEach(function (l) {
      if (diaIso(l.criado) === hoje) nHoje++;
      if (l.criado >= seteDias) n7++;
      frascos += Number(l.kit) || 0;
    });
    var box = limpar($("[data-lanc-kpis]"));
    box.appendChild(cartaoNum("Pessoas na lista", n(lista.length), "desde o início", true));
    box.appendChild(cartaoNum("Hoje", n(nHoje), "cadastros de hoje"));
    box.appendChild(cartaoNum("Últimos 7 dias", n(n7), "cadastros na semana"));
    box.appendChild(cartaoNum("Frascos de interesse", n(frascos), "somando os kits escolhidos"));
  }

  /* ---------- kits de interesse ---------- */
  function desenharKits() {
    var cont = { 1: 0, 2: 0, 3: 0, sem: 0 };
    lista.forEach(function (l) { if (cont[l.kit] != null) cont[l.kit]++; else cont.sem++; });
    var maior = Math.max(1, cont[1], cont[2], cont[3]);
    var box = limpar($("[data-lanc-kits]"));
    var totalPessoas = cont[1] + cont[2] + cont[3];
    ["1", "2", "3"].forEach(function (k) {
      var linha = el("div", "lanc-kit");
      var topo = el("div", "lanc-kit-topo");
      topo.appendChild(el("span", "lanc-kit-nome", "Kit " + k));
      topo.appendChild(el("span", "lanc-kit-desc", KITS[k]));
      linha.appendChild(topo);
      var barra = el("div", "lanc-kit-barra");
      var cheio = el("i");
      cheio.style.transform = "scaleX(" + (cont[k] / maior).toFixed(4) + ")";
      barra.appendChild(cheio);
      linha.appendChild(barra);
      var nums = el("div", "lanc-kit-nums");
      nums.appendChild(el("span", null, n(cont[k]) + (cont[k] === 1 ? " pessoa" : " pessoas")));
      nums.appendChild(el("span", null, totalPessoas ? Math.round(100 * cont[k] / totalPessoas) + "%" : "–"));
      nums.appendChild(el("strong", null, n(cont[k] * Number(k)) + (cont[k] * Number(k) === 1 ? " frasco" : " frascos")));
      linha.appendChild(nums);
      box.appendChild(linha);
    });
    var total = el("div", "lanc-kit-total");
    total.appendChild(el("span", null, "Total"));
    total.appendChild(el("strong", null, n(cont[1] + cont[2] * 2 + cont[3] * 3) + " frascos de interesse"));
    box.appendChild(total);
    if (cont.sem) box.appendChild(el("p", "lanc-nota", n(cont.sem) + (cont.sem === 1 ? " pessoa não escolheu" : " pessoas não escolheram") + " kit."));
  }

  /* ---------- cadastros por dia (30 dias) ---------- */
  function desenharDias() {
    var porDia = {};
    lista.forEach(function (l) { var d = diaIso(l.criado); porDia[d] = (porDia[d] || 0) + 1; });
    var dias = [];
    for (var i = 29; i >= 0; i--) { var t = new Date(); t.setHours(12, 0, 0, 0); t.setDate(t.getDate() - i); dias.push(diaIso(t)); }
    var maior = Math.max(1, Math.max.apply(null, dias.map(function (d) { return porDia[d] || 0; })));
    var box = limpar($("[data-lanc-dias]"));
    var info = $("[data-lanc-dia-info]");
    var mostrarDia = function (d, b) {
      Array.prototype.forEach.call(box.children, function (x) { x.classList.toggle("is-ativo", x === b); });
      var p = d.split("-");
      var v = porDia[d] || 0;
      info.textContent = p[2] + "/" + p[1] + ": " + n(v) + (v === 1 ? " cadastro" : " cadastros");
    };
    dias.forEach(function (d, i) {
      var b = el("button", "lanc-dia");
      b.type = "button";
      var v = porDia[d] || 0;
      b.setAttribute("aria-label", d.split("-").reverse().slice(0, 2).join("/") + ": " + v + " cadastros");
      var col = el("i");
      col.style.transform = "scaleY(" + Math.max(v ? 0.04 : 0.015, v / maior).toFixed(4) + ")";
      col.style.setProperty("--i", i);
      b.appendChild(col);
      b.addEventListener("click", function () { mostrarDia(d, b); });
      box.appendChild(b);
    });
    mostrarDia(dias[dias.length - 1], box.lastChild);
  }

  /* ---------- lista de pessoas ---------- */
  function filtrada() {
    var b = semAcento(busca).trim(), digitos = busca.replace(/\D/g, "");
    return lista.filter(function (l) {
      if (filtro === "1" || filtro === "2" || filtro === "3") { if (String(l.kit) !== filtro) return false; }
      else if (filtro === "quiz" || filtro === "v2") { if (l.pagina !== filtro) return false; }
      if (!b) return true;
      return semAcento(l.nome).indexOf(b) >= 0 || semAcento(l.email).indexOf(b) >= 0 ||
        (digitos.length >= 3 && String(l.whatsapp).indexOf(digitos) >= 0);
    });
  }

  function linhaPessoa(l) {
    var li = el("li", "lanc-pessoa");
    var topo = el("div", "lanc-pessoa-topo");
    topo.appendChild(el("strong", "lanc-pessoa-nome", l.nome));
    topo.appendChild(el("span", "lanc-pessoa-kit" + (l.kit ? "" : " is-sem"), l.kit ? "Kit " + l.kit : "Sem kit"));
    li.appendChild(topo);
    var quando = new Date(l.criado).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
    var origem = [quando, l.pagina === "v2" ? "Oferta direta" : "Quiz", l.fonte && l.fonte !== "direto" ? l.fonte : null, l.campanha].filter(Boolean).join(" · ");
    li.appendChild(el("p", "lanc-pessoa-info", origem));
    var acoes = el("div", "lanc-pessoa-acoes");
    var primeiro = String(l.nome || "").split(/\s+/)[0];
    var zap = el("a", "lanc-acao lanc-zap", telefone(l.whatsapp));
    zap.href = "https://wa.me/" + String(l.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent("Oi, " + primeiro + "! Aqui é da Cellive Skin.");
    zap.target = "_blank"; zap.rel = "noopener";
    acoes.appendChild(zap);
    var mail = el("a", "lanc-acao lanc-mail", l.email);
    mail.href = "mailto:" + l.email;
    acoes.appendChild(mail);
    li.appendChild(acoes);
    return li;
  }

  function desenharLista() {
    var itens = filtrada();
    var ul = limpar($("[data-lanc-lista]"));
    var cont = $("[data-lanc-contagem]");
    if (!lista.length) {
      cont.textContent = "";
      ul.appendChild(el("li", "lanc-vazio", "Ninguém se cadastrou ainda. Assim que alguém preencher o formulário do grupo VIP, aparece aqui."));
    } else if (!itens.length) {
      cont.textContent = "Nenhuma pessoa com esse filtro.";
    } else {
      cont.textContent = n(itens.length) + (itens.length === 1 ? " pessoa" : " pessoas") + (itens.length !== lista.length ? " de " + n(lista.length) : "");
      itens.slice(0, mostrando).forEach(function (l) { ul.appendChild(linhaPessoa(l)); });
    }
    var mais = $("[data-lanc-mais]");
    mais.hidden = itens.length <= mostrando;
    mais.textContent = "Ver mais pessoas (" + n(Math.max(0, itens.length - mostrando)) + ")";
  }

  function desenhar() {
    if (!lista) return;
    desenharNumeros();
    desenharKits();
    desenharDias();
    desenharLista();
  }

  /* ---------- interface ---------- */
  var esperaBusca = 0;
  $("[data-lanc-busca]").addEventListener("input", function (ev) {
    clearTimeout(esperaBusca);
    esperaBusca = setTimeout(function () { busca = ev.target.value; mostrando = POR_PAGINA; if (lista) desenharLista(); }, 150);
  });
  Array.prototype.forEach.call(secao.querySelectorAll("[data-lanc-filtro]"), function (b) {
    b.addEventListener("click", function () {
      filtro = b.getAttribute("data-lanc-filtro");
      Array.prototype.forEach.call(secao.querySelectorAll("[data-lanc-filtro]"), function (x) { x.classList.toggle("is-ativo", x === b); });
      mostrando = POR_PAGINA;
      if (lista) desenharLista();
    });
  });
  $("[data-lanc-mais]").addEventListener("click", function () { mostrando += POR_PAGINA; desenharLista(); });

  // abriu a aba: carrega; atualização do painel com a aba aberta: carrega de novo
  var botaoAba = document.querySelector('[data-aba="lancamento"]');
  if (botaoAba) botaoAba.addEventListener("click", carregar);
  document.addEventListener("painel:montado", function () {
    if (!secao.hidden) carregar();
    else if (App.estado.demo) lista = null; // troca entre demonstração e dados reais
  });
})();
