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
| `oferta.html` | Página de oferta (o quiz leva até ela no final) |
| `404.html` | Página de "não encontrada" |

## Perguntas do quiz

Os textos das perguntas, das respostas e da tela de carregamento ficam em
`assets/js/quiz-perguntas.js`, na ordem em que aparecem. Para mudar um texto, basta editar esse arquivo.

Depois do carregamento vem a etapa da **fórmula** (12 perguntas, 12 ativos): cada pergunta acrescenta um ativo. Ao responder,
a bolinha do ativo desce até o painel "Combinação ideal para sua pele", o selo abre com o nome, o
contador sobe (1/12, 2/12...) e o pote enche. Os ativos anteriores viram bolinhas que vão se juntando ao lado do pote.
A bolinha acompanha o selo até ele parar, para pousar exatamente sobre o número e o nome do ativo.
Na última resposta, todas as bolinhas vêm da direita e entram pela lateral do pote, ele termina de encher, vai para o meio do painel e o título vira "Fórmula concluída".
As imagens de exemplo e as fotos dos cartões se ajustam à altura da tela para tudo caber acima do painel. Para testar direto essa etapa, abra `quiz.html#formula`.

Depois da fórmula vem a tela de **análise** ("FAZENDO UMA ANÁLISE **DO SEU CASO**"): o contorno de um rosto com cabelo
é escaneado e pontos acendem na pele, a barra lisa avança de forma contínua de 0% a 100% e as etapas aparecem uma
por vez (entra, ganha o check, sai e entra a próxima). Tudo leva menos de 3 s. Textos, ícones, pontos e tempos ficam
em `quiz-perguntas.js`. Para testar direto essa tela, abra `quiz.html#analise`.

Depois da análise vem a **montagem da fórmula** ("MONTANDO SUA **FÓRMULA**"): os 12 ativos surgem num anel
tracejado que gira em volta do pote, entram um a um ("+NOME DO ATIVO") e o pote enche. No fim aparece
"FÓRMULA **CONCLUÍDA!**" com o check, o anel some, o pote cresce, a luz azul aumenta e o pote vira o produto: um brilho passa e o rótulo aparece (lista de ativos, "PELE MAIS FIRME…", "RETINALDEÍDO 0,05%", logo na vertical e "30ml"). Cerca de 4,8 s no total. A cada ativo que entra, o pote dá uma leve "engolida". Textos e tempos ficam em
`quiz-perguntas.js`. Para testar direto essa tela, abra `quiz.html#montagem`.

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
| Idade: Entre 18 - 25 anos | `assets/img/quiz/idade-18-25.webp` | ✅ já colocada (1:1) |
| Idade: Entre 25 - 35 anos | `assets/img/quiz/idade-25-35.webp` | ✅ já colocada (1:1) |
| Idade: Entre 35 - 40 anos | `assets/img/quiz/idade-35-40.webp` | ✅ já colocada (1:1) |
| Idade: +40 anos | `assets/img/quiz/idade-40-mais.webp` | ✅ já colocada (1:1) |
| Ativo: Ácido Hialurônico (bolinha) | `assets/img/ativos/acido-hialuronico.jpg` | ✅ já colocada |
| Ativo: PDRN (bolinha) | `assets/img/ativos/pdrn.jpg` | ✅ já colocada |
| Pergunta 3 (exemplo): Você já pensou em fazer botox ou peeling? | `assets/img/quiz/botox-peeling.webp` | ✅ já colocada (3:2) |
| Pergunta 4 (exemplo): Quando seu rosto está relaxado, você ainda percebe linhas na testa? | `assets/img/quiz/linhas-testa.webp` | ✅ já colocada (3:2) |
| Pergunta 6: Pé de galinha | `assets/img/quiz/sinal-pe-de-galinha.webp` | ✅ já colocada (1:1) |
| Pergunta 6: Linhas 11 | `assets/img/quiz/sinal-linhas-11.webp` | ✅ já colocada (1:1) |
| Pergunta 6: Bigode chinês | `assets/img/quiz/sinal-bigode-chines.webp` | ✅ já colocada (1:1) |
| Pergunta 6: Linhas na testa | `assets/img/quiz/sinal-linhas-testa.webp` | ✅ já colocada (1:1) |
| Pergunta 6: Aspecto envelhecido | `assets/img/quiz/sinal-aspecto-envelhecido.webp` | ✅ já colocada (1:1) |
| Pergunta 6: Manchas | `assets/img/quiz/sinal-manchas.webp` | ✅ já colocada (1:1) |
| Pergunta 8 (exemplo): Você sente que a pele do seu rosto está menos firme do que antes? | `assets/img/quiz/firmeza.webp` | ✅ já colocada (3:2) |
| Pergunta 9 (exemplo): Quando você se olha no espelho sem maquiagem, como sente sua pele? | `assets/img/quiz/espelho.webp` | ✅ já colocada (3:2) |
| Pergunta 11 (exemplo): Você já utiliza algum ativo específico para rejuvenescimento? | `assets/img/quiz/rejuvenescimento.webp` | ✅ já colocada (3:2) |
| Pergunta 12 (exemplo): Você percebe linhas ao redor dos olhos quando sorri? | `assets/img/quiz/linhas-olhos.webp` | ✅ já colocada (3:2) |
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
| Oferta: fotos do produto 1 a 6 (galeria) | `assets/img/oferta/produto-1.webp` … `produto-6.webp` | quadrada, 900 × 900 px |
| Oferta: caixa e frasco (dobra "Conheça o Sérum") | `assets/img/oferta/caixa.webp`, `frasco.webp` | ✅ já colocadas (fundo transparente) |
| Oferta: foto das microespículas (ação SRRP) | `assets/img/oferta/srrp-microespiculas.webp` | ✅ já colocada |
| Oferta: foto do rosto ("O reset") | `assets/img/oferta/reset-rosto.webp` | paisagem 1,6 : 1, 800 × 500 px |
| Oferta: fotos "O que ele te proporciona" 1 a 3 | `assets/img/oferta/aliado-1.webp` … `aliado-3.webp` | retrato 4:5, 640 × 800 px |
| Oferta: imagem do microagulhamento | `assets/img/oferta/microagulhamento.webp` | ✅ já colocada |
| Oferta: frasco com tampa (cartão da garantia) | `assets/img/oferta/frasco-tampa.webp` | ✅ já colocada |
| Oferta: fotos das clientes 1 a 6 ("Um pouco dos nossos clientes") | `assets/img/oferta/cliente-1.webp` … `cliente-6.webp` | quadrada, 160 × 160 px |
| Oferta: fotos dos depoimentos 1 a 3 | `assets/img/oferta/depoimento-1.webp` … `depoimento-3.webp` | 6:5, 600 × 500 px |

A logo já está em `assets/img/logo-cellive-skin.svg`, convertida do arquivo original do Illustrator.
A bandeira da Coreia do Sul é desenhada direto no código (SVG), sem arquivo de imagem.
O pote do painel da fórmula é um vetor (`assets/img/pote.svg`, também embutido no `quiz.html`),
redesenhado a partir da imagem de referência.

## Página de oferta

`oferta.html` mostra o produto (galeria com 6 fotos, selos, avaliação e benefícios) e os planos. Os preços, o resumo e o
link de checkout de cada plano ficam nos atributos `data-` de cada plano no próprio `oferta.html`
(`data-resumo`, `data-parcela`, `data-avista` e `data-link`). A contagem regressiva começa em 3h37m45s e continua
de onde parou se a pessoa recarregar a página.

Depois dos planos vêm os **depoimentos** ("AMADO POR **+5.000 MULHERES**", com o traço azul que se desenha em volta),
num carrossel que a pessoa arrasta para o lado, e as **principais dúvidas**, que abrem uma por vez. Para mudar nomes,
textos dos depoimentos ou respostas das dúvidas, edite direto o `oferta.html`. Depois que a pessoa passa do botão
"Comprar Agora", aparece uma barra fixa no rodapé com o botão "Comprar", que leva de volta à escolha do plano.

Em seguida vem "VOCÊ ENVELHECE. **MAS SUA PELE NÃO PRECISA TE ACOMPANHAR!**", com degradê azul no fundo e etiquetas
(rugas, linhas finas…) flutuando de leve. Depois, "CONHEÇA O **SÉRUM REVITALIZADOR**": quando a dobra aparece, a luz azul acende atrás do produto, o frasco sobe e as duas caixas se abrem de trás dele; depois o conjunto flutua de leve.

Em seguida vem "SUA FÓRMULA **PERSONALIZADA**": os 12 ativos do quiz em cartões curtos, cada um com a bolinha, o
nome, o que o ativo faz em uma linha, a pergunta, o que a pessoa respondeu e uma frase breve de por que aquele ativo é bom
para a resposta dela. Aparecem 5 ativos, e os outros 7 abrem no botão "Ver os outros 7 ativos". No fim, o botão preto "Quero minha fórmula" (com ondas de sombra saindo dele) leva até os planos. Os nomes e as imagens vêm
do `quiz-perguntas.js`; os textos ficam em `assets/js/oferta-formula.js` (uma frase para cada resposta possível). Se a
pessoa abrir a oferta sem ter feito o quiz, aparece só o que cada ativo faz.

Depois vem "FÓRMULA COM AÇÃO **SRRP**": o frasco entra pela esquerda conforme a página rola e para na diagonal ao lado
do título, com "CELLIVE SKIN" bem clarinho na vertical ao fundo. Abaixo, a linha do tempo das 4 frentes (Sinalização,
Renovação, Regeneração e Potencialização): a linha azul vai se preenchendo com a rolagem e cada etapa acende quando a
linha chega nela, com o cartão do ativo (GHK-Cu, Retinal, PDRN e microespículas).

Em seguida, "O VERDADEIRO INIMIGO" (título e texto entram suavemente) e "O RESET. **QUE SUA PELE PRECISA!**", com o traço
azul desenhado em volta do título, a foto do rosto e o texto sobre a ação SRRP com uma luz azul atrás.

Depois, "O SEU NOVO ALIADO – O QUE ELE **TE PROPORCIONA.**": três benefícios alternando texto e foto, cada texto com
um traço azul desenhado em volta. E "TECNOLOGIA COREANA – O EFEITO DE **MICROAGULHAMENTO**": a imagem das camadas da
pele (o fundo branco dela some na página), com duas legendas que descem uma linha até a pele, e o texto
sobre as microespículas.

Por fim, "UM POUCO **DOS NOSSOS CLIENTES**": 6 fotos de clientes, a nota 4,9/5.0 e 5 depoimentos que andam sozinhos
para a direita, em loop e devagar (não dá para arrastar). Depois o cartão "GARANTIA REEMBOLSO" com a caixa, o frasco e o selo de 30 dias na frente
e "CIÊNCIA E SEGURANÇA – **RESULTADOS REAIS!**": três cartões com os percentuais que começam juntos e se abrem
conforme a página rola; cada número conta de 0 até o valor. Nomes, textos e números ficam no
`oferta.html`.

## Fonte (Acumin Pro)

O site usa **Acumin Pro** e **Acumin Pro Condensed**, carregadas pelo projeto web da Adobe Fonts
(`https://use.typekit.net/zvs4xwq.css`), que já está no `<head>` de todas as páginas.
Toda página nova precisa ter esse mesmo link.

## Política de Privacidade

A política é genérica e não traz dados da empresa. O aceite acontece ao clicar em
“Quero melhorar minha pele”, como informado no rodapé da página inicial.
