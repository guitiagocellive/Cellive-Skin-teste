/* /api/produtos — produtos da aba "Produto" do painel (senha do painel).
   GET               → { produtos: [...] }   (cria o Sérum com os números atuais na primeira vez)
   POST {produto}    → salva (cria se não tiver id)
   DELETE ?id=<id>   → apaga
   Cada produto é um JSON livre (custos, taxas e kits), guardado
   na tabela produtos. As contas (custo, lucro, preço mínimo/sugerido) são feitas no painel
   (assets/js/painel-produto.js); a aba Estratégia usa os custos do produto ativo no lucro estimado. */
import { randomUUID } from "node:crypto";
import { autorizado, banco, json } from "./_db.js";
import { lerProdutos, tabela } from "./_produtos.js";

async function conectar(request) {
  const auth = autorizado(request);
  if (auth === "sem-senha") return { erro: json({ erro: "sem-senha" }, 401) };
  if (auth !== "ok") return { erro: json({ erro: "senha" }, 401) };
  let q;
  try { q = await banco(); } catch (e) { q = null; }
  if (!q) return { erro: json({ erro: "sem-banco" }, 503) };
  return { q };
}

export async function GET(request) {
  const c = await conectar(request);
  if (c.erro) return c.erro;
  try { return json({ produtos: await lerProdutos(c.q) }); }
  catch (e) { return json({ erro: "banco" }, 500); }
}

export async function POST(request) {
  const c = await conectar(request);
  if (c.erro) return c.erro;
  let p;
  try {
    const texto = await request.text();
    if (texto.length > 200000) return json({ erro: "grande" }, 413);
    p = JSON.parse(texto);
  } catch (e) { return json({ erro: "formato" }, 400); }
  if (!p || typeof p !== "object" || Array.isArray(p)) return json({ erro: "formato" }, 400);
  const id = typeof p.id === "string" && /^[\w-]{6,64}$/.test(p.id) ? p.id : randomUUID();
  const dados = Object.assign({}, p);
  delete dados.id; delete dados.criado; delete dados.atualizado;
  try {
    await tabela(c.q);
    const agora = Date.now();
    await c.q(`INSERT INTO produtos (id, dados, criado, atualizado) VALUES ($1, $2::jsonb, $3, $3)
      ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado = EXCLUDED.atualizado`, [id, JSON.stringify(dados), agora]);
    return json({ ok: true, id, atualizado: agora });
  } catch (e) { return json({ erro: "banco" }, 500); }
}

export async function DELETE(request) {
  const c = await conectar(request);
  if (c.erro) return c.erro;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]{6,64}$/.test(id)) return json({ erro: "id" }, 400);
  try {
    await tabela(c.q);
    await c.q("DELETE FROM produtos WHERE id = $1", [id]);
    return json({ ok: true });
  } catch (e) { return json({ erro: "banco" }, 500); }
}
