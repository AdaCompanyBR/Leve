// Datas como texto 'AAAA-MM-DD' no fuso local. Funções puras.
const pad = n => String(n).padStart(2, '0');

export const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const diffDays = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);

/** Segunda-feira da semana de `iso`. */
export const weekStart = iso => { const d = fromISO(iso); return addDays(iso, -((d.getDay() + 6) % 7)); };

export const fmtDate = (iso, opts = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('pt-BR', opts).format(fromISO(iso));
