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
  var RETRATO_MIN = 120;                   // fotos 2:3 (idade): altura mínima

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
      // Mantém a proporção 3:2: se perde altura, perde largura junto
      var hFig = figura.getBoundingClientRect().height;
      var novaAlt = Math.max(FIGURA_MIN, hFig + sobra);
      figura.style.height = novaAlt + "px";
      figura.style.width = Math.min(figura.parentNode.clientWidth, novaAlt * 1.5) + "px";
      return;
    }
    var fotos = screenEl.querySelectorAll(".quiz-card-foto");
    if (!fotos.length) return;

    // Fotos em 2:3: para manter a proporção, a grade fica mais estreita
    // (centralizada) até os cartões caberem acima do painel.
    if (lista.classList.contains("quiz-cards-retrato")) {
      for (var tentativa = 0; tentativa < 6 && sobra < 0; tentativa++) {
        var foto = fotos[0].getBoundingClientRect();
        var cartao = lista.firstElementChild.getBoundingClientRect();
        var novaAltura = Math.max(RETRATO_MIN, foto.height + sobra / 2);
        var novaLargura = novaAltura * 2 / 3;
        var folga = cartao.width - foto.width;
        var gap = parseFloat(getComputedStyle(lista).columnGap) || 0;
        lista.style.maxWidth = (2 * (novaLargura + folga) + gap + 4).toFixed(1) + "px";
        sobra = limite - ultimo.getBoundingClientRect().bottom;
      }
      return;
    }
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
      e.style.width = "";
    });
    var grade = screenEl.querySelector(".quiz-cards-retrato");
    if (grade) grade.style.maxWidth = "";
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
    if (p.formato === "retrato") classeLista += " quiz-cards-retrato";
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
        var rotulo = el("span", "quiz-card-text", texto);
        // Retrato: "Entre 18 - 25 anos" vira "ENTRE" pequeno + "18 - 25 anos"
        var partes = p.formato === "retrato" && (texto.match(/^(Entre)\s+(.+)$/) || texto.match(/^\+\s*(\d+ anos)$/));
        if (partes) {
          rotulo.textContent = "";
          rotulo.appendChild(el("small", null, partes.length === 3 ? partes[1] : "Mais de"));
          rotulo.appendChild(el("span", null, partes.length === 3 ? partes[2] : partes[1]));
        }
        botao.appendChild(rotulo);
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
     Um rosto em traço fino é "escaneado"; a cada etapa, um ponto pulsa numa
     região da pele com uma etiqueta, a barra avança e a etapa é checada. */
  var ICONES_PELE = {
    gota: '<path d="M12 3.5s-5.5 6.2-5.5 10.2a5.5 5.5 0 0 0 11 0C17.5 9.7 12 3.5 12 3.5z"/><path d="M9.6 14.6a2.6 2.6 0 0 0 2.4 2.2"/>',
    escudo: '<path d="M12 3.5l6.5 2.6v5.2c0 4.3-2.8 7.3-6.5 9.2-3.7-1.9-6.5-4.9-6.5-9.2V6.1z"/><path d="M9.3 12.2l1.9 1.9 3.6-3.8"/>',
    linhas: '<path d="M4.5 8.5c2.5-2 5-2 7.5 0s5 2 7.5 0"/><path d="M4.5 13c2.5-2 5-2 7.5 0s5 2 7.5 0"/><path d="M4.5 17.5c2.5-2 5-2 7.5 0s5 2 7.5 0"/>',
  };

  // Rosto minimalista (viewBox 200 × 240): só o cabelo e o contorno do rosto
  var ROSTO_SVG =
    '<svg class="analise-rosto-svg" viewBox="0 0 200 240" aria-hidden="true">' +
      '<path class="analise-cabelo" d="M100 20C56 20 36 56 38 100c2 40-6 72 4 106 14 10 28 10 38 0v-56h40v56c10 10 24 10 38 0 10-34 2-66 4-106 2-44-18-80-62-80z"/>' +
      '<path class="analise-face" d="M100 40C68 40 54 72 56 108c2 38 20 76 44 86 24-10 42-48 44-86 2-36-12-68-44-68z"/>' +
      '<path class="analise-cabelo" d="M57 102c1-38 20-58 45-58 24 0 39 16 42 46-14-18-32-26-56-22-16 3-26 15-31 34z"/>' +
    "</svg>";

  function telaAnalise(tela) {
    var b = tela.bloco;
    var wrap = el("div", "analise");
    var titulo = el("h1", "analise-titulo");
    titulo.appendChild(el("span", "analise-titulo-leve", b.titulo));
    if (b.destaque) {
      titulo.appendChild(document.createTextNode(" "));
      titulo.appendChild(el("strong", "analise-titulo-forte", b.destaque));
    }
    wrap.appendChild(titulo);
    if (b.subtitulo) wrap.appendChild(el("p", "quiz-subtitle analise-sub", b.subtitulo));

    // Cartão com o rosto sendo escaneado
    var cartao = el("div", "analise-cartao");
    var rosto = el("div", "analise-rosto");
    rosto.innerHTML = ROSTO_SVG;
    b.etapas.forEach(function (etapa, i) {
      (etapa.pontos || []).forEach(function (ponto) {
        var pino = el("span", "analise-ponto");
        pino.setAttribute("data-etapa", i);
        pino.style.left = (ponto.x / 200) * 100 + "%";
        pino.style.top = (ponto.y / 240) * 100 + "%";
        rosto.appendChild(pino);
      });
    });
    cartao.appendChild(rosto);
    cartao.appendChild(el("span", "analise-scan"));

    wrap.appendChild(cartao);

    // Barra de progresso lisa
    var progresso = el("div", "analise-progresso");
    progresso.setAttribute("role", "progressbar");
    progresso.setAttribute("aria-valuemin", "0");
    progresso.setAttribute("aria-valuemax", "100");
    progresso.setAttribute("aria-valuenow", "0");
    progresso.setAttribute("aria-label", b.titulo + (b.destaque ? " " + b.destaque : ""));
    progresso.innerHTML =
      '<span class="analise-barra"><span class="analise-barra-fill" data-fill></span></span>' +
      '<span class="analise-pct" data-pct>0%</span>';
    wrap.appendChild(progresso);

    // Uma etapa por vez: aparece, ganha o check, sai e entra a próxima
    var palco = el("div", "analise-palco");
    palco.setAttribute("aria-live", "polite");
    b.etapas.forEach(function (etapa) {
      var item = el("div", "analise-passo");
      var icone = el("span", "analise-icone");
      icone.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONES_PELE[etapa.icone] || ICONES_PELE.gota) + "</svg>";
      item.appendChild(icone);
      item.appendChild(el("span", "analise-texto", etapa.texto));
      var status = el("span", "analise-status");
      status.setAttribute("aria-hidden", "true");
      item.appendChild(status);
      palco.appendChild(item);
    });
    wrap.appendChild(palco);

    var pontinhos = el("div", "analise-pontinhos");
    pontinhos.setAttribute("aria-hidden", "true");
    b.etapas.forEach(function () { pontinhos.appendChild(el("span")); });
    wrap.appendChild(pontinhos);
    return wrap;
  }

  function iniciarAnalise(tela, indiceTela) {
    var etapas = tela.bloco.etapas;
    var duracoes = etapas.map(function (e) { return e.duracao || 850; });
    var total = duracoes.reduce(function (a, d) { return a + d; }, 0);
    var fill = screenEl.querySelector("[data-fill]");
    var pct = screenEl.querySelector("[data-pct]");
    var barra = screenEl.querySelector(".analise-progresso");
    var passos = screenEl.querySelectorAll(".analise-passo");
    var pontinhos = screenEl.querySelectorAll(".analise-pontinhos span");
    var pontos = screenEl.querySelectorAll(".analise-ponto");
    var controle = { cancelado: false };
    carregamentoAtivo = controle;

    preCarregar(imagensDasProximasTelas(indiceTela + 1));

    var inicio = null;
    var ultimo = -1;
    var etapaAtual = -1;
    var CHECK_EM = 0.72;  // momento da etapa em que aparece o check
    var SAI_EM = 0.88;    // momento em que a etapa começa a sair

    function entrarNaEtapa(indice) {
      Array.prototype.forEach.call(passos, function (p, i) {
        p.classList.toggle("is-ativa", i === indice);
        if (i < indice) {
          p.classList.remove("is-ativa", "is-feita");
          p.classList.add("is-saiu");
        }
      });
      Array.prototype.forEach.call(pontinhos, function (d, i) {
        d.classList.toggle("is-feito", i < indice);
        d.classList.toggle("is-atual", i === indice);
      });
      Array.prototype.forEach.call(pontos, function (p) {
        var e = Number(p.getAttribute("data-etapa"));
        p.classList.toggle("is-visivel", e <= indice);
        p.classList.toggle("is-ativo", e === indice);
      });
    }

    function quadro(agora) {
      if (controle.cancelado) return;
      if (inicio === null) inicio = agora;
      var passado = Math.min(agora - inicio, total);

      var i = 0, acumulado = 0;
      while (i < duracoes.length - 1 && passado >= acumulado + duracoes[i]) {
        acumulado += duracoes[i];
        i++;
      }
      var local = Math.min((passado - acumulado) / duracoes[i], 1);
      // Barra contínua: uma curva só, suave, do começo ao fim
      var x = passado / total;
      var v = reduzirMovimento() ? x : 0.55 * x + 0.45 * (0.5 - Math.cos(Math.PI * x) / 2);

      if (i !== etapaAtual) {
        etapaAtual = i;
        entrarNaEtapa(i);
      }
      var passo = passos[i];
      passo.classList.toggle("is-feita", local >= CHECK_EM);
      if (i < passos.length - 1) passo.classList.toggle("is-saindo", local >= SAI_EM);

      fill.style.transform = "scaleX(" + v.toFixed(4) + ")";
      var numero = Math.round(v * 100);
      if (numero !== ultimo) {
        ultimo = numero;
        pct.textContent = numero + "%";
        barra.setAttribute("aria-valuenow", String(numero));
      }

      if (passado < total) {
        requestAnimationFrame(quadro);
      } else {
        Array.prototype.forEach.call(pontinhos, function (d) { d.classList.add("is-feito"); });
        screenEl.querySelector(".analise").classList.add("is-completa");
        setTimeout(function () {
          if (controle.cancelado) return;
          carregamentoAtivo = null;
          // A análise não fica no histórico: voltar leva à última pergunta
          history.replaceState({ s: indiceTela + 1 }, "");
          mostrar(indiceTela + 1, "forward");
        }, tela.bloco.pausaFinal || 300);
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
