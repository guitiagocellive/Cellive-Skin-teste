/* POST /api/agente — o "Estrategista": chat de IA do painel.

   Recebe a conversa (texto, e também imagens, PDFs e planilhas anexados),
   consulta os números da própria plataforma quando precisa (ferramenta
   consultar_metricas, que usa a mesma conta do painel) e responde com uma
   análise de conversão em português simples, com blocos visuais (números
   em destaque e barras) que o painel desenha.

   A resposta vem aos poucos (uma linha JSON por evento):
     {"tipo":"status","texto":"Consultando os números de hoje…"}
     {"tipo":"resposta","texto":"..."}   ou   {"tipo":"erro","texto":"..."}

   Precisa da variável ANTHROPIC_API_KEY na Vercel (a mesma da análise).
   Limite: AGENTE_LIMITE_DIA mensagens por dia (padrão 150). */
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { autorizado, banco, json } from "./_db.js";
import { dadosPainel } from "./painel.js";
import { insightsMeta, metaLigada } from "./_meta.js";

const FONTES_META = ["facebook", "fb", "ig", "instagram", "messenger", "msg", "an", "meta"];

const MODELO = process.env.IA_MODELO || "claude-opus-5-5";
const LIMITE_DIA = Number(process.env.AGENTE_LIMITE_DIA) || 150;
const MAX_VOLTAS = 6; // no máximo 6 consultas de dados por pergunta
const DIA_MS = 864e5;

/* ---------- nomes das telas e perguntas do quiz (do próprio quiz-perguntas.js) ---------- */
let NOMES = null;
export async function nomesDoQuiz() {
  if (NOMES) return NOMES;
  NOMES = { telas: [], titulo: {} };
  try {
    const codigo = await readFile(new URL("../assets/js/quiz-perguntas.js", import.meta.url), "utf8");
    const ctx = { window: {} };
    vm.runInNewContext(codigo, ctx, { timeout: 500 });
    let n = 0;
    (ctx.window.QUIZ_FLUXO || []).forEach((b) => {
      if (b.perguntas) {
        b.perguntas.forEach((p) => {
          n++;
          const nome = "P" + n + " · " + p.titulo + (p.ativo ? " (ativo: " + p.ativo.nome + ")" : "");
          NOMES.telas.push({ id: p.id, nome });
          NOMES.titulo[p.id] = nome;
        });
      } else {
        const id = b.id || b.tipo;
        NOMES.telas.push({ id, nome: "Tela: " + id });
        NOMES.titulo[id] = "Tela: " + id;
      }
    });
  } catch (e) { /* sem nomes: usa os códigos */ }
  return NOMES;
}

/* ---------- datas no horário de Brasília (UTC-3, sem horário de verão) ---------- */
function hojeBR() {
  return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
}
function inicioDoDia(iso) { return Date.parse(iso + "T00:00:00-03:00"); }
function dataValida(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(inicioDoDia(s)); }

/* ---------- resumo compacto dos números (o que o agente lê) ---------- */
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
function mediana(lista) {
  const l = (lista || []).filter((v) => v > 0).sort((a, b) => a - b);
  if (!l.length) return null;
  const m = Math.floor(l.length / 2);
  return l.length % 2 ? l[m] : (l[m - 1] + l[m]) / 2;
}
function visitasDe(k, v2) {
  return Number(k.entrada) || (v2 ? Number(k.oferta) : Math.max(Number(k.capa) || 0, Number(k.quiz) || 0)) || Number(k.sessoes) || 0;
}

function compactar(d, nomes, pedido) {
  const v2 = d.versao === "v2";
  const k = d.kpi || {}, a = d.kpiAnt || {};
  const visitas = visitasDe(k, v2), visitasAnt = visitasDe(a, v2);
  const nomeTela = (id) => nomes.titulo[id] || id;
  const porTela = {};
  (d.etapas || []).forEach((e) => { porTela[e.etapa] = e.n; });
  const resp = {};
  (d.respostas || []).forEach((r) => {
    const t = nomeTela(r.etapa);
    (resp[t] = resp[t] || []).push({ resposta: r.valor, pessoas: r.n, foram_ao_checkout: r.conv || 0 });
  });
  const origem = (lista) => (lista || []).slice(0, 8).map((l) => ({
    nome: l.nome, visitas: l.visitas, comecaram_quiz: l.iniciaram, viram_oferta: l.formulas, clicaram_comprar: l.checkouts, conversao_pct: pct(l.checkouts, l.visitas),
  }));
  const horas = {};
  (d.porHora || []).forEach((x) => { horas[x.hora] = (horas[x.hora] || 0) + x.n; });
  const rol = (d.rolagem || []).filter((x) => x.pagina === "oferta" && x.r != null);

  return {
    pedido,
    funil: v2 ? "oferta direta (v2): anúncio → página de oferta, sem quiz" : "com quiz: anúncio → capa → quiz → oferta",
    totais: {
      visitas, visitantes_unicos: k.visitantes, comecaram_quiz: v2 ? null : k.iniciaram, concluiram_quiz: v2 ? null : k.concluiram,
      viram_oferta: k.oferta, viram_planos: k.viram_planos, tocaram_num_kit: k.escolheram_plano,
      clicaram_comprar: k.checkout, cliques_em_comprar_total: k.checkout_cliques,
    },
    conversao_visita_para_clique_em_comprar_pct: pct(k.checkout, visitas),
    periodo_anterior_de_mesmo_tamanho: {
      visitas: visitasAnt, clicaram_comprar: a.checkout, conversao_pct: pct(a.checkout, visitasAnt),
      viram_oferta: a.oferta, comecaram_quiz: v2 ? null : a.iniciaram,
    },
    por_dia: (d.diario || []).map((x) => ({ dia: x.dia, visitas: x.visitas, comecaram_quiz: v2 ? null : x.iniciaram, viram_oferta: x.formulas, clicaram_comprar: x.checkouts })),
    telas_do_quiz_pessoas: v2 ? null : nomes.telas.map((t) => ({ tela: t.nome, pessoas: porTela[t.id] || 0 })),
    ultima_tela_de_quem_saiu_do_quiz: v2 ? null : (d.paradas || []).sort((x, y) => y.n - x.n).slice(0, 10).map((x) => ({ tela: nomeTela(x.etapa), pessoas: x.n })),
    tempo_medio_por_pergunta_s: v2 ? null : (d.tempoPergunta || []).map((x) => ({ pergunta: nomeTela(x.etapa), segundos: Math.round(x.ms / 100) / 10 })),
    respostas_do_quiz: v2 ? null : resp,
    kits_no_checkout: (d.checkoutPlano || []).map((x) => ({ kit: "Kit " + x.valor, pessoas: x.n, cliques: x.cliques })),
    kits_tocados: (d.planos || []).map((x) => ({ kit: "Kit " + x.valor, pessoas: x.n })),
    precos_dos_kits: { "Kit 1": "R$ 197,90 (1 unidade, 30 dias)", "Kit 2": "R$ 297,90 (2 unidades, 60 dias, vem marcado)", "Kit 3": "R$ 397,90 (3 unidades, 90 dias)" },
    leitura_da_oferta_pessoas_por_secao: (d.secoes || []).sort((x, y) => y.n - x.n).map((x) => ({ secao: x.etapa, pessoas: x.n })),
    cliques_na_pagina: (d.cliques || []).sort((x, y) => y.n - x.n).slice(0, 15).map((x) => ({ elemento: x.etapa, valor: x.valor, pagina: x.pagina, pessoas: x.n, cliques: x.cliques })),
    origem: { fontes: origem(d.origem && d.origem.fonte), campanhas: origem(d.origem && d.origem.campanha), aparelhos: origem(d.origem && d.origem.aparelho), sistemas: origem(d.origem && d.origem.sistema) },
    visitas_por_hora_do_dia: Object.keys(horas).sort((x, y) => horas[y] - horas[x]).slice(0, 6).map((h) => ({ hora: h + "h", visitas: horas[h] })),
    cliques_em_comprar_por_hora: (d.compraPorHora || []).sort((x, y) => y.n - x.n).slice(0, 8).map((x) => ({ hora: x.hora + "h", pessoas: x.n })),
    tempo_ate_a_oferta_mediana_s: d.duracoes && d.duracoes.length ? Math.round(mediana(d.duracoes) / 1000) : null,
    tempo_na_oferta_mediana_s: d.tempoOferta && d.tempoOferta.length ? Math.round(mediana(d.tempoOferta) / 1000) : null,
    rolagem_media_da_oferta_pct: rol.length ? Math.round(rol.reduce((s, x) => s + x.r, 0) / rol.length) : null,
    erros_de_script: (d.erros || []).slice(0, 5).map((e) => ({ erro: String(e.valor).slice(0, 100), vezes: e.n })),
    pessoas_no_site_agora: d.aoVivo,
  };
}

/* ---------- ferramenta que o agente usa ---------- */
const FERRAMENTAS = [{
  name: "consultar_metricas",
  description:
    "Busca os números reais do site (visitas, quiz, oferta, cliques em comprar, kits, origem, respostas do quiz, horários) " +
    "num período. Datas no horário de Brasília, formato AAAA-MM-DD; 'ate' é o último dia incluído. " +
    "Também traz o período anterior de mesmo tamanho para comparação. Use sempre que a pergunta envolver números.",
  input_schema: {
    type: "object",
    properties: {
      de: { type: "string", description: "Primeiro dia (AAAA-MM-DD)" },
      ate: { type: "string", description: "Último dia incluído (AAAA-MM-DD)" },
      versao: { type: "string", enum: ["quiz", "v2"], description: "quiz = funil com quiz (padrão); v2 = oferta direta para anúncios" },
      fonte: { type: "string", description: "Filtrar por fonte (ex.: facebook, ig, instagram, tiktok). Vazio = todas" },
      campanha: { type: "string", description: "Filtrar por campanha (utm_campaign). Vazio = todas" },
      aparelho: { type: "string", enum: ["", "celular", "computador", "tablet"], description: "Filtrar por aparelho. Vazio = todos" },
    },
    required: ["de", "ate", "versao", "fonte", "campanha", "aparelho"],
    additionalProperties: false,
  },
  strict: true,
}];

export async function consultar(q, entrada, nomes) {
  const hoje = hojeBR();
  let de = dataValida(entrada.de) ? entrada.de : hoje;
  let ate = dataValida(entrada.ate) ? entrada.ate : hoje;
  if (de > ate) [de, ate] = [ate, de];
  const ini = inicioDoDia(de), fim = inicioDoDia(ate) + DIA_MS;
  if (fim - ini > 400 * DIA_MS) return { erro: "Período grande demais (máximo 400 dias)." };
  const url = new URL("http://painel/");
  url.searchParams.set("de", String(ini));
  url.searchParams.set("ate", String(fim));
  if (entrada.versao === "v2") url.searchParams.set("versao", "v2");
  for (const c of ["fonte", "campanha", "aparelho"]) if (entrada[c]) url.searchParams.set(c, String(entrada[c]).slice(0, 120));
  const dados = await dadosPainel(q, url);
  const r = compactar(dados, nomes, { de, ate, versao: entrada.versao, fonte: entrada.fonte || "todas", campanha: entrada.campanha || "todas", aparelho: entrada.aparelho || "todos" });
  // anúncios da Meta (quando a API da Meta está ligada): connect rate e custos
  if (metaLigada()) {
    const m = await insightsMeta(q, de, ate, entrada.campanha || "");
    if (m && m.ok) {
      const visitasMeta = (r.origem.fontes || []).filter((f) => FONTES_META.includes(String(f.nome).toLowerCase())).reduce((s, f) => s + (f.visitas || 0), 0);
      r.anuncios_meta = {
        gasto: m.gasto, moeda: m.moeda, impressoes: m.impressoes, cliques_no_link: m.cliques_no_link, cpm: m.cpm, ctr_pct: m.ctr_pct,
        visualizacoes_da_pagina_segundo_a_meta: m.visualizacoes_da_pagina,
        visitas_vindas_da_meta_no_site: visitasMeta,
        connect_rate_pct: m.cliques_no_link ? pct(visitasMeta || r.totais.visitas, m.cliques_no_link) : null,
        custo_por_clique_em_comprar: r.totais.clicaram_comprar ? Math.round((100 * m.gasto) / r.totais.clicaram_comprar) / 100 : null,
        por_dia: m.por_dia,
      };
    } else if (m && m.erro) r.anuncios_meta = { erro: m.detalhe || m.erro };
  }
  return r;
}

function statusDaConsulta(e) {
  const hoje = hojeBR();
  const ontem = new Date(inicioDoDia(hoje) - DIA_MS + 3 * 3600e3).toISOString().slice(0, 10);
  const br = (s) => s.slice(8, 10) + "/" + s.slice(5, 7);
  let quando = e.de === e.ate ? (e.de === hoje ? "de hoje" : e.de === ontem ? "de ontem" : "de " + br(e.de)) : "de " + br(e.de) + " a " + br(e.ate);
  const extra = [e.versao === "v2" ? "na v2" : "", e.fonte ? "de " + e.fonte : "", e.campanha ? "da campanha " + e.campanha : "", e.aparelho ? "no " + e.aparelho : ""].filter(Boolean).join(" ");
  return "Consultando os números " + quando + (extra ? " " + extra : "") + "…";
}

/* ---------- instruções do estrategista ---------- */
function instrucoes(contexto) {
  return `Você é o Estrategista da Cellive Skin: um analista sênior de dados e conversão (CRO/growth) de uma marca brasileira de skincare que vende online (Sérum Revitalizador Noturno).
Você conversa com a dona da marca dentro do painel. Ela não é técnica.

O NEGÓCIO
- Funil com quiz: anúncio → capa (quiz.celliveskin.com) → quiz de pele → página de oferta com a "fórmula personalizada" → escolha do kit → clique em comprar (vai para o checkout, em outra plataforma).
- Versão 2 (v2): anúncio → página de oferta direta, sem quiz.
- Kits: Kit 1 R$ 197,90 (30 dias) · Kit 2 R$ 297,90 (60 dias, já vem marcado) · Kit 3 R$ 397,90 (90 dias).
- O painel mede até o CLIQUE EM COMPRAR. A compra paga acontece no checkout, que ainda não manda dados para cá. Quando perguntarem de "vendas", responda com os cliques em comprar, diga isso numa frase curta e, se fizer sentido, mostre o faturamento POTENCIAL (cliques × ticket médio estimado pelos kits), sempre chamando de "potencial".

COMO TRABALHAR
- Sempre que a pergunta envolver números, use a ferramenta consultar_metricas. Nunca invente ou estime números que não vieram dela ou de um anexo. Hoje é ${hojeBR()} (horário de Brasília).
- Compare com o período anterior de mesmo tamanho (a ferramenta já traz) e, se ajudar, faça mais de uma consulta (ex.: hoje x ontem, esta semana x semana passada, quiz x v2, fonte por fonte).
- Pense como estrategista: 1) responda direto; 2) mostre onde está o maior vazamento (a etapa que mais perde gente, pesando quanto isso custa em cliques em comprar); 3) explique a causa provável; 4) dê ações priorizadas (impacto x esforço), concretas, para página, quiz ou anúncios; 5) quando sugerir teste A/B, diga o que medir e quanto tempo/volume esperar.
- Com poucos dados (menos de ~100 visitas no período), avise que as conclusões são preliminares.
- Se o resultado trouxer "anuncios_meta" (API da Meta ligada), use gasto, cliques no link, CPM, CTR e o connect rate (visitas vindas da Meta ÷ cliques no link). Sem isso, peça um print do Gerenciador quando a pergunta envolver custo ou anúncios.
- Para horário de pico, use cliques_em_comprar_por_hora e visitas_por_hora_do_dia, e mostre num bloco barras.
- Anexos: prints do Gerenciador de Anúncios (gasto, CPM, CTR, CPC, resultados) → cruze com o funil (ex.: custo por clique em comprar = gasto ÷ cliques em comprar do mesmo período, consultando as datas do print). Criativos → avalie se a promessa do anúncio conversa com a capa/oferta. PDFs e planilhas → resuma o que importa e conecte com os dados.
- Mensagens podem vir de áudio transcrito: ignore erros de digitação e entenda a intenção.
- Regras: nunca sugira depoimentos, avaliações ou números inventados, nem promessas de resultado sem comprovação ou afirmações de saúde (CDC, CONAR, Anvisa). Não peça dados pessoais de clientes (LGPD).

COMO RESPONDER (o painel desenha isto)
- Português do Brasil, simples, frases curtas. Comece pela resposta em 1 ou 2 frases. Depois os números e as ações. Seja enxuto (até ~250 palavras), a menos que peçam detalhe.
- Para 2 a 4 números principais, use um bloco kpis (JSON válido, "tendencia" = "sobe", "desce" ou "igual"):
\`\`\`kpis
[{"rotulo":"Cliques em comprar","valor":"18","detalhe":"+20% vs ontem","tendencia":"sobe"}]
\`\`\`
- Para comparar itens (etapas do funil, fontes, kits, dias), use um bloco barras (até 8 itens; "valor" é número):
\`\`\`barras
{"titulo":"Onde as pessoas saem","itens":[{"nome":"Capa → quiz","valor":38,"rotulo":"38% saem"}]}
\`\`\`
- Depois, ações em lista curta com **negrito** no que importa. Pode usar ### para pequenos títulos.

CONTEXTO DA TELA (o que a dona está vendo agora no painel)
${JSON.stringify(contexto || {}).slice(0, 6000)}`;
}

/* ---------- monta as mensagens para o Claude ---------- */
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"];
function montarMensagens(conversa) {
  const msgs = [];
  for (const m of conversa.slice(-24)) {
    if (m.papel === "assistant") {
      if (m.texto) msgs.push({ role: "assistant", content: String(m.texto).slice(0, 12000) });
      continue;
    }
    const content = [];
    for (const a of (m.anexos || []).slice(0, 4)) {
      if (a.tipo === "imagem" && TIPOS_IMAGEM.includes(a.mime) && typeof a.dados === "string") {
        content.push({ type: "image", source: { type: "base64", media_type: a.mime, data: a.dados } });
      } else if (a.tipo === "pdf" && typeof a.dados === "string") {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.dados }, title: String(a.nome || "documento.pdf").slice(0, 120) });
      } else if (a.tipo === "texto" && typeof a.texto === "string") {
        content.push({ type: "text", text: "Arquivo anexado (" + String(a.nome || "arquivo").slice(0, 80) + "):\n" + a.texto.slice(0, 60000) });
      } else if (a.nome) {
        content.push({ type: "text", text: "[Anexo enviado antes nesta conversa: " + String(a.nome).slice(0, 80) + "]" });
      }
    }
    content.push({ type: "text", text: String(m.texto || "(veja o anexo)").slice(0, 8000) });
    msgs.push({ role: "user", content });
  }
  // a conversa precisa começar com a pessoa e alternar
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const limpas = [];
  for (const m of msgs) {
    const ult = limpas[limpas.length - 1];
    if (ult && ult.role === m.role) {
      if (m.role === "user") ult.content = ult.content.concat(m.content);
      else ult.content = ult.content + "\n\n" + m.content;
    } else limpas.push(m);
  }
  return limpas;
}

/* ---------- rota ---------- */
export async function POST(request) {
  const aut = autorizado(request);
  if (aut === "sem-senha") return json({ erro: "sem-senha" }, 503);
  if (aut !== "ok") return json({ erro: "senha" }, 401);
  if (!process.env.ANTHROPIC_API_KEY) return json({ erro: "sem-ia" }, 503);

  let corpo;
  try {
    const t = await request.text();
    if (t.length > 4400000) return json({ erro: "grande" }, 413);
    corpo = JSON.parse(t);
  } catch (e) {
    return json({ erro: "corpo" }, 400);
  }
  if (!corpo || !Array.isArray(corpo.conversa) || !corpo.conversa.length) return json({ erro: "corpo" }, 400);

  let q = null;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return json({ erro: "sem-banco" }, 503);
  try {
    const uso = await q("SELECT COUNT(*)::int AS n FROM agente_uso WHERE ts > $1", [Date.now() - DIA_MS]);
    if (uso[0].n >= LIMITE_DIA) return json({ erro: "limite" }, 429);
    await q("INSERT INTO agente_uso (ts) VALUES ($1)", [Date.now()]);
  } catch (e) { /* segue sem contar */ }

  const nomes = await nomesDoQuiz();
  const mensagens = montarMensagens(corpo.conversa);
  if (!mensagens.length) return json({ erro: "corpo" }, 400);
  const cliente = new Anthropic();
  const enc = new TextEncoder();

  const fluxo = new ReadableStream({
    async start(ctrl) {
      const enviar = (o) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        enviar({ tipo: "status", texto: "Lendo a sua pergunta…" });
        for (let volta = 0; volta < MAX_VOLTAS; volta++) {
          const pedido = {
            model: MODELO,
            max_tokens: 16000,
            output_config: { effort: "medium" },
            system: instrucoes(corpo.contexto),
            tools: FERRAMENTAS,
            messages: mensagens,
          };
          if (!/haiku/.test(MODELO)) {
            pedido.betas = ["server-side-fallback-2026-07-01"];
            pedido.fallbacks = "default";
          }
          const resp = await cliente.beta.messages.create(pedido);
          if (resp.stop_reason === "refusal") {
            enviar({ tipo: "erro", texto: "Não consegui responder essa pergunta. Tente reformular." });
            break;
          }
          const usos = resp.content.filter((b) => b.type === "tool_use");
          if (resp.stop_reason !== "tool_use" || !usos.length) {
            const texto = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
            enviar({ tipo: "resposta", texto: texto || "Não tenho uma resposta para isso agora." });
            break;
          }
          // o agente pediu números: consulta e devolve
          mensagens.push({ role: "assistant", content: resp.content });
          const resultados = [];
          for (const u of usos) {
            let saida;
            if (u.name === "consultar_metricas") {
              enviar({ tipo: "status", texto: statusDaConsulta(u.input || {}) });
              try { saida = await consultar(q, u.input || {}, nomes); } catch (e) { saida = { erro: "Falha ao consultar o banco." }; }
            } else {
              saida = { erro: "Ferramenta desconhecida." };
            }
            resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(saida), is_error: !!saida.erro });
          }
          mensagens.push({ role: "user", content: resultados });
          enviar({ tipo: "status", texto: "Cruzando os dados e montando a estratégia…" });
          if (volta === MAX_VOLTAS - 1) enviar({ tipo: "erro", texto: "A análise ficou longa demais. Tente uma pergunta mais específica." });
        }
      } catch (e) {
        let texto = "Não consegui falar com o Claude agora. Tente de novo em instantes.";
        if (e instanceof Anthropic.AuthenticationError) texto = "A chave do Claude na Vercel parece inválida.";
        else if (e instanceof Anthropic.RateLimitError) texto = "O Claude está ocupado agora. Tente de novo em um minuto.";
        else if (e instanceof Anthropic.BadRequestError) texto = "Não consegui ler um dos anexos. Tente um arquivo menor ou outro formato.";
        enviar({ tipo: "erro", texto });
      }
      ctrl.close();
    },
  });
  return new Response(fluxo, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

export function GET() {
  return json({ ok: false }, 405);
}
