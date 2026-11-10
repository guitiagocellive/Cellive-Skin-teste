/* Aba "Produto" do painel: custos, taxas, kits e preços de cada produto, com análise por kit
   (venda direta ou por afiliado), ficha do produto, briefing para criativos e relatório em PDF.

   Lista de produtos em cartões → abrir um produto mostra as 5 etapas à esquerda e a análise por
   kit à direita. Tudo salva sozinho (/api/produtos) alguns instantes depois de cada mudança.
   Conta de cada kit (igual à planilha de custos):
     custo fixo  = unidades × custo por unidade + caixa + envio + outros custos por pedido + CAC (em R$, só venda direta)
     custo %     = impostos + taxa da plataforma (+ comissão do afiliado) (+ CAC em %, só venda direta)
     lucro       = preço − custo fixo − preço × custo %
     preço mínimo  = custo fixo ÷ (1 − custo %)            (lucro zero)
     preço sugerido = custo fixo ÷ (1 − custo % − margem-alvo)
     markup      = preço ÷ custo dos produtos do kit
   O produto "ativo" também alimenta o lucro estimado da aba Estratégia. */
(function () {
  "use strict";

  var App = window.PainelApp;
  var secao = document.querySelector('[data-painel-aba="produto"]');
  if (!App || !secao) return;
  var raiz = secao.querySelector("[data-prod-raiz]");

  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var produtos = null, atualId = null, passo = 1, modo = "direta", carregando = false;
  var espera = 0, estadoSalvo = "";

  var STATUS = { desenvolvimento: "Em desenvolvimento", ativo: "Ativo", pausado: "Pausado" };
  var FICHA = [
    ["marca", "Marca"], ["categoria", "Categoria"], ["volume", "Volume / tamanho"], ["uso", "Modo de uso", true],
    ["ativos", "Ativos principais", true], ["registro", "Registro / regularização"], ["testes", "Testes"], ["garantia", "Garantia"],
    ["validade", "Validade"], ["fornecedor", "Fornecedor / fábrica"], ["ean", "Código de barras (EAN) / SKU"], ["observacoes", "Observações", true],
  ];
  var CRIATIVOS = [
    ["publico", "Público-alvo", "Quem compra: idade, momento de vida, o que busca"],
    ["promessa", "Promessa principal", "A transformação em uma frase"],
    ["dores", "Dores", "O que incomoda: pé de galinha, testa, linha do sorriso, pele cansada…"],
    ["beneficios", "Benefícios", "O que a pessoa sente e vê com o uso"],
    ["diferenciais", "Diferenciais", "Por que este e não outro: ação SRRP, microespículas, 1 passo…"],
    ["provas", "Provas", "Testes, números do laudo, depoimentos reais, Anvisa, garantia"],
    ["objecoes", "Objeções e respostas", "\"Substitui Botox?\", \"Serve para pele sensível?\"…"],
    ["proibido", "O que não pode dizer", "Promessas proibidas pela Anvisa, Conar e Meta"],
    ["angulos", "Ângulos e ganchos", "Ideias de abertura de vídeo"],
    ["referencias", "Referências", "Links de vídeos, concorrentes, criadoras"],
  ];

  /* ---------- utilidades ---------- */
  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function limpar(no) { while (no.firstChild) no.removeChild(no.firstChild); return no; }
  function num(v) { var x = Number(String(v == null ? "" : v).replace(/\s/g, "").replace(",", ".")); return isFinite(x) ? x : 0; }
  function vazio(v) { return v == null || String(v).trim() === ""; }
  function r$(v) { return v == null || !isFinite(v) ? "–" : BRL.format(v); }
  function pct(v, c) { return v == null || !isFinite(v) ? "–" : (100 * v).toFixed(c == null ? 1 : c).replace(".", ",") + "%"; }
  function br(v) { return v == null || v === "" ? "" : String(v).replace(".", ","); }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function atual() { return (produtos || []).filter(function (p) { return p.id === atualId; })[0] || null; }

  /* ---------- contas ---------- */
  function custoUnidade(p) { return (p.custosUnidade || []).reduce(function (s, c) { return s + num(c.valor); }, 0); }
  function analisar(p, kit, m) {
    var cp = p.custosPedido || {}, tx = p.taxas || {};
    var direta = m !== "afiliado";
    var un = Math.max(0, num(kit.unidades)), preco = num(kit.preco);
    var produtosR = un * custoUnidade(p);
    var caixa = vazio(kit.caixa) ? num(cp.caixa) : num(kit.caixa);
    var envio = vazio(kit.envio) ? num(cp.envio) : num(kit.envio);
    var outros = (cp.outros || []).reduce(function (s, c) { return s + num(c.valor); }, 0);
    var cacPct = direta && cp.cacTipo === "pct" ? num(cp.cac) : 0;
    var cacR = direta && cp.cacTipo !== "pct" ? num(cp.cac) : 0;
    var pctVar = num(tx.impostos) + num(tx.plataforma) + (direta ? 0 : num(tx.afiliado)) + cacPct;
    var fixos = produtosR + caixa + envio + outros + cacR;
    var linhas = [["Produtos (" + un + " × " + r$(custoUnidade(p)) + ")", produtosR], ["Caixa", caixa], ["Envio / frete", envio]];
    (cp.outros || []).forEach(function (c) { if (num(c.valor)) linhas.push([c.nome || "Outro custo por pedido", num(c.valor)]); });
    linhas.push(["Impostos", preco * num(tx.impostos) / 100], ["Taxa da plataforma", preco * num(tx.plataforma) / 100]);
    if (!direta) linhas.push(["Comissão do afiliado", preco * num(tx.afiliado) / 100]);
    if (direta) linhas.push(["CAC", cacR + preco * cacPct / 100]);
    var total = linhas.reduce(function (s, l) { return s + l[1]; }, 0), lucro = preco - total;
    var alvo = num(p.margemAlvo);
    return {
      linhas: linhas, total: total, lucro: lucro, margem: preco ? lucro / preco : null,
      minimo: pctVar < 100 ? fixos / (1 - pctVar / 100) : null,
      sugerido: pctVar + alvo < 100 ? fixos / (1 - (pctVar + alvo) / 100) : null,
      markup: produtosR ? preco / produtosR : null, porUnidade: un ? preco / un : null,
    };
  }
  function completoCriativos(p) {
    var c = p.criativos || {};
    var feitos = CRIATIVOS.filter(function (f) { return !vazio(c[f[0]]); }).length;
    return feitos / CRIATIVOS.length;
  }

  /* ---------- dados ---------- */
  var DEMO = {
    id: "demo-serum", nome: "Sérum Revitalizador Noturno 30ml (exemplo)", status: "ativo",
    custosUnidade: [{ nome: "Custo unitário do produto", valor: 14.85, fixo: true }, { nome: "Embalagem (frasco, pote...)", valor: 14.99, fixo: true }, { nome: "Rótulo", valor: 0.95, fixo: true }, { nome: "Caixa Cartucho", valor: 1.9 }],
    custosPedido: { caixa: 1, envio: 25, cac: 80, cacTipo: "reais", outros: [] }, taxas: { impostos: 6, plataforma: 5, afiliado: 20 }, margemAlvo: 30,
    kits: [{ nome: "Kit 1 unidade", unidades: 1, preco: 197.9 }, { nome: "Kit 2 unidades", unidades: 2, preco: 297.9 }, { nome: "Kit 3 unidades", unidades: 3, preco: 397.9 }],
    ficha: { marca: "Cellive Skin", categoria: "Sérum facial", volume: "30 ml" }, criativos: {},
  };
  function carregar() {
    if (App.estado.demo) { if (!produtos || produtos[0].id !== "demo-serum") { produtos = [copia(DEMO)]; } desenhar(); return; }
    if (!App.estado.senha || carregando) return;
    carregando = true;
    if (!produtos) { limpar(raiz).appendChild(el("p", "vend-aviso", "Carregando os produtos…")); }
    fetch("/api/produtos", { headers: { authorization: "Bearer " + App.estado.senha } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) { produtos = d.produtos || []; desenhar(); })
      .catch(function () { if (!produtos) limpar(raiz).appendChild(el("p", "vend-aviso", "Não foi possível carregar os produtos agora. Toque em atualizar no topo.")); })
      .then(function () { carregando = false; });
  }
  function avisoSalvo(t) { estadoSalvo = t; var s = raiz.querySelector("[data-prod-salvo]"); if (s) s.textContent = t; }
  function salvar(p, imediato) {
    clearTimeout(espera);
    if (App.estado.demo) { avisoSalvo("Demonstração: nada é salvo"); return; }
    avisoSalvo("Salvando…");
    var enviar = function () {
      fetch("/api/produtos", { method: "POST", headers: { authorization: "Bearer " + App.estado.senha, "content-type": "application/json" }, body: JSON.stringify(p) })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (d) { if (!p.id) p.id = d.id; avisoSalvo("Salvo"); })
        .catch(function () { avisoSalvo("Erro ao salvar — tente de novo"); });
    };
    if (imediato) enviar(); else espera = setTimeout(enviar, 700);
  }

  /* ---------- campos ---------- */
  function campo(rotulo, valor, aoMudar, opts) {
    opts = opts || {};
    var l = el("label", "prod-campo" + (opts.largo ? " is-largo" : ""));
    if (rotulo) l.appendChild(el("span", "prod-rot", rotulo));
    var caixa = el("span", "prod-entrada");
    if (opts.antes) caixa.appendChild(el("span", "prod-pre", opts.antes));
    var i = opts.texto && opts.linhas ? el("textarea") : el("input");
    if (i.tagName === "INPUT") { i.type = "text"; i.inputMode = opts.texto ? "text" : "decimal"; }
    else i.rows = opts.linhas;
    i.value = opts.texto ? (valor || "") : br(valor);
    if (opts.dica) i.placeholder = opts.dica;
    i.addEventListener("input", function () { aoMudar(opts.texto ? i.value : (vazio(i.value) ? null : num(i.value))); });
    caixa.appendChild(i);
    if (opts.depois) caixa.appendChild(el("span", "prod-pos", opts.depois));
    l.appendChild(caixa);
    return l;
  }
  function mudou(p, redesenharPasso) {
    salvar(p);
    desenharAnalise(p);
    atualizarCabecalho(p);
    if (redesenharPasso) desenharPasso(p);
  }
  function cartao(titulo, sub, direita) {
    var c = el("article", "prod-cartao");
    var cab = el("div", "prod-cartao-cab");
    var t = el("div");
    t.appendChild(el("h3", null, titulo));
    if (sub) t.appendChild(el("p", null, sub));
    cab.appendChild(t);
    if (direita) cab.appendChild(direita);
    c.appendChild(cab);
    return c;
  }
  function botaoTexto(texto, fn, cls) { var b = el("button", "prod-mais" + (cls ? " " + cls : ""), texto); b.type = "button"; b.addEventListener("click", fn); return b; }

  /* ---------- lista de produtos ---------- */
  function desenharLista() {
    limpar(raiz);
    var topo = el("div", "prod-lista-topo");
    var t = el("div"); t.appendChild(el("h2", null, "Produtos")); t.appendChild(el("p", null, "Custos, preços e margem de cada produto e kit"));
    topo.appendChild(t);
    topo.appendChild(botaoTexto("+ Novo produto", function () {
      var p = copia(DEMO); delete p.id; p.nome = "Novo produto"; p.status = "desenvolvimento";
      p.custosUnidade = [{ nome: "Custo unitário do produto", valor: 0, fixo: true }, { nome: "Embalagem (frasco, pote...)", valor: 0, fixo: true }, { nome: "Rótulo", valor: 0, fixo: true }];
      p.custosPedido = { caixa: 0, envio: 0, cac: 0, cacTipo: "reais", outros: [] };
      p.kits = [{ nome: "Kit 1 unidade", unidades: 1, preco: 0 }]; p.ficha = {}; p.criativos = {};
      p.id = App.estado.demo ? "demo-" + Date.now() : null;
      produtos.push(p);
      if (!App.estado.demo) {
        fetch("/api/produtos", { method: "POST", headers: { authorization: "Bearer " + App.estado.senha, "content-type": "application/json" }, body: JSON.stringify(p) })
          .then(function (r) { return r.json(); }).then(function (d) { p.id = d.id; abrir(p.id); });
      } else abrir(p.id);
    }, "is-forte"));
    raiz.appendChild(topo);
    var grade = el("div", "prod-grade");
    produtos.forEach(function (p) {
      var c = el("button", "prod-card"); c.type = "button";
      var cab = el("div", "prod-card-cab");
      cab.appendChild(el("strong", null, p.nome || "Produto sem nome"));
      cab.appendChild(el("span", "prod-status is-" + (p.status || "desenvolvimento"), STATUS[p.status] || STATUS.desenvolvimento));
      c.appendChild(cab);
      var margens = (p.kits || []).map(function (k) { return analisar(p, k, "direta").margem; }).filter(function (m) { return m != null; });
      var info = el("div", "prod-card-nums");
      [["Custo por unidade", r$(custoUnidade(p))], ["Kits", String((p.kits || []).length)],
        ["Margem (direta)", margens.length ? pct(Math.min.apply(null, margens), 0) + " a " + pct(Math.max.apply(null, margens), 0) : "–"],
        ["Para criativos", pct(completoCriativos(p), 0)]].forEach(function (x) {
        var d = el("div"); d.appendChild(el("span", null, x[0])); d.appendChild(el("b", null, x[1])); info.appendChild(d);
      });
      c.appendChild(info);
      var etapas = el("div", "prod-card-etapas");
      ["Custos", "Taxas", "Kits", "Ficha", "Criativos"].forEach(function (nome, i) {
        var ok = [custoUnidade(p) > 0, p.taxas && (num(p.taxas.impostos) || num(p.taxas.plataforma)), (p.kits || []).some(function (k) { return num(k.preco) > 0; }),
          p.ficha && Object.keys(p.ficha).some(function (k) { return !vazio(p.ficha[k]); }), completoCriativos(p) >= 0.6][i];
        etapas.appendChild(el("span", ok ? "is-ok" : null, (ok ? "✓ " : "") + nome));
      });
      c.appendChild(etapas);
      c.addEventListener("click", function () { abrir(p.id); });
      grade.appendChild(c);
    });
    raiz.appendChild(grade);
  }
  function abrir(id) { atualId = id; passo = 1; desenhar(); window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ---------- editor ---------- */
  var PASSOS = ["Custos", "Taxas e comissões", "Kits e preços", "Ficha", "Para criativos"];
  function atualizarCabecalho(p) {
    var b = raiz.querySelector('[data-prod-passo="5"]');
    if (b) b.textContent = "5. Para criativos · " + pct(completoCriativos(p), 0);
    var t = raiz.querySelector("[data-prod-total-un]");
    if (t) t.textContent = r$(custoUnidade(p));
  }
  function desenharEditor(p) {
    limpar(raiz);
    var topo = el("div", "prod-topo");
    topo.appendChild(botaoTexto("← Produtos", function () { atualId = null; desenhar(); }, "is-voltar"));
    var acoes = el("div", "prod-acoes");
    acoes.appendChild(botaoTexto("Relatório dos kits (PDF)", function () { relatorio(p); }, "is-borda"));
    acoes.appendChild(botaoTexto("Duplicar", function () {
      var c = copia(p); c.id = App.estado.demo ? "demo-" + Date.now() : null; c.nome = (p.nome || "Produto") + " (cópia)"; c.status = "desenvolvimento";
      produtos.push(c);
      if (App.estado.demo) { abrir(c.id); return; }
      fetch("/api/produtos", { method: "POST", headers: { authorization: "Bearer " + App.estado.senha, "content-type": "application/json" }, body: JSON.stringify(c) })
        .then(function (r) { return r.json(); }).then(function (d) { c.id = d.id; abrir(c.id); });
    }));
    acoes.appendChild(botaoTexto("Excluir", function () {
      if (!confirm("Excluir \"" + (p.nome || "este produto") + "\"? Não dá para desfazer.")) return;
      produtos = produtos.filter(function (x) { return x !== p; });
      if (!App.estado.demo && p.id) fetch("/api/produtos?id=" + encodeURIComponent(p.id), { method: "DELETE", headers: { authorization: "Bearer " + App.estado.senha } });
      atualId = null; desenhar();
    }, "is-perigo"));
    topo.appendChild(acoes);
    raiz.appendChild(topo);

    var titulo = el("div", "prod-titulo");
    var nome = el("input", "prod-nome"); nome.value = p.nome || ""; nome.placeholder = "Nome do produto"; nome.setAttribute("aria-label", "Nome do produto");
    nome.addEventListener("input", function () { p.nome = nome.value; salvar(p); });
    titulo.appendChild(nome);
    var lado = el("div", "prod-titulo-lado");
    var st = el("select", "prod-select"); st.setAttribute("aria-label", "Situação do produto");
    Object.keys(STATUS).forEach(function (k) { var o = el("option", null, STATUS[k]); o.value = k; if ((p.status || "desenvolvimento") === k) o.selected = true; st.appendChild(o); });
    st.addEventListener("change", function () {
      p.status = st.value;
      // só um produto ativo por vez (é o que a aba Estratégia usa no lucro)
      if (p.status === "ativo") produtos.forEach(function (x) { if (x !== p && x.status === "ativo") { x.status = "desenvolvimento"; salvar(x, true); } });
      salvar(p, true);
    });
    lado.appendChild(st);
    lado.appendChild(el("span", "prod-salvo", estadoSalvo)).setAttribute("data-prod-salvo", "");
    titulo.appendChild(lado);
    raiz.appendChild(titulo);

    var nav = el("nav", "prod-passos");
    PASSOS.forEach(function (nomeP, i) {
      var b = el("button", i + 1 === passo ? "is-ativo" : null, (i + 1) + ". " + nomeP + (i === 4 ? " · " + pct(completoCriativos(p), 0) : ""));
      b.type = "button"; b.setAttribute("data-prod-passo", String(i + 1));
      b.addEventListener("click", function () { passo = i + 1; Array.prototype.forEach.call(nav.children, function (x) { x.classList.toggle("is-ativo", x === b); }); desenharPasso(p); });
      nav.appendChild(b);
    });
    raiz.appendChild(nav);

    var corpo = el("div", "prod-corpo");
    corpo.appendChild(el("div", "prod-esq")).setAttribute("data-prod-esq", "");
    var dir = el("aside", "prod-dir"); dir.setAttribute("data-prod-dir", "");
    corpo.appendChild(dir);
    raiz.appendChild(corpo);
    desenharPasso(p);
    desenharAnalise(p);
  }

  function rodape(p) {
    var r = el("div", "prod-rodape");
    if (passo > 1) r.appendChild(botaoTexto("← Voltar", function () { irPasso(p, passo - 1); }, "is-voltar"));
    else r.appendChild(el("span"));
    if (passo < 5) r.appendChild(botaoTexto("Próximo →", function () { irPasso(p, passo + 1); }, "is-borda"));
    return r;
  }
  function irPasso(p, n) {
    passo = n;
    Array.prototype.forEach.call(raiz.querySelectorAll("[data-prod-passo]"), function (x) { x.classList.toggle("is-ativo", Number(x.getAttribute("data-prod-passo")) === n); });
    desenharPasso(p);
  }

  function desenharPasso(p) {
    var esq = limpar(raiz.querySelector("[data-prod-esq]"));
    p.custosUnidade = p.custosUnidade || []; p.custosPedido = p.custosPedido || { outros: [] }; p.custosPedido.outros = p.custosPedido.outros || [];
    p.taxas = p.taxas || {}; p.kits = p.kits || []; p.ficha = p.ficha || {}; p.criativos = p.criativos || {};
    if (passo === 1) {
      var tot = el("div", "prod-total"); tot.appendChild(el("span", null, "Total por unidade")); var tv = el("strong", null, r$(custoUnidade(p))); tv.setAttribute("data-prod-total-un", ""); tot.appendChild(tv);
      var c1 = cartao("Custos por unidade", "Quanto custa produzir uma unidade do produto.", tot);
      var g = el("div", "prod-linha-3");
      p.custosUnidade.filter(function (c) { return c.fixo; }).forEach(function (c) { g.appendChild(campo(c.nome, c.valor, function (v) { c.valor = v; mudou(p); }, { antes: "R$" })); });
      c1.appendChild(g);
      p.custosUnidade.forEach(function (c, i) {
        if (c.fixo) return;
        var l = el("div", "prod-extra");
        l.appendChild(campo(null, c.nome, function (v) { c.nome = v; mudou(p); }, { texto: true, dica: "Nome do custo", largo: true }));
        l.appendChild(campo(null, c.valor, function (v) { c.valor = v; mudou(p); }, { antes: "R$" }));
        l.appendChild(botaoTexto("×", function () { p.custosUnidade.splice(i, 1); mudou(p, true); }, "is-x"));
        c1.appendChild(l);
      });
      c1.appendChild(botaoTexto("+ Outro custo por unidade", function () { p.custosUnidade.push({ nome: "", valor: 0 }); mudou(p, true); }));
      esq.appendChild(c1);

      var cp = p.custosPedido;
      var c2 = cartao("Custos por pedido", "Custos que acontecem uma vez a cada venda, independentemente da quantidade.");
      var g2 = el("div", "prod-linha-3");
      g2.appendChild(campo("Caixa / embalagem de envio", cp.caixa, function (v) { cp.caixa = v; mudou(p); }, { antes: "R$" }));
      g2.appendChild(campo("Envio / frete", cp.envio, function (v) { cp.envio = v; mudou(p); }, { antes: "R$" }));
      var cacBox = el("div", "prod-cac");
      var tg = el("div", "prod-toggle");
      [["reais", "R$"], ["pct", "%"]].forEach(function (o) {
        var b = el("button", (cp.cacTipo || "reais") === o[0] ? "is-ativo" : null, o[1]); b.type = "button";
        b.addEventListener("click", function () { cp.cacTipo = o[0]; mudou(p, true); }); tg.appendChild(b);
      });
      var cacCampo = campo("CAC (venda direta)", cp.cac, function (v) { cp.cac = v; mudou(p); }, cp.cacTipo === "pct" ? { depois: "%" } : { antes: "R$" });
      cacCampo.querySelector(".prod-rot").appendChild(tg);
      cacBox.appendChild(cacCampo);
      cacBox.appendChild(el("span", "prod-dica", cp.cacTipo === "pct" ? "Custo de aquisição por venda, em % do preço" : "Custo de aquisição por venda, em reais"));
      g2.appendChild(cacBox);
      c2.appendChild(g2);
      cp.outros.forEach(function (c, i) {
        var l = el("div", "prod-extra");
        l.appendChild(campo(null, c.nome, function (v) { c.nome = v; mudou(p); }, { texto: true, dica: "Nome do custo", largo: true }));
        l.appendChild(campo(null, c.valor, function (v) { c.valor = v; mudou(p); }, { antes: "R$" }));
        l.appendChild(botaoTexto("×", function () { cp.outros.splice(i, 1); mudou(p, true); }, "is-x"));
        c2.appendChild(l);
      });
      c2.appendChild(botaoTexto("+ Outro custo por pedido", function () { cp.outros.push({ nome: "", valor: 0 }); mudou(p, true); }));
      esq.appendChild(c2);
    } else if (passo === 2) {
      var c3 = cartao("Impostos, taxas e comissões", "Percentuais sobre o preço de venda.");
      var g3 = el("div", "prod-linha-3");
      g3.appendChild(campo("Impostos", p.taxas.impostos, function (v) { p.taxas.impostos = v; mudou(p); }, { depois: "%" }));
      g3.appendChild(campo("Taxa da plataforma / gateway", p.taxas.plataforma, function (v) { p.taxas.plataforma = v; mudou(p); }, { depois: "%" }));
      g3.appendChild(campo("Comissão do afiliado", p.taxas.afiliado, function (v) { p.taxas.afiliado = v; mudou(p); }, { depois: "%" }));
      c3.appendChild(g3);
      esq.appendChild(c3);
    } else if (passo === 3) {
      var alvo = campo("Margem-alvo (preço sugerido)", p.margemAlvo, function (v) { p.margemAlvo = v; mudou(p); }, { depois: "%" });
      alvo.classList.add("prod-alvo");
      var c4 = cartao("Kits e precificação", "Preço de venda de cada kit. Caixa e envio entram em todos os kits; preencha aqui só se o kit tiver caixa ou frete diferente do padrão (em branco = padrão).", alvo);
      p.kits.forEach(function (k, i) {
        var l = el("div", "prod-kit");
        l.appendChild(campo("Nome do kit", k.nome, function (v) { k.nome = v; mudou(p); }, { texto: true, largo: true }));
        l.appendChild(campo("Unidades", k.unidades, function (v) { k.unidades = v; mudou(p); }));
        l.appendChild(campo("Preço de venda", k.preco, function (v) { k.preco = v; mudou(p); }, { antes: "R$" }));
        l.appendChild(campo("Caixa (opcional)", k.caixa, function (v) { k.caixa = v; mudou(p); }, { antes: "R$", dica: br(num(p.custosPedido.caixa).toFixed(2)) }));
        l.appendChild(campo("Envio (opcional)", k.envio, function (v) { k.envio = v; mudou(p); }, { antes: "R$", dica: br(num(p.custosPedido.envio).toFixed(2)) }));
        l.appendChild(botaoTexto("🗑", function () { if (confirm("Remover \"" + (k.nome || "este kit") + "\"?")) { p.kits.splice(i, 1); mudou(p, true); } }, "is-x"));
        c4.appendChild(l);
      });
      c4.appendChild(botaoTexto("+ Adicionar kit", function () { var n = p.kits.length + 1; p.kits.push({ nome: "Kit " + n + " unidades", unidades: n, preco: 0 }); mudou(p, true); }));
      esq.appendChild(c4);
    } else if (passo === 4) {
      var c5 = cartao("Ficha do produto", "Os dados do produto num lugar só (para anúncios, atendimento e fornecedores).");
      var g5 = el("div", "prod-linha-2");
      FICHA.forEach(function (f) { g5.appendChild(campo(f[1], p.ficha[f[0]], function (v) { p.ficha[f[0]] = v; mudou(p); }, { texto: true, linhas: f[2] ? 3 : 0, largo: !!f[2] })); });
      c5.appendChild(g5);
      esq.appendChild(c5);
    } else {
      var feito = el("span", "prod-total"); feito.appendChild(el("span", null, "Preenchido")); feito.appendChild(el("strong", null, pct(completoCriativos(p), 0)));
      var c6 = cartao("Para criativos", "Briefing para quem grava e edita os anúncios. Quanto mais completo, melhores os roteiros.", feito);
      CRIATIVOS.forEach(function (f) {
        c6.appendChild(campo(f[1], p.criativos[f[0]], function (v) { p.criativos[f[0]] = v; feito.lastChild.textContent = pct(completoCriativos(p), 0); mudou(p); }, { texto: true, linhas: 3, largo: true, dica: f[2] }));
      });
      esq.appendChild(c6);
    }
    esq.appendChild(rodape(p));
  }

  /* ---------- análise por kit ---------- */
  function desenharAnalise(p) {
    var dir = raiz.querySelector("[data-prod-dir]");
    if (!dir) return;
    limpar(dir);
    var cab = el("div", "prod-dir-cab");
    cab.appendChild(el("h3", null, "Análise por kit"));
    var tg = el("div", "prod-toggle is-grande");
    [["direta", "Direta"], ["afiliado", "Afiliado"]].forEach(function (o) {
      var b = el("button", modo === o[0] ? "is-ativo" : null, o[1]); b.type = "button";
      b.addEventListener("click", function () { modo = o[0]; desenharAnalise(p); }); tg.appendChild(b);
    });
    cab.appendChild(tg);
    dir.appendChild(cab);
    if (!(p.kits || []).length) { dir.appendChild(el("p", "lanc-vazio", "Adicione um kit na etapa 3.")); return; }
    p.kits.forEach(function (k) {
      var a = analisar(p, k, modo);
      var c = el("div", "prod-k");
      var t = el("div", "prod-k-cab");
      var tt = el("div"); tt.appendChild(el("strong", null, k.nome || "Kit")); tt.appendChild(el("span", null, num(k.unidades) + " un. · " + r$(a.porUnidade) + " por unidade"));
      var tp = el("div", "prod-k-preco"); tp.appendChild(el("strong", null, r$(num(k.preco)))); tp.appendChild(el("span", a.margem != null && a.margem < 0.1 ? "is-ruim" : "is-bom", "margem " + pct(a.margem)));
      t.appendChild(tt); t.appendChild(tp); c.appendChild(t);
      a.linhas.forEach(function (l) { var r = el("div", "prod-k-l"); r.appendChild(el("span", null, l[0])); r.appendChild(el("span", null, "− " + r$(l[1]))); c.appendChild(r); });
      var tot = el("div", "prod-k-l is-total"); tot.appendChild(el("span", null, "Custo total")); tot.appendChild(el("span", null, r$(a.total))); c.appendChild(tot);
      var lu = el("div", "prod-k-lucro"); lu.appendChild(el("strong", null, "Lucro por venda")); lu.appendChild(el("strong", a.lucro < 0 ? "is-ruim" : null, r$(a.lucro))); c.appendChild(lu);
      var g = el("div", "prod-k-g");
      [["Preço mínimo", r$(a.minimo)], ["Preço sugerido", r$(a.sugerido)], ["Markup", a.markup == null ? "–" : a.markup.toFixed(2).replace(".", ",") + "x"]].forEach(function (x) {
        var d = el("div"); d.appendChild(el("span", null, x[0])); d.appendChild(el("b", null, x[1])); g.appendChild(d);
      });
      c.appendChild(g);
      if (a.sugerido != null && Math.abs(a.sugerido - num(k.preco)) > 0.01) {
        c.appendChild(botaoTexto("Usar preço sugerido (" + r$(a.sugerido) + ")", function () {
          k.preco = Math.round(a.sugerido * 100) / 100; mudou(p, passo === 3);
        }, "is-sugerido"));
      }
      dir.appendChild(c);
    });
  }

  /* ---------- relatório (PDF pelo navegador) ---------- */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function relatorio(p) {
    var hoje = new Date().toLocaleDateString("pt-BR");
    var cp = p.custosPedido || {}, tx = p.taxas || {};
    var tabelaKits = function (m) {
      var linhas = (p.kits || []).map(function (k) {
        var a = analisar(p, k, m);
        return "<tr><td>" + esc(k.nome) + "</td><td>" + num(k.unidades) + "</td><td>" + r$(num(k.preco)) + "</td><td>" + r$(a.total) + "</td><td><b>" + r$(a.lucro) + "</b></td><td>" + pct(a.margem) +
          "</td><td>" + r$(a.minimo) + "</td><td>" + r$(a.sugerido) + "</td><td>" + (a.markup == null ? "–" : a.markup.toFixed(2).replace(".", ",") + "x") + "</td></tr>";
      }).join("");
      return "<table><thead><tr><th>Kit</th><th>Un.</th><th>Preço</th><th>Custo total</th><th>Lucro</th><th>Margem</th><th>Preço mínimo</th><th>Preço sugerido</th><th>Markup</th></tr></thead><tbody>" + linhas + "</tbody></table>";
    };
    var detalhe = (p.kits || []).map(function (k) {
      var a = analisar(p, k, "direta");
      return "<div class='kit'><h3>" + esc(k.nome) + " · " + r$(num(k.preco)) + "</h3><table>" + a.linhas.map(function (l) { return "<tr><td>" + esc(l[0]) + "</td><td class='n'>− " + r$(l[1]) + "</td></tr>"; }).join("") +
        "<tr class='t'><td>Custo total</td><td class='n'>" + r$(a.total) + "</td></tr><tr class='t'><td>Lucro por venda</td><td class='n'>" + r$(a.lucro) + " (" + pct(a.margem) + ")</td></tr></table></div>";
    }).join("");
    var ficha = FICHA.filter(function (f) { return !vazio((p.ficha || {})[f[0]]); }).map(function (f) { return "<tr><td>" + esc(f[1]) + "</td><td>" + esc(p.ficha[f[0]]) + "</td></tr>"; }).join("");
    var html = "<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>Relatório dos kits · " + esc(p.nome) + "</title><style>" +
      "body{font:13px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1a1a;margin:32px}h1{margin:0;font-size:22px}h2{margin:28px 0 8px;font-size:15px;border-bottom:1px solid #ddd;padding-bottom:4px}" +
      "h3{margin:0 0 6px;font-size:13px}.sub{color:#666;margin:4px 0 0}table{width:100%;border-collapse:collapse;margin-top:6px}th,td{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}" +
      "th{background:#f5f6f8;font-size:11.5px;color:#555}td.n{text-align:right;white-space:nowrap}tr.t td{font-weight:700}.kits{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}" +
      ".kit{border:1px solid #e3e5e8;border-radius:10px;padding:10px}.resumo{display:flex;gap:28px;flex-wrap:wrap}.resumo div{min-width:150px}.resumo b{display:block;font-size:16px}" +
      "@media print{body{margin:14mm}.nao{display:none}}</style></head><body>" +
      "<button class='nao' onclick='print()' style='float:right;padding:8px 14px'>Salvar em PDF / imprimir</button>" +
      "<h1>Relatório dos kits · " + esc(p.nome) + "</h1><p class='sub'>" + esc(STATUS[p.status] || "") + " · gerado em " + hoje + " · margem-alvo " + br(num(p.margemAlvo)) + "%</p>" +
      "<h2>Custos e taxas</h2><div class='resumo'><div>Custo por unidade<b>" + r$(custoUnidade(p)) + "</b></div><div>Caixa por pedido<b>" + r$(num(cp.caixa)) + "</b></div><div>Envio por pedido<b>" + r$(num(cp.envio)) +
      "</b></div><div>CAC (direta)<b>" + (cp.cacTipo === "pct" ? br(num(cp.cac)) + "%" : r$(num(cp.cac))) + "</b></div><div>Impostos<b>" + br(num(tx.impostos)) + "%</b></div><div>Taxa da plataforma<b>" + br(num(tx.plataforma)) +
      "%</b></div><div>Comissão do afiliado<b>" + br(num(tx.afiliado)) + "%</b></div></div>" +
      "<table>" + (p.custosUnidade || []).map(function (c) { return "<tr><td>" + esc(c.nome) + "</td><td class='n'>" + r$(num(c.valor)) + "</td></tr>"; }).join("") + "</table>" +
      "<h2>Venda direta</h2>" + tabelaKits("direta") + "<h2>Venda por afiliado</h2>" + tabelaKits("afiliado") +
      "<h2>Composição do custo por kit (venda direta)</h2><div class='kits'>" + detalhe + "</div>" +
      (ficha ? "<h2>Ficha do produto</h2><table>" + ficha + "</table>" : "") +
      "<script>setTimeout(function(){print()},400)<\/script></body></html>";
    var w = window.open("", "_blank");
    if (!w) { alert("O navegador bloqueou a janela do relatório. Permita pop-ups para o painel e tente de novo."); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  function desenhar() {
    if (!produtos) return;
    var p = atual();
    if (p) desenharEditor(p); else desenharLista();
  }

  var botaoAba = document.querySelector('[data-aba="produto"]');
  if (botaoAba) botaoAba.addEventListener("click", function () { if (produtos && !App.estado.demo === !(produtos[0] && /^demo-/.test(produtos[0].id))) desenhar(); else carregar(); });
  document.addEventListener("painel:montado", function () {
    if (App.estado.demo && produtos && !(produtos[0] && /^demo-/.test(produtos[0].id))) { produtos = null; atualId = null; }
    if (!secao.hidden && !produtos) carregar();
  });
})();
