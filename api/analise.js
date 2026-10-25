/* POST /api/analise — relatório de pontos de melhoria escrito pelo Claude.

   O painel já monta um resumo só com números agregados (nenhum dado de
   pessoa: sem e-mail, sem IP, sem respostas individuais) e manda para cá.
   Aqui o resumo vai para o Claude, que devolve o relatório em JSON.

   Liga sozinho quando existe a variável ANTHROPIC_API_KEY na Vercel.
   Sem ela, o painel usa a análise automática (gratuita, feita no navegador).

   Para não gastar à toa:
   - o mesmo período + filtros só gera um relatório novo a cada 6 horas
     (o botão "Atualizar análise" força um novo);
   - no máximo IA_LIMITE_DIA relatórios por dia (padrão: 20). */
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { autorizado, banco, json } from "./_db.js";

const MODELO = process.env.IA_MODELO || "claude-opus-5-5";
const VALIDADE = 6 * 3600e3;
const LIMITE_DIA = Number(process.env.IA_LIMITE_DIA) || 20;

const PONTO = {
  type: "object",
  properties: {
    prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
    area: { type: "string", description: "Capa, Quiz, Oferta, Preço e checkout, Tráfego, Técnico ou Público" },
    titulo: { type: "string", description: "Até 70 caracteres" },
    detalhe: { type: "string", description: "O que os números mostram (1 ou 2 frases, com os números)" },
    acao: { type: "string", description: "O que fazer, em passos simples" },
    impacto: { type: "string", description: "Ganho estimado, ex.: '≈ +12 cliques no checkout no período'. Vazio se não der para estimar." },
  },
  required: ["prioridade", "area", "titulo", "detalhe", "acao", "impacto"],
  additionalProperties: false,
};

const FORMATO = {
  type: "object",
  properties: {
    nota: { type: "integer", description: "Saúde do funil de 0 a 100: 80 ou mais = saudável, 60 a 79 = pode melhorar, abaixo de 60 = precisa de atenção. O funil vale o seu ponto mais fraco." },
    titulo: { type: "string", description: "Diagnóstico em uma frase curta (até 70 caracteres), ex.: 'O maior vazamento está no meio do quiz'" },
    resumo: { type: "string", description: "2 ou 3 frases explicando o momento do funil" },
    gargalo: {
      type: "object",
      properties: {
        etapa: { type: "string" },
        explicacao: { type: "string" },
      },
      required: ["etapa", "explicacao"],
      additionalProperties: false,
    },
    pontos: { type: "array", items: PONTO },
    positivos: { type: "array", items: { type: "string" } },
  },
  required: ["nota", "titulo", "resumo", "gargalo", "pontos", "positivos"],
  additionalProperties: false,
};

const INSTRUCOES = `Você é analista de conversão (CRO) da Cellive Skin, marca brasileira de skincare.
Há dois funis (o campo "funil" do resumo diz qual é este):
- com quiz: anúncio → capa → quiz de pele (perguntas) → página da "fórmula personalizada" (oferta do Sérum) → escolha do kit → clique no checkout;
- oferta direta (v2): anúncio → página de oferta (sem quiz) → escolha do kit → clique no checkout. Nesse caso não fale de quiz.
Você recebe um resumo com os números agregados do painel e escreve um relatório para a dona da marca, que não é técnica.

Como escrever:
- Português do Brasil, frases curtas e simples, sem jargão (se usar um termo como "taxa de conversão", explique).
- Baseie cada afirmação nos números do resumo e cite-os. Não invente dados nem comparações de mercado que não estejam no resumo.
- As "metas" do resumo são referências aproximadas para funis de quiz, não regras. Trate-as assim.
- Ordene os pontos de melhoria pelo ganho esperado, do maior para o menor. Entre 3 e 6 pontos.
- Em "acao", dê passos concretos que dá para fazer na página, no quiz ou nos anúncios.
- Em "impacto", estime o ganho em cliques no checkout quando der (ex.: se a etapa X chegar à meta, ≈ +N cliques no período). Se não der, deixe vazio.
- Se houver poucos dados (menos de 100 visitas), diga isso no resumo e trate as conclusões como preliminares.
- Nunca sugira depoimentos, avaliações ou números inventados, promessas de resultado que não possam ser comprovadas, nem afirmações de saúde sem base (regras do CDC, CONAR e Anvisa).
- "positivos": de 1 a 4 frases curtas sobre o que já está funcionando bem.`;

function texto(v, max) {
  return String(v == null ? "" : v).slice(0, max);
}

// Garante que o relatório tem o formato que o painel espera
function limpar(r) {
  const prior = { alta: "alta", media: "media", baixa: "baixa" };
  return {
    nota: Math.max(0, Math.min(100, Math.round(Number(r.nota) || 0))),
    titulo: texto(r.titulo, 160),
    resumo: texto(r.resumo, 700),
    gargalo: { etapa: texto(r.gargalo && r.gargalo.etapa, 120), explicacao: texto(r.gargalo && r.gargalo.explicacao, 500) },
    pontos: (Array.isArray(r.pontos) ? r.pontos : []).slice(0, 8).map((p) => ({
      prioridade: prior[p.prioridade] || "media",
      area: texto(p.area, 40),
      titulo: texto(p.titulo, 120),
      detalhe: texto(p.detalhe, 500),
      acao: texto(p.acao, 600),
      impacto: texto(p.impacto, 160),
    })),
    positivos: (Array.isArray(r.positivos) ? r.positivos : []).slice(0, 5).map((t) => texto(t, 240)),
  };
}

export async function GET(request) {
  if (autorizado(request) !== "ok") return json({ erro: "senha" }, 401);
  return json({ ia: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(request) {
  const a = autorizado(request);
  if (a === "sem-senha") return json({ erro: "sem-senha" }, 503);
  if (a !== "ok") return json({ erro: "senha" }, 401);
  if (!process.env.ANTHROPIC_API_KEY) return json({ erro: "sem-ia" }, 503);

  let corpo;
  try {
    const t = await request.text();
    if (t.length > 40000) return json({ erro: "grande" }, 413);
    corpo = JSON.parse(t);
  } catch (e) {
    return json({ erro: "corpo" }, 400);
  }
  if (!corpo || typeof corpo.resumo !== "object") return json({ erro: "corpo" }, 400);

  // mesmo contexto (período + filtros) dentro de 6 horas = mesmo relatório
  const bloco = Math.floor(Date.now() / VALIDADE);
  const chave = createHash("sha256").update(JSON.stringify(corpo.contexto || {}) + "|" + bloco + "|" + MODELO).digest("hex").slice(0, 40);

  let q = null;
  try { q = await banco(); } catch (e) { q = null; }
  if (q && !corpo.forcar) {
    try {
      const salvo = await q("SELECT dados, criado FROM analises WHERE chave = $1", [chave]);
      if (salvo.length) return json({ ok: true, guardado: true, criado: Number(salvo[0].criado), modelo: MODELO, relatorio: salvo[0].dados });
    } catch (e) { /* segue sem cache */ }
  }
  if (q) {
    try {
      const hoje = await q("SELECT COUNT(*)::int AS n FROM analises WHERE criado > $1", [Date.now() - 864e5]);
      if (hoje[0].n >= LIMITE_DIA) return json({ erro: "limite" }, 429);
    } catch (e) { /* segue */ }
  }

  const cliente = new Anthropic();
  const pedido = {
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: "medium", format: { type: "json_schema", schema: FORMATO } },
    system: INSTRUCOES,
    messages: [{
      role: "user",
      content: "Resumo do painel (JSON). Escreva o relatório de pontos de melhoria.\n\n" + JSON.stringify(corpo.resumo),
    }],
  };
  // se o modelo recusar por engano, o próprio servidor tenta outro modelo
  if (!/haiku/.test(MODELO)) {
    pedido.betas = ["server-side-fallback-2026-07-01"];
    pedido.fallbacks = "default";
  }

  let resp;
  try {
    resp = await cliente.beta.messages.create(pedido);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ erro: "chave" }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ erro: "ocupado" }, 503);
    if (e instanceof Anthropic.APIError) return json({ erro: "ia", status: e.status }, 502);
    return json({ erro: "ia" }, 502);
  }
  if (resp.stop_reason === "refusal") return json({ erro: "recusa" }, 502);

  const textoResp = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let relatorio;
  try { relatorio = limpar(JSON.parse(textoResp)); } catch (e) { return json({ erro: "formato" }, 502); }

  const criado = Date.now();
  if (q) {
    try {
      await q(`INSERT INTO analises (chave, criado, dados) VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (chave) DO UPDATE SET criado = EXCLUDED.criado, dados = EXCLUDED.dados`, [chave, criado, JSON.stringify(relatorio)]);
    } catch (e) { /* sem cache, tudo bem */ }
  }
  return json({ ok: true, guardado: false, criado, modelo: resp.model || MODELO, relatorio });
}
