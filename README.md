# Leve

Diário de calorias e peso em português do Brasil, feito para uma pessoa só. É um PWA: instala no iPhone, no Android e no computador, funciona sem internet e guarda tudo apenas no aparelho. Não tem login nem servidor.

> O Leve não substitui médico ou nutricionista. As metas são estimativas baseadas em fórmulas populacionais.

## O que ele faz

- **Registro por frase.** Escreva "2 ovos mexidos e um pão francês"; o app separa itens, quantidades e calorias e mostra tudo para você confirmar antes de salvar.
- **Gasto adaptativo.** Com 14 dias ou mais de registros e pesagens, calcula o seu gasto real e propõe uma nova meta. Você aceita ou recusa.
- **Aba Líquidos.** Água, café, chá, suco, leite e outras bebidas, com tamanhos rápidos, lista do dia, semana e meta diária. Bebida alcoólica fica registrada, mas não conta para a meta.
- **Trocas mais leves.** Ao abrir um alimento, depois de registrar e no cartão "Trocas para a próxima vez" em Hoje, o app mostra opções com menos calorias e o motivo (suco de uva → água ou refrigerante zero, batata frita → batata cozida, picanha → patinho ou frango). As calorias das alternativas vêm da TACO, na mesma quantidade. Dá para desligar em Ajustes.
- **Peso tendência.** Média móvel exponencial que esconde a oscilação diária de água.
- **Data de chegada** com o controle "e se eu comer 200 kcal a menos?".
- **Orçamento semanal.** O excesso de um dia é diluído nos dias seguintes, sem passar do piso calórico.
- **O que cabe?** Sugestões que cabem nas calorias restantes do dia.
- **Código de barras** com busca no Open Food Facts e cache local.
- **Travas de segurança.** Nunca abaixo de 1.200 kcal (mulheres) ou 1.500 kcal (homens), déficit máximo de 25% do gasto, peso-alvo só dentro do IMC 18,5 a 24,9, e nenhum plano de déficit para menores de 18 anos.

## Como rodar

Precisa só do Node 20 ou mais novo. Não há dependências para instalar.

```bash
npm start        # abre em http://localhost:5173
npm test         # roda os testes dos cálculos, do parser e da busca
```

Qualquer servidor de arquivos estáticos também serve (por exemplo `python3 -m http.server`). Abrir o `index.html` direto do disco não funciona, porque o navegador bloqueia módulos em `file://`.

## Como publicar no GitHub Pages

1. Suba este projeto para um repositório no GitHub, na branch `main`.
2. No repositório, abra **Settings > Pages** e, em **Source**, escolha **GitHub Actions**.
3. A cada push na `main`, o workflow `.github/workflows/pages.yml` roda os testes e publica. O endereço aparece na aba **Actions** e em **Settings > Pages**.

Ao publicar uma mudança, aumente `VERSION` no `sw.js` (de `leve-v1` para `leve-v2`, e assim por diante). É isso que faz os aparelhos baixarem os arquivos novos.

## Como instalar no celular

- **iPhone (Safari):** abra o endereço do app, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
- **Android (Chrome):** abra o endereço, toque no menu de três pontos e em **Instalar app** (ou **Adicionar à tela inicial**).
- **Computador (Chrome ou Edge):** clique no ícone de instalar na barra de endereço.

Depois da primeira abertura com internet, o app funciona offline. Só a busca de produtos novos por código de barras precisa de conexão.

## Seus dados

Tudo fica no IndexedDB do navegador, neste aparelho. Cada aparelho tem os seus dados. Para fazer backup ou trocar de aparelho, use **Ajustes > Exportar JSON** e **Importar JSON**. Limpar os dados do navegador ou desinstalar o app apaga os registros, então exporte um backup de vez em quando.

## Estrutura

```
index.html, sw.js, manifest.webmanifest
css/app.css            tokens de design e estilos
data/taco.json         tabela TACO compacta (591 alimentos)
src/lib/               funções puras, todas com testes
  calc.js              TMB, gasto, faixa saudável, meta, travas, macros
  trend.js             peso tendência
  budget.js            orçamento semanal
  adaptive.js          gasto adaptativo
  parser.js            frase livre
  search.js            busca aproximada
  portions.js          medidas caseiras
  hydration.js         tipos de bebida e somas de líquidos
  swaps.js             trocas mais leves e o motivo de cada uma
src/store.js, src/db.js   estado e IndexedDB
src/ui/                telas e componentes
tests/                 node --test
```

## Diferenças em relação ao plano original

O plano pedia Vite, React, TypeScript, Tailwind, Dexie, Motion, vite-plugin-pwa e Vitest. O ambiente onde o app foi construído não tinha acesso ao npm, então ele foi escrito sem etapa de build:

| Plano | Como ficou |
| --- | --- |
| Vite + React + TypeScript | Módulos ES em JavaScript puro, sem build |
| Tailwind | CSS próprio com tokens em variáveis |
| Motion | Molas em canvas (anel) e transições CSS |
| Dexie | IndexedDB nativo (`src/db.js`) |
| vite-plugin-pwa | `sw.js` e `manifest.webmanifest` escritos à mão |
| Vitest | `node --test` |
| Skill Impeccable | Não usada; as decisões estão em `PRODUCT.md` e `DESIGN.md` |

## O que ainda não foi testado em aparelho real

- **Leitor de código de barras pela câmera.** O fluxo foi escrito com `BarcodeDetector` e, onde ele não existe (Safari no iPhone, Firefox), carrega a biblioteca `barcode-detector` do jsDelivr na primeira vez. Isso não pôde ser testado no ambiente de construção. Digitar os números do código sempre funciona.
- **Consulta ao Open Food Facts.** Escrita conforme a API v2 pública, sem teste contra o serviço real.
- **Instalação no iPhone e no Android**, vibração e safe areas.

## Limites conhecidos

- A TACO traz valores por 100 g. As medidas caseiras (unidade, fatia, colher, concha, copo) são estimativas de porção, sempre marcadas com "≈" e editáveis. Para precisão, registre em gramas.
- A TACO não tem todos os alimentos (por exemplo, não traz calorias para leite integral líquido). O que faltar pode ser cadastrado em **Alimento manual** ou lido pelo código de barras.
- O "lembrete de peso" é um cartão na tela Hoje, não uma notificação do sistema. Notificações agendadas exigiriam um servidor.

## Fontes e licenças

- **Tabela Brasileira de Composição de Alimentos (TACO)**, 4ª edição revisada e ampliada. NEPA/UNICAMP, Campinas, 2011. A publicação permite reprodução total ou parcial desde que citada a fonte.
- Versão em JSON: [marcelosanto/tabela_taco](https://github.com/marcelosanto/tabela_taco) (licença MIT, © 2023 Marcelo Santos). `scripts/build-taco.mjs` só seleciona campos e arredonda a uma casa decimal; nenhum valor é alterado. Seis alimentos sem valor de energia na tabela ficaram de fora.
- **Open Food Facts**: dados sob a licença Open Database License (ODbL).
- Fórmulas: Mifflin-St Jeor (1990) para o metabolismo basal; faixa saudável pelo IMC de 18,5 a 24,9 (OMS).
