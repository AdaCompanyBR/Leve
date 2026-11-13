// Insights do dia na aba Hoje: frases curtas tiradas só dos registros reais da pessoa (comida,
// líquidos, atividades) e do clima do dia. Função pura, sem rede, testável.
// Regras: nada aparece sem dados suficientes; no máximo quatro, sem repetir o mesmo assunto; o tom é
// educativo e nunca substitui médico ou nutricionista. Com restrição médica de líquidos, nada sugere
// beber mais.

/**
 * @param {object} d
 * @param {number} d.hour          hora atual (0–23)
 * @param {{kcal,p,c,f}} d.totals  totais do dia
 * @param {number|null} d.target   meta de calorias do dia (null sem meta)
 * @param {{protein,carbs,fat}|null} d.macros metas de macros
 * @param {string[]} d.mealsLogged ids das refeições com algum item
 * @param {number} d.entries       número de itens no dia
 * @param {{ml, goal}} d.liquids
 * @param {{minutes, count, planned}} d.activity  minutos feitos, atividades feitas e planejadas para depois
 * @param {{max, now, outdoorLater}|null} d.weather  máxima do dia, temperatura agora e se há atividade ao ar livre planejada
 * @param {number} d.daysLogged    dias com refeições nos últimos 7 (incluindo hoje)
 * @param {boolean} d.fluidRestriction
 * @returns {{id, icon, tone, text}[]}
 */
export function dayInsights(d) {
  const out = [];
  const add = (id, icon, tone, text, weight) => out.push({ id, icon, tone, text, weight });
  const { hour, totals: t, target, macros: m } = d;
  const kcalPct = target ? t.kcal / target : null;

  // ----- Alimentação -----
  if (!d.entries) {
    if (hour >= 10) add('sem-refeicao', 'fork', 'neutral', hour >= 15
      ? 'Você ainda não registrou nenhuma refeição hoje. Registrar ao longo do dia deixa o saldo mais fiel.'
      : 'Você ainda não registrou nenhuma refeição hoje.', 9);
  } else {
    if (target && kcalPct > 1.05) add('acima', 'fork', 'caution', `Hoje você passou ${Math.round(t.kcal - target)} kcal da meta. Um dia acima não desfaz o plano: o que conta é a média da semana.`, 8);
    else if (target && kcalPct >= .85 && hour >= 17) add('perto', 'check', 'ok', `Você está em ${Math.round(kcalPct * 100)}% da meta de calorias, bem perto do planejado para hoje.`, 6);

    // Proteína atrás do ritmo das calorias (só com uma parte boa do dia registrada).
    if (m?.protein && kcalPct != null && kcalPct >= .4) {
      const pPct = t.p / m.protein;
      if (pPct < kcalPct - .2) add('proteina', 'target', 'caution', `Sua ingestão de proteínas está abaixo da meta planejada: ${Math.round(pPct * 100)}% da meta, com ${Math.round(kcalPct * 100)}% das calorias. Ovos, feijão, frango, peixe e iogurte ajudam a equilibrar.`, 7);
    }
    // Distribuição dos macros, quando já há calorias suficientes para comparar.
    const kcalMacros = t.p * 4 + t.c * 4 + t.f * 9;
    if (kcalMacros >= 500 && d.mealsLogged.length >= 2) {
      const fatShare = (t.f * 9) / kcalMacros, carbShare = (t.c * 4) / kcalMacros;
      if (fatShare > .4) add('gordura', 'fork', 'caution', `As gorduras somam ${Math.round(fatShare * 100)}% das calorias de hoje, acima do que o plano prevê. Vale olhar frituras, molhos e embutidos.`, 5);
      else if (carbShare > .65) add('carbo', 'fork', 'caution', `Os carboidratos somam ${Math.round(carbShare * 100)}% das calorias de hoje. Incluir uma fonte de proteína nas próximas refeições equilibra o prato.`, 4);
    }
    if (d.mealsLogged.length >= 3 && !out.some(x => x.tone === 'caution')) add('refeicoes', 'check', 'ok', `${d.mealsLogged.length} refeições registradas hoje, com os macros bem distribuídos.`, 3);
  }

  // ----- Hidratação -----
  const { ml, goal } = d.liquids;
  if (goal > 0) {
    const pct = ml / goal;
    if (pct >= 1) add('agua-ok', 'drop', 'ok', d.fluidRestriction ? `Você registrou ${fmtL(ml)} de líquidos hoje.` : `Meta de líquidos alcançada: ${fmtL(ml)} de ${fmtL(goal)}.`, 4);
    else if (!d.fluidRestriction && hour >= 14 && pct < hour / 24 - .25) add('agua-baixa', 'drop', 'caution', `Você bebeu ${fmtL(ml)} de ${fmtL(goal)} até agora. Um copo a cada refeição ajuda a chegar na meta.`, 7);
  }

  // ----- Atividade física -----
  const a = d.activity;
  if (a.minutes > 0) add('atividade', 'run', 'ok', `${a.minutes} min de atividade registrados hoje${a.count > 1 ? `, em ${a.count} atividades` : ''}. Seu corpo agradece.`, 5);

  // ----- Clima -----
  const w = d.weather;
  if (w?.max != null && w.max >= 30) {
    const hot = Math.round(w.max);
    const text = d.fluidRestriction
      ? `A máxima chega a ${hot}° hoje. Siga a orientação do seu médico sobre líquidos e prefira lugares frescos.`
      : w.outdoorLater
        ? `A máxima chega a ${hot}° hoje e você tem atividade ao ar livre planejada. Prefira horários mais frescos e leve água.`
        : `A temperatura está elevada hoje (até ${hot}°). Lembre-se de acompanhar sua hidratação.`;
    add('calor', 'sun', 'caution', text, w.outdoorLater ? 8 : 6);
  } else if (w?.max != null && w.max <= 12 && !d.fluidRestriction && goal > 0 && ml / goal < .5 && hour >= 14) {
    add('frio', 'thermo', 'neutral', 'Em dias frios a sede aparece menos, mas o corpo continua precisando de líquidos. Chás e sopas também contam.', 4);
  }

  // ----- Regularidade -----
  if (d.daysLogged >= 5) add('regular', 'calendar', 'ok', `Você registrou refeições em ${d.daysLogged} dos últimos 7 dias. Você está mantendo uma boa regularidade nos registros.`, 2);

  return out.sort((x, y) => y.weight - x.weight).slice(0, 4).map(({ weight, ...x }) => x);
}

const fmtL = ml => (ml >= 1000 ? `${String(Math.round(ml / 100) / 10).replace('.', ',')} L` : `${Math.round(ml)} ml`);
