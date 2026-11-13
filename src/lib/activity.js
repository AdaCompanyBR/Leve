// Atividade física e clima: avalia o horário planejado (ou feito) de uma atividade com a previsão
// daquelas horas e devolve um nível, os motivos e a orientação. Informa, não bloqueia, e nunca
// declara o horário "seguro": sem alerta quer dizer só que nenhuma faixa de atenção foi atingida.
//
// Regras (o calor usa as faixas do NWS/NOAA de environment.js, deslocadas pela intensidade; o
// Colégio Americano de Medicina do Esporte, ACSM, recomenda reduzir a intensidade ou mudar o
// horário quanto mais quente e mais intenso o exercício):
// - Leve:      atenção a partir de 32 °C de sensação, desfavorável a partir de 39 °C.
// - Moderada:  cuidado a partir de 27 °C, atenção a partir de 32 °C, desfavorável a partir de 39 °C.
// - Intensa:   atenção a partir de 27 °C, desfavorável a partir de 32 °C.
// - 60 minutos ou mais com sensação de 27 °C ou mais: pelo menos "atenção".
// - UV (ao ar livre): cuidado a partir de 6, atenção a partir de 8 (OMS).
// - Ar (AQI da EPA): a partir de 101, atenção para moderada e intensa e cuidado para leve;
//   a partir de 151, desfavorável.
// - Tempestade: desfavorável. Chuva forte (7,6 mm/h) e rajadas de 62 km/h: atenção
//   (desfavorável para ciclismo com rajada forte). Chance de chuva de 60% ou mais: cuidado.
import { STORM_CODES, HEAVY_RAIN_MM_H, STRONG_GUST_KMH, bestHours, rangeText } from './environment.js';

export const ACTIVITY_TYPES = [
  { id: 'caminhada', label: 'Caminhada', outdoor: true, intensity: 'leve', icon: 'walk' },
  { id: 'corrida', label: 'Corrida', outdoor: true, intensity: 'intensa', icon: 'run' },
  { id: 'ciclismo', label: 'Ciclismo', outdoor: true, intensity: 'moderada', icon: 'bike' },
  { id: 'treino-livre', label: 'Treino ao ar livre', outdoor: true, intensity: 'moderada', icon: 'spark' },
  { id: 'musculacao', label: 'Musculação', outdoor: false, intensity: 'moderada', icon: 'dumbbell' },
  { id: 'outro', label: 'Outra atividade', outdoor: true, intensity: 'moderada', icon: 'spark' },
];
export const typeById = id => ACTIVITY_TYPES.find(t => t.id === id) ?? ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
export const INTENSITIES = [{ id: 'leve', label: 'Leve' }, { id: 'moderada', label: 'Moderada' }, { id: 'intensa', label: 'Intensa' }];
export const DURATIONS = [15, 30, 45, 60, 90];

const ORDER = ['ok', 'caution', 'warn', 'danger'];
const worse = (a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);
export const LEVEL_LABEL = { ok: 'Sem alerta', caution: 'Com cuidado', warn: 'Atenção', danger: 'Desfavorável', unknown: 'Sem previsão', indoor: 'Local fechado' };
const HEAT_BY_INTENSITY = {
  leve: [[39, 'danger'], [32, 'warn']],
  moderada: [[39, 'danger'], [32, 'warn'], [27, 'caution']],
  intensa: [[32, 'danger'], [27, 'warn']],
};

const toMin = hhmm => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fmt = n => Math.round(n);

/** Horas da previsão que a atividade ocupa (da hora de início até a hora em que termina). */
export function windowHours(ctx, act) {
  const startMin = toMin(act.start), endMin = startMin + Math.max(1, act.minutes || 30);
  const first = Math.floor(startMin / 60), last = Math.floor((endMin - 1) / 60);
  return ctx.hours.filter(h => h.date === act.date && h.hour >= first && h.hour <= Math.min(23, last));
}

/**
 * Avalia o horário da atividade. Devolve { level, label, reasons, text, tips, forecast, better }.
 * `restricted` (orientação médica para limitar líquidos) troca a dica de água.
 */
export function assessActivity(ctx, act, { restricted = false } = {}) {
  const type = typeById(act.type), name = type.label.toLowerCase();
  const water = restricted ? 'Siga a orientação do seu médico sobre líquidos' : 'Leve água e beba ao longo da atividade';
  if (!ctx) return { level: 'unknown', label: LEVEL_LABEL.unknown, reasons: [], text: 'Defina a sua localização para ver o clima previsto para esse horário.', tips: [water] };
  const hours = windowHours(ctx, act);
  if (!hours.length) return { level: 'unknown', label: LEVEL_LABEL.unknown, reasons: [], text: 'A previsão ainda não cobre esse dia e horário. Volte mais perto da data.', tips: [water] };
  const max = k => { const v = hours.map(h => h[k]).filter(x => x != null); return v.length ? Math.max(...v) : null; };
  const f = { feels: max('feels'), temp: max('temp'), uv: max('uv'), aqi: max('aqi'), rain: max('rain'), rainProb: max('rainProb'), gust: max('gust'), storm: hours.some(h => STORM_CODES.includes(h.code)) };
  const outdoor = act.outdoor ?? type.outdoor;
  if (!outdoor) {
    const hot = f.feels != null && f.feels >= 32;
    return { level: 'indoor', label: LEVEL_LABEL.indoor, reasons: [], forecast: f,
      text: hot ? `Lá fora a sensação térmica deve chegar a ${fmt(f.feels)} °C. Em local fechado, prefira um ambiente ventilado ou com ar-condicionado.` : 'Atividade em local fechado: o clima de fora pesa menos. Prefira um ambiente ventilado.',
      tips: [water, 'Pare se sentir tontura, náusea ou cansaço fora do normal'] };
  }
  let level = 'ok';
  const reasons = [];
  const intensity = act.intensity ?? type.intensity;
  if (f.feels != null) {
    const hit = HEAT_BY_INTENSITY[intensity]?.find(([min]) => f.feels >= min);
    if (hit) { level = worse(level, hit[1]); reasons.push(`sensação térmica de até ${fmt(f.feels)} °C`); }
    if ((act.minutes ?? 0) >= 60 && f.feels >= 27) { level = worse(level, 'warn'); if (!hit) reasons.push(`sensação térmica de até ${fmt(f.feels)} °C por ${act.minutes} minutos`); }
  }
  if (f.uv != null && f.uv >= 5.5) { level = worse(level, f.uv >= 7.5 ? 'warn' : 'caution'); reasons.push(`índice UV de até ${fmt(f.uv)}`); }
  if (f.aqi != null && f.aqi >= 101) { level = worse(level, f.aqi >= 151 ? 'danger' : intensity === 'leve' ? 'caution' : 'warn'); reasons.push(`qualidade do ar ${f.aqi >= 151 ? 'ruim' : 'ruim para grupos sensíveis'} (AQI ${fmt(f.aqi)})`); }
  if (f.storm) { level = worse(level, 'danger'); reasons.push('tempestade prevista'); }
  else if (f.rain != null && f.rain >= HEAVY_RAIN_MM_H) { level = worse(level, 'warn'); reasons.push('chuva forte'); }
  else if (f.rainProb != null && f.rainProb >= 60) { level = worse(level, 'caution'); reasons.push(`${fmt(f.rainProb)}% de chance de chuva`); }
  if (f.gust != null && f.gust >= STRONG_GUST_KMH) { level = worse(level, act.type === 'ciclismo' ? 'danger' : 'warn'); reasons.push(`rajadas de vento de até ${fmt(f.gust)} km/h`); }

  // Outros horários do mesmo dia que não pegam as faixas de atenção.
  const b = bestHours(ctx, act.date);
  const startH = Math.floor(toMin(act.start) / 60);
  const better = b?.ranges.filter(r => !(startH >= r.from && startH <= r.to)) ?? [];
  // Sem horário melhor no mesmo dia, procura no dia seguinte (do nascer do sol em diante).
  const nextDay = ctx.days[ctx.days.findIndex(d => d.date === act.date) + 1];
  const tomorrow = !better.length && nextDay ? bestHours(ctx, nextDay.date, { fromNow: false })?.ranges ?? [] : [];
  const move = better.length ? `Considere transferir para ${better.map(rangeText).join(' ou ')}, quando a previsão está melhor.`
    : tomorrow.length ? `Hoje não há horário melhor na previsão. Considere o dia seguinte, ${tomorrow.map(rangeText).join(' ou ')}, ou uma atividade em local fechado.`
      : 'Se der, troque por uma atividade em local fechado ou por outro dia.';
  const why = reasons.length ? reasons.join(', ') : '';
  const text = {
    danger: `Condições desfavoráveis para ${name} neste horário: ${why}. ${move}`,
    warn: `Atenção para ${name} neste horário: ${why}. ${move} Se mantiver, reduza a intensidade e faça pausas.`,
    caution: `Dá para fazer, com cuidado: ${why}.`,
    ok: 'Nenhuma faixa de atenção prevista para esse horário. Isso não quer dizer que não haja risco: ouça o seu corpo.',
  }[level];
  const tips = [water];
  if (f.uv != null && f.uv >= 2.5) tips.push('Protetor solar, boné e óculos de sol');
  if (f.feels != null && f.feels >= 27) tips.push('Roupas leves e claras; procure trechos com sombra');
  if (f.aqi != null && f.aqi >= 101) tips.push('Evite vias com trânsito intenso');
  tips.push('Pare se sentir tontura, náusea, dor de cabeça ou cansaço fora do normal');
  return { level, label: LEVEL_LABEL[level], reasons, text, tips, forecast: f, better, tomorrow };
}

/** Orientações depois da atividade (sem calcular suor ou eletrólitos). */
export function afterAdvice(act, ctx, { restricted = false } = {}) {
  const hours = ctx ? windowHours(ctx, act) : [];
  const hot = hours.some(h => h.feels != null && h.feels >= 27);
  const out = [restricted ? 'Hidratação: siga a orientação do seu médico sobre líquidos.' : 'Hidrate-se: registre o que beber na aba Líquidos.'];
  if (hot && (act.outdoor ?? typeById(act.type).outdoor)) out.push('Você se exercitou no calor: descanse num lugar fresco e com sombra.');
  out.push('Recuperação: alongue-se com calma e dê um tempo para o corpo antes do próximo treino intenso.');
  out.push('Alimentação: registre a refeição ou o lanche depois do treino, dentro das suas metas do dia.');
  return out;
}

/** Próxima atividade planejada a partir de agora (data e hora locais). */
export function nextActivity(list, date, time) {
  return [...list].filter(a => a.status !== 'feita' && (a.date > date || (a.date === date && a.start >= time.slice(0, 5))))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0] ?? null;
}
