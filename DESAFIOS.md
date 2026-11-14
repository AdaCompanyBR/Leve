# Desafios e conquistas

A aba Progresso tem três seções: **Desafios**, **Conquistas** e **Indicadores** (peso, saldo da semana e gasto, como antes). Os desafios incentivam hábitos e medem o progresso com os registros que o app já tem, sem pedir que nada seja marcado em dobro.

## Arquitetura

| Parte | Arquivo | Papel |
|---|---|---|
| Regras | `src/lib/challenges.js` | Catálogo, critério de cada dia, avaliação, ajuste adaptativo, recomendações, campanhas e conquistas. Sem rede, testável (`tests/challenges.test.js`). |
| Telas | `src/ui/challenges.js` | Lista com filtros, recomendações, campanha, página do desafio (Sobre, Dicas, Progresso), início, registro rápido, pausa, encerramento, conquistas e avisos. |
| Ilustrações | `src/ui/challengeArt.js` | Uma cena em vetor para cada desafio, as medalhas e os ícones dos benefícios. |
| Dados | `src/store.js` | `challenges`, `checkins` e `achievements`, guardados nos dados do app e sincronizados com a conta. |

## Dados

Os dados vão para a mesma tabela de sincronização do app, onde cada pessoa só lê e grava os próprios registros (RLS).

- **`challenges`:** lista dos desafios da pessoa, com `id`, `challengeId`, `target` (a meta escolhida, guardada no início), `startDate`, `expectedEnd`, `endDate`, `status` (`ativo`, `pausado`, `concluido` ou `abandonado`), `pauses` (períodos em pausa) e `final`. O `final` é o resumo do progresso e dos dias, guardado ao concluir ou encerrar, para o histórico continuar disponível.
- **`checkins`:** um registro rápido por data, só do que o app não mede sozinho: horário de dormir e acordar, tempo sem telas, pausas ativas, saciedade e como o corpo está.
- **`achievements`:** id da conquista e a data em que foi desbloqueada.

O progresso diário não é guardado: é recalculado dos registros originais (líquidos, diário de comida, atividades e o registro rápido). Assim não há duplicidade, e corrigir um registro corrige o desafio.

## Catálogo e critérios

Os dias não precisam ser seguidos e perder um dia não zera nada. Um desafio só termina quando o critério é cumprido, nunca só porque o prazo passou. Os dias em pausa não contam.

| Desafio | Dias | Um dia conta quando | Fonte |
|---|---|---|---|
| Hábito de hidratação | 21 | os líquidos atingem a meta individual do dia (ou 80%, se escolhido) | aba Líquidos |
| Água pura | 7 | há algum registro de água ou água com gás | aba Líquidos |
| Hidratação consciente | 14 | há bebidas registradas de manhã, à tarde e à noite | horários da aba Líquidos |
| Prato colorido | 7 | há 2 verduras ou legumes diferentes | grupos da TACO no diário |
| Semana das frutas | 7 | há 1 fruta fresca (sem sucos, doces ou calda) | grupos da TACO no diário |
| Mais fibras | 14 | as fibras chegam a 14 g por 1.000 kcal da meta de calorias | fibras da TACO |
| Alimentação consciente | 7 | há 3 refeições registradas e a pergunta de saciedade respondida | diário e registro rápido |
| Variedade no prato | 21 | há alimentos de 4 grupos | grupos da TACO |
| Movimento diário | 7 | os minutos de atividade feita chegam à meta escolhida (10 a 30 min) | atividades |
| Caminhada consciente | 14 | concluído ao somar os minutos de caminhada escolhidos (90 a 300) | atividades |
| Corpo em movimento | 21 | há atividade feita; conclui com os dias escolhidos (9, 12 ou 15) e 2 tipos de atividade | atividades |
| Pausas ativas | 7 | o número de pausas escolhido (2 a 5) | registro rápido |
| Rotina de sono | 14 | dormir e acordar a até 45 minutos dos horários escolhidos | registro rápido |
| Desconecte-se | 7 | o tempo sem telas antes de dormir chega à meta | registro rápido |
| Recuperação consciente | 7 | o registro de como o corpo está, sem atividade intensa nos dias de cansaço ou dor | registro rápido e atividades |

Cada benefício é um par `[ícone, texto]`, mostrado com o ícone na cor da categoria. Os textos são cautelosos ("ajuda a", "incentiva") e nunca prometem resultado médico.

"Desconecte-se" está em Bem-estar, para que essa categoria tenha um desafio. O app ainda não lê passos, sono ou pausas de outros apps, por isso esses desafios usam o registro rápido de um toque.

## Segurança

- O aviso completo aparece antes de começar, e só dá para começar depois de confirmar estar apto e ter orientação profissional quando necessário. O aviso também está na página de cada desafio e em "Leia o aviso completo".
- Nenhum desafio propõe dieta restritiva, jejum, perda de peso, suplemento, água acima da meta ou exercício acima da capacidade.
- As metas são individuais: a meta de líquidos da pessoa, minutos escolhidos por ela, fibras proporcionais à meta de calorias e horários escolhidos.
- Com "Orientação médica para limitar líquidos" ligada, os desafios que usam a meta de líquidos não podem ser iniciados. "Mais fibras" não aparece para quem não tem meta de calorias.
- "Senti desconforto ou dor", e a resposta "Com dor" no registro rápido, mostram a orientação de parar e procurar um profissional (192 em urgência).
- Dá para pausar, retomar e encerrar a qualquer momento; o histórico fica.

## Personalização

- **Recomendações:** saem só dos registros dos últimos 14 dias:
  - líquidos em 3 dias ou mais sugerem "Hábito de hidratação", ou "Hidratação consciente" para quem já bate a meta;
  - refeições sugerem "Prato colorido" ou "Variedade no prato";
  - atividades sugerem "Movimento diário" ou "Corpo em movimento".
  Cada recomendação diz o motivo. Sem dados, não aparece nenhuma recomendação. Desafios bloqueados pela saúde não são recomendados.
- **Ajuste adaptativo:** depois de 7 dias com menos de 40% dos dias cumpridos, o app oferece a meta imediatamente mais leve, nunca uma mais exigente. A pessoa decide se aceita.
- **Campanhas da época:**
  - Semana da Hidratação, de 15 a 21 de janeiro e de 1 a 7 de dezembro;
  - Mês do Movimento, em abril, com o Dia Mundial da Atividade Física em 6 de abril;
  - Semana da Alimentação Consciente, de 13 a 19 de outubro, em torno do Dia Mundial da Alimentação.
  Fora delas, aparece a próxima.

## Ofensiva

Dias seguidos de rotina saudável (`src/lib/streak.js`, ligada aos registros em `src/evolution.js`). A validação é automática e a pessoa não escolhe o critério.

### O que valida o dia

Basta UM destes critérios, cumprido por inteiro. Parcial não vale.

| Critério | Regra |
|---|---|
| Hidratação | 100% da meta individual de líquidos do dia (a mesma da aba Líquidos). Com "Orientação médica para limitar líquidos" ligada, não se aplica: o app nunca empurra a beber mais. |
| Alimentação | Todas as refeições previstas na rotina do dia (3 a 6, conforme o perfil) com pelo menos um item registrado. Uma refeição isolada não vale. Não exige alimento específico nem restrição. |
| Atividade física | 30 minutos de atividades feitas no dia, a meta diária da rotina (150 min por semana, da OMS). Só contam atividades de 10 minutos ou mais. |

### Integridade

- **Prazo de registro:** valem os registros feitos até o fim do dia seguinte. Não há recuperação de dias antigos.
  - Bebidas: conta a hora em que foram registradas (`createdAt`).
  - Itens do diário: conta o `ts`.
  - Atividades: conta o `updatedAt`.
- **Sem duplicidade:** a mesma bebida no mesmo minuto, ou a mesma atividade no mesmo horário, conta uma vez. Cada data conta uma vez.
- **Dias congelados:** passado o prazo, cada dia validado fica guardado em `kv 'evolution'.validated`, com o critério que validou e os cumpridos, e sincroniza com a conta. Mudar a meta ou apagar um registro depois não muda o passado.
- **Descanso:** a mudança dos dias de descanso vale de hoje em diante (`restHistory`).
- **Datas:** as datas são locais, do aparelho. Dias futuros nunca entram. O dia de hoje fica "em aberto" até acabar.
- **Onde a validação roda:** neste app, no aparelho, a partir dos registros sincronizados. As regras são funções puras, sem rede, prontas para rodar também no servidor.

### Descanso, pausa e proteção

- Até 3 dias de descanso por semana.
- Pausas a partir de hoje, de 3, 7 ou 14 dias, com no máximo 14 dias de pausa a cada 60.
- 1 proteção a cada 7 dias seguidos, no máximo 2. Ela cobre um dia sem validação.

### Na tela

- **Chama própria:** em azul, com um leve tremular. Fica mais fraca quando a ofensiva está viva mas o dia ainda está em aberto, e cinza quando está zerada.
- **Evolução pelos marcos:**
  - 7 dias ou mais: ganha halo;
  - 30 ou mais: halo e aro;
  - 100 ou mais: núcleo âmbar.
- **Painel "Hoje":** cada critério mostra o progresso ("1,5 de 2,0 L · 75%", "3 de 4 refeições", "20 de 30 min") e o estado: Pendente, Cumprida, Validou o dia ou Não se aplica. Embaixo, o resultado ("ofensiva mantida com Alimentação") ou o que falta no critério mais perto.
- **Comemoração:** uma vez por dia, quando a ofensiva é mantida. A chama cresce e ondas suaves saem dela.
- **Calendário, recordes e proteções:** como antes.

### Marcos

3, 7, 15, 30, 60 e 100 dias seguidos. Cada um tem medalha e XP:

| Marco | XP |
|---|---|
| 3 dias | 20 |
| 7 dias | 50 |
| 15 dias | 100 |
| 30 dias (bronze) | 200 |
| 60 dias (prata) | 400 |
| 100 dias (ouro) | 700 |

## Experiência e níveis

A XP (`src/lib/xp.js`) é recalculada dos registros, então nada vale duas vezes e abrir o app não conta.

| Ação | XP |
|---|---|
| Dia validado da ofensiva | +10 por data |
| Cada critério cumprido por inteiro no dia (hidratação, alimentação, atividade) | +5 cada |
| Desafio concluído | +50 por desafio iniciado |
| Conquista desbloqueada | +25 (os marcos da ofensiva, de 20 a 700) |

Níveis: Semente (0), Broto (100), Muda (250), Raiz (450), Caule (700), Folhagem (1.000), Flor (1.400), Árvore (1.900), Bosque (2.500) e Floresta (3.200). Depois, cada nível pede mais 800 XP.

## Conquistas

São vinte e uma, todas por critério cumprido, nunca por começar. Cada uma tem andamento ("10 de 14") e a data em que foi desbloqueada.

- **Ofensiva:**
  - marcos: Primeiro dia, Três dias, Uma semana, Quinze dias, Um mês (bronze), Dois meses (prata) e Cem dias seguidos (ouro);
  - outras: Semanas em ritmo, Superação (bronze), Recordista (prata) e 100 dias ativos.
  - Superação: 7 dias seguidos depois de uma interrupção.
  - Recordista: passar a maior ofensiva anterior, desde que ela tivesse pelo menos 3 dias.
- **Desafios:** Primeiros passos, Persistência, Disciplina, Consistência, Hidratação em dia, Alimentação consciente, Corpo ativo, Bom descanso, Equilíbrio e Colecionador (prata).

## Avisos

Os avisos aparecem no app e são positivos:
- "Você está evoluindo! Mais um dia concluído.";
- "Está quase completo. Continue respeitando o seu ritmo." (a partir de 80%);
- conclusão e nova conquista;
- um convite gentil para retomar um desafio pausado há 3 dias, no máximo a cada 3 dias.

Dá para desligar em Ajustes > Preferências > Avisos dos desafios.
