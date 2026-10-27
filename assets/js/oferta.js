/* Página de oferta: galeria de fotos, escolha do plano, contagem regressiva
   e sombra do topo ao rolar. */
(function () {
  "use strict";

  /* ---------- Galeria (carrossel) ----------
     As fotos ficam lado a lado num trilhoGal com rolagem que encaixa (o arrasto
     segue o dedo). Tocar numa miniatura desliza até a foto. O selo "Anti-aging"
     só aparece na 1ª foto (as outras têm texto no canto).
     Carregamento: a foto 1 vem com a página; as outras baixam uma por vez
     depois que a primeira dobra termina de carregar (ou na hora, se a pessoa
     for até ela antes). Cada foto aparece com um esmaecer suave. */
  var trilhoGal = document.querySelector("[data-galeria-trilho]");
  var slides = trilhoGal ? Array.prototype.slice.call(trilhoGal.children) : [];
  var selos = document.querySelector(".galeria-selos");
  var miniaturas = Array.prototype.slice.call(document.querySelectorAll(".miniatura"));
  var fileiraMini = document.querySelector(".galeria-miniaturas");
  var atual = 0;

  function carregarFoto(i) {
    var slide = slides[i];
    var img = slide && slide.querySelector("img[data-src]");
    if (!img) return null;
    var url = img.getAttribute("data-src");
    img.removeAttribute("data-src");
    slide.classList.add("is-esperando");
    img.classList.add("is-chegando");
    return new Promise(function (pronto) {
      var mostrar = function () {
        img.hidden = false;
        slide.classList.remove("is-esperando");
        requestAnimationFrame(function () { img.classList.remove("is-chegando"); });
        pronto();
      };
      img.onload = function () { (img.decode ? img.decode() : Promise.resolve()).then(mostrar, mostrar); };
      img.onerror = function () { slide.classList.remove("is-esperando"); pronto(); };
      img.src = url;
    });
  }

  // fila: uma foto de cada vez, para não disputar internet com o resto da página
  var filaIniciada = false;
  function baixarEmFila() {
    if (filaIniciada) return;
    filaIniciada = true;
    var i = 1;
    var proxima = function () {
      while (i < slides.length && !slides[i].querySelector("img[data-src]")) i++;
      if (i >= slides.length) return;
      var p = carregarFoto(i++);
      (p || Promise.resolve()).then(proxima);
    };
    proxima();
  }

  function marcar(i) {
    if (i === atual) return;
    atual = i;
    miniaturas.forEach(function (m, k) {
      m.classList.toggle("is-ativa", k === i);
      m.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    if (selos) selos.classList.toggle("is-escondido", i !== 0);
    // vizinhas na frente da fila
    carregarFoto(i); carregarFoto(i + 1);
    // miniatura escolhida no meio da fileira
    var mini = miniaturas[i];
    if (mini && fileiraMini && fileiraMini.scrollTo) {
      var alvo = mini.offsetLeft - (fileiraMini.clientWidth - mini.offsetWidth) / 2;
      fileiraMini.scrollTo({ left: Math.max(0, alvo), behavior: "smooth" });
    }
  }

  if (trilhoGal) {
    var pedidoGal = 0, paradaGal = 0;
    trilhoGal.addEventListener("scroll", function () {
      if (!pedidoGal) pedidoGal = requestAnimationFrame(function () {
        pedidoGal = 0;
        marcar(Math.round(trilhoGal.scrollLeft / trilhoGal.clientWidth));
      });
      // registra no painel quando a rolagem para
      clearTimeout(paradaGal);
      paradaGal = setTimeout(function () { rastrear("clique", { e: "galeria", val: String(atual + 1) }); }, 400);
    }, { passive: true });

    miniaturas.forEach(function (mini, i) {
      mini.addEventListener("click", function () {
        carregarFoto(i);
        trilhoGal.scrollTo({ left: i * trilhoGal.clientWidth, behavior: "smooth" });
      });
    });

    // começou a mexer na galeria: as fotos vizinhas vêm na hora
    trilhoGal.addEventListener("touchstart", function () { carregarFoto(1); baixarEmFila(); }, { once: true, passive: true });

    // primeira dobra carregada: as outras fotos começam a baixar
    var depoisDaDobra = function () {
      if (window.requestIdleCallback) requestIdleCallback(baixarEmFila, { timeout: 1200 });
      else setTimeout(baixarEmFila, 300);
    };
    if (document.readyState === "complete") depoisDaDobra();
    else window.addEventListener("load", depoisDaDobra);
  }

  /* ---------- Animações só onde a pessoa está olhando ----------
     As animações que rodam sem parar (faixa que corre, pulsos, selos girando)
     ficam pausadas enquanto a seção está longe da tela: o celular não gasta
     bateria e processamento desenhando o que ninguém vê. */
  if ("IntersectionObserver" in window) {
    var olhoSecoes = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.target.classList.toggle("fora-da-tela", !e.isIntersecting); });
    }, { rootMargin: "250px 0px" });
    Array.prototype.forEach.call(document.querySelectorAll("main.oferta > section"), function (sec) { olhoSecoes.observe(sec); });
  }

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

  var rastrear = function (tipo, dados) {
    if (window.CelliveRastreio) window.CelliveRastreio.evento(tipo, dados);
  };

  Array.prototype.forEach.call(planos, function (plano) {
    plano.querySelector("input").addEventListener("change", function () {
      escolher(plano);
      rastrear("plano", { val: plano.querySelector("input").value });
    });
  });

  // Clique em "Comprar Agora": vai para o checkout com o plano escolhido.
  // No pré-lançamento, abre o cadastro do grupo VIP (o clique conta igual no painel).
  var preLancamento = document.body.hasAttribute("data-pre-lancamento");
  comprar.addEventListener("click", function (ev) {
    var marcado = document.querySelector(".plano input:checked");
    rastrear("checkout", { val: marcado ? marcado.value : null, x: { link: preLancamento ? "lista" : comprar.getAttribute("href") } });
    if (preLancamento) {
      ev.preventDefault();
      abrirLista(marcado ? marcado.value : null);
    }
  });

  /* ---------- Lista de lançamento (grupo VIP no WhatsApp) ---------- */
  var lista = document.querySelector("[data-lista]");
  var listaForm = lista && lista.querySelector("[data-lista-form]");
  var listaKit = null;
  var NOMES_KIT = { 1: "1 unidade · 30 dias", 2: "2 unidades · 60 dias", 3: "3 unidades · 90 dias" };

  function abrirLista(kit) {
    if (!lista) return;
    listaKit = kit;
    var kitEl = lista.querySelector("[data-lista-kit]");
    kitEl.hidden = !NOMES_KIT[kit];
    kitEl.textContent = NOMES_KIT[kit] ? "Kit escolhido: " + NOMES_KIT[kit] : "";
    if (typeof lista.showModal === "function") lista.showModal();
    else lista.setAttribute("open", "");
    document.documentElement.classList.add("lista-aberta");
    rastrear("clique", { e: "lista-aberta", val: kit });
  }
  function fecharLista() {
    if (!lista) return;
    if (typeof lista.close === "function" && lista.open) lista.close();
    else lista.removeAttribute("open");
  }

  // (61) 99999-9999 enquanto digita
  function mascaraWhats(v) {
    var d = v.replace(/\D/g, "");
    if (d.length > 11 && d.indexOf("55") === 0) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    var meio = d.length > 10 ? 7 : 6;
    return "(" + d.slice(0, 2) + ") " + d.slice(2, meio) + (d.length > meio ? "-" + d.slice(meio) : "");
  }

  if (lista && listaForm) {
    var erroEl = lista.querySelector("[data-lista-erro]");
    var enviarEl = lista.querySelector("[data-lista-enviar]");
    var campoWhats = listaForm.elements.whatsapp;

    lista.querySelector("[data-lista-fechar]").addEventListener("click", fecharLista);
    lista.addEventListener("close", function () { document.documentElement.classList.remove("lista-aberta"); });
    // toque fora da caixa fecha
    lista.addEventListener("click", function (ev) { if (ev.target === lista) fecharLista(); });
    campoWhats.addEventListener("input", function () { campoWhats.value = mascaraWhats(campoWhats.value); });

    var mostrarErro = function (texto, campo) {
      erroEl.textContent = texto;
      erroEl.hidden = !texto;
      if (campo) campo.focus();
    };

    listaForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = listaForm.elements;
      var nome = f.nome.value.trim();
      var whats = f.whatsapp.value.replace(/\D/g, "");
      var email = f.email.value.trim();
      if (nome.length < 2) return mostrarErro("Digite o seu nome.", f.nome);
      if (whats.length < 10 || whats.length > 11) return mostrarErro("Digite o WhatsApp com DDD, por exemplo (61) 99999-9999.", f.whatsapp);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return mostrarErro("Confira o seu e-mail.", f.email);
      if (!f.aceite.checked) return mostrarErro("Para entrar no grupo, marque que aceita receber as mensagens do lançamento.", f.aceite);
      mostrarErro("");
      enviarEl.disabled = true;
      enviarEl.textContent = "Enviando…";

      var R = window.CelliveRastreio || {};
      fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: nome, whatsapp: whats, email: email, aceite: true, site: f.site.value,
          kit: listaKit, ver: R.versao || null, u: R.origem || null, v: R.visitante || null, s: R.sessao || null,
        }),
      })
        .then(function (resp) { return resp.json().catch(function () { return {}; }).then(function (c) { return { ok: resp.ok, c: c }; }); })
        .then(function (x) {
          if (!x.ok || !x.c.ok) {
            var msg = { nome: "Digite o seu nome.", whatsapp: "Confira o WhatsApp com DDD.", email: "Confira o seu e-mail." }[x.c.erro];
            throw new Error(msg || "");
          }
          rastrear("lead", { val: listaKit });
          if (R.enviar) R.enviar();
          concluir(nome, x.c.grupo);
        })
        .catch(function (e) {
          enviarEl.disabled = false;
          enviarEl.textContent = "Quero entrar no grupo VIP";
          mostrarErro((e && e.message) || "Não foi possível enviar agora. Confira a internet e tente de novo.");
        });
    });

    var concluir = function (nome, grupo) {
      listaForm.hidden = true;
      var ok = lista.querySelector("[data-lista-ok]");
      ok.hidden = false;
      lista.querySelector("[data-lista-nome]").textContent = "Pronto, " + nome.split(/\s+/)[0];
      var botao = lista.querySelector("[data-lista-grupo]");
      if (grupo) {
        botao.href = grupo;
        botao.hidden = false;
        botao.addEventListener("click", function () { rastrear("clique", { e: "grupo-whatsapp" }); });
        // abre o grupo sozinho; o botão fica para quem voltar para a página
        setTimeout(function () { location.href = grupo; }, 2200);
      } else {
        lista.querySelector("[data-lista-ok-texto]").textContent =
          "Em breve você recebe no seu WhatsApp o link do grupo VIP com o aviso do lançamento e o seu cupom.";
      }
    };
  }
  escolher(document.querySelector(".plano input:checked").closest(".plano"));

  /* ---------- Contagem regressiva ----------
     Começa em 4min30s na primeira visita e continua de onde parou se a pessoa
     recarregar a página. Quando chega a zero, recomeça. */
  var CHAVE = "cellive-oferta-fim-v2";
  var DURACAO = (4 * 60 + 30) * 1000;
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
    if (resta === 0) {
      fim = Date.now() + DURACAO;
      try { localStorage.setItem(CHAVE, String(fim)); } catch (e) { /* sem armazenamento */ }
      resta = DURACAO;
    }
    var s = Math.ceil(resta / 1000);
    var h = Math.floor(s / 3600);
    contagem.textContent = (h ? dois(h) + ":" : "") + dois(Math.floor((s % 3600) / 60)) + ":" + dois(s % 60);
    contagem.parentNode.classList.toggle("is-urgente", s <= 60);
  }
  atualizar();
  setInterval(atualizar, 1000);

  /* ---------- Barra "vendido": cresce e conta até o valor ao aparecer ---------- */
  var estoque = document.querySelector("[data-estoque]");
  var vendido = document.querySelector("[data-vendido]");
  if (estoque) {
    var animarEstoque = function () {
      estoque.classList.add("is-visivel");
      if (!vendido) return;
      var alvo = Number(vendido.getAttribute("data-vendido"));
      var semMov = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (semMov) return;
      var inicio = null;
      var passo = function (t) {
        if (!inicio) inicio = t + 200;
        var k = Math.max(0, Math.min(1, (t - inicio) / 1800));
        vendido.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens, obs) {
        if (itens[0].isIntersecting) { animarEstoque(); obs.disconnect(); }
      }, { threshold: 0.6 }).observe(estoque);
    } else {
      animarEstoque();
    }
  }

  /* ---------- Topo: vira balão quando gruda no alto da tela ---------- */
  var topo = document.querySelector("[data-topo]");
  var faixaTopo = document.querySelector(".promo-faixa");
  var topoGruda = 0; // rolagem em que o topo encosta no alto (a altura da faixa azul)
  function medirTopo() { topoGruda = faixaTopo ? faixaTopo.offsetHeight : 0; rolou(); }
  function rolou() { topo.classList.toggle("is-rolando", window.scrollY > topoGruda + 8); }
  window.addEventListener("scroll", rolou, { passive: true });
  window.addEventListener("resize", medirTopo);
  medirTopo();

  /* ---------- Menu do topo (três tracinhos) ----------
     Abre um painel com as seções; tocar numa delas fecha o menu e rola até lá.
     As seções de baixo só ganham a altura real quando chegam perto da tela
     (content-visibility), então, quando a rolagem para, a posição é conferida
     e corrigida se precisar. */
  var menuBotao = document.querySelector("[data-menu-botao]");
  var menu = document.querySelector("[data-menu]");
  var menuTimer = 0;

  function abrirMenu() {
    clearTimeout(menuTimer);
    menu.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add("is-aberto"); }); });
    menuBotao.setAttribute("aria-expanded", "true");
    menuBotao.setAttribute("aria-label", "Fechar o menu");
    rastrear("clique", { e: "menu-abrir" });
  }
  function fecharMenu() {
    if (menu.hidden) return;
    menu.classList.remove("is-aberto");
    menuBotao.setAttribute("aria-expanded", "false");
    menuBotao.setAttribute("aria-label", "Abrir o menu");
    menuTimer = setTimeout(function () { menu.hidden = true; }, 320);
  }

  function quandoParar(cb) {
    var ultimo = -1;
    var vigia = setInterval(function () {
      if (window.scrollY === ultimo) { clearInterval(vigia); cb(); }
      ultimo = window.scrollY;
    }, 120);
  }
  function irParaSecao(alvo) {
    var folga = topo.offsetHeight + 12;
    var destino = function () { return Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - folga); };
    var tentativas = 0;
    var conferir = function () {
      var y = destino();
      if (Math.abs(window.scrollY - y) > 6 && tentativas++ < 4) {
        window.scrollTo({ top: y, behavior: "smooth" });
        quandoParar(conferir);
      }
    };
    window.scrollTo({ top: destino(), behavior: "smooth" });
    quandoParar(conferir);
  }

  if (menuBotao && menu) {
    menuBotao.addEventListener("click", function () {
      if (menu.hidden || !menu.classList.contains("is-aberto")) abrirMenu(); else fecharMenu();
    });
    Array.prototype.forEach.call(menu.querySelectorAll("[data-menu-ir]"), function (link) {
      link.addEventListener("click", function (ev) {
        var id = link.getAttribute("href").slice(1);
        var alvo = document.getElementById(id);
        if (!alvo) return;
        ev.preventDefault();
        fecharMenu();
        rastrear("clique", { e: "menu", val: id });
        irParaSecao(alvo);
      });
    });
    // fecha ao tocar fora, com Esc ou ao rolar a página
    document.addEventListener("pointerdown", function (ev) {
      if (!menu.hidden && !menu.contains(ev.target) && !menuBotao.contains(ev.target)) fecharMenu();
    });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") fecharMenu(); });
    var rolagemAoAbrir = 0;
    menuBotao.addEventListener("click", function () { rolagemAoAbrir = window.scrollY; });
    window.addEventListener("scroll", function () {
      if (!menu.hidden && menu.classList.contains("is-aberto") && Math.abs(window.scrollY - rolagemAoAbrir) > 60) fecharMenu();
    }, { passive: true });
  }

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

  /* ---------- Resultados: cartões que se abrem com a rolagem ----------
     A abertura segue a rolagem, mas com suavização: a cada quadro os cartões
     andam um pedaço do caminho até a posição certa, sem "pulos" quando o
     celular entrega a rolagem aos trancos. Só mexe em transform (fluido). */
  var pilha = document.querySelector("[data-res-pilha]");
  if (pilha) {
    var cartoesRes = Array.prototype.slice.call(pilha.querySelectorAll(".res-cartao"));
    var girosRes = [5, -5, 4];
    var alvoRes = 1, atualRes = 1, rodandoRes = false;

    var medirRes = function () {
      var alto = window.innerHeight;
      var p = (alto * 0.85 - pilha.getBoundingClientRect().top) / (alto * 0.6);
      p = Math.min(1, Math.max(0, p));
      return 1 - Math.pow(1 - p, 2);
    };
    var desenharRes = function (v) {
      cartoesRes.forEach(function (c, n) {
        c.style.transform = "translate3d(0," + (n * (28 + 134 * v)).toFixed(2) + "px,0) rotate(" + girosRes[n % 3] + "deg)";
      });
    };
    var quadroRes = function () {
      atualRes += (alvoRes - atualRes) * 0.14;
      if (Math.abs(alvoRes - atualRes) < 0.0008) atualRes = alvoRes;
      desenharRes(atualRes);
      if (atualRes !== alvoRes) requestAnimationFrame(quadroRes);
      else rodandoRes = false;
    };
    var aoRolarRes = function () {
      alvoRes = medirRes();
      if (!rodandoRes && alvoRes !== atualRes) { rodandoRes = true; requestAnimationFrame(quadroRes); }
    };
    if (!semMovimento) {
      atualRes = alvoRes = medirRes();
      desenharRes(atualRes);
      window.addEventListener("scroll", aoRolarRes, { passive: true });
      window.addEventListener("resize", aoRolarRes);
    }

    var contar = function (alvo) {
      var valor = Number(alvo.getAttribute("data-contar"));
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
    if ("IntersectionObserver" in window) {
      var obsNumero = new IntersectionObserver(function (itens) {
        itens.forEach(function (item) {
          if (item.isIntersecting) { contar(item.target); obsNumero.unobserve(item.target); }
        });
      }, { threshold: 0.8 });
      Array.prototype.forEach.call(pilha.querySelectorAll("[data-contar]"), function (n) { obsNumero.observe(n); });
    }
  }

  /* ---------- Faixa de benefícios em loop ----------
     Duplica a lista: a faixa anda de 0 até -50% e recomeça sem emenda,
     sempre na mesma velocidade (cerca de 40 px/s). */
  var faixa = document.querySelector("[data-faixa]");
  if (faixa) {
    var copiaFaixa = faixa.firstElementChild.cloneNode(true);
    copiaFaixa.setAttribute("aria-hidden", "true");
    faixa.appendChild(copiaFaixa);
    var tempoFaixa = function () {
      faixa.style.setProperty("--faixa-tempo", Math.round(faixa.scrollWidth / 2 / 40) + "s");
    };
    tempoFaixa();
    window.addEventListener("load", tempoFaixa);
  }

  /* ---------- Carrossel de vídeos ----------
     A pessoa arrasta para o lado (ou usa as setas). O vídeo do meio fica em
     destaque; tocar no vídeo dá play/pausa e só um toca por vez. */
  var carrossel = document.querySelector("[data-vid-carrossel]");
  if (carrossel) {
    var cardsVid = Array.prototype.slice.call(carrossel.querySelectorAll("[data-vid-card]"));
    var pontosVid = document.querySelector("[data-vid-pontos]");
    var anterior = document.querySelector("[data-vid-anterior]");
    var proximo = document.querySelector("[data-vid-proximo]");
    var atualVid = 0;

    cardsVid.forEach(function (card) {
      pontosVid.appendChild(document.createElement("span"));
      var video = card.querySelector("video");
      var tocar = function () {
        if (!card.classList.contains("tem-video")) return;
        if (video.paused) {
          if (window.CelliveRastreio) window.CelliveRastreio.evento("clique", { e: "video", val: cardsVid.indexOf(card) + 1 });
          cardsVid.forEach(function (outro) {
            var v = outro.querySelector("video");
            if (v !== video && !v.paused) v.pause();
          });
          video.play();
        } else {
          video.pause();
        }
      };
      video.addEventListener("loadedmetadata", function () { card.classList.add("tem-video"); });
      video.addEventListener("play", function () { card.classList.add("is-tocando"); });
      video.addEventListener("pause", function () { card.classList.remove("is-tocando"); });
      video.addEventListener("ended", function () { card.classList.remove("is-tocando"); });
      card.querySelector(".vid-play").addEventListener("click", tocar);
      video.addEventListener("click", tocar);
    });

    // Os vídeos não baixam na abertura da página (preload="none"); o começo de
    // cada um só é lido quando a pessoa chega perto da seção.
    var prepararVideos = function () {
      cardsVid.forEach(function (card) {
        var v = card.querySelector("video");
        // a capa do vídeo também só baixa aqui (não disputa com a primeira dobra)
        if (v.getAttribute("data-poster")) { v.poster = v.getAttribute("data-poster"); v.removeAttribute("data-poster"); }
        if (v.preload === "none") { v.preload = "metadata"; v.load(); }
      });
    };
    if ("IntersectionObserver" in window) {
      var olhoVid = new IntersectionObserver(function (entradas) {
        if (entradas.some(function (e) { return e.isIntersecting; })) { olhoVid.disconnect(); prepararVideos(); }
      }, { rootMargin: "700px 0px" });
      olhoVid.observe(carrossel);
    } else {
      prepararVideos();
    }

    var marcarVid = function () {
      var meio = carrossel.scrollLeft + carrossel.clientWidth / 2;
      var melhor = 0, menor = Infinity;
      cardsVid.forEach(function (card, i) {
        var d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - meio);
        if (d < menor) { menor = d; melhor = i; }
      });
      if (melhor !== atualVid) {
        var v = cardsVid[atualVid].querySelector("video");
        if (!v.paused) v.pause(); // saiu do meio: pausa
      }
      atualVid = melhor;
      cardsVid.forEach(function (card, i) { card.classList.toggle("is-atual", i === atualVid); });
      Array.prototype.forEach.call(pontosVid.children, function (p, i) { p.classList.toggle("is-ativo", i === atualVid); });
      anterior.disabled = atualVid === 0;
      proximo.disabled = atualVid === cardsVid.length - 1;
    };
    var irPara = function (i) {
      var card = cardsVid[Math.max(0, Math.min(cardsVid.length - 1, i))];
      carrossel.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - carrossel.clientWidth / 2, behavior: "smooth" });
    };
    anterior.addEventListener("click", function () { irPara(atualVid - 1); });
    proximo.addEventListener("click", function () { irPara(atualVid + 1); });
    carrossel.addEventListener("scroll", function () { requestAnimationFrame(marcarVid); }, { passive: true });
    marcarVid();
  }

  /* ---------- Os números falam por si ----------
     Frascos das laterais: mesma entrada da ação SRRP (--p de 0 a 1 com a
     rolagem). Barras: crescem e contam até o valor ao aparecer. */
  var numeros = document.querySelector("[data-numeros]");
  if (numeros) {
    var pedidoNum = 0;
    var atualizarNum = function () {
      pedidoNum = 0;
      var alto = window.innerHeight;
      var p = (alto * 0.95 - numeros.getBoundingClientRect().top) / (alto * 0.65);
      p = Math.min(1, Math.max(0, p));
      p = 1 - Math.pow(1 - p, 2);
      numeros.style.setProperty("--p", semMovimento ? "1" : p.toFixed(3));
    };
    var pedirNum = function () { if (!pedidoNum) pedidoNum = requestAnimationFrame(atualizarNum); };
    window.addEventListener("scroll", pedirNum, { passive: true });
    window.addEventListener("resize", pedirNum);
    atualizarNum();

    var listaNum = numeros.querySelector("[data-num-lista]");
    var contarBarras = function () {
      listaNum.classList.add("is-visivel");
      if (semMovimento) return;
      Array.prototype.forEach.call(listaNum.querySelectorAll("[data-contar-num]"), function (el, i) {
        var valor = Number(el.getAttribute("data-contar-num"));
        var inicio = null;
        var passo = function (t) {
          if (!inicio) inicio = t + i * 120;
          var k = Math.max(0, Math.min(1, (t - inicio) / 1400));
          el.textContent = Math.round(valor * (1 - Math.pow(1 - k, 3))) + "%";
          if (k < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      });
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens, obs) {
        if (itens[0].isIntersecting) { contarBarras(); obs.disconnect(); }
      }, { threshold: 0.3 }).observe(listaNum);
    } else {
      contarBarras();
    }
  }

  /* ---------- Jornada "como ele age na pele" ----------
     Avança sozinha a cada 9,5 s (barrinha enchendo, como stories) enquanto a
     seção está na tela. Ao tocar numa etapa ou arrastar o cartão, para de
     avançar sozinha e fica na escolha da pessoa. */
  var jornada = document.querySelector("[data-jornada]");
  if (jornada) {
    var abasJor = Array.prototype.slice.call(jornada.querySelectorAll("[data-jor-aba]"));
    var paineisJor = Array.prototype.slice.call(jornada.querySelectorAll("[data-jor-painel]"));
    var atualJor = 0;
    var manual = function () { jornada.classList.add("is-manual"); };

    // Gráfico: a parte azul (linha + área) e o ponto ativo vão até a etapa atual
    var graf = jornada.querySelector("[data-graf]");
    var grafPontos = graf ? JSON.parse(graf.getAttribute("data-graf-pontos")) : [];
    var grafCorte = graf && graf.querySelector("[data-graf-corte]");
    var grafAtivo = graf && graf.querySelector("[data-graf-ativo]");
    var grafGuia = graf && graf.querySelector("[data-graf-guia]");
    var grafPos = grafPontos.length ? grafPontos[0].slice() : null;
    var grafTween = 0;
    var moverGraf = function (i) {
      if (!graf) return;
      var de = grafPos.slice(), para = grafPontos[i];
      var inicio = null;
      cancelAnimationFrame(grafTween);
      var passo = function (t) {
        if (!inicio) inicio = t;
        var k = semMovimento ? 1 : Math.min(1, (t - inicio) / 700);
        var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        var x = de[0] + (para[0] - de[0]) * e, y = de[1] + (para[1] - de[1]) * e;
        grafPos = [x, y];
        grafCorte.setAttribute("width", (x + 0.5).toFixed(1));
        grafAtivo.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
        grafGuia.setAttribute("x1", x.toFixed(1));
        grafGuia.setAttribute("x2", x.toFixed(1));
        grafGuia.setAttribute("y1", y.toFixed(1));
        if (k < 1) grafTween = requestAnimationFrame(passo);
      };
      grafTween = requestAnimationFrame(passo);
    };
    if (graf) {
      moverGraf(0);
      Array.prototype.forEach.call(graf.querySelectorAll("[data-graf-alvo]"), function (alvo) {
        alvo.addEventListener("click", function () { manual(); irJor(Number(alvo.getAttribute("data-graf-alvo"))); });
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (itens, obs) {
          if (itens[0].isIntersecting) { graf.classList.add("is-visivel"); obs.disconnect(); }
        }, { threshold: 0.5 }).observe(graf);
      } else {
        graf.classList.add("is-visivel");
      }
    }

    var irJor = function (i) {
      atualJor = (i + abasJor.length) % abasJor.length;
      abasJor.forEach(function (aba, k) {
        aba.classList.toggle("is-ativa", k === atualJor);
        aba.classList.toggle("is-feita", k < atualJor);
        aba.setAttribute("aria-selected", k === atualJor ? "true" : "false");
        // reinicia a barrinha da etapa atual
        var cheia = aba.querySelector(".jor-barra-cheia");
        cheia.style.animation = "none";
        void cheia.offsetWidth;
        cheia.style.animation = "";
      });
      paineisJor.forEach(function (painel, k) {
        var ativo = k === atualJor;
        painel.classList.toggle("is-ativo", ativo);
        painel.hidden = !ativo;
      });
      moverGraf(atualJor);
    };
    if (semMovimento) manual();

    abasJor.forEach(function (aba, k) {
      aba.addEventListener("click", function () { manual(); irJor(k); });
      // quando a barrinha termina de encher, vai para a próxima etapa
      aba.querySelector(".jor-barra-cheia").addEventListener("animationend", function () {
        if (!jornada.classList.contains("is-manual") && k === atualJor) irJor(atualJor + 1);
      });
    });

    // arrastar o cartão para o lado
    var area = jornada.querySelector("[data-jor-paineis]");
    var x0 = null, y0 = null;
    area.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    area.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { manual(); irJor(atualJor + (dx < 0 ? 1 : -1)); }
    }, { passive: true });

    // só avança enquanto está na tela
    jornada.classList.add("is-pausada");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens) {
        jornada.classList.toggle("is-pausada", !itens[0].isIntersecting);
      }, { threshold: 0.5 }).observe(jornada);
    } else {
      jornada.classList.remove("is-pausada");
    }
  }

  /* ---------- Avaliações: barras de distribuição crescem ao aparecer ---------- */
  var resumoAval = document.querySelector("[data-aval-resumo]");
  if (resumoAval) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens, obs) {
        if (itens[0].isIntersecting) { resumoAval.classList.add("is-visivel"); obs.disconnect(); }
      }, { threshold: 0.4 }).observe(resumoAval);
    } else {
      resumoAval.classList.add("is-visivel");
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
