# Leve: direção visual

Referência: "teatro escuro com hardware luminoso" (estilo das páginas de produto da Apple), enviada pelo dono do projeto. Vale para o app e para a landing (`site/`).

## Cor
Preto como palco, grafite nas superfícies, texto quase branco e **um único azul de ação**. Nada de tinta colorida em fundos.

| Papel | Escuro (padrão) | Claro |
| --- | --- | --- |
| Fundo | `#000000` | `#F5F5F7` |
| Superfície (cartões) | `#1D1D1F` | `#FFFFFF` |
| Superfície 2 (campos, botões secundários) | `#333336` | `#E8E8ED` |
| Texto | `#F5F5F7` | `#1D1D1F` |
| Texto secundário | `#A1A1A6` | `#6E6E73` |
| Ação (botão principal, anel, barras) | `#0071E3` | `#0071E3` |
| Links e texto em azul | `#2997FF` | `#0066CC` |

- O azul `#0071E3` é o único preenchimento colorido. Botões secundários são neutros (`#333336` / `#E8E8ED`).
- O gradiente prismático (`#0090F7 → #BA62FC → #F2416B → #F55600`) só aparece em "selos": o ícone do app e o selo da landing.
- Sem sombras e sem gradientes de fundo. A elevação vem do tom (`#1D1D1F` sobre `#000`) e do raio.

## Tipografia
Fonte do sistema (SF Pro Display e SF Pro Text nos aparelhos Apple), Inter como substituta. Pesos 400 e 600, nunca acima. Corpo em 17 px com entrelinha 1,47 e −0,022 em. Títulos de tela em 40 px (56 px no computador), peso 600. Títulos de cartão em 21 px. Na landing, títulos de 40 a 80 px com espaçamento negativo.

## Forma e espaço
Cartões com raio de 28 px. Botões e campos em pílula. Botões com texto em peso 400. Espaços de 14 a 28 px entre blocos no app e de 80 a 104 px entre seções na landing.

## O elemento de assinatura
O anel de calorias, agora em azul, sobre o grafite. Ele anima com uma mola a cada registro. Na landing, a tela real do app aparece como o "produto" iluminado no palco preto.

## Movimento
Mola no anel; curva `cubic-bezier(.32,.72,0,1)` em sheets, barras e botões. `prefers-reduced-motion` desliga tudo.

## Layout
- **Celular:** barra de abas inferior translúcida, uma coluna, safe areas respeitadas.
- **Computador (960 px ou mais):** barra lateral e grade de duas ou três colunas. Sheets viram diálogos centrados.

## Acessibilidade
Foco visível em azul, navegação por teclado, rótulos ARIA, contraste AA nos textos (o cinza secundário do escuro é `#A1A1A6`, um tom acima do `#86868B` da referência, para passar no AA sobre `#1D1D1F`).

## Voz
Frases curtas, sem culpa. Botões dizem o que acontece. Erros dizem o que houve e como resolver.
