// Histórico do clima e análises dos hábitos. Um resumo por dia do que o app usou (condições,
// classificação, orientação e meta de líquidos) e frases calculadas dos registros reais da pessoa.
// As análises são associações nos registros, não causas, e só aparecem com dados suficientes.
import { classify, alerts, hydrationTip } from './environment.js';
import { dayTotal } from './hydration.js';
import { addDays } from './dates.js';
import { temp } from './units.js';

const r1 = v => (v == null ? null : Math.round(v * 10) / 10);

/** Resumo de hoje para guardar. A meta estimada é sempre null: o clima não muda a meta. */
export function dayRecord(ctx, { place = '', goal = null, restricted = false } = {}) {
  const d = ctx?.todayDay;
  if (!d) return null;
  const hours = ctx.hours.filter(h => h.date === ctx.today);
  const hums = hours.map(h => h.humidity).filter(v => v != null);
  return {
    date: ctx.today, place, tz: ctx.tz,
    max: r1(d.max), min: r1(d.min), feelsMax: r1(d.feelsMax), humidityMin: hums.length ? Math.min(...hums) : null,
    uvMax: r1(d.uvMax), aqiMax: d.aqiMax ?? (ctx.air?.aqi ?? null), rainSum: r1(d.rainSum),
    cls: classify(ctx).map(c => c.id), alerts: alerts(ctx).map(a => a.id.slice(11)),
    tip: hydrationTip(ctx, { restricted })?.text ?? null,
    goal, estimatedGoal: null,
  };
}

const HOT = 27;
const avg = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (n, d) => Math.round((n / d) * 100);
const L = ml => `${String(Math.round(ml / 100) / 10).replace('.', ',')} L`;
const PERIOD = h => (h < 12 ? 'de manhã' : h < 18 ? 'à tarde' : 'à noite');
const OUTDOOR_NAMES = { caminhada: 'caminhadas', corrida: 'corridas', ciclismo: 'pedaladas' };

/**
 * Frases sobre os últimos `days` dias. Cada uma traz a base ("8 de 10 dias quentes"). Pede pelo
 * menos 3 dias em cada grupo comparado.
 */
export function insights({ history = {}, drinks = [], legacy = {}, goalFor, activities = [], today, days = 30 }) {
  const out = [];
  const since = addDays(today, -days);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, -i - 1)).filter(d => d >= since);   // dias completos, sem hoje
  const intake = d => dayTotal(drinks, legacy, d).total;
  const logged = dates.filter(d => intake(d) > 0);

  // Meta de líquidos nos dias quentes.
  const hot = logged.filter(d => (history[d]?.feelsMax ?? -99) >= HOT);
  if (hot.length >= 3) {
    const met = hot.filter(d => intake(d) >= (history[d]?.goal ?? goalFor(d))).length;
    out.push({ id: 'calor-meta', text: `Você atingiu a meta de líquidos em ${pct(met, hot.length)}% dos dias quentes dos últimos ${days} dias.`, base: `${met} de ${hot.length} dias com sensação térmica de ${temp(HOT)} ou mais` });
  }
  // Consumo em dias quentes e amenos.
  const mild = logged.filter(d => history[d]?.feelsMax != null && history[d].feelsMax < HOT);
  if (hot.length >= 3 && mild.length >= 3) {
    const a = avg(hot.map(intake)), b = avg(mild.map(intake));
    if (Math.abs(a - b) >= 100) out.push({ id: 'calor-consumo', text: `Nos dias quentes você bebeu em média ${L(a)}; nos mais amenos, ${L(b)}.`, base: `${hot.length} dias quentes e ${mild.length} amenos com registro` });
  }
  // Consumo em dias com e sem atividade.
  const doneDates = new Set(activities.filter(a => a.status === 'feita' && a.date >= since && a.date < today).map(a => a.date));
  const withAct = logged.filter(d => doneDates.has(d)), without = logged.filter(d => !doneDates.has(d));
  if (withAct.length >= 3 && without.length >= 3) {
    const a = avg(withAct.map(intake)), b = avg(without.map(intake));
    if (Math.abs(a - b) >= 100) out.push({ id: 'atividade-consumo', text: `Nos dias com atividade física registrada, você bebeu em média ${L(a)}; nos outros, ${L(b)}.`, base: `${withAct.length} dias com atividade e ${without.length} sem` });
  }
  // Horário preferido para atividades ao ar livre.
  for (const [type, plural] of Object.entries(OUTDOOR_NAMES)) {
    const done = activities.filter(a => a.status === 'feita' && a.type === type && a.date >= since);
    if (done.length < 3) continue;
    const by = {};
    for (const a of done) { const p = PERIOD(Number(a.start.slice(0, 2))); by[p] = (by[p] ?? 0) + 1; }
    const [period, n] = Object.entries(by).sort((x, y) => y[1] - x[1])[0];
    if (n / done.length >= 0.6) out.push({ id: `horario-${type}`, text: `Você costuma fazer ${plural} ${period}.`, base: `${n} de ${done.length} registradas nos últimos ${days} dias` });
  }
  // Atividades feitas em horários com alerta de calor.
  const hotActs = activities.filter(a => a.status === 'feita' && a.date >= since && a.weather?.level && ['warn', 'danger'].includes(a.weather.level));
  if (hotActs.length >= 2) out.push({ id: 'treino-alerta', text: `${hotActs.length} atividades suas nos últimos ${days} dias foram em horários com atenção pelo clima.`, base: 'Pela previsão no momento do registro' });
  return out;
}
