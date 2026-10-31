/* Página de oferta: galeria de fotos, escolha do plano, contagem regressiva
   e sombra do topo ao rolar. */
(function () {
  "use strict";

  /* Medições da tela (tamanho e posição) só depois que a primeira tela foi
     desenhada: medir antes obriga o celular a calcular a página inteira no meio
     do carregamento ("reflow forçado"), o que atrasa a primeira dobra. */
  var aposPintar = function (fn) {
    requestAnimationFrame(function () { setTimeout(fn, 0); });
  };

  /* ---------- Galeria (carrossel) ----------
     As fotos ficam lado a lado num trilho com rolagem que encaixa: dá para
     arrastar com o dedo ou tocar nas miniaturas. Sozinha, a galeria passa para
     a próxima foto a cada 4 segundos (pausa quando a pessoa mexe nela, quando
     sai da tela ou quando a aba fica em segundo plano). O selo "Anti-aging"
     só aparece na 1ª foto (as outras têm texto no canto).
     Carregamento: a foto 1 vem com a página; a 2ª quando a pessoa interage com a
     página (é quando a troca automática começa); as outras uma à frente da que
     está na tela (ou todas, se a pessoa mexer na galeria), no tamanho certo (srcset). */
  var trilhoGal = document.querySelector("[data-galeria-trilho]");
  var slides = trilhoGal ? Array.prototype.slice.call(trilhoGal.children) : [];
  var selos = document.querySelector(".galeria-selos");
  var miniaturas = Array.prototype.slice.call(document.querySelectorAll(".miniatura"));
  var fileiraMini = document.querySelector(".galeria-miniaturas");
  var atual = 0;
  var GAL_TEMPO = 4000;
  var galSemMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function carregarFoto(i) {
    var slide = slides[i];
    var img = slide && slide.querySelector("img[data-src]");
    if (!img) return null;
    var url = img.getAttribute("data-src");
    var srcset = img.getAttribute("data-srcset");
    img.removeAttribute("data-src");
    img.removeAttribute("data-srcset");
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
      if (srcset) img.srcset = srcset;
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
      if (k === i) m.setAttribute("aria-current", "true"); else m.removeAttribute("aria-current");
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

  if (trilhoGal && slides.length) {
    var pedidoGal = 0, paradaGal = 0;
    var mexeuAte = 0;        // até quando a troca automática fica pausada
    var mexeuAgora = false;  // a última rolagem foi da pessoa (só essas vão para o painel)
    var galNaTela = true, autoGal = 0;

    var irParaFoto = function (i) {
      i = (i + slides.length) % slides.length;
      carregarFoto(i);
      trilhoGal.scrollTo({ left: i * trilhoGal.clientWidth, behavior: galSemMovimento ? "auto" : "smooth" });
    };
    var pausar = function () { mexeuAte = Date.now() + 8000; mexeuAgora = true; };

    trilhoGal.addEventListener("scroll", function () {
      if (!pedidoGal) pedidoGal = requestAnimationFrame(function () {
        pedidoGal = 0;
        marcar(Math.round(trilhoGal.scrollLeft / trilhoGal.clientWidth));
      });
      // registra no painel quando a rolagem feita pela pessoa para
      clearTimeout(paradaGal);
      paradaGal = setTimeout(function () {
        if (mexeuAgora) rastrear("clique", { e: "galeria", val: String(atual + 1) });
        mexeuAgora = false;
      }, 400);
    }, { passive: true });

    ["touchstart", "pointerdown", "wheel"].forEach(function (ev) {
      trilhoGal.addEventListener(ev, pausar, { passive: true });
    });
    miniaturas.forEach(function (mini, i) {
      mini.addEventListener("click", function () { pausar(); irParaFoto(i); });
    });

    // começou a mexer na galeria: as fotos vizinhas vêm na hora
    trilhoGal.addEventListener("touchstart", function () { carregarFoto(1); baixarEmFila(); }, { once: true, passive: true });

    // troca automática a cada 4 s (só com a galeria na tela e a aba aberta)
    var agendarGal = function () {
      clearTimeout(autoGal);
      autoGal = setTimeout(function () {
        if (galNaTela && !document.hidden && Date.now() >= mexeuAte) irParaFoto(atual + 1);
        agendarGal();
      }, GAL_TEMPO);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { galNaTela = es[0].isIntersecting; }, { threshold: 0.5 }).observe(trilhoGal);
    }

    // A troca automática (e a 2ª foto) só começa quando a pessoa interage com a página
    // (rola, toca, mexe o mouse ou usa o teclado). Assim a primeira tela fica parada
    // enquanto carrega, e nada é baixado antes da hora.
    var galIniciada = false;
    var iniciarGal = function () {
      if (galIniciada) return;
      galIniciada = true;
      INTERACOES.forEach(function (ev) { window.removeEventListener(ev, iniciarGal, OPCOES_INTERACAO); });
      carregarFoto(1);
      agendarGal();
    };
    var INTERACOES = ["scroll", "touchstart", "pointerdown", "mousemove", "keydown", "wheel"];
    var OPCOES_INTERACAO = { passive: true };
    INTERACOES.forEach(function (ev) { window.addEventListener(ev, iniciarGal, OPCOES_INTERACAO); });
  }

  /* ---------- Animações só onde a pessoa está olhando ----------
     As animações que rodam sem parar (faixa que corre, pulsos, selos girando)
     ficam pausadas enquanto a seção está longe da tela: o celular não gasta
     bateria e processamento desenhando o que ninguém vê. */
  if ("IntersectionObserver" in window) {
    var olhoSecoes = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.target.classList.toggle("fora-da-tela", !e.isIntersecting); });
    }, { rootMargin: "250px 0px" });
    Array.prototype.forEach.call(document.querySelectorAll("main.oferta > section, .oferta-dobra > section"), function (sec) { olhoSecoes.observe(sec); });
  }

  /* ---------- Planos ---------- */
  var planos = document.querySelectorAll(".plano");
  var resumo = document.querySelector(".resumo");
  var resumoLista = document.querySelector("[data-resumo-lista]");
  var resumoParcela = document.querySelector("[data-resumo-parcela]");
  var resumoAvista = document.querySelector("[data-resumo-avista]");
  var resumoDe = document.querySelector("[data-resumo-de]");
  var comprar = document.querySelector("[data-comprar]");
  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // "R$ 24,83" -> 24.83 e volta
  var paraNumero = function (t) { return parseFloat(String(t).replace(/[^\d,]/g, "").replace(",", ".")) || 0; };
  var paraReais = function (n) { return "R$ " + n.toFixed(2).replace(".", ","); };

  // a parcela "corre" do valor antigo até o novo
  var contagemParcela = 0;
  function mostrarParcela(texto) {
    var de = paraNumero(resumoParcela.textContent), ate = paraNumero(texto);
    cancelAnimationFrame(contagemParcela);
    if (semMovimento || !de || !ate || de === ate) { resumoParcela.textContent = texto; return; }
    var inicio = performance.now(), duracao = 450;
    (function passo(agora) {
      var t = Math.min(1, (agora - inicio) / duracao);
      var suave = 1 - Math.pow(1 - t, 3);
      resumoParcela.textContent = t < 1 ? paraReais(de + (ate - de) * suave) : texto;
      if (t < 1) contagemParcela = requestAnimationFrame(passo);
    })(inicio);
  }

  /* Benefícios de cada kit (no máximo 4 linhas). Cada linha é uma lista de
     pedaços [texto, tipo]: tipo 0 = normal, 1 = negrito, 2 e 3 = dentro do
     fundo azul da economia (normal e negrito). Kit sem desconto: 3 linhas. */
  function beneficios(plano) {
    var off = plano.getAttribute("data-off");
    var economia = plano.getAttribute("data-economia");
    var qtd = (plano.getAttribute("data-qtd") || "").split(" · ");
    var linhas = [
      ["qtd", [[qtd[0], 1], [qtd[1] ? " · " + qtd[1] + " de tratamento" : ""]]],
      ["frete", [["Frete "], ["grátis", 1], [" para todo o Brasil"]]],
    ];
    if (off && economia) linhas.push(["off", [[off, 1], [" · "], ["Você economiza ", 2], [economia, 3]]]);
    linhas.push(["gar", [["Garantia de "], ["30 dias", 1]]]);
    return linhas;
  }

  // escreve os pedaços no <span>; com "ate", só os primeiros caracteres (efeito de digitação)
  function escrever(span, pedacos, ate) {
    span.textContent = "";
    var resto = ate == null ? Infinity : ate;
    var pilula = null;
    pedacos.forEach(function (p) {
      if (resto <= 0 || !p[0]) return;
      var t = p[0].slice(0, resto), tipo = p[1] || 0;
      resto -= t.length;
      var onde = span;
      if (tipo >= 2) {
        if (!pilula) { pilula = document.createElement("span"); pilula.className = "resumo-pilula"; span.appendChild(pilula); }
        onde = pilula;
      }
      if (tipo === 1 || tipo === 3) { var b = document.createElement("b"); b.textContent = t; onde.appendChild(b); }
      else onde.appendChild(document.createTextNode(t));
    });
  }
  var textoDe = function (pedacos) { return pedacos.map(function (p) { return p[0]; }).join(""); };

  // linha nova ou que mudou: fica azul e é "redigitada"
  function digitar(li, pedacos) {
    var span = li.firstElementChild;
    var total = textoDe(pedacos).length;
    var inicio = performance.now(), duracao = Math.min(520, 16 * total);
    li.classList.remove("is-novo", "is-realce");
    void li.offsetWidth; // reinicia o realce
    li.classList.add("is-novo", "is-realce");
    clearTimeout(li._faixa);
    li._faixa = setTimeout(function () { li.classList.remove("is-realce"); }, 1500);
    clearTimeout(li._azul);
    li._azul = setTimeout(function () { li.classList.remove("is-novo"); }, duracao + 120); // terminou de digitar: escurece
    cancelAnimationFrame(li._digita);
    (function passo(agora) {
      var t = Math.min(1, (agora - inicio) / duracao);
      escrever(span, pedacos, t < 1 ? Math.ceil(total * t) : null);
      if (t < 1) li._digita = requestAnimationFrame(passo);
    })(inicio);
  }

  function montarLista(plano, animar) {
    var atuais = {};
    Array.prototype.forEach.call(resumoLista.children, function (li) { atuais[li.getAttribute("data-k")] = li; });
    var algumaDigitando = false;
    beneficios(plano).forEach(function (linha) {
      var k = linha[0], pedacos = linha[1];
      var li = atuais[k];
      var mudou = !li || li.textContent !== textoDe(pedacos);
      if (!li) {
        li = document.createElement("li");
        li.setAttribute("data-k", k);
        li.appendChild(document.createElement("span"));
      }
      delete atuais[k];
      resumoLista.appendChild(li); // mantém a ordem
      if (mudou && animar && !semMovimento) { digitar(li, pedacos); algumaDigitando = true; }
      else if (mudou) escrever(li.firstElementChild, pedacos);
    });
    Object.keys(atuais).forEach(function (k) { resumoLista.removeChild(atuais[k]); });
    // leitor de tela: lê o resumo só depois da digitação
    if (algumaDigitando) {
      resumo.setAttribute("aria-busy", "true");
      clearTimeout(resumo._ocupado);
      resumo._ocupado = setTimeout(function () { resumo.removeAttribute("aria-busy"); }, 600);
    }
  }

  var refazer = function (el, classe) {
    if (!el || semMovimento) return;
    el.classList.remove(classe);
    void el.offsetWidth; // reinicia a animação
    el.classList.add(classe);
  };
  Array.prototype.forEach.call([resumo].concat(Array.prototype.slice.call(planos)), function (el) {
    if (el) el.addEventListener("animationend", function (ev) {
      if (ev.target !== el) return;
      el.classList.remove("is-trocando", "is-escolhendo");
    });
  });

  function escolher(plano, animar) {
    Array.prototype.forEach.call(planos, function (p) {
      p.classList.toggle("is-selecionado", p === plano);
    });
    var de = plano.getAttribute("data-de");
    montarLista(plano, animar);
    resumoAvista.textContent = plano.getAttribute("data-avista");
    resumoDe.textContent = de || "";
    resumoDe.hidden = !de;
    comprar.href = plano.getAttribute("data-link") || "#";
    if (animar) {
      mostrarParcela(plano.getAttribute("data-parcela"));
      refazer(plano, "is-escolhendo");
      refazer(resumo, "is-trocando");
    } else {
      resumoParcela.textContent = plano.getAttribute("data-parcela");
    }
  }

  var rastrear = function (tipo, dados) {
    if (window.CelliveRastreio) window.CelliveRastreio.evento(tipo, dados);
  };

  /* Ao escolher um kit, a página se ajusta para mostrar na mesma tela os kits,
     o resumo, o botão de compra, os selos de confiança e a nota das avaliações.
     Se não couber tudo, vai tirando do que é menos importante: primeiro os
     outros kits, depois a nota, depois os selos. Se já está tudo à vista, não mexe. */
  var secaoPlanos = document.getElementById("planos");
  var topoFixo = document.querySelector("[data-topo]");
  function enquadrar(plano) {
    if (!secaoPlanos) return;
    var folga = 10;
    var cima = Math.max(0, topoFixo ? topoFixo.getBoundingClientRect().bottom : 0) + folga;
    var baixo = window.innerHeight - folga;
    var espaco = baixo - cima;
    var visivel = function (el) { return el && el.getClientRects().length ? el : null; };
    var alto = function (el) { return el.getBoundingClientRect().top - 14; }; // 14 = selo em cima do cartão
    var fim = function (el) { return el.getBoundingClientRect().bottom; };
    var inicioKits = alto(planos[0]);
    var inicioEscolhido = alto(plano);
    var fins = [secaoPlanos.querySelector(".avaliacao"), secaoPlanos.querySelector(".confianca"), comprar]
      .filter(visivel).map(fim);
    var opcoes = [];
    fins.forEach(function (f) { opcoes.push([inicioKits, f], [inicioEscolhido, f]); });
    var escolha = null;
    for (var i = 0; i < opcoes.length; i++) {
      if (opcoes[i][1] - opcoes[i][0] <= espaco) { escolha = opcoes[i]; break; }
    }
    // nem o kit escolhido + botão cabem (tela muito baixa): mostra o botão embaixo
    if (!escolha) escolha = [fins[fins.length - 1] - espaco, fins[fins.length - 1]];
    if (escolha[0] >= cima && escolha[1] <= baixo) return; // já está tudo na tela
    // centraliza o pedaço escolhido no espaço livre
    var desloca = escolha[0] - cima - (espaco - (escolha[1] - escolha[0])) / 2;
    window.scrollTo({ top: Math.max(0, window.scrollY + desloca), behavior: semMovimento ? "auto" : "smooth" });
  }

  Array.prototype.forEach.call(planos, function (plano) {
    plano.querySelector("input").addEventListener("change", function () {
      escolher(plano, true);
      enquadrar(plano);
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
      return;
    }
    // lançado, mas o kit ainda não tem link de checkout (ex.: na prévia /oferta/lancamento)
    var link = comprar.getAttribute("href");
    if (!link || link === "#") {
      ev.preventDefault();
      alert("Prévia do lançamento: o link do checkout deste kit ainda não foi colocado.");
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
  escolher(document.querySelector(".plano input:checked").closest(".plano"), false);

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

  /* ---------- Faixa do topo: sempre em uma linha ----------
     Se o texto couber, fica parado. Se não couber, duplica o texto e faz correr
     em loop, a uma velocidade confortável de ler. Confere de novo quando a fonte
     da marca termina de carregar e quando a tela muda de tamanho. */
  var promoFaixa = document.querySelector("[data-faixa-topo]");
  var promoTrilho = promoFaixa && promoFaixa.querySelector("[data-faixa-trilho]");
  if (promoFaixa && promoTrilho) {
    var promoVisivel = function () {
      return Array.prototype.filter.call(promoTrilho.children, function (el) {
        return !el.hasAttribute("data-copia") && el.offsetWidth > 0;
      })[0];
    };
    var semMovPromo = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var conferirPromo = function () {
      var item = promoVisivel();
      if (!item) return;
      Array.prototype.forEach.call(promoTrilho.querySelectorAll("[data-copia]"), function (c) { c.remove(); });
      promoFaixa.classList.remove("is-correndo");
      var cabe = item.offsetWidth <= promoFaixa.clientWidth - 32;
      if (cabe || semMovPromo) return;
      var copia = item.cloneNode(true);
      copia.setAttribute("data-copia", "");
      copia.setAttribute("aria-hidden", "true");
      promoTrilho.appendChild(copia);
      promoFaixa.classList.add("is-correndo");
      var distancia = promoTrilho.scrollWidth / 2;
      promoFaixa.style.setProperty("--promo-tempo", Math.max(8, distancia / 45).toFixed(1) + "s"); // ~45 px por segundo
    };
    aposPintar(conferirPromo);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { aposPintar(conferirPromo); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { aposPintar(conferirPromo); });
    var larguraPromo = window.innerWidth;
    window.addEventListener("resize", function () {
      if (window.innerWidth === larguraPromo) return; // a barra do navegador subir/descer não conta
      larguraPromo = window.innerWidth;
      conferirPromo();
    });
    // longe da tela, o texto para de correr
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens) {
        promoFaixa.classList.toggle("is-parada", !itens[0].isIntersecting);
      }).observe(promoFaixa);
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
  aposPintar(medirTopo);

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
    }, { threshold: 0.35 }); // aparece mais cedo (antes esperava 60% na tela)
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
    aposPintar(marcarPonto);

    // Computador: setas passam um cartão por vez e dá para arrastar com o mouse
    var deposAnterior = document.querySelector("[data-depos-anterior]");
    var deposProximo = document.querySelector("[data-depos-proximo]");
    var passoDepo = function () {
      return cartoes.length > 1 ? cartoes[1].offsetLeft - cartoes[0].offsetLeft : depos.clientWidth;
    };
    var marcarSetas = function () {
      if (!deposAnterior || !deposProximo) return;
      deposAnterior.disabled = depos.scrollLeft <= 2;
      deposProximo.disabled = depos.scrollLeft >= depos.scrollWidth - depos.clientWidth - 2;
    };
    if (deposAnterior && deposProximo) {
      deposAnterior.addEventListener("click", function () { depos.scrollBy({ left: -passoDepo(), behavior: "smooth" }); });
      deposProximo.addEventListener("click", function () { depos.scrollBy({ left: passoDepo(), behavior: "smooth" }); });
      depos.addEventListener("scroll", marcarSetas, { passive: true });
      aposPintar(marcarSetas);
    }
    var arrasto = null;
    depos.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      arrasto = { x: e.clientX, inicio: depos.scrollLeft, moveu: false };
      depos.classList.add("is-arrastando");
    });
    window.addEventListener("pointermove", function (e) {
      if (!arrasto) return;
      var dx = e.clientX - arrasto.x;
      if (Math.abs(dx) > 4) arrasto.moveu = true;
      depos.scrollLeft = arrasto.inicio - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!arrasto) return;
      var moveu = arrasto.moveu;
      arrasto = null;
      depos.classList.remove("is-arrastando");
      // termina encaixado no cartão mais próximo
      var passo = passoDepo();
      depos.scrollTo({ left: Math.round(depos.scrollLeft / passo) * passo, behavior: "smooth" });
      if (moveu) {
        // um arrasto não vale como clique no cartão
        depos.addEventListener("click", function bloquear(ev) { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
      }
    });
  }

  /* ---------- Dúvidas: abre uma por vez (cada lista de dúvidas por conta própria) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".faq-item"), function (item) {
    var botao = item.querySelector(".faq-pergunta");
    botao.addEventListener("click", function () {
      var abrir = !item.classList.contains("is-aberto");
      var lista = item.closest("[data-faq]") || document;
      Array.prototype.forEach.call(lista.querySelectorAll(".faq-item"), function (outro) {
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
  var frascoInteiro = srrp && srrp.querySelector(".srrp-frasco-inteiro");
  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (srrp && listaSrrp) {
    var pedidoSrrp = 0;
    var atualizarSrrp = function () {
      pedidoSrrp = 0;
      var alto = window.innerHeight;
      // computador: o frasco inteiro fica no meio dos cartões, bem abaixo do título; o giro
      // acompanha o próprio frasco (começa quando ele entra na tela e termina perto do meio)
      var noComputador = frascoInteiro && frascoInteiro.offsetParent !== null;
      var p = noComputador
        ? (alto - frascoInteiro.getBoundingClientRect().top) / (alto * 0.55)
        : (alto * 0.9 - srrp.getBoundingClientRect().top) / (alto * 0.6);
      p = Math.min(1, Math.max(0, p));
      p = 1 - Math.pow(1 - p, 2);
      srrp.style.setProperty("--p", semMovimento ? "1" : p.toFixed(3));

      // a linha vai do 1º ao último número; a ponta dela fica a 62% da tela
      var primeiro = etapasSrrp[0].querySelector(".srrp-num").getBoundingClientRect();
      var ultimo = etapasSrrp[etapasSrrp.length - 1].querySelector(".srrp-num").getBoundingClientRect();
      var inicio = primeiro.top + primeiro.height / 2;
      var fim = ultimo.top + ultimo.height / 2;
      var ponta = alto * 0.62;
      // no computador as etapas ficam lado a lado: a linha enche da esquerda para a
      // direita enquanto a lista sobe na tela, e cada etapa acende quando a linha chega nela
      var horizontal = Math.abs(fim - inicio) < 4;
      var linha;
      if (horizontal) {
        var topoLista = listaSrrp.getBoundingClientRect().top;
        linha = semMovimento ? 1 : Math.min(1, Math.max(0, (alto * 0.85 - topoLista) / (alto * 0.4)));
      } else {
        linha = semMovimento ? 1 : Math.min(1, Math.max(0, (ponta - inicio) / (fim - inicio)));
      }
      listaSrrp.style.setProperty("--linha", linha.toFixed(3));
      Array.prototype.forEach.call(etapasSrrp, function (item, i) {
        var n = item.querySelector(".srrp-num").getBoundingClientRect();
        // computador: a fileira acende quando o cartão já entrou na tela (perto do pé dela)
        var chegou = horizontal ? linha >= i / Math.max(1, etapasSrrp.length - 1) - 0.001
          : noComputador ? item.getBoundingClientRect().top <= alto * 0.82
          : n.top + n.height / 2 <= ponta + 1;
        if (semMovimento || chegou) item.classList.add("is-visivel");
      });
    };
    var pedirSrrp = function () { if (!pedidoSrrp) pedidoSrrp = requestAnimationFrame(atualizarSrrp); };
    window.addEventListener("scroll", pedirSrrp, { passive: true });
    window.addEventListener("resize", pedirSrrp);
    aposPintar(atualizarSrrp);
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
    // velocidade pela largura da fila; a largura vem do observador (sem medir na abertura)
    var ajustarTempo = function (largura) {
      if (!(largura > 200)) return; // seção ainda não desenhada (fica com os 50 s padrão)
      trilho.style.setProperty("--cli-tempo", Math.round(largura / 2 / 30) + "s");
    };
    if ("ResizeObserver" in window) {
      new ResizeObserver(function (es) {
        var box = es[0].borderBoxSize && es[0].borderBoxSize[0];
        ajustarTempo(box ? box.inlineSize : es[0].contentRect.width);
      }).observe(trilho);
    } else {
      window.addEventListener("load", function () { ajustarTempo(trilho.scrollWidth); });
    }
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
    // celular: abrem de cima para baixo. Computador: o do meio fica parado e os
    // outros dois saem para os lados (esquerda e direita).
    var deitadoRes = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : { matches: false };
    var girosDeitado = [-6, 0, 6];
    var desenharRes = function (v) {
      var deitado = deitadoRes.matches;
      cartoesRes.forEach(function (c, n) {
        c.style.transform = deitado
          ? "translate3d(" + ((n - 1) * (34 + 286 * v)).toFixed(2) + "px,0,0) rotate(" + (girosDeitado[n % 3] * (0.4 + 0.6 * v)).toFixed(2) + "deg)"
          : "translate3d(0," + (n * (28 + 134 * v)).toFixed(2) + "px,0) rotate(" + girosRes[n % 3] + "deg)";
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
      aposPintar(function () {
        atualRes = alvoRes = medirRes();
        desenharRes(atualRes);
        window.addEventListener("scroll", aoRolarRes, { passive: true });
        window.addEventListener("resize", aoRolarRes);
      });
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
      }, { rootMargin: "250px 0px" });
      olhoVid.observe(carrossel);
      // capas: baixam bem antes (quando a pessoa ainda está umas 3 telas acima)
      var olhoCapa = new IntersectionObserver(function (entradas) {
        if (!entradas.some(function (e) { return e.isIntersecting; })) return;
        olhoCapa.disconnect();
        cardsVid.forEach(function (card) { var c = card.querySelector(".vid-capa"); if (c) c.loading = "eager"; });
      }, { rootMargin: "2500px 0px" });
      olhoCapa.observe(carrossel);
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
    /* Celular: roda. Um cartão no meio, os vizinhos menores dos lados; do último volta
       para o primeiro. Passa arrastando para o lado, pelas setas ou tocando num vizinho.
       No computador os 4 ficam lado a lado (sem roda). */
    var nVid = cardsVid.length;
    var telaGrande = window.matchMedia("(min-width: 1024px)");
    var rodaLigada = false;
    var posicaoRoda = function (i) {
      var off = ((i - atualVid) % nVid + nVid) % nVid;
      if (off > nVid / 2) off -= nVid;
      return off;
    };
    // cartões que deram a volta (ex.: da direita para a esquerda) pulam escondidos, sem
    // atravessar a tela: primeiro vão para fora da tela sem animação e, dois quadros depois,
    // entram animando. Funciona igual no Safari (iPhone) e no Chrome.
    var pendentesRoda = [], quadroRoda = 0;
    var assentarPendentes = function () {
      if (quadroRoda) { cancelAnimationFrame(quadroRoda); quadroRoda = 0; }
      pendentesRoda.forEach(function (card) {
        card.classList.remove("sem-transicao");
        card.style.setProperty("--off", card._off);
        card.classList.toggle("is-longe", Math.abs(card._off) > 1);
      });
      pendentesRoda = [];
    };
    var desenharRoda = function () {
      assentarPendentes();
      cardsVid.forEach(function (card, i) {
        var off = posicaoRoda(i);
        var antes = card._off;
        card._off = off;
        card.classList.toggle("is-atual", off === 0);
        if (antes !== undefined && Math.abs(off - antes) > 1) {
          card.classList.add("sem-transicao", "is-longe");
          card.style.setProperty("--off", off + (off > 0 ? 1 : -1));
          pendentesRoda.push(card);
        } else {
          card.style.setProperty("--off", off);
          card.classList.toggle("is-longe", Math.abs(off) > 1);
        }
      });
      if (pendentesRoda.length) {
        quadroRoda = requestAnimationFrame(function () {
          quadroRoda = requestAnimationFrame(function () { quadroRoda = 0; assentarPendentes(); });
        });
      }
      Array.prototype.forEach.call(pontosVid.children, function (p, i) { p.classList.toggle("is-ativo", i === atualVid); });
    };
    var irRoda = function (i) {
      var novo = (i % nVid + nVid) % nVid;
      if (novo === atualVid) return;
      var v = cardsVid[atualVid].querySelector("video");
      if (!v.paused) v.pause(); // saiu do meio: pausa
      atualVid = novo;
      desenharRoda();
    };
    var ligarRoda = function (ligar) {
      if (ligar === rodaLigada) return;
      rodaLigada = ligar;
      carrossel.classList.toggle("vid-roda", ligar);
      if (ligar) carrossel.scrollLeft = 0;
      cardsVid.forEach(function (card) {
        card._off = undefined;
        if (!ligar) { card.style.removeProperty("--off"); card.classList.remove("is-longe"); }
      });
      anterior.disabled = false;
      proximo.disabled = false;
      if (ligar) desenharRoda(); else marcarVid();
    };

    // arrastar para o lado (o arrasto para cima/baixo continua rolando a página)
    var inicioX = null, inicioY = 0;
    carrossel.addEventListener("pointerdown", function (ev) {
      if (!rodaLigada) return;
      inicioX = ev.clientX; inicioY = ev.clientY;
    });
    carrossel.addEventListener("pointerup", function (ev) {
      if (!rodaLigada || inicioX === null) return;
      var dx = ev.clientX - inicioX, dy = ev.clientY - inicioY;
      inicioX = null;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
        // no iPhone o arrasto também vira um "toque" logo depois: ignora por um instante
        // para o cartão não andar duas vezes
        carrossel._arrastouAte = Date.now() + 450;
        irRoda(atualVid + (dx < 0 ? 1 : -1));
      }
    });
    carrossel.addEventListener("pointercancel", function () { inicioX = null; });
    // toque: à direita do vídeo do meio avança, à esquerda volta, no meio dá play.
    // Vale pela posição na tela (não pelo cartão tocado), então funciona até no meio da
    // animação e com toques rápidos seguidos.
    carrossel.addEventListener("click", function (ev) {
      if (!rodaLigada || !ev.detail) return; // ev.detail 0 = teclado (Enter no botão): segue normal
      if (Date.now() < (carrossel._arrastouAte || 0)) { ev.preventDefault(); ev.stopPropagation(); return; }
      var caixa = carrossel.getBoundingClientRect();
      var distancia = ev.clientX - (caixa.left + caixa.width / 2);
      var metade = cardsVid[0].offsetWidth / 2;
      if (Math.abs(distancia) <= metade) return; // no vídeo do meio: play/pausa normal
      ev.preventDefault(); ev.stopPropagation();
      irRoda(atualVid + (distancia > 0 ? 1 : -1));
    }, true);
    carrossel.addEventListener("keydown", function (ev) {
      if (!rodaLigada) return;
      if (ev.key === "ArrowRight") { ev.preventDefault(); irRoda(atualVid + 1); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); irRoda(atualVid - 1); }
    });

    anterior.addEventListener("click", function () { if (rodaLigada) irRoda(atualVid - 1); else irPara(atualVid - 1); });
    proximo.addEventListener("click", function () { if (rodaLigada) irRoda(atualVid + 1); else irPara(atualVid + 1); });
    carrossel.addEventListener("scroll", function () {
      // na roda a caixa não pode rolar de lado (o navegador às vezes rola ao tocar num cartão)
      if (rodaLigada) { if (carrossel.scrollLeft) carrossel.scrollLeft = 0; return; }
      requestAnimationFrame(marcarVid);
    }, { passive: true });
    var conferirTela = function () { ligarRoda(!telaGrande.matches && nVid >= 3); };
    if (telaGrande.addEventListener) telaGrande.addEventListener("change", conferirTela);
    else if (telaGrande.addListener) telaGrande.addListener(conferirTela);
    conferirTela();
    aposPintar(function () { if (!rodaLigada) marcarVid(); });
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
    aposPintar(atualizarNum);

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
    var grafRotulos = graf ? Array.prototype.slice.call(graf.querySelectorAll("[data-graf-rotulo]")) : [];
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
      grafRotulos.forEach(function (rot, k) { rot.classList.toggle("is-ativo", k === atualJor); });
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

  /* "(1.430 Avaliações)" leva até a seção "Amado por +5.000 mulheres" */
  Array.prototype.forEach.call(document.querySelectorAll("[data-ir-depoimentos]"), function (link) {
    link.addEventListener("click", function (ev) {
      var alvo = document.getElementById("depoimentos");
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
    aposPintar(conferirBarra);

    // Proteção para o iPhone (iOS 26): às vezes o Safari e o navegador que abre
    // dentro de outros apps (WhatsApp, Instagram) deixam a barra "presa" no meio da
    // tela depois que a barra do navegador encolhe ou o teclado fecha. Aqui a barra
    // é colada no fim da área que a pessoa está vendo (visualViewport). No normal a
    // diferença é zero e nada muda. Com zoom de pinça ou teclado aberto não mexe.
    var vv = window.visualViewport;
    if (vv) {
      var desvioAtual = 0, pedido = false;
      var colarBarra = function () {
        pedido = false;
        var ativo = document.activeElement;
        var digitando = ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName);
        var desvio = 0;
        if (!digitando && vv.scale < 1.01) {
          desvio = Math.round(vv.offsetTop + vv.height - window.innerHeight);
          if (Math.abs(desvio) < 2 || Math.abs(desvio) > window.innerHeight / 2) desvio = 0;
        }
        if (desvio === desvioAtual) return;
        desvioAtual = desvio;
        barra.style.setProperty("--barra-desvio", desvio + "px");
      };
      var pedirColar = function () {
        if (pedido) return;
        pedido = true;
        requestAnimationFrame(colarBarra);
      };
      vv.addEventListener("resize", pedirColar);
      vv.addEventListener("scroll", pedirColar);
      window.addEventListener("scroll", pedirColar, { passive: true });
      window.addEventListener("pageshow", pedirColar);
      document.addEventListener("focusout", function () { setTimeout(pedirColar, 350); });
    }
    botaoBarra.addEventListener("click", function (ev) {
      var planosSecao = document.getElementById("planos");
      if (!planosSecao) return;
      ev.preventDefault();
      planosSecao.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
