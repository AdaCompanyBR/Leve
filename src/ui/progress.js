// Tela Progresso: peso real e tendência, projeção, "e se", saldo da semana e gasto adaptativo.
import { h, icon, int, dec1, toast, confirmSheet } from './dom.js';
import { weightSheet } from './today.js';
import { state, getPlan, series, budgetFor, adaptiveStatus, acceptTdee, declineTdee, removeWeight } from '../store.js';
import { etaDate, MAX_DEFICIT_RATIO } from '../lib/calc.js';
import { MIN_DAYS } from '../lib/adaptive.js';
import { todayISO, addDays, diffDays, fmtDate, fromISO } from '../lib/dates.js';
import { climateHabitsCard } from './insights.js';
import { weight, weightNum, weightDelta, weightUnit } from '../lib/units.js';

const longDate = iso => fmtDate(iso, { day: 'numeric', month: 'long', year: 'numeric' });
let whatIf = 0;

function chart(points, plan, eta) {
  const narrow = innerWidth < 720;
  const W = narrow ? 350 : 640, H = narrow ? 230 : 260, pad = { l: 40, r: 10, t: 16, b: 30 };
  const today = todayISO();
  const start = points[0].date;
  const horizon = eta && diffDays(today, eta) <= 400 ? eta : addDays(today, 30);
  const end = diffDays(start, horizon) < 14 ? addDays(start, 14) : horizon;
  const span = diffDays(start, end);
  const hasGoal = plan.mode !== 'menor' && plan.goal === 'perder';
  const ys = [...points.map(p => p.kg), ...points.map(p => p.trend), ...(hasGoal ? [plan.goalKg] : [])];
  const lo = Math.floor(Math.min(...ys) - 0.5), hi = Math.ceil(Math.max(...ys) + 0.5);
  const x = d => pad.l + (diffDays(start, d) / span) * (W - pad.l - pad.r);
  const y = kg => pad.t + ((hi - kg) / (hi - lo)) * (H - pad.t - pad.b);
  const last = points[points.length - 1];
  const ticks = [lo, (lo + hi) / 2, hi];
  const short = iso => fmtDate(iso, { day: 'numeric', month: 'short' }).replace('.', '');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.trend).toFixed(1)}`).join('');
  const showToday = x(today) - x(start) > 60 && x(end) - x(today) > 60;
  const label = `Gráfico de peso. Tendência atual ${weight(last.trend)}${hasGoal ? `, meta ${weight(plan.goalKg)}` : ''}${eta ? `, chegada prevista em ${longDate(eta)}` : ''}.`;
  const t = document.createElement('template');
  t.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
    <title>${label}</title>
    ${ticks.map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${weightNum(t)}</text>`).join('')}
    ${hasGoal ? `<line class="goal" x1="${pad.l}" x2="${W - pad.r}" y1="${y(plan.goalKg)}" y2="${y(plan.goalKg)}"/>
    <text class="goal-label" x="${pad.l + 4}" y="${y(plan.goalKg) - 7}">Meta ${weight(plan.goalKg)}</text>` : ''}
    ${eta && last.trend > plan.goalKg ? `<line class="projection" x1="${x(last.date)}" y1="${y(last.trend)}" x2="${x(end === eta ? eta : end)}" y2="${end === eta ? y(plan.goalKg) : y(last.trend - ((last.trend - plan.goalKg) * diffDays(last.date, end)) / Math.max(1, diffDays(last.date, eta)))}"/>` : ''}
    ${points.map(p => `<circle class="dot" cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="3"/>`).join('')}
    <path class="trend" d="${path}"/>
    <circle class="trend-head" cx="${x(last.date)}" cy="${y(last.trend)}" r="5.500"/>
    <text class="axis" x="${pad.l}" y="${H - 8}">${short(start)}</text>
    ${showToday ? `<text class="axis" x="${x(today)}" y="${H - 8}" text-anchor="middle">hoje</text>` : ''}
    <text class="axis" x="${W - pad.r}" y="${H - 8}" text-anchor="end">${short(end)}</text>
  </svg>`;
  return t.content.firstChild;
}

export function progressScreen() {
  const plan = getPlan();
  const pts = series();
  const today = todayISO();
  const last = pts[pts.length - 1];
  const first = pts[0];
  const trend = last?.trend ?? state.profile.weightKg;
  const deficitMode = plan.mode === 'deficit';
  const eta = deficitMode ? etaDate(trend, plan.goalKg, plan.deficit, today) : null;

  // ----- Peso -----
  const chartEl = pts.length ? chart(pts, plan, eta) : null;
  const change = last && first ? last.trend - first.trend : 0;
  const weightCard = h('section.card.weight-card', { 'aria-label': 'Peso' },
    h('div.weight-head',
      h('div', h('span.stat-label', 'Peso tendência'), h('div.weight-now', h('span.weight-num', weightNum(trend)), h('span.weight-unit', weightUnit()))),
      h('button.btn.tonal', { onclick: () => weightSheet() }, icon('scale'), 'Registrar peso')),
    pts.length > 1
      ? h('p.card-sub', `${change <= 0 ? 'Menos' : 'Mais'} ${weightDelta(Math.abs(change))} desde ${fmtDate(first.date)}.${deficitMode && plan.goal === 'perder' ? ` Faltam ${weightDelta(Math.max(0, trend - plan.goalKg))} para a meta.` : ''}`)
      : h('p.card-sub', 'Com mais pesagens, a linha de tendência aparece e esconde a oscilação diária de água.'),
    chartEl,
    h('div.legend', h('span.lg.lg-trend', 'Tendência'), h('span.lg.lg-dot', 'Pesagens'), eta ? h('span.lg.lg-proj', 'Projeção') : null));

  // ----- Data de chegada e "e se" -----
  let etaCard;
  if (deficitMode) {
    const minTarget = Math.max(plan.floor, Math.round(plan.tdee * (1 - MAX_DEFICIT_RATIO)));
    const minDelta = Math.ceil((minTarget - plan.target) / 50) * 50;
    const maxDelta = Math.floor(Math.min(400, plan.deficit - 50) / 50) * 50;
    whatIf = Math.max(minDelta, Math.min(maxDelta, whatIf));
    const out = h('div.whatif-out', { 'aria-live': 'polite' });
    const slider = h('input.slider', { type: 'range', min: minDelta, max: Math.max(maxDelta, 0), step: 50, value: whatIf, 'aria-label': 'E se eu mudar as calorias por dia?' });
    const paint = () => {
      whatIf = Number(slider.value);
      const e2 = etaDate(trend, plan.goalKg, plan.deficit - whatIf, today);
      const diff = eta && e2 ? diffDays(eta, e2) : 0;
      slider.style.setProperty('--fill', ((whatIf - minDelta) / Math.max(1, maxDelta - minDelta)) * 100 + '%');
      out.replaceChildren(
        h('p.whatif-title', whatIf === 0 ? 'No plano atual' : `Comendo ${int(Math.abs(whatIf))} kcal a ${whatIf < 0 ? 'menos' : 'mais'} por dia`),
        h('p.whatif-date', e2 ? longDate(e2) : 'Sem previsão'),
        h('p.card-sub', whatIf === 0 ? `Meta de ${int(plan.target)} kcal por dia.` : `Meta de ${int(plan.target + whatIf)} kcal. ${diff === 0 ? 'A data não muda.' : `${Math.abs(diff)} dias ${diff < 0 ? 'antes' : 'depois'}.`}`));
    };
    slider.addEventListener('input', paint);
    paint();
    etaCard = h('section.card.eta-card', { 'aria-label': 'Data de chegada' },
      h('h3', 'Data de chegada'),
      out,
      minDelta < maxDelta ? [slider, h('div.slider-ends', h('span', `${int(Math.abs(minDelta))} kcal ${minDelta < 0 ? 'a menos' : 'a mais'}`), h('span', `${int(maxDelta)} kcal a mais`))] : null,
      minDelta >= 0 ? h('p.card-sub', 'Sua meta já está no limite seguro, então o controle só permite comer mais.') : null,
      h('p.fine', 'A projeção usa o peso tendência e 7.700 kcal por quilo. É uma estimativa, não uma promessa.'));
  } else {
    etaCard = h('section.card.eta-card', h('h3', plan.mode === 'menor' || plan.goal === 'perder' ? 'Data de chegada' : 'Como acompanhar'),
      h('p.card-sub', {
        menor: 'O Leve não projeta mudanças de peso para menores de 18 anos.',
        superavit: 'Para ganhar massa, o peso deve subir devagar. Se a tendência subir rápido, diminua o superávit; se ficar parada por três semanas, aumente um pouco.',
        recomposicao: 'Definir mexe pouco na balança: a gordura cai enquanto os músculos se mantêm. Acompanhe a tendência e, se puder, a medida da cintura.',
        manutencao: plan.goal === 'perder' ? 'Você está no peso-alvo. A meta diária agora é de manutenção.' : plan.goal === 'saude' ? 'O foco é a rotina de hábitos, não a balança. A meta de calorias é o seu gasto.' : 'Se a tendência se mantiver estável, o plano está certo.',
      }[plan.mode]));
  }

  // ----- Saldo da semana -----
  const b = budgetFor(today);
  let weekCard = null;
  if (b) {
    const maxK = Math.max(plan.target * 1.3, ...b.days.map(d => d.kcal));
    const names = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
    weekCard = h('section.card.week-card', { 'aria-label': 'Saldo da semana' },
      h('h3', 'Saldo da semana'),
      h('div.week-balance', h('span.weight-num', int(Math.abs(b.balance))), h('span.weight-unit', b.balance >= 0 ? 'kcal disponíveis até domingo' : 'kcal acima do saldo')),
      h('div.week-bars', { role: 'img', 'aria-label': b.days.filter(d => d.logged).map(d => `${fmtDate(d.date, { weekday: 'long' })}: ${int(d.kcal)} kcal`).join('. ') || 'Sem registros nesta semana' },
        (() => { const el = h('span.week-target'); el.style.setProperty('--t', (plan.target / maxK).toFixed(3)); return el; })(),
        b.days.map((d, i) => h('div.week-day' + (d.isToday ? '.is-today' : ''),
          h('span.week-bar' + (d.logged ? '' : '.none'), { style: { height: `${d.logged ? Math.max(4, (d.kcal / maxK) * 100) : 0}%` } }),
          h('span.week-name', names[i])))),
      h('p.card-sub', b.adjusted ? `A meta de hoje ficou em ${int(b.todayTarget)} kcal para equilibrar a semana. Ela nunca passa abaixo de ${int(plan.floor)} kcal.` : `Sua semana tem ${int(b.weekly)} kcal. A linha marca a meta diária de ${int(plan.target)} kcal.`));
  }

  // ----- Gasto adaptativo -----
  const a = adaptiveStatus();
  let adaptiveCard = null;
  if (a) {
    const e = a.estimate;
    let body;
    if (a.propose) {
      const lost = -e.deltaKg;
      body = [
        h('p.adaptive-lead', `Seu gasto real parece ser de ${int(e.tdee)} kcal por dia, e não ${int(plan.tdee)}.`),
        h('p.card-sub', `Em ${e.days} dias você comeu em média ${int(e.avgIntake)} kcal por dia e o peso tendência ${lost >= 0 ? 'caiu' : 'subiu'} ${weightDelta(Math.abs(lost))}. A conta: (calorias ingeridas ${lost >= 0 ? '+' : '−'} ${dec1(Math.abs(lost))} kg × 7.700) ÷ ${e.days} dias.`),
        h('p.card-sub', 'Aceitando, a meta diária é recalculada com esse gasto, com as mesmas travas de segurança.'),
        h('div.sheet-actions',
          h('button.btn.ghost', { onclick: () => declineTdee(e.tdee) }, 'Manter como está'),
          h('button.btn.primary', { onclick: async () => { await acceptTdee(e.tdee); toast('Meta atualizada'); } }, 'Usar o novo gasto'))];
    } else if (e) {
      body = h('p.card-sub', `Seu gasto medido (${int(e.tdee)} kcal por dia) está alinhado com o plano. Nada a mudar.`);
    } else {
      const have = Math.min(MIN_DAYS, pts.length > 1 ? diffDays(pts[0].date, pts[pts.length - 1].date) : 0);
      body = [h('p.card-sub', `Com ${MIN_DAYS} dias de registros e pesagens, o Leve calcula o seu gasto real e sugere um ajuste na meta.`),
        h('div.bar', { role: 'progressbar', 'aria-label': 'Dias de dados', 'aria-valuemin': 0, 'aria-valuemax': MIN_DAYS, 'aria-valuenow': have }, h('span', { style: { width: (have / MIN_DAYS) * 100 + '%' } })),
        h('p.fine', `${have} de ${MIN_DAYS} dias entre a primeira e a última pesagem. Registre as refeições na maioria dos dias.`)];
    }
    adaptiveCard = h('section.card.adaptive-card', { 'aria-label': 'Gasto adaptativo' }, h('h3', 'Gasto adaptativo'), body,
      plan.adapted ? h('p.fine', `Em uso: ${int(plan.tdee)} kcal (medido). Pela fórmula seriam ${int(plan.formulaTdee)} kcal.`) : null);
  }

  // ----- Histórico -----
  const history = [...pts].reverse().slice(0, 8);
  const historyCard = history.length ? h('section.card', { 'aria-label': 'Pesagens' }, h('h3', 'Pesagens'),
    h('ul.history', history.map(p => h('li',
      h('span.history-date', fmtDate(p.date, { day: 'numeric', month: 'short', weekday: 'short' })),
      h('span.history-kg', weight(p.kg)),
      h('button.icon-btn.small', { 'aria-label': `Apagar a pesagem de ${fmtDate(p.date)}`, onclick: () => confirmSheet({ title: 'Apagar pesagem?', message: `${weight(p.kg)} em ${fmtDate(p.date)}.`, confirmLabel: 'Apagar', onConfirm: () => removeWeight(p.date) }) }, icon('trash')))))) : null;

  return h('div.screen.progress',
    h('header.screen-head', h('div', h('p.screen-date', fromISO(today).getFullYear()), h('h1', 'Progresso'))),
    h('div.progress-grid',
      h('div.col.col-wide', weightCard, weekCard),
      h('div.col', etaCard, adaptiveCard, climateHabitsCard(), historyCard)));
}
