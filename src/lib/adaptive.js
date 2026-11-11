// Gasto adaptativo: estima o gasto real a partir do que foi comido e de como
// o peso tendência se moveu.
//   gasto = (calorias ingeridas - variação do peso tendência x 7.700) / dias
import { KCAL_PER_KG } from './calc.js';
import { addDays, diffDays } from './dates.js';

export const MIN_DAYS = 14;
export const WINDOW = 28;
export const MIN_LOGGED_RATIO = 0.7;

/**
 * series: saída de trendSeries. intakeByDate: { data: kcal } só com dias registrados.
 * Retorna null quando ainda não há dados suficientes.
 */
export function estimateTdee({ series, intakeByDate, today }) {
  const from = addDays(today, -WINDOW);
  const inWindow = series.filter(p => p.date >= from && p.date <= today);
  if (inWindow.length < 4) return null;
  const first = inWindow[0], last = inWindow[inWindow.length - 1];
  const days = diffDays(first.date, last.date);
  if (days < MIN_DAYS) return null;

  let sum = 0, logged = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(first.date, i);
    if (d in intakeByDate) { sum += intakeByDate[d]; logged++; }
  }
  if (logged < Math.ceil(days * MIN_LOGGED_RATIO)) return null;

  const avgIntake = sum / logged;
  const deltaKg = last.trend - first.trend;
  // Dias sem registro assumem a média dos dias registrados.
  const tdee = (avgIntake * days - deltaKg * KCAL_PER_KG) / days;
  if (!Number.isFinite(tdee) || tdee < 800 || tdee > 6000) return null;
  return { tdee: Math.round(tdee), days, logged, avgIntake: Math.round(avgIntake), deltaKg, from: first.date, to: last.date };
}

/** Só vale propor uma nova meta se a diferença for relevante (5% ou mais). */
export function shouldPropose(estimate, currentTdee) {
  return !!estimate && Math.abs(estimate.tdee - currentTdee) / currentTdee >= 0.05;
}
