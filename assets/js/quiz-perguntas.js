/* Sequência do quiz, na ordem em que a pessoa vê.
   - "etapa": um bloco de perguntas com o progresso 1 · 2 · 3 no topo.
   - "formula": perguntas que montam a fórmula. Cada pergunta acrescenta um
     "ativo", que desce até o painel "Combinação ideal para sua pele" e vai
     enchendo o pote. Barra de progresso no topo.
   Tipos de pergunta:
     A = pergunta normal (lista de respostas)
     B = seleção única por imagens (cartões com foto, em grade 2 × 2)
   - "carregamento": tela com o círculo de 0% a 100%. Enquanto ela roda, as
     imagens listadas em "preCarregar" (e as imagens das próximas perguntas)
     são baixadas, para aparecerem na hora. */
window.QUIZ_FLUXO = [
  {
    tipo: "etapa",
    id: "etapa-1",
    perguntas: [
      {
        id: "melhorar",
        tipo: "A",
        titulo: "O que você mais gostaria de melhorar na aparência da sua pele?",
        opcoes: [
          "Quero parecer mais jovem.",
          "Quero suavizar linhas e sinais de expressão.",
          "Quero recuperar o viço e a aparência saudável da pele.",
        ],
      },
      {
        id: "pele-hoje",
        tipo: "A",
        titulo: "Como você sente que sua pele está hoje?",
        opcoes: [
          "Está boa, mas sei que pode melhorar.",
          "Está mais cansada e sem viço.",
          "Estou percebendo mais linhas e marcas.",
          "Sinto que minha pele está aparentando mais idade.",
        ],
      },
      {
        id: "ha-quanto-tempo",
        tipo: "A",
        titulo: "Há quanto tempo que você reparou que sua pele não está como antes?",
        opcoes: [
          "Poucas semanas.",
          "Alguns meses.",
          "Mais de um ano.",
        ],
      },
    ],
  },
  {
    tipo: "carregamento",
    id: "carregamento-1",
    // Texto: "destaque" aparece em preto, negrito e itálico, no começo da
    // primeira linha. Cada item de "linhas" começa numa linha nova.
    destaque: "A cada",
    linhas: ["100 mulheres,", "99 sentiram melhora na sua aparência."],
    imagem: "assets/img/carregamento.jpg",
    imagemAlt: "Mulher com a pele bonita e saudável",
    duracao: 3300, // em milissegundos (0% → 100%)
    preCarregar: [
      // Coloque aqui as imagens das próximas perguntas, ex.: "assets/img/pergunta-4.jpg"
    ],
  },
  {
    tipo: "formula",
    id: "formula",
    totalAtivos: 12, // total de perguntas/ativos desta etapa (contador "0/12")
    perguntas: [
      {
        id: "idade",
        tipo: "B",
        titulo: "Qual é sua idade?",
        subtitulo: "Vamos separar os melhores ativos conforme suas escolhas",
        opcoes: [
          { texto: "Entre 18 - 25 anos", imagem: "assets/img/quiz/idade-18-25.jpg" },
          { texto: "Entre 26 - 30 anos", imagem: "assets/img/quiz/idade-26-30.jpg" },
          { texto: "Entre 30 - 35 anos", imagem: "assets/img/quiz/idade-30-35.jpg" },
          { texto: "+35 anos", imagem: "assets/img/quiz/idade-35-mais.jpg" },
        ],
        ativo: { id: "acido-hialuronico", nome: "Ácido Hialurônico", imagem: "assets/img/ativos/acido-hialuronico.jpg" },
      },
      {
        id: "sensibilidade",
        tipo: "A",
        titulo: "Sua pele costuma irritar com facilidade?",
        opcoes: [
          "Sim, minha pele é bastante sensível.",
          "Às vezes irrita.",
          "Raramente.",
          "Minha pele não é sensível.",
        ],
        ativo: { id: "pdrn", nome: "PDRN", imagem: "assets/img/ativos/pdrn.jpg" },
      },
    ],
  },
];
