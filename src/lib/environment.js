// Inteligência ambiental: lê as respostas da Open-Meteo (previsão e qualidade do ar) e transforma
// em contexto para o resto do app: condições de agora e de hoje, classificação do dia, índice UV,
// qualidade do ar, alertas, melhores horários para atividade ao ar livre e orientação de hidratação.
// Sem acesso à rede: as funções recebem os dados já buscados (ver src/env.js) e devolvem objetos.
//
// Regras e referências (todas as faixas estão neste arquivo, em um lugar só):
// - Calor: faixas do índice de calor do Serviço Nacional de Meteorologia dos EUA (NWS/NOAA), em °C:
//   27 a 32 "cautela", 32 a 39 "cautela extrema", 39 a 51 "perigo", 51 ou mais "perigo extremo".
//   Aplicadas à sensação térmica da Open-Meteo, que usa outra fórmula (a "temperatura aparente",
//   com umidade e vento); é uma aproximação, dita assim na tela.
// - Índice UV: categorias da Organização Mundial da Saúde (OMS, Global Solar UV Index): 0-2 baixo,
//   3-5 moderado, 6-7 alto, 8-10 muito alto, 11+ extremo; proteção a partir de 3.
// - Qualidade do ar: índice AQI da Agência de Proteção Ambiental dos EUA (EPA), que a Open-Meteo
//   calcula: 0-50 boa, 51-100 moderada, 101-150 ruim para grupos sensíveis, 151-200 ruim,
//   201-300 muito ruim, 301+ perigosa.
// - Umidade: abaixo de 30% é "estado de atenção" para o INMET.
// - Chuva forte: 7,6 mm em uma hora (limiar usual de chuva forte da meteorologia).
// - Vento forte: rajadas de 62 km/h ou mais (força 8 da escala Beaufort, "ventania").
// - Tempestade: códigos de tempo 95, 96 e 99 da OMM (Organização Meteorológica Mundial).
// - Mudança brusca: máxima de hoje 8 °C ou mais diferente da de ontem (regra do app, não oficial).
// Nenhuma regra classifica um dia como "seguro". Sem alerta não quer dizer sem risco.

// ---------------------------------------------------------------------------
// Faixas

export const HEAT = [
  { min: 51, id: 'perigo-extremo', label: 'Calor extremo', tone: 'danger' },
  { min: 39, id: 'perigo', label: 'Calor perigoso', tone: 'danger' },
  { min: 32, id: 'intenso', label: 'Calor intenso', tone: 'warn' },
  { min: 27, id: 'atencao', label: 'Atenção ao calor', tone: 'caution' },
];
export const heatLevel = feels => (feels == null ? null : HEAT.find(x => feels >= x.min) ?? null);

export const UV = [
  { min: 11, id: 'extremo', label: 'Extremo', tone: 'danger' },
  { min: 8, id: 'muito-alto', label: 'Muito alto', tone: 'danger' },
  { min: 6, id: 'alto', label: 'Alto', tone: 'warn' },
  { min: 3, id: 'moderado', label: 'Moderado', tone: 'caution' },
  { min: 0, id: 'baixo', label: 'Baixo', tone: 'ok' },
];
export const uvLevel = uv => (uv == null ? null : UV.find(x => uv >= x.min - 0.5) ?? UV[UV.length - 1]);
export const UV_PROTECT = 3;

export const AQI = [
  { min: 301, id: 'perigosa', label: 'Perigosa', tone: 'danger' },
  { min: 201, id: 'muito-ruim', label: 'Muito ruim', tone: 'danger' },
  { min: 151, id: 'ruim', label: 'Ruim', tone: 'danger' },
  { min: 101, id: 'sensiveis', label: 'Ruim para grupos sensíveis', tone: 'warn' },
  { min: 51, id: 'moderada', label: 'Moderada', tone: 'caution' },
  { min: 0, id: 'boa', label: 'Boa', tone: 'ok' },
];
export const aqiLevel = v => (v == null ? null : AQI.find(x => Math.round(v) >= x.min) ?? AQI[AQI.length - 1]);

export const DRY_HUMIDITY = 30;
export const HEAVY_RAIN_MM_H = 7.6;
export const STRONG_GUST_KMH = 62;
export const STORM_CODES = [95, 96, 99];
export const SUDDEN_CHANGE_C = 8;

// Códigos de tempo da OMM, como a Open-Meteo devolve.
const WX = {
  0: ['Céu limpo', 'sun'], 1: ['Poucas nuvens', 'sun-cloud'], 2: ['Parcialmente nublado', 'sun-cloud'], 3: ['Nublado', 'cloud'],
  45: ['Neblina', 'fog'], 48: ['Neblina com geada', 'fog'],
  51: ['Garoa fraca', 'drizzle'], 53: ['Garoa', 'drizzle'], 55: ['Garoa forte', 'drizzle'], 56: ['Garoa congelante', 'drizzle'], 57: ['Garoa congelante forte', 'drizzle'],
  61: ['Chuva fraca', 'rain'], 63: ['Chuva', 'rain'], 65: ['Chuva forte', 'rain'], 66: ['Chuva congelante', 'rain'], 67: ['Chuva congelante forte', 'rain'],
  71: ['Neve fraca', 'snow'], 73: ['Neve', 'snow'], 75: ['Neve forte', 'snow'], 77: ['Grãos de neve', 'snow'],
  80: ['Pancadas de chuva', 'rain'], 81: ['Pancadas de chuva', 'rain'], 82: ['Pancadas fortes de chuva', 'rain'], 85: ['Pancadas de neve', 'snow'], 86: ['Pancadas fortes de neve', 'snow'],
  95: ['Tempestade', 'storm'], 96: ['Tempestade com granizo', 'storm'], 99: ['Tempestade forte com granizo', 'storm'],
};
export const weatherLabel = code => WX[code]?.[0] ?? (code == null ? null : 'Tempo instável');
export const weatherIcon = (code, isDay = true) => { const i = WX[code]?.[1] ?? 'cloud'; return !isDay && (i === 'sun' || i === 'sun-cloud') ? (i === 'sun' ? 'moon' : 'moon-cloud') : i; };

// ---------------------------------------------------------------------------
// Pedidos (os parâmetros ficam aqui para os testes e o serviço usarem os mesmos).

export const FORECAST_PARAMS = {
  current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index',
  hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,uv_index,wind_speed_10m,wind_gusts_10m,is_day',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset',
  timezone: 'auto', forecast_days: 7, past_days: 1, wind_speed_unit: 'kmh', temperature_unit: 'celsius', precipitation_unit: 'mm',
};
export const AIR_PARAMS = {
  current: 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide',
  hourly: 'us_aqi,pm2_5,pm10,ozone',
  timezone: 'auto', forecast_days: 7,
};
export const query = params => Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

// ---------------------------------------------------------------------------
// Leitura das respostas

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pick = (obj, key, i) => num(obj?.[key]?.[i]);

/** "Agora" no fuso da localização, no formato da Open-Meteo ("2026-11-13T14:00"). */
export function localNow(utcOffsetSeconds, now = Date.now()) {
  const d = new Date(now + (utcOffsetSeconds ?? 0) * 1000);
  return d.toISOString().slice(0, 16);
}

/**
 * Junta previsão e qualidade do ar num contexto só. Qualquer um pode faltar (null): o que não
 * veio fica null e a tela diz "indisponível", sem inventar valores.
 */
export function buildContext({ forecast, air, now = Date.now() } = {}) {
  if (!forecast?.hourly?.time?.length) return null;
  const off = forecast.utc_offset_seconds ?? 0;
  const nowLocal = localNow(off, now), today = nowLocal.slice(0, 10), hourKey = nowLocal.slice(0, 13);
  const H = forecast.hourly, D = forecast.daily ?? {};
  const hours = H.time.map((t, i) => ({
    time: t, date: t.slice(0, 10), hour: Number(t.slice(11, 13)),
    temp: pick(H, 'temperature_2m', i), feels: pick(H, 'apparent_temperature', i), humidity: pick(H, 'relative_humidity_2m', i),
    rainProb: pick(H, 'precipitation_probability', i), rain: pick(H, 'precipitation', i), code: pick(H, 'weather_code', i),
    uv: pick(H, 'uv_index', i), wind: pick(H, 'wind_speed_10m', i), gust: pick(H, 'wind_gusts_10m', i), isDay: H.is_day ? H.is_day[i] === 1 : null,
  }));
  // Qualidade do ar por hora, casada pelo horário.
  if (air?.hourly?.time) {
    const idx = Object.fromEntries(air.hourly.time.map((t, i) => [t, i]));
    for (const h of hours) { const i = idx[h.time]; if (i != null) { h.aqi = pick(air.hourly, 'us_aqi', i); h.pm25 = pick(air.hourly, 'pm2_5', i); } }
  }
  const days = (D.time ?? []).map((date, i) => {
    const dayHours = hours.filter(h => h.date === date);
    const aqis = dayHours.map(h => h.aqi).filter(v => v != null);
    return {
      date, code: pick(D, 'weather_code', i), max: pick(D, 'temperature_2m_max', i), min: pick(D, 'temperature_2m_min', i),
      feelsMax: pick(D, 'apparent_temperature_max', i), feelsMin: pick(D, 'apparent_temperature_min', i), uvMax: pick(D, 'uv_index_max', i),
      rainSum: pick(D, 'precipitation_sum', i), rainProb: pick(D, 'precipitation_probability_max', i), windMax: pick(D, 'wind_speed_10m_max', i), gustMax: pick(D, 'wind_gusts_10m_max', i),
      sunrise: D.sunrise?.[i] ?? null, sunset: D.sunset?.[i] ?? null,
      aqiMax: aqis.length ? Math.max(...aqis) : null,
      maxRainHour: Math.max(0, ...dayHours.map(h => h.rain ?? 0)),
      storm: dayHours.some(h => STORM_CODES.includes(h.code)) || STORM_CODES.includes(pick(D, 'weather_code', i)),
    };
  });
  const C = forecast.current ?? {};
  const nowHour = hours.find(h => h.time.slice(0, 13) === hourKey) ?? null;
  const current = {
    time: C.time ?? nowHour?.time ?? null,
    temp: num(C.temperature_2m) ?? nowHour?.temp ?? null, feels: num(C.apparent_temperature) ?? nowHour?.feels ?? null,
    humidity: num(C.relative_humidity_2m) ?? nowHour?.humidity ?? null, code: num(C.weather_code) ?? nowHour?.code ?? null,
    uv: num(C.uv_index) ?? nowHour?.uv ?? null, wind: num(C.wind_speed_10m) ?? nowHour?.wind ?? null, gust: num(C.wind_gusts_10m) ?? nowHour?.gust ?? null,
    isDay: C.is_day != null ? C.is_day === 1 : (nowHour?.isDay ?? true),
  };
  const A = air?.current ?? null;
  const airNow = A ? {
    time: A.time ?? null, aqi: num(A.us_aqi), pm25: num(A.pm2_5), pm10: num(A.pm10), o3: num(A.ozone), no2: num(A.nitrogen_dioxide),
    so2: num(A.sulphur_dioxide), co: num(A.carbon_monoxide),
  } : null;
  const todayIdx = days.findIndex(d => d.date === today);
  return {
    tz: forecast.timezone ?? null, offset: off, now: nowLocal, today,
    current, hours, days, air: airNow,
    todayDay: days[todayIdx] ?? null, yesterday: todayIdx > 0 ? days[todayIdx - 1] : null,
    week: days.filter(d => d.date >= today).slice(0, 7),
  };
}

// ---------------------------------------------------------------------------
// Avaliação do dia

const fmt = n => Math.round(n);
const hhmm = t => (t ? t.slice(11, 16) : '');
function ranges(hours) {
  // Junta horas seguidas em faixas: [{from: 10, to: 15}] = das 10h às 16h.
  const out = [];
  for (const h of hours) {
    const last = out[out.length - 1];
    if (last && h.hour === last.to + 1) last.to = h.hour; else out.push({ from: h.hour, to: h.hour });
  }
  return out;
}
export const rangeText = r => `das ${r.from}h às ${r.to + 1}h`;

/** Horas de hoje (a partir de agora) em que o UV pede proteção. */
export function uvPeak(ctx) {
  const h = ctx.hours.filter(x => x.date === ctx.today && x.uv != null && x.uv >= UV_PROTECT - 0.5);
  return ranges(h);
}

/**
 * Melhores horários para atividade ao ar livre num dia: horas de luz sem tempestade, sem chuva
 * forte, sem rajada forte, com sensação abaixo de "calor intenso" (32 °C), UV abaixo de "alto" e ar
 * abaixo de "ruim para grupos sensíveis". Devolve faixas e também as horas que não servem.
 */
export function bestHours(ctx, date = ctx.today, { fromNow = true } = {}) {
  const day = ctx.days.find(d => d.date === date);
  if (!day) return null;
  const sunrise = day.sunrise ? Number(day.sunrise.slice(11, 13)) : 6, sunset = day.sunset ? Number(day.sunset.slice(11, 13)) : 18;
  const nowH = Number(ctx.now.slice(11, 13));
  const candidates = ctx.hours.filter(h => h.date === date && h.hour >= sunrise && h.hour <= sunset && (!fromNow || date !== ctx.today || h.hour >= nowH));
  const ok = candidates.filter(h => (h.feels == null || h.feels < HEAT[2].min) && !STORM_CODES.includes(h.code)
    && (h.rain ?? 0) < HEAVY_RAIN_MM_H && (h.gust ?? 0) < STRONG_GUST_KMH && (h.uv == null || h.uv < 5.5) && (h.aqi == null || h.aqi < 101));
  return { ranges: ranges(ok), checked: candidates.length, sunrise, sunset };
}

/**
 * Classificações do dia, do mais importante para o menos. Cada uma traz o motivo e a regra.
 * "Condições favoráveis" só aparece quando nenhuma outra vale, e não quer dizer "seguro".
 */
export function classify(ctx) {
  if (!ctx) return [];
  const d = ctx.todayDay, c = ctx.current, out = [];
  const feelsMax = Math.max(...[d?.feelsMax, c.feels].filter(v => v != null));
  const heat = Number.isFinite(feelsMax) ? heatLevel(feelsMax) : null;
  if (heat) out.push({ id: 'calor-' + heat.id, kind: 'calor', label: heat.label, tone: heat.tone, why: `Sensação térmica de até ${fmt(feelsMax)} °C`, rule: 'Faixas do índice de calor do NWS/NOAA' });
  const uvMax = Math.max(...[d?.uvMax, c.uv].filter(v => v != null));
  const uv = Number.isFinite(uvMax) ? uvLevel(uvMax) : null;
  if (uv && uvMax >= 5.5) out.push({ id: 'uv-' + uv.id, kind: 'uv', label: 'Atenção à exposição solar', tone: uv.tone, why: `Índice UV de até ${fmt(uvMax)} (${uv.label.toLowerCase()})`, rule: 'Categorias da OMS para o índice UV' });
  const aqiMax = Math.max(...[ctx.air?.aqi, d?.aqiMax].filter(v => v != null));
  const aq = Number.isFinite(aqiMax) ? aqiLevel(aqiMax) : null;
  if (aq && aqiMax >= 101) out.push({ id: 'ar-' + aq.id, kind: 'ar', label: 'Qualidade do ar desfavorável', tone: aq.tone, why: `Índice de qualidade do ar de até ${fmt(aqiMax)} (${aq.label.toLowerCase()})`, rule: 'Faixas do AQI da EPA' });
  const outdoorBad = (heat && HEAT.indexOf(heat) <= 1) || d?.storm || (d?.gustMax ?? 0) >= STRONG_GUST_KMH || (aqiMax >= 151) || (d?.maxRainHour ?? 0) >= HEAVY_RAIN_MM_H;
  if (outdoorBad) {
    const why = [heat && HEAT.indexOf(heat) <= 1 ? 'calor perigoso' : null, d?.storm ? 'tempestade prevista' : null, (d?.gustMax ?? 0) >= STRONG_GUST_KMH ? `rajadas de até ${fmt(d.gustMax)} km/h` : null,
      aqiMax >= 151 ? 'ar ruim' : null, (d?.maxRainHour ?? 0) >= HEAVY_RAIN_MM_H ? 'chuva forte' : null].filter(Boolean).join(', ');
    out.push({ id: 'externo', kind: 'externo', label: 'Desfavorável para atividades ao ar livre', tone: 'danger', why: why.charAt(0).toUpperCase() + why.slice(1), rule: 'Regras do app a partir das faixas acima' });
  }
  if (!out.length) out.push({ id: 'favoravel', kind: 'favoravel', label: 'Condições favoráveis', tone: 'ok', why: 'Nenhuma das faixas de atenção foi atingida na previsão de hoje', rule: 'Ausência de alerta não quer dizer ausência de risco' });
  return out;
}

/** Frase curta do dia para o topo do cartão. */
export function summary(ctx, cls = classify(ctx)) {
  if (!ctx) return null;
  const k = new Set(cls.map(x => x.kind)), d = ctx.todayDay;
  const peak = d?.feelsMax != null ? ctx.hours.filter(h => h.date === ctx.today && h.feels != null).sort((a, b) => b.feels - a.feels)[0] : null;
  const afternoon = peak && peak.hour >= 12 && peak.hour <= 17;
  if (k.has('externo') && d?.storm) return 'Há previsão de tempestade hoje. Acompanhe os alertas oficiais da Defesa Civil e do INMET e evite atividades ao ar livre durante o temporal.';
  if (k.has('calor')) return `Hoje teremos temperaturas elevadas${afternoon ? ', principalmente à tarde' : ''}. Considere fazer atividades físicas nos horários mais frescos e mantenha uma hidratação regular.`;
  if (k.has('ar')) return 'A qualidade do ar está desfavorável. Considere reduzir atividades físicas intensas ao ar livre.';
  if (k.has('uv')) return 'O índice UV estará alto. Use protetor solar e prefira a sombra nos horários de maior intensidade.';
  if (k.has('externo')) return 'O tempo pede atenção hoje para atividades ao ar livre.';
  return 'Nenhuma faixa de atenção prevista para hoje. Ainda assim, ouça o seu corpo e acompanhe a previsão.';
}

/** Versão curta da frase do dia, para o cartão (a completa abre com "Ler mais"). */
export function summaryShort(ctx, cls = classify(ctx)) {
  if (!ctx) return null;
  const k = new Set(cls.map(x => x.kind)), d = ctx.todayDay;
  const peak = ctx.hours.filter(h => h.date === ctx.today && h.feels != null).sort((a, b) => b.feels - a.feels)[0];
  const afternoon = peak && peak.hour >= 12 && peak.hour <= 17;
  if (k.has('externo') && d?.storm) return 'Tempestade prevista hoje.';
  if (k.has('calor')) return `Dia quente${afternoon ? ', principalmente à tarde' : ''}.`;
  if (k.has('ar')) return 'Qualidade do ar desfavorável hoje.';
  if (k.has('uv')) return 'Índice UV alto hoje.';
  if (k.has('externo')) return 'O tempo pede atenção ao ar livre.';
  return 'Nenhuma faixa de atenção hoje.';
}

/**
 * Orientação de hidratação para hoje (texto, sem número). A meta não muda. Com restrição de
 * líquidos registrada, a orientação manda seguir o médico.
 */
export function hydrationTip(ctx, { restricted = false } = {}) {
  if (!ctx?.todayDay) return null;
  const d = ctx.todayDay, c = ctx.current;
  const feelsMax = Math.max(...[d.feelsMax, c.feels].filter(v => v != null));
  const heat = Number.isFinite(feelsMax) ? heatLevel(feelsMax) : null;
  const minHum = Math.min(...ctx.hours.filter(h => h.date === ctx.today && h.humidity != null).map(h => h.humidity));
  const dry = Number.isFinite(minHum) && minHum < DRY_HUMIDITY;
  if (!heat && !dry) return null;
  if (restricted) return { tone: 'caution', text: `Hoje está ${heat ? 'quente' : 'seco'}. Siga a orientação do seu médico sobre a quantidade de líquidos.` };
  const peak = ctx.hours.filter(h => h.date === ctx.today && h.feels != null).sort((a, b) => b.feels - a.feels)[0];
  if (heat && peak && peak.hour >= 12 && peak.hour <= 17 && Number(ctx.now.slice(11, 13)) < peak.hour)
    return { tone: heat.tone, text: `Durante a tarde a sensação térmica pode chegar a ${fmt(peak.feels)} °C. Distribua os líquidos ao longo do dia.` };
  if (heat) return { tone: heat.tone, text: 'Hoje está mais quente. Lembre-se de manter uma boa ingestão de líquidos, distribuída ao longo do dia.' };
  return { tone: 'caution', text: `O ar está seco hoje (umidade de até ${fmt(minHum)}%). Beba líquidos ao longo do dia e prefira ambientes ventilados.` };
}

/**
 * Alertas do dia, com id estável por dia para não repetir. Categorias: calor, uv, ar, tempo.
 * Só entram com dado presente; nada vira alerta por falta de informação.
 */
export function alerts(ctx) {
  if (!ctx?.todayDay) return [];
  const d = ctx.todayDay, out = [], day = ctx.today;
  const feelsMax = d.feelsMax ?? ctx.current.feels;
  const heat = heatLevel(feelsMax);
  if (heat && HEAT.indexOf(heat) <= 2) {
    const peak = ctx.hours.filter(h => h.date === day && h.feels != null).sort((a, b) => b.feels - a.feels)[0];
    out.push({ id: `${day}-calor-${heat.id}`, category: 'calor', tone: heat.tone, title: heat.label,
      text: `A sensação térmica deve chegar a ${fmt(feelsMax)} °C${peak ? ` por volta das ${peak.hour}h` : ''}. Considere evitar exercícios intensos ao ar livre nesse período e mantenha a hidratação distribuída ao longo do dia.` });
    // Calor prolongado: hoje e os dois próximos dias na mesma faixa ou acima.
    const next = ctx.week.slice(1, 3);
    if (next.length === 2 && next.every(x => x.feelsMax != null && x.feelsMax >= HEAT[2].min))
      out.push({ id: `${day}-calor-prolongado`, category: 'calor', tone: 'warn', title: 'Calor prolongado', text: 'A previsão mostra calor intenso por pelo menos três dias seguidos. Planeje as atividades nos horários mais frescos.' });
  }
  const uv = uvLevel(d.uvMax);
  if (uv && d.uvMax >= 7.5) {
    const r = uvPeak(ctx);
    out.push({ id: `${day}-uv-${uv.id}`, category: 'uv', tone: uv.tone, title: `Índice UV ${uv.label.toLowerCase()}`,
      text: `O índice UV deve chegar a ${fmt(d.uvMax)}${r.length ? `, ${r.map(rangeText).join(' e ')}` : ''}. Use protetor solar, óculos e chapéu e procure sombra nesse período.` });
  }
  const aqiMax = Math.max(...[ctx.air?.aqi, d.aqiMax].filter(v => v != null));
  const aq = Number.isFinite(aqiMax) ? aqiLevel(aqiMax) : null;
  if (aq && aqiMax >= 101) out.push({ id: `${day}-ar-${aq.id}`, category: 'ar', tone: aq.tone, title: 'Qualidade do ar desfavorável',
    text: `O índice de qualidade do ar deve chegar a ${fmt(aqiMax)} (${aq.label.toLowerCase()}). Considere reduzir atividades físicas intensas ao ar livre.` });
  if (d.storm) out.push({ id: `${day}-tempestade`, category: 'tempo', tone: 'danger', title: 'Tempestade prevista', text: 'Há previsão de tempestade hoje. Acompanhe os alertas oficiais da Defesa Civil e do INMET.' });
  else if (d.maxRainHour >= HEAVY_RAIN_MM_H) out.push({ id: `${day}-chuva-forte`, category: 'tempo', tone: 'warn', title: 'Chuva forte', text: `A previsão mostra chuva forte em algum momento de hoje (até ${fmt(d.maxRainHour)} mm em uma hora).` });
  if ((d.gustMax ?? 0) >= STRONG_GUST_KMH) out.push({ id: `${day}-vento`, category: 'tempo', tone: 'warn', title: 'Vento forte', text: `As rajadas de vento podem chegar a ${fmt(d.gustMax)} km/h.` });
  if (ctx.yesterday?.max != null && d.max != null && Math.abs(d.max - ctx.yesterday.max) >= SUDDEN_CHANGE_C)
    out.push({ id: `${day}-mudanca`, category: 'tempo', tone: 'caution', title: d.max > ctx.yesterday.max ? 'Esquenta bastante hoje' : 'Esfria bastante hoje',
      text: `A máxima de hoje (${fmt(d.max)} °C) é ${fmt(Math.abs(d.max - ctx.yesterday.max))} °C ${d.max > ctx.yesterday.max ? 'maior' : 'menor'} que a de ontem.` });
  return out;
}

/** Rótulo curto de cada dia da semana, para o planejamento. */
export function dayOutlook(day) {
  if (!day) return null;
  if (day.storm) return { label: 'Tempestade prevista', tone: 'danger' };
  const heat = heatLevel(day.feelsMax ?? day.max);
  if (heat) return { label: heat.label, tone: heat.tone };
  if (day.aqiMax != null && day.aqiMax >= 101) return { label: 'Ar desfavorável', tone: 'warn' };
  if (day.uvMax != null && day.uvMax >= 7.5) return { label: 'Atenção ao sol', tone: 'warn' };
  if ((day.rainProb ?? 0) >= 60) return { label: 'Chance de chuva', tone: 'caution' };
  return { label: 'Condições amenas', tone: 'ok' };
}

/** Os dados envelheceram? (a tela avisa e tenta de novo). */
export const isStale = (fetchedAt, now = Date.now(), limitMs = 3 * 3600e3) => !fetchedAt || now - fetchedAt > limitMs;

/** Dicas de proteção solar conforme a categoria do UV (OMS). */
export function uvAdvice(uv) {
  const l = uvLevel(uv);
  if (!l) return [];
  if (uv < UV_PROTECT - 0.5) return ['Pouca necessidade de proteção para a maioria das pessoas.'];
  const base = ['Protetor solar com FPS 30 ou mais, reaplicado a cada 2 horas', 'Óculos de sol com proteção UV', 'Chapéu de aba larga e roupas que cubram a pele', 'Procure sombra'];
  return uv >= 7.5 ? [...base, 'Evite ficar ao sol nos horários de maior intensidade'] : base;
}
export const hhmmLocal = hhmm;
