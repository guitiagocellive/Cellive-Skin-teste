# Lançamento: como a oferta estava e como voltar

Hoje as duas ofertas (quiz em `/oferta` e v2 em op.celliveskin.com) estão em **pré-lançamento**. Nada foi apagado:
os preços e o checkout continuam no `oferta.html`, só escondidos.

## O que está diferente no pré-lançamento

| Item | Pré-lançamento (agora) | Depois do lançamento (como era antes) |
|---|---|---|
| Faixa do topo | "Lançamento em breve: entre no grupo VIP e ganhe cupom" | "Promoção relâmpago: até 33% off na 3ª unidade" |
| Estoque | escondido | "Esgotando rápido · 91% vendido · termina em 04:30" |
| Título dos kits | "Escolha o seu kit de lançamento" + texto do grupo VIP | "Selecione seu plano ideal" |
| Preços dos kits | escondidos | R$ 197,90 · R$ 297,90 (24% OFF) · R$ 397,90 (33% OFF), 12x de R$ 35,90 |
| Etiquetas | "30/60/90 dias", "Frete grátis", "Mais vendido" | + "24% OFF", "33% OFF", "Mais econômico" |
| Resumo do kit | "Preço especial de lançamento só para quem estiver no grupo" | "12x de R$ 35,90 ou R$ 297,90 à vista" |
| Botão (quiz) | "Quero garantir minha fórmula" → abre o cadastro | "Comprar Agora" → checkout do kit |
| Botão (v2) | "Quero garantir o meu Sérum" → abre o cadastro | "Comprar Agora" → checkout do kit |
| Barra fixa de baixo | "Garantir" | "Comprar" |
| Cadastro do grupo VIP | aberto (nome, WhatsApp, e-mail) | não aparece |

Não mudam com o lançamento: galeria de 7 fotos, selo "Mais vendido", provas sociais e avaliações, botão preto
(antes era verde; continua preto), lista de cadastros no painel e planilha (`/api/lead?formato=csv`).

## Como lançar

1. Coloque o link do checkout de cada kit em `data-link="…"` nos três `<label class="plano">` do `oferta.html`.
2. Rode `node scripts/lancar.mjs` (ele avisa se faltar algum link e gera a v2 junto).
3. Publique (ramo `main`).

Para voltar ao pré-lançamento: `node scripts/lancar.mjs --voltar`.

## Cópias guardadas (tags no GitHub)

- `oferta-antes-do-pre-lancamento`: o site exatamente como era antes do pré-lançamento (preços à mostra, botão verde).
- `oferta-pre-lancamento`: o site como está agora (pré-lançamento com as 7 fotos e "Mais vendido").
