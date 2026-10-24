/* Quiz: mostra as telas na ordem de quiz-perguntas.js (perguntas, tela de
   carregamento, perguntas da fórmula...), guarda as respostas e controla o
   botão de voltar (o da tela e o do celular). */
(function () {
  "use strict";

  var STORAGE_KEY = "cellive-quiz-respostas";
  var DELAY_AVANCAR = 380;          // tempo para ver a opção marcada antes de avançar
  var DELAY_ANTES_DO_VOO = 120;     // espera antes de o ativo sair em direção ao painel
  var DURACAO_VOO = 820;            // tempo do ativo descendo até o painel
  var PAUSA_DEPOIS_DO_VOO = 320;    // tempo para ver o ativo entrando na fórmula
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
    } else if (bloco.tipo === "analise") {
      telas.push({ tipo: "analise", bloco: bloco });
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

  function chipDoAtivo(ativo, numero) {
    var li = el("li", "ativo");
    li.appendChild(slotDeImagem("ativo-icone", "", ativo.imagem, ""));
    var textos = el("span", "ativo-textos");
    textos.appendChild(el("span", "ativo-rotulo", "Ativo nº " + (numero < 10 ? "0" : "") + numero));
    textos.appendChild(el("span", "ativo-nome", ativo.nome));
    li.appendChild(textos);
    li.title = ativo.nome;
    return li;
  }

  /* Nível do pote: durante as perguntas ele chega até 82%; o último pedaço
     enche quando os ativos entram todos juntos no final. */
  var NIVEL_PERGUNTAS = 0.82;

  function atualizarPote(n, animar, cheio) {
    var total = blocoFormula.totalAtivos || blocoFormula.perguntas.length;
    var nivel = cheio ? 1 : Math.max((n / total) * NIVEL_PERGUNTAS, 0.035);
    poteFillEl.classList.toggle("sem-transicao", !animar);
    poteFillEl.style.transform = "translateY(" + (163 * (1 - nivel)).toFixed(2) + "px)";
    formulaCountEl.textContent = n + "/" + total;
    formulaEmptyEl.hidden = n > 0;
  }

  /* Deixa só o último ativo aberto (com nome); os anteriores viram bolinhas
     que vão se juntando, uma por cima da outra, ao lado do pote. Quanto mais
     bolinhas, mais elas se sobrepõem, para tudo caber numa linha. */
  var BOLINHA = 28;

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
    var larguraSelo = (nome ? nome.scrollWidth : 120) + 32 + 4 + 10 + 14 + 2;
    var espaco = formulaListEl.clientWidth - larguraSelo - 10;
    var passo = n > 2 ? (espaco - BOLINHA) / (n - 2) : BOLINHA;
    passo = Math.max(7, Math.min(BOLINHA - 6, passo));
    formulaListEl.style.setProperty("--sobrepor", (BOLINHA - passo).toFixed(1) + "px");
  }

  function voltarPainelAoNormal() {
    formulaEl.classList.remove("is-concluding", "is-concluded");
    formulaListEl.classList.remove("is-emptying");
    formulaTitleEl.textContent = "Combinação ideal para sua pele:";
    poteEl.style.removeProperty("--centro");
  }

  // Mostra/esconde o painel e acerta a lista sem animação (ex.: ao voltar)
  function sincronizarPainel(tela) {
    var naFormula = !!blocoFormula && tela.tipo === "pergunta" && tela.bloco === blocoFormula;
    var concluida = !!blocoFormula && tela.tipo === "fim" && formulaConcluida;
    var mostrar = naFormula || concluida;
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

    if (naFormula && formulaEl.classList.contains("is-concluded")) {
      voltarPainelAoNormal();
      formulaConcluida = false;
    }
    if (concluida) {
      if (!formulaEl.classList.contains("is-concluded")) mostrarFormulaConcluida(false);
      return;
    }

    var alvo = ativosAte(tela);
    var lista = ativosDaFormula();
    var mudou = alvo !== ativosNoPainel;
    while (ativosNoPainel > alvo) {
      formulaListEl.removeChild(formulaListEl.lastElementChild);
      ativosNoPainel--;
    }
    while (ativosNoPainel < alvo) {
      formulaListEl.appendChild(chipDoAtivo(lista[ativosNoPainel], ativosNoPainel + 1));
      ativosNoPainel++;
    }
    if (mudou) marcarUltimoAberto();
    atualizarPote(ativosNoPainel, mostrar);
  }

  /* ---------- Movimento suave ----------
     Faz um elemento percorrer uma curva (Bézier) de A até B, quadro a quadro,
     só com transform (é o que deixa a animação fluida no celular). */
  function suavizar(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function voarEmCurva(elemento, de, para, opcoes, aoTerminar) {
    var duracao = opcoes.duracao;
    var altura = opcoes.arco; // quanto a curva sobe antes de descer
    // "para" pode ser uma função: o destino é medido de novo a cada quadro,
    // assim a bolinha acompanha o selo se ele ainda estiver se ajeitando.
    var destino = typeof para === "function" ? para : function () { return para; };
    var inicio = null;
    elemento.style.willChange = "transform, opacity";

    function quadro(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min((agora - inicio) / duracao, 1);
      var alvo = destino();
      var cx = de.x + (alvo.x - de.x) * 0.35;
      var cy = Math.min(de.y, alvo.y) - altura;
      var e = suavizar(t);
      var u = 1 - e;
      var x = u * u * de.x + 2 * u * e * cx + e * e * alvo.x;
      var y = u * u * de.y + 2 * u * e * cy + e * e * alvo.y;
      var escala = opcoes.escala(t);
      var opacidade = opcoes.opacidade ? opcoes.opacidade(t) : 1;
      elemento.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + escala.toFixed(3) + ")";
      elemento.style.opacity = String(opacidade);
      if (t < 1) requestAnimationFrame(quadro);
      else aoTerminar();
    }
    requestAnimationFrame(quadro);
  }

  /* A bolinha do ativo sai da resposta escolhida e desce até o painel;
     ao chegar, o selo abre com o nome e o pote enche um pouco. */
  function adicionarAtivoComAnimacao(ativo, origemEl, aoTerminar) {
    var chip = chipDoAtivo(ativo, ativosNoPainel + 1);
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
    if (reduzirMovimento()) {
      concluir();
      return;
    }

    var o = origemEl.getBoundingClientRect();
    var a = alvoEl.getBoundingClientRect();
    var tamanho = a.width;

    var bola = slotDeImagem("ativo-icone ativo-voando", "", ativo.imagem, "");
    bola.style.width = bola.style.height = tamanho + "px";
    bola.style.opacity = "0";
    document.body.appendChild(bola);

    voarEmCurva(
      bola,
      { x: o.left + o.width / 2 - tamanho / 2, y: o.top + o.height / 2 - tamanho / 2 },
      function () {
        var r = alvoEl.getBoundingClientRect();
        return { x: r.left, y: r.top };
      },
      {
        duracao: DURACAO_VOO,
        arco: 40,
        // cresce ao sair da resposta e assenta no tamanho final ao chegar
        escala: function (t) { return t < 0.2 ? 0.4 + (t / 0.2) * 0.85 : 1.25 - 0.25 * suavizar((t - 0.2) / 0.8); },
        opacidade: function (t) { return Math.min(1, t / 0.12); },
      },
      function () {
        bola.remove();
        concluir();
      }
    );
  }

  /* ---------- Final da fórmula ----------
     Depois da última resposta, todas as bolinhas dos ativos entram no pote,
     ele termina de encher, vai para o meio do painel e o título vira
     "Fórmula concluída". */
  var formulaConcluida = false;
  var formulaTitleEl = $(".formula-title");

  function mostrarFormulaConcluida(animar) {
    formulaConcluida = true;
    formulaEl.classList.add("is-concluded");
    formulaEl.classList.remove("is-concluding");
    formulaTitleEl.textContent = "Fórmula concluída";
    var body = poteEl.parentNode.getBoundingClientRect();
    var pote = poteEl.getBoundingClientRect();
    var centro = body.left + body.width / 2 - (pote.left + pote.width / 2);
    // posição de origem do pote (sem a transformação atual)
    var atualDx = parseFloat(poteEl.style.getPropertyValue("--centro")) || 0;
    poteEl.style.setProperty("--centro", (centro + atualDx).toFixed(1) + "px");
    atualizarPote(ativosNoPainel, animar, true);
  }

  function concluirFormula(aoTerminar) {
    formulaEl.classList.add("is-concluding");
    if (reduzirMovimento()) {
      mostrarFormulaConcluida(false);
      setTimeout(aoTerminar, 600);
      return;
    }

    var icones = Array.prototype.slice.call(formulaListEl.querySelectorAll(".ativo-icone"));
    var p = poteEl.getBoundingClientRect();
    var boca = { x: p.left + p.width / 2, y: p.top + p.height * 0.12 };
    var restantes = icones.length;
    var ESPACO_ENTRE = 55;

    icones.reverse().forEach(function (icone, i) {
      var r = icone.getBoundingClientRect();
      var copia = icone.cloneNode(true);
      copia.classList.add("ativo-voando");
      copia.style.width = copia.style.height = r.width + "px";
      document.body.appendChild(copia);
      copia.style.transform = "translate3d(" + r.left + "px," + r.top + "px,0)";
      setTimeout(function () {
        voarEmCurva(
          copia,
          { x: r.left, y: r.top },
          { x: boca.x - r.width / 2, y: boca.y - r.height / 2 },
          {
            duracao: 620,
            arco: 34,
            escala: function (t) { return 1 - 0.75 * suavizar(t); },
            opacidade: function (t) { return t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; },
          },
          function () {
            copia.remove();
            restantes--;
            if (restantes === 0) {
              mostrarFormulaConcluida(true);
              setTimeout(aoTerminar, 1100);
            }
          }
        );
      }, i * ESPACO_ENTRE);
    });
    // a lista some enquanto as cópias voam para o pote
    formulaListEl.classList.add("is-emptying");
  }

  /* ---------- Encaixe na tela ----------
     Na etapa da fórmula, a imagem de exemplo (tipo C) e as fotos dos cartões
     (tipo B) mudam de altura para que tudo caiba acima do painel fixo, sem a
     pessoa precisar rolar. */
  var FIGURA_MIN = 130;                    // altura mínima da imagem de exemplo
  var FOTO_PROPORCAO_MIN = 0.74;           // fotos da idade: de quadrada até 74% da largura
  var FOTO_SINAIS_MIN = 78;                // fotos dos sinais: altura mínima

  function encaixarNaTela() {
    if (formulaEl.hidden) return;
    var lista = screenEl.querySelector(".quiz-options, .quiz-cards");
    if (!lista) return;
    var ultimo = screenEl.querySelector(".quiz-continuar") || lista;
    // Posição final do painel (sem contar a animação de entrada dele)
    var limite = window.innerHeight - formulaEl.offsetHeight - 14;
    var sobra = limite - ultimo.getBoundingClientRect().bottom;
    if (sobra >= 0) return;

    var figura = screenEl.querySelector(".quiz-figura");
    if (figura) {
      var hFig = figura.getBoundingClientRect().height;
      figura.style.height = Math.max(FIGURA_MIN, hFig + sobra) + "px";
      return;
    }
    var fotos = screenEl.querySelectorAll(".quiz-card-foto");
    if (!fotos.length) return;
    var colunas = lista.classList.contains("quiz-cards-3") ? 3 : 2;
    var linhas = Math.ceil(fotos.length / colunas);
    var r = fotos[0].getBoundingClientRect();
    var minimo = colunas === 3 ? FOTO_SINAIS_MIN : r.width * FOTO_PROPORCAO_MIN;
    var nova = Math.max(minimo, r.height + sobra / linhas);
    Array.prototype.forEach.call(fotos, function (f) { f.style.height = nova + "px"; });
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
          atualizarContinuar();
        } else {
          escolher(tela, texto, botao, lista);
        }
      });
      lista.appendChild(botao);
    });

    frag.appendChild(lista);

    // Seleção múltipla: confirma no botão "Continuar"
    function atualizarContinuar() {
      var n = lista.querySelectorAll(".is-selected").length;
      botaoContinuar.disabled = n === 0;
      botaoContinuar.textContent = n === 0 ? "Escolha ao menos um" : "Continuar (" + n + ")";
    }

    if (multipla) {
      botaoContinuar = el("button", "quiz-continuar");
      botaoContinuar.type = "button";
      atualizarContinuar();
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

  /* ---------- Análise (carregamento depois da fórmula) ----------
     Anel de 0% a 100% e uma lista de etapas que vão sendo checadas. O anel
     avança em ondas suaves, uma por etapa, como se cada item fosse analisado. */
  function telaAnalise(tela) {
    var b = tela.bloco;
    var wrap = el("div", "analise");
    wrap.appendChild(el("h1", "quiz-title analise-titulo", b.titulo));
    if (b.subtitulo) wrap.appendChild(el("p", "quiz-subtitle analise-sub", b.subtitulo));

    var ring = el("div", "loading-ring analise-ring");
    ring.setAttribute("role", "progressbar");
    ring.setAttribute("aria-valuemin", "0");
    ring.setAttribute("aria-valuemax", "100");
    ring.setAttribute("aria-valuenow", "0");
    ring.setAttribute("aria-label", b.titulo);
    ring.innerHTML =
      '<svg viewBox="0 0 154 154" aria-hidden="true">' +
        '<circle class="loading-track" cx="77" cy="77" r="' + RAIO + '"/>' +
        '<circle class="loading-bar" cx="77" cy="77" r="' + RAIO + '" stroke-dasharray="' + CIRCUNFERENCIA + '" stroke-dashoffset="' + CIRCUNFERENCIA + '"/>' +
      "</svg>" +
      '<span class="loading-pct" data-pct>0%</span>';
    wrap.appendChild(ring);

    var lista = el("ul", "analise-etapas");
    lista.setAttribute("aria-live", "polite");
    b.etapas.forEach(function (etapa, i) {
      var li = el("li", "analise-etapa");
      li.style.setProperty("--i", i);
      var icone = el("span", "analise-icone");
      icone.setAttribute("aria-hidden", "true");
      li.appendChild(icone);
      li.appendChild(el("span", "analise-texto", etapa.texto));
      lista.appendChild(li);
    });
    wrap.appendChild(lista);
    return wrap;
  }

  function iniciarAnalise(tela, indiceTela) {
    var etapas = tela.bloco.etapas;
    var duracoes = etapas.map(function (e) { return e.duracao || 1600; });
    var total = duracoes.reduce(function (a, d) { return a + d; }, 0);
    var barra = screenEl.querySelector(".loading-bar");
    var pct = screenEl.querySelector("[data-pct]");
    var ring = screenEl.querySelector(".analise-ring");
    var itens = screenEl.querySelectorAll(".analise-etapa");
    var controle = { cancelado: false };
    carregamentoAtivo = controle;

    preCarregar(imagensDasProximasTelas(indiceTela + 1));

    var inicio = null;
    var ultimo = -1;
    var etapaAtual = -1;

    function marcar(indice) {
      for (var i = 0; i < itens.length; i++) {
        itens[i].classList.toggle("is-feita", i < indice);
        itens[i].classList.toggle("is-ativa", i === indice);
      }
    }

    function quadro(agora) {
      if (controle.cancelado) return;
      if (inicio === null) inicio = agora;
      var passado = Math.min(agora - inicio, total);

      // Em qual etapa estamos e quanto dela já passou
      var i = 0, acumulado = 0;
      while (i < duracoes.length - 1 && passado > acumulado + duracoes[i]) {
        acumulado += duracoes[i];
        i++;
      }
      var local = Math.min((passado - acumulado) / duracoes[i], 1);
      var v = (i + (reduzirMovimento() ? local : suavizar(local))) / duracoes.length;

      if (i !== etapaAtual) {
        etapaAtual = i;
        marcar(i);
      }
      barra.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - v));
      barra.style.opacity = v > 0.004 ? "1" : "0";
      var numero = Math.round(v * 100);
      if (numero !== ultimo) {
        ultimo = numero;
        pct.textContent = numero + "%";
        ring.setAttribute("aria-valuenow", String(numero));
      }

      if (passado < total) {
        requestAnimationFrame(quadro);
      } else {
        marcar(itens.length); // todas checadas
        ring.classList.add("is-complete");
        setTimeout(function () {
          if (controle.cancelado) return;
          carregamentoAtivo = null;
          // A análise não fica no histórico: voltar leva à última pergunta
          history.replaceState({ s: indiceTela + 1 }, "");
          mostrar(indiceTela + 1, "forward");
        }, tela.bloco.pausaFinal || 700);
      }
    }
    requestAnimationFrame(quadro);
  }

  /* Tela provisória até a próxima etapa chegar */
  function telaFim() {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("h1", "quiz-title", "Estamos montando sua fórmula"));
    frag.appendChild(el("p", "quiz-note", "Esta tela entra na próxima etapa."));
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
      tela.tipo === "analise" ? telaAnalise(tela) :
      telaFim();

    atual = indice;
    atualizarProgresso(tela);
    sincronizarPainel(tela);
    backEl.hidden = tela.tipo === "carregamento" || tela.tipo === "analise";
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
      if (tela.tipo === "analise") iniciarAnalise(tela, indice);
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
        var ultima = tela.indice === tela.bloco.perguntas.length - 1;
        adicionarAtivoComAnimacao(p.ativo, origemEl, ultima ? function () {
          if (atual !== origem) return;
          concluirFormula(avancar);
        } : avancar);
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

  // Atalhos para testes: quiz.html#formula abre na etapa da fórmula e
  // quiz.html#analise abre direto na tela de análise
  var inicio = 0;
  for (var i = 0; i < telas.length; i++) {
    if (location.hash === "#formula" && telas[i].bloco === blocoFormula) { inicio = i; break; }
    if (location.hash === "#analise" && telas[i].tipo === "analise") { inicio = i; break; }
  }

  history.replaceState({ s: inicio }, "");
  mostrar(inicio, "forward");
})();
