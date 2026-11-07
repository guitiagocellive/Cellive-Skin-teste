/* POST /api/venda?t=<código> — recebe os avisos de venda da B4You (webhook) e grava no banco.
   Configurar na B4You em Apps e Webhooks, colando o endereço completo (com o ?t=).
   O código fica só no endereço; aqui guardamos apenas a "impressão digital" dele (SHA-256),
   então o código não aparece no repositório.
   Privacidade: CPF, telefone, endereço, cartão e nome de quem comprou NÃO são guardados.
   O e-mail vira um código (hash), só para reconhecer compras da mesma pessoa. */
import { createHash, timingSafeEqual } from "node:crypto";
import { banco, json } from "./_db.js";

const CODIGO_HASH = "12681d6c1f65d18a69088c6b4bcea5bb911880bd449596f8b3fcd4215cd217c3";
const hash = (v) => createHash("sha256").update(String(v)).digest("hex");

function autorizado(url) {
  const t = url.searchParams.get("t") || "";
  const a = Buffer.from(hash(t)), b = Buffer.from(CODIGO_HASH);
  return t.length > 10 && a.length === b.length && timingSafeEqual(a, b);
}

// tira dados pessoais; troca e-mail por hash
const PESSOAL = /cpf|cnpj|document|doc_number|rg$|phone|telefone|celular|whatsapp|mobile|card|cartao|cvv|birth|nascimento|address|endereco|street|logradouro|numero_casa|complement|neighborhood|bairro|zip|cep|^ip$|ip_address|password|senha/i;
const PESSOA = /^(customer|client|buyer|comprador|cliente|student|aluno|user|usuario|shipping|billing|delivery|entrega)$/i;
const NOME = /^(name|nome|full_name|fullname|first_name|last_name|sobrenome)$/i;
function limpar(v, dentroDePessoa, prof) {
  if (prof > 8 || v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => limpar(x, dentroDePessoa, prof + 1));
  if (typeof v !== "object") return typeof v === "string" ? v.slice(0, 500) : v;
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (PESSOAL.test(k)) continue;
    if (/e-?mail/i.test(k)) { if (val) out.email_hash = hash(String(val).trim().toLowerCase()); continue; }
    if (dentroDePessoa && NOME.test(k)) continue;
    out[k] = limpar(val, dentroDePessoa || PESSOA.test(k), prof + 1);
  }
  return out;
}

// procura o primeiro campo com um desses nomes, em qualquer nível
function achar(obj, nomes, prof = 0) {
  if (!obj || typeof obj !== "object" || prof > 8) return null;
  for (const n of nomes) if (obj[n] != null && typeof obj[n] !== "object") return obj[n];
  for (const v of Object.values(obj)) {
    const r = achar(v, nomes, prof + 1);
    if (r != null) return r;
  }
  return null;
}
const corta = (v, n) => (v == null ? null : String(v).slice(0, n));
const numero = (v) => { const x = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : null; };

export async function POST(request) {
  const url = new URL(request.url);
  if (!autorizado(url)) return json({ ok: false }, 401);
  let bruto;
  try {
    const texto = await request.text();
    if (texto.length > 200000) return json({ ok: false }, 413);
    try { bruto = JSON.parse(texto); }
    catch (e) { bruto = Object.fromEntries(new URLSearchParams(texto)); }
  } catch (e) {
    return json({ ok: false }, 400);
  }
  const dados = limpar(bruto, false, 0);

  const linha = {
    evento: corta(achar(dados, ["event", "evento", "event_name", "type", "tipo"]), 80),
    venda: corta(achar(dados, ["sale_item_id", "sale_id", "id_sale", "transaction_id", "transaction", "order_id", "uuid", "id"]), 120),
    status: corta(achar(dados, ["status", "sale_status", "payment_status", "situacao"]), 60),
    valor: numero(achar(dados, ["price", "amount", "total", "value", "valor", "paid_price", "sale_price"])),
    oferta: corta(achar(dados, ["offer_id", "offerId", "id_offer", "offer", "plan_id", "plan"]), 120),
    produto: corta(achar(dados, ["product_name", "product", "produto", "product_id"]), 200),
    pagamento: corta(achar(dados, ["payment_method", "paymentMethod", "metodo_pagamento", "method"]), 40),
    fonte: corta(achar(dados, ["utm_source"]), 120),
    campanha: corta(achar(dados, ["utm_campaign"]), 200),
    midia: corta(achar(dados, ["utm_medium"]), 120),
    conteudo: corta(achar(dados, ["utm_content"]), 200),
    termo: corta(achar(dados, ["utm_term"]), 200),
    src: corta(achar(dados, ["src"]), 120),
    sck: corta(achar(dados, ["sck"]), 120),
    email: corta(achar(dados, ["email_hash"]), 64),
  };

  let textoDados = JSON.stringify(dados);
  if (textoDados.length > 100000) textoDados = JSON.stringify({ grande_demais: true, tamanho: textoDados.length });

  // registro no log da Vercel (já sem dados pessoais), para conferir o formato que a B4You envia
  console.log("venda-b4you", JSON.stringify(linha), textoDados.slice(0, 6000));

  let q;
  try { q = await banco(); } catch (e) { return json({ ok: false, erro: "banco" }, 503); }
  if (!q) return json({ ok: false, erro: "sem banco" }, 503);
  try {
    await q(`CREATE TABLE IF NOT EXISTS vendas (
      id BIGSERIAL PRIMARY KEY, recebido BIGINT NOT NULL,
      evento TEXT, venda TEXT, status TEXT, valor NUMERIC, oferta TEXT, produto TEXT, pagamento TEXT,
      fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT, termo TEXT, src TEXT, sck TEXT,
      email_hash TEXT, dados JSONB NOT NULL
    )`);
    await q("CREATE INDEX IF NOT EXISTS vendas_recebido ON vendas(recebido)");
    await q("CREATE INDEX IF NOT EXISTS vendas_venda ON vendas(venda)");
    await q(`INSERT INTO vendas (recebido, evento, venda, status, valor, oferta, produto, pagamento,
      fonte, campanha, midia, conteudo, termo, src, sck, email_hash, dados)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)`,
      [Date.now(), linha.evento, linha.venda, linha.status, linha.valor, linha.oferta, linha.produto, linha.pagamento,
       linha.fonte, linha.campanha, linha.midia, linha.conteudo, linha.termo, linha.src, linha.sck, linha.email,
       textoDados]);
  } catch (e) {
    return json({ ok: false }, 500);
  }
  return json({ ok: true });
}

// a B4You (ou você) pode abrir o endereço para testar: responde ok se o código estiver certo
export function GET(request) {
  return autorizado(new URL(request.url)) ? json({ ok: true, aviso: "endereço de vendas da B4You funcionando" }) : json({ ok: false }, 401);
}
