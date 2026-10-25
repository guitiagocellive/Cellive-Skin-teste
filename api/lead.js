/* Lista de lançamento (o produto ainda não está à venda).

   POST /api/lead                  — a página de oferta manda nome, WhatsApp e e-mail
                                     de quem quer entrar no grupo VIP. Devolve o link do grupo.
   GET  /api/lead?formato=csv      — baixa a lista completa em planilha (precisa da senha do painel).

   O link do grupo vem da variável WHATSAPP_GRUPO na Vercel (ou de GRUPO_PADRAO abaixo).
   Na prévia (link de teste da Vercel) nada é gravado, como acontece com os eventos. */
import { autorizado, banco, json } from "./_db.js";

const GRUPO_PADRAO = "";

const corta = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function grupo() {
  const link = (process.env.WHATSAPP_GRUPO || GRUPO_PADRAO || "").trim();
  return /^https:\/\/(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com)\//.test(link) ? link : "";
}

// Celular brasileiro: DDD + número (10 ou 11 dígitos). Aceita +55 na frente.
function limparWhatsapp(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? "55" + d : null;
}

export async function POST(request) {
  let c;
  try {
    const t = await request.text();
    if (t.length > 4000) return json({ ok: false, erro: "grande" }, 413);
    c = JSON.parse(t);
  } catch (e) {
    return json({ ok: false, erro: "corpo" }, 400);
  }
  if (!c || typeof c !== "object") return json({ ok: false, erro: "corpo" }, 400);
  // campo escondido: só robôs preenchem
  if (c.site) return json({ ok: true, grupo: "" });

  const nome = corta(c.nome, 80);
  const whatsapp = limparWhatsapp(c.whatsapp);
  const email = corta(c.email, 200) && corta(c.email, 200).toLowerCase();
  if (!nome || nome.length < 2) return json({ ok: false, erro: "nome" }, 400);
  if (!whatsapp) return json({ ok: false, erro: "whatsapp" }, 400);
  if (!email || !EMAIL.test(email)) return json({ ok: false, erro: "email" }, 400);
  if (c.aceite !== true) return json({ ok: false, erro: "aceite" }, 400);

  if (process.env.VERCEL_ENV === "preview") return json({ ok: true, previa: true, grupo: grupo() });

  let q;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return json({ ok: false, erro: "banco" }, 503);

  const u = c.u && typeof c.u === "object" ? c.u : {};
  const agora = Date.now();
  try {
    await q(`INSERT INTO leads (criado, atualizado, nome, whatsapp, email, kit, versao, fonte, campanha, midia, conteudo, visitante, sessao)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (email) DO UPDATE SET atualizado = EXCLUDED.atualizado, nome = EXCLUDED.nome,
        whatsapp = EXCLUDED.whatsapp, kit = COALESCE(EXCLUDED.kit, leads.kit)`,
      [agora, nome, whatsapp, email, corta(c.kit, 4), c.ver === "v2" ? "v2" : null,
        corta(u.fonte, 80) || "direto", corta(u.campanha, 120), corta(u.midia, 80), corta(u.conteudo, 120),
        corta(c.v, 40), corta(c.s, 40)]);
  } catch (e) {
    return json({ ok: false, erro: "banco" }, 500);
  }
  return json({ ok: true, grupo: grupo() });
}

export async function GET(request) {
  const a = autorizado(request);
  if (a === "sem-senha") return json({ erro: "sem-senha" }, 503);
  if (a !== "ok") return json({ erro: "senha" }, 401);
  let q;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return json({ erro: "sem-banco" }, 503);

  const linhas = await q("SELECT * FROM leads ORDER BY criado LIMIT 100000");
  const fuso = { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" };
  const kits = { 1: "1 unidade", 2: "2 unidades", 3: "3 unidades" };
  const cols = [
    ["Data", (l) => new Date(Number(l.criado)).toLocaleString("pt-BR", fuso)],
    ["Nome", (l) => l.nome],
    ["WhatsApp", (l) => "+" + l.whatsapp],
    ["E-mail", (l) => l.email],
    ["Kit escolhido", (l) => kits[l.kit] || ""],
    ["Página", (l) => (l.versao === "v2" ? "Oferta direta (op)" : "Funil com quiz")],
    ["Fonte", (l) => l.fonte],
    ["Campanha", (l) => l.campanha],
    ["Anúncio", (l) => l.conteudo],
  ];
  // ";" abre certinho no Excel em português
  const esc = (v) => {
    let t = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(t) && !/^\+\d+$/.test(t)) t = "'" + t; // evita fórmulas na planilha
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const corpo = [cols.map((c) => c[0]).join(";")]
    .concat(linhas.map((l) => cols.map((c) => esc(c[1](l))).join(";")))
    .join("\n");
  return new Response("﻿" + corpo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="cellive-lista-de-lancamento.csv"',
      "cache-control": "no-store",
    },
  });
}
