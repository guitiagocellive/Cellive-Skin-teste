/* Painel do quiz e da oferta.
   Lê os números de /api/painel (com a senha) e monta as abas.
   Sem senha configurada ou sem dados, dá para abrir em "modo demonstração",
   com números fictícios (sempre sinalizado no topo). */
(function () {
  "use strict";

  /* ================= utilidades ================= */
  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  function limpar(no) { while (no.firstChild) no.removeChild(no.firstChild); return no; }
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var NUM = new Intl.NumberFormat("pt-BR");
  function n(v) { return NUM.format(Math.round(v || 0)); }
  function pct(a, b, casas) {
    if (!b) return "–";
    return (100 * a / b).toLocaleString("pt-BR", { minimumFractionDigits: casas == null ? 1 : casas, maximumFractionDigits: casas == null ? 1 : casas }) + "%";
  }
  function tempo(ms) {
    if (!ms && ms !== 0) return "–";
    var s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m" + String(s % 60).padStart(2, "0") + "s";
    return Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") + "m";
  }
  function mediana(lista) {
    var l = (lista || []).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    if (!l.length) return null;
    var m = Math.floor(l.length / 2);
    return l.length % 2 ? l[m] : (l[m - 1] + l[m]) / 2;
  }
  // número que "conta" até o valor final (só quando a tela foi aberta agora)
  var SEM_MOVIMENTO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function contar(no, alvo, fmt) {
    if (estado.silencioso || SEM_MOVIMENTO || !isFinite(alvo)) { no.textContent = fmt(alvo); return; }
    var t0 = null, dur = 1000;
    var passo = function (t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      no.textContent = fmt(alvo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(passo);
    };
    no.textContent = fmt(0);
    requestAnimationFrame(passo);
  }

  // brilho (luz) em volta de linhas e formas do SVG
  var proxId = 0;
  function brilho(svg, desvio) {
    var id = "luz" + (++proxId);
    var defs = svg.querySelector("defs") || svg.insertBefore(svgEl("defs", {}), svg.firstChild);
    var f = svgEl("filter", { id: id, x: "-30%", y: "-60%", width: "160%", height: "220%" });
    f.appendChild(svgEl("feGaussianBlur", { stdDeviation: desvio || 3, result: "b" }));
    var m = svgEl("feMerge", {});
    m.appendChild(svgEl("feMergeNode", { in: "b" }));
    m.appendChild(svgEl("feMergeNode", { in: "SourceGraphic" }));
    f.appendChild(m);
    defs.appendChild(f);
    return "url(#" + id + ")";
  }
  // degradê vertical (cor forte em cima, some embaixo) para as áreas
  function degrade(svg, cor, forca) {
    var id = "deg" + (++proxId);
    var defs = svg.querySelector("defs") || svg.insertBefore(svgEl("defs", {}), svg.firstChild);
    var g = svgEl("linearGradient", { id: id, x1: 0, y1: 0, x2: 0, y2: 1 });
    g.appendChild(svgEl("stop", { offset: "0%", "stop-color": cor, "stop-opacity": forca || 0.3 }));
    g.appendChild(svgEl("stop", { offset: "100%", "stop-color": cor, "stop-opacity": 0 }));
    defs.appendChild(g);
    return "url(#" + id + ")";
  }

  // mini gráfico de linha (dentro dos cartões)
  function faisca(valores, cor, W, H, opc) {
    opc = opc || {};
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", class: opc.classe || "kpi-faisca", "aria-hidden": "true" });
    if (!valores || valores.length < 2) return svg;
    var max = Math.max.apply(null, valores.concat(opc.min || 0.0001));
    var topo = opc.folga == null ? 6 : opc.folga;
    var m = opc.margem || 0;
    // relativo: a escala vai do menor ao maior valor (mostra melhor a variação)
    var min = opc.relativo ? Math.min.apply(null, valores) : 0;
    if (opc.relativo && max - min < 1e-9) min = max - 1;
    var pts = valores.map(function (v, i) { return [m + (W - 2 * m) * i / (valores.length - 1), topo + (H - topo - 8) * (1 - (v - min) / (max - min))]; });
    var linha = "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L");
    svg.appendChild(svgEl("path", { d: linha + "L" + pts[pts.length - 1][0] + " " + H + "L" + pts[0][0] + " " + H + "Z", fill: degrade(svg, cor, opc.forca || 0.28), class: "surgir" }));
    svg.appendChild(svgEl("path", { d: linha, fill: "none", stroke: cor, "stroke-width": opc.espessura || 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: "desenhar", filter: brilho(svg, opc.luz || 2.5) }));
    var u = pts[pts.length - 1];
    if (opc.ponto) svg.appendChild(svgEl("circle", { cx: u[0], cy: u[1], r: 3.5, fill: cor, class: "surgir ponto-vivo", filter: brilho(svg, 3) }));
    return svg;
  }

  function dataBR(iso) { var p = iso.split("-"); return p[2] + "/" + p[1]; }
  function isoDia(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ================= nomes amigáveis ================= */
  var CURTOS = {
    "melhorar": "O que quer melhorar", "pele-hoje": "Como está a pele", "ha-quanto-tempo": "Há quanto tempo",
    "carregamento-1": "Interlúdio · 99 de 100", "idade": "Idade", "sensibilidade": "Sensibilidade",
    "botox-peeling": "Botox ou peeling", "linhas-testa": "Linhas na testa", "rotina-skincare": "Rotina de skincare",
    "sinais": "Sinais que incomodam", "protetor-solar": "Protetor solar", "firmeza": "Firmeza",
    "espelho": "Espelho sem maquiagem", "ativo-rejuvenescimento": "Já usa ativos", "ativo-rejuvenescimento-2": "Ativos (pergunta 11)",
    "linhas-olhos": "Linhas nos olhos", "analise": "Análise do caso", "montagem": "Montando a fórmula",
  };

  // Telas do quiz na ordem (vem do próprio quiz-perguntas.js)
  var TELAS = [];
  var PERGUNTAS = [];
  (window.QUIZ_FLUXO || []).forEach(function (b) {
    if (b.perguntas) {
      b.perguntas.forEach(function (p) {
        TELAS.push({ id: p.id, nome: CURTOS[p.id] || p.titulo, pergunta: true });
        PERGUNTAS.push(p);
      });
    } else {
      TELAS.push({ id: b.id || b.tipo, nome: CURTOS[b.id] || CURTOS[b.tipo] || b.tipo, pergunta: false });
    }
  });
  var numeroPergunta = {};
  PERGUNTAS.forEach(function (p, i) { numeroPergunta[p.id] = "P" + (i + 1); });

  var SECOES = [
    ["produto", "Produto (topo)"], ["planos", "Planos e preços"], ["depoimentos", "Depoimentos (+5.000 mulheres)"],
    ["envelhece", "Você envelhece"], ["conheca", "Conheça o Sérum"], ["formula", "Sua fórmula personalizada"],
    ["srrp", "Ação SRRP"], ["inimigo", "O verdadeiro inimigo"], ["reset", "O reset"], ["aliado", "O que ele te proporciona"],
    ["microagulhamento", "Microagulhamento"], ["clientes", "Um pouco dos nossos clientes"], ["garantia", "Garantia"],
    ["resultados", "Resultados reais"], ["faixa", "Faixa de benefícios"], ["videos", "Vídeos"], ["confianca", "Resultado para confiar"],
    ["numeros", "Os números falam por si"], ["jornada", "Como ele age na pele"], ["duvidas", "Principais dúvidas"],
    ["avaliacoes", "Avaliação dos clientes"], ["rodape", "Rodapé (fim da página)"],
  ];
  var FAQ = {
    // perguntas atuais (nome fixo)
    "anvisa": "Tem registro na Anvisa?", "resultado": "Realmente dá resultado?", "tempo": "Em quanto tempo vejo resultados?",
    "confiavel": "É confiável comprar?", "garantia": "E se eu não gostar?", "frete": "O frete é grátis?",
    "o-que-e": "O que é o Sérum?", "como-usar": "Como e quando usar?", "srrp": "O que é a ação SRRP?",
    // dúvidas rápidas do começo da página (logo depois dos depoimentos)
    "topo-por-que": "Começo · Por que usar o Sérum?", "topo-rejuvenesce": "Começo · Ele rejuvenesce mesmo a pele?",
    "topo-regularizado": "Começo · O produto é regularizado?",
    // perguntas antigas (números), para os dados de antes da troca
    "1": "O que é o Sérum?", "2": "Como usar?", "3": "O que é a ação SRRP?", "4": "Posso usar todos os dias?", "5": "Em que horário usar?"
  };
  var JORNADA = { "0": "Semana 1–2", "1": "Semana 3–4", "2": "Semana 5–12", "3": "+12 semanas" };
  function nomeClique(c) {
    var v = c.valor;
    switch (c.etapa) {
      case "cta-capa": return "Capa · botão “Quero melhorar minha pele”";
      case "politica": return "Capa · Política de Privacidade";
      case "barra-compra": return "Barra fixa “Comprar”";
      case "avaliacoes": return "Link “1.430 Avaliações”" + (v ? " · " + (v === "topo" ? "topo" : "planos") : "");
      case "quero-minha-formula": return "Botão “Quero minha fórmula”";
      case "ver-mais-ativos": return v === "outros" ? "Conheça os outros ativos da fórmula" : "Ver os outros ativos escolhidos";
      case "ver-mais-avaliacoes": return "Ver mais avaliações";
      case "faq": return "Dúvida · " + (FAQ[v] || v);
      case "video": return "Vídeo " + v + " (play)";
      case "videos-seta": return "Vídeos · seta " + (v === "anterior" ? "anterior" : "próxima");
      case "galeria": return "Galeria · foto " + v;
      case "jornada": return "Jornada · " + (JORNADA[v] || v);
      case "whatsapp": return "WhatsApp · " + (v === "rodape-suporte" ? "suporte" : "falar com atendente");
      case "email": return "E-mail de suporte";
      case "instagram": return "Instagram";
      case "rodape": return "Rodapé · " + (v === "duvidas" ? "Perguntas frequentes" : "Quero adquirir o meu");
      default: return c.etapa + (v ? " · " + v : "");
    }
  }
  var KITS = { "1": "Kit 1 · 1 unidade", "2": "Kit 2 · 2 unidades", "3": "Kit 3 · 3 unidades" };
  var KITS_SUB = { "1": "30 dias · R$ 197,90", "2": "60 dias · R$ 297,90", "3": "90 dias · R$ 397,90" };

  /* ================= estado ================= */
  var estado = {
    senha: null, demo: false, periodo: "7", de: null, ate: null,
    filtros: { fonte: "", campanha: "", aparelho: "" }, aba: "geral", dados: null, silencioso: false,
    versao: "v1", // v1 = funil com quiz; v2 = oferta direta (anúncios)
  };
  try { estado.senha = sessionStorage.getItem("cl-painel-senha"); } catch (e) { /* sem armazenamento */ }
  var ehV2 = function () { return estado.versao === "v2"; };
  // o chat do Estrategista (painel-agente.js) lê daqui a senha, o período e os números da tela
  window.PainelApp = {
    estado: estado,
    visitasDe: function (k) { return visitasDe(k); },
    analisar: function () { return estado.resumoIA && window.PainelAnalise ? window.PainelAnalise.analisar(estado.resumoIA) : null; },
    depoisDeMontar: null, // o Estrategista se registra aqui para se atualizar
    trocarPeriodo: function (p) { var b = document.querySelector('[data-periodo="' + p + '"]'); if (b) b.click(); },
    periodo: function () { var r = intervalo(); return { de: isoDia(r.de), ate: isoDia(new Date(r.ate.getTime() - 1)) }; },
  };

  function intervalo() {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    var de, ate = amanha;
    if (estado.de && estado.ate) {
      de = new Date(estado.de + "T00:00:00");
      ate = new Date(estado.ate + "T00:00:00"); ate.setDate(ate.getDate() + 1);
    } else if (estado.periodo === "hoje") de = hoje;
    else if (estado.periodo === "ontem") { de = new Date(hoje); de.setDate(de.getDate() - 1); ate = hoje; }
    else if (estado.periodo === "tudo") de = new Date(2024, 0, 1);
    else { de = new Date(hoje); de.setDate(de.getDate() - (Number(estado.periodo) - 1)); }
    return { de: de, ate: ate };
  }

  /* ================= carregar ================= */
  var conteudo = $("[data-conteudo]");

  function mostrarEntrada(msg) {
    $("[data-painel]").hidden = true;
    $("[data-entrar]").hidden = false;
    var erro = $("[data-entrar-erro]");
    erro.hidden = !msg;
    erro.textContent = msg || "";
  }

  function status(texto, tipo) {
    var s = $("[data-status]");
    s.className = "status" + (tipo ? " is-" + tipo : "");
    $("[data-status-texto]").textContent = texto;
  }

  function carregar(silencioso) {
    var r = intervalo();
    if (typeof contarFiltros === "function") contarFiltros();
    estado.silencioso = !!silencioso;
    if (!silencioso) conteudo.classList.add("is-carregando");
    $("[data-atualizar]").classList.add("is-girando");
    if (estado.demo) {
      estado.dados = gerarDemo(r);
      $("[data-atualizar]").classList.remove("is-girando");
      montar();
      status("Modo demonstração", "demo");
      conteudo.classList.remove("is-carregando");
      return;
    }
    var q = new URLSearchParams({ de: r.de.getTime(), ate: r.ate.getTime(), versao: estado.versao });
    for (var k in estado.filtros) if (estado.filtros[k]) q.set(k, estado.filtros[k]);
    fetch("/api/painel?" + q.toString(), { headers: { authorization: "Bearer " + estado.senha } })
      .then(function (resp) {
        return resp.json().catch(function () { return {}; }).then(function (corpo) { return { resp: resp, corpo: corpo }; });
      })
      .then(function (x) {
        conteudo.classList.remove("is-carregando");
        $("[data-atualizar]").classList.remove("is-girando");
        if (x.resp.status === 401) {
          try { sessionStorage.removeItem("cl-painel-senha"); } catch (e) { /* ok */ }
          return mostrarEntrada("Senha incorreta.");
        }
        if (x.corpo.erro === "sem-senha") return mostrarEntrada("A senha do painel ainda não foi configurada na Vercel (variável PAINEL_SENHA).");
        if (x.corpo.erro === "sem-banco") return mostrarEntrada("O banco de dados ainda não foi conectado ao projeto na Vercel (Storage > Neon).");
        if (!x.resp.ok) { status("Erro ao carregar", "demo"); return; }
        estado.dados = x.corpo;
        $("[data-entrar]").hidden = true;
        $("[data-painel]").hidden = false;
        montar();
        // na prévia (link de teste da Vercel) o selo avisa que não é a versão no ar
        if (x.corpo.ambiente === "preview") status("Prévia · versão de teste", "demo");
        else status(x.corpo.aoVivo ? x.corpo.aoVivo + " pessoa" + (x.corpo.aoVivo > 1 ? "s" : "") + " agora" : "Ao vivo", "ao-vivo");
      })
      .catch(function () {
        conteudo.classList.remove("is-carregando");
        $("[data-atualizar]").classList.remove("is-girando");
        mostrarEntrada("Não foi possível conectar ao servidor do painel.");
      });
  }

  /* ================= montagem das abas ================= */
  function montar() {
    var d = estado.dados;
    // na atualização automática (a cada minuto) nada se mexe na tela
    conteudo.classList.toggle("estatico", estado.silencioso);
    preencherFiltros(d.opcoes || []);
    montarGeral(d);
    montarLeads(d);
    montarIA(d);
    montarFunil(d);
    montarRespostas(d);
    montarOferta(d);
    montarOrigem(d);
    requestAnimationFrame(ajustarRotulos);
    estado.silencioso = false;
    if (window.PainelApp && typeof window.PainelApp.depoisDeMontar === "function") window.PainelApp.depoisDeMontar();
    // outras partes do painel (aba Lançamento) se atualizam junto
    try { document.dispatchEvent(new CustomEvent("painel:montado")); } catch (e) { /* navegador antigo */ }
  }

  function preencherFiltros(opcoes) {
    ["fonte", "campanha", "aparelho"].forEach(function (campo) {
      var sel = $('[data-filtro="' + campo + '"]');
      var atual = estado.filtros[campo];
      while (sel.options.length > 1) sel.remove(1);
      opcoes.filter(function (o) { return o.campo === campo && o.v; }).forEach(function (o) {
        var op = el("option", null, o.v);
        op.value = o.v;
        sel.appendChild(op);
      });
      sel.value = atual;
    });
  }

  function delta(atual, anterior) {
    if (estado.periodo === "tudo" || anterior == null || !anterior) return null;
    var v = (atual - anterior) / anterior * 100;
    if (!isFinite(v)) return null;
    return v;
  }

  /* Cartão de número. opc: { num: valor numérico para "contar", fmt: formato,
     serie: valores por dia para o mini gráfico, cor } */
  var ICONE_SOBE = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M6 2 10 8H2z" fill="currentColor"/></svg>';
  var ICONE_DESCE = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M6 10 2 4h8z" fill="currentColor"/></svg>';
  function seloDelta(dlt) {
    var s = el("span", "kpi-delta " + (dlt >= 0 ? "sobe" : "desce"));
    s.innerHTML = dlt >= 0 ? ICONE_SOBE : ICONE_DESCE;
    s.appendChild(document.createTextNode(Math.abs(Math.round(dlt)) + "%"));
    s.title = "Comparado ao período anterior de mesmo tamanho";
    return s;
  }
  function cartaoKpi(rotulo, valor, sub, dlt, destaque, opc) {
    opc = opc || {};
    var c = el("article", "kpi revelar" + (destaque ? " destaque" : ""));
    c.appendChild(el("p", "kpi-rotulo", rotulo));
    var v = el("div", "kpi-valor");
    var num = el("span", null, valor);
    v.appendChild(num);
    if (opc.num != null) contar(num, opc.num, opc.fmt);
    if (dlt != null) v.appendChild(seloDelta(dlt));
    c.appendChild(v);
    if (sub) c.appendChild(el("p", "kpi-sub", sub));
    if (opc.serie && opc.serie.length > 2) c.appendChild(faisca(opc.serie, opc.cor || "#b1c7de", 170, 34));
    return c;
  }

  // Etapas do funil completo
  function etapasFunil(d) {
    var porEtapa = {};
    (d.etapas || []).forEach(function (e) { porEtapa[e.etapa] = e.n; });
    var k = d.kpi;
    var lista = [];
    lista.push({ id: "capa", nome: "Abriu a capa", n: k.capa, marco: true });
    lista.push({ id: "cta", nome: "Clicou em “Quero melhorar minha pele”", n: k.cta_capa, marco: true });
    TELAS.forEach(function (t, i) {
      lista.push({ id: t.id, nome: (t.pergunta ? numeroPergunta[t.id] + " · " : "") + t.nome, n: porEtapa[t.id] || 0, marco: !t.pergunta, num: i + 1 });
    });
    lista.push({ id: "oferta", nome: "Viu a fórmula (oferta)", n: k.oferta, marco: true });
    lista.push({ id: "planos", nome: "Viu os planos", n: k.viram_planos, marco: true });
    lista.push({ id: "checkout", nome: "Clicou no checkout", n: k.checkout, marco: true });
    return lista;
  }

  function gargalo(lista) {
    var pior = null;
    for (var i = 1; i < lista.length; i++) {
      var ant = lista[i - 1].n, at = lista[i].n;
      if (ant < 10) continue;
      var perda = (ant - at) / ant;
      // só vale dentro do quiz (até ver a fórmula); planos → checkout é decisão de compra
      if (["capa", "cta", "planos", "checkout"].indexOf(lista[i].id) !== -1) continue;
      if (!pior || perda > pior.perda) pior = { i: i, perda: perda, pessoas: ant - at };
    }
    return pior && pior.perda > 0 ? pior : null;
  }

  var ICONE_ALERTA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/></svg>';
  function mostrarAlerta(no, lista, g) {
    if (!g) { no.hidden = true; return; }
    limpar(no);
    no.hidden = false;
    no.insertAdjacentHTML("afterbegin", ICONE_ALERTA);
    var p = el("p");
    p.style.margin = "0";
    p.appendChild(el("strong", null, "Maior gargalo: "));
    p.appendChild(document.createTextNode(lista[g.i - 1].nome + " → " + lista[g.i].nome + ". " + n(g.pessoas) + " pessoas (" + Math.round(g.perda * 100) + "%) param aqui."));
    no.appendChild(p);
  }

  /* "Visitas" = sessões que abriram a capa ou o quiz (mesma conta nos
     cartões, no funil e no gráfico diário) */
  function visitasDe(k) {
    if (ehV2()) return Number(k.entrada) || Number(k.oferta) || k.sessoes || 0;
    return Number(k.entrada) || Math.max(k.capa || 0, k.quiz || 0) || k.sessoes || 0;
  }

  /* ---------- Resumo ---------- */
  var PRECO = { "1": 197.9, "2": 297.9, "3": 397.9 };
  var REAL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function montarGeral(d) {
    var k = d.kpi, a = d.kpiAnt || {};
    var base = visitasDe(k);
    var baseAnt = visitasDe(a);
    var dias = diasDoPeriodo(d);
    var serie = function (campo) { return dias.map(function (x) { return x[campo] || 0; }); };
    var inteiro = function (v) { return n(v); };

    montarHeroi(d, base, baseAnt, dias);

    var kpis = limpar($("[data-kpis]"));
    var novos = 0, total = 0;
    (d.novos || []).forEach(function (x) { total += x.n; if (x.novo) novos += x.n; });
    var kits = (d.checkoutPlano || []).slice().sort(function (x, y) { return y.n - x.n; });
    var totalKits = kits.reduce(function (s, x) { return s + x.n; }, 0);
    var receita = kits.reduce(function (s, x) { return s + x.n * (PRECO[x.valor] || 0); }, 0);

    var cartoes = ehV2() ? cartoesV2(d, base, baseAnt, serie, inteiro, kits, totalKits, receita) : [
      cartaoKpi("Visitas", n(base), n(k.visitantes) + " pessoas únicas · " + pct(novos, total, 0) + " novas", delta(base, baseAnt), false,
        { num: base, fmt: inteiro, serie: serie("visitas"), cor: "#3987e5" }),
      cartaoKpi("Começaram o quiz", pct(k.iniciaram, base, 0), n(k.iniciaram) + " responderam a 1ª pergunta", delta(k.iniciaram, a.iniciaram), false,
        { num: base ? 100 * k.iniciaram / base : 0, fmt: function (v) { return Math.round(v) + "%"; }, serie: serie("iniciaram"), cor: "#b1c7de" }),
      cartaoKpi("Viram a fórmula", n(k.oferta), pct(k.oferta, base, 0) + " das visitas", delta(k.oferta, a.oferta), false,
        { num: k.oferta, fmt: inteiro, serie: serie("formulas"), cor: "#d95926" }),
      cartaoKpi("Clicaram em comprar", n(k.checkout), pct(k.checkout, k.oferta, 0) + " de quem viu a fórmula", delta(k.checkout, a.checkout), true,
        { num: k.checkout, fmt: inteiro, serie: serie("checkouts"), cor: "#199e70" }),
      cartaoKpi("Concluíram o quiz", n(k.concluiram), pct(k.concluiram, k.iniciaram, 0) + " de quem começou", delta(k.concluiram, a.concluiram), false,
        { num: k.concluiram, fmt: inteiro }),
      cartaoKpi("Tempo até a fórmula", tempo(mediana(d.duracoes)), "metade das pessoas leva menos que isso"),
      cartaoKpi("Kit mais escolhido", kits[0] ? "Kit " + kits[0].valor : "–", kits[0] ? pct(kits[0].n, totalKits, 0) + " dos cliques em comprar" : "sem cliques no período"),
      cartaoKpi("Ticket médio", totalKits ? REAL.format(receita / totalKits) : "–", "estimado pelos kits escolhidos"),
    ];
    cartoes.forEach(function (c, i) { c.style.setProperty("--i", i + 2); kpis.appendChild(c); });

    montarFunilVisual(d);
    montarDiario(d);
  }

  /* ================= lista de lançamento ================= */
  function montarLeads(d) {
    var L = d.leads || { periodo: 0, total: 0, ultimos: [], porKit: [] };
    contar($("[data-leads-periodo]"), L.periodo, n);
    $("[data-leads-total]").textContent = n(L.total);
    $("[data-leads-taxa]").textContent = pct(L.periodo, d.kpi.checkout, 0);

    var kits = limpar($("[data-leads-kits]"));
    var totalKit = (L.porKit || []).reduce(function (s, x) { return s + x.n; }, 0);
    ["1", "2", "3"].forEach(function (kit) {
      var item = (L.porKit || []).filter(function (x) { return String(x.kit) === kit; })[0];
      var v = item ? item.n : 0;
      var linha = el("div", "leads-kit");
      linha.appendChild(el("span", "leads-kit-nome", kit + (kit === "1" ? " unidade" : " unidades")));
      var barra = el("span", "leads-kit-barra");
      var cheio = el("i");
      cheio.style.width = (totalKit ? 100 * v / totalKit : 0) + "%";
      barra.appendChild(cheio);
      linha.appendChild(barra);
      linha.appendChild(el("span", "leads-kit-n", n(v)));
      kits.appendChild(linha);
    });

    var ul = limpar($("[data-leads-ultimos]"));
    if (!L.ultimos || !L.ultimos.length) {
      ul.appendChild(el("li", "leads-vazio", estado.demo ? "Na demonstração os nomes não aparecem." : "Ninguém se cadastrou neste período ainda."));
    } else {
      L.ultimos.forEach(function (x) {
        var li = el("li");
        li.appendChild(el("span", "leads-nome", x.nome));
        li.appendChild(el("span", "leads-quando", (x.kit ? "Kit " + x.kit + " · " : "") + new Date(x.criado).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })));
        ul.appendChild(li);
      });
    }
  }
  function baixarLeads() {
    if (estado.demo) { status("Entre com a senha para baixar a lista", "demo"); return; }
    fetch("/api/lead?formato=csv", { headers: { authorization: "Bearer " + estado.senha } })
      .then(function (resp) { if (!resp.ok) throw new Error(); return resp.blob(); })
      .then(function (blob) { baixar(blob, "cellive-lista-de-lancamento-" + isoDia(new Date()) + ".csv"); })
      .catch(function () { status("Erro ao baixar a lista", "demo"); });
  }

  // números da v2 (oferta direta): sem as etapas do quiz
  function cartoesV2(d, base, baseAnt, serie, inteiro, kits, totalKits, receita) {
    var k = d.kpi, a = d.kpiAnt || {};
    var rol = (d.rolagem || []).filter(function (x) { return x.pagina === "oferta" && x.r != null; });
    var mediaRol = rol.length ? rol.reduce(function (s, x) { return s + x.r; }, 0) / rol.length : null;
    return [
      cartaoKpi("Visitas na oferta", n(base), n(k.visitantes) + " pessoas únicas", delta(base, baseAnt), false,
        { num: base, fmt: inteiro, serie: serie("visitas"), cor: "#3987e5" }),
      cartaoKpi("Viram os planos", pct(k.viram_planos, base, 0), n(k.viram_planos) + " chegaram nos preços", delta(k.viram_planos, a.viram_planos), false,
        { num: base ? 100 * k.viram_planos / base : 0, fmt: function (v) { return Math.round(v) + "%"; } }),
      cartaoKpi("Clicaram em comprar", n(k.checkout), pct(k.checkout, k.viram_planos, 0) + " de quem viu os planos", delta(k.checkout, a.checkout), true,
        { num: k.checkout, fmt: inteiro, serie: serie("checkouts"), cor: "#199e70" }),
      cartaoKpi("Tocaram num kit", pct(k.escolheram_plano, k.viram_planos, 0), n(k.escolheram_plano) + " de quem viu os planos"),
      cartaoKpi("Tempo na oferta", tempo(mediana(d.tempoOferta)), "metade das pessoas fica menos que isso"),
      cartaoKpi("Rolagem média", mediaRol == null ? "–" : Math.round(mediaRol) + "%", "da altura da página"),
      cartaoKpi("Kit mais escolhido", kits[0] ? "Kit " + kits[0].valor : "–", kits[0] ? pct(kits[0].n, totalKits, 0) + " dos cliques em comprar" : "sem cliques no período"),
      cartaoKpi("Ticket médio", totalKits ? REAL.format(receita / totalKits) : "–", "estimado pelos kits escolhidos"),
    ];
  }

  // cartão grande com a conversão total (visita → clique em comprar)
  function montarHeroi(d, base, baseAnt, dias) {
    var k = d.kpi, a = d.kpiAnt || {};
    var no = limpar($("[data-heroi]"));
    no.appendChild(el("p", "heroi-rot", "Conversão total"));
    var linha = el("div", "heroi-linha");
    var valor = el("span", "heroi-valor", pct(k.checkout, base, 2));
    linha.appendChild(valor);
    var conv = base ? 100 * k.checkout / base : 0;
    contar(valor, conv, function (v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"; });
    var dl = delta(base ? k.checkout / base : 0, baseAnt ? (a.checkout || 0) / baseAnt : 0);
    if (dl != null) linha.appendChild(seloDelta(dl));
    no.appendChild(linha);
    var sub = el("p", "heroi-sub");
    sub.appendChild(el("b", null, n(k.checkout)));
    sub.appendChild(document.createTextNode(" cliques em comprar de "));
    sub.appendChild(el("b", null, n(base)));
    sub.appendChild(document.createTextNode(" visitas"));
    no.appendChild(sub);
    if (dias.length > 2) {
      var g = el("div", "heroi-graf");
      var W = Math.max(280, no.clientWidth || 340);
      g.appendChild(faisca(dias.map(function (x) { return x.conv; }), "#b1c7de", W, 78, { classe: "heroi-faisca", forca: 0.32, espessura: 2.5, luz: 4, ponto: true, folga: 14, margem: 12, relativo: true }));
      no.appendChild(g);
    } else {
      no.appendChild(el("div", "espaco"));
    }
  }

  /* ---------- Evolução diária: um painel por medida (cada um com a sua
     escala), mesma linha do tempo e uma linha-guia que acompanha o dedo ---------- */
  var SERIES_V1 = [
    { k: "visitas", nome: "Visitas", cor: "#3987e5" },
    { k: "formulas", nome: "Viram a fórmula", cor: "#d95926" },
    { k: "checkouts", nome: "Cliques no checkout", cor: "#199e70" },
    { k: "conv", nome: "Conversão (visita → checkout)", cor: "#b1c7de", pct: true },
  ];
  // na v2 a visita já é a oferta: a série "viram a fórmula" repetiria as visitas
  var SERIES = SERIES_V1;
  function escolherSeries() { SERIES = ehV2() ? SERIES_V1.filter(function (x) { return x.k !== "formulas"; }) : SERIES_V1; }

  function diasDoPeriodo(d) {
    var r = intervalo();
    var mapa = {};
    (d.diario || []).forEach(function (x) { mapa[x.dia] = x; });
    var dias = [];
    var inicio = new Date(r.de);
    if (estado.periodo === "tudo" && d.diario && d.diario.length) inicio = new Date(d.diario[0].dia + "T00:00:00");
    for (var t = new Date(inicio); t < r.ate && dias.length < 400; t.setDate(t.getDate() + 1)) {
      var iso = isoDia(t);
      var x = mapa[iso] || { dia: iso, visitas: 0, iniciaram: 0, formulas: 0, checkouts: 0 };
      x.conv = x.visitas ? 100 * x.checkouts / x.visitas : 0;
      dias.push(x);
    }
    return dias;
  }

  function topoBonito(max, ehPct) {
    if (max <= 0) return ehPct ? 1 : 1;
    var passo = Math.pow(10, Math.floor(Math.log10(max)));
    var t = Math.ceil(max / passo) * passo;
    if (t / 2 >= max) t = t / 2;
    return t;
  }

  function montarDiario(d) {
    escolherSeries();
    var dias = diasDoPeriodo(d);
    var caixa = limpar($("[data-grafico-diario]"));
    var largura = caixa.clientWidth || 340;
    var mE = 4, mD = 6, painelH = 92, cabH = 26, entre = 14, eixoH = 20;
    var altura = SERIES.length * (painelH + cabH + entre) + eixoH;
    var svg = svgEl("svg", { width: largura, height: altura, viewBox: "0 0 " + largura + " " + altura, role: "img", "aria-label": "Evolução diária de visitas, fórmulas vistas, cliques no checkout e conversão" });
    var larg = largura - mE - mD;
    var xDe = function (i) { return dias.length === 1 ? mE + larg / 2 : mE + larg * i / (dias.length - 1); };
    var paineis = [];

    SERIES.forEach(function (s, k) {
      var y0 = k * (painelH + cabH + entre);
      var vals = dias.map(function (x) { return x[s.k] || 0; });
      var total = s.pct ? (function () {
        var v = dias.reduce(function (a, x) { return a + x.visitas; }, 0), c = dias.reduce(function (a, x) { return a + x.checkouts; }, 0);
        return pct(c, v, 2);
      })() : n(vals.reduce(function (a, v) { return a + v; }, 0));
      var topo = topoBonito(Math.max.apply(null, vals), s.pct);
      var yDe = function (v) { return y0 + cabH + painelH * (1 - v / topo); };

      // cabeçalho do painel: nome com a marca da cor + total do período
      var marca = svgEl("rect", { x: mE, y: y0 + 6, width: 10, height: 3, rx: 1.5, fill: s.cor });
      svg.appendChild(marca);
      var nome = svgEl("text", { class: "graf-nome", x: mE + 16, y: y0 + 11 });
      nome.textContent = s.nome;
      svg.appendChild(nome);
      var tot = svgEl("text", { class: "graf-total", x: largura - mD, y: y0 + 11, "text-anchor": "end" });
      tot.textContent = total + (s.pct ? " no período" : "");
      svg.appendChild(tot);

      // grade (topo e base) e o valor do topo
      [0, topo].forEach(function (v) {
        svg.appendChild(svgEl("line", { class: "grade", x1: mE, x2: largura - mD, y1: yDe(v), y2: yDe(v) }));
      });
      var tTopo = svgEl("text", { class: "eixo-texto", x: largura - mD, y: yDe(topo) - 4, "text-anchor": "end" });
      tTopo.textContent = s.pct ? topo.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : n(topo);
      svg.appendChild(tTopo);

      // área (10%) + linha (2px)
      var pts = vals.map(function (v, i) { return [xDe(i), yDe(v)]; });
      if (pts.length > 1) {
        var linha = "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L");
        var atraso = "--atraso:" + (k * 0.15) + "s";
        svg.appendChild(svgEl("path", { d: linha + "L" + pts[pts.length - 1][0].toFixed(1) + " " + yDe(0) + "L" + pts[0][0].toFixed(1) + " " + yDe(0) + "Z", fill: degrade(svg, s.cor, 0.3), class: "surgir", style: atraso }));
        svg.appendChild(svgEl("path", { d: linha, fill: "none", stroke: s.cor, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: "desenhar", style: atraso, filter: brilho(svg, 2.5) }));
      }
      // ponto final com anel da cor do fundo
      var ult = pts[pts.length - 1];
      svg.appendChild(svgEl("circle", { cx: ult[0], cy: ult[1], r: 4, fill: s.cor, stroke: "#161617", "stroke-width": 2, class: "surgir", style: "--atraso:" + (k * 0.15 + 0.9) + "s" }));
      // ponto que acompanha a guia
      var guiaPonto = svgEl("circle", { cx: 0, cy: 0, r: 4.5, fill: s.cor, stroke: "#161617", "stroke-width": 2, visibility: "hidden" });
      svg.appendChild(guiaPonto);
      paineis.push({ s: s, pts: pts, ponto: guiaPonto });
    });

    // datas embaixo
    var cada = Math.max(1, Math.ceil(dias.length / Math.max(1, Math.floor(larg / 52))));
    dias.forEach(function (dia, i) {
      if (i % cada !== 0 && i !== dias.length - 1) return;
      if (i !== dias.length - 1 && dias.length - 1 - i < cada * 0.6) return;
      var t = svgEl("text", { class: "eixo-texto", x: xDe(i), y: altura - 4, "text-anchor": i === 0 ? "start" : i === dias.length - 1 ? "end" : "middle" });
      t.textContent = dataBR(dia.dia);
      svg.appendChild(t);
    });

    // linha-guia + área de toque do gráfico inteiro
    var guia = svgEl("line", { class: "graf-guia", x1: 0, x2: 0, y1: 0, y2: altura - eixoH, visibility: "hidden" });
    svg.appendChild(guia);
    var alvo = svgEl("rect", { class: "alvo", x: 0, y: 0, width: largura, height: altura, tabindex: 0, fill: "transparent" });
    var mostrar = function (ev, iForcado) {
      var r = svg.getBoundingClientRect();
      var i = iForcado != null ? iForcado : Math.round((ev.clientX - r.left - mE) / (larg / Math.max(1, dias.length - 1)));
      i = Math.max(0, Math.min(dias.length - 1, i));
      var x = xDe(i);
      guia.setAttribute("x1", x); guia.setAttribute("x2", x); guia.setAttribute("visibility", "visible");
      paineis.forEach(function (p) {
        p.ponto.setAttribute("cx", p.pts[i][0]); p.ponto.setAttribute("cy", p.pts[i][1]); p.ponto.setAttribute("visibility", "visible");
      });
      var dia = dias[i];
      dica({ clientX: r.left + x, clientY: r.top + 10, target: alvo }, dataBR(dia.dia), SERIES.map(function (s) {
        return { cor: s.cor, valor: s.pct ? pct(dia.checkouts, dia.visitas) : n(dia[s.k]), nome: s.nome };
      }));
    };
    var esconder = function () {
      guia.setAttribute("visibility", "hidden");
      paineis.forEach(function (p) { p.ponto.setAttribute("visibility", "hidden"); });
      esconderDica();
    };
    var focoI = dias.length - 1;
    alvo.addEventListener("pointermove", mostrar);
    alvo.addEventListener("pointerdown", mostrar);
    alvo.addEventListener("pointerleave", esconder);
    alvo.addEventListener("focus", function (ev) { mostrar(ev, focoI); });
    alvo.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") focoI = Math.max(0, focoI - 1);
      else if (ev.key === "ArrowRight") focoI = Math.min(dias.length - 1, focoI + 1);
      else return;
      ev.preventDefault();
      mostrar(ev, focoI);
    });
    alvo.addEventListener("blur", esconder);
    svg.appendChild(alvo);
    caixa.appendChild(svg);

    // tabela
    var tab = el("table", "tabela");
    var cab = el("tr");
    ["Dia", "Visitas", "Fórmulas", "Checkout", "Conversão"].forEach(function (h) { cab.appendChild(el("th", null, h)); });
    tab.appendChild(cab);
    dias.slice().reverse().forEach(function (dia) {
      var tr = el("tr");
      [dataBR(dia.dia), n(dia.visitas), n(dia.formulas), n(dia.checkouts), pct(dia.checkouts, dia.visitas)].forEach(function (v) { tr.appendChild(el("td", null, v)); });
      tab.appendChild(tr);
    });
    var wrap = limpar($("[data-tabela-diario]"));
    var rolar = el("div", "tabela-rolar");
    rolar.appendChild(tab);
    wrap.appendChild(rolar);
  }

  /* ---------- Funil de vendas (formato de funil) ----------
     Cada etapa é uma faixa cuja largura é proporcional ao número de pessoas.
     Cor: um só tom de azul, do mais claro (topo) ao mais escuro (fundo). */
  function corEtapa(t) {
    var a = [199, 214, 234], b = [47, 104, 184];
    var c = a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); });
    return { cor: "rgb(" + c.join(",") + ")", escuro: t > 0.45 };
  }

  function funilVisual(no, etapas, g) {
    limpar(no);
    var W = no.clientWidth || 340;
    var F = Math.max(140, Math.min(W * 0.48, 300)); // largura da área do funil
    var linhaH = 66, faixaH = 62;
    var H = etapas.length * linhaH;
    var base = Math.max(1, etapas[0].n);
    var svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Funil de vendas: " + etapas.map(function (e) { return e.nome + " " + n(e.n); }).join(", ") });
    var luz = brilho(svg, 7);
    // reflexo de vidro: mais claro no meio da faixa
    var reflexo = "ref" + (++proxId);
    var defs = svg.querySelector("defs");
    var gr = svgEl("linearGradient", { id: reflexo, x1: 0, y1: 0, x2: 1, y2: 0 });
    [[0, 0], [0.5, 0.28], [1, 0]].forEach(function (st) { gr.appendChild(svgEl("stop", { offset: st[0], "stop-color": "#ffffff", "stop-opacity": st[1] })); });
    defs.appendChild(gr);
    var largDe = function (v) { return Math.max(F * 0.12, F * v / base); };
    var cx = F / 2;

    etapas.forEach(function (e, i) {
      var y = i * linhaH;
      var wTopo = largDe(e.n);
      var wBase = i < etapas.length - 1 ? largDe(etapas[i + 1].n) : wTopo * 0.86;
      var t = etapas.length > 1 ? i / (etapas.length - 1) : 0;
      var c = corEtapa(t);
      var ehGargalo = g && g.i === i;
      var dForma = "M" + (cx - wTopo / 2) + " " + y + "H" + (cx + wTopo / 2) + "L" + (cx + wBase / 2) + " " + (y + faixaH) + "H" + (cx - wBase / 2) + "Z";
      svg.appendChild(svgEl("path", { d: dForma, fill: c.cor, class: "funil-faixa", style: "--i:" + i, filter: luz }));
      svg.appendChild(svgEl("path", { d: dForma, fill: "url(#" + reflexo + ")", class: "funil-faixa", style: "--i:" + i }));
      var grupo = svgEl("g", { class: "funil-txt", style: "--i:" + i });
      svg.appendChild(grupo);

      // % do total dentro da faixa, se couber
      var pTxt = pct(e.n, base, i === 0 ? 0 : 1);
      if (Math.min(wTopo, wBase) > 54) {
        var tp = svgEl("text", { x: cx, y: y + faixaH / 2 + 5, "text-anchor": "middle", class: "funil-pct" + (c.escuro ? " claro" : "") });
        tp.textContent = pTxt;
        grupo.appendChild(tp);
      }

      // textos à direita
      var xT = F + 14;
      var nome = svgEl("text", { x: xT, y: y + 16, class: "funil-nome" });
      nome.textContent = e.nome;
      grupo.appendChild(nome);
      var num = svgEl("text", { x: xT, y: y + 40, class: "funil-num" });
      num.textContent = n(e.n);
      grupo.appendChild(num);
      if (i > 0) {
        var ant = etapas[i - 1].n;
        var perda = ant ? (ant - e.n) / ant : 0;
        var sub = svgEl("text", { x: xT, y: y + 57, class: "funil-sub" + (ehGargalo ? " gargalo" : "") });
        sub.textContent = (perda > 0 ? "▼ " + Math.round(perda * 100) + "% saíram" : "sem perda") + " · " + pct(e.n, ant, 0) + " seguiram";
        grupo.appendChild(sub);
      } else {
        var sub0 = svgEl("text", { x: xT, y: y + 57, class: "funil-sub" });
        sub0.textContent = "100% · ponto de partida";
        grupo.appendChild(sub0);
      }

      // área de toque da linha inteira
      var alvo = svgEl("rect", { x: 0, y: y, width: W, height: linhaH, fill: "transparent", class: "alvo", tabindex: 0 });
      var mostrar = function (ev) {
        var linhas = [
          { cor: c.cor, valor: n(e.n), nome: "pessoas" },
          { cor: "transparent", valor: pct(e.n, base), nome: "do total" },
        ];
        if (i > 0) {
          linhas.push({ cor: "transparent", valor: pct(e.n, etapas[i - 1].n), nome: "da etapa anterior" });
          linhas.push({ cor: "transparent", valor: n(etapas[i - 1].n - e.n), nome: "saíram antes desta etapa" });
        }
        dica(ev, e.nome, linhas);
      };
      alvo.addEventListener("pointermove", mostrar);
      alvo.addEventListener("pointerdown", mostrar);
      alvo.addEventListener("focus", mostrar);
      alvo.addEventListener("pointerleave", esconderDica);
      alvo.addEventListener("blur", esconderDica);
      svg.appendChild(alvo);
    });
    no.appendChild(svg);
  }

  function etapasPrincipais(d) {
    var k = d.kpi;
    var base = visitasDe(k);
    if (ehV2()) {
      return [
        { id: "visitas", nome: "Visitas na oferta", n: base },
        { id: "planos", nome: "Viram os planos", n: k.viram_planos },
        { id: "checkout", nome: "Clicaram em comprar", n: k.checkout },
      ];
    }
    return [
      { id: "visitas", nome: "Visitas", n: base },
      { id: "iniciaram", nome: "Começaram o quiz", n: k.iniciaram },
      { id: "concluiram", nome: "Concluíram o quiz", n: k.concluiram },
      { id: "oferta", nome: "Viram a fórmula", n: k.oferta },
      { id: "planos", nome: "Viram os planos", n: k.viram_planos },
      { id: "checkout", nome: "Clicaram em comprar", n: k.checkout },
    ];
  }

  function montarFunilVisual(d) {
    var etapas = etapasPrincipais(d);
    // maior queda até a fórmula (planos → checkout é decisão de compra)
    var g = null;
    // na v2 não há quiz: vale qualquer passagem
    var ate = ehV2() ? etapas.length - 1 : 3;
    for (var i = 1; i <= ate; i++) {
      var ant = etapas[i - 1].n;
      if (ant < 10) continue;
      var perda = (ant - etapas[i].n) / ant;
      if (!g || perda > g.perda) g = { i: i, perda: perda };
    }
    funilVisual($("[data-funil-visual]"), etapas, g);
  }

  /* ---------- Retenção ao longo do quiz ---------- */
  function retencao(no, lista, g) {
    limpar(no);
    // só as telas do quiz + a fórmula
    var ini = lista.findIndex(function (e) { return TELAS[0] && e.id === TELAS[0].id; });
    var fim = lista.findIndex(function (e) { return e.id === "oferta"; });
    if (ini < 0 || fim < 0) return;
    var pts = lista.slice(ini, fim + 1);
    var base = Math.max(1, pts[0].n);
    var W = no.clientWidth || 340, H = 200, mE = 34, mD = 10, mT = 12, mB = 24;
    var svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Retenção no quiz: de " + n(base) + " que começaram, " + pct(pts[pts.length - 1].n, base, 0) + " viram a fórmula" });
    var xDe = function (i) { return mE + (W - mE - mD) * i / Math.max(1, pts.length - 1); };
    var yDe = function (v) { return mT + (H - mT - mB) * (1 - v / 100); };
    [0, 50, 100].forEach(function (v) {
      svg.appendChild(svgEl("line", { class: "grade", x1: mE, x2: W - mD, y1: yDe(v), y2: yDe(v) }));
      var t = svgEl("text", { class: "eixo-texto", x: mE - 6, y: yDe(v) + 3, "text-anchor": "end" });
      t.textContent = v + "%";
      svg.appendChild(t);
    });
    var vals = pts.map(function (e) { return 100 * e.n / base; });
    var c = vals.map(function (v, i) { return [xDe(i), yDe(v)]; });
    var linha = "M" + c.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L");
    svg.appendChild(svgEl("path", { d: linha + "L" + c[c.length - 1][0] + " " + yDe(0) + "L" + c[0][0] + " " + yDe(0) + "Z", fill: degrade(svg, "#3987e5", 0.32), class: "surgir" }));
    svg.appendChild(svgEl("path", { d: linha, fill: "none", stroke: "#3987e5", "stroke-width": 2, "stroke-linejoin": "round", pathLength: 1, class: "desenhar", filter: brilho(svg, 3) }));
    var gId = g ? lista[g.i].id : null;
    pts.forEach(function (e, i) {
      var ehG = e.id === gId;
      svg.appendChild(svgEl("circle", { cx: c[i][0], cy: c[i][1], r: ehG ? 6 : 4, fill: ehG ? "#f0a830" : "#3987e5", stroke: "#161617", "stroke-width": 2, class: "surgir" + (ehG ? " ponto-vivo" : ""), style: "--atraso:" + (0.8 * i / pts.length) + "s", filter: ehG ? brilho(svg, 4) : null }));
      // rótulos do eixo: P1, P3… e as telas especiais
      var cod = e.id === "oferta" ? "Fórm." : (numeroPergunta[e.id] || "");
      var mostra = e.id === "oferta" || (cod && (Number(cod.slice(1)) % 2 === 1 || pts.length < 12));
      if (mostra) {
        var t = svgEl("text", { class: "eixo-texto", x: c[i][0], y: H - 6, "text-anchor": i === pts.length - 1 ? "end" : "middle" });
        t.textContent = cod;
        svg.appendChild(t);
      }
      var alvo = svgEl("rect", { x: c[i][0] - (W - mE - mD) / pts.length / 2, y: 0, width: (W - mE - mD) / pts.length, height: H, fill: "transparent", class: "alvo", tabindex: 0 });
      var mostrar = function (ev) {
        var linhas = [{ cor: "#3987e5", valor: pct(e.n, base, 0), nome: "ainda no quiz" }, { cor: "transparent", valor: n(e.n), nome: "pessoas" }];
        if (i > 0) linhas.push({ cor: "transparent", valor: n(pts[i - 1].n - e.n), nome: "saíram na tela anterior" });
        dica(ev, e.nome, linhas);
      };
      alvo.addEventListener("pointermove", mostrar);
      alvo.addEventListener("pointerdown", mostrar);
      alvo.addEventListener("focus", mostrar);
      alvo.addEventListener("pointerleave", esconderDica);
      alvo.addEventListener("blur", esconderDica);
      svg.appendChild(alvo);
    });
    // rótulo direto só no fim
    // abaixo do último ponto (a curva desce, então o espaço livre fica embaixo)
    var yFim = c[c.length - 1][1];
    var yTxt = yFim + 24 < yDe(0) - 4 ? yFim + 24 : yFim - 12;
    var tf = svgEl("text", { class: "graf-total", x: c[c.length - 1][0], y: yTxt, "text-anchor": "end" });
    tf.textContent = pct(pts[pts.length - 1].n, base, 0) + " chegaram à fórmula";
    svg.appendChild(tf);
    no.appendChild(svg);
  }

  /* ---------- Barra 100% (ex.: divisão entre os kits) ---------- */
  var CORES_CAT = ["#3987e5", "#d95926", "#199e70"];
  function barraPartes(no, partes) {
    var total = partes.reduce(function (a, p) { return a + p.n; }, 0);
    var wrap = el("div", "partes");
    var barra = el("div", "partes-barra");
    partes.forEach(function (p, i) {
      if (!p.n) return;
      var seg = el("div", "partes-seg");
      seg.style.flexGrow = p.n;
      seg.style.background = CORES_CAT[i % CORES_CAT.length];
      seg.style.setProperty("--i", i);
      seg.title = p.nome + ": " + n(p.n) + " (" + pct(p.n, total, 0) + ")";
      var r = el("span", "barra-rot", pct(p.n, total, 0));
      seg.appendChild(r);
      barra.appendChild(seg);
    });
    if (!total) barra.appendChild(el("div", "partes-vazio", "Sem cliques no período"));
    wrap.appendChild(barra);
    var leg = el("div", "legenda");
    partes.forEach(function (p, i) {
      var item = el("span");
      var cor = el("i");
      cor.style.background = CORES_CAT[i % CORES_CAT.length];
      item.appendChild(cor);
      item.appendChild(document.createTextNode(p.nome + " · " + n(p.n) + " (" + pct(p.n, total, 0) + ")"));
      leg.appendChild(item);
    });
    wrap.appendChild(leg);
    no.appendChild(wrap);
  }

  /* barras do funil */
  function desenharFunil(no, lista, base, g) {
    limpar(no);
    var linhas = el("div", "linhas");
    var topo = Math.max(1, base || (lista[0] && lista[0].n) || 1);
    lista.forEach(function (e, i) {
      var ant = i > 0 ? lista[i - 1].n : null;
      var row = el("div", "linha" + (e.marco ? " marco" : "") + (g && g.i === i ? " gargalo" : ""));
      var nome = el("div", "linha-nome");
      nome.appendChild(el("span", "num", String(i).padStart(2, "0")));
      var txt = el("span", "txt", e.nome);
      txt.title = e.nome;
      nome.appendChild(txt);
      row.appendChild(nome);
      var barra = el("div", "barra");
      var w = Math.max(0, Math.min(100, 100 * e.n / topo));
      rotuloBarra(barra, w, n(e.n));
      row.appendChild(barra);
      var p = el("div", "linha-pct");
      p.appendChild(el("b", null, pct(e.n, topo)));
      if (ant != null) p.appendChild(document.createTextNode(" · " + pct(e.n, ant, 0)));
      row.appendChild(p);
      linhas.appendChild(row);
    });
    no.appendChild(linhas);
  }

  /* ---------- Funil ---------- */
  function montarFunil(d) {
    var lista = etapasFunil(d);
    var g = gargalo(lista);
    mostrarAlerta($("[data-alerta-funil]"), lista, g);
    retencao($("[data-retencao]"), lista, g);
    desenharFunil($("[data-funil-completo]"), lista, Math.max(d.kpi.capa, d.kpi.quiz), g);

    // onde pararam
    var paradas = (d.paradas || []).slice().sort(function (a, b) { return b.n - a.n; });
    var totalParadas = paradas.reduce(function (s, x) { return s + x.n; }, 0);
    var no = limpar($("[data-paradas]"));
    if (!paradas.length) { no.appendChild(el("p", "vazio", "Sem dados no período.")); }
    else {
      desenharLista(no, paradas.map(function (p) {
        var t = TELAS.filter(function (x) { return x.id === p.etapa; })[0];
        return { nome: t ? ((t.pergunta ? numeroPergunta[t.id] + " · " : "") + t.nome) : p.etapa, n: p.n, extra: pct(p.n, totalParadas, 0) + " das saídas" };
      }));
    }

    // tempo por pergunta
    var tp = {};
    (d.tempoPergunta || []).forEach(function (x) { tp[x.etapa] = x; });
    var noT = limpar($("[data-tempo-pergunta]"));
    var itens = PERGUNTAS.filter(function (p) { return tp[p.id]; }).map(function (p) {
      return { nome: numeroPergunta[p.id] + " · " + (CURTOS[p.id] || p.titulo), n: tp[p.id].ms, rotulo: tempo(tp[p.id].ms), extra: n(tp[p.id].n) + " respostas" };
    });
    if (!itens.length) noT.appendChild(el("p", "vazio", "Sem dados no período."));
    else desenharLista(noT, itens);
  }

  /* Barra com o valor: fica dentro da parte cheia quando cabe; se não cabe,
     vai para logo depois dela (medido de verdade, depois de desenhar). */
  function rotuloBarra(barra, w, texto) {
    var cheia = el("div", "barra-cheia");
    barra.setAttribute("data-w", w);
    // a barra cresce do zero quando a tela é aberta
    if (estado.silencioso || SEM_MOVIMENTO) cheia.style.width = w + "%";
    else {
      cheia.style.width = "0%";
      requestAnimationFrame(function () { requestAnimationFrame(function () { cheia.style.width = w + "%"; }); });
    }
    var dentro = el("span", "barra-rot", texto);
    cheia.appendChild(dentro);
    barra.appendChild(cheia);
    var fora = el("span", "barra-valor-fora", texto);
    fora.style.left = "calc(" + w + "% + 8px)";
    fora.hidden = true;
    barra.appendChild(fora);
  }
  function ajustarRotulos() {
    $$(".barra").forEach(function (barra) {
      var cheia = barra.querySelector(".barra-cheia"), dentro = barra.querySelector(".barra-rot"), fora = barra.querySelector(".barra-valor-fora");
      if (!dentro || !cheia.offsetParent) return;
      // mede pelo tamanho final (a barra pode ainda estar crescendo)
      var cabe = barra.clientWidth * Number(barra.getAttribute("data-w") || 0) / 100 >= dentro.offsetWidth + 14;
      dentro.style.visibility = cabe ? "" : "hidden";
      fora.hidden = cabe;
    });
  }

  // lista genérica de barras (nome | barra | extra)
  function desenharLista(no, itens) {
    var max = Math.max.apply(null, itens.map(function (i) { return i.n; }).concat(1));
    var linhas = el("div", "linhas");
    itens.forEach(function (it) {
      var row = el("div", "linha");
      var nome = el("div", "linha-nome");
      var txt = el("span", "txt", it.nome);
      txt.title = it.nome;
      nome.appendChild(txt);
      row.appendChild(nome);
      var barra = el("div", "barra");
      var w = Math.max(0, 100 * it.n / max);
      rotuloBarra(barra, w, it.rotulo || n(it.n));
      row.appendChild(barra);
      row.appendChild(el("div", "linha-pct", it.extra || ""));
      linhas.appendChild(row);
    });
    no.appendChild(linhas);
  }

  /* ---------- Respostas ---------- */
  function montarRespostas(d) {
    var no = limpar($("[data-respostas]"));
    var porPergunta = {};
    (d.respostas || []).forEach(function (r) { (porPergunta[r.etapa] = porPergunta[r.etapa] || []).push(r); });

    PERGUNTAS.forEach(function (p) {
      var linhas = porPergunta[p.id] || [];
      var cont = {}, conv = {}, total = 0;
      linhas.forEach(function (r) {
        total += r.n;
        var partes = p.multipla ? String(r.valor).split("|") : [r.valor];
        partes.forEach(function (op) {
          cont[op] = (cont[op] || 0) + r.n;
          conv[op] = (conv[op] || 0) + (r.conv || 0);
        });
      });
      var ordem = (p.opcoes || []).map(function (o) { return typeof o === "string" ? o : o.texto; });
      Object.keys(cont).forEach(function (k) { if (ordem.indexOf(k) === -1) ordem.push(k); });

      var cartao = el("article", "cartao");
      var cab = el("div", "pergunta-cab");
      cab.appendChild(el("h3", null, p.titulo));
      cab.appendChild(el("span", "pergunta-meta", numeroPergunta[p.id] + " · " + (CURTOS[p.id] || "") + " · " + n(total) + " respostas" + (p.multipla ? " · várias escolhas" : "")));
      cartao.appendChild(cab);

      var hd = el("div", "resp-cab");
      ["Resposta", "%", "Conv."].forEach(function (h) { hd.appendChild(el("span", null, h)); });
      cartao.appendChild(hd);

      // resposta que mais converte (com pelo menos 5 pessoas)
      var melhor = null;
      ordem.forEach(function (op) {
        if ((cont[op] || 0) >= 5) {
          var taxa = conv[op] / cont[op];
          if (!melhor || taxa > melhor.taxa) melhor = { op: op, taxa: taxa };
        }
      });

      ordem.forEach(function (op) {
        var c = cont[op] || 0;
        var row = el("div", "resp");
        var txt = el("div", "resp-texto");
        txt.style.setProperty("--p", (total ? 100 * c / total : 0) + "%");
        txt.appendChild(el("span", null, op));
        row.appendChild(txt);
        row.appendChild(el("span", "resp-pct", pct(c, total, 0)));
        var cv = el("span", "resp-conv" + (melhor && melhor.op === op ? " melhor" : ""), c ? pct(conv[op] || 0, c) : "–");
        cv.title = n(conv[op] || 0) + " de " + n(c) + " foram ao checkout";
        row.appendChild(cv);
        cartao.appendChild(row);
      });
      no.appendChild(cartao);
    });
  }

  /* ---------- Oferta ---------- */
  function montarOferta(d) {
    var k = d.kpi;
    var kp = limpar($("[data-kpis-oferta]"));
    var rol = (d.rolagem || []).filter(function (x) { return x.pagina === "oferta" && x.r != null; });
    var mediaRol = rol.length ? rol.reduce(function (s, x) { return s + x.r; }, 0) / rol.length : null;
    kp.appendChild(cartaoKpi("Abriram a oferta", n(k.oferta), pct(k.concluiram ? Math.min(k.oferta, k.concluiram) : 0, k.concluiram, 0) + " de quem concluiu o quiz"));
    kp.appendChild(cartaoKpi("Viram os planos", pct(k.viram_planos, k.oferta, 0), n(k.viram_planos) + " pessoas chegaram nos preços"));
    kp.appendChild(cartaoKpi("Cliques no checkout", n(k.checkout), n(k.checkout_cliques) + " cliques no total", null, true));
    kp.appendChild(cartaoKpi("Tempo na oferta", tempo(mediana(d.tempoOferta)), "mediana por visita"));
    kp.appendChild(cartaoKpi("Rolagem média", mediaRol == null ? "–" : Math.round(mediaRol) + "%", "da altura da página"));
    kp.appendChild(cartaoKpi("Tocaram num kit", pct(k.escolheram_plano, k.viram_planos, 0), n(k.escolheram_plano) + " de quem viu os planos"));

    // kits
    var no = limpar($("[data-kits]"));
    barraPartes(no, ["1", "2", "3"].map(function (v) {
      var x = (d.checkoutPlano || []).filter(function (c) { return c.valor === v; })[0];
      return { nome: "Kit " + v, n: x ? x.n : 0 };
    }));
    var grade = el("div", "kits");
    var ck = {}, pl = {};
    (d.checkoutPlano || []).forEach(function (x) { ck[x.valor] = x; });
    (d.planos || []).forEach(function (x) { pl[x.valor] = x; });
    var totalCk = (d.checkoutPlano || []).reduce(function (s, x) { return s + x.n; }, 0);
    var lider = Object.keys(ck).sort(function (a, b) { return ck[b].n - ck[a].n; })[0];
    ["1", "2", "3"].forEach(function (v) {
      var c = ck[v] ? ck[v].n : 0;
      var cartao = el("div", "kit" + (v === lider ? " lider" : ""));
      var h = el("h3", null, KITS[v]);
      h.appendChild(el("small", null, KITS_SUB[v] + (v === "2" ? " · vem marcado" : "")));
      cartao.appendChild(h);
      var nums = el("div", "kit-numeros");
      var a = el("div"); a.appendChild(el("b", null, n(c))); a.appendChild(el("span", null, "foram ao checkout"));
      var b = el("div"); b.appendChild(el("b", null, pct(c, totalCk, 0))); b.appendChild(el("span", null, "dos checkouts"));
      nums.appendChild(a); nums.appendChild(b);
      cartao.appendChild(nums);
      var barra = el("div", "barra");
      var cheia = el("div", "barra-cheia");
      cheia.style.width = (totalCk ? 100 * c / totalCk : 0) + "%";
      barra.appendChild(cheia);
      cartao.appendChild(barra);
      var toques = pl[v] ? pl[v].n : 0;
      cartao.appendChild(el("p", "kpi-sub", n(toques) + (toques === 1 ? " pessoa tocou" : " pessoas tocaram") + " neste kit"));
      grade.appendChild(cartao);
    });
    no.appendChild(grade);

    // seções
    var sc = {};
    (d.secoes || []).forEach(function (x) { sc[x.etapa] = x.n; });
    var noS = limpar($("[data-secoes]"));
    if (!k.oferta) noS.appendChild(el("p", "vazio", "Sem visitas na oferta no período."));
    else desenharLista(noS, SECOES.map(function (s) {
      return { nome: s[1], n: sc[s[0]] || 0, rotulo: pct(sc[s[0]] || 0, k.oferta, 0), extra: n(sc[s[0]] || 0) + " pessoas" };
    }));

    // cliques
    var noC = limpar($("[data-cliques]"));
    var cl = (d.cliques || []).slice().sort(function (a, b) { return b.n - a.n; });
    if (!cl.length) noC.appendChild(el("p", "vazio", "Sem cliques no período."));
    else desenharLista(noC, cl.map(function (c) {
      return { nome: nomeClique(c), n: c.n, extra: n(c.cliques) + " cliques" };
    }));
  }

  /* ---------- Origem ---------- */
  function montarOrigem(d) {
    // gráficos de fonte e aparelho: visitas e conversão de cada um
    ["fonte", "aparelho"].forEach(function (campo) {
      var noG = limpar($('[data-origem-graf="' + campo + '"]'));
      var ls = ((d.origem && d.origem[campo]) || []).slice(0, 8);
      if (!ls.length) return;
      if (campo === "aparelho") {
        barraPartes(noG, ls.slice(0, 3).map(function (l) { return { nome: l.nome, n: l.visitas }; }));
      } else {
        desenharLista(noG, ls.map(function (l) {
          return { nome: l.nome, n: l.visitas, extra: pct(l.checkouts, l.visitas) + " converte" };
        }));
      }
      noG.appendChild(el("div", "espaco"));
    });

    ["fonte", "campanha", "aparelho", "sistema", "pais"].forEach(function (campo) {
      var no = limpar($('[data-origem="' + campo + '"]'));
      var linhas = (d.origem && d.origem[campo]) || [];
      if (!linhas.length) { no.appendChild(el("p", "vazio", "Sem dados no período.")); return; }
      var tab = el("table", "tabela");
      var cab = el("tr");
      ["Nome", "Visitas", "Quiz", "Fórmula", "Compra", "Conv."].forEach(function (h) { cab.appendChild(el("th", null, h)); });
      tab.appendChild(cab);
      linhas.forEach(function (l) {
        var tr = el("tr");
        [l.nome, n(l.visitas), pct(l.iniciaram, l.visitas, 0), pct(l.formulas, l.visitas, 0), n(l.checkouts), pct(l.checkouts, l.visitas)].forEach(function (v) {
          tr.appendChild(el("td", null, v));
        });
        tab.appendChild(tr);
      });
      var rolar = el("div", "tabela-rolar");
      rolar.appendChild(tab);
      no.appendChild(rolar);
    });

    // mapa de horários
    var noH = limpar($("[data-horarios]"));
    var mapa = {}, max = 1;
    (d.porHora || []).forEach(function (x) { mapa[x.semana + "-" + x.hora] = x.n; max = Math.max(max, x.n); });
    var rolar = el("div", "tabela-rolar");
    var grade = el("div", "mapa");
    grade.appendChild(el("span"));
    for (var h = 0; h < 24; h++) grade.appendChild(el("span", null, h % 3 === 0 ? String(h) : ""));
    var DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    [1, 2, 3, 4, 5, 6, 0].forEach(function (s) {
      grade.appendChild(el("span", "dia", DIAS[s]));
      for (var h2 = 0; h2 < 24; h2++) {
        var v = mapa[s + "-" + h2] || 0;
        var cel = el("i");
        if (v) cel.style.background = "rgba(57, 135, 229, " + (0.15 + 0.85 * v / max).toFixed(2) + ")";
        cel.title = DIAS[s] + " " + h2 + "h: " + n(v) + " visitas";
        grade.appendChild(cel);
      }
    });
    rolar.appendChild(grade);
    noH.appendChild(rolar);

    // erros
    var noE = limpar($("[data-erros]"));
    if (!(d.erros || []).length) noE.appendChild(el("p", "vazio", "Nenhum erro registrado no período."));
    else desenharLista(noE, d.erros.map(function (e) { return { nome: e.valor, n: e.n, extra: n(e.n) + "×" }; }));
  }

  // redesenha os gráficos que dependem da largura da tela
  function redesenhar(silencioso) {
    var d = estado.dados;
    if (!d) return;
    estado.silencioso = !!silencioso;
    conteudo.classList.toggle("estatico", !!silencioso);
    if (estado.aba === "geral") montarGeral(d);
    if (estado.aba === "funil") { var l = etapasFunil(d); retencao($("[data-retencao]"), l, gargalo(l)); }
    requestAnimationFrame(ajustarRotulos);
    estado.silencioso = false;
  }

  /* ================= relatório da IA (pontos de melhoria) =================
     Sempre mostra na hora a análise automática (feita aqui, sem custo).
     Se a chave do Claude estiver na Vercel, pede o relatório ao Claude e
     troca quando ele chegar. */
  var ia = { claude: {}, pedindo: {}, fechouPrimeiro: false };
  var MOTIVOS = {
    limite: "o limite diário de análises foi atingido", chave: "a chave do Claude na Vercel parece inválida",
    ocupado: "o Claude está ocupado agora", recusa: "o Claude não conseguiu analisar este resumo", "sem-ia": "a chave do Claude não está configurada",
  };

  function chaveIA() {
    var r = intervalo();
    return JSON.stringify({ de: isoDia(r.de), ate: isoDia(new Date(r.ate.getTime() - 1)), filtros: estado.filtros, versao: estado.versao });
  }

  function auxAnalise(d) {
    var r = intervalo();
    return {
      visitas: visitasDe, comparar: estado.periodo !== "tudo", versao: estado.versao,
      periodo: { de: isoDia(r.de), ate: isoDia(new Date(r.ate.getTime() - 1)), dias: Math.round((r.ate - r.de) / 864e5), filtros: estado.filtros },
      etapasFunil: etapasFunil(d), telas: TELAS, perguntas: PERGUNTAS, numeroPergunta: numeroPergunta,
      curtos: CURTOS, secoes: SECOES, nomeClique: nomeClique,
    };
  }

  function montarIA(d) {
    if (!window.PainelAnalise) return;
    var resumo = window.PainelAnalise.resumir(d, auxAnalise(d));
    estado.resumoIA = resumo;
    var chave = chaveIA();
    var c = ia.claude[chave];
    if (c && c.relatorio) desenharIA(c.relatorio, { fonte: "claude", criado: c.criado });
    else desenharIA(window.PainelAnalise.analisar(resumo), { fonte: "local", erro: c && c.erro });
    // o Claude só é chamado quando a pessoa toca em "Gerar com o Claude" (para não gastar à toa)
  }

  function pedirClaude(forcar) {
    var chave = chaveIA();
    ia.pedindo[chave] = true;
    $("[data-ia-carregando]").hidden = false;
    var botao = $("[data-ia-gerar]");
    if (botao) botao.disabled = true;
    var fim = function (resultado) {
      ia.pedindo[chave] = false;
      ia.claude[chave] = resultado;
      $("[data-ia-carregando]").hidden = true;
      if (chave === chaveIA() && estado.dados) montarIA(estado.dados);
    };
    fetch("/api/analise", {
      method: "POST",
      headers: { authorization: "Bearer " + estado.senha, "content-type": "application/json" },
      body: JSON.stringify({ contexto: JSON.parse(chave), resumo: estado.resumoIA, forcar: !!forcar }),
    })
      .then(function (resp) { return resp.json().catch(function () { return {}; }).then(function (b) { return { ok: resp.ok, b: b }; }); })
      .then(function (x) {
        if (x.ok && x.b.relatorio) fim({ relatorio: x.b.relatorio, criado: x.b.criado });
        else fim({ erro: MOTIVOS[x.b.erro] || "houve uma falha ao falar com o Claude" });
      })
      .catch(function () { fim({ erro: "houve uma falha de conexão" }); });
  }

  function haQuanto(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "agora";
    if (m < 60) return "há " + m + " min";
    var h = Math.round(m / 60);
    return "há " + h + " h";
  }

  var ICONE_GARGALO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/></svg>';
  var ICONE_IMPACTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l6-6 4 4 6-7"/><path d="M15 7h5v5"/></svg>';
  var ICONE_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>';
  var PRIORIDADE = { alta: "Alta prioridade", media: "Média prioridade", baixa: "Baixa prioridade" };

  function anelNota(no, nota) {
    limpar(no);
    var R = 40, C = 2 * Math.PI * R;
    var est = nota == null ? { cor: "#7c7d81", rot: "Sem dados" }
      : nota >= 80 ? { cor: "#2fbf7a", rot: "Saudável" }
      : nota >= 60 ? { cor: "#f0a830", rot: "Pode melhorar" }
      : { cor: "#e5534b", rot: "Precisa de atenção" };
    var svg = svgEl("svg", { viewBox: "0 0 92 92", "aria-hidden": "true" });
    svg.appendChild(svgEl("circle", { cx: 46, cy: 46, r: R, class: "anel-fundo" }));
    var anel = svgEl("circle", { cx: 46, cy: 46, r: R, class: "anel", stroke: est.cor, "stroke-dasharray": C.toFixed(1), "stroke-dashoffset": C.toFixed(1), filter: brilho(svg, 3) });
    svg.appendChild(anel);
    no.appendChild(svg);
    var alvo = (C * (1 - (nota || 0) / 100)).toFixed(1);
    if (estado.silencioso || SEM_MOVIMENTO) anel.setAttribute("stroke-dashoffset", alvo);
    else requestAnimationFrame(function () { requestAnimationFrame(function () { anel.setAttribute("stroke-dashoffset", alvo); }); });
    var num = el("span", "ia-nota-num", nota == null ? "–" : String(nota));
    if (nota != null) contar(num, nota, function (v) { return String(Math.round(v)); });
    no.appendChild(num);
    var rot = el("span", "ia-nota-rot");
    rot.appendChild(el("b", null, est.rot));
    rot.appendChild(document.createTextNode("saúde do funil"));
    no.appendChild(rot);
    no.setAttribute("aria-label", "Saúde do funil: " + (nota == null ? "sem dados" : nota + " de 100, " + est.rot));
    no.setAttribute("role", "img");
  }

  function desenharIA(rel, meta) {
    var claude = meta.fonte === "claude";
    $("[data-ia-fonte]").textContent = claude ? "Escrita pelo Claude · " + haQuanto(meta.criado) : "Automática · sem custo";
    anelNota($("[data-ia-nota]"), rel.nota);
    $("[data-ia-titulo]").textContent = rel.titulo || "";
    $("[data-ia-resumo]").textContent = rel.resumo || "";

    var g = $("[data-ia-gargalo]");
    limpar(g);
    g.hidden = !(rel.gargalo && rel.gargalo.etapa);
    if (!g.hidden) {
      g.insertAdjacentHTML("afterbegin", ICONE_GARGALO);
      var gp = el("p");
      gp.appendChild(el("strong", null, "Maior gargalo"));
      gp.appendChild(el("b", null, rel.gargalo.etapa + ". "));
      gp.appendChild(document.createTextNode(rel.gargalo.explicacao || ""));
      g.appendChild(gp);
    }

    var corpo = limpar($("[data-ia-corpo]"));
    var pontos = rel.pontos || [];
    if (pontos.length) {
      corpo.appendChild(el("h3", "ia-secao", "Pontos de melhoria · toque para ver o que fazer"));
      var ol = el("ol", "ia-pontos");
      pontos.forEach(function (pt, i) {
        var li = el("li");
        var det = el("details", "ia-ponto p-" + (PRIORIDADE[pt.prioridade] ? pt.prioridade : "media"));
        det.style.setProperty("--i", i);
        if (i === 0 && !ia.fechouPrimeiro) det.open = true;
        if (i === 0) det.addEventListener("toggle", function () { if (!det.open) ia.fechouPrimeiro = true; });
        var sum = el("summary");
        var tags = el("div", "ia-ponto-tags");
        tags.appendChild(el("span", "ia-tag prio", PRIORIDADE[pt.prioridade] || "Média prioridade"));
        if (pt.area) tags.appendChild(el("span", "ia-tag", pt.area));
        sum.appendChild(tags);
        sum.appendChild(el("h3", null, pt.titulo));
        if (pt.impacto) {
          var im = el("div", "ia-impacto");
          im.innerHTML = ICONE_IMPACTO;
          im.appendChild(el("span", null, pt.impacto));
          sum.appendChild(im);
        }
        det.appendChild(sum);
        var cp = el("div", "ia-ponto-corpo");
        if (pt.detalhe) cp.appendChild(el("p", null, pt.detalhe));
        if (pt.acao) {
          var ac = el("div", "ia-acao");
          ac.appendChild(el("span", null, "O que fazer"));
          ac.appendChild(el("p", null, pt.acao));
          cp.appendChild(ac);
        }
        det.appendChild(cp);
        li.appendChild(det);
        ol.appendChild(li);
      });
      corpo.appendChild(ol);
    }
    if ((rel.positivos || []).length) {
      corpo.appendChild(el("h3", "ia-secao", "O que está funcionando"));
      var ul = el("ul", "ia-positivos");
      rel.positivos.forEach(function (t) {
        var li = el("li");
        li.innerHTML = ICONE_OK;
        li.appendChild(el("span", null, t));
        ul.appendChild(li);
      });
      corpo.appendChild(ul);
    }

    var rod = limpar($("[data-ia-rodape]"));
    var d = estado.dados || {};
    var txt;
    if (estado.demo) txt = "Modo demonstração: análise automática feita sobre números fictícios.";
    else if (claude) txt = "O Claude leu só os números agregados deste período (nenhum dado pessoal) e escreveu este relatório.";
    else if (d.ia) txt = meta.erro ? "Não deu para falar com o Claude agora (" + meta.erro + "). Esta é a análise automática do painel." : "Esta é a análise automática do painel (sem custo). Toque em “Gerar com o Claude” para um relatório escrito pelo Claude (usa a API, custo por uso).";
    else txt = "Análise automática, feita pelo próprio painel com regras de conversão, sem custo. Para o relatório escrito pelo Claude, adicione a chave ANTHROPIC_API_KEY na Vercel.";
    rod.appendChild(el("p", null, txt));
    // atalho para conversar sobre o relatório com o Estrategista (chat)
    {
      var conversar = el("button", "botao-conversar");
      conversar.type = "button";
      conversar.innerHTML = '<span class="agente-orb" aria-hidden="true"></span>';
      conversar.appendChild(document.createTextNode("Conversar sobre isso"));
      conversar.addEventListener("click", function () {
        if (window.abrirEstrategista) window.abrirEstrategista("Explique o relatório deste período: qual é o maior gargalo e o que eu faço primeiro?");
      });
      rod.appendChild(conversar);
    }
    if (d.ia && !estado.demo) {
      var b = el("button", "botao-claro", claude ? "Atualizar análise" : "Gerar com o Claude");
      b.type = "button";
      b.setAttribute("data-ia-gerar", "");
      b.disabled = !!ia.pedindo[chaveIA()];
      b.addEventListener("click", function () { pedirClaude(claude); });
      rod.appendChild(b);
    }
  }

  /* ================= dica (tooltip) ================= */
  var dicaEl = $("[data-dica]");
  function dica(ev, titulo, linhas) {
    limpar(dicaEl);
    dicaEl.appendChild(el("p", "dica-titulo", titulo));
    linhas.forEach(function (l) {
      var row = el("div", "dica-linha");
      var i = el("i");
      i.style.background = l.cor;
      row.appendChild(i);
      row.appendChild(el("b", null, l.valor));
      row.appendChild(el("span", null, l.nome));
      dicaEl.appendChild(row);
    });
    dicaEl.hidden = false;
    var r = ev.target.getBoundingClientRect();
    var x = ev.clientX || (r.left + r.width / 2), y = ev.clientY || r.top;
    var w = dicaEl.offsetWidth, hgt = dicaEl.offsetHeight;
    dicaEl.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + "px";
    dicaEl.style.top = Math.max(8, y - hgt - 14) + "px";
  }
  function esconderDica() { dicaEl.hidden = true; }

  /* ================= modo demonstração ================= */
  // demonstração da v2: só a oferta (sem quiz), com os mesmos números da oferta
  function gerarDemo(r) {
    var d = gerarDemoBase(r);
    if (!ehV2()) return d;
    var V = d.kpi.entrada, F = d.kpi.oferta;
    d.kpi.entrada = F; d.kpiAnt.entrada = d.kpiAnt.oferta;
    ["capa", "cta_capa", "quiz", "iniciaram", "concluiram"].forEach(function (c) { d.kpi[c] = 0; d.kpiAnt[c] = 0; });
    d.diario.forEach(function (x) { x.visitas = x.formulas; x.iniciaram = 0; });
    d.etapas = []; d.paradas = []; d.respostas = []; d.tempoPergunta = []; d.duracoes = [];
    d.cliques = d.cliques.filter(function (c) { return c.pagina === "oferta"; });
    Object.keys(d.origem).forEach(function (campo) {
      d.origem[campo].forEach(function (l) { l.visitas = Math.round(l.visitas * F / V); l.iniciaram = 0; l.formulas = l.visitas; });
    });
    d.novos = d.novos.map(function (x) { return { novo: x.novo, n: Math.round(x.n * F / V) }; });
    return d;
  }

  function gerarDemoBase(r) {
    var semente = 7;
    var rnd = function () { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
    var dias = [];
    var inicio = estado.periodo === "tudo" ? new Date(r.ate.getTime() - 45 * 864e5) : new Date(r.de);
    for (var t = new Date(inicio); t < r.ate; t.setDate(t.getDate() + 1)) dias.push(isoDia(t));
    var diario = dias.map(function (dia, i) {
      var v = Math.round(30 + i * 1.8 + rnd() * 40);
      var ini = Math.round(v * (0.7 + rnd() * 0.08));
      var f = Math.round(ini * (0.42 + rnd() * 0.1));
      return { dia: dia, visitas: v, iniciaram: ini, formulas: f, checkouts: Math.round(f * (0.25 + rnd() * 0.1)) };
    });
    var soma = function (k) { return diario.reduce(function (s, x) { return s + x[k]; }, 0); };
    var V = soma("visitas"), I = soma("iniciaram"), F = soma("formulas"), C = soma("checkouts");
    var cta = Math.round(I * 1.07), capa = V;
    var etapas = [], restante = I, paradas = [];
    TELAS.forEach(function (tela, i) {
      if (i > 0) {
        var perda = tela.id === "sinais" ? 0.12 : tela.pergunta ? 0.02 + rnd() * 0.04 : 0.01;
        var antes = restante;
        restante = Math.round(restante * (1 - perda));
        paradas.push({ etapa: TELAS[i - 1].id, n: antes - restante });
      }
      etapas.push({ etapa: tela.id, n: i === 0 ? Math.round(cta * 0.97) : restante });
    });
    var respostas = [];
    PERGUNTAS.forEach(function (p) {
      var ops = (p.opcoes || []).map(function (o) { return typeof o === "string" ? o : o.texto; });
      var total = (etapas.filter(function (e) { return e.etapa === p.id; })[0] || { n: 0 }).n;
      if (p.multipla) {
        var combos = [[0], [0, 1], [1], [2, 3], [5], [0, 4], [3], [1, 5]];
        combos.forEach(function (c) {
          var nn = Math.round(total * (0.06 + rnd() * 0.12));
          respostas.push({ etapa: p.id, valor: c.map(function (i) { return ops[i]; }).join("|"), n: nn, conv: Math.round(nn * (0.08 + rnd() * 0.18)) });
        });
      } else {
        var pesos = ops.map(function () { return 0.5 + rnd(); });
        var sp = pesos.reduce(function (s, x) { return s + x; }, 0);
        ops.forEach(function (op, i) {
          var nn = Math.round(total * pesos[i] / sp);
          respostas.push({ etapa: p.id, valor: op, n: nn, conv: Math.round(nn * (0.06 + rnd() * 0.16)) });
        });
      }
    });
    var origemDe = function (nomes, pesos) {
      return nomes.map(function (nome, i) {
        var v = Math.round(V * pesos[i]);
        var f = Math.round(v * (0.25 + rnd() * 0.15));
        return { nome: nome, visitas: v, iniciaram: Math.round(v * 0.72), formulas: f, checkouts: Math.round(f * (0.2 + rnd() * 0.15)) };
      });
    };
    var porHora = [];
    for (var s = 0; s < 7; s++) for (var h = 0; h < 24; h++) {
      var pico = Math.exp(-Math.pow((h - 21) / 3.2, 2)) + 0.5 * Math.exp(-Math.pow((h - 12.5) / 2, 2));
      porHora.push({ semana: s, hora: h, n: Math.round(V / 120 * pico * (0.7 + rnd() * 0.6)) });
    }
    // cliques em comprar por hora (demonstração): segue as visitas, com pico à noite
    var compraPorHora = [];
    for (var hh = 0; hh < 24; hh++) {
      var vh = porHora.filter(function (x) { return x.hora === hh; }).reduce(function (a, x) { return a + x.n; }, 0);
      compraPorHora.push({ hora: hh, n: Math.round(vh * (C / V) * (0.75 + rnd() * 0.5) * (hh >= 20 && hh <= 22 ? 1.4 : 1)) });
    }
    var amostra = function (q, centro, var_) { var l = []; for (var i = 0; i < Math.min(q, 400); i++) l.push(Math.round(centro * (1 + (rnd() - 0.5) * var_))); return l; };
    var kpi = {
      entrada: V, sessoes: Math.round(V * 1.04), visitantes: Math.round(V * 0.86), capa: capa, cta_capa: cta, quiz: Math.round(cta * 0.99), iniciaram: I,
      concluiram: Math.round(F * 1.04), oferta: F, viram_planos: Math.round(F * 0.81), escolheram_plano: Math.round(F * 0.18),
      checkout: C, checkout_cliques: Math.round(C * 1.3),
    };
    var kpiAnt = {};
    for (var key in kpi) kpiAnt[key] = Math.round(kpi[key] * (0.72 + rnd() * 0.12));
    return {
      demo: true, kpi: kpi, kpiAnt: kpiAnt, diario: diario, etapas: etapas, paradas: paradas, respostas: respostas,
      tempoPergunta: PERGUNTAS.map(function (p) { return { etapa: p.id, ms: 3500 + rnd() * 9000 + (p.tipo === "B" ? 4000 : 0), n: Math.round(I * 0.7) }; }),
      planos: [{ valor: "1", n: Math.round(F * 0.07) }, { valor: "2", n: Math.round(F * 0.05) }, { valor: "3", n: Math.round(F * 0.09) }],
      checkoutPlano: [{ valor: "1", n: Math.round(C * 0.24) }, { valor: "2", n: Math.round(C * 0.52) }, { valor: "3", n: Math.round(C * 0.24) }],
      secoes: SECOES.map(function (sx, i) { return { etapa: sx[0], n: Math.round(F * Math.max(0.12, 0.98 - i * 0.04 - rnd() * 0.02)) }; }),
      cliques: [
        { pagina: "capa", etapa: "cta-capa", valor: null, n: cta, cliques: Math.round(cta * 1.05) },
        { pagina: "oferta", etapa: "barra-compra", valor: null, n: Math.round(F * 0.12), cliques: Math.round(F * 0.15) },
        { pagina: "oferta", etapa: "quero-minha-formula", valor: null, n: Math.round(F * 0.09), cliques: Math.round(F * 0.1) },
        { pagina: "oferta", etapa: "ver-mais-ativos", valor: null, n: Math.round(F * 0.14), cliques: Math.round(F * 0.16) },
        { pagina: "oferta", etapa: "faq", valor: "2", n: Math.round(F * 0.1), cliques: Math.round(F * 0.11) },
        { pagina: "oferta", etapa: "faq", valor: "4", n: Math.round(F * 0.06), cliques: Math.round(F * 0.06) },
        { pagina: "oferta", etapa: "video", valor: "1", n: Math.round(F * 0.08), cliques: Math.round(F * 0.09) },
        { pagina: "oferta", etapa: "galeria", valor: "2", n: Math.round(F * 0.07), cliques: Math.round(F * 0.08) },
        { pagina: "oferta", etapa: "whatsapp", valor: "rodape-atendente", n: Math.round(F * 0.02), cliques: Math.round(F * 0.02) },
      ],
      origem: {
        fonte: origemDe(["facebook", "instagram", "tiktok", "direto", "google"], [0.38, 0.27, 0.18, 0.11, 0.06]),
        campanha: origemDe(["anti-idade-30", "quiz-formula", "remarketing"], [0.4, 0.35, 0.15]),
        aparelho: origemDe(["celular", "computador", "tablet"], [0.9, 0.08, 0.02]),
        sistema: origemDe(["iOS", "Android", "Windows"], [0.55, 0.37, 0.08]),
        pais: origemDe(["BR", "PT", "US"], [0.96, 0.03, 0.01]),
      },
      porHora: porHora, compraPorHora: compraPorHora, duracoes: amostra(F, 169000, 0.6), tempoOferta: amostra(F, 96000, 1.2),
      rolagem: amostra(F, 58, 1).map(function (r2) { return { pagina: "oferta", r: Math.min(100, r2) }; }),
      opcoes: [{ campo: "fonte", v: "facebook" }, { campo: "fonte", v: "instagram" }, { campo: "fonte", v: "tiktok" }, { campo: "aparelho", v: "celular" }, { campo: "aparelho", v: "computador" }, { campo: "campanha", v: "anti-idade-30" }],
      leads: { periodo: Math.round(C * 0.62), total: Math.round(C * 0.62) + 37, ultimos: [],
        porKit: [{ kit: "1", n: Math.round(C * 0.15) }, { kit: "2", n: Math.round(C * 0.33) }, { kit: "3", n: Math.round(C * 0.14) }] },
      aoVivo: 4, erros: [], novos: [{ novo: 1, n: Math.round(V * 0.82) }, { novo: 0, n: Math.round(V * 0.18) }],
    };
  }

  /* ================= exportar ================= */
  function exportar() {
    var r = intervalo();
    if (estado.demo) {
      var lista = etapasFunil(estado.dados);
      var linhas = ["etapa,pessoas"].concat(lista.map(function (e) { return '"' + e.nome.replace(/"/g, '""') + '",' + e.n; }));
      baixar(new Blob(["﻿" + linhas.join("\n")], { type: "text/csv" }), "cellive-funil-demo.csv");
      return;
    }
    var q = new URLSearchParams({ de: r.de.getTime(), ate: r.ate.getTime(), versao: estado.versao });
    for (var k in estado.filtros) if (estado.filtros[k]) q.set(k, estado.filtros[k]);
    fetch("/api/painel?formato=csv&" + q.toString(), { headers: { authorization: "Bearer " + estado.senha } })
      .then(function (resp) { if (!resp.ok) throw new Error(); return resp.blob(); })
      .then(function (blob) { baixar(blob, "cellive-eventos-" + isoDia(r.de) + ".csv"); })
      .catch(function () { status("Erro ao exportar", "demo"); });
  }
  function baixar(blob, nome) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ================= eventos da interface ================= */
  $("[data-entrar-form]").addEventListener("submit", function (ev) {
    ev.preventDefault();
    estado.senha = $("#senha").value;
    estado.demo = false;
    try { sessionStorage.setItem("cl-painel-senha", estado.senha); } catch (e) { /* ok */ }
    carregar();
  });
  $("[data-ver-demo]").addEventListener("click", function () {
    estado.demo = true;
    $("[data-entrar]").hidden = true;
    $("[data-painel]").hidden = false;
    carregar();
  });
  $("[data-atualizar]").addEventListener("click", function () { carregar(false); });

  // funil com quiz (v1) ou oferta direta (v2)
  function aplicarVersao() {
    $$("[data-versao]").forEach(function (b) { b.classList.toggle("is-ativo", b.getAttribute("data-versao") === estado.versao); });
    ["funil", "respostas"].forEach(function (aba) {
      var b = $('[data-aba="' + aba + '"]');
      b.hidden = ehV2();
      if (ehV2() && estado.aba === aba) $('[data-aba="geral"]').click();
    });
  }
  $$("[data-versao]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (estado.versao === b.getAttribute("data-versao")) return;
      estado.versao = b.getAttribute("data-versao");
      aplicarVersao();
      carregar(false);
    });
  });

  // filtros extras (datas, fonte, campanha, aparelho) ficam recolhidos
  $("[data-filtros-abrir]").addEventListener("click", function () {
    var mais = $("[data-filtros-mais]");
    mais.hidden = !mais.hidden;
    this.setAttribute("aria-expanded", String(!mais.hidden));
  });
  function contarFiltros() {
    var q = Object.keys(estado.filtros).filter(function (k) { return estado.filtros[k]; }).length + (estado.de && estado.ate ? 1 : 0);
    var b = $("[data-filtros-qtd]");
    b.hidden = !q;
    b.textContent = q;
  }
  $("[data-exportar]").addEventListener("click", exportar);
  $("[data-leads-baixar]").addEventListener("click", baixarLeads);
  $("[data-sair]").addEventListener("click", function () {
    try { sessionStorage.removeItem("cl-painel-senha"); } catch (e) { /* ok */ }
    estado.senha = null;
    estado.demo = false;
    mostrarEntrada();
  });

  $$("[data-periodo]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-periodo]").forEach(function (x) { x.classList.toggle("is-ativo", x === b); });
      estado.periodo = b.getAttribute("data-periodo");
      estado.de = estado.ate = null;
      $("[data-de]").value = $("[data-ate]").value = "";
      carregar();
    });
  });
  ["[data-de]", "[data-ate]"].forEach(function (s) {
    $(s).addEventListener("change", function () {
      var de = $("[data-de]").value, ate = $("[data-ate]").value;
      if (de && ate) {
        estado.de = de; estado.ate = ate;
        $$("[data-periodo]").forEach(function (x) { x.classList.remove("is-ativo"); });
        carregar();
      }
    });
  });
  $$("[data-filtro]").forEach(function (sel) {
    sel.addEventListener("change", function () {
      estado.filtros[sel.getAttribute("data-filtro")] = sel.value;
      carregar();
    });
  });
  $$("[data-aba]").forEach(function (b) {
    b.addEventListener("click", function () {
      estado.aba = b.getAttribute("data-aba");
      $$("[data-aba]").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
      $$("[data-painel-aba]").forEach(function (p) { p.hidden = p.getAttribute("data-painel-aba") !== estado.aba; });
      redesenhar(false);
    });
  });
  var redimensionar = 0;
  window.addEventListener("resize", function () {
    clearTimeout(redimensionar);
    redimensionar = setTimeout(function () { redesenhar(true); }, 200);
  });

  // atualiza sozinho a cada 60 s (só com dados reais)
  setInterval(function () { if (!estado.demo && estado.senha && !document.hidden && !$("[data-painel]").hidden) carregar(true); }, 60000);

  /* ================= início ================= */
  if (/[?&]demo=1/.test(location.search)) {
    estado.demo = true;
    $("[data-painel]").hidden = false;
    carregar();
  } else if (estado.senha) {
    carregar();
  } else {
    mostrarEntrada();
  }
})();
