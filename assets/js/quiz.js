/* Quiz: mostra as telas na ordem de quiz-perguntas.js (perguntas, tela de
   carregamento, perguntas da fórmula...), guarda as respostas e controla o
   botão de voltar (o da tela e o do celular). */
(function () {
  "use strict";

  var STORAGE_KEY = "cellive-quiz-respostas";
  var DELAY_AVANCAR = 380;          // tempo para ver a opção marcada antes de avançar
  var DELAY_ANTES_DO_VOO = 180;     // espera antes de o ativo sair em direção ao painel
  var DURACAO_VOO = 760;            // tempo do ativo descendo até o painel
  var PAUSA_DEPOIS_DO_VOO = 260;    // tempo para ver o ativo entrando na fórmula
  var PAUSA_FIM_CARREGAMENTO = 350; // fica um instante em 100% antes de seguir

  var $ = function (sel) { return document.querySelector(sel); };
  var quizEl = $(".quiz");
  var stepperEl = $("[data-stepper]");
  var barEl = $("[data-bar]");
  var barFillEl = $("[data-bar-fill]");
  var screenEl = $("[data-screen]");
  var backEl = $("[data-back]");
  var formulaEl = $("[data-formula]");
  var formulaListEl = $("[data-formula-list]");
  var formulaCountEl = $("[data-formula-count]");
  var formulaEmptyEl = $("[data-formula-empty]");
  var poteFillEl = $("[data-pote-fill]");
  var poteEl = $(".formula-pote");

  /* Transforma o fluxo numa lista simples de telas */
  var telas = [];
  window.QUIZ_FLUXO.forEach(function (bloco) {
    if (bloco.tipo === "etapa" || bloco.tipo === "formula") {
      bloco.perguntas.forEach(function (p, i) {
        telas.push({ tipo: "pergunta", bloco: bloco, indice: i, pergunta: p });
      });
    } else if (bloco.tipo === "carregamento") {
      telas.push({ tipo: "carregamento", bloco: bloco });
    }
  });
  telas.push({ tipo: "fim" });

  var atual = 0;
  var bloqueado = false;
  var stepperBloco = null;
  var carregamentoAtivo = null; // permite cancelar se a pessoa voltar no meio
  var respostas = carregarRespostas();

  /* ---------- Utilidades ---------- */
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function textoDaOpcao(op) {
    return typeof op === "string" ? op : op.texto;
  }

  function reduzirMovimento() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Espaço de imagem: mostra o nome do espaço até a foto existir */
  function slotDeImagem(classe, rotulo, src, alt) {
    var slot = el("span", "slot " + classe);
    if (rotulo) slot.setAttribute("data-label", rotulo);
    if (src) {
      var img = el("img");
      img.src = src;
      img.alt = alt || "";
      img.decoding = "async";
      img.addEventListener("error", function () { img.hidden = true; });
      slot.appendChild(img);
    }
    return slot;
  }

  /* ---------- Respostas ---------- */
  function carregarRespostas() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function salvarRespostas() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(respostas));
    } catch (e) {
      /* sem armazenamento: o quiz continua funcionando */
    }
  }

  /* ---------- Pré-carregamento de imagens ---------- */
  var jaCarregadas = {};

  function preCarregar(urls) {
    urls.forEach(function (url) {
      if (!url || jaCarregadas[url]) return;
      jaCarregadas[url] = true;
      var img = new Image();
      img.decoding = "async";
      img.src = url;
    });
  }

  // Procura campos "imagem"/"imagens"/"preCarregar" em qualquer parte de um objeto
  function imagensDe(obj, lista) {
    lista = lista || [];
    if (!obj || typeof obj !== "object") return lista;
    Object.keys(obj).forEach(function (chave) {
      var valor = obj[chave];
      if ((chave === "imagem" || chave === "preCarregar" || chave === "imagens") && valor) {
        [].concat(valor).forEach(function (u) {
          if (typeof u === "string") lista.push(u);
        });
      } else if (typeof valor === "object" && chave !== "bloco") {
        imagensDe(valor, lista);
      }
    });
    return lista;
  }

  function imagensDasProximasTelas(aPartirDe) {
    var lista = [];
    for (var i = aPartirDe; i < telas.length; i++) {
      if (telas[i].pergunta) imagensDe(telas[i].pergunta, lista);
      if (telas[i].tipo === "carregamento") imagensDe(telas[i].bloco, lista);
    }
    return lista;
  }

  /* ---------- Progresso: 1 · 2 · 3 (1ª etapa) ou barra (fórmula) ---------- */
  function montarStepper(bloco) {
    stepperBloco = bloco;
    stepperEl.innerHTML = "";
    bloco.perguntas.forEach(function (_, i) {
      stepperEl.appendChild(el("li", "step", String(i + 1)));
    });
  }

  function atualizarProgresso(tela) {
    var bloco = tela.bloco;
    var ehEtapa = tela.tipo === "pergunta" && bloco.tipo === "etapa";
    var ehFormula = tela.tipo === "pergunta" && bloco.tipo === "formula";

    stepperEl.hidden = !ehEtapa;
    barEl.hidden = !ehFormula;

    if (ehEtapa) {
      if (stepperBloco !== bloco) montarStepper(bloco);
      var passos = stepperEl.children;
      for (var i = 0; i < passos.length; i++) {
        passos[i].classList.toggle("is-done", i < tela.indice);
        passos[i].classList.toggle("is-current", i === tela.indice);
        if (i === tela.indice) passos[i].setAttribute("aria-current", "step");
        else passos[i].removeAttribute("aria-current");
      }
      stepperEl.setAttribute("aria-label", "Pergunta " + (tela.indice + 1) + " de " + passos.length);
    }

    if (ehFormula) {
      var total = bloco.totalAtivos || bloco.perguntas.length;
      barFillEl.style.width = ((tela.indice + 1) / total) * 100 + "%";
      barEl.setAttribute("role", "progressbar");
      barEl.setAttribute("aria-valuemin", "0");
      barEl.setAttribute("aria-valuemax", String(total));
      barEl.setAttribute("aria-valuenow", String(tela.indice + 1));
      barEl.setAttribute("aria-label", "Pergunta " + (tela.indice + 1) + " de " + total);
    }
  }

  /* ---------- Painel da fórmula ---------- */
  var blocoFormula = null;
  window.QUIZ_FLUXO.forEach(function (b) { if (b.tipo === "formula") blocoFormula = b; });
  var ativosNoPainel = 0;

  function ativosDaFormula() {
    return blocoFormula
      ? blocoFormula.perguntas.filter(function (p) { return p.ativo; }).map(function (p) { return p.ativo; })
      : [];
  }

  // Quantos ativos já entraram na fórmula quando a pessoa está nesta tela
  function ativosAte(tela) {
    if (!blocoFormula) return 0;
    var idx = telas.indexOf(tela);
    var n = 0;
    for (var i = 0; i < idx; i++) {
      if (telas[i].bloco === blocoFormula && telas[i].pergunta.ativo) n++;
    }
    return n;
  }

  function chipDoAtivo(ativo) {
    var li = el("li", "ativo");
    li.appendChild(slotDeImagem("ativo-icone", "", ativo.imagem, ""));
    var textos = el("span", "ativo-textos");
    textos.appendChild(el("span", "ativo-rotulo", "Ativo adicionado"));
    textos.appendChild(el("span", "ativo-nome", ativo.nome));
    li.appendChild(textos);
    li.title = ativo.nome;
    return li;
  }

  var timerOnda = null;

  function atualizarPote(n, animar) {
    var total = blocoFormula.totalAtivos || blocoFormula.perguntas.length;
    // Mesmo vazio, o pote mostra uma linha fina preta no fundo (como no layout)
    var nivel = Math.max(Math.min(n / total, 1), 0.035);
    poteFillEl.classList.toggle("sem-transicao", !animar);
    // O líquido tem uma ondinha no topo (4 unidades); por isso o "- 4"
    poteFillEl.style.transform = "translateY(" + (163 * (1 - nivel) - 4).toFixed(2) + "px)";
    formulaCountEl.textContent = n + "/" + total;
    formulaEmptyEl.hidden = n > 0;

    if (animar && !reduzirMovimento()) {
      // Enquanto enche, o líquido balança e o pote dá um pulinho
      poteEl.classList.remove("is-filling");
      void poteEl.getBoundingClientRect();
      poteEl.classList.add("is-filling");
      clearTimeout(timerOnda);
      timerOnda = setTimeout(function () { poteEl.classList.remove("is-filling"); }, 1700);
    }
  }

  /* Deixa só o último ativo aberto (com nome); os anteriores viram bolinhas
     que vão se juntando, uma por cima da outra, ao lado do pote. Quanto mais
     bolinhas, mais elas se sobrepõem, para tudo caber numa linha. */
  var BOLINHA = 32;

  function marcarUltimoAberto() {
    var itens = formulaListEl.children;
    var n = itens.length;
    for (var i = 0; i < n; i++) {
      itens[i].classList.toggle("is-collapsed", i < n - 1);
      itens[i].style.zIndex = String(i + 1);
    }
    if (n < 2) {
      formulaListEl.style.setProperty("--sobrepor", "0px");
      return;
    }
    var ultimo = itens[n - 1];
    var nome = ultimo.querySelector(".ativo-textos");
    var larguraSelo = (nome ? nome.scrollWidth : 120) + 36 + 4 + 12 + 18 + 3;
    var espaco = formulaListEl.clientWidth - larguraSelo - 10;
    var passo = n > 2 ? (espaco - BOLINHA) / (n - 2) : BOLINHA;
    passo = Math.max(7, Math.min(BOLINHA - 6, passo));
    formulaListEl.style.setProperty("--sobrepor", (BOLINHA - passo).toFixed(1) + "px");
  }

  // Mostra/esconde o painel e acerta a lista sem animação (ex.: ao voltar)
  function sincronizarPainel(tela) {
    var mostrar = !!blocoFormula && tela.tipo === "pergunta" && tela.bloco === blocoFormula;
    if (mostrar && formulaEl.hidden) {
      formulaEl.hidden = false;
      formulaEl.classList.remove("is-entering");
      void formulaEl.offsetWidth;
      formulaEl.classList.add("is-entering");
    } else if (!mostrar) {
      formulaEl.hidden = true;
    }
    quizEl.classList.toggle("com-formula", mostrar);
    if (!blocoFormula) return;

    var alvo = ativosAte(tela);
    var lista = ativosDaFormula();
    var mudou = alvo !== ativosNoPainel;
    while (ativosNoPainel > alvo) {
      formulaListEl.removeChild(formulaListEl.lastElementChild);
      ativosNoPainel--;
    }
    while (ativosNoPainel < alvo) {
      formulaListEl.appendChild(chipDoAtivo(lista[ativosNoPainel]));
      ativosNoPainel++;
    }
    if (mudou) marcarUltimoAberto();
    atualizarPote(ativosNoPainel, mostrar);
  }

  /* A bolinha do ativo sai da resposta escolhida e desce até o painel;
     ao chegar, o selo abre com o nome e o pote enche um pouco. */
  function adicionarAtivoComAnimacao(ativo, origemEl, aoTerminar) {
    var chip = chipDoAtivo(ativo);
    chip.classList.add("is-arriving");
    formulaListEl.appendChild(chip);
    ativosNoPainel++;
    formulaEmptyEl.hidden = true;
    marcarUltimoAberto(); // junta as bolinhas anteriores antes de a nova chegar

    var concluir = function () {
      chip.classList.remove("is-arriving");
      atualizarPote(ativosNoPainel, true);
      formulaCountEl.classList.remove("is-pop");
      void formulaCountEl.offsetWidth;
      formulaCountEl.classList.add("is-pop");
      setTimeout(aoTerminar, PAUSA_DEPOIS_DO_VOO);
    };

    var alvoEl = chip.querySelector(".ativo-icone");
    if (reduzirMovimento() || !alvoEl.animate) {
      concluir();
      return;
    }

    var o = origemEl.getBoundingClientRect();
    var a = alvoEl.getBoundingClientRect();
    var tamanho = a.width;
    var x0 = o.left + o.width / 2 - tamanho / 2;
    var y0 = o.top + o.height / 2 - tamanho / 2;
    var x1 = a.left;
    var y1 = a.top;

    var bola = slotDeImagem("ativo-icone ativo-voando", "", ativo.imagem, "");
    bola.style.width = bola.style.height = tamanho + "px";
    document.body.appendChild(bola);

    // Aparece na resposta, sobe um pouco e desce em curva até o painel
    var anim = bola.animate([
      { transform: "translate(" + x0 + "px," + y0 + "px) scale(0.2)", opacity: 0 },
      { transform: "translate(" + x0 + "px," + (y0 - 18) + "px) scale(1.15)", opacity: 1, offset: 0.22 },
      { transform: "translate(" + (x0 + (x1 - x0) * 0.45) + "px," + (y0 + (y1 - y0) * 0.35) + "px) scale(1.05)", opacity: 1, offset: 0.55 },
      { transform: "translate(" + x1 + "px," + y1 + "px) scale(1)", opacity: 1 }
    ], { duration: DURACAO_VOO, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" });

    anim.onfinish = function () {
      bola.remove();
      concluir();
    };
  }

  /* ---------- Encaixe na tela ----------
     Na etapa da fórmula, a imagem de exemplo (tipo C) e as fotos dos cartões
     (tipo B) mudam de altura para que tudo caiba acima do painel fixo, sem a
     pessoa precisar rolar. */
  var FIGURA_MIN = 56, FIGURA_MAX = 190;
  var FOTO_MIN = 50, FOTO_MAX = 160;

  function encaixarNaTela() {
    if (formulaEl.hidden) return;
    var lista = screenEl.querySelector(".quiz-options, .quiz-cards");
    if (!lista) return;
    var ultimo = screenEl.querySelector(".quiz-continuar") || lista;
    // Posição final do painel (sem contar a animação de entrada dele)
    var limite = window.innerHeight - formulaEl.offsetHeight - 10;
    var sobra = limite - ultimo.getBoundingClientRect().bottom;

    var figura = screenEl.querySelector(".quiz-figura");
    if (figura) {
      var hFig = figura.getBoundingClientRect().height;
      figura.style.height = Math.max(FIGURA_MIN, Math.min(FIGURA_MAX, hFig + sobra)) + "px";
      return;
    }
    var fotos = screenEl.querySelectorAll(".quiz-card-foto");
    if (fotos.length) {
      var colunas = lista.classList.contains("quiz-cards-3") ? 3 : 2;
      var linhas = Math.ceil(fotos.length / colunas);
      var hFoto = fotos[0].getBoundingClientRect().height;
      var nova = Math.max(FOTO_MIN, Math.min(FOTO_MAX, hFoto + sobra / linhas));
      Array.prototype.forEach.call(fotos, function (f) { f.style.height = nova + "px"; });
    }
  }

  window.addEventListener("resize", function () {
    // recomeça do tamanho padrão do CSS e reencaixa
    Array.prototype.forEach.call(screenEl.querySelectorAll(".quiz-figura, .quiz-card-foto"), function (e) {
      e.style.height = "";
    });
    encaixarNaTela();
  });

  /* ---------- Telas ---------- */
  function telaPergunta(tela) {
    var p = tela.pergunta;
    var multipla = p.tipo === "B" && p.multipla;
    var frag = document.createDocumentFragment();

    var titulo = el("h1", "quiz-title", p.titulo);
    titulo.id = "quiz-pergunta";
    frag.appendChild(titulo);

    if (p.subtitulo) frag.appendChild(el("p", "quiz-subtitle", p.subtitulo));

    // Tipo C: imagem de exemplo entre a pergunta e as respostas
    if (p.tipo === "C") {
      frag.appendChild(slotDeImagem("quiz-figura", "Imagem de exemplo", p.imagem, ""));
    }

    var classeLista = p.tipo === "B" ? "quiz-cards" : "quiz-options";
    if (p.tipo === "B" && p.opcoes.length > 4) classeLista += " quiz-cards-3";
    var lista = el("div", classeLista);
    lista.setAttribute("role", multipla ? "group" : "radiogroup");
    lista.setAttribute("aria-labelledby", "quiz-pergunta");

    var salvas = [].concat(respostas[p.id] || []);
    var botaoContinuar = null;

    p.opcoes.forEach(function (op, i) {
      var texto = textoDaOpcao(op);
      var botao = el("button", p.tipo === "B" ? "quiz-card" : "quiz-option");
      botao.type = "button";
      botao.setAttribute("role", multipla ? "checkbox" : "radio");
      botao.style.setProperty("--i", i);
      var marcada = salvas.indexOf(texto) !== -1;
      botao.setAttribute("aria-checked", marcada ? "true" : "false");
      if (marcada) botao.classList.add("is-selected");

      if (p.tipo === "B") {
        botao.appendChild(slotDeImagem("quiz-card-foto", "Foto " + (i + 1), op.imagem, ""));
        botao.appendChild(el("span", "quiz-card-text", texto));
        if (multipla) {
          var check = el("span", "quiz-card-check");
          check.setAttribute("aria-hidden", "true");
          botao.appendChild(check);
        }
      } else {
        var radio = el("span", "quiz-radio");
        radio.setAttribute("aria-hidden", "true");
        botao.appendChild(radio);
        botao.appendChild(el("span", "quiz-option-text", texto));
      }

      botao.addEventListener("click", function () {
        if (multipla) {
          var ligado = !botao.classList.contains("is-selected");
          botao.classList.toggle("is-selected", ligado);
          botao.setAttribute("aria-checked", ligado ? "true" : "false");
          botaoContinuar.disabled = !lista.querySelector(".is-selected");
        } else {
          escolher(tela, texto, botao, lista);
        }
      });
      lista.appendChild(botao);
    });

    frag.appendChild(lista);

    // Seleção múltipla: confirma no botão "Continuar"
    if (multipla) {
      botaoContinuar = el("button", "quiz-continuar", "Continuar");
      botaoContinuar.type = "button";
      botaoContinuar.disabled = salvas.length === 0;
      botaoContinuar.addEventListener("click", function () {
        var escolhidas = Array.prototype.filter.call(lista.children, function (b) {
          return b.classList.contains("is-selected");
        }).map(function (b) {
          return b.querySelector(".quiz-card-text").textContent;
        });
        if (escolhidas.length) confirmar(tela, escolhidas, botaoContinuar);
      });
      frag.appendChild(botaoContinuar);
    }
    return frag;
  }

  var RAIO = 70;
  var CIRCUNFERENCIA = 2 * Math.PI * RAIO;

  function telaCarregamento(tela) {
    var b = tela.bloco;
    var wrap = el("div", "loading");
    wrap.innerHTML =
      '<div class="loading-ring" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Carregando">' +
        '<svg viewBox="0 0 154 154" aria-hidden="true">' +
          '<circle class="loading-track" cx="77" cy="77" r="' + RAIO + '"/>' +
          '<circle class="loading-bar" cx="77" cy="77" r="' + RAIO + '" stroke-dasharray="' + CIRCUNFERENCIA + '" stroke-dashoffset="' + CIRCUNFERENCIA + '"/>' +
        "</svg>" +
        '<span class="loading-pct" data-pct>0%</span>' +
      "</div>" +
      '<p class="loading-text"></p>';

    var texto = wrap.querySelector(".loading-text");
    (b.linhas || []).forEach(function (linha, i) {
      var span = el("span", "loading-line");
      if (i === 0 && b.destaque) {
        span.appendChild(el("em", null, b.destaque));
        span.appendChild(document.createTextNode(" "));
      }
      span.appendChild(document.createTextNode(linha));
      texto.appendChild(span);
    });

    wrap.appendChild(slotDeImagem("loading-photo", "Imagem do carregamento", b.imagem, b.imagemAlt));
    return wrap;
  }

  /* Curva do carregamento (x = tempo de 0 a 1, resultado de 0 a 1):
     - até 55% do tempo sobe de 0% a 90%, começando rápido;
     - depois desacelera aos poucos de 90% a 100%, sem tranco, para dar
       tempo de ler o texto. As duas partes se emendam na mesma velocidade. */
  var CORTE = 0.55;   // momento em que chega a 90%
  var ATE = 0.9;
  var EXP_FINAL = 1.6;
  var VEL_INICIO = 2.6;
  var VEL_EMENDA = (1 - ATE) * EXP_FINAL / (1 - CORTE);

  function curva(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    if (x < CORTE) {
      // Curva de Hermite: sai de 0 com VEL_INICIO e chega a 0,9 com VEL_EMENDA
      var t = x / CORTE, t2 = t * t, t3 = t2 * t;
      return (t3 - 2 * t2 + t) * CORTE * VEL_INICIO +
             (-2 * t3 + 3 * t2) * ATE +
             (t3 - t2) * CORTE * VEL_EMENDA;
    }
    var u = (x - CORTE) / (1 - CORTE);
    return ATE + (1 - ATE) * (1 - Math.pow(1 - u, EXP_FINAL));
  }

  function iniciarCarregamento(tela, indiceTela) {
    var duracao = tela.bloco.duracao || 3300;
    var barra = screenEl.querySelector(".loading-bar");
    var pct = screenEl.querySelector("[data-pct]");
    var ring = screenEl.querySelector(".loading-ring");
    var controle = { cancelado: false };
    carregamentoAtivo = controle;

    preCarregar(imagensDasProximasTelas(indiceTela + 1));

    var inicio = null;
    var ultimo = -1;

    function quadro(agora) {
      if (controle.cancelado) return;
      if (inicio === null) inicio = agora;
      var x = Math.min((agora - inicio) / duracao, 1);
      var v = reduzirMovimento() ? x : curva(x);
      barra.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - v));
      barra.style.opacity = v > 0.004 ? "1" : "0";
      var numero = Math.round(v * 100);
      if (numero !== ultimo) {
        ultimo = numero;
        pct.textContent = numero + "%";
        ring.setAttribute("aria-valuenow", String(numero));
      }
      if (x < 1) {
        requestAnimationFrame(quadro);
      } else {
        ring.classList.add("is-complete");
        setTimeout(function () {
          if (controle.cancelado) return;
          carregamentoAtivo = null;
          // A tela de carregamento não fica no histórico: voltar leva à última pergunta
          history.replaceState({ s: indiceTela + 1 }, "");
          mostrar(indiceTela + 1, "forward");
        }, PAUSA_FIM_CARREGAMENTO);
      }
    }
    requestAnimationFrame(quadro);
  }

  /* Tela provisória até as próximas perguntas chegarem */
  function telaFim() {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("h1", "quiz-title", "Sua fórmula está completa!"));
    frag.appendChild(el("p", "quiz-note", "A página da oferta entra na próxima etapa."));
    return frag;
  }

  function mostrar(indice, direcao) {
    if (carregamentoAtivo) {
      carregamentoAtivo.cancelado = true;
      carregamentoAtivo = null;
    }

    var tela = telas[indice];
    var conteudo =
      tela.tipo === "pergunta" ? telaPergunta(tela) :
      tela.tipo === "carregamento" ? telaCarregamento(tela) :
      telaFim();

    atual = indice;
    atualizarProgresso(tela);
    sincronizarPainel(tela);
    backEl.hidden = tela.tipo === "carregamento";
    quizEl.setAttribute("data-tela", tela.tipo);

    var trocar = function () {
      screenEl.classList.remove("is-leaving", "is-leaving-back", "enter-forward", "enter-back");
      screenEl.innerHTML = "";
      screenEl.appendChild(conteudo);
      void screenEl.offsetWidth; // reinicia a animação de entrada
      screenEl.classList.add(direcao === "back" ? "enter-back" : "enter-forward");
      window.scrollTo(0, 0);
      encaixarNaTela();
      bloqueado = false;
      if (tela.tipo === "carregamento") iniciarCarregamento(tela, indice);
    };

    if (!screenEl.firstChild || reduzirMovimento()) {
      trocar();
      return;
    }
    screenEl.classList.add(direcao === "back" ? "is-leaving-back" : "is-leaving");
    setTimeout(trocar, 170);
  }

  function escolher(tela, texto, botao, lista) {
    if (bloqueado) return;
    Array.prototype.forEach.call(lista.children, function (b) {
      b.classList.remove("is-selected");
      b.setAttribute("aria-checked", "false");
    });
    botao.classList.add("is-selected");
    botao.setAttribute("aria-checked", "true");
    confirmar(tela, texto, botao);
  }

  // Guarda a resposta e segue (com a bolinha do ativo, se a pergunta tiver um)
  function confirmar(tela, resposta, origemBotao) {
    if (bloqueado) return;
    bloqueado = true;

    var p = tela.pergunta;
    respostas[p.id] = resposta;
    salvarRespostas();

    var origem = atual;
    var avancar = function () {
      if (atual !== origem) return; // a pessoa voltou antes de avançar
      var proxima = origem + 1;
      history.pushState({ s: proxima }, "");
      mostrar(proxima, "forward");
    };

    if (tela.bloco === blocoFormula && p.ativo) {
      setTimeout(function () {
        if (atual !== origem) return;
        var origemEl = origemBotao.querySelector(".quiz-card-foto, .quiz-radio") || origemBotao;
        adicionarAtivoComAnimacao(p.ativo, origemEl, avancar);
      }, DELAY_ANTES_DO_VOO);
    } else {
      setTimeout(avancar, DELAY_AVANCAR);
    }
  }

  function voltar() {
    if (atual === 0) {
      window.location.href = "./";
    } else {
      history.back();
    }
  }

  /* Botão voltar do celular/navegador */
  window.addEventListener("popstate", function (e) {
    var destino = e.state && typeof e.state.s === "number" ? e.state.s : 0;
    destino = Math.max(0, Math.min(destino, telas.length - 1));
    mostrar(destino, destino < atual ? "back" : "forward");
  });

  backEl.addEventListener("click", voltar);

  // A imagem da tela de carregamento já vai sendo baixada desde o início
  telas.forEach(function (t) {
    if (t.tipo === "carregamento") preCarregar(t.bloco.imagem ? [t.bloco.imagem] : []);
  });

  // Atalho para testes: quiz.html#formula abre direto na etapa da fórmula
  var inicio = 0;
  if (location.hash === "#formula" && blocoFormula) {
    for (var i = 0; i < telas.length; i++) {
      if (telas[i].bloco === blocoFormula) { inicio = i; break; }
    }
  }

  history.replaceState({ s: inicio }, "");
  mostrar(inicio, "forward");
})();
