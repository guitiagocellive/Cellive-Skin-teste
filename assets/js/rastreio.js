/* Rastreamento do site (próprio, sem ferramentas de terceiros).
   Envia os eventos para /api/evento, que grava no banco do painel.

   Uso nas outras partes do site:
     CelliveRastreio.evento("tipo", { e: "etapa", val: "valor", x: { ...extra } })
   Automático:
     - "pagina" ao abrir cada página;
     - "clique" em qualquer elemento com data-rastreio="nome" (e data-rastreio-valor);
     - "secao" na primeira vez que um elemento com data-secao="nome" aparece na tela;
     - "saida" ao sair da página, com o tempo na página e até onde a pessoa rolou;
     - "erro" se algum script der erro.
   Cada visita (aba aberta) é uma "sessão"; o "visitante" fica salvo no aparelho. */
(function () {
  "use strict";

  var ENDERECO = "/api/evento";

  /* Prévia da Vercel (link temporário de teste): mostra um selo "PRÉVIA" e não
     manda eventos, para os testes não entrarem nos números do painel.
     Links de prévia: projeto-git-ramo-time.vercel.app ou projeto-abc123xyz-time.vercel.app */
  var host = location.hostname;
  var ehPrevia = /\.vercel\.app$/.test(host) && /-(git-|[a-z0-9]{9}-)/.test(host.replace(/\.vercel\.app$/, ""));
  if (ehPrevia) {
    var selo = function () {
      if (document.querySelector("[data-selo-previa]")) return;
      var s = document.createElement("div");
      s.setAttribute("data-selo-previa", "");
      s.textContent = "PRÉVIA · só você vê";
      s.style.cssText = "position:fixed;top:8px;right:8px;z-index:2147483647;padding:5px 10px;border-radius:999px;" +
        "background:#1a1a1a;color:#fff;font:600 11px/1 system-ui,sans-serif;letter-spacing:.06em;opacity:.85;pointer-events:none;" +
        "box-shadow:0 2px 10px rgba(0,0,0,.25)";
      document.body.appendChild(s);
    };
    if (document.body) selo(); else document.addEventListener("DOMContentLoaded", selo);
  }
  var pagina = document.documentElement.getAttribute("data-pagina") || "outra";
  // versão do funil: "v2" = oferta direta para anúncios (sem quiz); sem marca = funil com quiz
  var versao = document.documentElement.getAttribute("data-versao") || null;

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function ler(armazem, chave) {
    try { return armazem.getItem(chave); } catch (e) { return null; }
  }
  function gravar(armazem, chave, valor) {
    try { armazem.setItem(chave, valor); } catch (e) { /* sem armazenamento */ }
  }

  // Visitante (fica no aparelho) e sessão (dura enquanto a aba estiver aberta)
  var visitante = ler(localStorage, "cl-visitante");
  var novo = !visitante;
  if (!visitante) { visitante = id(); gravar(localStorage, "cl-visitante", visitante); }
  var sessao = ler(sessionStorage, "cl-sessao");
  if (!sessao) { sessao = id(); gravar(sessionStorage, "cl-sessao", sessao); gravar(sessionStorage, "cl-novo", novo ? "1" : "0"); }
  novo = ler(sessionStorage, "cl-novo") === "1";

  // Origem: UTMs da primeira página da sessão (ou o site de onde veio)
  var origem = null;
  try { origem = JSON.parse(ler(sessionStorage, "cl-origem")); } catch (e) { origem = null; }
  if (!origem) {
    var q = new URLSearchParams(location.search);
    var fonte = q.get("utm_source");
    if (!fonte) {
      if (q.get("fbclid")) fonte = "facebook";
      else if (q.get("gclid")) fonte = "google";
      else if (q.get("ttclid")) fonte = "tiktok";
    }
    if (!fonte && document.referrer) {
      try {
        var host = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (host && host !== location.hostname) {
          fonte = /instagram/.test(host) ? "instagram" : /facebook|fb\./.test(host) ? "facebook" :
                  /tiktok/.test(host) ? "tiktok" : /google/.test(host) ? "google" :
                  /youtube|youtu\.be/.test(host) ? "youtube" : /whatsapp|wa\.me/.test(host) ? "whatsapp" : host;
        }
      } catch (e) { /* referrer inválido */ }
    }
    origem = {
      fonte: (fonte || "direto").toLowerCase(),
      campanha: q.get("utm_campaign") || null,
      midia: q.get("utm_medium") || null,
      conteudo: q.get("utm_content") || null,
    };
    gravar(sessionStorage, "cl-origem", JSON.stringify(origem));
  }

  // Aparelho, sistema e navegador (bem resumidos)
  var ua = navigator.userAgent || "";
  var aparelho = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? "tablet" :
                 /Mobi|iPhone|Android/i.test(ua) ? "celular" : "computador";
  var sistema = /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" :
                /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "outro";
  var navegador = /Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV/i.test(ua) ? "Facebook" : /TikTok|musical_ly/i.test(ua) ? "TikTok" :
                  /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/i.test(ua) ? "Samsung" : /CriOS|Chrome/i.test(ua) ? "Chrome" :
                  /FxiOS|Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : "outro";

  // Fila: junta os eventos e manda em lote (e sempre ao sair da página)
  var fila = [];
  var timer = 0;
  function enviar() {
    clearTimeout(timer);
    timer = 0;
    if (ehPrevia) { fila.length = 0; return; }
    if (!fila.length) return;
    var corpo = JSON.stringify(fila.splice(0, 60));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDERECO, new Blob([corpo], { type: "application/json" }))) return;
    } catch (e) { /* tenta o fetch */ }
    try {
      fetch(ENDERECO, { method: "POST", body: corpo, keepalive: true, headers: { "content-type": "application/json" } }).catch(function () {});
    } catch (e) { /* sem rede */ }
  }

  function evento(tipo, dados) {
    dados = dados || {};
    fila.push({
      t: tipo, ts: Date.now(), v: visitante, s: sessao, p: dados.p || pagina,
      e: dados.e == null ? null : String(dados.e), val: dados.val == null ? null : String(dados.val),
      x: dados.x || null, u: origem, ap: aparelho, so: sistema, nav: navegador, novo: novo, ver: versao,
    });
    if (fila.length >= 20) enviar();
    else if (!timer) timer = setTimeout(enviar, 1500);
  }

  window.CelliveRastreio = {
    evento: evento, enviar: enviar, sessao: sessao, visitante: visitante,
    origem: origem, versao: versao, previa: ehPrevia,
  };

  // Página aberta
  evento("pagina", { x: { caminho: location.pathname, ref: document.referrer ? document.referrer.slice(0, 120) : null } });

  // Cliques marcados com data-rastreio
  document.addEventListener("click", function (ev) {
    var alvo = ev.target.closest && ev.target.closest("[data-rastreio]");
    if (!alvo) return;
    evento("clique", { e: alvo.getAttribute("data-rastreio"), val: alvo.getAttribute("data-rastreio-valor") });
  }, true);

  // Seções vistas (primeira vez que 40% delas aparece)
  function observarSecoes() {
    var secoes = document.querySelectorAll("[data-secao]");
    if (!secoes.length || !("IntersectionObserver" in window)) return;
    var obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (it.isIntersecting) {
          evento("secao", { e: it.target.getAttribute("data-secao") });
          obs.unobserve(it.target);
        }
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(secoes, function (s) { obs.observe(s); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observarSecoes);
  else observarSecoes();

  // Tempo visível na página e rolagem máxima
  var visivelDesde = document.visibilityState === "visible" ? Date.now() : 0;
  var tempoVisivel = 0;
  var rolagem = 0;
  window.addEventListener("scroll", function () {
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto > 0) rolagem = Math.max(rolagem, Math.round((window.scrollY / alto) * 100));
  }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") visivelDesde = Date.now();
    else {
      if (visivelDesde) tempoVisivel += Date.now() - visivelDesde;
      visivelDesde = 0;
      enviar();
    }
  });
  var saiu = false;
  window.addEventListener("pagehide", function () {
    if (saiu) return;
    saiu = true;
    if (visivelDesde) tempoVisivel += Date.now() - visivelDesde;
    evento("saida", { x: { ms: tempoVisivel, rolagem: Math.min(100, rolagem) } });
    enviar();
  });

  // Erros de script (ajudam a achar problemas em algum celular)
  window.addEventListener("error", function (ev) {
    evento("erro", { val: ((ev.message || "erro") + " @" + (ev.filename || "").split("/").pop() + ":" + ev.lineno).slice(0, 280) });
  });
})();
