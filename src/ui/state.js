// Estado da navegação (não é salvo).
import { todayISO } from '../lib/dates.js';

export const ui = { tab: 'hoje', date: todayISO(), meal: null, logList: 'recentes', query: '', drinkType: null };

export const MEAL_SHORT = [
  { id: 'cafe', label: 'Café' }, { id: 'almoco', label: 'Almoço' }, { id: 'jantar', label: 'Jantar' }, { id: 'lanches', label: 'Lanches' },
];

export function mealByClock(now = new Date()) {
  const t = now.getHours() + now.getMinutes() / 60;
  return t < 10.5 ? 'cafe' : t < 15 ? 'almoco' : t < 18 ? 'lanches' : 'jantar';
}

let navigate = () => {};
export const setNavigator = fn => { navigate = fn; };
export const go = (tab, patch) => { Object.assign(ui, patch, { tab }); navigate(); };
