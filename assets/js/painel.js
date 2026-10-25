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
    for (var k in attrs) e.setAttribute(k, attrs[k]);
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
  var FAQ = { "1": "O que é o Sérum?", "2": "Como usar?", "3": "O que é a ação SRRP?", "4": "Posso usar todos os dias?", "5": "Em que horário usar?" };
  var JORNADA = { "0": "Semana 1–2", "1": "Semana 3–4", "2": "Semana 5–12", "3": "+12 semanas" };
  function nomeClique(c) {
    var v = c.valor;
    switch (c.etapa) {
      case "cta-capa": return "Capa · botão “Quero melhorar minha pele”";
      case "politica": return "Capa · Política de Privacidade";
      case "barra-compra": return "Barra fixa “Comprar”";
      case "quero-minha-formula": return "Botão “Quero minha fórmula”";
      case "ver-mais-ativos": return "Ver os outros ativos";
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
    filtros: { fonte: "", campanha: "", aparelho: "" }, aba: "geral", dados: null,
  };
  try { estado.senha = sessionStorage.getItem("cl-painel-senha"); } catch (e) { /* sem armazenamento */ }

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

  function carregar() {
    var r = intervalo();
    conteudo.classList.add("is-carregando");
    if (estado.demo) {
      estado.dados = gerarDemo(r);
      montar();
      status("Modo demonstração", "demo");
      conteudo.classList.remove("is-carregando");
      return;
    }
    var q = new URLSearchParams({ de: r.de.getTime(), ate: r.ate.getTime() });
    for (var k in estado.filtros) if (estado.filtros[k]) q.set(k, estado.filtros[k]);
    fetch("/api/painel?" + q.toString(), { headers: { authorization: "Bearer " + estado.senha } })
      .then(function (resp) {
        return resp.json().catch(function () { return {}; }).then(function (corpo) { return { resp: resp, corpo: corpo }; });
      })
      .then(function (x) {
        conteudo.classList.remove("is-carregando");
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
        status(x.corpo.aoVivo ? x.corpo.aoVivo + " pessoa" + (x.corpo.aoVivo > 1 ? "s" : "") + " agora" : "Ao vivo", "ao-vivo");
      })
      .catch(function () {
        conteudo.classList.remove("is-carregando");
        mostrarEntrada("Não foi possível conectar ao servidor do painel.");
      });
  }

  /* ================= montagem das abas ================= */
  function montar() {
    var d = estado.dados;
    preencherFiltros(d.opcoes || []);
    montarGeral(d);
    montarFunil(d);
    montarRespostas(d);
    montarOferta(d);
    montarOrigem(d);
    requestAnimationFrame(ajustarRotulos);
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

  function cartaoKpi(rotulo, valor, sub, dlt, destaque) {
    var c = el("article", "kpi" + (destaque ? " destaque" : ""));
    c.appendChild(el("p", "kpi-rotulo", rotulo));
    var v = el("div", "kpi-valor", valor);
    if (dlt != null) {
      var s = el("span", "kpi-delta " + (dlt >= 0 ? "sobe" : "desce"), (dlt >= 0 ? "▲ " : "▼ ") + Math.abs(Math.round(dlt)) + "%");
      s.title = "Comparado ao período anterior de mesmo tamanho";
      v.appendChild(s);
    }
    c.appendChild(v);
    if (sub) c.appendChild(el("p", "kpi-sub", sub));
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

  /* ---------- Visão geral ---------- */
  function montarGeral(d) {
    var k = d.kpi, a = d.kpiAnt || {};
    var base = Math.max(k.capa, k.quiz) || k.sessoes;
    var baseAnt = Math.max(a.capa || 0, a.quiz || 0) || a.sessoes;
    var kpis = limpar($("[data-kpis]"));
    var novos = 0, total = 0;
    (d.novos || []).forEach(function (x) { total += x.n; if (x.novo) novos += x.n; });

    kpis.appendChild(cartaoKpi("Visitas", n(base), n(k.visitantes) + " visitantes únicos · " + pct(novos, total, 0) + " novos", delta(base, baseAnt)));
    kpis.appendChild(cartaoKpi("Iniciaram", pct(k.iniciaram, base), n(k.iniciaram) + " responderam a 1ª pergunta", delta(k.iniciaram, a.iniciaram)));
    kpis.appendChild(cartaoKpi("Concluíram o quiz", n(k.concluiram), pct(k.concluiram, k.iniciaram) + " de quem iniciou", delta(k.concluiram, a.concluiram)));
    kpis.appendChild(cartaoKpi("Viram a fórmula", n(k.oferta), pct(k.oferta, base) + " das visitas", delta(k.oferta, a.oferta)));
    kpis.appendChild(cartaoKpi("Cliques no checkout", n(k.checkout), pct(k.checkout, k.oferta) + " de quem viu a fórmula", delta(k.checkout, a.checkout), true));
    kpis.appendChild(cartaoKpi("Conversão total", pct(k.checkout, base, 2), "visita → checkout", delta(base ? k.checkout / base : 0, baseAnt ? a.checkout / baseAnt : 0)));
    kpis.appendChild(cartaoKpi("Tempo até a fórmula", tempo(mediana(d.duracoes)), "mediana de quem concluiu o quiz"));
    var kits = (d.checkoutPlano || []).slice().sort(function (x, y) { return y.n - x.n; });
    var totalKits = kits.reduce(function (s, x) { return s + x.n; }, 0);
    kpis.appendChild(cartaoKpi("Kit mais escolhido", kits[0] ? "Kit " + kits[0].valor : "–", kits[0] ? pct(kits[0].n, totalKits, 0) + " dos cliques no checkout" : "sem cliques no período"));
    kpis.appendChild(cartaoKpi("Ao vivo agora", n(d.aoVivo), "pessoas nos últimos 5 minutos"));

    var lista = etapasFunil(d);
    mostrarAlerta($("[data-alerta]"), lista, gargalo(lista));
    montarDiario(d);

    // funil resumido: marcos principais
    var ids = ["capa", "cta", TELAS[0] && TELAS[0].id, "carregamento-1", "idade", "sinais", "montagem", "oferta", "planos", "checkout"];
    var resumo = lista.filter(function (e) { return ids.indexOf(e.id) !== -1; });
    desenharFunil($("[data-funil-resumo]"), resumo, base, null);
  }

  /* gráfico diário: barras agrupadas, um eixo, legenda + dica ao tocar */
  var SERIES = [
    { k: "visitas", nome: "Visitas", cor: "var(--s1)" },
    { k: "formulas", nome: "Viram a fórmula", cor: "var(--s2)" },
    { k: "checkouts", nome: "Cliques no checkout", cor: "var(--s3)" },
  ];

  function diasDoPeriodo(d) {
    var r = intervalo();
    var mapa = {};
    (d.diario || []).forEach(function (x) { mapa[x.dia] = x; });
    var dias = [];
    var inicio = new Date(r.de);
    if (estado.periodo === "tudo" && d.diario && d.diario.length) inicio = new Date(d.diario[0].dia + "T00:00:00");
    for (var t = new Date(inicio); t < r.ate && dias.length < 400; t.setDate(t.getDate() + 1)) {
      var iso = isoDia(t);
      dias.push(mapa[iso] || { dia: iso, visitas: 0, formulas: 0, checkouts: 0 });
    }
    return dias;
  }

  function montarDiario(d) {
    var dias = diasDoPeriodo(d);
    var leg = limpar($("[data-legenda-diario]"));
    SERIES.forEach(function (s) {
      var item = el("span");
      var cor = el("i");
      cor.style.background = s.cor;
      item.appendChild(cor);
      item.appendChild(document.createTextNode(s.nome));
      leg.appendChild(item);
    });

    var caixa = limpar($("[data-grafico-diario]"));
    var largura = Math.max(caixa.clientWidth || 320, dias.length * 26);
    var altura = 210, mE = 30, mB = 22, mT = 8;
    var max = Math.max(1, Math.max.apply(null, dias.map(function (x) { return x.visitas; })));
    var passo = Math.pow(10, Math.floor(Math.log10(max)));
    var topo = Math.ceil(max / passo) * passo;
    var svg = svgEl("svg", { width: largura, height: altura, viewBox: "0 0 " + largura + " " + altura, role: "img", "aria-label": "Evolução diária de visitas, fórmulas vistas e cliques no checkout" });
    var y = function (v) { return mT + (altura - mT - mB) * (1 - v / topo); };
    [0, topo / 2, topo].forEach(function (v) {
      svg.appendChild(svgEl("line", { class: "grade", x1: mE, x2: largura, y1: y(v), y2: y(v) }));
      var t = svgEl("text", { class: "eixo-texto", x: 0, y: y(v) + 3 });
      t.textContent = n(v);
      svg.appendChild(t);
    });
    var faixa = (largura - mE) / dias.length;
    var bw = Math.max(2, Math.min(10, (faixa - 6) / 3 - 2));
    var cada = Math.ceil(dias.length / Math.max(1, Math.floor((largura - mE) / 44)));
    dias.forEach(function (dia, i) {
      var x0 = mE + i * faixa + (faixa - (bw * 3 + 4)) / 2;
      SERIES.forEach(function (s, j) {
        var v = dia[s.k] || 0;
        var h = Math.max(0, y(0) - y(v));
        if (v > 0) {
          var r = Math.min(3, bw / 2, h);
          var x = x0 + j * (bw + 2), yy = y(v);
          // topo arredondado, base reta
          svg.appendChild(svgEl("path", {
            d: "M" + x + " " + y(0) + "V" + (yy + r) + "Q" + x + " " + yy + " " + (x + r) + " " + yy + "H" + (x + bw - r) + "Q" + (x + bw) + " " + yy + " " + (x + bw) + " " + (yy + r) + "V" + y(0) + "Z",
            fill: s.cor,
          }));
        }
      });
      if (i % cada === 0) {
        var t = svgEl("text", { class: "eixo-texto", x: mE + i * faixa + faixa / 2, y: altura - 6, "text-anchor": "middle" });
        t.textContent = dataBR(dia.dia);
        svg.appendChild(t);
      }
      var alvo = svgEl("rect", { class: "alvo", x: mE + i * faixa, y: 0, width: faixa, height: altura - mB, tabindex: 0 });
      var mostrarDica = function (ev) {
        var linhas = SERIES.map(function (s) { return { cor: s.cor, valor: n(dia[s.k]), nome: s.nome }; });
        linhas.push({ cor: "transparent", valor: pct(dia.checkouts, dia.visitas), nome: "conversão do dia" });
        dica(ev, dataBR(dia.dia), linhas);
      };
      alvo.addEventListener("pointerenter", mostrarDica);
      alvo.addEventListener("pointermove", mostrarDica);
      alvo.addEventListener("focus", mostrarDica);
      alvo.addEventListener("pointerleave", esconderDica);
      alvo.addEventListener("blur", esconderDica);
      svg.appendChild(alvo);
    });
    caixa.appendChild(svg);
    if (largura > caixa.clientWidth) caixa.scrollLeft = largura;

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
    cheia.style.width = w + "%";
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
      var cabe = cheia.clientWidth >= dentro.offsetWidth + 14;
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

    // kits
    var no = limpar($("[data-kits]"));
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
      cartao.appendChild(el("p", "kpi-sub", n(pl[v] ? pl[v].n : 0) + " pessoas tocaram neste kit"));
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
    ["fonte", "campanha", "aparelho", "sistema", "pais"].forEach(function (campo) {
      var no = limpar($('[data-origem="' + campo + '"]'));
      var linhas = (d.origem && d.origem[campo]) || [];
      if (!linhas.length) { no.appendChild(el("p", "vazio", "Sem dados no período.")); return; }
      var tab = el("table", "tabela");
      var cab = el("tr");
      ["Nome", "Visitas", "Iniciaram", "Fórmula", "Checkout", "Conv."].forEach(function (h) { cab.appendChild(el("th", null, h)); });
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
  function gerarDemo(r) {
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
    var cta = Math.round(I * 1.07), capa = Math.round(cta / 0.74);
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
    var amostra = function (q, centro, var_) { var l = []; for (var i = 0; i < Math.min(q, 400); i++) l.push(Math.round(centro * (1 + (rnd() - 0.5) * var_))); return l; };
    var kpi = {
      sessoes: V, visitantes: Math.round(V * 0.86), capa: capa, cta_capa: cta, quiz: Math.round(cta * 0.99), iniciaram: I,
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
      porHora: porHora, duracoes: amostra(F, 169000, 0.6), tempoOferta: amostra(F, 96000, 1.2),
      rolagem: amostra(F, 58, 1).map(function (r2) { return { pagina: "oferta", r: Math.min(100, r2) }; }),
      opcoes: [{ campo: "fonte", v: "facebook" }, { campo: "fonte", v: "instagram" }, { campo: "fonte", v: "tiktok" }, { campo: "aparelho", v: "celular" }, { campo: "aparelho", v: "computador" }, { campo: "campanha", v: "anti-idade-30" }],
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
    var q = new URLSearchParams({ de: r.de.getTime(), ate: r.ate.getTime() });
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
  $("[data-atualizar]").addEventListener("click", carregar);
  $("[data-exportar]").addEventListener("click", exportar);
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
      if (estado.aba === "geral" && estado.dados) montarDiario(estado.dados);
      requestAnimationFrame(ajustarRotulos);
    });
  });
  var redimensionar = 0;
  window.addEventListener("resize", function () {
    clearTimeout(redimensionar);
    redimensionar = setTimeout(function () { if (estado.dados && estado.aba === "geral") montarDiario(estado.dados); }, 200);
  });

  // atualiza sozinho a cada 60 s (só com dados reais)
  setInterval(function () { if (!estado.demo && estado.senha && !document.hidden && !$("[data-painel]").hidden) carregar(); }, 60000);

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
