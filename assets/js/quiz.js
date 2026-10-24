/* Quiz: mostra uma pergunta por vez, guarda as respostas e controla o
   botão de voltar (o da tela e o do celular). As perguntas ficam em
   quiz-perguntas.js. */
(function () {
  "use strict";

  var etapa = window.QUIZ_ETAPAS[0];
  var perguntas = etapa.perguntas;
  var total = perguntas.length;
  var STORAGE_KEY = "cellive-quiz-respostas";
  var DELAY_AVANCAR = 380; // tempo para a pessoa ver a opção marcada antes de avançar

  var stepperEl = document.querySelector("[data-stepper]");
  var screenEl = document.querySelector("[data-screen]");
  var backEl = document.querySelector("[data-back]");

  var atual = 0;
  var bloqueado = false;
  var respostas = carregarRespostas();

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

  /* Bolinhas 1, 2, 3 do topo */
  function montarStepper() {
    stepperEl.innerHTML = "";
    for (var i = 0; i < total; i++) {
      var li = document.createElement("li");
      li.className = "step";
      li.textContent = String(i + 1);
      stepperEl.appendChild(li);
    }
  }

  function atualizarStepper(indice) {
    var passos = stepperEl.children;
    for (var i = 0; i < passos.length; i++) {
      passos[i].classList.toggle("is-done", i < indice);
      passos[i].classList.toggle("is-current", i === indice);
      if (i === indice) {
        passos[i].setAttribute("aria-current", "step");
      } else {
        passos[i].removeAttribute("aria-current");
      }
    }
    stepperEl.setAttribute("aria-label", "Pergunta " + Math.min(indice + 1, total) + " de " + total);
  }

  function telaPergunta(indice) {
    var p = perguntas[indice];
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
        escolher(indice, texto, botao, lista);
      });
      lista.appendChild(botao);
    });

    frag.appendChild(lista);
    return frag;
  }

  /* Tela provisória depois da última pergunta desta etapa */
  function telaFimEtapa() {
    var frag = document.createDocumentFragment();
    var titulo = document.createElement("h1");
    titulo.className = "quiz-title";
    titulo.textContent = "Ótimo! Primeira etapa concluída.";
    var texto = document.createElement("p");
    texto.className = "quiz-note";
    texto.textContent = "As próximas perguntas entram na próxima etapa.";
    frag.appendChild(titulo);
    frag.appendChild(texto);
    return frag;
  }

  function mostrar(indice, direcao) {
    var conteudo = indice < total ? telaPergunta(indice) : telaFimEtapa();
    atual = indice;
    atualizarStepper(indice);

    var trocar = function () {
      screenEl.classList.remove("is-leaving", "is-leaving-back", "enter-forward", "enter-back");
      screenEl.innerHTML = "";
      screenEl.appendChild(conteudo);
      void screenEl.offsetWidth; // reinicia a animação de entrada
      screenEl.classList.add(direcao === "back" ? "enter-back" : "enter-forward");
      bloqueado = false;
    };

    if (!screenEl.firstChild || reduzirMovimento()) {
      trocar();
      return;
    }
    screenEl.classList.add(direcao === "back" ? "is-leaving-back" : "is-leaving");
    setTimeout(trocar, 170);
  }

  function escolher(indice, texto, botao, lista) {
    if (bloqueado) return;
    bloqueado = true;

    Array.prototype.forEach.call(lista.children, function (b) {
      b.classList.remove("is-selected");
      b.setAttribute("aria-checked", "false");
    });
    botao.classList.add("is-selected");
    botao.setAttribute("aria-checked", "true");

    respostas[perguntas[indice].id] = texto;
    salvarRespostas();

    setTimeout(function () {
      var proxima = indice + 1;
      history.pushState({ q: proxima }, "");
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
    var destino = e.state && typeof e.state.q === "number" ? e.state.q : 0;
    mostrar(destino, destino < atual ? "back" : "forward");
  });

  backEl.addEventListener("click", voltar);

  montarStepper();
  history.replaceState({ q: 0 }, "");
  mostrar(0, "forward");
})();
