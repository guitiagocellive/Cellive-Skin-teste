/* Avaliações da seção "Avaliação dos clientes".
   Para colocar uma avaliação, acrescente um item na lista AVALIACOES:
     nome   - nome da cliente
     idade  - idade (número; opcional)
     quando - ex.: "3 meses atrás" (opcional)
     nota   - estrelas de 1 a 5, de meia em meia (ex.: 4 ou 4.5; opcional, sem ela fica 5)
     texto  - o depoimento, como a cliente escreveu
     fotos  - (opcional) quantas fotos ela enviou (0, 1, 2 ou 3). As fotos ficam em
              assets/img/oferta/avaliacao-<número da avaliação>-<1, 2 ou 3>.webp
              (quadradas, 300 × 300 px). Ex.: a 3ª avaliação com 2 fotos usa
              avaliacao-3-1.webp e avaliacao-3-2.webp.
   Aparecem 5 avaliações; o botão "Ver mais avaliações" mostra mais 5 por vez
   e some quando acabam. Use somente avaliações reais de clientes. */
(function () {
  "use strict";

  var AVALIACOES = [
    {
      nome: "Lorrainy Santos",
      idade: 33,
      quando: "3 meses atrás",
      texto: "Comprei e estou usando há um mês, e realmente ajudou muito. Estou me sentindo bonita sem maquiagem. O que mais me incomodava eram os pés de galinha quando sorria.",
      fotos: 2,
    },
    {
      nome: "Leticia Souza",
      idade: 31,
      quando: "3 meses atrás",
      texto: "Esse sérum mudou completamente minha autoestima! Agora posso sair sem maquiagem sem me achar feia.",
      fotos: 0,
    },
    {
      nome: "Monique Araujo",
      idade: 33,
      quando: "2 meses atrás",
      texto: "Já tinha comprado alguns produtos no TikTok e nenhum tinha funcionado. Comprei esse quando vi um vídeo e, depois que comecei a usar, minhas rugas na testa estão sumindo, estou amando. Sem contar o cheiro, nunca tinha visto um skincare tão bom de usar. AMEI!!!",
      fotos: 1,
    },
    {
      nome: "Maria Eduarda",
      nota: 4,
      idade: 31,
      quando: "2 meses atrás",
      texto: "Estou gostando muito da experiência. Estou usando faz uns 47 dias e sinto que minha pele está muito melhor. Sinto um viço INCRÍVEL. Recomendo muito.",
      fotos: 0,
    },
    // Depoimentos enviados pela Cellive (idade das respostas do quiz; data aproximada)
    {
      nome: "Khloe Araujo",
      nota: 4.5,
      idade: 32,
      quando: "3 semanas atrás",
      texto: "Gostei muito da embalagem, principalmente do pump. Pra mim, essas coisas práticas fazem diferença porque sou meio enrolada com rotina de skincare, e como esse produto é só um passo, não procrastino mais minha rotina de skincare ksksks.",
    },
    {
      nome: "Evelyn Carvalho",
      idade: 35,
      quando: "4 meses atrás",
      texto: "Minha pele tava com aquele aspecto meio ressecado, sabe? Agora sinto ela mais hidratada e com uma aparência mais bonita. 😊",
    },
    {
      nome: "Thamilis Cavalcanti",
      idade: 30,
      quando: "1 mês atrás",
      texto: "Eu sou do time que compra skincare e esquece de usar 😂 Dessa vez consegui encaixar na rotina da noite e tô gostando desse momento de cuidado, porque com esse sérum é mais facil, pq não tenho que passar diversos produtos. Sem contar que esse foi um dos unicos que de fato funcionaram.",
    },
    {
      nome: "Lorraine Souza",
      nota: 4.5,
      idade: 37,
      quando: "4 dias atrás",
      texto: "Tenho umas linhas fininhas que me incomodam quando passo maquiagem. Ultimamente achei que ficaram menos aparentes, então tô animada pra continuar acompanhando.",
    },
    {
      nome: "Evelyn Veras",
      idade: 34,
      quando: "5 meses atrás",
      texto: "Gostei muito!!! Já estou usando há uns 2 meses e vi que minhas ruguinhas do lado dos olhos diminuíram. Já vou comprar novamente.",
    },
    {
      nome: "Louise Guimarães",
      idade: 31,
      quando: "2 semanas atrás",
      texto: "Gente, gostei muito de como minha pele fica ao acordar. Sinto ela mais macia e com uma carinha de descansada. 🥰",
    },
    {
      nome: "Jeniffer Martins",
      idade: 36,
      quando: "3 meses atrás",
      texto: "Uma amiga perguntou o que eu estava usando porque achou minha pele bonita. Eu já vinha percebendo uma diferença, mas ouvir isso sem ter comentado nada foi muito SURREAL! Contei que estava usando o sérum há algumas semanas. E se até minhas amigas perceberam, realmente é por que o produto funciona.",
    },
    {
      nome: "Nicole Santos",
      idade: 33,
      quando: "3 semanas atrás",
      texto: "Ainda não tenho meses de uso pra falar de tudo, mas já posso dizer que gostei da experiência. Percebi a pele mais macia e menos opaca. inclusive já percebi que as rugas da minha testa diminuiram. Já tava até pensando em fazer botox. Mas desisti e já vou pegar o kit de 90 dias.",
    },
    {
      nome: "Sthefany Silva",
      nota: 4,
      idade: 26,
      quando: "6 meses atrás",
      texto: "Gente, tô chocada com a maciez da minha pele. Eu comprei pensando mais nas ruguinhas, mas a primeira coisa que percebi foi a diferença no toque. Sabe quando você lava o rosto e já sente a pele gostosa, mesmo sem passar nada naquele momento? Foi isso que me ganhou.",
    },
    {
      nome: "Yasmin Lima",
      idade: 38,
      quando: "2 meses atrás",
      texto: "O que me incomodava era passar maquiagem e ver tudo acumulando nas linhazinhas. Depois que comecei a usar, senti até quando passo maquiagem, ela não acumula mais e fica mais bonita. Não sei explicar direito, só parece que o acabamento fica mais uniforme e sem contar que estou voltando a parar de usar maquiagem, por que depois de anos, consegui sentir autoestima sem nada. INDICO MUITO AMIGAS!!!!",
    },
    {
      nome: "Caroline Alves",
      idade: 32,
      quando: "7 meses atrás",
      texto: "Depois de diversos produtos que comprei e joguei meu dinheiro fora, decidi dar uma chance para esse sérum. Melhor compra que fiz!",
    },
    {
      nome: "Zoe Araujo",
      idade: 34,
      quando: "1 mês atrás",
      texto: "Já tinha comprado uns produtos que vi no TikTok e, sinceramente, não tinha percebido grande coisa. Conheci a Cellive por um vídeo e resolvi tentar mais uma vez. Agora tô olhando pra minha testa e achando as linhas menos marcadas. Ainda aparecem, claro, pq estou usando só tem 1 mês, mas já reduziram muito.",
    },
    {
      nome: "Ayla Lima",
      nota: 4.5,
      idade: 36,
      quando: "5 meses atrás",
      texto: "Tô usando há dois meses e minhas ruguinhas perto dos olhos parecem mais suaves. Já quero outro frasquinho!",
    },
    {
      nome: "Júlia Almeida",
      idade: 30,
      quando: "4 meses atrás",
      texto: "O que mais gostei foi a diferença na testa. Sinto as linhas menos marcadas e a pele mais macia.",
    },
    {
      nome: "Luna dos Santos",
      idade: 35,
      quando: "1 semana atrás",
      texto: "Comprei meio desconfiada, mas gostei demais. Minha pele tá mais viçosa e aquelas linhazinhas estão sumindo, tinha até pensado em fazer botox, mas depois desse produto eu até desisti ksksks. AMEI.❤",
    },
    {
      nome: "Clara Souza",
      nota: 4,
      idade: 33,
      quando: "6 meses atrás",
      texto: "Até minha maquiagem tá ficando mais bonita. Sinto a pele hidratada e a base marcando menos as linhas.",
    },
    {
      nome: "Maria Júlia Alves",
      idade: 37,
      quando: "3 meses atrás",
      texto: "Tô no segundo frasco e continuo gostando muito. O viço e a maciez foram as maiores diferenças pra mim.",
    },
    {
      nome: "Lívia Cardoso",
      idade: 31,
      quando: "5 dias atrás",
      texto: "Gostei do cheirinho, da sensação ao passar e, principalmente, de como minha pele fica macia. Até minha amiga gostou  comprou 1 pote para experimentar! 😘",
    },
    {
      nome: "Estela Costa",
      idade: 41,
      quando: "2 meses atrás",
      texto: "Minha pele ganhou uma luminosidade tão bonita! Esses dias saí de cara limpa e me senti ótima. ❤️",
    },
    {
      nome: "Maria Clara",
      idade: 34,
      quando: "7 meses atrás",
      texto: "Uma amiga comentou que minha pele tava bonita sem saber que eu estava usando. Fiquei me achando e passei um dos meus potes para ela kkk.",
    },
    {
      nome: "Liz Rodrigues",
      nota: 4.5,
      idade: 32,
      quando: "1 mês atrás",
      texto: "Tô gostando muito da textura da minha pele. Sinto ela mais uniforme e até os poros parecem menos aparentes.",
    },
    {
      nome: "Manuela Teixeira",
      idade: 36,
      quando: "4 meses atrás",
      texto: "Faz um mês que comecei e a diferença no toque já me conquistou. Minha pele tá uma delícia de tão macia!",
    },
    {
      nome: "Sophia Souza",
      idade: 30,
      quando: "2 semanas atrás",
      texto: "Depois que minha amiga que é esteticista me recomendou esse produto. Comprei e realmente me surpreendeu. Valeu todo investimento.",
    },
    {
      nome: "Isabel Pereira",
      idade: 38,
      quando: "6 meses atrás",
      texto: "Meu frasquinho tá acabando e já quero repor. Gostei demais da pele mais viçosa e das ruguinhas menos aparentes.",
    },
  ];

  // versão das fotos (o scripts/otimizar.mjs troca pelo código das fotos ao gerar)
  var FOTOS_V = "__FOTOS_V__";
  var POR_VEZ = 5;
  var lista = document.querySelector("[data-aval-lista]");
  var botao = document.querySelector("[data-aval-mais]");
  if (!lista) return;

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  // nota de meia em meia estrela: 5 (padrão), 4,5 ou 4 têm desenho próprio no CSS
  function estrelas(nota) {
    nota = nota >= 1 && nota <= 5 ? Math.round(nota * 2) / 2 : 5;
    var classe = nota === 5 ? "estrelas" : "estrelas estrelas-" + String(nota).replace(".", "-");
    var texto = String(nota).replace(".", ",");
    return '<span class="' + classe + '" role="img" aria-label="Nota ' + texto + ' de 5"></span>';
  }
  var VERIFICADA = '<svg class="aval-verif" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="m7.4 12.3 3 3 6.2-6.4"/></svg>';

  function cartao(a, n) {
    var art = el("article", "aval-item");
    var iniciais = a.nome.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join("").toUpperCase();
    var avatar = el("span", "aval-avatar", iniciais);
    avatar.setAttribute("aria-hidden", "true");
    art.appendChild(avatar);

    var corpo = el("div", "aval-corpo");
    var nome = el("h3", "aval-nome");
    nome.appendChild(el("strong", null, a.nome));
    if (a.idade) nome.appendChild(document.createTextNode(", " + a.idade + " anos"));
    corpo.appendChild(nome);

    var verif = el("p", "aval-verificada");
    verif.innerHTML = VERIFICADA + " Compra Verificada";
    corpo.appendChild(verif);

    var meta = el("div", "aval-meta");
    meta.innerHTML = estrelas(a.nota);
    if (a.quando) meta.appendChild(el("span", null, a.quando));
    corpo.appendChild(meta);

    corpo.appendChild(el("p", "aval-texto", a.texto));

    if (a.fotos > 0) {
      var fotos = el("div", "aval-fotos");
      for (var f = 1; f <= a.fotos; f++) {
        var slot = el("span", "slot aval-foto");
        slot.setAttribute("data-label", "Foto " + f);
        var img = el("img");
        img.src = "/assets/img/oferta/avaliacao-" + n + "-" + f + ".webp?v=" + FOTOS_V;
        img.alt = "Foto enviada por " + a.nome;
        img.loading = "lazy";
        // foto que não existe: some o quadradinho (e a fileira, se ficar vazia)
        img.onerror = function () {
          var q = this.parentNode, fila = q && q.parentNode;
          if (!q || !fila) return;
          fila.removeChild(q);
          if (!fila.children.length && fila.parentNode) fila.parentNode.removeChild(fila);
        };
        slot.appendChild(img);
        fotos.appendChild(slot);
      }
      corpo.appendChild(fotos);
    }

    art.appendChild(corpo);
    return art;
  }

  var mostradas = 0;
  function mostrarMais() {
    var ate = Math.min(AVALIACOES.length, mostradas + POR_VEZ);
    for (var i = mostradas; i < ate; i++) {
      var c = cartao(AVALIACOES[i], i + 1);
      if (mostradas > 0) c.classList.add("is-nova");
      lista.appendChild(c);
    }
    mostradas = ate;
    if (botao) botao.hidden = mostradas >= AVALIACOES.length;
  }

  mostrarMais();
  if (botao) botao.addEventListener("click", mostrarMais);
})();
