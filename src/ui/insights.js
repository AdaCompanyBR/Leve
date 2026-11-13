// Contexto do dia em outras abas: sugestões de alimentação pelo clima e pelas atividades (aba
// Registrar) e o cartão "Clima e hábitos" com o histórico e as análises (aba Progresso).
import { h, icon } from './dom.js';
import { state, activitiesOn, waterGoalOn, liquidsOn } from '../store.js';
import { todayISO, addDays, fmtDate } from '../lib/dates.js';
import { env, onEnv, location } from '../env.js';
import { foodTips } from '../lib/foodContext.js';
import { insights } from '../lib/envHistory.js';
import { uvLevel } from '../lib/environment.js';
import { deg } from '../lib/units.js';

/** Bloco "Para hoje" na aba Registrar. `onPick(query)` abre a busca do alimento. */
export function foodTipsBlock(onPick) {
  if (state.settings.foodTips === false) return null;
  const el = h('section.food-tips', { 'aria-label': 'Sugestões para hoje' });
  const paint = () => {
    const tips = foodTips(env.ctx, { activities: activitiesOn(todayISO()) });
    el.hidden = !tips.length;
    el.replaceChildren(...tips.map(t => h('div.food-tip',
      h('p.food-tip-title', icon(t.id === 'calor' ? 'sun' : t.id === 'frio' ? 'thermo' : 'run'), t.title),
      h('p.food-tip-text', t.text),
      h('div.chip-row', t.items.map(i => h('button.chip', { type: 'button', onclick: () => onPick(i.query) }, i.label))),
      t.source ? h('p.fine', t.source) : null)),
      tips.length ? h('p.fine', 'Sugestões pelo clima e pelas atividades do dia. As suas metas de calorias e macros não mudam.') : null);
  };
  paint();
  const off = onEnv(() => { if (!el.isConnected) return off(); paint(); });
  return el;
}

/** Cartão "Clima e hábitos" na aba Progresso. */
export function climateHabitsCard() {
  const today = todayISO();
  const hist = state.envHistory ?? {};
  const list = insights({ history: hist, drinks: state.drinks, legacy: state.water, goalFor: waterGoalOn, activities: state.activities, today });
  const last = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter(d => hist[d]);
  if (!location() && !last.length) return null;
  return h('section.card.habits-card', { 'aria-label': 'Clima e hábitos' },
    h('h3', 'Clima e hábitos'),
    list.length ? h('ul.habits-list', list.map(x => h('li', h('p', x.text), h('p.fine', x.base))))
      : h('p.card-sub', 'Com mais dias de registro de líquidos e atividades, aparecem aqui padrões dos seus hábitos em relação ao clima.'),
    last.length ? h('div.habits-days',
      h('p.habits-days-title', 'Últimos dias'),
      h('ul', last.map(d => {
        const r = hist[d], ml = liquidsOn(d).total, goal = r.goal ?? waterGoalOn(d), uv = uvLevel(r.uvMax);
        return h('li',
          h('span.habits-day', d === today ? 'Hoje' : fmtDate(d, { weekday: 'short', day: 'numeric' }).replace('.', '')),
          h('span', deg(r.max)),
          h('span', uv ? `UV ${Math.round(r.uvMax)}` : ''),
          h('span.habits-pct' + (ml >= goal ? '.met' : ''), `${Math.round((ml / goal) * 100)}% da meta`));
      }))) : null,
    h('p.fine', 'São associações nos seus registros, não causas, e não são conclusões médicas.'));
}
