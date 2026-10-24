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
})();
