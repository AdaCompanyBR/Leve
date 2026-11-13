import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, classify, summary, hydrationTip, alerts, bestHours, uvLevel, aqiLevel, heatLevel, dayOutlook, localNow, isStale, uvPeak, uvAdvice } from '../src/lib/environment.js';

// Previsão sintética no formato da Open-Meteo: ontem, hoje e mais 5 dias, 24 horas cada.
const DAYS = ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'];
function forecast({ offset = -10800, feels = () => 24, uv = () => 0, code = () => 1, rain = () => 0, gust = () => 20, hum = () => 60, daily = {} } = {}) {
  const time = [], H = { temperature_2m: [], apparent_temperature: [], relative_humidity_2m: [], precipitation_probability: [], precipitation: [], weather_code: [], uv_index: [], wind_speed_10m: [], wind_gusts_10m: [], is_day: [] };
  for (const [di, date] of DAYS.entries()) for (let hr = 0; hr < 24; hr++) {
    time.push(`${date}T${String(hr).padStart(2, '0')}:00`);
    H.temperature_2m.push(feels(di, hr) - 2); H.apparent_temperature.push(feels(di, hr)); H.relative_humidity_2m.push(hum(di, hr));
    H.precipitation_probability.push(rain(di, hr) > 0 ? 80 : 10); H.precipitation.push(rain(di, hr)); H.weather_code.push(code(di, hr));
    H.uv_index.push(uv(di, hr)); H.wind_speed_10m.push(10); H.wind_gusts_10m.push(gust(di, hr)); H.is_day.push(hr >= 6 && hr <= 18 ? 1 : 0);
  }
  const agg = (di, f, red) => red(...Array.from({ length: 24 }, (_, hr) => f(di, hr)));
  const D = { time: DAYS, weather_code: DAYS.map((_, di) => agg(di, code, Math.max)), temperature_2m_max: DAYS.map((_, di) => agg(di, feels, Math.max) - 2), temperature_2m_min: DAYS.map((_, di) => agg(di, feels, Math.min) - 2),
    apparent_temperature_max: DAYS.map((_, di) => agg(di, feels, Math.max)), apparent_temperature_min: DAYS.map((_, di) => agg(di, feels, Math.min)), uv_index_max: DAYS.map((_, di) => agg(di, uv, Math.max)),
    precipitation_sum: DAYS.map((_, di) => agg(di, rain, (...a) => a.reduce((s, v) => s + v, 0))), precipitation_probability_max: DAYS.map(() => 20), wind_speed_10m_max: DAYS.map(() => 15), wind_gusts_10m_max: DAYS.map((_, di) => agg(di, gust, Math.max)),
    sunrise: DAYS.map(d => `${d}T05:30`), sunset: DAYS.map(d => `${d}T18:40`), ...daily };
  return { latitude: -23.55, longitude: -46.63, timezone: 'America/Sao_Paulo', utc_offset_seconds: offset, hourly: { time, ...H }, daily: D };
}
// 13/11/2026 às 09:00 em São Paulo (UTC-3) = 12:00 UTC.
const NOW = Date.parse('2026-11-13T12:00:00Z');
const ctxOf = (opts, air) => buildContext({ forecast: forecast(opts), air, now: NOW });
const curve = (base, peak) => (di, hr) => base + Math.max(0, peak - base) * Math.max(0, 1 - Math.abs(hr - 15) / 6);

test('faixas oficiais: UV (OMS), AQI (EPA) e calor (NWS)', () => {
  assert.equal(uvLevel(2).label, 'Baixo'); assert.equal(uvLevel(3).label, 'Moderado'); assert.equal(uvLevel(6).label, 'Alto');
  assert.equal(uvLevel(8).label, 'Muito alto'); assert.equal(uvLevel(11.2).label, 'Extremo'); assert.equal(uvLevel(null), null);
  assert.equal(aqiLevel(40).label, 'Boa'); assert.equal(aqiLevel(80).label, 'Moderada'); assert.equal(aqiLevel(120).label, 'Ruim para grupos sensíveis');
  assert.equal(aqiLevel(160).label, 'Ruim'); assert.equal(aqiLevel(250).label, 'Muito ruim'); assert.equal(aqiLevel(320).label, 'Perigosa');
  assert.equal(heatLevel(26), null); assert.equal(heatLevel(28).label, 'Atenção ao calor'); assert.equal(heatLevel(33).label, 'Calor intenso'); assert.equal(heatLevel(40).label, 'Calor perigoso');
});

test('hora local segue o fuso da localização', () => {
  assert.equal(localNow(-10800, NOW), '2026-11-13T09:00');
  assert.equal(localNow(3600, NOW), '2026-11-13T13:00');
  const tokyo = buildContext({ forecast: forecast({ offset: 32400 }), now: NOW });
  assert.equal(tokyo.now, '2026-11-13T21:00'); assert.equal(tokyo.today, '2026-11-13');
});

test('dia ameno: condições favoráveis, sem alertas e sem dica de hidratação', () => {
  const ctx = ctxOf({ feels: () => 23, uv: (d, h) => (h >= 10 && h <= 14 ? 4 : 0) });
  assert.deepEqual(classify(ctx).map(c => c.kind), ['favoravel']);
  assert.match(classify(ctx)[0].rule, /não quer dizer ausência de risco/);
  assert.equal(alerts(ctx).length, 0);
  assert.equal(hydrationTip(ctx), null);
  assert.match(summary(ctx), /Nenhuma faixa de atenção/);
});

test('calor intenso: classificação, alerta com horário e dica de hidratação sem número de meta', () => {
  const ctx = ctxOf({ feels: curve(24, 36) });
  const cls = classify(ctx);
  assert.equal(cls[0].label, 'Calor intenso'); assert.match(cls[0].why, /36 °C/);
  const a = alerts(ctx).find(x => x.category === 'calor');
  assert.match(a.text, /36 °C por volta das 15h/);
  const tip = hydrationTip(ctx);
  assert.match(tip.text, /tarde/); assert.doesNotMatch(tip.text, /ml|litro/i);
  assert.match(summary(ctx), /principalmente à tarde/);
});

test('restrição de líquidos: a dica manda seguir o médico', () => {
  const ctx = ctxOf({ feels: curve(24, 36) });
  assert.match(hydrationTip(ctx, { restricted: true }).text, /orientação do seu médico/);
});

test('calor perigoso deixa o dia desfavorável para atividades ao ar livre', () => {
  const ctx = ctxOf({ feels: curve(28, 42) });
  assert.ok(classify(ctx).some(c => c.kind === 'externo'));
});

test('calor prolongado: três dias seguidos de calor intenso', () => {
  const ctx = ctxOf({ feels: curve(26, 35) });
  assert.ok(alerts(ctx).some(a => a.id.endsWith('calor-prolongado')));
});

test('UV alto: faixa de horário e dicas, sem usar a temperatura', () => {
  const ctx = ctxOf({ feels: () => 22, uv: (d, h) => (h >= 10 && h <= 15 ? 9 : h >= 8 && h <= 17 ? 4 : 0) });
  const a = alerts(ctx).find(x => x.category === 'uv');
  assert.match(a.text, /chegar a 9, das 8h às 18h/);
  assert.deepEqual(uvPeak(ctx).map(r => [r.from, r.to]), [[8, 17]]);
  assert.ok(classify(ctx).some(c => c.kind === 'uv')); assert.ok(!classify(ctx).some(c => c.kind === 'calor'));
  assert.ok(uvAdvice(9).some(t => /Evite ficar ao sol/.test(t)));
});

test('qualidade do ar ruim entra na classificação; sem dado de ar não vira alerta', () => {
  const air = { current: { time: '2026-11-13T09:00', us_aqi: 165, pm2_5: 70, pm10: 90, ozone: 80, nitrogen_dioxide: 30 }, hourly: { time: ['2026-11-13T09:00'], us_aqi: [165], pm2_5: [70], pm10: [90], ozone: [80] } };
  const ctx = ctxOf({}, air);
  assert.ok(classify(ctx).some(c => c.kind === 'ar')); assert.ok(classify(ctx).some(c => c.kind === 'externo'));
  assert.equal(ctx.air.pm25, 70);
  const noAir = ctxOf({});
  assert.equal(noAir.air, null); assert.ok(!alerts(noAir).some(a => a.category === 'ar'));
});

test('tempestade, chuva forte e vento forte', () => {
  const storm = ctxOf({ code: (d, h) => (d === 1 && h === 16 ? 95 : 3) });
  assert.ok(alerts(storm).some(a => a.id.endsWith('tempestade'))); assert.match(summary(storm), /INMET/);
  const rain = ctxOf({ rain: (d, h) => (d === 1 && h === 14 ? 12 : 0) });
  assert.ok(alerts(rain).some(a => a.id.endsWith('chuva-forte')));
  const wind = ctxOf({ gust: (d, h) => (d === 1 && h === 13 ? 75 : 20) });
  assert.ok(alerts(wind).some(a => a.id.endsWith('vento')));
});

test('mudança brusca de temperatura em relação a ontem', () => {
  const ctx = ctxOf({ feels: (d, h) => (d === 0 ? 20 : 30) + (h === 15 ? 2 : 0) });
  assert.ok(alerts(ctx).some(a => a.id.endsWith('mudanca')));
});

test('melhores horários: luz do dia, a partir de agora, fora do calor e do UV alto', () => {
  const ctx = ctxOf({ feels: curve(22, 36), uv: (d, h) => (h >= 10 && h <= 15 ? 8 : 0) });
  const b = bestHours(ctx);
  assert.ok(b.ranges.length >= 1);
  for (const r of b.ranges) for (let h = r.from; h <= r.to; h++) assert.ok(h < 10 || h > 15);
  assert.ok(b.ranges[0].from >= 9, 'não sugere horários que já passaram');
});

test('dados faltando: sem resposta não há contexto; campos ausentes ficam null', () => {
  assert.equal(buildContext({ forecast: null }), null);
  const f = forecast(); delete f.hourly.uv_index; delete f.daily.uv_index_max;
  const ctx = buildContext({ forecast: f, now: NOW });
  assert.equal(ctx.current.uv, null); assert.equal(ctx.todayDay.uvMax, null);
  assert.ok(!classify(ctx).some(c => c.kind === 'uv'));
});

test('semana: rótulos por dia e dados envelhecidos', () => {
  const ctx = ctxOf({ feels: (d, h) => [22, 24, 30, 35, 24, 23, 22][d] + (h === 15 ? 1 : 0) });
  assert.equal(ctx.week.length, 6);
  assert.deepEqual(ctx.week.map(d => dayOutlook(d).label).slice(0, 3), ['Condições amenas', 'Atenção ao calor', 'Calor intenso']);
  assert.equal(isStale(NOW - 4 * 3600e3, NOW), true); assert.equal(isStale(NOW - 600e3, NOW), false); assert.equal(isStale(null), true);
});
