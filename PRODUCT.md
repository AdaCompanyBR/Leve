# Leve: decisões de produto

## Para quem
Uma pessoa só, adulta, que quer emagrecer sem se punir. Usa o celular na cozinha e na mesa, e o computador de vez em quando. Não é obrigada a criar conta: sem conta, tudo fica no aparelho. Com conta, usa o mesmo diário no celular e no computador.

## O trabalho do app
Responder, em poucos segundos, três perguntas: quanto ainda posso comer hoje, estou indo na direção certa, e quando chego.

## Telas
1. **Hoje.** Anel de calorias, macros, refeições, água, "O que cabe?". Setas levam a dias anteriores.
2. **Registrar.** Um campo só. Com número ou mais de um item, vira frase; sem isso, é busca. Abaixo: recentes, favoritos e modelos.
3. **Líquidos.** O corpo enche com as bebidas do dia, em camadas coloridas na ordem em que foram tomadas; total, meta, porcentagem e quanto falta. Menu do + com atalhos aprendidos, outra bebida (valor exato, tipo, data, horário) e registro por voz; tamanhos rápidos; registros editáveis com apagar e desfazer; semana em copos com detalhe por dia e resumo (média, total, dias na meta, maior consumo); meta diária com sugestão (35 ml por kg, mais rotina e clima). Mudar a meta vale a partir de hoje: os dias anteriores mantêm a meta que tinham.
4. **Progresso.** Peso real e tendência, projeção, "e se", saldo da semana, gasto adaptativo, pesagens.
5. **Ajustes.** Plano, dados, meta, tema, backup, aviso de saúde.

O onboarding faz uma pergunta por tela e termina na revelação do plano.

## Princípios
- **Confirmar antes de salvar.** A frase livre nunca grava direto.
- **Nunca inventar número.** Valor nutricional vem da TACO, do Open Food Facts ou do que a pessoa digitou. Porção estimada aparece com "≈".
- **Tom neutro.** Passar da meta não muda a cor, não mostra alerta e não zera sequência. O texto explica o que acontece depois.
- **Segurança antes do ritmo.** As travas valem em todo lugar onde uma meta é calculada, inclusive no "e se" e no gasto adaptativo.
- **O app propõe, a pessoa decide.** A meta só muda com aceite.

## Regras que merecem registro
- O peso usado no cálculo do gasto é o da última pesagem.
- Dia passado sem registro conta como "na meta" no orçamento semanal: não gera crédito nem débito.
- Comer menos que a meta não vira crédito para os dias seguintes; só o excesso é redistribuído.
- O gasto adaptativo exige 14 dias entre a primeira e a última pesagem da janela, pelo menos 4 pesagens e registros em 70% dos dias. Só propõe mudança se a diferença for de 5% ou mais.
- Na aba Líquidos entra só o volume. Calorias de bebidas (suco, leite, refrigerante, álcool) se registram no diário, com valores da TACO; o atalho leva à busca. Bebida alcoólica não conta para a meta de líquidos.
- Estimativas: receitas típicas somam ingredientes da TACO em quantidades de um preparo comum e mostram a conta; a média online usa a mediana de pelo menos 3 produtos do Open Food Facts cujo nome bate com o pedido, primeiro do Brasil. As duas aparecem como "Estimativa" e com "≈", nunca como valor exato.
- Trocas mais leves: só aparecem quando a alternativa economiza pelo menos 15% e 15 kcal na mesma quantidade. Os números vêm da TACO; água é zero e refrigerante zero aparece como "quase sem calorias", sem número. O texto explica o motivo, sem culpa, e a sugestão vale "para a próxima vez": nada é trocado sem a pessoa registrar. Desliga em Ajustes.
- Conta: e-mail e senha (mínimo 8 caracteres) no Supabase; Face ID ou digital é opcional e vale por aparelho. Sincronização registro a registro, vale a mudança mais recente; o primeiro login num aparelho dá preferência ao que já está na nuvem. O app nunca exige internet para registrar.
- Objetivos: perder (déficit pelo ritmo, travas de sempre), ganhar massa (superávit de 200, 350 ou 500 kcal, até 15% do gasto; com IMC 27 ou mais fica no gasto), definir (10% abaixo do gasto, sem corte com IMC abaixo de 18,5), manter e comer melhor (no gasto). Proteína por kg: 1,6 perder, 1,8 ganhar, 2,0 definir, 1,2 manter e comer melhor, sobre o peso atual limitado ao topo da faixa saudável. Perfis antigos sem objetivo continuam como "perder" e veem um convite para escolher.
- Rotina: refeições com horário a partir da hora de acordar (almoço entre 11h30 e 13h30, jantar entre 18h30 e 21h30, pelo menos 2 h entre refeições), divididas em partes fixas das calorias e da proteína do dia. Hábitos vêm de recomendações públicas (OMS, Guia Alimentar, sono de 7 horas) e o app marca sozinho o que dá para medir. Para quem quer ganhar massa, as trocas mais leves ficam desligadas e o saldo da semana não se aplica.
- Para menores de 18 anos o app não mostra faixa de IMC adulta, peso sugerido, meta calórica nem projeção.
