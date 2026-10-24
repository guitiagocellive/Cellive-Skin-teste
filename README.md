# Cellive Skin — página de vendas com quiz

Site estático (HTML + CSS), sem instalação. Para ver, abra o `index.html` no navegador.
Pode ser publicado em qualquer hospedagem de site estático (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Páginas

| Arquivo | O que é |
| --- | --- |
| `index.html` | Capa do quiz (primeira página) |
| `politica-de-privacidade.html` | Política de Privacidade (LGPD) |
| `quiz.html` | Provisória. Vira o quiz na próxima etapa |

## Espaços de imagem

As fotos não foram recortadas do layout. Cada uma tem um espaço marcado na página.
Para preencher, salve o arquivo em `assets/img/` com o nome abaixo e a foto aparece sozinha.

| Espaço na página | Arquivo | Tamanho sugerido |
| --- | --- | --- |
| FOTO 1 (rosto 1, prova social) | `assets/img/foto-1.jpg` | quadrada, 200 × 200 px |
| FOTO 2 (rosto 2, prova social) | `assets/img/foto-2.jpg` | quadrada, 200 × 200 px |
| FOTO 3 (rosto 3, prova social) | `assets/img/foto-3.jpg` | quadrada, 200 × 200 px |
| BANDEIRA (Coreia do Sul) | `assets/img/bandeira-coreia.png` | 240 × 180 px, fundo transparente |

A logo já está em `assets/img/logo-cellive-skin.svg`, convertida do arquivo original do Illustrator.

## Fonte (Acumin Pro)

O layout usa **Acumin Pro** e **Acumin Pro Condensed**, que são fontes da Adobe Fonts.
Para usar no site:

1. Em [fonts.adobe.com](https://fonts.adobe.com), crie um **projeto web** com Acumin Pro e Acumin Pro Condensed
   (pesos 300, 400, 600 e 700, com itálico).
2. Copie o link do kit (`https://use.typekit.net/XXXXXXX.css`).
3. Cole o link no `<head>` de cada página, no lugar indicado pelo comentário.

Enquanto o kit não estiver ligado, o site usa a **Archivo** (Google Fonts), que tem desenho parecido.

## Política de Privacidade

Os trechos em amarelo (`[RAZÃO SOCIAL]`, `[CNPJ]`, `[E-MAIL DE PRIVACIDADE]` etc.) precisam ser preenchidos
com os dados reais da empresa antes de o site ir ao ar. Vale uma revisão final com um advogado.
