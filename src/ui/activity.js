// Atividades físicas na aba Hoje: cartão com as de hoje e a próxima planejada, janela para planejar
// ou registrar (com o clima previsto para o horário, ao vivo) e as orientações depois do treino.
import { h, icon, toast, openSheet, segmented, field, haptic } from './dom.js';
import { state, activitiesOn, saveActivity, removeActivity, restoreActivity } from '../store.js';
import { todayISO, addDays, fmtDate } from '../lib/dates.js';
import { env, onEnv, location } from '../env.js';
import { ACTIVITY_TYPES, INTENSITIES, DURATIONS, typeById, assessActivity, afterAdvice, nextActivity } from '../lib/activity.js';
import { envSheet, locationSheet } from './environment.js';

const pad = n => String(n).padStart(2, '0');
const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const TONE = { ok: 'ok', caution: 'caution', warn: 'warn', danger: 'danger', unknown: '', indoor: '' };
const restricted = () => !!state.settings.fluidRestriction;
const dayName = (date, today = todayISO()) => (date === today ? 'Hoje' : date === addDays(today, 1) ? 'Amanhã' : fmtDate(date, { weekday: 'long', day: 'numeric' }));
const when = a => `${a.start.replace(':00', 'h').replace(':', 'h')} · ${a.minutes} min`;

// ---------------------------------------------------------------------------
// Cartão da aba Hoje

export function activityCard() {
  const card = h('section.card.act-card', { 'aria-label': 'Atividades' });
  const paint = () => {
    const today = todayISO();
    const todays = activitiesOn(today);
    const next = nextActivity(state.activities, today, nowHHMM());
    const list = [...todays];
    if (next && next.date !== today) list.push(next);
    card.replaceChildren(
      h('div.card-head', h('h3', 'Atividades'), h('button.btn.tonal.compact', { type: 'button', onclick: () => activitySheet({}) }, icon('plus'), 'Planejar')),
      list.length ? h('ul.act-list', list.map(a => row(a, today)))
        : h('p.card-sub', 'Planeje uma caminhada, corrida ou treino e veja o clima previsto para o horário, com o melhor momento para ir.'));
  };
  paint();
  const off = onEnv(() => { if (!card.isConnected) return off(); paint(); });
  return card;
}

function row(a, today) {
  const t = typeById(a.type);
  const done = a.status === 'feita';
  const as = done ? null : assessActivity(env.ctx, a, { restricted: restricted() });
  const late = !done && (a.date < today || (a.date === today && a.start <= nowHHMM()));
  return h('li.act-row',
    h('button.act-main', { type: 'button', onclick: () => activitySheet({ activity: a }), 'aria-label': `${t.label}, ${dayName(a.date)}, ${when(a)}${as ? `, clima: ${as.label}` : done ? ', feita' : ''}. Editar` },
      h('span.act-icon', icon(t.icon)),
      h('span.act-text', h('b', t.label), h('span', `${a.date === today ? '' : `${dayName(a.date)} · `}${when(a)}`)),
      done ? h('span.env-pill', { 'data-tone': 'ok' }, 'Feita') : h('span.env-pill', { 'data-tone': TONE[as.level] }, as.label)),
    late ? h('button.btn.tonal.compact.act-done', { type: 'button', onclick: () => markDone(a) }, 'Feita') : null);
}

async function markDone(a) {
  haptic(12);
  const row = await saveActivity({ ...a, status: 'feita' });
  afterSheet(row);
}

// ---------------------------------------------------------------------------
// Planejar ou registrar

export function activitySheet({ activity, date } = {}) {
  const editing = !!activity, today = todayISO();
  const v = {
    type: activity?.type ?? 'caminhada', date: activity?.date ?? date ?? today, start: activity?.start ?? nextHalfHour(),
    minutes: activity?.minutes ?? 30, intensity: activity?.intensity ?? typeById(activity?.type ?? 'caminhada').intensity,
    outdoor: activity?.outdoor ?? typeById(activity?.type ?? 'caminhada').outdoor, status: activity?.status ?? 'planejada', note: activity?.note ?? '',
  };
  const assessEl = h('div.act-assess', { 'aria-live': 'polite' });
  const paintAssess = () => {
    if (!location()) {
      assessEl.replaceChildren(h('p.sheet-text', 'Defina a sua localização para ver o clima previsto para o horário.'), h('button.btn.tonal.compact', { type: 'button', onclick: () => locationSheet() }, 'Definir localização'));
      return;
    }
    const a = assessActivity(env.ctx, v, { restricted: restricted() });
    const f = a.forecast;
    assessEl.dataset.tone = TONE[a.level];
    assessEl.replaceChildren(
      h('div.act-assess-head', h('span.env-pill', { 'data-tone': TONE[a.level] }, a.label), f ? h('span.act-fc', [
        f.feels != null ? `sensação ${Math.round(f.feels)}°` : null, f.uv != null ? `UV ${Math.round(f.uv)}` : null,
        f.aqi != null ? `ar ${Math.round(f.aqi)}` : null, f.rainProb != null ? `chuva ${Math.round(f.rainProb)}%` : null].filter(Boolean).join(' · ')) : null),
      h('p', a.text),
      h('ul.act-tips', a.tips.map(t => h('li', t))),
      h('button.link.inline', { type: 'button', onclick: () => envSheet() }, 'Ver o clima do dia'));
  };

  const typeChips = h('div.chip-row.act-types', { role: 'group', 'aria-label': 'Tipo de atividade' }, ACTIVITY_TYPES.map(t => h('button.chip', { type: 'button', 'aria-pressed': String(t.id === v.type), onclick: e => {
    v.type = t.id; v.intensity = t.intensity; v.outdoor = t.outdoor;
    typeChips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    intensity.setValue(v.intensity);
    place.setValue(v.outdoor ? 'fora' : 'dentro');
    paintAssess();
  } }, icon(t.icon), t.label)));

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  if (!days.includes(v.date)) days.unshift(v.date);
  const dateChips = h('div.chip-row.act-days', { role: 'group', 'aria-label': 'Dia' }, days.map(d => h('button.chip', { type: 'button', 'aria-pressed': String(d === v.date), onclick: e => {
    v.date = d; dateChips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); paintAssess();
  } }, shortDay(d))));
  const timeInput = h('input.pill-input', { type: 'time', value: v.start, 'aria-label': 'Horário', oninput: e => { v.start = e.target.value || v.start; paintAssess(); } });
  const durChips = h('div.chip-row.act-durs', { role: 'group', 'aria-label': 'Duração' }, DURATIONS.map(m => h('button.chip', { type: 'button', 'aria-pressed': String(m === v.minutes), onclick: e => {
    v.minutes = m; durChips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); paintAssess();
  } }, `${m} min`)));
  const intensity = segmented(INTENSITIES, v.intensity, id => { v.intensity = id; paintAssess(); }, 'Intensidade');
  const place = segmented([{ id: 'fora', label: 'Ao ar livre' }, { id: 'dentro', label: 'Local fechado' }], v.outdoor ? 'fora' : 'dentro', id => { v.outdoor = id === 'fora'; paintAssess(); }, 'Onde');
  const status = segmented([{ id: 'planejada', label: 'Planejada' }, { id: 'feita', label: 'Feita' }], v.status, id => { v.status = id; }, 'Situação');
  const note = h('input', { type: 'text', maxlength: 40, autocomplete: 'off', value: v.note, placeholder: 'Ex.: parque da cidade' });

  const save = async () => {
    const as = assessActivity(env.ctx, v, { restricted: restricted() });
    const row = await saveActivity({ ...(activity ?? {}), ...v, note: note.value.trim() || undefined, weather: { level: as.level, label: as.label, at: Date.now() } });
    sheet.close();
    if (row.status === 'feita' && activity?.status !== 'feita') setTimeout(() => afterSheet(row), 300);
    else toast(editing ? 'Atividade atualizada' : `${typeById(row.type).label} planejada para ${dayName(row.date).toLowerCase()}, ${when(row)}`);
  };
  const sheet = openSheet({
    title: editing ? 'Editar atividade' : 'Atividade', wide: true,
    action: { label: 'Salvar', run: save },
    content: h('div.act-form',
      h('div.field', h('label', 'O quê'), typeChips),
      h('div.field', h('label', 'Quando'), dateChips, h('div.act-time', timeInput, durChips)),
      h('div.act-two', h('div.field', h('label', 'Intensidade'), intensity), h('div.field', h('label', 'Onde'), place)),
      h('div.field', h('label', 'Clima previsto nesse horário'), assessEl),
      h('div.field', h('label', 'Situação'), status),
      field('Lugar ou nota (opcional)', note),
      editing ? h('div.chip-row', h('button.chip', { type: 'button', onclick: async () => {
        await removeActivity(activity.id); sheet.close();
        toast('Atividade apagada', { label: 'Desfazer', run: () => restoreActivity(activity) });
      } }, icon('trash'), h('span', 'Apagar'))) : null,
      h('p.fine', 'As orientações usam a previsão e regras gerais; não substituem a avaliação de um profissional de saúde ou de educação física.')),
  });
  paintAssess();
  const off = onEnv(() => { if (!assessEl.isConnected) return off(); paintAssess(); });
  return sheet;
}

/** Rótulo curto do dia para as fichas: Hoje, Amanhã, Seg 16. */
function shortDay(d, today = todayISO()) {
  if (d === today) return 'Hoje';
  if (d === addDays(today, 1)) return 'Amanhã';
  const s = fmtDate(d, { weekday: 'short', day: 'numeric' }).replace('.', '').replace(',', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nextHalfHour() {
  const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Orientações depois da atividade. */
export function afterSheet(a) {
  const t = typeById(a.type);
  const sheet = openSheet({ title: 'Boa!', content: [
    h('p.sheet-text', `${t.label} de ${a.minutes} minutos registrada.`),
    h('ul.act-after', afterAdvice(a, env.ctx, { restricted: restricted() }).map(x => h('li', icon('check'), h('span', x)))),
    h('div.sheet-actions', h('button.btn.primary', { type: 'button', onclick: () => sheet.close() }, 'Fechar')),
  ] });
  return sheet;
}
