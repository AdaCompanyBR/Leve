# Landing do Leve: direção visual

Baseada na referência "Augen Pro" enviada pelo dono do projeto: branco clínico, tipografia leve, um único azul de sinal. O app em si segue o `DESIGN.md` da raiz (íris); a landing usa esta direção e mostra o app pelas capturas reais.

## Cores

| Papel | Valor | Uso |
| --- | --- | --- |
| Fundo da página | `#f2f2f4` | canvas |
| Superfície | `#fdfdfd` | cartões, menu, etiquetas |
| Escuro | `#0f1012` | texto principal, faixa do rodapé |
| Texto secundário | `#5e5e5e` | parágrafos de apoio (5,8:1 no fundo) |
| Rótulo | `#6b6b6b` | rótulos pequenos. A referência usa `#8f8f8f`, que dá 2,9:1 e não passa no AA |
| Azul de sinal | `#0071e3` | só contornos (etiquetas, foco, anel) |
| Azul de texto | `#0066cc` | links e etiquetas em texto pequeno (5:1 no fundo; `#0071e3` dá 4,2:1) |
| Azul no escuro | `#4da3ff` | links no rodapé |

Azul nunca é preenchimento. Sem sombras: a elevação vem do tom (`#fdfdfd` sobre `#f2f2f4`) e de linhas de 0,5 px em `rgba(0,0,0,.06)`.

## Tipografia

Inter variável (substituta da PP Neue Montreal), peso 350 em tudo e 400 só em rótulos de botão. Espaçamento entre letras de −0,02 em. Escala: 12, 14, 16, 18, 27 px; o título da abertura vai de 40 a 76 px, ainda em 350. Hierarquia por tamanho, nunca por peso.

## Forma e espaço

Cartões com raio de 54 px (30 px no celular) e preenchimento de 69 px (28 px no celular). Etiquetas e botões em pílula. Menu flutuante com raio de 10 px a 34 px do topo. Seções separadas por 96 px (64 px no celular). Largura máxima de 1200 px. Texto sempre alinhado à esquerda.

## Imagem

Sem retrato 3D: o elemento visual é o anel de calorias do app, desenhado em linhas finas, e as capturas reais das telas, com dados de exemplo. Nada de gradientes ou padrões decorativos.

## Movimento

O anel se desenha uma vez ao carregar; as seções entram com um leve fade. `prefers-reduced-motion` desliga tudo.
