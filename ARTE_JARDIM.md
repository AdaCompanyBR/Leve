# Arte do Jardim — especificação

O jardim (Progresso › Jardim) já está ligado aos dados: fase da árvore, vitalidade, regadas, árvores especiais, decorações e memórias. Falta só a arte. Basta colocar as imagens em `img/garden/` com os nomes abaixo para o app usá-las sozinho (`src/ui/gardenScene.js`). Enquanto `img/garden/scene` não existir, o app continua com o desenho atual em Canvas.

## Identidade visual definitiva

A referência obrigatória é `docs/arte-jardim-referencia.jpg`, escolhida a partir das pranchas aprovadas. É uma referência de aparência, não um arquivo de produção.

- **Cenário:** jardim ensolarado em 3D estilizado, com:
  - grama muito detalhada, com variação de tons;
  - uma árvore grande em primeiro plano à esquerda, emoldurando a cena;
  - hortênsias lilás à esquerda e hibiscos laranja à direita;
  - cerca de madeira à direita;
  - pedras naturais grandes, pedras de caminho no primeiro plano e margaridas brancas;
  - montanhas azuladas e céu com nuvens ao fundo.

  O **centro fica livre**: é ali, numa clareira de grama, que a árvore da pessoa cresce.
- **Árvore:** a mesma espécie nas 7 fases (muda, arvoreta, jovem, desenvolvida, consolidada e plenitude com flores rosadas). Cada fase traz o próprio montinho de terra com pedrinhas e grama em volta. O tronco é castanho e a folhagem verde-clara e brilhante, com luz quente.
- **Enfraquecida:** a mesma pose, com as folhas passando de verde para amarelo e laranja e a copa mais rala. Só na fase 7 enfraquecida restam poucos galhos com folhas laranja.

## Como entregar

Envie os **arquivos individuais**, não uma prancha com todos juntos. Um ZIP serve, desde que tenha estes 15:

```
img/garden/scene.webp
img/garden/tree-1.webp … tree-7.webp
img/garden/tree-1-dry.webp … tree-7-dry.webp
```

- **Pasta:** o projeto não tem `public/`; os arquivos ficam em `img/garden/`.
- **Formato:** PNG ou WebP. O app aceita os dois, e o script abaixo converte tudo para WebP.
- **Cenário (`scene`):** imagem completa e opaca, idealmente 1440 × 944 px (proporção 360 : 236) ou maior. Se vier em outra proporção, o script recorta pelo centro, sem distorcer.
- **Árvores:** **fundo transparente de verdade**, não um xadrez desenhado. Aceitam dois formatos, e o app detecta sozinho:
  - **Recorte:** só a árvore com o montinho de terra, aparada rente. É o formato das pranchas e o mais fácil de gerar. O app encaixa o **centro da borda de baixo** do recorte no canteiro (x = 720, y = 800 no quadro 1440 × 944) e usa a altura da fase: 150, 200, 270, 350, 440, 520 e 580 px.
  - **Quadro inteiro:** 1440 × 944, já na posição, com a base do tronco em x = 720 e y = 760.
- **Enfraquecida (`tree-N-dry`):** a **mesma árvore, na mesma pose e escala** da saudável, para as duas se sobreporem sem "pular".
- **Ajustes sem mexer no código:** se o canteiro do cenário final ficar em outro lugar, ou uma fase precisar de outra altura, ajuste em `img/garden/garden.json`:

```json
{ "anchor": { "x": 720, "y": 800 }, "heights": { "tree-7": 600 }, "assets": { "tree-3": { "x": 726, "y": 802 } } }
```

## Preparar e conferir

1. `python3 scripts/garden_assets.py <pasta recebida>`: confere os nomes e a transparência, apara os recortes, converte para WebP otimizado em `img/garden/` e avisa se uma versão enfraquecida tem pose diferente da saudável.
2. `npm start` e abra `/app/tools/garden-preview.html`: mostra as 7 fases com 100%, 50% e 10% de vitalidade, para conferir o encaixe. A página não vai para o app publicado.

## Regra de ouro: mesma câmera e mesma luz

- **Câmera:** a mesma em todas, três quartos, levemente de cima, como na referência. Focal fixa.
- **Luz:** a mesma em todas: sol quente do alto à esquerda, sombras macias e *ambient occlusion*.
- **Escala:** coerente entre as fases, com a árvore crescendo de verdade e sem mudar de espécie.

## Lista de arquivos

| Arquivo | O que é | Fundo |
|---|---|---|
| `scene.webp` | Cenário completo **sem a árvore principal**, com a clareira central livre (ver a referência) | opaco |
| `seedbed.webp` | Canteiro de terra fértil vazio no lugar da árvore (sem árvore viva) | transparente |
| `tree-1.webp` | Germinação: muda bonita, caule fino e 4 a 6 folhas bem formadas | transparente |
| `tree-2.webp` | Primeiro crescimento: arvoreta com os primeiros galhos | transparente |
| `tree-3.webp` | Desenvolvimento: árvore jovem com copa começando a encher | transparente |
| `tree-4.webp` | Fortalecimento: tronco mais grosso, copa volumosa | transparente |
| `tree-5.webp` | Florescimento: copa cheia, com flores discretas | transparente |
| `tree-6.webp` | Madura: árvore robusta, raízes aparentes | transparente |
| `tree-7.webp` | Extraordinária: majestosa, com um brilho sutil (luz dourada nas folhas) | transparente |
| `tree-N-dry.webp` | Para **cada** fase (1 a 7): a **mesma árvore, na mesma pose**, enfraquecida: folhas amareladas e amarronzadas, copa mais rala, algumas folhas caídas no chão | transparente |
| `special-constancia.webp` | Árvore da Constância, no fundo à esquerda | transparente |
| `special-vitalidade.webp` | Árvore da Vitalidade (folhagem verde-água), no fundo à direita | transparente |
| `special-nutricao.webp` | Árvore da Nutrição (com frutos laranja) | transparente |
| `special-resistencia.webp` | Árvore da Resistência (folhas vermelhas, tipo bordo) | transparente |
| `special-superacao.webp` | Árvore da Superação (flores rosadas) | transparente |
| `special-centenaria.webp` | Árvore Centenária (folhas douradas) | transparente |
| `memory.webp` | Pequena árvore seca, discreta, ao longe (memórias) | transparente |
| `deco-banco.webp`, `deco-lanterna.webp`, `deco-pedras.webp`, `deco-flores.webp`, `deco-lago.webp`, `deco-ponte.webp` | Cada decoração no seu lugar | transparente |

As especiais e as decorações devem ocupar lugares que **não se sobrepõem** entre si nem à árvore principal: as especiais ficam ao fundo, nas laterais; as decorações, no primeiro plano e nas bordas.

## Como o app usa as camadas

- **Fase:** escolhe `tree-N` pela fase real (regadas).
- **Vitalidade:** sobrepõe `tree-N-dry` com opacidade proporcional à perda; em 50%, a mistura fica perto da metade. O cenário perde até 40% da saturação.
- **Movimento:** a copa balança de leve em volta da base do tronco. Folhas secas caem quando a vitalidade está abaixo de 90%, e gotas de água caem na regada do dia.
- **Movimento reduzido:** se o aparelho pede menos movimento, tudo fica parado.
- **Camadas que faltam:** uma camada que ainda não existe é ignorada. Por isso a arte pode chegar aos poucos, mas o `scene` e as sete fases da árvore vêm primeiro.

## Direção de arte

*Premium 3D stylized nature environment*: um pequeno jardim particular, planejado e acolhedor, com aparência de cenário de jogo moderno de simulação de natureza.

- **Modelagem e materiais:** modelagem 3D convincente, sem ser fotográfica; materiais macios, sem brilho plástico.
- **Grama:** com variação de tons.
- **Terreno:** pequenas elevações e contornos naturais que vão até as bordas do quadro, **sem ilha flutuante** e sem plataforma.
- **Elementos:** flores pequenas, plantas ornamentais e pedras arredondadas, poucas e bem posicionadas.
- **Foco na árvore:** profundidade de campo discreta, com o fundo levemente desfocado.
- **Paleta:** natural, combinando com o app: céu claro, verdes vivos mas não saturados.
- **Evitar:** estética infantil, contornos de desenho animado, *flat*, chamas e qualquer semelhança com marcas ou jogos existentes.

## Prompts prontos (geradores de imagem)

Use **a mesma semente e a mesma referência de composição** em todos. O ideal é gerar o cenário e depois a árvore com *inpainting* ou *image-to-image* sobre ele.

**Cenário (`scene`):**
> Premium 3D stylized nature environment, small private garden, three-quarter isometric view from 35 degrees above, soft natural sunlight from the upper left, global illumination, ambient occlusion, soft shadows, lush textured grass with tonal variation, gentle terrain elevations, a few rounded stones, small natural flowers and ornamental plants placed with intention, empty fertile soil spot at the center for a tree, ground extends to the edges of the frame (no floating island), subtle depth of field, natural color palette, modern simulation game aesthetic, soft materials, no characters, no text, 1440x944

**Árvore (`tree-N`), trocando só a fase:**
> Same garden, same camera and lighting. At the center, a beautiful young stylized 3D tree [FASE], natural trunk with bark texture and proportional thickness, visible natural branching, volumetric foliage made of individually shaded leaves with natural shapes and several shades of green, roots blending into the soil, soft contact shadow, premium simulation game look

Troque **[FASE]** por:
1. *tiny sapling just sprouted, thin stem, five well-formed leaves, rich dark soil*
2. *small young tree with its first branches*
3. *young tree with more branches and a filling canopy*
4. *developed tree with a sturdy trunk and voluminous canopy*
5. *full canopy with subtle small white-pink blossoms*
6. *mature robust tree with visible roots*
7. *majestic tree with a subtle golden glow on the leaves*

**Versão enfraquecida (`tree-N-dry`):**
> Exactly the same tree and pose, weakened: leaves fading to yellow and light brown, thinner canopy, a few fallen leaves on the ground, still alive and gentle, not dead, same camera and lighting

Para as camadas transparentes, gere sobre o cenário e recorte o objeto com a sombra (ou peça *transparent background*). A base do tronco tem de ficar em x = 720 e y = 760.

## Alternativa: Blender

Um artista 3D pode montar a cena uma vez e renderizar as camadas com *View Layers* e *Film › Transparent*, ganhando consistência total de câmera e luz. Duas alternativas para o material de partida:

- modelos próprios;
- pacotes com licença livre (CC0), como Quaternius *Stylized Nature* ou Kenney *Nature Kit*, conferindo a licença.
