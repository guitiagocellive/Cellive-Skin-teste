/* Seção "Sua fórmula personalizada" da página de oferta.
   Mostra os 12 ativos do quiz (nome e imagem vêm do quiz-perguntas.js), a
   resposta que a pessoa deu na pergunta de cada ativo e uma explicação curta:
   - "resposta": por que o ativo é bom para aquela resposta (uma frase por opção)
   - "base": o que o ativo faz (aparece sempre)
   Se a pessoa chegou na oferta sem fazer o quiz, aparece só a frase "base".
   Para mudar um texto, edite este arquivo. As chaves de "resposta" precisam
   ser iguais ao texto da opção em quiz-perguntas.js. */
(function () {
  "use strict";

  var COPY = {
    "acido-hialuronico": {
      base: "Atrai e segura a água na pele, devolvendo hidratação profunda e preenchendo visualmente as linhas finas.",
      resposta: {
        "Entre 18 - 25 anos": "Nessa fase, manter a pele bem hidratada é a melhor forma de prevenir os primeiros sinais.",
        "Entre 25 - 35 anos": "É a fase em que a pele começa a perder água com mais facilidade e surgem as primeiras linhas.",
        "Entre 35 - 40 anos": "Com os anos, a produção natural de ácido hialurônico cai, e a pele sente essa falta.",
        "+40 anos": "Depois dos 40, a pele produz bem menos ácido hialurônico, por isso a reposição faz tanta diferença.",
      },
    },
    "pdrn": {
      base: "Estimula a regeneração da pele e fortalece a barreira de proteção, deixando a pele mais resistente.",
      resposta: {
        "Sim, minha pele é bastante sensível.": "Como sua pele é sensível, ele ajuda a acalmar e a recuperar a pele sem agredir.",
        "Às vezes irrita.": "Ele deixa sua pele mais forte, para que essas irritações aconteçam cada vez menos.",
        "Raramente.": "Com a pele já equilibrada, ele se concentra em acelerar a renovação e a reparação.",
        "Minha pele não é sensível.": "Sua pele tolera bem os ativos, então ele trabalha direto na regeneração.",
      },
    },
    "ghk-cu": {
      base: "Peptídeo de cobre que estimula a produção de colágeno e a renovação da pele, devolvendo firmeza.",
      resposta: {
        "Sim, inclusive já fiz.": "Ele ajuda a manter e prolongar o resultado dos procedimentos que você já fez.",
        "Já pensei, mas acho muito invasivo.": "É um caminho para cuidar das linhas e da firmeza sem agulhas e sem tempo de recuperação.",
        "Nunca pensei.": "Um cuidado diário que trabalha a firmeza aos poucos, sem precisar de procedimentos.",
      },
    },
    "acetyl-hexapeptide-8": {
      base: "Conhecido pelo efeito “botox-like”: suaviza a contração que forma as linhas de expressão.",
      resposta: {
        "Sim, ficam bem marcadas.": "Como as linhas da sua testa já ficam marcadas, ele age para relaxar e suavizar essas marcas.",
        "Algumas linhas já ficam visíveis.": "Ele suaviza as linhas que já aparecem, antes que fiquem mais profundas.",
        "Nunca reparei.": "Ele age na prevenção, para as linhas de expressão demorarem mais a aparecer.",
      },
    },
    "pentapeptide-4": {
      base: "Peptídeo que sinaliza para a pele produzir mais colágeno, melhorando a textura com o uso contínuo.",
      resposta: {
        "Sim, mas sem resultados.": "Diferente de produtos comuns, ele age no colágeno, para você enxergar resultado com constância.",
        "Sim, mas esquecia de usar.": "Por estar em um único sérum noturno, fica fácil manter a rotina e deixar ele trabalhar.",
        "Só usei alguns produtos.": "Ele completa o que você já usa, trazendo um cuidado anti-idade de verdade para a rotina.",
        "Nunca tentei.": "Um ótimo começo: um passo só, à noite, com um ativo que trabalha enquanto você dorme.",
      },
    },
    "retinal": {
      base: "O retinaldeído acelera a renovação das células e age mais rápido que o retinol comum.",
      // Pergunta de várias escolhas: a frase é montada com os sinais marcados
      lista: function (sinais) {
        return "Você marcou " + juntar(sinais) + ": ele age justamente na renovação que suaviza esses sinais.";
      },
    },
    "propilenoglicol": {
      base: "Ajuda os outros ativos a penetrarem na pele e mantém a hidratação por mais tempo.",
      resposta: {
        "Todos os dias.": "Junto com o protetor que você já usa todo dia, ele garante que cada ativo chegue onde precisa.",
        "Na maioria dos dias.": "Ele mantém a pele hidratada e faz a fórmula render mais. E vale usar o protetor todos os dias.",
        "Apenas quando fico muito tempo no sol.": "Ele mantém a pele hidratada no dia a dia. E o protetor diário é o melhor aliado do sérum.",
        "Quase nunca.": "Ele ajuda a recuperar a hidratação. Para proteger os resultados, inclua o protetor solar de manhã.",
      },
    },
    "glutationa": {
      base: "Antioxidante potente que protege o colágeno dos radicais livres e deixa o tom mais uniforme.",
      resposta: {
        "Sim, percebo claramente.": "Como você já percebe a perda de firmeza, ela ajuda a proteger o colágeno da sua pele.",
        "Comecei a perceber.": "Ela age agora, no começo da perda de firmeza, para preservar o colágeno da sua pele.",
        "Não percebo.": "Ela ajuda a manter por mais tempo a firmeza que você tem hoje.",
      },
    },
    "tetrapeptide-7": {
      base: "Peptídeo que acalma a pele e estimula a renovação, devolvendo o viço e a aparência descansada.",
      resposta: {
        "Sinto que perdi minha autoestima.": "Ele ajuda a devolver a aparência saudável que faz você voltar a gostar do que vê no espelho.",
        "Sinto que minha pele está envelhecida.": "Ele trabalha a renovação e a firmeza, para uma pele com aparência mais jovem.",
        "Percebo uma pele sem viço ou opaca.": "Ele devolve o viço, deixando a pele com aspecto mais luminoso e descansado.",
      },
    },
    "alfa-arbutina": {
      base: "Uniformiza o tom e clareia manchas de forma suave, para uma pele mais luminosa.",
      resposta: {
        "Sim, uso retinol ou algum retinoide.": "Combina bem com retinoides e cuida das manchas enquanto eles renovam a pele.",
        "Uso séruns anti-idade.": "Ela soma ao seu cuidado anti-idade a uniformização do tom, que muitos séruns deixam de lado.",
        "Já usei, mas parei.": "Suave e fácil de usar, ela ajuda você a retomar o cuidado sem irritar a pele.",
        "Nunca utilizei.": "Um ativo suave para começar: clareia manchas sem agredir a pele.",
      },
    },
    "exo-skin": {
      base: "Tecnologia de exossomos que leva sinais de renovação às células e acelera a recuperação da pele.",
      resposta: {
        "Sim, uso retinol ou algum retinoide.": "Ajuda a pele a se recuperar mais rápido, deixando a renovação mais confortável.",
        "Uso séruns anti-idade.": "Leva o seu cuidado anti-idade a outro nível, com uma tecnologia de renovação mais avançada.",
        "Nunca utilizei.": "Uma tecnologia moderna para você já começar com o que há de mais atual no skincare.",
      },
    },
    "niacinamida": {
      base: "Fortalece a barreira da pele, melhora a elasticidade e deixa o tom mais uniforme.",
      resposta: {
        "Sim, inclusive isso me incomoda.": "Ela melhora a elasticidade da região dos olhos, suavizando as linhas que te incomodam.",
        "Sim, as minhas aparecem até relaxada.": "Ela reforça a pele ao redor dos olhos para que essas linhas fiquem menos marcadas.",
        "Não percebo.": "Ela mantém a pele firme e elástica, ajudando a prevenir as linhas ao redor dos olhos.",
      },
    },
  };

  var VISIVEIS = 6; // quantos ativos aparecem antes do botão "Ver mais"

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
    corpo.appendChild(el("span", "fp-numero", "Ativo nº " + (numero < 10 ? "0" : "") + numero));
    corpo.appendChild(el("h3", "fp-nome", ativo.nome));

    if (temResposta) {
      var resp = el("div", "fp-resposta");
      resp.appendChild(el("span", "fp-pergunta", p.titulo));
      var valor = el("span", "fp-valor");
      valor.appendChild(el("span", "fp-valor-rotulo", "Você respondeu:"));
      valor.appendChild(el("strong", null, Array.isArray(resposta) ? resposta.join(", ") : resposta));
      resp.appendChild(valor);
      corpo.appendChild(resp);
    }

    var texto = el("p", "fp-texto");
    var porque = null;
    if (temResposta) {
      if (copy.lista && Array.isArray(resposta)) porque = copy.lista(resposta);
      else if (copy.resposta) porque = copy.resposta[resposta];
    }
    if (porque) {
      texto.appendChild(el("span", "fp-porque", porque + " "));
    }
    texto.appendChild(document.createTextNode(copy.base || ""));
    corpo.appendChild(texto);

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
