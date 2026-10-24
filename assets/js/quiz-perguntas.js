/* Sequência do quiz, na ordem em que a pessoa vê.
   - "etapa": um bloco de perguntas com o progresso 1 · 2 · 3 no topo.
     Cada pergunta tem um "tipo" (A = pergunta normal, com uma resposta).
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
];
