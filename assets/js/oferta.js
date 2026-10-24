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

  /* ---------- Traço circulando "+5.000 mulheres" ---------- */
  var circulo = document.querySelector("[data-circulo]");
  if (circulo && "IntersectionObserver" in window) {
    new IntersectionObserver(function (itens, obs) {
      if (itens[0].isIntersecting) {
        circulo.classList.add("is-visivel");
        obs.disconnect();
      }
    }, { threshold: 0.8 }).observe(circulo);
  } else if (circulo) {
    circulo.classList.add("is-visivel");
  }

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

  /* ---------- Embalagens desfocadas que "deitam" com a rolagem ----------
     --p vai de 0 (a dobra ainda está entrando por baixo) a 1 (dobra no lugar,
     embalagens na posição final). */
  var conheca = document.querySelector("[data-conheca]");
  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (conheca && !semMovimento) {
    var pedido = 0;
    var atualizarConheca = function () {
      pedido = 0;
      var alto = window.innerHeight;
      // Começa quando a dobra já entrou um quarto na tela (antes disso as
      // embalagens estão escondidas) e termina com ela perto do topo.
      var p = (alto * 0.75 - conheca.getBoundingClientRect().top) / (alto * 0.6);
      p = Math.min(1, Math.max(0, p));
      p = 1 - Math.pow(1 - p, 2); // desacelera no final
      conheca.style.setProperty("--p", p.toFixed(3));
    };
    var pedirConheca = function () { if (!pedido) pedido = requestAnimationFrame(atualizarConheca); };
    window.addEventListener("scroll", pedirConheca, { passive: true });
    window.addEventListener("resize", pedirConheca);
    atualizarConheca();
  }

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
