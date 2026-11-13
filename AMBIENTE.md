# Inteligência ambiental

O Leve usa o clima, o índice UV e a qualidade do ar da região da pessoa para dar contexto às orientações do dia. Este documento descreve o que foi feito, de onde vêm os dados e quais regras são usadas.

## Arquitetura

| Parte | Arquivo | Papel |
|---|---|---|
| Regras | `src/lib/environment.js` | Lê as respostas da Open-Meteo e calcula classificação do dia, alertas, melhores horários, índice UV, qualidade do ar e orientação de hidratação. Sem rede, testável (`tests/environment.test.js`). |
| Serviço central | `src/env.js` | Localização, consulta às APIs, cache, atualização e disparo de alertas. Todas as telas leem `env.ctx`; nenhuma consulta a API por conta própria. |
| Telas | `src/ui/environment.js` | Cartão "Hoje em sua região" (aba Hoje), detalhes do dia, escolha da localização, orientação na aba Líquidos e o aviso de alerta. |
| Endereços | `src/config.js` (`WEATHER`) | Endereços da previsão, da qualidade do ar, da busca de cidades e do nome da cidade pelas coordenadas. |
| Atividades | `src/lib/activity.js`, `src/ui/activity.js` | Avalia o horário de uma atividade com a previsão daquelas horas; cartão "Atividades" na aba Hoje, janela de planejar e orientações depois do treino. |
| Alimentação | `src/lib/foodContext.js` | Sugestões pelo clima e pelas atividades do dia, mostradas na aba Registrar (`src/ui/insights.js`). |
| Histórico | `src/lib/envHistory.js` | Resumo diário do clima e análises dos hábitos, no cartão "Clima e hábitos" da aba Progresso. |

Fluxo: ao abrir o app, ao voltar para ele e a cada 15 minutos com ele aberto, `env.js` confere o cache. A previsão é renovada depois de 30 minutos e a qualidade do ar depois de 60. Os pedidos simultâneos viram um só. Sem internet ou com a API fora, a tela mostra a última previsão salva, com a hora e o aviso "desatualizada" depois de 3 horas.

## APIs (Open-Meteo)

- Previsão: `api.open-meteo.com/v1/forecast` com `current`, `hourly` e `daily` (temperatura, sensação térmica, umidade, chuva e probabilidade, código do tempo, índice UV, vento e rajadas, nascer e pôr do sol), `timezone=auto`, 7 dias e o dia anterior.
- Qualidade do ar: `air-quality-api.open-meteo.com/v1/air-quality` com AQI dos EUA, PM2,5, PM10, ozônio, NO₂, SO₂ e CO.
- Cidades: `geocoding-api.open-meteo.com/v1/search` em português.

Os dados são da Open-Meteo.com, sob a licença CC BY 4.0; a atribuição aparece na tela de detalhes. **A versão gratuita é só para uso não comercial.** Para uso comercial, troque os endereços em `src/config.js` pelos de um servidor intermediário (por exemplo, uma função do Supabase) que guarde a chave da versão paga. A chave nunca deve ficar no app.

A qualidade do ar vem do modelo CAMS (Copernicus), com resolução de cerca de 45 km fora da Europa. Ela pode não refletir a rua da pessoa nem as estações locais, e a tela diz isso.

## Localização e LGPD

- **A localização do aparelho é a fonte principal.** O pedido de acesso aparece uma única vez em cada aparelho, na primeira abertura do app depois do cadastro, sem a pessoa precisar tocar em nada. O estado do pedido fica no próprio aparelho (`leve-geo`), porque a permissão é do aparelho, não da conta.
- **Depois do pedido,** o app relê a posição sozinho, sem perguntar: ao abrir, ao voltar para o app e a cada 15 minutos com ele aberto. Faz isso só enquanto o navegador mantiver a permissão. Se a pessoa mudou de cidade, a previsão muda junto.
- **Sem segundo pedido:** se a pessoa negar, ou se o navegador voltar a exigir confirmação, o app não pede de novo sozinho. Ela pode tocar em "Usar a localização do aparelho" ou escolher a cidade pelo nome, que fica como alternativa.
- **No iPhone,** quem decide se o Safari volta a perguntar é o próprio Safari: Ajustes > Apps > Safari > Localização > Permitir. Com o Leve na Tela de Início, a permissão fica com o app.
- **O que é guardado** em `settings.location`: o modo (aparelho ou nome) e as coordenadas arredondadas para 2 casas (cerca de 1 km). No modo por nome, também a cidade, o estado, o país e o fuso. Nada de endereço.
- **Revogar:** "Remover localização" apaga a localização e o cache, e o app para de usar a do aparelho até a pessoa pedir de novo. A permissão em si é revogada nos ajustes do aparelho, e a tela explica isso.
- **Nome da cidade:** a Open-Meteo não converte coordenadas em cidade. Para isso o app usa a versão gratuita da BigDataCloud (`api.bigdatacloud.net/data/reverse-geocode-client`), feita para chamadas direto do aparelho e sem chave. Ela recebe só as coordenadas arredondadas (cerca de 1 km), e só quando a posição muda. Se não responder, o app mostra "Localização do aparelho". O endereço fica em `src/config.js` (`WEATHER.reverse`).
- **Sincronização:** com conta, os ajustes (incluindo a localização) sincronizam entre os aparelhos da pessoa. Cada aparelho, ao abrir, passa a usar a própria posição.

## Regras

Todas as faixas ficam em `src/lib/environment.js`. Nenhuma regra classifica um dia como "seguro", e a ausência de alerta não quer dizer ausência de risco.

| Indicador | Faixas | Referência |
|---|---|---|
| Calor (sensação térmica) | 27 a 32 °C atenção; 32 a 39 calor intenso; 39 a 51 calor perigoso; 51+ extremo | Faixas do índice de calor do NWS/NOAA. A sensação térmica da Open-Meteo usa outra fórmula (temperatura aparente), então é uma aproximação. |
| Índice UV | 0-2 baixo; 3-5 moderado; 6-7 alto; 8-10 muito alto; 11+ extremo; proteção a partir de 3 | OMS, Global Solar UV Index |
| Qualidade do ar (AQI) | 0-50 boa; 51-100 moderada; 101-150 ruim para grupos sensíveis; 151-200 ruim; 201-300 muito ruim; 301+ perigosa | EPA (EUA) |
| Ar seco | umidade abaixo de 30% | INMET (estado de atenção) |
| Chuva forte | 7,6 mm ou mais em uma hora | Limiar usual de chuva forte |
| Vento forte | rajadas de 62 km/h ou mais | Escala Beaufort, força 8 |
| Tempestade | códigos 95, 96 e 99 | Códigos de tempo da OMM |
| Mudança brusca | máxima de hoje 8 °C diferente da de ontem | Regra do app, não oficial |

Desfavorável para atividades ao ar livre: calor perigoso ou pior, tempestade, rajadas fortes, ar "ruim" ou pior, ou chuva forte. Melhores horários: horas de luz, a partir de agora, sem tempestade, chuva forte ou vento forte, com sensação abaixo de 32 °C, UV abaixo de 6 e AQI abaixo de 101.

### Hidratação

A meta nunca muda por causa do clima. Com calor (sensação de 27 °C ou mais) ou ar seco, a aba Líquidos mostra uma orientação em texto, sem número: distribuir os líquidos ao longo do dia e, quando o pico for à tarde, avisar a sensação esperada. Com "Orientação médica para limitar líquidos" ligada em Ajustes, a orientação passa a ser seguir o médico.

### Alertas

No app, uma vez por dia por alerta e no máximo dois por vez. Há quatro categorias, que podem ser desligadas em Ajustes: calor (incluindo calor prolongado por 3 dias), sol (UV 8 ou mais), qualidade do ar (AQI 101 ou mais) e tempo (tempestade, chuva forte, vento forte e mudança brusca). Sem dado, não há alerta. Para alertas oficiais, a tela aponta a Defesa Civil e o INMET.

## Cenários testados

`tests/environment.test.js` (14 testes) cobre as faixas oficiais, o fuso horário, dia ameno, calor intenso e perigoso, calor prolongado, UV alto, ar ruim e ar ausente, tempestade, chuva e vento fortes, mudança brusca, melhores horários, dados faltando, semana e dados desatualizados.

`tests/activity.test.js` (13 testes) cobre:
- a corrida às 14h no calor, com horário melhor no mesmo dia e no dia seguinte;
- a intensidade mudando o nível;
- UV sozinho, duração longa, tempestade, vento para ciclismo e chance de chuva;
- "sem alerta" sem dizer "seguro", local fechado e sem previsão;
- restrição de líquidos antes e depois da atividade;
- próxima atividade;
- alimentação no calor, no frio e com atividade;
- histórico do dia, análises e a rotina marcada pelas atividades.

O teste de ponta a ponta (com a Open-Meteo simulada) cobre:
- sem localização;
- cidade escolhida pelo nome;
- GPS autorizado e GPS negado;
- dia quente e dia ameno;
- orientação na aba Líquidos, com e sem restrição de líquidos;
- cache sem consultas repetidas;
- API fora do ar, com cache e sem cache;
- qualidade do ar indisponível.

## Atividade física e clima

Cada atividade guarda: tipo, dia, horário de início, duração, intensidade (leve, moderada ou intensa), local (ao ar livre ou fechado), situação (planejada ou feita), uma nota opcional e o nível do clima no momento do registro. Fica em `activities`, nos dados do app, e sincroniza com a conta.

A avaliação usa as horas da previsão que a atividade ocupa, do início até o fim:

| Fator | Leve | Moderada | Intensa |
|---|---|---|---|
| Sensação térmica | atenção a partir de 32 °C; desfavorável a partir de 39 °C | cuidado a partir de 27 °C; atenção a partir de 32 °C; desfavorável a partir de 39 °C | atenção a partir de 27 °C; desfavorável a partir de 32 °C |
| Duração de 60 min ou mais com 27 °C ou mais | pelo menos atenção | pelo menos atenção | pelo menos atenção |
| Índice UV (ao ar livre) | cuidado a partir de 6; atenção a partir de 8 | igual | igual |
| Qualidade do ar (AQI) | cuidado a partir de 101 | atenção a partir de 101 | atenção a partir de 101 |
| Ar ruim (AQI 151+) ou tempestade | desfavorável | desfavorável | desfavorável |
| Chuva forte ou rajadas de 62 km/h | atenção (desfavorável para ciclismo com rajada forte) | igual | igual |
| Chance de chuva de 60% ou mais | cuidado | cuidado | cuidado |

O calor parte das faixas do NWS/NOAA, deslocadas pela intensidade, seguindo a orientação do ACSM (Colégio Americano de Medicina do Esporte) de reduzir a intensidade ou mudar o horário quanto mais quente e intenso o exercício.

- **Orientação:** nas atividades desfavoráveis ou em atenção, a orientação sugere os melhores horários do mesmo dia. Se não houver, sugere os do dia seguinte ou uma atividade em local fechado.
- **Nunca bloqueia:** a pessoa salva como quiser.
- **Sem alerta não é "seguro":** o texto diz que não quer dizer ausência de risco.
- **Local fechado:** o clima de fora pesa menos, e o app sugere ambiente ventilado.
- **Sem localização, ou fora da previsão:** "Sem previsão".

Depois da atividade, as orientações cobrem hidratação (ou seguir o médico, com restrição de líquidos), descanso num lugar fresco se foi no calor, recuperação e registrar a refeição. Não calcula suor nem eletrólitos. Atividades feitas de 30 minutos ou mais marcam o hábito "Mexer o corpo por 30 minutos" da rotina; musculação feita marca "Treino de força".

## Alimentação no contexto do dia

Na aba Registrar, com a busca vazia, aparecem até duas sugestões. Cada alimento só abre a busca; as metas de calorias e macros não mudam, e nenhum alimento é classificado como obrigatório ou proibido.

- **Dia quente** (sensação de 27 °C ou mais): frutas e verduras com muita água (de 85% a 96% de água, USDA FoodData Central) e refeições mais leves dentro do plano.
- **Dia frio** (sensação máxima de até 16 °C ou mínima de até 10 °C; regra do app): preparações quentes, se a pessoa quiser.
- **Dia de atividade** (moderada ou intensa, de 30 minutos ou mais): carboidrato e proteína depois do exercício, dentro das metas.

O app ainda não tem cadastro de preferências ou restrições alimentares; quando tiver, as sugestões devem filtrar por elas. Dá para desligar as sugestões em Ajustes.

## Histórico e análises

A cada atualização da previsão, o app guarda um resumo do dia em `envHistory`: local, máxima, mínima, sensação, umidade mínima, UV, AQI, chuva, classificação, alertas, orientação de hidratação, meta de líquidos e meta estimada. A meta estimada é sempre vazia, porque o clima não muda a meta. São até 400 dias, sincronizados com a conta.

As análises usam os últimos 30 dias completos e só aparecem com dados suficientes:
- meta de líquidos nos dias quentes (3 dias quentes ou mais);
- consumo médio em dias quentes e amenos (3 de cada e 100 ml ou mais de diferença);
- consumo médio em dias com e sem atividade (3 de cada e 100 ml ou mais de diferença);
- horário preferido de caminhadas, corridas e pedaladas (3 ou mais, com 60% no mesmo período);
- atividades feitas em horários com atenção pelo clima.

Cada frase mostra a base ("4 de 6 dias"). O cartão lembra que são associações nos registros, não causas nem conclusões médicas.

## O que fica para depois

- Notificações com o app fechado, que exigem um servidor que consulte o clima e envie as mensagens.
- Cadastro de preferências e restrições alimentares, para filtrar as sugestões.
- Servidor intermediário com a chave da versão comercial da Open-Meteo, quando o uso for comercial.
