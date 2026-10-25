/* Estrategista: IA de dados e conversão do painel. Duas formas de usar:
   1) "Resumo para o meu Claude" (sem custo): monta o briefing estratégico
      com os números do período (visitas, conversões, connect rate, gargalo,
      ponto forte, pontos de melhoria), copia e abre o Claude ou o ChatGPT da
      assinatura da pessoa, para ela só colar e conversar.
   2) "Chat no painel" (API do Claude, custo por uso):
   - Texto, voz (o navegador transcreve a fala), imagens, PDFs e planilhas.
   - Manda a conversa para /api/agente, que consulta os números da
     plataforma e responde. A resposta chega aos poucos (status → resposta).
   - Desenha a resposta: texto simples, cartões de números (```kpis) e
     barras (```barras). */
(function () {
  "use strict";

  var $ = function (s, raiz) { return (raiz || document).querySelector(s); };
  var app = window.PainelApp;
  var painel = $("[data-agente]");
  if (!painel || !app) return;

  var lista = $("[data-agente-mensagens]");
  var form = $("[data-agente-form]");
  var campo = $("[data-agente-texto]");
  var arquivo = $("[data-agente-arquivo]");
  var caixaAnexos = $("[data-agente-anexos]");
  var botaoMic = $("[data-agente-mic]");
  var barraOuvindo = $("[data-agente-ouvindo]");
  var textoOuvindo = $("[data-agente-ouvindo-texto]");
  var botaoEnviar = $("[data-agente-enviar]");

  var CHAVE = "cl-agente-conversa";
  var conversa = [];   // [{ papel: "user"|"assistant", texto, anexos: [{tipo, nome, mime, dados|texto}] }]
  var anexos = [];     // anexos esperando o envio
  var ocupado = false;

  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }

  /* ================= abrir / fechar ================= */
  function abrir(pergunta) {
    painel.hidden = false;
    document.body.classList.add("agente-aberto");
    requestAnimationFrame(function () { painel.classList.add("is-aberto"); });
    var temApi = !!(app.estado.dados && app.estado.dados.ia) && !app.estado.demo;
    // com pergunta pronta e a API ligada, vai direto para o chat; sem API, mostra o resumo grátis
    if (pergunta && temApi) mudarModo("chat");
    else if (pergunta) mudarModo("resumo");
    else mudarModo(modo);
    if (!lista.children.length) desenharTudo();
    if (pergunta && temApi) { campo.value = pergunta; enviar(); }
    else if (modo === "chat") setTimeout(function () { campo.focus({ preventScroll: true }); }, 350);
  }
  function fechar() {
    painel.classList.remove("is-aberto");
    document.body.classList.remove("agente-aberto");
    pararOuvir(false);
    setTimeout(function () { painel.hidden = true; }, 300);
  }
  $("[data-agente-abrir]").addEventListener("click", function () { abrir(); });
  $("[data-agente-fechar]").addEventListener("click", fechar);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !painel.hidden) fechar(); });
  $("[data-agente-limpar]").addEventListener("click", function () {
    if (ocupado) return;
    conversa = [];
    salvar();
    desenharTudo();
  });
  // outros pontos do painel podem abrir o chat já com uma pergunta
  window.abrirEstrategista = abrir;

  /* ================= modo: resumo (grátis) ou chat (API) ================= */
  var caixaResumo = $("[data-agente-resumo]");
  var modo = "resumo";
  try { modo = localStorage.getItem("cl-agente-modo") === "chat" ? "chat" : "resumo"; } catch (e) { /* ok */ }
  function mudarModo(m) {
    modo = m;
    try { localStorage.setItem("cl-agente-modo", m); } catch (e) { /* ok */ }
    Array.prototype.forEach.call(document.querySelectorAll("[data-agente-modo]"), function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-agente-modo") === m ? "true" : "false");
    });
    caixaResumo.hidden = m !== "resumo";
    lista.hidden = form.hidden = m !== "chat";
    $("[data-agente-limpar]").hidden = m !== "chat";
    if (m === "resumo") desenharResumo();
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-agente-modo]"), function (b) {
    b.addEventListener("click", function () { mudarModo(b.getAttribute("data-agente-modo")); });
  });
  // quando os números do painel mudam (outro período), o resumo se refaz
  app.depoisDeMontar = function () { if (!painel.hidden && modo === "resumo") desenharResumo(); };

  /* ---------- números do briefing ---------- */
  var NUM = new Intl.NumberFormat("pt-BR");
  var REAL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var PRECO = { "1": 197.9, "2": 297.9, "3": 397.9 };
  var FONTES_META = ["facebook", "fb", "ig", "instagram", "messenger", "msg", "an", "meta"];
  function n(v) { return NUM.format(Math.round(v || 0)); }
  function p(a, b, casas) {
    if (!b) return "–";
    return (100 * a / b).toLocaleString("pt-BR", { minimumFractionDigits: casas == null ? 1 : casas, maximumFractionDigits: casas == null ? 1 : casas }) + "%";
  }
  function br(iso) { return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : ""; }
  function variacao(at, ant) {
    if (!ant || app.estado.periodo === "tudo") return null;
    var v = Math.round(100 * (at - ant) / ant);
    return (v >= 0 ? "+" : "") + v + "% vs período anterior";
  }

  function lerMeta(chave) {
    try { return JSON.parse(localStorage.getItem("cl-meta-" + chave)) || {}; } catch (e) { return {}; }
  }
  function gravarMeta(chave, v) {
    try { localStorage.setItem("cl-meta-" + chave, JSON.stringify(v)); } catch (e) { /* ok */ }
  }

  function calcular() {
    var e = app.estado, d = e.dados;
    if (!d || !d.kpi) return null;
    var k = d.kpi, a = d.kpiAnt || {}, v2 = e.versao === "v2";
    var per = app.periodo();
    var visitas = app.visitasDe(k), visitasAnt = app.visitasDe(a);
    var rel = app.analisar() || { gargalo: {}, pontos: [], positivos: [] };
    // visitas vindas da Meta (para o connect rate)
    var meta = 0;
    ((d.origem && d.origem.fonte) || []).forEach(function (f) { if (FONTES_META.indexOf(String(f.nome).toLowerCase()) !== -1) meta += Number(f.visitas) || 0; });
    var kits = (d.checkoutPlano || []).slice().sort(function (x, y) { return y.n - x.n; });
    var totalKits = kits.reduce(function (s2, x) { return s2 + x.n; }, 0);
    var receita = kits.reduce(function (s2, x) { return s2 + x.n * (PRECO[x.valor] || 0); }, 0);
    return {
      e: e, d: d, k: k, a: a, v2: v2, per: per, visitas: visitas, visitasAnt: visitasAnt, rel: rel,
      visitasMeta: meta, chaveMeta: per.de + "_" + per.ate,
      kitTop: kits[0] ? "Kit " + kits[0].valor + " (" + p(kits[0].n, totalKits, 0) + " dos cliques em comprar)" : "–",
      ticket: totalKits ? receita / totalKits : null,
    };
  }

  /* ---------- tela do resumo ---------- */
  var PERIODOS = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7", "7 dias"], ["30", "30 dias"]];
  function desenharResumo() {
    while (caixaResumo.firstChild) caixaResumo.removeChild(caixaResumo.firstChild);
    var c = calcular();

    var intro = el("div", "resumo-intro");
    intro.appendChild(el("h3", null, "Briefing estratégico"));
    intro.appendChild(el("p", null, "Os números do período, já organizados. Copie e cole no seu Claude ou ChatGPT para conversar sobre eles. Usa a sua assinatura: sem custo extra."));
    caixaResumo.appendChild(intro);

    var chips = el("div", "resumo-periodos");
    PERIODOS.forEach(function (pp) {
      var b = el("button", "resumo-periodo" + (app.estado.periodo === pp[0] && !app.estado.de ? " is-ativo" : ""), pp[1]);
      b.type = "button";
      b.addEventListener("click", function () { app.trocarPeriodo(pp[0]); });
      chips.appendChild(b);
    });
    caixaResumo.appendChild(chips);

    if (!c) { caixaResumo.appendChild(el("p", "resumo-vazio", "Carregando os números…")); return; }
    var k = c.k;
    caixaResumo.appendChild(el("p", "resumo-legenda", (c.v2 ? "Oferta direta (v2)" : "Funil com quiz") + " · " + br(c.per.de) + (c.per.de !== c.per.ate ? " a " + br(c.per.ate) : "") + (app.estado.demo ? " · números de demonstração" : "")));

    // números principais
    var grade = el("div", "resumo-kpis");
    var kpi = function (rot, val, det, destaque) {
      var b = el("div", "resumo-kpi" + (destaque ? " destaque" : ""));
      b.appendChild(el("span", "resumo-kpi-rot", rot));
      b.appendChild(el("strong", null, val));
      if (det) b.appendChild(el("span", "resumo-kpi-det", det));
      grade.appendChild(b);
      return b;
    };
    kpi("Pessoas que entraram", n(c.visitas), variacao(c.visitas, c.visitasAnt) || n(k.visitantes) + " pessoas únicas");
    if (c.v2) {
      kpi("Viram os planos", p(k.viram_planos, c.visitas, 0), n(k.viram_planos) + " pessoas");
    } else {
      kpi("Conversão do quiz", p(k.concluiram, k.iniciaram, 0), n(k.concluiram) + " de " + n(k.iniciaram) + " terminaram");
    }
    kpi("Conversão total", p(k.checkout, c.visitas, 2), n(k.checkout) + " cliques em comprar", true);
    var kConnect = kpi("Connect rate", "–", "informe os cliques no link abaixo");
    caixaResumo.appendChild(grade);

    // gargalo e ponto forte
    var g = c.rel.gargalo || {};
    if (g.etapa) {
      var bg = el("div", "resumo-caixa gargalo");
      bg.appendChild(el("span", "resumo-caixa-rot", "Maior gargalo"));
      bg.appendChild(el("strong", null, g.etapa));
      bg.appendChild(el("p", null, g.explicacao || ""));
      caixaResumo.appendChild(bg);
    }
    if ((c.rel.positivos || []).length) {
      var bf = el("div", "resumo-caixa forte");
      bf.appendChild(el("span", "resumo-caixa-rot", "Ponto forte"));
      bf.appendChild(el("p", null, c.rel.positivos[0]));
      caixaResumo.appendChild(bf);
    }

    // dados da Meta (connect rate e custo)
    var m = lerMeta(c.chaveMeta);
    var caixaMeta = el("div", "resumo-meta");
    caixaMeta.appendChild(el("span", "resumo-caixa-rot", "Dados do Gerenciador de Anúncios (opcional)"));
    var linhaMeta = el("div", "resumo-meta-campos");
    var campoNum = function (rot, chave, dica) {
      var l = el("label");
      l.appendChild(el("span", null, rot));
      var i = el("input");
      i.type = "number"; i.inputMode = "decimal"; i.min = "0"; i.step = "any"; i.placeholder = dica;
      i.value = m[chave] != null ? m[chave] : "";
      i.addEventListener("input", function () { m[chave] = i.value === "" ? null : Number(i.value); gravarMeta(c.chaveMeta, m); atualizarMeta(); });
      l.appendChild(i);
      linhaMeta.appendChild(l);
    };
    campoNum("Cliques no link", "cliques", "ex.: 420");
    campoNum("Valor gasto (R$)", "gasto", "ex.: 350");
    caixaMeta.appendChild(linhaMeta);
    var resultadoMeta = el("p", "resumo-meta-res");
    caixaMeta.appendChild(resultadoMeta);
    caixaResumo.appendChild(caixaMeta);

    function atualizarMeta() {
      var base = c.visitasMeta || c.visitas;
      var partes = [];
      if (m.cliques) {
        kConnect.querySelector("strong").textContent = p(base, m.cliques, 0);
        kConnect.querySelector(".resumo-kpi-det").textContent = n(base) + " visitas de " + n(m.cliques) + " cliques" + (c.visitasMeta ? " (vindas da Meta)" : "");
      } else {
        kConnect.querySelector("strong").textContent = "–";
        kConnect.querySelector(".resumo-kpi-det").textContent = "informe os cliques no link abaixo";
      }
      if (m.gasto) {
        if (k.checkout) partes.push("Custo por clique em comprar: " + REAL.format(m.gasto / k.checkout));
        if (base) partes.push("Custo por visita: " + REAL.format(m.gasto / base));
      }
      resultadoMeta.textContent = partes.join(" · ") || "Connect rate = visitas que chegaram ao site ÷ cliques no link do anúncio.";
    }
    atualizarMeta();

    // pontos de melhoria
    if ((c.rel.pontos || []).length) {
      var bp = el("div", "resumo-caixa");
      bp.appendChild(el("span", "resumo-caixa-rot", "Pontos de melhoria do painel"));
      var ul = el("ul");
      c.rel.pontos.slice(0, 4).forEach(function (pt) { ul.appendChild(el("li", null, pt.titulo)); });
      bp.appendChild(ul);
      caixaResumo.appendChild(bp);
    }

    // ações
    var acoes = el("div", "resumo-acoes");
    var botao = function (rot, url, cls) {
      var b = el("button", "resumo-botao " + (cls || ""), rot);
      b.type = "button";
      b.addEventListener("click", function () {
        var texto = montarBriefing(c, m);
        copiar(texto);
        if (url) window.open(url, "_blank", "noopener");
        aviso(url ? "Briefing copiado! No app, toque e segure no campo de mensagem e escolha Colar." : "Briefing copiado!");
      });
      acoes.appendChild(b);
    };
    botao("Copiar e abrir no Claude", "https://claude.ai/new", "claude");
    botao("Copiar e abrir no ChatGPT", "https://chatgpt.com/", "chatgpt");
    botao("Só copiar", null, "leve");
    caixaResumo.appendChild(acoes);
  }

  function copiar(texto) {
    var ok = false;
    try {
      var t = document.createElement("textarea");
      t.value = texto;
      t.setAttribute("readonly", "");
      t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      ok = document.execCommand("copy");
      t.remove();
    } catch (e) { ok = false; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).catch(function () {});
    return ok;
  }

  /* ---------- o texto que vai para o Claude/ChatGPT ---------- */
  function montarBriefing(c, m) {
    var k = c.k, a = c.a, d = c.d, L = [];
    var base = c.visitasMeta || c.visitas;
    L.push("Você é um estrategista sênior de dados e conversão (CRO/growth) de e-commerce. Analise os números abaixo da Cellive Skin, marca brasileira de skincare que vende o Sérum Revitalizador Noturno online.");
    L.push("Funil: " + (c.v2 ? "anúncio → página de oferta direta (v2, sem quiz) → escolha do kit → clique em comprar." : "anúncio → capa → quiz de pele → página da fórmula personalizada (oferta) → escolha do kit → clique em comprar.") + " O painel mede até o clique em comprar (a compra paga acontece no checkout, fora do painel).");
    L.push("Período: " + br(c.per.de) + (c.per.de !== c.per.ate ? " a " + br(c.per.ate) : "") + (c.e.demo ? " (ATENÇÃO: números de demonstração)" : ""));
    L.push("");
    L.push("## Números principais");
    L.push("- Pessoas que entraram (visitas): " + n(c.visitas) + (c.visitasAnt ? " | período anterior: " + n(c.visitasAnt) : "") + " | pessoas únicas: " + n(k.visitantes));
    if (!c.v2) {
      L.push("- Começaram o quiz: " + n(k.iniciaram) + " (" + p(k.iniciaram, c.visitas) + " das visitas)");
      L.push("- Terminaram o quiz: " + n(k.concluiram) + " (conversão do quiz: " + p(k.concluiram, k.iniciaram) + " de quem começou)");
    }
    L.push("- Viram a oferta: " + n(k.oferta) + " (" + p(k.oferta, c.visitas) + " das visitas)");
    L.push("- Viram os planos/preços: " + n(k.viram_planos) + " (" + p(k.viram_planos, k.oferta) + " de quem viu a oferta)");
    L.push("- Tocaram num kit: " + n(k.escolheram_plano));
    L.push("- Clicaram em comprar: " + n(k.checkout) + " (" + p(k.checkout, k.viram_planos) + " de quem viu os planos)" + (a.checkout != null ? " | período anterior: " + n(a.checkout) : ""));
    L.push("- Conversão total (visita → clique em comprar): " + p(k.checkout, c.visitas, 2) + (c.visitasAnt ? " | período anterior: " + p(a.checkout, c.visitasAnt, 2) : ""));
    L.push("- Kit mais escolhido: " + c.kitTop + " | ticket médio estimado: " + (c.ticket ? REAL.format(c.ticket) : "–") + " | preços: Kit 1 R$ 197,90 · Kit 2 R$ 297,90 (vem marcado) · Kit 3 R$ 397,90");
    if (m.cliques) L.push("- Connect rate (Meta): " + p(base, m.cliques, 1) + " (" + n(base) + " visitas ÷ " + n(m.cliques) + " cliques no link)");
    if (m.gasto) {
      L.push("- Valor gasto em anúncios: " + REAL.format(m.gasto) + (k.checkout ? " | custo por clique em comprar: " + REAL.format(m.gasto / k.checkout) : "") + (base ? " | custo por visita: " + REAL.format(m.gasto / base) : ""));
    }
    L.push("- Pessoas no site agora: " + n(d.aoVivo));
    var g = c.rel.gargalo || {};
    if (g.etapa) { L.push(""); L.push("## Maior gargalo (análise do painel)"); L.push(g.etapa + ". " + (g.explicacao || "")); }
    if ((c.rel.positivos || []).length) { L.push(""); L.push("## Pontos fortes"); c.rel.positivos.forEach(function (t) { L.push("- " + t); }); }
    if ((c.rel.pontos || []).length) {
      L.push(""); L.push("## Pontos de melhoria identificados pelo painel");
      c.rel.pontos.forEach(function (pt) { L.push("- [" + pt.prioridade + "] " + pt.titulo + ": " + (pt.detalhe || "") + (pt.impacto ? " (" + pt.impacto + ")" : "")); });
    }
    var R = app.estado.resumoIA || {};
    if (!c.v2 && R.quiz && R.quiz.length) {
      var piores = R.quiz.filter(function (t) { return t.saiu_antes > 0; }).sort(function (x, y) { return y.saiu_antes - x.saiu_antes; }).slice(0, 5);
      if (piores.length) { L.push(""); L.push("## Telas do quiz onde mais gente sai"); piores.forEach(function (t) { L.push("- " + t.tela + ": " + n(t.saiu_antes) + " saíram (" + String(t.perda_pct).replace(".", ",") + "%)"); }); }
    }
    var fontes = ((d.origem && d.origem.fonte) || []).slice(0, 6);
    if (fontes.length) { L.push(""); L.push("## Fontes de tráfego"); fontes.forEach(function (f) { L.push("- " + f.nome + ": " + n(f.visitas) + " visitas, " + n(f.checkouts) + " cliques em comprar (" + p(f.checkouts, f.visitas) + ")"); }); }
    var camp = ((d.origem && d.origem.campanha) || []).slice(0, 6);
    if (camp.length) { L.push(""); L.push("## Campanhas"); camp.forEach(function (f) { L.push("- " + f.nome + ": " + n(f.visitas) + " visitas, " + n(f.checkouts) + " cliques em comprar (" + p(f.checkouts, f.visitas) + ")"); }); }
    var ap = ((d.origem && d.origem.aparelho) || []).slice(0, 3);
    if (ap.length) { L.push(""); L.push("## Aparelhos"); ap.forEach(function (f) { L.push("- " + f.nome + ": " + n(f.visitas) + " visitas, conversão " + p(f.checkouts, f.visitas)); }); }
    if (R.horarios && R.horarios.horas_de_pico && R.horarios.horas_de_pico.length) { L.push(""); L.push("## Horários de pico: " + R.horarios.horas_de_pico.join(", ") + (R.horarios.dia_de_pico ? " · dia com mais visitas: " + R.horarios.dia_de_pico : "")); }
    L.push("");
    L.push("## O que eu quero de você");
    L.push("1. Uma leitura curta do período: o que foi bem e o que foi mal, com os números.");
    L.push("2. O maior gargalo e a causa mais provável.");
    L.push("3. As 3 ações mais importantes, em ordem de impacto x esforço, bem práticas (página, quiz, oferta ou anúncios).");
    L.push("4. Um teste A/B para rodar agora: o que mudar, o que medir e quanto tempo esperar.");
    L.push("Regras: use só os números acima (não invente dados); com menos de ~100 visitas, trate como preliminar; não sugira depoimentos ou números falsos nem promessas de resultado sem comprovação (CDC, CONAR, Anvisa). Responda em português simples.");
    return L.join("\n");
  }

  /* ================= memória da conversa (só nesta aba) ================= */
  function salvar() {
    try {
      var leve = conversa.slice(-30).map(function (m) {
        return { papel: m.papel, texto: m.texto, anexos: (m.anexos || []).map(function (a) { return { tipo: a.tipo, nome: a.nome }; }) };
      });
      sessionStorage.setItem(CHAVE, JSON.stringify(leve));
    } catch (e) { /* sem armazenamento */ }
  }
  try { conversa = JSON.parse(sessionStorage.getItem(CHAVE)) || []; } catch (e) { conversa = []; }

  /* ================= desenho das mensagens ================= */
  var SUGESTOES = [
    "Como foram as vendas hoje?",
    "Onde está o maior gargalo desta semana?",
    "Compare esta semana com a semana passada",
    "Qual fonte de tráfego converte melhor?",
    "O que eu testo primeiro para vender mais?",
  ];

  function boasVindas() {
    var box = el("div", "agente-vazio");
    var orb = el("span", "agente-orb agente-orb-grande");
    orb.setAttribute("aria-hidden", "true");
    box.appendChild(orb);
    box.appendChild(el("h3", null, "Olá! Sou o seu estrategista de dados."));
    box.appendChild(el("p", null, "Eu leio os números do painel, acho os gargalos e digo o que fazer para converter mais. Pergunte por texto ou voz, ou mande um print do Gerenciador de Anúncios, um PDF ou uma planilha."));
    var chips = el("div", "agente-sugestoes");
    SUGESTOES.forEach(function (s) {
      var b = el("button", "agente-sugestao", s);
      b.type = "button";
      b.addEventListener("click", function () { campo.value = s; enviar(); });
      chips.appendChild(b);
    });
    var print = el("button", "agente-sugestao agente-sugestao-anexo", "Analisar um print dos meus anúncios");
    print.type = "button";
    print.addEventListener("click", function () {
      campo.value = "Analise este print dos meus anúncios e cruze com o funil do mesmo período.";
      arquivo.click();
    });
    chips.appendChild(print);
    box.appendChild(chips);
    return box;
  }

  function desenharTudo() {
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!conversa.length) { lista.appendChild(boasVindas()); return; }
    conversa.forEach(function (m) { lista.appendChild(bolha(m, false)); });
    rolarFim();
  }

  function rolarFim() {
    requestAnimationFrame(function () { lista.scrollTop = lista.scrollHeight; });
  }

  function bolha(m, animar) {
    var b = el("div", "agente-msg " + (m.papel === "user" ? "de-mim" : "do-agente") + (m.erro ? " com-erro" : "") + (animar ? " entra" : ""));
    if (m.papel === "user") {
      if ((m.anexos || []).length) {
        var ax = el("div", "agente-msg-anexos");
        m.anexos.forEach(function (a) { ax.appendChild(miniAnexo(a)); });
        b.appendChild(ax);
      }
      if (m.texto) b.appendChild(el("p", null, m.texto));
    } else {
      b.appendChild(conteudoRico(m.texto || ""));
    }
    return b;
  }

  function miniAnexo(a) {
    var c = el("span", "agente-anexo-mini");
    if (a.tipo === "imagem" && a.previa) {
      var im = el("img");
      im.src = a.previa;
      im.alt = a.nome || "imagem";
      c.appendChild(im);
    } else {
      c.appendChild(el("b", null, a.tipo === "pdf" ? "PDF" : a.tipo === "imagem" ? "IMG" : "TXT"));
      c.appendChild(el("span", null, a.nome || "arquivo"));
    }
    return c;
  }

  /* ---------- texto rico: markdown simples + blocos visuais ---------- */
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function inline(t) {
    return esc(t)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function conteudoRico(texto) {
    var raiz = el("div", "agente-rico");
    var partes = String(texto).split(/```/);
    partes.forEach(function (parte, i) {
      if (i % 2 === 1) {
        var quebra = parte.indexOf("\n");
        var tipo = (quebra === -1 ? parte : parte.slice(0, quebra)).trim().toLowerCase();
        var corpo = quebra === -1 ? "" : parte.slice(quebra + 1);
        var bloco = null;
        try {
          if (tipo === "kpis") bloco = blocoKpis(JSON.parse(corpo));
          else if (tipo === "barras") bloco = blocoBarras(JSON.parse(corpo));
        } catch (e) { bloco = null; }
        if (!bloco) { bloco = el("pre", "agente-pre", corpo || parte); }
        raiz.appendChild(bloco);
      } else {
        markdown(parte, raiz);
      }
    });
    return raiz;
  }

  function markdown(texto, raiz) {
    var linhas = texto.split("\n");
    var i = 0;
    while (i < linhas.length) {
      var l = linhas[i];
      if (!l.trim()) { i++; continue; }
      var h = l.match(/^(#{1,4})\s+(.*)$/);
      if (h) { var t = el(h[1].length <= 2 ? "h3" : "h4"); t.innerHTML = inline(h[2]); raiz.appendChild(t); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(l)) {
        var bloco = [];
        while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) { bloco.push(linhas[i]); i++; }
        raiz.appendChild(tabela(bloco));
        continue;
      }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
        var ordenada = /^\s*\d+[.)]\s+/.test(l);
        var lst = el(ordenada ? "ol" : "ul");
        while (i < linhas.length && /^\s*([-*•]|\d+[.)])\s+/.test(linhas[i])) {
          var li = el("li");
          li.innerHTML = inline(linhas[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
          lst.appendChild(li);
          i++;
        }
        raiz.appendChild(lst);
        continue;
      }
      var par = [];
      while (i < linhas.length && linhas[i].trim() && !/^(#{1,4})\s+/.test(linhas[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(linhas[i]) && !/^\s*\|.*\|\s*$/.test(linhas[i])) { par.push(linhas[i]); i++; }
      var p = el("p");
      p.innerHTML = par.map(inline).join("<br>");
      raiz.appendChild(p);
    }
  }

  function tabela(linhas) {
    var celulas = function (l) { return l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); }); };
    // tira a linha separadora (|---|---|)
    var corpo = linhas.filter(function (l) { return !/^\s*\|?[\s:|-]+\|?\s*$/.test(l); });
    var wrap = el("div", "agente-tabela");
    var t = el("table");
    corpo.forEach(function (l, n) {
      var tr = el("tr");
      celulas(l).forEach(function (c) { var td = el(n === 0 ? "th" : "td"); td.innerHTML = inline(c); tr.appendChild(td); });
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    return wrap;
  }

  var SETAS = { sobe: "▲", desce: "▼", igual: "■" };
  function blocoKpis(itens) {
    if (!Array.isArray(itens) || !itens.length) return null;
    var g = el("div", "agente-kpis");
    itens.slice(0, 6).forEach(function (k, i) {
      var c = el("div", "agente-kpi");
      c.style.setProperty("--i", i);
      c.appendChild(el("span", "agente-kpi-rot", k.rotulo || ""));
      c.appendChild(el("strong", "agente-kpi-valor", String(k.valor == null ? "–" : k.valor)));
      if (k.detalhe) {
        var t = (k.tendencia || "").toLowerCase();
        var d = el("span", "agente-kpi-det t-" + (SETAS[t] ? t : "igual"));
        if (SETAS[t]) d.appendChild(el("i", null, SETAS[t]));
        d.appendChild(document.createTextNode(k.detalhe));
        c.appendChild(d);
      }
      g.appendChild(c);
    });
    return g;
  }

  function blocoBarras(dados) {
    var itens = dados && Array.isArray(dados.itens) ? dados.itens.slice(0, 10) : null;
    if (!itens || !itens.length) return null;
    var box = el("div", "agente-barras");
    if (dados.titulo) box.appendChild(el("p", "agente-barras-titulo", dados.titulo));
    var max = Math.max.apply(null, itens.map(function (x) { return Math.abs(Number(x.valor) || 0); }).concat(0.0001));
    itens.forEach(function (x, i) {
      var linha = el("div", "agente-barra");
      linha.style.setProperty("--i", i);
      linha.appendChild(el("span", "agente-barra-nome", x.nome || ""));
      var trilho = el("span", "agente-barra-trilho");
      var cheio = el("span", "agente-barra-cheia");
      cheio.style.setProperty("--w", (100 * Math.abs(Number(x.valor) || 0) / max).toFixed(1) + "%");
      trilho.appendChild(cheio);
      linha.appendChild(trilho);
      linha.appendChild(el("span", "agente-barra-rot", x.rotulo != null ? String(x.rotulo) : String(x.valor)));
      box.appendChild(linha);
    });
    return box;
  }

  /* ================= anexos ================= */
  $("[data-agente-anexar]").addEventListener("click", function () { arquivo.click(); });
  arquivo.addEventListener("change", function () {
    Array.prototype.slice.call(arquivo.files || []).forEach(prepararArquivo);
    arquivo.value = "";
  });

  function prepararArquivo(f) {
    if (anexos.length >= 4) return aviso("Até 4 anexos por mensagem.");
    var nome = f.name || "arquivo";
    if (/^image\//.test(f.type)) {
      comprimirImagem(f, function (dados, previa) {
        if (!dados) return aviso("Não consegui abrir essa imagem.");
        anexos.push({ tipo: "imagem", nome: nome, mime: "image/jpeg", dados: dados, previa: previa });
        desenharAnexos();
      });
    } else if (f.type === "application/pdf" || /\.pdf$/i.test(nome)) {
      if (f.size > 3 * 1024 * 1024) return aviso("O PDF passa de 3 MB. Mande uma versão menor ou só as páginas que importam.");
      var r = new FileReader();
      r.onload = function () {
        anexos.push({ tipo: "pdf", nome: nome, mime: "application/pdf", dados: String(r.result).split(",")[1] });
        desenharAnexos();
      };
      r.readAsDataURL(f);
    } else if (/\.(csv|txt)$/i.test(nome) || /^text\//.test(f.type)) {
      if (f.size > 400 * 1024) return aviso("A planilha passa de 400 KB. Exporte só as colunas e o período que importam.");
      var rt = new FileReader();
      rt.onload = function () { anexos.push({ tipo: "texto", nome: nome, texto: String(rt.result) }); desenharAnexos(); };
      rt.readAsText(f);
    } else {
      aviso("Formato não aceito. Mande imagem (print), PDF ou planilha em CSV.");
    }
  }

  // reduz a foto (no máximo 1600 px) para caber no envio
  function comprimirImagem(f, pronto) {
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function () {
      var lado = Math.max(img.naturalWidth, img.naturalHeight);
      var k = Math.min(1, 1600 / lado);
      var c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      var data = c.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      pronto(data.split(",")[1], data);
    };
    img.onerror = function () { URL.revokeObjectURL(url); pronto(null); };
    img.src = url;
  }

  function desenharAnexos() {
    while (caixaAnexos.firstChild) caixaAnexos.removeChild(caixaAnexos.firstChild);
    caixaAnexos.hidden = !anexos.length;
    anexos.forEach(function (a, i) {
      var c = miniAnexo(a);
      var x = el("button", "agente-anexo-tirar", "×");
      x.type = "button";
      x.setAttribute("aria-label", "Tirar " + a.nome);
      x.addEventListener("click", function () { anexos.splice(i, 1); desenharAnexos(); });
      c.appendChild(x);
      caixaAnexos.appendChild(c);
    });
    atualizarBotao();
  }

  function aviso(t) {
    var m = el("div", "agente-aviso", t);
    if (modo === "resumo") { caixaResumo.appendChild(m); m.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    else { lista.appendChild(m); rolarFim(); }
    setTimeout(function () { m.remove(); }, 5000);
  }

  /* ================= voz (o navegador transcreve) ================= */
  var Reconhecer = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, ouvindo = false, falaFinal = "", enviarAoParar = false;
  botaoMic.addEventListener("click", function () {
    if (ouvindo) { pararOuvir(true); return; }
    if (!Reconhecer) {
      aviso("Este navegador não transcreve voz. No celular, use o microfone do teclado para ditar a pergunta.");
      campo.focus();
      return;
    }
    comecarOuvir();
  });
  $("[data-agente-parar]").addEventListener("click", function () { pararOuvir(true); });

  function comecarOuvir() {
    rec = new Reconhecer();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = true;
    falaFinal = campo.value ? campo.value.trim() + " " : "";
    rec.onresult = function (ev) {
      var parcial = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) falaFinal += ev.results[i][0].transcript + " ";
        else parcial += ev.results[i][0].transcript;
      }
      campo.value = (falaFinal + parcial).trim();
      textoOuvindo.textContent = campo.value || "Ouvindo… pode falar";
      ajustarAltura();
    };
    rec.onerror = function (ev) {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") aviso("Libere o microfone para o site nas configurações do navegador.");
      else if (ev.error !== "no-speech" && ev.error !== "aborted") aviso("Não consegui ouvir agora. Tente de novo.");
    };
    rec.onend = function () {
      var mandar = enviarAoParar && campo.value.trim();
      ouvindo = false;
      enviarAoParar = false;
      barraOuvindo.hidden = true;
      botaoMic.classList.remove("is-ouvindo");
      if (mandar) enviar();
    };
    try { rec.start(); } catch (e) { return; }
    ouvindo = true;
    barraOuvindo.hidden = false;
    textoOuvindo.textContent = "Ouvindo… pode falar";
    botaoMic.classList.add("is-ouvindo");
  }
  function pararOuvir(mandar) {
    if (!rec || !ouvindo) return;
    enviarAoParar = !!mandar;
    try { rec.stop(); } catch (e) { /* já parou */ }
  }

  /* ================= enviar ================= */
  function ajustarAltura() {
    campo.style.height = "auto";
    campo.style.height = Math.min(140, campo.scrollHeight) + "px";
    atualizarBotao();
  }
  function atualizarBotao() {
    botaoEnviar.disabled = ocupado || (!campo.value.trim() && !anexos.length);
  }
  campo.addEventListener("input", ajustarAltura);
  campo.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing && window.matchMedia("(hover: hover)").matches) {
      ev.preventDefault();
      enviar();
    }
  });
  form.addEventListener("submit", function (ev) { ev.preventDefault(); enviar(); });

  function contexto() {
    var e = app.estado, d = e.dados || {}, k = d.kpi || {};
    return {
      tela_aberta: e.aba, funil: e.versao === "v2" ? "oferta direta (v2)" : "funil com quiz",
      periodo_na_tela: app.periodo(), filtros_na_tela: e.filtros,
      resumo_na_tela: e.resumoIA ? { conversao_pct: e.resumoIA.conversao_total_pct, volume: e.resumoIA.volume } : null,
      pessoas_no_site_agora: d.aoVivo, ver_dados_de_teste: !!e.demo, tem_numeros: !!k,
    };
  }

  function enviar() {
    if (ocupado) return;
    var texto = campo.value.trim();
    if (!texto && !anexos.length) return;
    if (ouvindo) { pararOuvir(false); }
    if (lista.querySelector(".agente-vazio")) lista.removeChild(lista.querySelector(".agente-vazio"));
    var msg = { papel: "user", texto: texto, anexos: anexos.slice() };
    conversa.push(msg);
    lista.appendChild(bolha(msg, true));
    campo.value = "";
    anexos = [];
    desenharAnexos();
    ajustarAltura();
    salvar();
    rolarFim();

    var estado = app.estado;
    if (estado.demo || !estado.senha) {
      responder({ papel: "assistant", texto: "No **modo demonstração** eu não converso: entre no painel com a senha para eu ler os números reais.\n\nO chat também precisa da chave do Claude na Vercel (variável `ANTHROPIC_API_KEY`).", erro: true });
      return;
    }

    ocupado = true;
    atualizarBotao();
    var pensando = el("div", "agente-msg do-agente agente-pensando entra");
    var dots = el("span", "agente-dots");
    dots.innerHTML = "<i></i><i></i><i></i>";
    pensando.appendChild(dots);
    var status = el("span", "agente-status", "Pensando…");
    pensando.appendChild(status);
    lista.appendChild(pensando);
    rolarFim();

    // só a última mensagem leva os arquivos; as anteriores vão só com o nome
    var envio = conversa.map(function (m, i) {
      var ultima = i === conversa.length - 1;
      return {
        papel: m.papel, texto: m.texto,
        anexos: (m.anexos || []).map(function (a) {
          return ultima ? { tipo: a.tipo, nome: a.nome, mime: a.mime, dados: a.dados, texto: a.texto } : { tipo: "antigo", nome: a.nome };
        }),
      };
    }).filter(function (m) { return !m.erro; });

    var terminou = false;
    var acabar = function (m) {
      if (terminou) return;
      terminou = true;
      pensando.remove();
      ocupado = false;
      atualizarBotao();
      responder(m);
    };

    fetch("/api/agente", {
      method: "POST",
      headers: { authorization: "Bearer " + estado.senha, "content-type": "application/json" },
      body: JSON.stringify({ conversa: envio, contexto: contexto() }),
    }).then(function (resp) {
      var tipo = resp.headers.get("content-type") || "";
      if (!resp.ok || tipo.indexOf("ndjson") === -1) {
        return resp.json().catch(function () { return {}; }).then(function (b) {
          var motivos = {
            "sem-ia": "O chat precisa da chave do Claude na Vercel (variável `ANTHROPIC_API_KEY`). Depois de colocar, faça um Redeploy.",
            limite: "Chegamos ao limite de mensagens de hoje. Amanhã libera de novo.",
            grande: "Os anexos ficaram grandes demais. Mande um arquivo menor.",
            senha: "A sessão expirou. Saia e entre de novo com a senha.",
          };
          acabar({ papel: "assistant", texto: motivos[b.erro] || "Não consegui responder agora. Tente de novo em instantes.", erro: true });
        });
      }
      var leitor = resp.body.getReader();
      var dec = new TextDecoder();
      var buffer = "";
      var ler = function () {
        return leitor.read().then(function (r) {
          if (r.done) {
            if (buffer.trim()) processar(buffer);
            acabar({ papel: "assistant", texto: "A resposta foi interrompida. Tente de novo.", erro: true });
            return;
          }
          buffer += dec.decode(r.value, { stream: true });
          var partes = buffer.split("\n");
          buffer = partes.pop();
          partes.forEach(processar);
          return ler();
        });
      };
      var processar = function (linha) {
        if (!linha.trim()) return;
        var ev;
        try { ev = JSON.parse(linha); } catch (e) { return; }
        if (ev.tipo === "status") status.textContent = ev.texto;
        else if (ev.tipo === "resposta") acabar({ papel: "assistant", texto: ev.texto });
        else if (ev.tipo === "erro") acabar({ papel: "assistant", texto: ev.texto, erro: true });
      };
      return ler();
    }).catch(function () {
      acabar({ papel: "assistant", texto: "Sem conexão com o servidor agora. Confira a internet e tente de novo.", erro: true });
    });
  }

  function responder(m) {
    if (!m.erro) { conversa.push(m); salvar(); }
    var b = bolha(m, true);
    lista.appendChild(b);
    // resposta longa: mostra o começo dela (não o fim)
    requestAnimationFrame(function () { lista.scrollTop = Math.max(0, b.offsetTop - 12); });
  }

  atualizarBotao();
})();
