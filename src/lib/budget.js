// Orçamento semanal: a meta diária x 7 vira saldo. O excesso de um dia é
// diluído nos dias que restam, sem nunca passar abaixo do piso calórico.
import { addDays, diffDays, weekStart } from './dates.js';

/**
 * intakeByDate: { 'AAAA-MM-DD': kcal } só com dias que têm registro.
 * Dias passados sem registro contam como "na meta": não geram crédito nem débito.
 */
export function weekBudget({ dailyTarget, floor, today, intakeByDate }) {
  const start = weekStart(today);
  const weekly = dailyTarget * 7;
  let excess = 0;
  let spent = 0;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const logged = date in intakeByDate;
    const kcal = logged ? intakeByDate[date] : 0;
    const past = date < today;
    if (past) {
      excess += logged ? kcal - dailyTarget : 0;
      spent += logged ? kcal : dailyTarget;
    } else if (date === today) {
      spent += kcal;
    }
    days.push({ date, kcal, logged, past, isToday: date === today });
  }
  const daysLeft = 7 - diffDays(start, today); // inclui hoje
  const carry = Math.max(0, excess); // só o excesso é redistribuído
  const todayTarget = Math.round(Math.max(Math.min(floor, dailyTarget), dailyTarget - carry / daysLeft));
  return {
    weekly: Math.round(weekly),
    spent: Math.round(spent),
    balance: Math.round(weekly - spent),
    carry: Math.round(carry),
    daysLeft,
    todayTarget,
    adjusted: todayTarget !== Math.round(dailyTarget),
    days,
  };
}
