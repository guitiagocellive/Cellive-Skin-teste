# Cellive Skin — página de vendas com quiz

Site estático (HTML + CSS), sem instalação. Para ver, abra o `index.html` no navegador.

## Publicação (Cloudflare)

O site é publicado pela Cloudflare (Workers) direto deste repositório. A configuração está em
`wrangler.jsonc`, e não precisa de comando de build. O `.assetsignore` lista os arquivos que não vão
para o ar (README, configurações e a pasta `.git`).

## Páginas

| Arquivo | O que é |
| --- | --- |
| `index.html` | Capa do quiz (primeira página) |
| `politica-de-privacidade.html` | Política de Privacidade (LGPD) |
| `quiz.html` | Quiz: uma pergunta por vez, com progresso 1 · 2 · 3 e botão de voltar |
| `404.html` | Página de "não encontrada" |

## Perguntas do quiz

Os textos das perguntas, das respostas e da tela de carregamento ficam em
`assets/js/quiz-perguntas.js`, na ordem em que aparecem. Para mudar um texto, basta editar esse arquivo.

Depois da 3ª pergunta, a pessoa vai direto para a tela de carregamento (0% → 100% em cerca de 3,5 s,
desacelerando de 90% a 100%). Enquanto ela roda, as imagens das próximas perguntas e as listadas em
`preCarregar` são baixadas, para aparecerem na hora. As respostas da pessoa ficam guardadas no navegador durante a visita
(sessionStorage), para serem usadas no resultado.

## Espaços de imagem

As fotos não foram recortadas do layout. Cada uma tem um espaço marcado na página.
Para preencher, salve o arquivo em `assets/img/` com o nome abaixo e a foto aparece sozinha.

| Espaço na página | Arquivo | Tamanho sugerido |
| --- | --- | --- |
| FOTO 1 (rosto 1, prova social) | `assets/img/foto-1.jpg` | quadrada, 200 × 200 px |
| FOTO 2 (rosto 2, prova social) | `assets/img/foto-2.jpg` | quadrada, 200 × 200 px |
| FOTO 3 (rosto 3, prova social) | `assets/img/foto-3.jpg` | quadrada, 200 × 200 px |
| Imagem do carregamento (quiz) | `assets/img/carregamento.jpg` | 1404 × 880 px (provisória, recortada do layout) |

A logo já está em `assets/img/logo-cellive-skin.svg`, convertida do arquivo original do Illustrator.
A bandeira da Coreia do Sul é desenhada direto no código (SVG), sem arquivo de imagem.

## Fonte (Acumin Pro)

O site usa **Acumin Pro** e **Acumin Pro Condensed**, carregadas pelo projeto web da Adobe Fonts
(`https://use.typekit.net/zvs4xwq.css`), que já está no `<head>` de todas as páginas.
Toda página nova precisa ter esse mesmo link.

## Política de Privacidade

A política é genérica e não traz dados da empresa. O aceite acontece ao clicar em
“Quero melhorar minha pele”, como informado no rodapé da página inicial.
