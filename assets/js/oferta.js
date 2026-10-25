/* Página de oferta: galeria de fotos, escolha do plano, contagem regressiva
   e sombra do topo ao rolar. */
(function () {
  "use strict";

  /* ---------- Galeria ---------- */
  var principal = document.querySelector("[data-foto-principal]");
  var fotoPrincipal = principal.querySelector("img");
  var miniaturas = document.querySelectorAll(".miniatura");

  Array.prototype.forEach.call(miniaturas, function (mini) {
    mini.addEventListener("click", function () {
      Array.prototype.forEach.call(miniaturas, function (m) { m.classList.remove("is-ativa"); });
      mini.classList.add("is-ativa");
      principal.setAttribute("data-label", mini.getAttribute("data-label"));
      fotoPrincipal.hidden = false;
      fotoPrincipal.style.opacity = "0";
      fotoPrincipal.onload = function () { fotoPrincipal.style.opacity = "1"; };
      fotoPrincipal.src = mini.getAttribute("data-foto");
    });
  });

  /* ---------- Planos ---------- */
  var planos = document.querySelectorAll(".plano");
  var resumoPlano = document.querySelector("[data-resumo-plano]");
  var resumoParcela = document.querySelector("[data-resumo-parcela]");
  var resumoAvista = document.querySelector("[data-resumo-avista]");
  var comprar = document.querySelector("[data-comprar]");

  function escolher(plano) {
    Array.prototype.forEach.call(planos, function (p) {
      p.classList.toggle("is-selecionado", p === plano);
    });
    resumoPlano.textContent = plano.getAttribute("data-resumo");
    resumoParcela.textContent = plano.getAttribute("data-parcela");
    resumoAvista.textContent = plano.getAttribute("data-avista");
    comprar.href = plano.getAttribute("data-link") || "#";
  }

  Array.prototype.forEach.call(planos, function (plano) {
    plano.querySelector("input").addEventListener("change", function () { escolher(plano); });
  });
  escolher(document.querySelector(".plano input:checked").closest(".plano"));

  /* ---------- Contagem regressiva ----------
     Começa em 3h37m45s na primeira visita e continua de onde parou se a pessoa
     recarregar a página. Quando chega a zero, recomeça. */
  var CHAVE = "cellive-oferta-fim";
  var DURACAO = (3 * 3600 + 37 * 60 + 45) * 1000;
  var contagem = document.querySelector("[data-contagem]");
  var fim = 0;
  try { fim = Number(localStorage.getItem(CHAVE)) || 0; } catch (e) { /* sem armazenamento */ }
  if (fim < Date.now()) {
    fim = Date.now() + DURACAO;
    try { localStorage.setItem(CHAVE, String(fim)); } catch (e) { /* sem armazenamento */ }
  }

  function dois(n) { return (n < 10 ? "0" : "") + n; }

  function atualizar() {
    var resta = Math.max(0, fim - Date.now());
    if (resta === 0) fim = Date.now() + DURACAO;
    var s = Math.floor(resta / 1000);
    contagem.textContent = dois(Math.floor(s / 3600)) + ":" + dois(Math.floor((s % 3600) / 60)) + ":" + dois(s % 60);
  }
  atualizar();
  setInterval(atualizar, 1000);

  /* ---------- Topo com sombra ao rolar ---------- */
  var topo = document.querySelector("[data-topo]");
  function rolou() { topo.classList.toggle("is-rolando", window.scrollY > 40); }
  window.addEventListener("scroll", rolou, { passive: true });
  rolou();

  /* ---------- Entrada dos textos ----------
     Separa os títulos marcados com data-revelar="palavras" em palavras (sem
     mexer em negrito e nas outras marcações) para elas aparecerem uma a uma. */
  function separarPalavras(raiz) {
    var n = 0;
    (function andar(no) {
      Array.prototype.slice.call(no.childNodes).forEach(function (filho) {
        if (filho.nodeType === 3) {
          var pedacos = filho.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          pedacos.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) {
              frag.appendChild(document.createTextNode(p));
            } else {
              var palavra = document.createElement("span");
              palavra.className = "rv-palavra";
              palavra.style.setProperty("--w", n++);
              palavra.textContent = p;
              frag.appendChild(palavra);
            }
          });
          no.replaceChild(frag, filho);
        } else if (filho.nodeType === 1 && filho.namespaceURI !== "http://www.w3.org/2000/svg") {
          andar(filho);
        }
      });
    })(raiz);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-revelar="palavras"]'), separarPalavras);

  var revelar = document.querySelectorAll("[data-revelar], [data-linha]");
  if ("IntersectionObserver" in window) {
    var obsRevelar = new IntersectionObserver(function (itens) {
      itens.forEach(function (item) {
        if (item.isIntersecting) {
          item.target.classList.add("is-visivel");
          obsRevelar.unobserve(item.target);
        }
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(revelar, function (el) { obsRevelar.observe(el); });
  } else {
    Array.prototype.forEach.call(revelar, function (el) { el.classList.add("is-visivel"); });
  }

  /* ---------- Traços azuis desenhados à mão em volta dos títulos ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-circulo]"), function (circulo) {
    if (!("IntersectionObserver" in window)) {
      circulo.classList.add("is-visivel");
      return;
    }
    new IntersectionObserver(function (itens, obs) {
      if (itens[0].isIntersecting) {
        circulo.classList.add("is-visivel");
        obs.disconnect();
      }
    }, { threshold: 0.8 }).observe(circulo);
  });

  /* ---------- Depoimentos: pontinhos acompanham o cartão da vez ---------- */
  var depos = document.querySelector("[data-depos]");
  var pontos = document.querySelector("[data-depos-pontos]");
  if (depos && pontos) {
    var cartoes = depos.querySelectorAll(".depo");
    Array.prototype.forEach.call(cartoes, function () {
      pontos.appendChild(document.createElement("span"));
    });
    var marcarPonto = function () {
      var passo = cartoes.length > 1 ? cartoes[1].offsetLeft - cartoes[0].offsetLeft : 1;
      var fimRolagem = depos.scrollWidth - depos.clientWidth;
      var atual = depos.scrollLeft >= fimRolagem - 2 ? cartoes.length - 1 : Math.round(depos.scrollLeft / passo);
      Array.prototype.forEach.call(pontos.children, function (p, i) {
        p.classList.toggle("is-ativo", i === atual);
      });
    };
    depos.addEventListener("scroll", marcarPonto, { passive: true });
    marcarPonto();
  }

  /* ---------- Dúvidas: abre uma por vez ---------- */
  var itensFaq = document.querySelectorAll(".faq-item");
  Array.prototype.forEach.call(itensFaq, function (item) {
    var botao = item.querySelector(".faq-pergunta");
    botao.addEventListener("click", function () {
      var abrir = !item.classList.contains("is-aberto");
      Array.prototype.forEach.call(itensFaq, function (outro) {
        var aberto = abrir && outro === item;
        outro.classList.toggle("is-aberto", aberto);
        outro.querySelector(".faq-pergunta").setAttribute("aria-expanded", aberto ? "true" : "false");
      });
    });
  });

  /* ---------- Partes que entram ao aparecer na tela ---------- */
  var aparecer = document.querySelectorAll("[data-aparecer]");
  if ("IntersectionObserver" in window) {
    var obsAparecer = new IntersectionObserver(function (itens) {
      itens.forEach(function (item) {
        if (item.isIntersecting) {
          item.target.classList.add("is-visivel");
          obsAparecer.unobserve(item.target);
        }
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(aparecer, function (el) { obsAparecer.observe(el); });
  } else {
    Array.prototype.forEach.call(aparecer, function (el) { el.classList.add("is-visivel"); });
  }

  /* ---------- Ação SRRP ----------
     --p: entrada do frasco, de 0 (seção entrando por baixo, frasco escondido)
     a 1 (seção perto do topo, frasco na diagonal).
     --linha: quanto da linha do tempo já ficou azul, acompanhando a rolagem.
     Cada etapa acende quando a linha chega no número dela. */
  var srrp = document.querySelector("[data-srrp]");
  var listaSrrp = document.querySelector("[data-srrp-lista]");
  var etapasSrrp = listaSrrp ? listaSrrp.querySelectorAll(".srrp-item") : [];
  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (srrp && listaSrrp) {
    var pedidoSrrp = 0;
    var atualizarSrrp = function () {
      pedidoSrrp = 0;
      var alto = window.innerHeight;
      var p = (alto * 0.9 - srrp.getBoundingClientRect().top) / (alto * 0.6);
      p = Math.min(1, Math.max(0, p));
      p = 1 - Math.pow(1 - p, 2);
      srrp.style.setProperty("--p", semMovimento ? "1" : p.toFixed(3));

      // a linha vai do 1º ao último número; a ponta dela fica a 62% da tela
      var primeiro = etapasSrrp[0].querySelector(".srrp-num").getBoundingClientRect();
      var ultimo = etapasSrrp[etapasSrrp.length - 1].querySelector(".srrp-num").getBoundingClientRect();
      var inicio = primeiro.top + primeiro.height / 2;
      var fim = ultimo.top + ultimo.height / 2;
      var ponta = alto * 0.62;
      var linha = semMovimento ? 1 : Math.min(1, Math.max(0, (ponta - inicio) / (fim - inicio)));
      listaSrrp.style.setProperty("--linha", linha.toFixed(3));
      Array.prototype.forEach.call(etapasSrrp, function (item) {
        var n = item.querySelector(".srrp-num").getBoundingClientRect();
        if (semMovimento || n.top + n.height / 2 <= ponta + 1) item.classList.add("is-visivel");
      });
    };
    var pedirSrrp = function () { if (!pedidoSrrp) pedidoSrrp = requestAnimationFrame(atualizarSrrp); };
    window.addEventListener("scroll", pedirSrrp, { passive: true });
    window.addEventListener("resize", pedirSrrp);
    atualizarSrrp();
  }

  /* ---------- Depoimentos em loop ----------
     Duplica os cartões: a fila anda da posição -50% até 0 e recomeça sem
     emenda. A velocidade é a mesma em qualquer tela (cerca de 30 px/s). */
  var trilho = document.querySelector("[data-cli-trilho]");
  if (trilho) {
    Array.prototype.slice.call(trilho.children).forEach(function (card) {
      var copia = card.cloneNode(true);
      copia.setAttribute("aria-hidden", "true");
      trilho.appendChild(copia);
    });
    var ajustarTempo = function () {
      trilho.style.setProperty("--cli-tempo", Math.round(trilho.scrollWidth / 2 / 30) + "s");
    };
    ajustarTempo();
    window.addEventListener("load", ajustarTempo);
  }

  /* ---------- Resultados: pilha de cartões ---------- */
  var pilha = document.querySelector("[data-res-pilha]");
  if (pilha) {
    var cartoes = Array.prototype.slice.call(pilha.querySelectorAll(".res-cartao"));
    cartoes.forEach(function (c, i) { c.setAttribute("data-pos", i); });

    // número sobe de 0 até o valor quando o cartão está na frente
    var contar = function (cartao) {
      var alvo = cartao.querySelector("[data-contar]");
      var valor = Number(alvo && alvo.getAttribute("data-contar"));
      if (!valor || semMovimento) return;
      var inicio = null;
      var passo = function (t) {
        if (!inicio) inicio = t;
        var k = Math.min(1, (t - inicio) / 1100);
        alvo.textContent = Math.round(valor * (1 - Math.pow(1 - k, 3))) + "%";
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };

    var girar = function () {
      var frente = cartoes[0];
      frente.classList.add("is-saindo");
      setTimeout(function () {
        cartoes.push(cartoes.shift());
        cartoes.forEach(function (c, i) { c.setAttribute("data-pos", i); });
        frente.classList.remove("is-saindo");
        contar(cartoes[0]);
      }, 450);
    };

    var comecouPilha = false;
    var iniciarPilha = function () {
      if (comecouPilha) return;
      comecouPilha = true;
      contar(cartoes[0]);
      if (!semMovimento && cartoes.length > 1) setInterval(girar, 3600);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens, obs) {
        if (itens[0].isIntersecting) { iniciarPilha(); obs.disconnect(); }
      }, { threshold: 0.4 }).observe(pilha);
    } else {
      iniciarPilha();
    }
  }

  /* ---------- Links que levam até os planos (rolagem suave) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-ir-planos]"), function (link) {
    link.addEventListener("click", function (ev) {
      var alvo = document.getElementById("planos");
      if (!alvo) return;
      ev.preventDefault();
      alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Barra de compra fixa ----------
     Aparece depois que a pessoa passa do botão "Comprar Agora" e some quando
     ela volta para os planos. O botão leva até a escolha do plano. */
  var barra = document.querySelector("[data-barra-compra]");
  var botaoPlanos = document.querySelector("[data-comprar]");
  if (barra && botaoPlanos) {
    var botaoBarra = barra.querySelector(".barra-compra-botao");
    var barraVisivel = null;
    // Confere a cada rolagem (um salto direto para o fim da página também conta)
    var conferirBarra = function () {
      var mostrar = botaoPlanos.getBoundingClientRect().bottom < 0;
      if (mostrar === barraVisivel) return;
      barraVisivel = mostrar;
      barra.classList.toggle("is-visivel", mostrar);
      barra.setAttribute("aria-hidden", mostrar ? "false" : "true");
      botaoBarra.tabIndex = mostrar ? 0 : -1;
    };
    window.addEventListener("scroll", conferirBarra, { passive: true });
    window.addEventListener("resize", conferirBarra);
    conferirBarra();
    botaoBarra.addEventListener("click", function (ev) {
      var planosSecao = document.getElementById("planos");
      if (!planosSecao) return;
      ev.preventDefault();
      planosSecao.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
