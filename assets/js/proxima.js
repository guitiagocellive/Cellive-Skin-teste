/* Próxima etapa do funil, baixada em segundo plano.

   Enquanto a pessoa está numa página, o navegador aproveita o tempo livre para
   baixar a próxima (capa → quiz, quiz → oferta). Quando ela avança, a página
   abre na hora. Só começa depois que a página atual terminou de carregar, e não
   baixa nada em conexão lenta ou com "economia de dados" ligada. */
(function () {
  "use strict";

  var pagina = document.documentElement.getAttribute("data-pagina");
  var oferta = [
    "assets/img/oferta/produto-1.webp",
    "assets/img/oferta/produto-1-mini.webp", "assets/img/oferta/produto-2-mini.webp",
    "assets/img/oferta/produto-3-mini.webp", "assets/img/oferta/produto-4-mini.webp",
    "assets/img/oferta/produto-5-mini.webp", "assets/img/oferta/produto-6-mini.webp",
    "assets/img/oferta/produto-7-mini.webp",
  ];
  var PROXIMA = {
    // capa → quiz
    capa: { espera: 1500, arquivos: ["/quiz", "assets/js/quiz-perguntas.js", "assets/js/quiz.js"] },
    // quiz → oferta (espera um pouco: as imagens do quiz vêm primeiro)
    quiz: {
      espera: 6000,
      arquivos: ["/oferta", "assets/css/oferta.css", "assets/js/oferta.js", "assets/js/oferta-formula.js",
        "assets/js/oferta-avaliacoes.js"].concat(oferta),
    },
  }[pagina];
  if (!PROXIMA) return;

  var conexao = navigator.connection || {};
  if (conexao.saveData || /(^|-)2g$/.test(conexao.effectiveType || "")) return;

  // <link rel="prefetch"> onde existe (Chrome/Android); fetch de baixa prioridade no resto (Safari)
  var temPrefetch = (function () {
    try { return document.createElement("link").relList.supports("prefetch"); } catch (e) { return false; }
  })();

  function baixar(url) {
    if (/\.(webp|jpg|png)$/.test(url)) {
      var im = new Image();
      im.decoding = "async";
      im.src = url;
      return;
    }
    if (temPrefetch) {
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.href = url;
      document.head.appendChild(l);
    } else if (window.fetch) {
      try { fetch(url, { credentials: "same-origin", priority: "low" }).catch(function () {}); } catch (e) { /* ok */ }
    }
  }

  function comecar() {
    var lista = PROXIMA.arquivos.slice();
    // um por vez, nos intervalos livres, para não disputar com o que a pessoa está vendo
    var proximo = function () {
      if (!lista.length) return;
      baixar(lista.shift());
      if (window.requestIdleCallback) requestIdleCallback(proximo, { timeout: 1500 });
      else setTimeout(proximo, 150);
    };
    proximo();
  }

  var depoisDeCarregar = function () { setTimeout(comecar, PROXIMA.espera); };
  if (document.readyState === "complete") depoisDeCarregar();
  else window.addEventListener("load", depoisDeCarregar);
})();
