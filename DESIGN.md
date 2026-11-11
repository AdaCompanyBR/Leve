# Leve: direção visual

Referência: os apps Saúde e Fitness da Apple. Superfícies calmas, números grandes, um único ponto de cor.

## Cor
Uma cor de destaque, íris, usada para progresso e ação. Nada de vermelho ou verde de julgamento.

| Papel | Claro | Escuro |
| --- | --- | --- |
| Fundo | `#F3F3F8` | `#000000` |
| Superfície | `#FFFFFF` | `#17171D` |
| Superfície 2 | `#ECECF3` | `#24242D` |
| Texto | `#15151C` | `#F5F5FA` |
| Texto secundário | `#5E5F6C` | `#A9AAB8` |
| Destaque | `#5856D6` | `#8E8BFF` |
| Destaque claro (anel) | `#9A8CFF` | `#C4B8FF` |

Texto e texto secundário passam de AA sobre as superfícies. O tema segue o sistema e pode ser fixado nos Ajustes.

## Tipografia
Fonte do sistema (`-apple-system`, SF Pro quando houver). Números grandes em `ui-rounded` (SF Pro Rounded nos aparelhos Apple), sempre tabulares. Títulos de tela em 34 px (40 px no desktop), peso 750, entrelinha 1,1.

## Forma e espaço
Cartões com raio de 26 px, sem sombra, separados do fundo só pelo tom. Controles com raio de 15 px e altura mínima de 44 px. Espaço de 14 a 20 px entre blocos.

## O elemento de assinatura
O anel de calorias, em canvas. Ele anima com uma mola a cada registro e um brilho percorre devagar o trecho preenchido. Acima de 100%, a segunda volta passa por cima da primeira, na mesma cor. Todo o resto da interface fica quieto para que o anel seja o que se lembra.

## Movimento
- Mola no anel; curva `cubic-bezier(.32,.72,0,1)` em sheets, barras e botões.
- Um único momento orquestrado: a revelação do plano no fim do onboarding.
- Gestos: arrastar um item para a esquerda apaga (com "Desfazer"); arrastar a alça fecha a sheet.
- `prefers-reduced-motion` desliga mola, brilho e transições.

## Layout
- **Celular:** barra de abas inferior translúcida, uma coluna, safe areas respeitadas.
- **Desktop (960 px ou mais):** barra lateral e grade de duas ou três colunas por tela. Sheets viram diálogos centrados.

## Acessibilidade
Foco visível em tudo, navegação por teclado (inclusive controles segmentados e sheets com foco preso e Esc), rótulos ARIA em ícones, anel e gráficos com descrição em texto, apagar item também disponível por botão.

## Voz
Frases curtas, sem culpa. Botões dizem o que acontece ("Adicionar ao diário", "Salvar peso"). Erros dizem o que houve e como resolver.
