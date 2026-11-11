# Leve

Diário de calorias e peso em português do Brasil, feito para uma pessoa só. É um PWA: instala no iPhone, no Android e no computador e funciona sem internet. Sem conta, guarda tudo só no aparelho; com conta (opcional, via Supabase), sincroniza entre aparelhos e entra com Face ID ou digital.

> O Leve não substitui médico ou nutricionista. As metas são estimativas baseadas em fórmulas populacionais.

## O que ele faz

- **Registro por frase.** Escreva "2 ovos mexidos e um pão francês"; o app separa itens, quantidades e calorias e mostra tudo para você confirmar antes de salvar.
- **Gasto adaptativo.** Com 14 dias ou mais de registros e pesagens, calcula o seu gasto real e propõe uma nova meta. Você aceita ou recusa.
- **Aba Líquidos.** Água, café, chá, suco, leite e outras bebidas. Registro com o valor exato em ml ou litros ("473", "1,25 L"), tipo, nome opcional, data e horário; tamanhos rápidos para o dia a dia; toque num registro para corrigir. Lista do dia, semana e meta diária. Bebida alcoólica fica registrada, mas não conta para a meta.
- **Trocas mais leves.** Ao abrir um alimento, depois de registrar e no cartão "Trocas para a próxima vez" em Hoje, o app mostra opções com menos calorias e o motivo (suco de uva → água ou refrigerante zero, batata frita → batata cozida, picanha → patinho ou frango). As calorias das alternativas vêm da TACO, na mesma quantidade. Dá para desligar em Ajustes.
- **Peso tendência.** Média móvel exponencial que esconde a oscilação diária de água.
- **Data de chegada** com o controle "e se eu comer 200 kcal a menos?".
- **Orçamento semanal.** O excesso de um dia é diluído nos dias seguintes, sem passar do piso calórico.
- **O que cabe?** Sugestões que cabem nas calorias restantes do dia.
- **Estimativa para o que não tem código de barras.** Pratos comuns que a TACO não traz prontos (sanduíche natural, misto quente, pizza, lasanha, prato feito, açaí, tapioca, sushi e outros) entram como receitas típicas, com calorias somadas dos ingredientes da TACO e a conta à mostra. Para o resto, "Estimar calorias" calcula a média (mediana) de produtos parecidos no Open Food Facts. Tudo marcado como estimativa e editável.
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

Sem conta, tudo fica no IndexedDB do navegador, só neste aparelho. Para backup ou para trocar de aparelho, use **Ajustes > Exportar JSON** e **Importar JSON**.

Com conta (veja abaixo), os dados ficam neste aparelho **e** na nuvem da sua conta, e aparecem em qualquer aparelho em que você entrar. O app continua funcionando sem internet: as mudanças esperam numa fila e sobem quando a conexão volta. Se o mesmo registro mudar em dois aparelhos, vale a mudança mais recente.

## Conta e sincronização (Supabase)

O login usa o [Supabase](https://supabase.com) (plano gratuito): ele guarda as senhas com segurança e cada conta só enxerga os próprios dados (Row Level Security). Enquanto `src/config.js` estiver vazio, o app funciona como antes, sem login.

1. Crie uma conta em supabase.com e um projeto novo (região São Paulo, `sa-east-1`, fica mais perto).
2. Em **SQL Editor > New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication > URL Configuration**, coloque em **Site URL** o endereço do app (`https://adacompanybr.github.io/Leve/`) e adicione o mesmo endereço em **Redirect URLs**. É para onde voltam os links de confirmação e de troca de senha.
4. Em **Authentication > Sign In / Providers > Email**: deixe **Confirm email** ligado se quiser que a conta só funcione depois de clicar no link do e-mail, ou desligue para entrar na hora.
5. Em **Project Settings > API**, copie **Project URL** e a chave **anon public** para `src/config.js` e publique (push na `main`). A chave anon é pública por natureza; quem protege os dados são as regras do passo 2.

### Entrar com Face ID ou digital

Depois do primeiro login num aparelho, o app oferece **Entrar com Face ID ou digital** (também em **Ajustes > Conta**). Usa o padrão WebAuthn, o mesmo das passkeys:

- **iPhone com iOS 18 ou mais novo, Chrome no Android e no computador:** a sessão da conta fica cifrada com uma chave que só é liberada pelo rosto ou pela digital.
- **Aparelhos sem a extensão PRF:** o Face ID funciona como trava da tela do app, e a sessão fica guardada sem cifra.
- Em qualquer caso, os dados já baixados ficam no armazenamento do navegador deste aparelho, como antes. O Face ID protege a abertura do app e o acesso à conta, não substitui o bloqueio do celular.
- Se o Face ID falhar, **Usar e-mail e senha** sempre funciona.

### Primeiro login num aparelho que já tinha dados

O que já existia no aparelho é juntado com a nuvem. Se os dois tiverem o mesmo registro (por exemplo, o perfil), vale o da nuvem; o que só existia no aparelho sobe. Num celular novo, use **Já tenho conta** na primeira tela em vez de responder o cadastro.

### Sair

**Ajustes > Conta > Sair** pergunta se os dados devem ser apagados deste aparelho (recomendado em aparelho compartilhado) ou mantidos. Os dados continuam na nuvem. **Apagar tudo**, com a conta conectada, apaga também da nuvem.

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
  recipes.js           receitas típicas calculadas com a TACO
  estimate.js          média de produtos parecidos (Open Food Facts)
src/store.js, src/db.js   estado e IndexedDB
src/auth.js, src/sync.js  conta (Supabase Auth) e sincronização
src/biometric.js       Face ID / digital (WebAuthn)
src/config.js          endereço e chave do Supabase
supabase/schema.sql    tabela e regras da nuvem
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
- **Consulta ao Open Food Facts** (código de barras e média de produtos parecidos). Escrita conforme a API pública, testada com respostas simuladas, sem teste contra o serviço real.
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
