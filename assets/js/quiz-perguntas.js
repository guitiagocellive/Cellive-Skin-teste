/* Sequência do quiz, na ordem em que a pessoa vê.
   - "etapa": um bloco de perguntas com o progresso 1 · 2 · 3 no topo.
   - "formula": perguntas que montam a fórmula. Cada pergunta acrescenta um
     "ativo", que desce até o painel "Combinação ideal para sua pele" e vai
     enchendo o pote. Barra de progresso no topo.
   Tipos de pergunta:
     A = pergunta normal (lista de respostas)
     B = seleção por imagens (cartões com foto). Com "multipla: true", a pessoa
         pode marcar mais de um cartão e confirma no botão "Continuar".
     C = pergunta + imagem de exemplo + lista de respostas
   - "carregamento": tela com o círculo de 0% a 100%. Enquanto ela roda, as
     imagens listadas em "preCarregar" (e as imagens das próximas perguntas)
     são baixadas, para aparecerem na hora.
   - "analise": tela de análise depois da fórmula: rosto escaneado, barra e
     etapas que vão sendo checadas (cada uma com sua duração, em ms).
   - "montagem": os 12 ativos giram em volta do pote, entram um a um e o pote
     enche; no fim aparece "Fórmula concluída". */
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
        titulo: "Há quanto tempo você reparou que sua pele não está como antes?",
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
    linhas: ["100 mulheres,", "99 sentiram melhora na aparência da pele."],
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
        formato: "quadrado", // fotos 1:1, rótulo em duas linhas
        opcoes: [
          { texto: "Entre 18 - 25 anos", imagem: "assets/img/quiz/idade-18-25.webp" },
          { texto: "Entre 25 - 35 anos", imagem: "assets/img/quiz/idade-25-35.webp" },
          { texto: "Entre 35 - 40 anos", imagem: "assets/img/quiz/idade-35-40.webp" },
          { texto: "+40 anos", imagem: "assets/img/quiz/idade-40-mais.webp" },
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
      {
        id: "botox-peeling",
        tipo: "C",
        titulo: "Você já pensou em fazer botox ou peeling?",
        imagem: "assets/img/quiz/botox-peeling.webp",
        opcoes: [
          "Sim, inclusive já fiz.",
          "Já pensei, mas acho muito invasivo.",
          "Nunca pensei.",
        ],
        ativo: { id: "ghk-cu", nome: "GHK-Cu", imagem: "assets/img/ativos/ghk-cu.jpg" },
      },
      {
        id: "linhas-testa",
        tipo: "C",
        titulo: "Quando seu rosto está relaxado, você ainda percebe linhas na testa?",
        imagem: "assets/img/quiz/linhas-testa.webp",
        opcoes: [
          "Sim, ficam bem marcadas.",
          "Algumas linhas já ficam visíveis.",
          "Nunca reparei.",
        ],
        ativo: { id: "acetyl-hexapeptide-8", nome: "Hexapeptídeo-8", imagem: "assets/img/ativos/acetyl-hexapeptide-8.jpg" },
      },
      {
        id: "rotina-skincare",
        tipo: "A",
        titulo: "Você já tentou seguir uma rotina de skincare antes?",
        opcoes: [
          "Sim, mas sem resultados.",
          "Sim, mas esquecia de usar.",
          "Só usei alguns produtos.",
          "Nunca tentei.",
        ],
        ativo: { id: "pentapeptide-4", nome: "Pentapeptídeo-4", imagem: "assets/img/ativos/pentapeptide-4.jpg" },
      },
      {
        id: "sinais",
        tipo: "B",
        multipla: true,
        titulo: "Quais desses sinais mais incomodam você hoje?",
        subtitulo: "Escolha os sinais que mais te trazem insegurança e toque em “Continuar”.",
        opcoes: [
          { texto: "Pé de galinha", imagem: "assets/img/quiz/sinal-pe-de-galinha.webp" },
          { texto: "Linhas 11", imagem: "assets/img/quiz/sinal-linhas-11.webp" },
          { texto: "Bigode chinês", imagem: "assets/img/quiz/sinal-bigode-chines.webp" },
          { texto: "Linhas na testa", imagem: "assets/img/quiz/sinal-linhas-testa.webp" },
          { texto: "Aspecto envelhecido", imagem: "assets/img/quiz/sinal-aspecto-envelhecido.webp" },
          { texto: "Manchas", imagem: "assets/img/quiz/sinal-manchas.webp" },
        ],
        ativo: { id: "retinal", nome: "Retinal", imagem: "assets/img/ativos/retinal.jpg" },
      },
      {
        id: "protetor-solar",
        tipo: "A",
        titulo: "Com que frequência você usa protetor solar?",
        opcoes: [
          "Todos os dias.",
          "Na maioria dos dias.",
          "Apenas quando fico muito tempo no sol.",
          "Quase nunca.",
        ],
        ativo: { id: "vitamina-e", nome: "Vitamina E", imagem: "assets/img/ativos/vitamina-e.jpg" },
      },
      {
        id: "firmeza",
        tipo: "C",
        titulo: "Você sente que a pele do seu rosto está menos firme do que antes?",
        imagem: "assets/img/quiz/firmeza.webp",
        opcoes: [
          "Sim, percebo claramente.",
          "Comecei a perceber.",
          "Não percebo.",
        ],
        ativo: { id: "glutationa", nome: "Glutationa", imagem: "assets/img/ativos/glutationa.jpg" },
      },
      {
        id: "espelho",
        tipo: "C",
        titulo: "Quando você se olha no espelho sem maquiagem, como sente sua pele?",
        imagem: "assets/img/quiz/espelho.webp",
        opcoes: [
          "Sinto que perdi minha autoestima.",
          "Sinto que minha pele está envelhecida.",
          "Percebo uma pele sem viço ou opaca.",
        ],
        ativo: { id: "tetrapeptide-7", nome: "Tetrapeptídeo-7", imagem: "assets/img/ativos/tetrapeptide-7.jpg" },
      },
      {
        id: "ativo-rejuvenescimento",
        tipo: "A",
        titulo: "Você já utiliza algum ativo específico para rejuvenescimento?",
        opcoes: [
          "Sim, uso retinol ou algum retinoide.",
          "Uso séruns anti-idade.",
          "Já usei, mas parei.",
          "Nunca utilizei.",
        ],
        ativo: { id: "alfa-arbutina", nome: "Alfa-Arbutina", imagem: "assets/img/ativos/alfa-arbutina.jpg" },
      },
      {
        // ATENÇÃO: texto repetido da pergunta anterior, aguardando o texto final.
        id: "ativo-rejuvenescimento-2",
        tipo: "C",
        titulo: "Você já utiliza algum ativo específico para rejuvenescimento?",
        imagem: "assets/img/quiz/rejuvenescimento.webp",
        opcoes: [
          "Sim, uso retinol ou algum retinoide.",
          "Uso séruns anti-idade.",
          "Nunca utilizei.",
        ],
        ativo: { id: "exossomos", nome: "Exossomos", imagem: "assets/img/ativos/exossomos.jpg" },
      },
      {
        id: "linhas-olhos",
        tipo: "C",
        titulo: "Você percebe linhas ao redor dos olhos quando sorri?",
        imagem: "assets/img/quiz/linhas-olhos.webp",
        opcoes: [
          "Sim, inclusive isso me incomoda.",
          "Sim, aparecem até com o rosto relaxado.",
          "Não percebo.",
        ],
        ativo: { id: "niacinamida", nome: "Niacinamida", imagem: "assets/img/ativos/niacinamida.jpg" },
      },
    ],
  },
  {
    tipo: "analise",
    id: "analise",
    // Título no estilo do site: "titulo" em letra fina condensada e
    // "destaque" em negrito
    titulo: "Fazendo uma análise",
    destaque: "do seu caso",
    // Uma etapa por vez. Cada etapa: texto, ícone (gota, escudo ou linhas),
    // duração em ms e pontos que acendem no rosto (desenho de 200 × 240).
    etapas: [
      { texto: "Entendendo seu tipo de pele", icone: "gota", duracao: 850, pontos: [{ x: 126, y: 140 }, { x: 74, y: 140 }] },
      { texto: "Checando a sensibilidade", icone: "escudo", duracao: 850, pontos: [{ x: 112, y: 84 }] },
      { texto: "Mapeando linhas e sinais", icone: "linhas", duracao: 850, pontos: [{ x: 66, y: 116 }, { x: 134, y: 116 }, { x: 88, y: 160 }] },
    ],
    pausaFinal: 300, // tempo parado em 100% antes de seguir (total ≈ 2,85 s)
  },
  {
    tipo: "montagem",
    id: "montagem",
    titulo: "Montando sua",
    destaque: "fórmula",
    legenda: "Combinando os",
    legendaDestaque: "ativos",
    concluido: "Fórmula",
    concluidoDestaque: "concluída!",
    // Tempos em ms: intervalo entre ativos surgindo, pausa, intervalo entre
    // ativos entrando e tempo na tela final, com o rótulo do produto
    // aparecendo (total ≈ 5 s)
    surgir: 40,
    espera: 150,
    entrar: 150,
    final: 2100,
  },
];
