// Perfil e Ajustes.
import { h, int, dec1, parseNum, segmented, field, toast, confirmSheet, openSheet, picker } from './dom.js';
import { state, getPlan, saveProfile, saveSettings, exportData, importData, wipe, setWaterGoal, waterGoalOn, bodyStyle, latestWeight } from '../store.js';
import { CLIMATES, suggestWaterGoal } from '../lib/hydration.js';
import { ACTIVITY, PACES, GAIN_PACES, goalById, validateGoal, healthyRange } from '../lib/calc.js';
import { MEAL_COUNTS, WAKE_TIMES } from '../lib/routine.js';
import { goalWizard, routineSheet } from './routine.js';
import { todayISO } from '../lib/dates.js';
import { accountCard } from './account.js';
import * as auth from '../auth.js';
import { location as envLocation, placeName, ALERT_CATEGORIES, alertOn } from '../env.js';
import { locationSheet } from './environment.js';

export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.removeAttribute('media'); m.setAttribute('content', dark ? '#161617' : '#F5F5F7'); });
}

function row(label, control, hint) {
  return h('div.set-row', h('div.set-label', h('span', label), hint ? h('span.set-hint', hint) : null), control);
}

function editSheet({ title, label, value, hint, validate, onSave, inputmode = 'decimal', type }) {
  const input = h('input', { inputmode, type, value, autofocus: true, autocomplete: 'off' });
  const err = h('p.ob-err', { role: 'alert' });
  const form = h('form', { onsubmit: async e => {
    e.preventDefault();
    const msg = validate(input.value);
    if (msg) { err.textContent = msg; return; }
    await onSave(input.value); sheet.close(); toast('Salvo');
  } }, field(label, input, hint), err);
  const sheet = openSheet({ title, content: form, action: { label: 'Salvar', run: () => form.requestSubmit() } });
}

/** Junta as linhas seguidas de uma seção numa lista agrupada (fundo único, cantos arredondados). */
export function groupRows(section) {
  let wrap = null;
  for (const el of [...section.children]) {
    if (el.classList.contains('set-row')) {
      if (!wrap) { wrap = h('div.set-rows'); el.before(wrap); }
      wrap.append(el);
    } else wrap = null;
  }
  return section;
}

export function settingsScreen() {
  const p = state.profile, plan = getPlan(), s = state.settings;
  const range = healthyRange(p.heightCm);
  const select = (options, value, onChange, label) => picker({ options, value, onChange: v => onChange(String(v)), label });
  const valueBtn = (text, onclick, label) => h('button.value-btn', { onclick, 'aria-label': label }, text);

  const planCard = h('section.card.plan-card', { 'aria-label': 'Seu plano' },
    h('h2', p.name), h('p.card-sub', goalById(plan.goal).label),
    plan.target
      ? h('div.plan-stats',
        h('div', h('span.stat-value', int(plan.target)), h('span.stat-label', 'kcal por dia')),
        h('div', h('span.stat-value', int(plan.tdee)), h('span.stat-label', plan.adapted ? 'gasto medido' : 'gasto estimado')),
        h('div', h('span.stat-value', dec1(plan.bmi)), h('span.stat-label', 'IMC')))
      : h('p.card-sub', 'O Leve não cria metas de calorias para menores de 18 anos. Procure um médico ou nutricionista para definir metas.'),
    plan.locks.includes('imc-alto') ? h('p.fine', 'Trava ativa: com IMC acima de 27, a meta fica no seu gasto, sem superávit. Considere “Definir o corpo”.') : null,
    plan.locks.includes('superavit15') ? h('p.fine', 'Trava ativa: superávit limitado a 15% do gasto.') : null,
    plan.locks.includes('imc-baixo') ? h('p.fine', 'Trava ativa: com IMC abaixo de 18,5, o Leve não corta calorias.') : null,
    plan.locks.includes('piso') ? h('p.fine', `Trava ativa: a meta não fica abaixo de ${int(plan.floor)} kcal.${plan.mode === 'deficit' ? ` Ritmo real de cerca de ${dec1(plan.kgWeek)} kg por semana.` : ''}`) : null,
    plan.locks.includes('deficit25') ? h('p.fine', `Trava ativa: déficit limitado a 25% do gasto. Ritmo real de cerca de ${dec1(plan.kgWeek)} kg por semana.`) : null,
    plan.macros ? h('p.fine', `Macros sugeridos: ${plan.macros.protein} g de proteína, ${plan.macros.carbs} g de carboidrato e ${plan.macros.fat} g de gordura.`) : null);

  const profileCard = h('section.card.set-card', { 'aria-label': 'Dados' }, h('h3', 'Dados'),
    row('Nome', valueBtn(p.name, () => editSheet({ title: 'Nome', label: 'Como podemos chamar você?', value: p.name, inputmode: 'text', validate: v => (v.trim() ? null : 'Digite um nome.'), onSave: v => saveProfile({ name: v.trim() }) }), 'Editar nome')),
    row('Sexo biológico', select([{ id: 'f', label: 'Feminino' }, { id: 'm', label: 'Masculino' }], p.sex, v => saveProfile({ sex: v }), 'Sexo biológico')),
    row('Nascimento', h('input', { type: 'date', value: p.birthDate, max: todayISO(), min: '1920-01-01', 'aria-label': 'Data de nascimento', onchange: e => e.target.value && e.target.value < todayISO() && saveProfile({ birthDate: e.target.value }) })),
    row('Altura', valueBtn(`${p.heightCm} cm`, () => editSheet({ title: 'Altura', label: 'Altura em centímetros', value: p.heightCm, inputmode: 'numeric',
      validate: v => (parseNum(v) >= 120 && parseNum(v) <= 230 ? null : 'Informe uma altura entre 120 e 230 cm.'),
      onSave: v => { const cm = Math.round(parseNum(v)); const g = validateGoal(p.goalKg, cm).ok ? p.goalKg : healthyRange(cm).ideal; return saveProfile({ heightCm: cm, goalKg: g }); } }), 'Editar altura')),
    row('Atividade', select(ACTIVITY, p.activity, v => saveProfile({ activity: v }), 'Nível de atividade')));

  const goalCard = h('section.card.set-card', { 'aria-label': 'Objetivo e rotina' }, h('h3', 'Objetivo e rotina'),
    row('Objetivo', valueBtn(goalById(p.goal).label, () => goalWizard(), 'Mudar objetivo'), p.goal ? null : 'Escolha para montar a sua rotina'),
    p.goal === 'ganhar' ? row('Ritmo', select(GAIN_PACES.map(x => ({ id: x.id, label: `${x.label} (${x.hint.toLowerCase()})` })), p.gainPace ?? 'suave', v => saveProfile({ gainPace: v }), 'Ritmo de ganho')) : null,
    plan.goal !== 'perder' || plan.mode === 'menor' ? null : row('Peso-alvo', valueBtn(`${dec1(plan.goalKg)} kg`, () => editSheet({ title: 'Peso-alvo', label: 'Peso-alvo em quilos', value: dec1(plan.goalKg),
      hint: `A faixa saudável para ${p.heightCm} cm vai de ${dec1(range.min)} a ${dec1(range.max)} kg. O sugerido é ${dec1(range.ideal)} kg.`,
      validate: v => { const r = validateGoal(parseNum(v), p.heightCm); return r.ok ? null : r.reason; },
      onSave: v => saveProfile({ goalKg: Math.round(parseNum(v) * 10) / 10 }) }), 'Editar peso-alvo'),
      `Faixa saudável: ${dec1(range.min)} a ${dec1(range.max)} kg`),
    plan.goal === 'perder' && plan.mode !== 'menor' ? row('Ritmo', select(PACES.map(x => ({ id: x.id, label: `${x.label} (${x.hint})` })), p.pace, v => saveProfile({ pace: v }), 'Ritmo')) : null,
    row('Refeições por dia', select(MEAL_COUNTS.map(n => ({ id: String(n), label: `${n} refeições` })), String(p.meals ?? 4), v => saveProfile({ meals: Number(v) }), 'Refeições por dia')),
    row('Acordo às', select(WAKE_TIMES.map(t => ({ id: t, label: t.replace(':00', 'h') })), p.wake ?? '07:00', v => saveProfile({ wake: v }), 'Hora de acordar')),
    row('Rotina do dia', valueBtn('Ver', () => routineSheet(), 'Ver a rotina do dia')),
    plan.adapted ? row('Gasto medido', h('button.btn.tonal.compact', { onclick: async () => { await saveProfile({ tdeeOverride: null }); toast('De volta à fórmula'); } }, 'Voltar à fórmula'), `${int(plan.tdee)} kcal por dia, calculado dos seus registros`) : null);

  const prefCard = h('section.card.set-card', { 'aria-label': 'Preferências' }, h('h3', 'Preferências'),
    row('Tema', segmented([{ id: 'auto', label: 'Automático' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Escuro' }], s.theme, async v => { await saveSettings({ theme: v }); applyTheme(); }, 'Tema')),
    row('Lembrete de peso', h('button.switch', { role: 'switch', 'aria-checked': String(s.weightReminder), 'aria-label': 'Lembrete de peso', onclick: () => saveSettings({ weightReminder: !s.weightReminder }) }, h('span')),
      null),
    row('Sugerir trocas mais leves', h('button.switch', { role: 'switch', 'aria-checked': String(s.showSwaps !== false), 'aria-label': 'Sugerir trocas mais leves', onclick: () => saveSettings({ showSwaps: s.showSwaps === false }) }, h('span')),
      null));

  // Líquidos: meta (com a sugestão), clima e o corpo que aparece na aba.
  const goalNow = waterGoalOn(todayISO());
  const kg = latestWeight();
  const suggested = kg ? suggestWaterGoal({ weightKg: kg, activity: p?.activity, climate: p?.climate }) : null;
  const goalIds = [...new Set([1500, 2000, 2500, 3000, 3500, goalNow, ...(suggested ? [suggested] : [])])].sort((a, b) => a - b);
  const liqCard = h('section.card.set-card', { 'aria-label': 'Líquidos' }, h('h3', 'Líquidos'),
    row('Meta diária', select(goalIds.map(v => ({ id: String(v), label: `${dec1(v / 1000)} L${v === suggested ? ' (sugerida)' : ''}` })), String(goalNow), v => setWaterGoal(Number(v)), 'Meta diária de líquidos'),
      suggested ? `Sugerida: ${dec1(suggested / 1000)} L, pelo seu peso, rotina e clima. A meta nova vale a partir de hoje.` : 'A meta nova vale a partir de hoje.'),
    p ? row('Clima onde você mora', select(CLIMATES.map(c => ({ id: c.id, label: c.label })), p.climate ?? 'temperado', v => saveProfile({ climate: v }), 'Clima')) : null,
    row('Corpo na aba Líquidos', segmented([{ id: 'f', label: 'Feminino' }, { id: 'm', label: 'Masculino' }], bodyStyle(), v => saveSettings({ body: v }), 'Corpo na aba Líquidos')),
    row('Orientação médica para limitar líquidos', h('button.switch', { role: 'switch', 'aria-checked': String(!!s.fluidRestriction), 'aria-label': 'Orientação médica para limitar líquidos', onclick: () => saveSettings({ fluidRestriction: !s.fluidRestriction }) }, h('span')),
      'Ligado, o clima nunca sugere beber mais: as orientações de calor pedem para seguir o seu médico.'));

  // Clima e localização: de onde vem a previsão e quais avisos aparecem.
  const loc = envLocation();
  const envCard = h('section.card.set-card', { 'aria-label': 'Clima e localização' }, h('h3', 'Clima e localização'),
    row('Localização', valueBtn(loc ? placeName(loc) : 'Não definida', () => locationSheet(), 'Alterar localização'), loc ? (loc.mode === 'gps' ? 'Pelo GPS do aparelho' : 'Escolhida pelo nome') : 'Para o clima, o índice UV e a qualidade do ar do dia'),
    ...ALERT_CATEGORIES.map(c => row(`Avisos de ${c.label.toLowerCase()}`, h('button.switch', { role: 'switch', 'aria-checked': String(alertOn(c.id)), 'aria-label': `Avisos de ${c.label.toLowerCase()}`,
      onclick: () => saveSettings({ envAlerts: { ...(s.envAlerts ?? {}), [c.id]: !alertOn(c.id) } }) }, h('span')), c.hint)),
    row('Sugestões de alimentação pelo clima', h('button.switch', { role: 'switch', 'aria-checked': String(s.foodTips !== false), 'aria-label': 'Sugestões de alimentação pelo clima', onclick: () => saveSettings({ foodTips: s.foodTips === false }) }, h('span')),
      'Na aba Registrar, em dias quentes, frios ou com atividade. As metas não mudam.'));

  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); if (data?.app !== 'leve') throw 0; }
    catch { toast('Este arquivo não é um backup do Leve.'); e.target.value = ''; return; }
    confirmSheet({ title: 'Importar backup?', message: `O backup de ${new Date(data.exportedAt).toLocaleDateString('pt-BR')} substitui todos os dados deste aparelho.`, confirmLabel: 'Importar',
      onConfirm: async () => { try { await importData(data); applyTheme(); toast('Backup importado'); } catch { toast('O backup está incompleto e não foi importado.'); } } });
    e.target.value = '';
  } });
  const dataCard = h('section.card.set-card', { 'aria-label': 'Seus dados' }, h('h3', 'Seus dados'),
    h('button.set-row.row-action', { type: 'button', onclick: () => {
        const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `leve-backup-${todayISO()}.json` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Backup exportado');
      } }, 'Exportar backup'),
    h('button.set-row.row-action', { type: 'button', onclick: () => file.click() }, 'Importar backup'),
    h('button.set-row.row-action.destructive', { type: 'button', onclick: () => confirmSheet({ title: 'Apagar tudo?', message: auth.current() ? 'Perfil, diário, pesagens, favoritos e modelos serão apagados deste aparelho e da nuvem da sua conta, em todos os aparelhos. Não dá para desfazer.' : 'Perfil, diário, pesagens, favoritos e modelos serão apagados deste aparelho. Não dá para desfazer.', confirmLabel: 'Apagar tudo', onConfirm: async () => { await wipe(); applyTheme(); } }) }, 'Apagar tudo'), file,
    h('p.group-foot', auth.current() ? 'Os dados ficam neste aparelho e na nuvem da sua conta.' : 'Os dados ficam só neste aparelho. Exporte um backup de vez em quando.'));

  const about = h('section.about', { 'aria-label': 'Sobre' },
    h('p.about-notice', { role: 'note' }, 'O Leve não substitui médico ou nutricionista. As metas são estimativas (Mifflin-St Jeor e IMC de 18,5 a 24,9). Gestantes, lactantes e pessoas com condições de saúde devem seguir orientação profissional.'),
    h('p.fine', 'Alimentos: tabela TACO (NEPA/UNICAMP, 2011) e Open Food Facts (ODbL).'),
    h('p.fine', h('a.link.inline', { href: '../' }, 'Sobre o Leve')));

  [profileCard, goalCard, prefCard, liqCard, envCard, dataCard].filter(Boolean).forEach(groupRows);
  return h('div.screen.settings',
    h('header.screen-head', h('div', h('h1', 'Ajustes'))),
    h('div.settings-grid', h('div.col', planCard, profileCard, goalCard), h('div.col', groupRows(accountCard({ row })), prefCard, liqCard, envCard, dataCard, about)));
}
