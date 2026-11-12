// Objetivo e rotina: cartão do dia, escolha do objetivo e prévia da rotina.
import { h, icon, int, openSheet, toast, haptic } from './dom.js';
import { go } from './state.js';
import { state, getPlan, getRoutine, routineStatus, toggleRoutineCheck, saveProfile } from '../store.js';
import { GOALS, PACES, GAIN_PACES, goalById } from '../lib/calc.js';
import { MEAL_COUNTS, WAKE_TIMES, weekCount } from '../lib/routine.js';
import { todayISO } from '../lib/dates.js';

const hour = t => t.replace(':00', 'h').replace(':', 'h');

/** Lista de refeições com horário, calorias e proteína (prévia ou cartão do dia). */
export function scheduleList(items, { onPick } = {}) {
  return h('ol.rt-meals', items.map(s => {
    const body = [
      h('span.rt-time', hour(s.time)),
      h('span.rt-meal', s.label, s.kcal ? h('span.rt-sub', `≈ ${int(s.kcal)} kcal${s.protein ? ` · ${int(s.protein)} g de proteína` : ''}`) : null),
      s.done != null ? h('span.rt-tick' + (s.done ? '.on' : ''), { 'aria-hidden': 'true' }, s.done ? icon('check') : null) : null,
    ];
    const label = `${s.label} às ${hour(s.time)}${s.kcal ? `, cerca de ${int(s.kcal)} kcal` : ''}${s.done != null ? (s.done ? ', registrado' : ', ainda não registrado') : ''}`;
    return h('li', onPick ? h('button.rt-row', { type: 'button', 'aria-label': `${label}. Registrar`, onclick: () => onPick(s) }, body) : h('div.rt-row', { 'aria-label': label }, body));
  }));
}

/** Prévia da rotina: foco, refeições e hábitos. */
export function routinePreview(routine) {
  return h('div.rt-preview',
    h('p.rt-focus', routine.focus),
    h('h3.rt-h', 'Refeições'),
    scheduleList(routine.schedule),
    h('h3.rt-h', 'Hábitos'),
    h('ul.rt-habits.preview', routine.habits.map(x => h('li', h('span.rt-dot', { 'aria-hidden': 'true' }), h('span', h('b', x.label), h('span.rt-sub', x.detail))))));
}

/** Cartão "Sua rotina" na tela Hoje. */
export function routineCard(date) {
  const routine = getRoutine();
  if (!routine) return null;
  if (!state.profile.goal) {
    return h('button.card.nudge.rt-nudge', { onclick: () => goalWizard() },
      icon('progress'), h('span.nudge-text', h('b', 'Qual é o seu objetivo?'), h('span', 'Perder peso, ganhar massa, manter ou comer melhor: o Leve monta a sua rotina.')), icon('next'));
  }
  const st = routineStatus(date, routine);
  const isToday = date === todayISO();
  const weekly = x => (x.perWeek ? weekCount(d => {
    if (x.auto === 'peso') return state.weights.some(w => w.date === d);
    return !!state.routine[d]?.[x.id];
  }, date) : null);
  return h('section.card.routine', { 'aria-label': 'Sua rotina' },
    h('header.rt-head',
      h('div', h('h3', 'Sua rotina'), h('p.card-sub', goalById(routine.goal).label)),
      h('span.rt-count', { 'aria-label': `${st.done} de ${st.total} itens feitos` }, h('b', st.done), ` de ${st.total}`)),
    h('div.bar.rt-bar', { role: 'progressbar', 'aria-label': 'Rotina do dia', 'aria-valuemin': 0, 'aria-valuemax': st.total, 'aria-valuenow': st.done }, h('span', { style: { width: (st.done / st.total) * 100 + '%' } })),
    scheduleList(st.schedule, { onPick: s => go('registrar', { meal: s.meal, date }) }),
    h('ul.rt-habits', st.habits.map(x => {
      const n = weekly(x);
      const sub = [x.auto ? 'O app marca sozinho' : null, n != null ? `${n} de ${x.perWeek} na semana` : null].filter(Boolean).join(' · ');
      const inner = [
        h('span.rt-box' + (x.done ? '.on' : ''), { 'aria-hidden': 'true' }, x.done ? icon('check') : null),
        h('span.rt-text', h('span.rt-label', x.label), sub ? h('span.rt-sub', sub) : null),
      ];
      return h('li', x.auto
        ? h('div.rt-habit.auto', { role: 'checkbox', 'aria-checked': String(x.done), 'aria-disabled': 'true', 'aria-label': `${x.label}. ${sub}` }, inner)
        : h('button.rt-habit', { type: 'button', role: 'checkbox', 'aria-checked': String(x.done), onclick: () => { haptic(); toggleRoutineCheck(date, x.id); } }, inner));
    })),
    h('div.rt-foot',
      h('button.link', { onclick: () => routineSheet() }, 'Ver a rotina completa'),
      isToday ? null : h('span.rt-sub', 'Marcando um dia anterior')));
}

/** Sheet com a rotina completa e o botão para mudar. */
export function routineSheet() {
  const routine = getRoutine();
  const sheet = openSheet({ title: `Rotina: ${goalById(routine.goal).label}`, wide: true, content: [
    routinePreview(routine),
    h('p.fine', 'Os hábitos seguem recomendações gerais de saúde (OMS e Guia Alimentar para a População Brasileira). O Leve não substitui médico, nutricionista ou profissional de educação física.'),
    h('button.btn.tonal.block', { onclick: () => { sheet.close(); setTimeout(() => goalWizard(), 280); } }, 'Mudar objetivo ou horários'),
  ] });
}

/**
 * Escolher objetivo, ritmo, número de refeições e hora de acordar, numa sheet de passos.
 * Mostra o plano e a rotina antes de salvar.
 */
export function goalWizard({ onDone } = {}) {
  const p0 = state.profile;
  const data = { goal: p0.goal ?? 'perder', pace: p0.pace ?? 'moderado', gainPace: p0.gainPace ?? 'suave', meals: p0.meals ?? 4, wake: p0.wake ?? '07:00' };
  const body = h('div.wiz');
  let step = 0;
  const choice = (key, options, after) => h('div.choices', { role: 'radiogroup' }, options.map(o =>
    h('button.choice', { type: 'button', role: 'radio', 'aria-checked': String(data[key] === o.id), onclick: () => { data[key] = o.id; haptic(); after(); } },
      h('span.choice-label', o.label), o.hint ? h('span.choice-hint', o.hint) : null)));
  const steps = () => [
    { q: 'Qual é o seu objetivo?', body: () => choice('goal', GOALS, next) },
    data.goal === 'perder' ? { q: 'Em que ritmo?', sub: 'Ritmos suaves são mais fáceis de manter.', body: () => choice('pace', PACES, next) } : null,
    data.goal === 'ganhar' ? { q: 'Quanto acima do gasto?', sub: 'Superávits pequenos fazem o ganho ser mais músculo do que gordura.', body: () => choice('gainPace', GAIN_PACES, next) } : null,
    { q: 'Quantas refeições por dia?', sub: 'Conte lanches e ceia.', body: () => choice('meals', MEAL_COUNTS.map(n => ({ id: n, label: `${n} refeições` })), next) },
    { q: 'Que horas você costuma acordar?', sub: 'Os horários das refeições partem daqui.', body: () => choice('wake', WAKE_TIMES.map(t => ({ id: t, label: hour(t) })), next) },
  ].filter(Boolean);
  function next() { step++; paint(); }
  function paint() {
    const list = steps();
    if (step >= list.length) return summary();
    const s = list[step];
    body.replaceChildren(
      h('div.wiz-top', step > 0 ? h('button.icon-btn', { type: 'button', 'aria-label': 'Voltar', onclick: () => { step--; paint(); } }, icon('back')) : null, h('span.wiz-step', `${step + 1} de ${list.length + 1}`)),
      h('h3.wiz-q', s.q), s.sub ? h('p.card-sub', s.sub) : null, s.body());
    body.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
  }
  async function summary() {
    // Prévia com o plano novo, sem salvar ainda.
    const saved = state.profile;
    state.profile = { ...saved, ...data };
    const plan = getPlan(), routine = getRoutine();
    state.profile = saved;
    const lock = plan.locks?.includes('imc-alto') ? 'Com IMC acima de 27, somar calorias tende a virar mais gordura do que músculo. Por isso a meta fica no seu gasto. Vale considerar “Definir o corpo”.'
      : plan.locks?.includes('imc-baixo') ? 'Seu IMC está abaixo de 18,5: o Leve não corta calorias. A meta fica no seu gasto. Vale conversar com um nutricionista.'
        : plan.locks?.includes('superavit15') ? 'O superávit foi limitado a 15% do seu gasto.'
          : plan.locks?.includes('piso') ? `A meta não fica abaixo de ${int(plan.floor)} kcal por dia, o mínimo seguro.` : null;
    body.replaceChildren(
      h('div.wiz-top', h('button.icon-btn', { type: 'button', 'aria-label': 'Voltar', onclick: () => { step--; paint(); } }, icon('back')), h('span.wiz-step', `${steps().length + 1} de ${steps().length + 1}`)),
      h('h3.wiz-q', goalById(data.goal).label),
      plan.target ? h('p.wiz-kcal', h('b', int(plan.target)), ' kcal por dia') : h('p.card-sub', 'Sem meta de calorias para menores de 18 anos.'),
      lock ? h('p.reveal-foot', lock) : null,
      routinePreview(routine),
      h('button.btn.primary.block', { type: 'button', onclick: async () => {
        await saveProfile(data); haptic(12); sheet.close(); toast('Rotina pronta'); onDone?.();
      } }, 'Usar esta rotina'));
    body.querySelector('.btn.primary')?.focus({ preventScroll: true });
  }
  const sheet = openSheet({ title: 'Objetivo e rotina', wide: true, content: body });
  paint();
  return sheet;
}
