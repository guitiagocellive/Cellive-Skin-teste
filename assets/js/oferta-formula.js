/* Seção "Sua fórmula personalizada" da página de oferta.
   Na v2 (oferta direta, sem quiz) a mesma seção mostra os 24 ativos da
   fórmula separados por grupo (lista GRUPOS_V2 mais abaixo).
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
    "vitamina-e": {
      beneficio: "Antioxidante que protege a pele dos radicais livres e do ressecamento",
      resposta: {
        "Todos os dias.": "Soma proteção antioxidante ao seu protetor diário.",
        "Na maioria dos dias.": "Reforça a defesa da pele. E use o protetor todos os dias.",
        "Apenas quando fico muito tempo no sol.": "Ajuda a pele a se defender no dia a dia. O protetor diário protege o resultado.",
        "Quase nunca.": "Ajuda a pele a se defender dos radicais livres. Inclua o protetor solar de manhã.",
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
    "fator-crescimento": {
      beneficio: "Imita o sinal que a própria pele usa para se renovar",
      resposta: {
        "Sim, uso retinol ou algum retinoide.": "Apoia a renovação e a recuperação da pele.",
        "Uso séruns anti-idade.": "Um passo além no seu cuidado anti-idade.",
        "Nunca utilizei.": "Você já começa com uma tecnologia atual de renovação.",
      },
    },
    "niacinamida": {
      beneficio: "Fortalece a pele e melhora a elasticidade",
      resposta: {
        "Sim, inclusive isso me incomoda.": "Melhora a elasticidade ao redor dos olhos.",
        "Sim, aparecem até com o rosto relaxado.": "Deixa as linhas dos olhos menos marcadas.",
        "Não percebo.": "Previne as linhas ao redor dos olhos.",
      },
    },
  };

  var VISIVEIS = 5; // quantos ativos aparecem antes do botão "Ver mais"

  /* ---------- V2 (oferta direta, sem quiz): os 24 ativos da fórmula, por grupo ----------
     "img": foto do ativo (quando existe); sem foto, aparece o ícone do grupo.
     "beneficio": o que o ativo faz, em uma frase simples. */
  var A = "assets/img/ativos/";
  /* Textos escritos a partir de pesquisa sobre cada ativo (função cosmética
     conhecida; nos peptídeos do complexo EXOS, o material técnico da Glia
     Innovation). Frases curtas, sem promessa de resultado. */
  var GRUPOS_V2 = [
    {
      nome: "Renovação e regeneração", chip: "de renovação", icone: "renova",
      texto: "Aceleram a troca das células e ajudam a pele a se reconstruir.",
      ativos: [
        { nome: "Retinal", img: A + "retinal.jpg", beneficio: "Vitamina A de ação rápida que renova a pele e suaviza rugas" },
        { nome: "PDRN", img: A + "pdrn.jpg", beneficio: "Fragmentos de DNA que ajudam a pele a se reparar e regenerar" },
        { nome: "Microespículas", beneficio: "Microespículas naturais que abrem caminho para os ativos irem mais fundo" },
      ],
    },
    {
      nome: "Peptídeos", chip: "peptídeos", icone: "peptideo",
      texto: "Pequenas cadeias de proteína que dão sinais à pele. Os biomiméticos imitam os sinais que a própria pele produz.",
      ativos: [
        { nome: "GHK-Cu (peptídeo de cobre)", img: A + "ghk-cu.jpg", beneficio: "Peptídeo de cobre que estimula o colágeno e devolve a firmeza" },
        { nome: "Hexapeptídeo-8", img: A + "acetyl-hexapeptide-8.jpg", beneficio: "Suaviza as linhas de expressão, como as da testa e dos olhos" },
        { nome: "Pentapeptídeo-4", img: A + "pentapeptide-4.jpg", beneficio: "Estimula a produção de colágeno e suaviza rugas com o uso contínuo" },
        { nome: "Tetrapeptídeo-7", img: A + "tetrapeptide-7.jpg", beneficio: "Acalma a inflamação silenciosa que acelera o envelhecimento" },
        { nome: "Fator de Crescimento EGF", img: A + "fator-crescimento.jpg", beneficio: "Imita o sinal que a própria pele usa para se renovar" },
        { nome: "Fator de Crescimento IGF-1", beneficio: "Imita um sinal de crescimento que ajuda a pele a se regenerar" },
        { nome: "Fator de Crescimento VEGF", beneficio: "Imita um sinal de crescimento que ajuda a nutrir e oxigenar a pele" },
        { nome: "Oligopeptídeo-5", beneficio: "Peptídeo biomimético que protege a pele e ajuda no seu reparo" },
        { nome: "Oligopeptídeo-118", beneficio: "Peptídeo biomimético que estimula a renovação das células" },
        { nome: "Oligopeptídeo-34", beneficio: "Peptídeo clareador que reduz a produção de melanina nas manchas" },
        { nome: "Oligopeptídeo-7", beneficio: "Peptídeo biomimético que reforça a comunicação entre as células" },
        { nome: "Heptapeptídeo-14", beneficio: "Peptídeo antienvelhecimento que estimula o colágeno" },
      ],
    },
    {
      nome: "Uniformização e luminosidade", chip: "de luminosidade", icone: "luz",
      texto: "Atuam nas manchas e devolvem o brilho natural da pele.",
      ativos: [
        { nome: "Niacinamida", img: A + "niacinamida.jpg", beneficio: "Vitamina B3 que uniformiza o tom, fortalece a barreira e refina os poros" },
        { nome: "Alfa-Arbutina", img: A + "alfa-arbutina.jpg", beneficio: "Clareia manchas reduzindo a produção de melanina" },
        { nome: "Ácido Tranexâmico", beneficio: "Clareia manchas teimosas e uniformiza o tom da pele" },
        { nome: "Glutationa", img: A + "glutationa.jpg", beneficio: "Antioxidante que protege a pele e deixa o tom mais luminoso" },
      ],
    },
    {
      nome: "Hidratação", chip: "de hidratação", icone: "gota",
      texto: "Seguram a água na pele e preenchem as linhas finas.",
      ativos: [
        { nome: "Ácido Hialurônico", img: A + "acido-hialuronico.jpg", beneficio: "Segura a água na pele e preenche as linhas finas" },
        { nome: "Hialuronato de Sódio", beneficio: "Molécula menor do ácido hialurônico, que hidrata por mais tempo" },
      ],
    },
    {
      nome: "Calmantes e antioxidantes", chip: "calmantes e antioxidantes", icone: "folha",
      texto: "Acalmam a pele e a protegem das agressões do dia a dia.",
      ativos: [
        { nome: "Bisabolol", beneficio: "Ativo da camomila que acalma a pele e reduz a vermelhidão" },
        { nome: "Extrato de Calêndula", beneficio: "Calmante natural que suaviza irritações e conforta a pele" },
        { nome: "Vitamina E", img: A + "vitamina-e.jpg", beneficio: "Antioxidante que protege a pele dos radicais livres e do ressecamento" },
      ],
    },
  ];
  var ICONES = {
    renova: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4.5h-4.5"/>',
    peptideo: '<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="7" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="12" cy="17" r="2.2"/><path d="M6.8 10.8 10.2 8.2M13.8 8.2l3.4 2.6M17.2 13.2l-3.4 2.6M10.2 15.8l-3.4-2.6"/>',
    luz: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7"/>',
    gota: '<path d="M12 3.5c3.2 4 5.5 7.1 5.5 10a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-10z"/>',
    folha: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  };

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
  // na v2 (oferta direta, sem quiz) a fórmula é sempre a geral
  var semQuiz = document.documentElement.getAttribute("data-versao") === "v2";
  if (!semQuiz) {
    try { respostas = JSON.parse(sessionStorage.getItem("cellive-quiz-respostas")) || {}; } catch (e) { /* sem quiz */ }
  }

  var formula = window.QUIZ_FLUXO.filter(function (b) { return b.tipo === "formula"; })[0];
  if (!formula) return;
  var restantes = 0; // quantos ativos ficam atrás do botão "Ver mais"

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

  // V2: todos os ativos da fórmula, separados por grupo (sem nada do quiz)
  function cartaoV2(a, numero, icone, i) {
    var li = el("li", "fp-item" + (a.beneficio ? "" : " fp-item-curto"));
    li.style.setProperty("--i", i);
    var bolha = el("span", "fp-bolha" + (a.img ? "" : " fp-bolha-icone"));
    if (a.img) {
      var img = el("img");
      img.src = a.img; img.alt = ""; img.loading = "lazy"; img.width = 120; img.height = 120;
      bolha.appendChild(img);
    } else {
      bolha.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[icone] + "</svg>";
    }
    li.appendChild(bolha);
    var corpo = el("div", "fp-corpo");
    var topo = el("div", "fp-cabeca");
    topo.appendChild(el("h3", "fp-nome", a.nome));
    topo.appendChild(el("span", "fp-numero", "Nº " + (numero < 10 ? "0" : "") + numero));
    corpo.appendChild(topo);
    if (a.beneficio) corpo.appendChild(el("p", "fp-beneficio", a.beneficio));
    li.appendChild(corpo);
    return li;
  }
  function grupoV2(g, continua) {
    var li = el("li", "fp-grupo");
    var t = el("p", "fp-grupo-nome");
    t.appendChild(document.createTextNode(g.nome));
    t.appendChild(el("span", null, g.ativos.length + (g.ativos.length > 1 ? " ativos" : " ativo")));
    li.appendChild(t);
    if (!continua) li.appendChild(el("p", "fp-grupo-texto", g.texto));
    return li;
  }
  function montarV2() {
    var numero = 0, iVis = 0;
    GRUPOS_V2.forEach(function (g) {
      var cabecalhoFeito = false;
      g.ativos.forEach(function (a) {
        numero++;
        var vaiProExtra = numero > VISIVEIS;
        var alvo = vaiProExtra ? extra.querySelector("ol") : lista;
        // título do grupo antes do primeiro ativo dele (se o grupo continua no "ver mais", segue sem repetir)
        if (!cabecalhoFeito) {
          alvo.appendChild(grupoV2(g, false));
          cabecalhoFeito = true;
        }
        alvo.appendChild(cartaoV2(a, numero, g.icone, vaiProExtra ? 0 : iVis++));
      });
    });
    return numero;
  }

  var total;
  var resumo = document.querySelector("[data-formula-resumo]");
  var bolinhas = document.querySelector("[data-formula-bolinhas]");
  if (semQuiz) {
    total = montarV2();
    restantes = total - VISIVEIS;
    extra.querySelector("ol").removeAttribute("start");
    // no lugar das bolinhas: quantos ativos de cada grupo
    if (bolinhas) {
      bolinhas.className = "fp-chips";
      bolinhas.removeAttribute("aria-hidden");
      GRUPOS_V2.forEach(function (g, i) {
        var c = el("span", "fp-chip");
        c.style.setProperty("--i", i);
        c.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[g.icone] + "</svg>";
        c.appendChild(el("b", null, String(g.ativos.length)));
        c.appendChild(document.createTextNode(" " + g.chip));
        bolinhas.appendChild(c);
      });
    }
    if (resumo) resumo.textContent = total + " ativos em uma única fórmula";
  } else {
    formula.perguntas.forEach(function (p, i) {
      if (!p.ativo) return;
      (i < VISIVEIS ? lista : extra.querySelector("ol")).appendChild(cartao(p, i + 1));
    });
    total = formula.perguntas.length;
    restantes = total - VISIVEIS;
  }

  // Resumo do topo: bolinhas de todos os ativos e quantas respostas foram usadas
  if (bolinhas && !semQuiz) {
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
  if (resumo && !semQuiz) {
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
  textoBotao.textContent = "Ver os outros " + restantes + " ativos";
  botaoMais.addEventListener("click", function () {
    aberto = !aberto;
    extra.classList.toggle("is-aberto", aberto);
    botaoMais.setAttribute("aria-expanded", aberto ? "true" : "false");
    textoBotao.textContent = aberto ? "Ver menos" : "Ver os outros " + restantes + " ativos";
    if (aberto) {
      Array.prototype.forEach.call(extra.querySelectorAll(".fp-item"), function (it) { it.classList.add("is-visivel"); });
    } else {
      lista.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
})();
