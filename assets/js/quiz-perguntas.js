/* Perguntas do quiz.
   Para mudar um texto, edite aqui. Cada etapa tem suas perguntas, e cada
   pergunta tem um "tipo" (A = pergunta normal, com uma resposta). */
window.QUIZ_ETAPAS = [
  {
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
];
