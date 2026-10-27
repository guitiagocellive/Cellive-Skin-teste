/* Avaliações da seção "Avaliação dos clientes".
   Para colocar uma avaliação, acrescente um item na lista AVALIACOES:
     nome   - nome da cliente
     idade  - idade (número)
     quando - ex.: "3 meses atrás"
     texto  - o depoimento, como a cliente escreveu
     fotos  - quantas fotos ela enviou (0, 1, 2 ou 3). As fotos ficam em
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
      // TEXTO PROVISÓRIO: repetido da avaliação anterior, aguardando o texto real
      nome: "Leticia Souza",
      idade: 31,
      quando: "3 meses atrás",
      texto: "Comprei e estou usando há um mês, e realmente ajudou muito. Estou me sentindo bonita sem maquiagem. O que mais me incomodava eram os pés de galinha quando sorria.",
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
      idade: 31,
      quando: "2 meses atrás",
      texto: "Estou gostando muito da experiência. Estou usando faz uns 47 dias e sinto que minha pele está muito melhor. Sinto um viço INCRÍVEL. Recomendo muito.",
      fotos: 0,
    },
  ];

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

  var ESTRELAS = '<span class="estrelas" role="img" aria-label="Nota 5 de 5"></span>';
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
    nome.appendChild(document.createTextNode(", " + a.idade + " anos"));
    corpo.appendChild(nome);

    var verif = el("p", "aval-verificada");
    verif.innerHTML = VERIFICADA + " Compra Verificada";
    corpo.appendChild(verif);

    var meta = el("div", "aval-meta");
    meta.innerHTML = ESTRELAS;
    meta.appendChild(el("span", null, a.quando));
    corpo.appendChild(meta);

    corpo.appendChild(el("p", "aval-texto", a.texto));

    if (a.fotos > 0) {
      var fotos = el("div", "aval-fotos");
      for (var f = 1; f <= a.fotos; f++) {
        var slot = el("span", "slot aval-foto");
        slot.setAttribute("data-label", "Foto " + f);
        var img = el("img");
        img.src = "/assets/img/oferta/avaliacao-" + n + "-" + f + ".webp";
        img.alt = "Foto enviada por " + a.nome;
        img.loading = "lazy";
        img.onerror = function () { this.hidden = true; };
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
