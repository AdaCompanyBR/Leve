# Inteligência ambiental (Fase 1)

O Leve usa o clima, o índice UV e a qualidade do ar da região da pessoa para dar contexto às orientações do dia. Este documento descreve o que foi feito, de onde vêm os dados e quais regras são usadas.

## Arquitetura

| Parte | Arquivo | Papel |
|---|---|---|
| Regras | `src/lib/environment.js` | Lê as respostas da Open-Meteo e calcula classificação do dia, alertas, melhores horários, índice UV, qualidade do ar e orientação de hidratação. Sem rede, testável (`tests/environment.test.js`). |
| Serviço central | `src/env.js` | Localização, consulta às APIs, cache, atualização e disparo de alertas. Todas as telas leem `env.ctx`; nenhuma consulta a API por conta própria. |
| Telas | `src/ui/environment.js` | Cartão "Hoje em sua região" (aba Hoje), detalhes do dia, escolha da localização, orientação na aba Líquidos e o aviso de alerta. |
| Endereços | `src/config.js` (`WEATHER`) | Endereços da previsão, da qualidade do ar e da busca de cidades. |

Fluxo: ao abrir o app, ao voltar para ele e a cada 15 minutos com ele aberto, `env.js` confere o cache. A previsão é renovada depois de 30 minutos e a qualidade do ar depois de 60. Os pedidos simultâneos viram um só. Sem internet ou com a API fora, a tela mostra a última previsão salva, com a hora e o aviso "desatualizada" depois de 3 horas.

## APIs (Open-Meteo)

- Previsão: `api.open-meteo.com/v1/forecast` com `current`, `hourly` e `daily` (temperatura, sensação térmica, umidade, chuva e probabilidade, código do tempo, índice UV, vento e rajadas, nascer e pôr do sol), `timezone=auto`, 7 dias e o dia anterior.
- Qualidade do ar: `air-quality-api.open-meteo.com/v1/air-quality` com AQI dos EUA, PM2,5, PM10, ozônio, NO₂, SO₂ e CO.
- Cidades: `geocoding-api.open-meteo.com/v1/search` em português.

Os dados são da Open-Meteo.com, sob a licença CC BY 4.0; a atribuição aparece na tela de detalhes. **A versão gratuita é só para uso não comercial.** Para uso comercial, troque os endereços em `src/config.js` pelos de um servidor intermediário (por exemplo, uma função do Supabase) que guarde a chave da versão paga. A chave nunca deve ficar no app.

A qualidade do ar vem do modelo CAMS (Copernicus), com resolução de cerca de 45 km fora da Europa. Ela pode não refletir a rua da pessoa nem as estações locais, e a tela diz isso.

## Localização e LGPD

- Guardado em `settings.location`: modo (GPS ou nome), cidade, estado, país, fuso e coordenadas arredondadas para 2 casas (cerca de 1 km). Nada de endereço.
- O GPS só é pedido quando a pessoa toca em "Usar minha localização". Depois, a posição só é relida (a cada 6 horas no máximo) se o navegador já tiver a permissão, sem perguntar de novo.
- "Remover localização" apaga a localização e o cache. A permissão do GPS é revogada nos ajustes do navegador, e a tela explica isso.
- A Open-Meteo não converte coordenadas em cidade. Pelo GPS, a região aparece como "Sua localização"; escolhendo pelo nome, aparece a cidade.
- Com conta, os ajustes (incluindo a localização) sincronizam entre os aparelhos da pessoa, como o resto dos ajustes.

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

O teste de ponta a ponta (com a Open-Meteo simulada) cobre:
- sem localização;
- cidade escolhida pelo nome;
- GPS autorizado e GPS negado;
- dia quente e dia ameno;
- orientação na aba Líquidos, com e sem restrição de líquidos;
- cache sem consultas repetidas;
- API fora do ar, com cache e sem cache;
- qualidade do ar indisponível.

## Fase 2 (ainda não feita)

- Registro e planejamento de atividades físicas, com o clima do horário escolhido e orientações antes e depois.
- Alimentação contextual: sugestões em dias quentes ou frios, sem mudar metas.
- Histórico diário das condições e análises ("meta batida em X% dos dias quentes").
- Notificações com o app fechado, que exigem um servidor que consulte o clima e envie as mensagens.
