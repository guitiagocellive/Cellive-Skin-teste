/* Seção "Sua fórmula personalizada" da página de oferta.
   Mostra os 12 ativos do quiz (nome e imagem vêm do quiz-perguntas.js), a
   resposta que a pessoa deu na pergunta de cada ativo e uma explicação curta:
   - "beneficio": o que o ativo faz, em uma linha (aparece sempre)
   - "resposta": por que ele é bom para aquela resposta (uma frase curta por opção)
   Se a pessoa chegou na oferta sem fazer o quiz, aparece só o "beneficio".
   Para mudar um texto, edite este arquivo. As chaves de "resposta" precisam
   ser iguais ao texto da opção em quiz-perguntas.js. */
(function () {
  "use strict";

  var COPY = {
    "acido-hialuronico": {
      beneficio: "Hidratação profunda que preenche as linhas finas",
      resposta: {
        "Entre 18 - 25 anos": "Hidratar agora adia os primeiros sinais.",
        "Entre 25 - 35 anos": "Repõe a água que a pele começa a perder nessa fase.",
        "Entre 35 - 40 anos": "Repõe o que a pele passa a produzir cada vez menos.",
        "+40 anos": "Compensa a queda natural do ácido hialurônico após os 40.",
      },
    },
    "pdrn": {
      beneficio: "Regenera e fortalece a barreira da pele",
      resposta: {
        "Sim, minha pele é bastante sensível.": "Acalma e recupera sem agredir a pele sensível.",
        "Às vezes irrita.": "Deixa a pele mais forte contra as irritações.",
        "Raramente.": "Foca em acelerar a renovação da sua pele.",
        "Minha pele não é sensível.": "Sua pele tolera bem, então ele vai direto na regeneração.",
      },
    },
    "ghk-cu": {
      beneficio: "Estimula o colágeno e devolve a firmeza",
      resposta: {
        "Sim, inclusive já fiz.": "Ajuda a manter o resultado dos procedimentos.",
        "Já pensei, mas acho muito invasivo.": "Firmeza sem agulhas e sem tempo de recuperação.",
        "Nunca pensei.": "Firmeza no dia a dia, sem procedimentos.",
      },
    },
    "acetyl-hexapeptide-8": {
      beneficio: "Relaxa as linhas de expressão (efeito botox-like)",
      resposta: {
        "Sim, ficam bem marcadas.": "Suaviza as linhas que já ficam marcadas na testa.",
        "Algumas linhas já ficam visíveis.": "Suaviza as linhas antes que fiquem profundas.",
        "Nunca reparei.": "Previne as linhas de expressão da testa.",
      },
    },
    "pentapeptide-4": {
      beneficio: "Estimula o colágeno com o uso contínuo",
      resposta: {
        "Sim, mas sem resultados.": "Age no colágeno, para o resultado aparecer de verdade.",
        "Sim, mas esquecia de usar.": "Um passo só, à noite: fácil de manter.",
        "Só usei alguns produtos.": "Completa sua rotina com um anti-idade de verdade.",
        "Nunca tentei.": "Um começo simples: um passo só, à noite.",
      },
    },
    "retinal": {
      beneficio: "Renovação celular mais rápida que o retinol",
      // Pergunta de várias escolhas: a frase usa os sinais marcados
      lista: function (sinais) {
        return "Renova a pele e suaviza " + juntar(sinais) + ".";
      },
    },
    "propilenoglicol": {
      beneficio: "Leva os ativos mais fundo e prolonga a hidratação",
      resposta: {
        "Todos os dias.": "Com seu protetor diário, potencializa cada ativo.",
        "Na maioria dos dias.": "Mantém a hidratação. E use o protetor todos os dias.",
        "Apenas quando fico muito tempo no sol.": "Hidrata no dia a dia. O protetor diário protege o resultado.",
        "Quase nunca.": "Recupera a hidratação. Inclua o protetor solar de manhã.",
      },
    },
    "glutationa": {
      beneficio: "Antioxidante que protege o colágeno e ilumina",
      resposta: {
        "Sim, percebo claramente.": "Protege o colágeno que sustenta a sua pele.",
        "Comecei a perceber.": "Age logo no começo da perda de firmeza.",
        "Não percebo.": "Mantém a sua firmeza por mais tempo.",
      },
    },
    "tetrapeptide-7": {
      beneficio: "Acalma a pele e devolve o viço",
      resposta: {
        "Sinto que perdi minha autoestima.": "Devolve a aparência saudável que você quer ver.",
        "Sinto que minha pele está envelhecida.": "Renova a pele para um aspecto mais jovem.",
        "Percebo uma pele sem viço ou opaca.": "Devolve o brilho e o aspecto descansado.",
      },
    },
    "alfa-arbutina": {
      beneficio: "Uniformiza o tom e clareia manchas",
      resposta: {
        "Sim, uso retinol ou algum retinoide.": "Combina com retinoides e cuida das manchas.",
        "Uso séruns anti-idade.": "Soma a uniformização do tom ao seu anti-idade.",
        "Já usei, mas parei.": "Suave, ajuda você a retomar sem irritar.",
        "Nunca utilizei.": "Um começo suave para clarear manchas.",
      },
    },
    "exo-skin": {
      beneficio: "Exossomos que aceleram a renovação da pele",
      resposta: {
        "Sim, uso retinol ou algum retinoide.": "Recuperação mais rápida e confortável da pele.",
        "Uso séruns anti-idade.": "Um passo além no seu cuidado anti-idade.",
        "Nunca utilizei.": "Você já começa com a tecnologia mais atual.",
      },
    },
    "niacinamida": {
      beneficio: "Fortalece a pele e melhora a elasticidade",
      resposta: {
        "Sim, inclusive isso me incomoda.": "Melhora a elasticidade ao redor dos olhos.",
        "Sim, as minhas aparecem até relaxada.": "Deixa as linhas dos olhos menos marcadas.",
        "Não percebo.": "Previne as linhas ao redor dos olhos.",
      },
    },
  };

  var VISIVEIS = 5; // quantos ativos aparecem antes do botão "Ver mais"

  var lista = document.querySelector("[data-formula-lista]");
  var extra = document.querySelector("[data-formula-extra]");
  var botaoMais = document.querySelector("[data-formula-mais]");
  if (!lista || !window.QUIZ_FLUXO) return;

  function juntar(itens) {
    var t = itens.map(function (s) { return s.toLowerCase(); });
    if (t.length < 2) return t.join("");
    return t.slice(0, -1).join(", ") + " e " + t[t.length - 1];
  }

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  var respostas = {};
  try { respostas = JSON.parse(sessionStorage.getItem("cellive-quiz-respostas")) || {}; } catch (e) { /* sem quiz */ }

  var formula = window.QUIZ_FLUXO.filter(function (b) { return b.tipo === "formula"; })[0];
  if (!formula) return;

  function cartao(p, numero) {
    var ativo = p.ativo;
    var copy = COPY[ativo.id] || {};
    var resposta = respostas[p.id];
    var temResposta = Array.isArray(resposta) ? resposta.length > 0 : !!resposta;

    var li = el("li", "fp-item");
    li.style.setProperty("--i", (numero - 1) % VISIVEIS);

    var bolha = el("span", "fp-bolha");
    var img = el("img");
    img.src = ativo.imagem;
    img.alt = "";
    img.loading = "lazy";
    img.width = 120;
    img.height = 120;
    bolha.appendChild(img);
    li.appendChild(bolha);

    var corpo = el("div", "fp-corpo");
    var topo = el("div", "fp-cabeca");
    topo.appendChild(el("h3", "fp-nome", ativo.nome));
    topo.appendChild(el("span", "fp-numero", "Nº " + (numero < 10 ? "0" : "") + numero));
    corpo.appendChild(topo);
    corpo.appendChild(el("p", "fp-beneficio", copy.beneficio || ""));

    if (temResposta) {
      var porque = copy.lista && Array.isArray(resposta) ? copy.lista(resposta) : copy.resposta && copy.resposta[resposta];
      var resp = el("div", "fp-resposta");
      resp.appendChild(el("span", "fp-pergunta", p.titulo));
      var valor = el("p", "fp-valor");
      valor.appendChild(el("span", null, "Você respondeu: "));
      valor.appendChild(el("em", null, "\u201c" + (Array.isArray(resposta) ? resposta.join(", ") : resposta) + "\u201d"));
      resp.appendChild(valor);
      if (porque) resp.appendChild(el("p", "fp-porque", porque));
      corpo.appendChild(resp);
    }

    li.appendChild(corpo);
    return li;
  }

  formula.perguntas.forEach(function (p, i) {
    if (!p.ativo) return;
    (i < VISIVEIS ? lista : extra.querySelector("ol")).appendChild(cartao(p, i + 1));
  });

  // Resumo do topo: bolinhas de todos os ativos e quantas respostas foram usadas
  var resumo = document.querySelector("[data-formula-resumo]");
  var bolinhas = document.querySelector("[data-formula-bolinhas]");
  var total = formula.perguntas.length;
  if (bolinhas) {
    formula.perguntas.forEach(function (p, i) {
      var b = el("span", "fp-mini");
      b.style.setProperty("--i", i);
      var im = el("img");
      im.src = p.ativo.imagem;
      im.alt = "";
      im.loading = "lazy";
      b.appendChild(im);
      bolinhas.appendChild(b);
    });
  }
  var respondidas = formula.perguntas.filter(function (p) { return respostas[p.id]; }).length;
  if (resumo) {
    resumo.textContent = respondidas
      ? total + " ativos escolhidos a partir das suas respostas"
      : total + " ativos que trabalham juntos na sua pele";
  }

  // Entrada suave dos ativos ao aparecer na tela
  function observar(itens) {
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(itens, function (it) { it.classList.add("is-visivel"); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visivel");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.25 });
    Array.prototype.forEach.call(itens, function (it) { obs.observe(it); });
  }
  observar(lista.children);

  // "Ver mais": abre os outros ativos
  var aberto = false;
  var textoBotao = botaoMais.querySelector("span");
  textoBotao.textContent = "Ver os outros " + (total - VISIVEIS) + " ativos";
  botaoMais.addEventListener("click", function () {
    aberto = !aberto;
    extra.classList.toggle("is-aberto", aberto);
    botaoMais.setAttribute("aria-expanded", aberto ? "true" : "false");
    textoBotao.textContent = aberto ? "Ver menos" : "Ver os outros " + (total - VISIVEIS) + " ativos";
    if (aberto) {
      Array.prototype.forEach.call(extra.querySelectorAll(".fp-item"), function (it) { it.classList.add("is-visivel"); });
    } else {
      lista.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
})();
