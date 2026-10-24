/* Quiz: mostra as telas na ordem de quiz-perguntas.js (perguntas, tela de
   carregamento...), guarda as respostas e controla o botão de voltar (o da
   tela e o do celular). */
(function () {
  "use strict";

  var STORAGE_KEY = "cellive-quiz-respostas";
  var DELAY_AVANCAR = 380;      // tempo para a pessoa ver a opção marcada antes de avançar
  var PAUSA_FIM_CARREGAMENTO = 350; // fica um instante em 100% antes de seguir

  var stepperEl = document.querySelector("[data-stepper]");
  var screenEl = document.querySelector("[data-screen]");
  var backEl = document.querySelector("[data-back]");
  var quizEl = document.querySelector(".quiz");

  /* Transforma o fluxo numa lista simples de telas */
  var telas = [];
  window.QUIZ_FLUXO.forEach(function (bloco) {
    if (bloco.tipo === "etapa") {
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

  // Procura campos "imagem"/"imagens" em qualquer parte de um objeto
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
      if (telas[i].bloco && telas[i].tipo === "carregamento") imagensDe(telas[i].bloco, lista);
    }
    return lista;
  }

  /* ---------- Progresso 1 · 2 · 3 ---------- */
  function montarStepper(bloco) {
    stepperBloco = bloco;
    stepperEl.innerHTML = "";
    bloco.perguntas.forEach(function (_, i) {
      var li = document.createElement("li");
      li.className = "step";
      li.textContent = String(i + 1);
      stepperEl.appendChild(li);
    });
  }

  function atualizarStepper(tela) {
    var mostrar = tela.tipo === "pergunta";
    stepperEl.hidden = !mostrar;
    if (!mostrar) return;
    if (stepperBloco !== tela.bloco) montarStepper(tela.bloco);

    var passos = stepperEl.children;
    for (var i = 0; i < passos.length; i++) {
      passos[i].classList.toggle("is-done", i < tela.indice);
      passos[i].classList.toggle("is-current", i === tela.indice);
      if (i === tela.indice) passos[i].setAttribute("aria-current", "step");
      else passos[i].removeAttribute("aria-current");
    }
    stepperEl.setAttribute("aria-label", "Pergunta " + (tela.indice + 1) + " de " + passos.length);
  }

  /* ---------- Telas ---------- */
  function telaPergunta(tela) {
    var p = tela.pergunta;
    var frag = document.createDocumentFragment();

    var titulo = document.createElement("h1");
    titulo.className = "quiz-title";
    titulo.id = "quiz-pergunta";
    titulo.textContent = p.titulo;
    frag.appendChild(titulo);

    var lista = document.createElement("div");
    lista.className = "quiz-options";
    lista.setAttribute("role", "radiogroup");
    lista.setAttribute("aria-labelledby", "quiz-pergunta");

    p.opcoes.forEach(function (texto, i) {
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "quiz-option";
      botao.setAttribute("role", "radio");
      botao.style.setProperty("--i", i);
      var marcada = respostas[p.id] === texto;
      botao.setAttribute("aria-checked", marcada ? "true" : "false");
      if (marcada) botao.classList.add("is-selected");

      var radio = document.createElement("span");
      radio.className = "quiz-radio";
      radio.setAttribute("aria-hidden", "true");

      var rotulo = document.createElement("span");
      rotulo.className = "quiz-option-text";
      rotulo.textContent = texto;

      botao.appendChild(radio);
      botao.appendChild(rotulo);
      botao.addEventListener("click", function () {
        escolher(p, texto, botao, lista);
      });
      lista.appendChild(botao);
    });

    frag.appendChild(lista);
    return frag;
  }

  var RAIO = 70;
  var CIRCUNFERENCIA = 2 * Math.PI * RAIO;

  function telaCarregamento(tela) {
    var b = tela.bloco;
    var wrap = document.createElement("div");
    wrap.className = "loading";
    wrap.innerHTML =
      '<div class="loading-ring" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Carregando">' +
        '<svg viewBox="0 0 154 154" aria-hidden="true">' +
          '<circle class="loading-track" cx="77" cy="77" r="' + RAIO + '"/>' +
          '<circle class="loading-bar" cx="77" cy="77" r="' + RAIO + '" stroke-dasharray="' + CIRCUNFERENCIA + '" stroke-dashoffset="' + CIRCUNFERENCIA + '"/>' +
        "</svg>" +
        '<span class="loading-pct" data-pct>0%</span>' +
      "</div>" +
      '<p class="loading-text"></p>' +
      '<span class="slot loading-photo" data-label="Imagem do carregamento"></span>';

    var texto = wrap.querySelector(".loading-text");
    (b.linhas || []).forEach(function (linha, i) {
      var span = document.createElement("span");
      span.className = "loading-line";
      if (i === 0 && b.destaque) {
        var em = document.createElement("em");
        em.textContent = b.destaque;
        span.appendChild(em);
        span.appendChild(document.createTextNode(" "));
      }
      span.appendChild(document.createTextNode(linha));
      texto.appendChild(span);
    });

    if (b.imagem) {
      var img = document.createElement("img");
      img.src = b.imagem;
      img.alt = b.imagemAlt || "";
      img.decoding = "async";
      img.addEventListener("error", function () { img.hidden = true; });
      wrap.querySelector(".loading-photo").appendChild(img);
    }
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
    var b = tela.bloco;
    var duracao = b.duracao || 3300;
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
    var titulo = document.createElement("h1");
    titulo.className = "quiz-title";
    titulo.textContent = "Próximas perguntas em breve.";
    var texto = document.createElement("p");
    texto.className = "quiz-note";
    texto.textContent = "Esta parte do quiz ainda está sendo montada.";
    frag.appendChild(titulo);
    frag.appendChild(texto);
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
    atualizarStepper(tela);
    backEl.hidden = tela.tipo === "carregamento";
    quizEl.setAttribute("data-tela", tela.tipo);

    var trocar = function () {
      screenEl.classList.remove("is-leaving", "is-leaving-back", "enter-forward", "enter-back");
      screenEl.innerHTML = "";
      screenEl.appendChild(conteudo);
      void screenEl.offsetWidth; // reinicia a animação de entrada
      screenEl.classList.add(direcao === "back" ? "enter-back" : "enter-forward");
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

  function escolher(pergunta, texto, botao, lista) {
    if (bloqueado) return;
    bloqueado = true;

    Array.prototype.forEach.call(lista.children, function (b) {
      b.classList.remove("is-selected");
      b.setAttribute("aria-checked", "false");
    });
    botao.classList.add("is-selected");
    botao.setAttribute("aria-checked", "true");

    respostas[pergunta.id] = texto;
    salvarRespostas();

    var origem = atual;
    setTimeout(function () {
      if (atual !== origem) return; // a pessoa voltou antes de avançar
      var proxima = origem + 1;
      history.pushState({ s: proxima }, "");
      mostrar(proxima, "forward");
    }, DELAY_AVANCAR);
  }

  function voltar() {
    if (atual === 0) {
      window.location.href = "./";
    } else {
      history.back();
    }
  }

  function reduzirMovimento() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  history.replaceState({ s: 0 }, "");
  mostrar(0, "forward");
})();
