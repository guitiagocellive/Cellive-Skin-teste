/* Estrategista: chat de IA do painel.
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
    if (!lista.children.length) desenharTudo();
    if (pergunta) { campo.value = pergunta; enviar(); }
    else setTimeout(function () { campo.focus({ preventScroll: true }); }, 350);
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
    lista.appendChild(m);
    rolarFim();
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
