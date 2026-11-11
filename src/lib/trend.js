// Peso tendência: média móvel exponencial que esconde a oscilação diária de água.
import { diffDays } from './dates.js';

export const ALPHA = 0.1; // por dia

/**
 * weights: [{ date, kg }] em qualquer ordem.
 * Retorna [{ date, kg, trend }] em ordem de data. Dias sem pesagem contam:
 * o fator é ajustado pelo intervalo, então pesar a cada 3 dias não distorce a curva.
 */
export function trendSeries(weights, alpha = ALPHA) {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  let prev = null;
  return sorted.map(w => {
    let trend = w.kg;
    if (prev) {
      const gap = Math.max(1, diffDays(prev.date, w.date));
      const a = 1 - (1 - alpha) ** gap;
      trend = prev.trend + a * (w.kg - prev.trend);
    }
    prev = { date: w.date, trend };
    return { date: w.date, kg: w.kg, trend };
  });
}

export const latestTrend = series => (series.length ? series[series.length - 1].trend : null);
