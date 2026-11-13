// Previsão sintética no formato da Open-Meteo para os testes: ontem, hoje e mais 5 dias.
export const DAYS = ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'];
// 13/11/2026 às 09:00 em São Paulo (UTC-3).
export const NOW = Date.parse('2026-11-13T12:00:00Z');
export const curve = (base, peak, at = 15, width = 6) => (di, hr) => base + Math.max(0, peak - base) * Math.max(0, 1 - Math.abs(hr - at) / width);
export function forecast({ offset = -10800, feels = () => 24, uv = () => 0, code = () => 1, rain = () => 0, gust = () => 20, hum = () => 60, rainProb = null } = {}) {
  const time = [], H = { temperature_2m: [], apparent_temperature: [], relative_humidity_2m: [], precipitation_probability: [], precipitation: [], weather_code: [], uv_index: [], wind_speed_10m: [], wind_gusts_10m: [], is_day: [] };
  for (const [di, date] of DAYS.entries()) for (let hr = 0; hr < 24; hr++) {
    time.push(`${date}T${String(hr).padStart(2, '0')}:00`);
    H.temperature_2m.push(feels(di, hr) - 2); H.apparent_temperature.push(feels(di, hr)); H.relative_humidity_2m.push(hum(di, hr));
    H.precipitation_probability.push(rainProb ? rainProb(di, hr) : rain(di, hr) > 0 ? 80 : 10); H.precipitation.push(rain(di, hr)); H.weather_code.push(code(di, hr));
    H.uv_index.push(uv(di, hr)); H.wind_speed_10m.push(10); H.wind_gusts_10m.push(gust(di, hr)); H.is_day.push(hr >= 6 && hr <= 18 ? 1 : 0);
  }
  const agg = (di, f, red) => red(...Array.from({ length: 24 }, (_, hr) => f(di, hr)));
  const D = { time: DAYS, weather_code: DAYS.map((_, di) => agg(di, code, Math.max)), temperature_2m_max: DAYS.map((_, di) => agg(di, feels, Math.max) - 2), temperature_2m_min: DAYS.map((_, di) => agg(di, feels, Math.min) - 2),
    apparent_temperature_max: DAYS.map((_, di) => agg(di, feels, Math.max)), apparent_temperature_min: DAYS.map((_, di) => agg(di, feels, Math.min)), uv_index_max: DAYS.map((_, di) => agg(di, uv, Math.max)),
    precipitation_sum: DAYS.map((_, di) => agg(di, rain, (...a) => a.reduce((s, v) => s + v, 0))), precipitation_probability_max: DAYS.map(() => 20), wind_speed_10m_max: DAYS.map(() => 15), wind_gusts_10m_max: DAYS.map((_, di) => agg(di, gust, Math.max)),
    sunrise: DAYS.map(d => `${d}T05:30`), sunset: DAYS.map(d => `${d}T18:40`) };
  return { latitude: -23.55, longitude: -46.63, timezone: 'America/Sao_Paulo', utc_offset_seconds: offset, hourly: { time, ...H }, daily: D };
}
