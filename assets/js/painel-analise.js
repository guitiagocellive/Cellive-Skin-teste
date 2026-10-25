/* Análise automática do painel ("IA" de pontos de melhoria).

   1) resumir(dados, aux): junta só os números agregados do painel num
      resumo pequeno (sem nenhum dado de pessoa). Esse resumo também é o que
      vai para o Claude, quando a análise com o Claude está ligada.
   2) analisar(resumo): lê o resumo e escreve o relatório com regras de
      análise de conversão: acha o maior gargalo, estima quanto cada melhoria
      renderia em cliques no checkout e sugere o que fazer.

   Roda no navegador, de graça, sempre. O relatório tem o mesmo formato do
   que o Claude devolve, então o painel mostra os dois do mesmo jeito. */
(function () {
  "use strict";

  // Metas de referência aproximadas para funis de quiz (não são regras)
  var METAS = { quiz: 60, conclusao: 65, formula: 95, planos: 75, checkout: 30 };
  var PRECOS = { "1": 197.9, "2": 297.9, "3": 397.9 };

  var NUM = new Intl.NumberFormat("pt-BR");
  function n(v) { return NUM.format(Math.round(v || 0)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function taxa(a, b) { return b ? r1(100 * a / b) : null; }
  function p(v) { return v == null ? "–" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }
  function reais(v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function mediana(lista) {
    var l = (lista || []).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    if (!l.length) return null;
    var m = Math.floor(l.length / 2);
    return l.length % 2 ? l[m] : (l[m - 1] + l[m]) / 2;
  }
  var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  /* ================= 1. resumo ================= */
  function resumir(d, aux) {
    var k = d.kpi || {}, a = d.kpiAnt || null;
    var visitas = aux.visitas(k);
    var R = {
      periodo: aux.periodo,
      dados_de_exemplo: !!d.demo,
      metas_de_referencia_pct: METAS,
      volume: {
        visitas: visitas, visitantes_unicos: k.visitantes || 0, comecaram_quiz: k.iniciaram || 0,
        concluiram_quiz: k.concluiram || 0, viram_formula: k.oferta || 0, viram_planos: k.viram_planos || 0,
        clicaram_checkout: k.checkout || 0, cliques_checkout_total: k.checkout_cliques || 0,
      },
      conversao_total_pct: taxa(k.checkout, visitas),
    };

    // etapas principais e taxa de cada passagem
    var E = [
      { nome: "Visitas", n: visitas },
      { nome: "Começaram o quiz", n: k.iniciaram || 0, chave: "quiz" },
      { nome: "Concluíram o quiz", n: k.concluiram || 0, chave: "conclusao" },
      { nome: "Viram a fórmula", n: k.oferta || 0, chave: "formula" },
      { nome: "Viram os planos", n: k.viram_planos || 0, chave: "planos" },
      { nome: "Clicaram em comprar", n: k.checkout || 0, chave: "checkout" },
    ];
    R.passagens = E.slice(1).map(function (e, i) {
      var ant = E[i];
      return { de: ant.nome, para: e.nome, chave: e.chave, de_n: ant.n, para_n: e.n, taxa_pct: taxa(e.n, ant.n), meta_pct: METAS[e.chave] };
    });

    // período anterior (mesmo tamanho)
    if (a && aux.comparar) {
      var va = aux.visitas(a);
      R.anterior = {
        visitas: va, clicaram_checkout: a.checkout || 0, conversao_total_pct: taxa(a.checkout, va),
        variacao_visitas_pct: va ? r1(100 * (visitas - va) / va) : null,
        variacao_checkout_pct: a.checkout ? r1(100 * ((k.checkout || 0) - a.checkout) / a.checkout) : null,
      };
    }

    // telas do quiz: quantas pessoas e quanto cada uma perde
    var tempos = {};
    (d.tempoPergunta || []).forEach(function (x) { tempos[x.etapa] = x; });
    var lista = aux.etapasFunil;
    var ini = lista.findIndex(function (e) { return aux.telas[0] && e.id === aux.telas[0].id; });
    var fim = lista.findIndex(function (e) { return e.id === "oferta"; });
    R.quiz = [];
    if (ini >= 0 && fim > ini) {
      for (var i = ini; i <= fim; i++) {
        var e = lista[i], antes = i > ini ? lista[i - 1].n : null;
        var t = tempos[e.id];
        R.quiz.push({
          tela: e.nome, id: e.id, pergunta: !!aux.numeroPergunta[e.id], pessoas: e.n,
          saiu_antes: antes != null ? Math.max(0, antes - e.n) : 0,
          perda_pct: antes ? r1(100 * Math.max(0, antes - e.n) / antes) : 0,
          tempo_medio_s: t ? r1(t.ms / 1000) : null,
        });
      }
    }
    R.tempo_ate_formula_mediana_s = d.duracoes && d.duracoes.length ? Math.round(mediana(d.duracoes) / 1000) : null;

    // oferta: até onde leram, cliques, kits
    var sc = {};
    (d.secoes || []).forEach(function (x) { sc[x.etapa] = x.n; });
    R.oferta = {
      tempo_mediano_s: d.tempoOferta && d.tempoOferta.length ? Math.round(mediana(d.tempoOferta) / 1000) : null,
      leitura_por_secao_pct: aux.secoes.map(function (s) { return { secao: s[1], pct: taxa(sc[s[0]] || 0, k.oferta) }; }),
      cliques_mais_comuns: (d.cliques || []).slice().sort(function (x, y) { return y.n - x.n; }).slice(0, 8).map(function (c) {
        return { item: aux.nomeClique(c), pessoas: c.n, etapa: c.etapa, valor: c.valor };
      }),
    };
    var totalCk = 0, receita = 0;
    var kits = ["1", "2", "3"].map(function (v) {
      var x = (d.checkoutPlano || []).filter(function (c) { return String(c.valor) === v; })[0];
      var nn = x ? x.n : 0;
      totalCk += nn; receita += nn * PRECOS[v];
      return { kit: "Kit " + v, preco: PRECOS[v], foram_ao_checkout: nn };
    });
    kits.forEach(function (x) { x.pct = taxa(x.foram_ao_checkout, totalCk); });
    R.oferta.kits = kits;
    R.oferta.ticket_medio_estimado = totalCk ? Math.round(receita / totalCk * 100) / 100 : null;
    R.oferta.kit_que_vem_marcado = "Kit 2";

    // origem
    var orig = function (campo, max) {
      return ((d.origem && d.origem[campo]) || []).slice(0, max).map(function (l) {
        return { nome: l.nome, visitas: l.visitas, conversao_pct: taxa(l.checkouts, l.visitas), checkouts: l.checkouts };
      });
    };
    R.origem = { fontes: orig("fonte", 6), campanhas: orig("campanha", 6), aparelhos: orig("aparelho", 4) };

    // horários
    var porHora = {}, porDia = {};
    (d.porHora || []).forEach(function (x) {
      porHora[x.hora] = (porHora[x.hora] || 0) + x.n;
      porDia[x.semana] = (porDia[x.semana] || 0) + x.n;
    });
    var horas = Object.keys(porHora).sort(function (x, y) { return porHora[y] - porHora[x]; });
    var dias = Object.keys(porDia).sort(function (x, y) { return porDia[y] - porDia[x]; });
    R.horarios = {
      horas_de_pico: horas.slice(0, 3).map(function (h) { return h + "h"; }),
      dia_de_pico: dias.length ? DIAS[dias[0]] : null,
    };

    // respostas que mais e menos levam à compra
    R.respostas_destaque = respostasDestaque(d, aux, k);

    R.erros = (d.erros || []).slice(0, 3).map(function (e) { return { erro: String(e.valor).slice(0, 120), vezes: e.n }; });
    return R;
  }

  function respostasDestaque(d, aux, k) {
    var base = k.iniciaram ? (k.checkout || 0) / k.iniciaram : 0;
    var porPergunta = {};
    (d.respostas || []).forEach(function (r) { (porPergunta[r.etapa] = porPergunta[r.etapa] || []).push(r); });
    var todas = [];
    aux.perguntas.forEach(function (pg) {
      var cont = {}, conv = {}, total = 0;
      (porPergunta[pg.id] || []).forEach(function (r) {
        total += r.n;
        (pg.multipla ? String(r.valor).split("|") : [r.valor]).forEach(function (op) {
          cont[op] = (cont[op] || 0) + r.n;
          conv[op] = (conv[op] || 0) + (r.conv || 0);
        });
      });
      Object.keys(cont).forEach(function (op) {
        if (cont[op] < Math.max(15, total * 0.05)) return;
        todas.push({ pergunta: aux.numeroPergunta[pg.id] + " · " + (aux.curtos[pg.id] || pg.titulo), resposta: op, pessoas: cont[op], conversao_pct: taxa(conv[op], cont[op]), forca: base ? r1((conv[op] / cont[op]) / base) : null });
      });
    });
    todas.sort(function (x, y) { return (y.forca || 0) - (x.forca || 0); });
    return { conversao_media_de_quem_comecou_pct: r1(100 * base), melhores: todas.slice(0, 3), piores: todas.slice(-2).reverse() };
  }

  /* ================= 2. análise ================= */
  function analisar(R) {
    var V = R.volume;
    var pontos = [], positivos = [];
    var checkouts = V.clicaram_checkout;

    if (!V.visitas) {
      return {
        nota: null, titulo: "Ainda não há visitas neste período",
        resumo: "Assim que as pessoas começarem a entrar no quiz, a análise aparece aqui com os pontos de melhoria.",
        gargalo: { etapa: "", explicacao: "" }, pontos: [], positivos: [],
      };
    }

    // ---------- passagens do funil abaixo da meta ----------
    var piorQuiz = null;
    R.quiz.forEach(function (t, i) {
      if (i === 0 || t.id === "oferta") return;
      if (!piorQuiz || t.saiu_antes > piorQuiz.saiu_antes) piorQuiz = t;
    });
    var leitura = R.oferta.leitura_por_secao_pct || [];
    var quedaLeitura = null;
    for (var i = 1; i < leitura.length; i++) {
      var q = (leitura[i - 1].pct || 0) - (leitura[i].pct || 0);
      if (!quedaLeitura || q > quedaLeitura.q) quedaLeitura = { q: q, depois: leitura[i - 1].secao };
    }
    var faq = (R.oferta.cliques_mais_comuns || []).filter(function (c) { return c.etapa === "faq"; })[0];

    var notaSoma = 0, notaN = 0, notaPior = 1, gargalo = null;
    R.passagens.forEach(function (ps) {
      if (ps.taxa_pct == null) return;
      var parte = Math.min(1, ps.taxa_pct / ps.meta_pct);
      notaSoma += parte; notaN++;
      notaPior = Math.min(notaPior, parte);
      var abaixo = ps.taxa_pct < ps.meta_pct;
      var depois = ps.para_n ? checkouts / ps.para_n : 0; // de quem chega aqui, quantos compram
      var ganhoPessoas = abaixo ? ps.de_n * (ps.meta_pct - ps.taxa_pct) / 100 : 0;
      var ganho = ganhoPessoas * depois;
      if (ps.chave === "checkout") ganho = ganhoPessoas;
      var saem = ps.de_n - ps.para_n;
      if (!abaixo) {
        if (ps.de_n >= 20) positivos.push(frasePositiva(ps));
        return;
      }
      var pt = pontoDaPassagem(ps, saem, { piorQuiz: piorQuiz, quedaLeitura: quedaLeitura, faq: faq });
      pt._ganho = ganho;
      pt.impacto = ganho >= 1 ? "Se chegar à meta de " + p(ps.meta_pct) + ": ≈ +" + n(ganho) + " cliques no checkout no período" : "";
      pontos.push(pt);
      if (!gargalo || ganho > gargalo.ganho || (ganho === gargalo.ganho && saem > gargalo.saem)) {
        gargalo = { ganho: ganho, saem: saem, ps: ps };
      }
    });

    // ---------- pergunta demorada ----------
    var tempos = R.quiz.filter(function (t) { return t.pergunta && t.tempo_medio_s; });
    var medT = mediana(tempos.map(function (t) { return t.tempo_medio_s; }));
    var lenta = tempos.slice().sort(function (x, y) { return y.tempo_medio_s - x.tempo_medio_s; })[0];
    if (lenta && medT && lenta.tempo_medio_s > medT * 1.8 && lenta.tempo_medio_s > 12) {
      pontos.push({
        prioridade: "baixa", area: "Quiz", _ganho: 0.5,
        titulo: "A pergunta “" + semCodigo(lenta.tela) + "” é a mais demorada",
        detalhe: "As pessoas levam " + lenta.tempo_medio_s.toLocaleString("pt-BR") + "s para responder, contra " + r1(medT).toLocaleString("pt-BR") + "s nas outras. Pergunta difícil cansa e faz gente desistir.",
        acao: "Encurte o texto da pergunta, reduza as opções ou troque por imagens simples. Se ela não muda a fórmula, considere tirar.",
        impacto: "",
      });
    }

    // ---------- fontes de tráfego ----------
    var minV = R.dados_de_exemplo ? 20 : 30;
    var fontes = (R.origem.fontes || []).filter(function (f) { return f.visitas >= minV && f.conversao_pct != null; });
    if (fontes.length >= 2) {
      var ord = fontes.slice().sort(function (x, y) { return y.conversao_pct - x.conversao_pct; });
      var melhor = ord[0], pior = ord[ord.length - 1];
      var media = R.conversao_total_pct || 0;
      if (melhor.conversao_pct > 0 && pior.conversao_pct * 1.5 <= melhor.conversao_pct) {
        var ganhoF = pior.visitas * Math.max(0, media - pior.conversao_pct) / 100;
        pontos.push({
          prioridade: "media", area: "Tráfego", _ganho: ganhoF,
          titulo: "“" + melhor.nome + "” converte bem mais que “" + pior.nome + "”",
          detalhe: melhor.nome + " leva " + p(melhor.conversao_pct) + " das visitas ao checkout; " + pior.nome + " leva " + p(pior.conversao_pct) + " (" + n(pior.visitas) + " visitas).",
          acao: "Aumente aos poucos a verba onde converte mais. Em “" + pior.nome + "”, revise o anúncio e o público: muitas vezes o anúncio promete algo diferente do que a capa mostra.",
          impacto: ganhoF >= 1 ? "Se “" + pior.nome + "” chegar à média: ≈ +" + n(ganhoF) + " cliques no checkout" : "",
        });
      }
      positivos.push("“" + melhor.nome + "” é a fonte que mais converte: " + p(melhor.conversao_pct) + " das visitas chegam ao checkout.");
    }

    // ---------- celular x computador ----------
    var ap = {};
    (R.origem.aparelhos || []).forEach(function (x) { ap[x.nome] = x; });
    var cel = ap.celular, pc = ap.computador;
    if (cel && pc && cel.visitas >= minV && pc.visitas >= minV && cel.conversao_pct && pc.conversao_pct != null) {
      var maior = cel.conversao_pct >= pc.conversao_pct ? cel : pc, menor = maior === cel ? pc : cel;
      if (menor.conversao_pct * 1.6 <= maior.conversao_pct) {
        pontos.push({
          prioridade: "baixa", area: "Técnico", _ganho: menor.visitas * (maior.conversao_pct - menor.conversao_pct) / 200,
          titulo: "No " + menor.nome + " a conversão é bem menor",
          detalhe: "No " + maior.nome + ": " + p(maior.conversao_pct) + ". No " + menor.nome + ": " + p(menor.conversao_pct) + ".",
          acao: "Abra o quiz e a oferta no " + menor.nome + " e confira se os botões aparecem bem, se as imagens carregam e se nada fica cortado.",
          impacto: "",
        });
      }
    }

    // ---------- mix de kits ----------
    var kits = R.oferta.kits || [];
    var totalK = kits.reduce(function (s, x) { return s + x.foram_ao_checkout; }, 0);
    if (totalK >= 10) {
      var k1 = kits[0], k2 = kits[1];
      if (k1.pct >= 45) {
        pontos.push({
          prioridade: "media", area: "Preço e checkout", _ganho: totalK * 0.05,
          titulo: "A maioria escolhe o kit mais barato",
          detalhe: p(k1.pct) + " dos cliques no checkout são no Kit 1. Ticket médio estimado: " + reais(R.oferta.ticket_medio_estimado || 0) + ".",
          acao: "Mostre o preço por unidade de cada kit e quantos dias de uso cada um cobre, deixe a economia do Kit 2 e do Kit 3 bem visível e mantenha o Kit 2 marcado.",
          impacto: "Se 1 em cada 10 pessoas trocar o Kit 1 pelo Kit 2, o ticket médio sobe ≈ " + reais(0.1 * (PRECOS["2"] - PRECOS["1"])),
        });
      } else if (k2.pct >= 40) {
        positivos.push("O Kit 2 (que já vem marcado) é o mais escolhido: " + p(k2.pct) + " dos cliques no checkout.");
      }
    }

    // ---------- respostas que mais compram ----------
    var rd = R.respostas_destaque;
    var top = rd && rd.melhores && rd.melhores[0];
    if (top && top.forca >= 1.4 && top.pessoas >= 20) {
      pontos.push({
        prioridade: "baixa", area: "Público", _ganho: 0.4,
        titulo: "Um tipo de cliente compra muito mais",
        detalhe: "Quem responde “" + top.resposta + "” em " + top.pergunta + " vai ao checkout " + top.forca.toLocaleString("pt-BR") + "× mais que a média (" + p(top.conversao_pct) + ").",
        acao: "Crie anúncios falando direto com esse público, com a mesma dor ou desejo dessa resposta, e acompanhe aqui se a conversão sobe.",
        impacto: "",
      });
    }

    // ---------- tendência ----------
    var A = R.anterior;
    var frTend = "";
    if (A && A.conversao_total_pct && R.conversao_total_pct != null && A.visitas >= 30) {
      var varConv = r1(100 * (R.conversao_total_pct - A.conversao_total_pct) / A.conversao_total_pct);
      if (varConv <= -15) {
        pontos.push({
          prioridade: "alta", area: "Tráfego", _ganho: 1e6,
          titulo: "A conversão caiu " + p(Math.abs(varConv)) + " em relação ao período anterior",
          detalhe: "Antes: " + p(A.conversao_total_pct) + ". Agora: " + p(R.conversao_total_pct) + ".",
          acao: "Veja o que mudou nesse tempo: anúncio novo, público novo, preço ou alguma parte da página. Compare as fontes na aba Público para achar a origem da queda.",
          impacto: "",
        });
        frTend = " A conversão caiu " + p(Math.abs(varConv)) + " em relação ao período anterior.";
      } else if (varConv >= 10) {
        positivos.push("A conversão subiu " + p(varConv) + " em relação ao período anterior (de " + p(A.conversao_total_pct) + " para " + p(R.conversao_total_pct) + ").");
        frTend = " A conversão subiu " + p(varConv) + " em relação ao período anterior.";
      }
    }

    // ---------- erros ----------
    var errosN = (R.erros || []).reduce(function (s, e) { return s + e.vezes; }, 0);
    if (errosN) {
      pontos.push({
        prioridade: errosN >= 5 ? "alta" : "media", area: "Técnico", _ganho: errosN >= 5 ? 1e5 : 2,
        titulo: "O site registrou " + n(errosN) + " erro" + (errosN > 1 ? "s" : "") + " nos aparelhos das visitantes",
        detalhe: "O mais comum: “" + R.erros[0].erro + "” (" + n(R.erros[0].vezes) + "×).",
        acao: "Peça para quem cuida do site corrigir esse erro. Erro de script pode travar o quiz ou o botão de compra em alguns celulares.",
        impacto: "",
      });
    }

    // ---------- horários (só com volume) ----------
    if (V.visitas >= 200 && R.horarios.horas_de_pico.length) {
      pontos.push({
        prioridade: "baixa", area: "Tráfego", _ganho: 0.3,
        titulo: "Seu público entra mais às " + R.horarios.horas_de_pico.slice(0, 2).join(" e "),
        detalhe: "O dia com mais visitas é " + R.horarios.dia_de_pico + ".",
        acao: "Concentre mais verba dos anúncios nesses horários e evite trocar anúncios bem nesse pico.",
        impacto: "",
      });
    }

    // ---------- ordem e prioridade ----------
    pontos.forEach(function (pt) {
      if (pt.prioridade) return;
      var rel = checkouts ? pt._ganho / checkouts : pt._ganho > 0 ? 1 : 0;
      pt.prioridade = rel >= 0.15 ? "alta" : rel >= 0.05 ? "media" : "baixa";
    });
    var PESO = { alta: 3, media: 2, baixa: 1 };
    pontos.sort(function (x, y) { return PESO[y.prioridade] - PESO[x.prioridade] || y._ganho - x._ganho; });
    pontos.forEach(function (pt) { delete pt._ganho; });

    // ---------- nota, título e resumo ----------
    // metade pela média das etapas, metade pela etapa mais fraca (o funil é tão bom quanto o seu pior ponto)
    var nota = notaN ? Math.round(100 * (0.5 * notaSoma / notaN + 0.5 * Math.pow(notaPior, 1.5))) : null;
    if (nota != null && errosN >= 5) nota = Math.max(0, nota - 10);

    var g = gargalo ? gargalo.ps : null;
    var gEtapa = g ? NOME_PASSAGEM[g.chave] : "";
    var titulo = g ? "O maior vazamento está " + ONDE[g.chave] : "O funil está dentro das metas de referência";
    var resumo = n(V.visitas) + " visitas no período geraram " + n(checkouts) + " cliques em comprar (conversão de " + p(R.conversao_total_pct) + ")." + frTend;
    if (g) resumo += " Melhorar " + ONDE_CURTO[g.chave] + " é o que mais pode aumentar as vendas agora.";
    if (V.visitas < 100) resumo += " Ainda são poucas visitas, então trate as conclusões como preliminares.";

    var explic = "";
    if (g) {
      explic = p(r1(100 - g.taxa_pct)) + " das pessoas param entre “" + g.de + "” e “" + g.para + "” (" + n(g.de_n - g.para_n) + " pessoas). A meta de referência é chegar a " + p(g.meta_pct) + " nessa passagem; hoje está em " + p(g.taxa_pct) + ".";
      if (g.chave === "conclusao" && piorQuiz) explic += " A tela que mais perde gente é “" + semCodigo(piorQuiz.tela) + "”.";
    }

    return {
      nota: nota, titulo: titulo, resumo: resumo,
      gargalo: { etapa: gEtapa, explicacao: explic },
      pontos: pontos.slice(0, 6), positivos: positivos.slice(0, 4),
    };
  }

  var ONDE = { quiz: "na capa", conclusao: "no meio do quiz", formula: "entre o quiz e a fórmula", planos: "na leitura da oferta", checkout: "na hora de comprar" };
  var ONDE_CURTO = { quiz: "a capa", conclusao: "o quiz", formula: "a passagem para a fórmula", planos: "a oferta", checkout: "a decisão de compra" };
  var NOME_PASSAGEM = {
    quiz: "A capa (começar o quiz)", conclusao: "O quiz (terminar as perguntas)", formula: "A passagem do quiz para a fórmula",
    planos: "A leitura da oferta (chegar aos preços)", checkout: "A decisão de compra (clicar em comprar)",
  };

  function semCodigo(t) { return String(t).replace(/^P\d+\s·\s/, ""); }

  function frasePositiva(ps) {
    var nomes = {
      quiz: "A capa convence: " + p(ps.taxa_pct) + " das visitas começam o quiz.",
      conclusao: "O quiz segura bem: " + p(ps.taxa_pct) + " de quem começa chega ao fim.",
      formula: "Quase todo mundo que termina o quiz vê a fórmula (" + p(ps.taxa_pct) + ").",
      planos: p(ps.taxa_pct) + " de quem abre a oferta chega até os preços.",
      checkout: "Os preços convencem: " + p(ps.taxa_pct) + " de quem vê os planos clica em comprar.",
    };
    return nomes[ps.chave];
  }

  function pontoDaPassagem(ps, saem, x) {
    var base = { prioridade: null, impacto: "" };
    var det = p(ps.taxa_pct) + " passam de “" + ps.de + "” para “" + ps.para + "” (meta de referência: " + p(ps.meta_pct) + "). " + n(saem) + " pessoas saem aqui.";
    switch (ps.chave) {
      case "quiz":
        return Object.assign(base, {
          area: "Capa", titulo: "Muita gente sai da capa sem começar o quiz", detalhe: det,
          acao: "Deixe a promessa da capa mais direta (o que a pessoa ganha, em uma frase), mantenha o botão visível na primeira tela do celular e confira se o anúncio fala da mesma coisa que a capa. Teste um título novo por uma semana e compare aqui.",
        });
      case "conclusao":
        var pq = x.piorQuiz;
        var ehPergunta = pq && pq.pergunta;
        return Object.assign(base, {
          area: "Quiz",
          titulo: pq ? "O quiz perde gente na tela “" + semCodigo(pq.tela) + "”" : "Muita gente começa o quiz e não termina",
          detalhe: det + (pq ? " A maior saída é nessa tela: " + p(pq.perda_pct) + " de quem chega nela sai (" + n(pq.saiu_antes) + " pessoas)." : ""),
          acao: ehPergunta
            ? "Simplifique essa pergunta (texto mais curto, menos opções) ou leve-a para mais perto do fim do quiz. Se for uma pergunta pessoal, explique em uma linha por que ela ajuda a montar a fórmula."
            : "Encurte essa tela de transição e deixe o botão de continuar mais visível. Mostrar quanto falta para terminar também ajuda.",
        });
      case "formula":
        return Object.assign(base, {
          area: "Técnico", titulo: "Parte de quem termina o quiz não chega a ver a fórmula", detalhe: det,
          acao: "Encurte a tela “montando a fórmula” e confira se a página da oferta abre rápido no celular (vídeos e imagens pesadas atrasam). Veja também a seção Saúde do site na aba Público.",
        });
      case "planos":
        return Object.assign(base, {
          area: "Oferta", titulo: "Muitas pessoas não chegam até os preços",
          detalhe: det + (x.quedaLeitura && x.quedaLeitura.q > 5 ? " A leitura cai mais depois da seção “" + x.quedaLeitura.depois + "”." : ""),
          acao: "Coloque um botão “Ver meu kit” logo no começo da oferta levando direto aos preços e deixe as seções antes dos planos mais curtas.",
        });
      default:
        return Object.assign(base, {
          area: "Preço e checkout", titulo: "Quem vê os preços ainda hesita em comprar",
          detalhe: det + (x.faq ? " A dúvida mais aberta é “" + String(x.faq.item).replace(/^Dúvida · /, "") + "”." : ""),
          acao: "Deixe a garantia e as formas de pagamento (parcelamento, Pix) bem ao lado do preço, mostre o preço por unidade de cada kit e responda a dúvida mais aberta perto do botão de compra.",
        });
    }
  }

  window.PainelAnalise = { resumir: resumir, analisar: analisar, METAS: METAS };
})();
