# Design System do Leve: experiência nativa Apple

Referência visual central do projeto. Toda tela, componente ou funcionalidade nova segue estas regras **antes** de ser implementada. A parte 1 é o documento de direção do dono do projeto; a parte 2 registra como ele se traduz no código do Leve.

Referências obrigatórias:
1. [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/): regras oficiais de experiência e interface.
2. [SF Symbols](https://developer.apple.com/sf-symbols/): referência para ícones e alinhamentos.
3. [Apple Design Resources](https://developer.apple.com/design/resources/): recursos oficiais de design.

---

## Parte 1. Direção

### 1. Visão e objetivo
A interface segue a linguagem visual do software da Apple (macOS, iOS, iPadOS e seus apps nativos). Não é "um site moderno com glassmorphism": a pessoa deve sentir que usa um app feito com o mesmo cuidado. Transmitir sofisticação, precisão visual, simplicidade funcional, organização, leveza, fluidez, consistência e qualidade premium.

**Regra fundamental:** nada de dashboards genéricos, templates administrativos ou interfaces padronizadas de SaaS. Reproduzir com cuidado componentes, espaçamentos, tipografia, ícones e comportamentos, usando referências reais de macOS e iOS.

### 2. Identidade visual
**Filosofia.** Menos elementos, mais significado. Hierarquia muito bem definida. Informação só quando necessária. Espaço vazio intencional. Nada decorativo sem função. Controles discretos e integrados. Componentes consistentes. Nenhuma informação competindo sem necessidade. Não preencher espaço vazio com cards, gráficos, ícones ou textos.

**Paleta.**

| Papel | Claro | Escuro |
| --- | --- | --- |
| Fundo principal | `#F5F5F7` | `#161617` |
| Superfícies | `#FFFFFF` | `#1C1C1E` |
| Fundo secundário | `#F2F2F7` | `#2C2C2E` |
| Texto principal | `#1D1D1F` | `#F5F5F7` |
| Texto secundário | `#86868B` | `#98989D` |
| Bordas | `#D2D2D7` | `#38383A` |

Cor de destaque só com função: azul para ações primárias e links, verde para sucesso, vermelho para erros, laranja para alertas. Nada de cores vibrantes, gradientes exagerados ou sombras coloridas.

### 3. Vidro e materiais
Translucidez, desfoque controlado, bordas finas, reflexos sutis e camadas, com a sutileza dos sistemas Apple. Vidro principalmente em barras de navegação flutuantes, cabeçalhos fixos, menus contextuais, popovers, painéis, modais e barras inferiores no celular. **Não** transformar tudo em vidro: conteúdo principal em superfícies sólidas e legíveis. Nunca sacrificar contraste ou acessibilidade.

### 4. Tipografia
Família semelhante à SF Pro (Display para títulos, Text para texto e componentes; SF Symbols como referência de ícones). Escala: títulos principais 28–36 px, títulos de seção 20–24 px, subtítulos 16–18 px, texto 14–16 px, auxiliares 12–13 px, adaptando ao contexto e ao aparelho.
Regras: sem textos grandes à toa; não pôr título em toda seção; não transformar componentes em blocos de texto; hierarquia por peso, não por cor; evitar caixa alta; texto auxiliar só quando necessário; bom espaço entre título, descrição e conteúdo. Informação objetiva, sem explicações redundantes nem frases decorativas.

### 5. Ícones e alinhamento
Linguagem dos SF Symbols: minimalistas, monocromáticos, traço consistente, equilibrados, com alinhamento óptico. Sem emojis, sem misturar bibliotecas, sem ícones coloridos aleatórios ou ilustrações genéricas.
Medidas: grid de 4 px; espaços preferenciais de 8, 12, 16, 24 e 32 px; ícones de navegação de 18 a 22 px; ícones de ações secundárias de 16 a 18 px; ícones centralizados nos botões; distância consistente entre ícone e rótulo; mesma linha de base e mesmos eixos em tudo.

### 6. Busca
Como nos apps Apple: arredondada, fundo neutro ou translúcido, lupa à esquerda, placeholder discreto, altura equilibrada, borda quase imperceptível, transição suave no foco, estado ativo claro e botão de limpar quando houver texto. Quando couber: sugestões ao digitar, resultados instantâneos, atalhos de teclado, estados vazios bem desenhados, histórico e filtros. Nada de buscas gigantes; integrada à navegação.

### 7. Botões e controles
- **Primários:** arredondados, azul do sistema, texto objetivo, peso equilibrado, altura consistente, sem sombras exageradas.
- **Secundários:** fundo neutro, bordas discretas, destaque só em hover, foco ou interação.
- **De ícone:** ícone centralizado, área de toque confortável, fundo transparente quando couber, feedback sutil.
- Evitar botões gigantes, gradientes, bordas pesadas, sombras artificiais, brilhos e excesso de cor.
- Todo botão tem estados de hover, focus, active, disabled e loading quando aplicável.

### 8. Navegação
Como nos apps macOS: sidebar refinada, ícones alinhados, rótulos curtos, grupos bem definidos, separadores discretos, seleção sutil, opção de recolher e cabeçalho integrado ao conteúdo. Não pode parecer menu administrativo. O conteúdo ocupa o espaço sem divisões desnecessárias.

### 9. Cards e superfícies
Não usar cards para tudo. Superfícies limpas, divisores finos quando necessário, informação relacionada agrupada, cards só quando há separação funcional, sem excesso de containers e sem sombra em tudo. Hierarquia por bordas e fundos. Cards com cantos arredondados, proporções equilibradas e espaçamento consistente.

### 10. Janelas, modais e popovers
Cantos arredondados, fundo sólido ou translúcido conforme o contexto, desfoque, sombra suave, hierarquia clara, espaçamento interno consistente, animação discreta e botão de fechar no lugar certo. Modal não ocupa a tela inteira sem necessidade. Popovers para ações rápidas, menus contextuais para opções secundárias, modais para o que exige atenção.

### 11. Animação
Fluida e discreta, como no macOS: feedback imediato, mudanças de estado suaves, menus e modais que entram e saem com naturalidade, hover com pequenas mudanças de opacidade e superfície, carregamentos elegantes. Transições de 150 a 300 ms. Nada exagerado, saltitante, com escala excessiva ou elasticidade gratuita. Respeitar a redução de movimento.

### 12. Responsividade
- **Computador:** sidebar persistente, bom uso do espaço, conteúdo centralizado quando couber, teclado e mouse eficientes.
- **Tablet:** sidebar adaptável, conteúdo reorganizado, proporções equilibradas, bom toque.
- **Celular:** navegação vertical, menus inferiores, botões para o dedo, busca acessível, modais adaptados, sem rolagem horizontal.
- Não apenas encolher o desktop: cada aparelho tem a sua experiência.

### 13. Precisão
Antes de finalizar uma tela: alinhamento dos ícones, espaçamentos, proporção dos botões, hierarquia tipográfica, contraste entre superfícies, cantos consistentes, posição dos textos, menus, animações e resoluções. Não aceitar desalinhamentos, alturas inconsistentes, textos quebrados sem motivo nem ícones de tamanhos diferentes em situações equivalentes. Precisão é requisito, não acabamento.

### 14. Implementação
Analisar a estrutura e a tecnologia, preservar funcionalidades, reaproveitar componentes, planejar e estabelecer tokens globais (cores, tipografia, espaçamento, bordas, sombras). Componentes reutilizáveis, variáveis CSS, sem estilos duplicados, sem bibliotecas de interface desnecessárias, sem trocar funcionalidades para simplificar e sem mexer em regras de negócio, banco, autenticação ou integrações sem necessidade.

### 15. Validação
Funcionar não basta. Revisar tela por tela: consistência, alinhamentos, tipografia, espaçamentos, responsividade, estados, interações, acessibilidade e ausência de elementos genéricos. Comparar com apps reais da Apple. O que parecer template administrativo é refeito; tela com informação demais é simplificada; elemento sem função é removido.

### 16. Diretriz final
O resultado deve transmitir o mesmo cuidado dos apps nativos da Apple: precisão dos alinhamentos, leveza das superfícies, elegância dos ícones, organização, simplicidade dos controles, naturalidade das animações e consistência. Não uma cópia superficial: a mesma filosofia de simplicidade, precisão e atenção aos detalhes. Qualidade acima de velocidade.

---

## Parte 2. Como isso vira código no Leve

### Decisões
- **Tema:** segue o aparelho (claro ou escuro), e a pessoa pode fixar um em Ajustes.
- **Destaque:** azul do sistema. Verde, vermelho e laranja só para sucesso, erro e alerta.
- **Navegação no celular:** 4 abas (Hoje, Líquidos, Progresso, Ajustes) numa barra de vidro, e um botão **+** flutuante para registrar comida. A aba Líquidos não usa o flutuante: tem o seu próprio **+** no centro, sob o corpo, com um botão de lista ao lado.
- **Navegação no computador:** sidebar de vidro, em grupos, que pode ser recolhida (a escolha fica guardada).
- **Landing:** usa o mesmo sistema.

### Tokens (`css/app.css`, `:root`)

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#F5F5F7` | `#161617` | fundo das telas |
| `--surface` | `#FFFFFF` | `#1C1C1E` | listas agrupadas, cartões, janelas |
| `--surface-2` | `#F2F2F7` | `#2C2C2E` | campos, busca, controles segmentados, botões secundários |
| `--ink` | `#1D1D1F` | `#F5F5F7` | texto principal |
| `--ink-2` | `#6E6E73` | `#98989D` | texto secundário |
| `--ink-3` | `#86868B` | `#636366` | terciário: placeholders, ícones de seta (só em texto grande ou não essencial) |
| `--line` | `#D2D2D7` | `#38383A` | divisórias e bordas de 1 px (0,5 px em telas retina) |
| `--accent` | `#0071E3` | `#0071E3` | preenchimento de botões primários, seleção, anel |
| `--accent-ink` | `#0071E3` | `#2997FF` | links, ícones e texto em azul |
| `--green` | `#34C759` | `#30D158` | interruptor ligado, marcas de concluído (preenchimento) |
| `--red` / `--red-ink` | `#FF3B30` / `#D70015` | `#FF453A` / `#FF6961` | erro e ações destrutivas (preenchimento / texto) |
| `--orange` / `--orange-ink` | `#FF9500` / `#C93400` | `#FF9F0A` / `#FFB340` | alertas (preenchimento / texto) |

**Desvio consciente (azul):** o azul do sistema `#007AFF` com texto branco dá 4,0:1, abaixo do AA. O preenchimento usa `#0071E3` (o azul da Apple na web, 4,6:1). No escuro, links e ícones azuis usam `#2997FF` (5,3:1 sobre `#1C1C1E`); `#0A84FF` daria 4,4:1.

**Desvio consciente:** o texto secundário no claro usa `#6E6E73` em vez de `#86868B`, porque `#86868B` sobre branco dá 3,5:1 e não passa no contraste AA para texto pequeno. `#86868B` fica como `--ink-3`, para texto grande ou não essencial.

### Tipografia
`-apple-system` / SF Pro primeiro, Inter como substituta. Pesos 400, 500, 600 e 700.

| Papel | Tamanho | Peso | Uso |
| --- | --- | --- | --- |
| Título grande | 34 px (celular), 32 px (computador) | 700 | topo de cada tela |
| Título de seção | 20–22 px | 600 | só onde separa conteúdo |
| Título de janela | 17 px | 600 | barra de navegação das janelas |
| Corpo | 17 px (celular), 15 px (computador) | 400 | linhas de lista |
| Subtítulo de linha | 15 px | 400 | detalhes em `--ink-2` |
| Rótulo de grupo | 13 px | 400 | acima das listas agrupadas, em `--ink-2`, sem caixa alta |
| Auxiliar | 12–13 px | 400 | notas de rodapé |

### Espaço e forma
- Grid de 4 px. Espaços de 8, 12, 16, 24 e 32 px.
- Margem lateral: 16 px no celular, 24 px no tablet, 32 px no computador.
- Linhas de lista com altura mínima de 44 px; divisória começa no texto, não na borda.
- Raios: lista agrupada e cartões 12 px; botões 12 px (grandes) e 8 px (pequenos); campos e busca 10 px; janelas 14 px (computador) e 12 px no topo (celular); pílulas só em etiquetas e no botão +.
- Sombras: só em janelas, popovers e no botão + (suaves e neutras). Conteúdo não tem sombra.

### Materiais
- `--glass`: fundo translúcido com `backdrop-filter: blur(20px) saturate(180%)` e borda de 0,5 px. Usado na barra de abas, no cabeçalho fixo, na sidebar, nos avisos (toasts) e no fundo das janelas.
- Conteúdo (listas, cartões, campos) é sempre sólido.

### Ícones
Conjunto próprio desenhado em `src/ui/dom.js` (`ICONS`), no espírito dos SF Symbols (os originais não são licenciados para a web): caixa de 24 px, traço de 1,75 px, cantos e pontas arredondados. Navegação a 22 px, ações a 17–18 px, sempre centralizados.

### Componentes
- **Lista agrupada** (`.group`): rótulo opcional acima, linhas com ícone opcional, título, valor à direita e seta.
- **Barra de navegação de janela**: Cancelar à esquerda, título no centro, ação principal à direita (como "Novo evento").
- **Busca** (`.search`): lupa, placeholder, botão de limpar, buscas recentes, atalho `/` no computador.
- **Botões**: `.btn.primary`, `.btn.secondary`, `.btn.plain`, `.btn.destructive`, `.icon-btn`; estados de hover, foco, ativo, desativado e carregando (`aria-busy`).
- **Interruptor**: como no iOS, verde quando ligado.
- **Controle segmentado**: como no iOS.
- **Condições de hoje** (`environment.js`): cartão com ícone do tempo, temperatura grande, condição, sensação e máxima/mínima; três métricas em blocos (umidade, UV, ar) que empilham quando o cartão é estreito; até dois selos de classificação com cor de tom (`data-tone`: ok, caution, warn, danger); uma frase do dia e a fonte com a hora. Os detalhes abrem numa janela de seções; os alertas chegam como um aviso de vidro no topo, que some sozinho.
- **Atividades** (`activity.js`): linha com ícone redondo do tipo, nome, horário e duração, e o selo do clima (Sem alerta, Com cuidado, Atenção, Desfavorável, Sem previsão, Local fechado). A janela de planejar tem fichas de tipo, dia e duração, controles de intensidade e local, e um quadro do clima previsto que muda ao vivo com o horário, tingido pelo tom do nível.
- **Foto de perfil** (`avatar.js`): círculo com a foto ou as iniciais sobre o azul claro, com um selo azul (+ para adicionar, lápis para trocar). Abre uma janela com a prévia grande, "Escolher foto", "Tirar foto" (só em telas de toque) e "Remover foto". A imagem é recortada no centro em quadrado e reduzida para 320 px (JPEG) antes de ser guardada.
- **Unidades** (`src/lib/units.js`): os dados ficam sempre em °C, kg, cm, km/h e mm. A pessoa escolhe em Ajustes > Unidades como ver e digitar: °C ou °F, kg ou lb, cm ou pés e polegadas, km/h ou mph, mm ou polegadas. Toda tela e todo texto de regra formata pelo módulo (`deg`, `temp`, `weight`, `height`, `speed`, `rain`); nada escreve a unidade à mão. As réguas do cadastro começam na unidade escolhida e guardam a troca. Líquidos seguem em ml e litros.
- **Atualização automática** (`update.js`): cada publicação grava `version.json` com a versão; o app confere ao voltar para a tela e a cada 5 minutos e, se mudou, recarrega sozinho quando não há janela aberta nem texto pela metade num campo. O número do cache do service worker também é trocado pela publicação.
- **Puxar para atualizar** (`pull.js`, só em telas de toque): com a tela no topo, arrastar para baixo traz um círculo de vidro com uma seta; passando do ponto, a seta vira para cima e fica azul, com um toque de vibração. Ao soltar, sincroniza e recarrega a página (com Face ID ligado, só sincroniza e redesenha, para não pedir o rosto de novo). Não age com uma janela ou menu aberto, nem começando em campos, réguas ou fileiras que rolam de lado. O gesto nativo do navegador fica desligado para não haver dois.
- **Seletor** (`picker` em `dom.js`, `.picker`): substitui o `<select>` nativo em todo o app, porque a lista aberta do sistema não segue o visual. É um botão com o valor e a seta dupla; no computador abre um menu de vidro arredondado preso ao botão (rola por dentro se não couber na janela), e em telas de toque abre uma janela de baixo com a lista. O item atual leva a marca azul. Não usar `<select>` em telas novas.
- **Aviso (toast)**: cápsula de vidro com ação opcional.
- **Perguntas do cadastro** (`onboarding.js`): progresso em traços, título e texto centralizados, opções em cartões (`.opt`: ícone, título, descrição e marca de seleção; escolher não avança), régua deslizante para peso e altura (`.ruler`, com setas do teclado e arraste do mouse; peso em kg ou lb) e botão "Continuar" em cápsula no rodapé.
- **Popover e menu** (`openPopover` em `dom.js`, `.popover`, `.menu`): painel de vidro preso ao botão que o abriu, com entrada em escala. Fecha ao tocar fora, com Esc, ao rolar ou redimensionar, e devolve o foco. Menus navegam com as setas.
- **Pastilha de bebida** (`drinkBadge`): círculo na cor da bebida com o ícone em branco. A cor de cada bebida é a mesma no corpo, nos copos e nas listas (`DRINKS` em `hydration.js`).
- **Corpo** (`bodyFigure` em `body.js`, arte em `img/body/`): ilustrações fornecidas pelo produto, uma feminina (camiseta, shorts e tênis, braços soltos) e uma masculina (camiseta, calça e tênis, braços soltos), em traço azul-marinho e sem rosto. Cada figura é um par de imagens: os traços com fundo transparente (`*-lines.webp`) e a máscara do corpo (`*-mask.webp`), extraída do próprio desenho. A máscara tem fundo transparente e é aplicada por CSS (`mask-image`, modo alpha), não por `<mask>` do SVG, que o Safari não carrega com imagem dentro. O corpo e o líquido são um SVG recortado por essa máscara; os traços são um `<img>` por cima. Os quatro arquivos entram no cache do service worker. Sobe em 1,1 s ao registrar; depois só a superfície ondula, devagar; bolhas nas bebidas com gás. Cheia ao bater a meta, sem passar dela. É uma representação da meta, não uma medida do corpo.
- **Linha de pessoa** (`friends.js`): figura pequena (`miniFigure`, cheia até a porcentagem do dia, numa cor só), nome, ml e %, barra e, na tela de compartilhamento, quanto falta e o botão em cápsula "Cutucar" ou "Aplaudir". O lugar vazio "Seu amigo aqui" leva um círculo com + e "Convidar".
- **Copos da semana** (`cupFigure`): um copo por dia, com as mesmas camadas; o contorno fica verde no dia que bateu a meta. Tocar abre um popover com o detalhe.
- **Teclado numérico** (`.keypad`): só em telas de toque, na janela de bebida, para não abrir o teclado do sistema por cima da janela.

### Movimento
Curva padrão `cubic-bezier(.25, .1, .25, 1)` a 200 ms; janelas a 280 ms com `cubic-bezier(.32, .72, 0, 1)`. O anel mantém a mola. `prefers-reduced-motion` desliga transições e animações.
