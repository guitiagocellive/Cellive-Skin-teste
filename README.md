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

Depois do carregamento vem a etapa da **fórmula** (12 perguntas, 12 ativos): cada pergunta acrescenta um ativo. Ao responder,
a bolinha do ativo desce até o painel "Combinação ideal para sua pele", o selo abre com o nome, o
contador sobe (1/12, 2/12...) e o pote enche. Os ativos anteriores viram bolinhas que vão se juntando ao lado do pote.
A bolinha acompanha o selo até ele parar, para pousar exatamente sobre o número e o nome do ativo.
Na última resposta, todas as bolinhas entram no pote, ele termina de encher, vai para o meio do painel e o título vira "Fórmula concluída".
As imagens de exemplo e as fotos dos cartões se ajustam à altura da tela para tudo caber acima do painel. Para testar direto essa etapa, abra `quiz.html#formula`.

Depois da fórmula vem a tela de **análise** ("FAZENDO UMA ANÁLISE **DO SEU CASO**"): o contorno de um rosto com cabelo
é escaneado e pontos acendem na pele, a barra lisa avança de forma contínua de 0% a 100% e as etapas aparecem uma
por vez (entra, ganha o check, sai e entra a próxima). Tudo leva menos de 3 s. Textos, ícones, pontos e tempos ficam
em `quiz-perguntas.js`. Para testar direto essa tela, abra `quiz.html#analise`.

Depois da 3ª pergunta, a pessoa vai direto para a tela de carregamento (0% → 100% em cerca de 3,5 s,
desacelerando de 90% a 100%). Enquanto ela roda, as imagens das próximas perguntas e as listadas em
`preCarregar` são baixadas, para aparecerem na hora. As respostas da pessoa ficam guardadas no navegador durante a visita
(sessionStorage), para serem usadas no resultado.

## Espaços de imagem

As fotos não foram recortadas do layout. Cada uma tem um espaço marcado na página.
Para preencher, salve o arquivo em `assets/img/` com o nome abaixo e a foto aparece sozinha.
As imagens são convertidas para WebP, no tamanho em que aparecem, para a página carregar rápido.

| Espaço na página | Arquivo | Tamanho sugerido |
| --- | --- | --- |
| FOTO 1 (rosto 1, prova social) | `assets/img/foto-1.webp` | ✅ já colocada |
| FOTO 2 (rosto 2, prova social) | `assets/img/foto-2.webp` | ✅ já colocada |
| FOTO 3 (rosto 3, prova social) | `assets/img/foto-3.webp` | ✅ já colocada |
| Imagem do carregamento (quiz) | `assets/img/carregamento.jpg` | 1404 × 880 px (provisória, recortada do layout) |
| Idade: Entre 18 - 25 anos | `assets/img/quiz/idade-18-25.webp` | ✅ já colocada (2:3) |
| Idade: Entre 25 - 35 anos | `assets/img/quiz/idade-25-35.webp` | ✅ já colocada (2:3) |
| Idade: Entre 35 - 40 anos | `assets/img/quiz/idade-35-40.webp` | ✅ já colocada (2:3) |
| Idade: +40 anos | `assets/img/quiz/idade-40-mais.webp` | ✅ já colocada (2:3) |
| Ativo: Ácido Hialurônico (bolinha) | `assets/img/ativos/acido-hialuronico.jpg` | ✅ já colocada |
| Ativo: PDRN (bolinha) | `assets/img/ativos/pdrn.jpg` | ✅ já colocada |
| Pergunta 3 (exemplo): Você já pensou em fazer botox ou peeling? | `assets/img/quiz/botox-peeling.jpg` | horizontal 16:9, 1280 × 720 px |
| Pergunta 4 (exemplo): Quando seu rosto está relaxado, você ainda percebe linhas na testa? | `assets/img/quiz/linhas-testa.jpg` | horizontal 16:9, 1280 × 720 px |
| Pergunta 6: Pé de galinha | `assets/img/quiz/sinal-pe-de-galinha.jpg` | quadrada, 300 × 300 px |
| Pergunta 6: Linhas 11 | `assets/img/quiz/sinal-linhas-11.jpg` | quadrada, 300 × 300 px |
| Pergunta 6: Bigode chinês | `assets/img/quiz/sinal-bigode-chines.jpg` | quadrada, 300 × 300 px |
| Pergunta 6: Linhas na testa | `assets/img/quiz/sinal-linhas-testa.jpg` | quadrada, 300 × 300 px |
| Pergunta 6: Aspecto envelhecido | `assets/img/quiz/sinal-aspecto-envelhecido.jpg` | quadrada, 300 × 300 px |
| Pergunta 6: Manchas | `assets/img/quiz/sinal-manchas.jpg` | quadrada, 300 × 300 px |
| Pergunta 8 (exemplo): Você sente que a pele do seu rosto está menos firme do que antes? | `assets/img/quiz/firmeza.jpg` | horizontal 16:9, 1280 × 720 px |
| Pergunta 9 (exemplo): Quando você se olha no espelho sem maquiagem, como sente sua pele? | `assets/img/quiz/espelho.jpg` | horizontal 16:9, 1280 × 720 px |
| Pergunta 11 (exemplo): Você já utiliza algum ativo específico para rejuvenescimento? | `assets/img/quiz/rejuvenescimento.jpg` | horizontal 16:9, 1280 × 720 px |
| Pergunta 12 (exemplo): Você percebe linhas ao redor dos olhos quando sorri? | `assets/img/quiz/linhas-olhos.jpg` | horizontal 16:9, 1280 × 720 px |
| Ativo: GHK-Cu (bolinha) | `assets/img/ativos/ghk-cu.jpg` | ✅ já colocada |
| Ativo: Acetyl Hexapeptide-8 (bolinha) | `assets/img/ativos/acetyl-hexapeptide-8.jpg` | ✅ já colocada |
| Ativo: Pentapeptide-4 (bolinha) | `assets/img/ativos/pentapeptide-4.jpg` | ✅ já colocada |
| Ativo: Retinal (bolinha) | `assets/img/ativos/retinal.jpg` | ✅ já colocada |
| Ativo: Propilenoglicol (bolinha) | `assets/img/ativos/propilenoglicol.jpg` | ✅ já colocada |
| Ativo: Glutationa (bolinha) | `assets/img/ativos/glutationa.jpg` | ✅ já colocada |
| Ativo: Tetrapeptide-7 (bolinha) | `assets/img/ativos/tetrapeptide-7.jpg` | ✅ já colocada |
| Ativo: Alfa-arbutina (bolinha) | `assets/img/ativos/alfa-arbutina.jpg` | ✅ já colocada |
| Ativo: Exo Skin (bolinha) | `assets/img/ativos/exo-skin.jpg` | ✅ já colocada |
| Ativo: Niacinamida (bolinha) | `assets/img/ativos/niacinamida.jpg` | ✅ já colocada |

A logo já está em `assets/img/logo-cellive-skin.svg`, convertida do arquivo original do Illustrator.
A bandeira da Coreia do Sul é desenhada direto no código (SVG), sem arquivo de imagem.
O pote do painel da fórmula é um vetor (`assets/img/pote.svg`, também embutido no `quiz.html`),
redesenhado a partir da imagem de referência.

## Fonte (Acumin Pro)

O site usa **Acumin Pro** e **Acumin Pro Condensed**, carregadas pelo projeto web da Adobe Fonts
(`https://use.typekit.net/zvs4xwq.css`), que já está no `<head>` de todas as páginas.
Toda página nova precisa ter esse mesmo link.

## Política de Privacidade

A política é genérica e não traz dados da empresa. O aceite acontece ao clicar em
“Quero melhorar minha pele”, como informado no rodapé da página inicial.
