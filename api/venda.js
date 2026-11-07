/* POST /api/venda?t=<código> — recebe os avisos de venda da B4You (webhook) e grava no banco.
   Configurar na B4You em Apps e Webhooks, colando o endereço completo (com o ?t=).
   O código fica só no endereço; aqui guardamos apenas a "impressão digital" dele (SHA-256),
   então o código não aparece no repositório.
   Privacidade: CPF, telefone, endereço, cartão e nome de quem comprou NÃO são guardados.
   O e-mail vira um código (hash), só para reconhecer compras da mesma pessoa.
   Também aceita o código no caminho: /api/venda/<código> (regra no vercel.json), para
   plataformas que cortam o que vem depois do "?".
   Cada tentativa que chega (até as recusadas) fica registrada em webhook_tentativas, já sem
   dados pessoais, para descobrir por que um teste falhou. Ver: GET /api/venda?t=<código>&ver=1 */
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
const PESSOA = /^(customer|client|buyer|comprador|cliente|student|aluno|user|usuario|shipping|billing|delivery|entrega|producer|affiliate|afiliado)$/i;
const NOME = /^(name|nome|full_name|fullname|first_name|last_name|sobrenome)$/i;
function limpar(v, dentroDePessoa, prof) {
  if (prof > 8 || v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => limpar(x, dentroDePessoa, prof + 1));
  if (typeof v !== "object") return typeof v === "string" ? v.slice(0, 500) : v;
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (PESSOAL.test(k)) continue;
    if (/e-?mail/i.test(k)) { if (val) out.email_hash = hash(String(val).trim().toLowerCase()); continue; }
    if ((dentroDePessoa && NOME.test(k)) || /^(full_name|fullname|first_name|last_name)$/i.test(k)) continue;
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

async function registrarTentativa(request, url, info) {
  try {
    const q = await banco();
    if (!q) return;
    await q(`CREATE TABLE IF NOT EXISTS webhook_tentativas (
      id BIGSERIAL PRIMARY KEY, ts BIGINT NOT NULL, metodo TEXT, resposta INT, motivo TEXT,
      tipo TEXT, tamanho INT, tem_codigo BOOLEAN, agente TEXT, previa TEXT
    )`);
    await q(`INSERT INTO webhook_tentativas (ts, metodo, resposta, motivo, tipo, tamanho, tem_codigo, agente, previa)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [Date.now(), request.method, info.resposta, corta(info.motivo, 200), corta(request.headers.get("content-type"), 120),
       info.tamanho ?? null, url.searchParams.has("t"), corta(request.headers.get("user-agent"), 160), corta(info.previa, 3000)]);
    // guarda só as 300 mais recentes
    await q("DELETE FROM webhook_tentativas WHERE id < (SELECT COALESCE(MAX(id), 0) - 300 FROM webhook_tentativas)");
  } catch (e) { /* registro é só para diagnóstico */ }
}
const numero = (v) => { const x = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : null; };

export async function POST(request) {
  const url = new URL(request.url);
  let texto = "";
  try { texto = await request.text(); } catch (e) { texto = ""; }
  let bruto;
  try { bruto = texto ? JSON.parse(texto) : {}; }
  catch (e) { bruto = Object.fromEntries(new URLSearchParams(texto)); }
  const dados = limpar(bruto, false, 0);
  const previa = JSON.stringify(dados).slice(0, 3000);
  if (!autorizado(url)) {
    await registrarTentativa(request, url, { resposta: 401, motivo: url.searchParams.has("t") ? "código errado" : "sem código no endereço", tamanho: texto.length, previa });
    return json({ ok: false }, 401);
  }
  if (texto.length > 200000) {
    await registrarTentativa(request, url, { resposta: 413, motivo: "grande demais", tamanho: texto.length, previa: "" });
    return json({ ok: false }, 413);
  }

  // formato da B4You (visto no teste): event_name, sale_id, status, payment_method, installments, type,
  // product.name, offer.{id,name,quantity}, splits.{base_price,my_commission}, tracking_parameters.{utm_*, src, sck}
  const tp = (dados && dados.tracking_parameters) || {};
  const off = (dados && dados.offer) || {};
  const spl = (dados && dados.splits) || {};
  const linha = {
    evento: corta(dados.event_name ?? achar(dados, ["event", "evento", "type"]), 80),
    venda: corta(dados.sale_id ?? achar(dados, ["sale_item_id", "transaction_id", "order_id", "id"]), 120),
    grupo: corta(dados.group_id, 120),
    status: corta(dados.status ?? achar(dados, ["sale_status", "payment_status"]), 60),
    valor: numero(spl.base_price ?? (Array.isArray(dados.charges) && dados.charges[0] ? dados.charges[0].amount : null) ?? off.original_price),
    comissao: numero(spl.my_commission),
    oferta: corta(off.id, 120),
    oferta_nome: corta(off.name, 200),
    quantidade: numero(off.quantity),
    produto: corta(dados.product && dados.product.name, 200),
    tipo: corta(dados.type, 40),
    pagamento: corta(dados.payment_method, 40),
    parcelas: numero(dados.installments),
    fonte: corta(tp.utm_source ?? achar(dados, ["utm_source"]), 120),
    campanha: corta(tp.utm_campaign ?? achar(dados, ["utm_campaign"]), 200),
    midia: corta(tp.utm_medium ?? achar(dados, ["utm_medium"]), 120),
    conteudo: corta(tp.utm_content ?? achar(dados, ["utm_content"]), 200),
    termo: corta(tp.utm_term ?? achar(dados, ["utm_term"]), 200),
    src: corta(tp.src ?? achar(dados, ["src"]), 120),
    sck: corta(tp.sck ?? achar(dados, ["sck"]), 120),
    email: corta(dados.customer && dados.customer.email_hash, 64),
    pago_em: corta(dados.paid_at, 40),
  };

  let textoDados = JSON.stringify(dados);
  if (textoDados.length > 100000) textoDados = JSON.stringify({ grande_demais: true, tamanho: textoDados.length });

  // registro no log da Vercel (já sem dados pessoais), para conferir o formato que a B4You envia
  console.log("venda-b4you", JSON.stringify(linha), textoDados.slice(0, 6000));

  let q;
  try { q = await banco(); } catch (e) { return json({ ok: false, erro: "banco" }, 503); }
  if (!q) return json({ ok: false, erro: "sem banco" }, 503);
  try {
    await q(`CREATE TABLE IF NOT EXISTS vendas_b4you (
      id BIGSERIAL PRIMARY KEY, recebido BIGINT NOT NULL,
      evento TEXT, venda TEXT, grupo TEXT, status TEXT, valor NUMERIC, comissao NUMERIC,
      oferta TEXT, oferta_nome TEXT, quantidade NUMERIC, produto TEXT, tipo TEXT, pagamento TEXT, parcelas NUMERIC,
      fonte TEXT, campanha TEXT, midia TEXT, conteudo TEXT, termo TEXT, src TEXT, sck TEXT,
      email_hash TEXT, pago_em TEXT, dados JSONB NOT NULL
    )`);
    await q("CREATE INDEX IF NOT EXISTS vendas_b4you_recebido ON vendas_b4you(recebido)");
    await q("CREATE INDEX IF NOT EXISTS vendas_b4you_venda ON vendas_b4you(venda)");
    const L = linha;
    await q(`INSERT INTO vendas_b4you (recebido, evento, venda, grupo, status, valor, comissao, oferta, oferta_nome, quantidade,
      produto, tipo, pagamento, parcelas, fonte, campanha, midia, conteudo, termo, src, sck, email_hash, pago_em, dados)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb)`,
      [Date.now(), L.evento, L.venda, L.grupo, L.status, L.valor, L.comissao, L.oferta, L.oferta_nome, L.quantidade,
       L.produto, L.tipo, L.pagamento, L.parcelas, L.fonte, L.campanha, L.midia, L.conteudo, L.termo, L.src, L.sck,
       L.email, L.pago_em, textoDados]);
  } catch (e) {
    await registrarTentativa(request, url, { resposta: 500, motivo: "erro ao gravar: " + (e && e.message), tamanho: texto.length, previa });
    return json({ ok: false }, 500);
  }
  await registrarTentativa(request, url, { resposta: 200, motivo: "venda gravada", tamanho: texto.length, previa });
  return json({ ok: true });
}

// a B4You (ou você) pode abrir o endereço para testar: responde ok se o código estiver certo
export async function GET(request) {
  const url = new URL(request.url);
  if (!autorizado(url)) {
    await registrarTentativa(request, url, { resposta: 401, motivo: "GET sem código certo" });
    return json({ ok: false }, 401);
  }
  if (url.searchParams.get("ver") !== "1") {
    await registrarTentativa(request, url, { resposta: 200, motivo: "teste (GET)" });
    return json({ ok: true, aviso: "endereço de vendas da B4You funcionando" });
  }
  const q = await banco().catch(() => null);
  if (!q) return json({ ok: false, erro: "sem banco" }, 503);
  const ler = async (sql) => { try { return await q(sql); } catch (e) { return []; } };
  return json({
    tentativas: await ler("SELECT ts, metodo, resposta, motivo, tipo, tamanho, tem_codigo, agente, previa FROM webhook_tentativas ORDER BY id DESC LIMIT 15"),
    vendas: await ler("SELECT recebido, evento, venda, status, valor, comissao, oferta_nome, produto, tipo, pagamento, parcelas, fonte, campanha, midia, conteudo, src, sck FROM vendas_b4you ORDER BY id DESC LIMIT 10"),
  });
}

// alguns sistemas testam o endereço com HEAD ou OPTIONS antes de enviar
export function HEAD() { return new Response(null, { status: 200 }); }
export function OPTIONS() { return new Response(null, { status: 204, headers: { allow: "GET, POST, PUT, HEAD, OPTIONS" } }); }
export const PUT = POST;
