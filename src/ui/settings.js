// Perfil e Ajustes.
import { h, int, dec1, parseNum, segmented, field, toast, confirmSheet, openSheet } from './dom.js';
import { state, getPlan, saveProfile, saveSettings, exportData, importData, wipe } from '../store.js';
import { ACTIVITY, PACES, validateGoal, healthyRange } from '../lib/calc.js';
import { todayISO } from '../lib/dates.js';
import { accountCard } from './account.js';
import * as auth from '../auth.js';

export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#F3F3F8');
}

function row(label, control, hint) {
  return h('div.set-row', h('div.set-label', h('span', label), hint ? h('span.set-hint', hint) : null), control);
}

function editSheet({ title, label, value, hint, validate, onSave, inputmode = 'decimal', type }) {
  const input = h('input', { inputmode, type, value, autofocus: true, autocomplete: 'off' });
  const err = h('p.ob-err', { role: 'alert' });
  const sheet = openSheet({ title, content: h('form', { onsubmit: async e => {
    e.preventDefault();
    const msg = validate(input.value);
    if (msg) { err.textContent = msg; return; }
    await onSave(input.value); sheet.close(); toast('Salvo');
  } }, field(label, input, hint), err, h('button.btn.primary.block', { type: 'submit' }, 'Salvar')) });
}

export function settingsScreen() {
  const p = state.profile, plan = getPlan(), s = state.settings;
  const range = healthyRange(p.heightCm);
  const select = (options, value, onChange, label) => h('select', { 'aria-label': label, onchange: e => onChange(e.target.value) },
    options.map(o => h('option', { value: o.id, selected: o.id === value }, o.label)));
  const valueBtn = (text, onclick, label) => h('button.value-btn', { onclick, 'aria-label': label }, text);

  const planCard = h('section.card.plan-card', { 'aria-label': 'Seu plano' },
    h('h2', p.name),
    plan.target
      ? h('div.plan-stats',
        h('div', h('span.stat-value', int(plan.target)), h('span.stat-label', 'kcal por dia')),
        h('div', h('span.stat-value', int(plan.tdee)), h('span.stat-label', plan.adapted ? 'gasto medido' : 'gasto estimado')),
        h('div', h('span.stat-value', dec1(plan.bmi)), h('span.stat-label', 'IMC')))
      : h('p.card-sub', 'O Leve não cria plano de déficit para menores de 18 anos. Procure um médico ou nutricionista para definir metas.'),
    plan.locks.includes('piso') ? h('p.fine', `Trava ativa: a meta não fica abaixo de ${int(plan.floor)} kcal. Ritmo real de cerca de ${dec1(plan.kgWeek)} kg por semana.`) : null,
    plan.locks.includes('deficit25') ? h('p.fine', `Trava ativa: déficit limitado a 25% do gasto. Ritmo real de cerca de ${dec1(plan.kgWeek)} kg por semana.`) : null,
    plan.macros ? h('p.fine', `Macros sugeridos: ${plan.macros.protein} g de proteína, ${plan.macros.carbs} g de carboidrato e ${plan.macros.fat} g de gordura.`) : null);

  const profileCard = h('section.card.set-card', { 'aria-label': 'Dados' }, h('h3', 'Dados'),
    row('Nome', valueBtn(p.name, () => editSheet({ title: 'Nome', label: 'Como podemos chamar você?', value: p.name, inputmode: 'text', validate: v => (v.trim() ? null : 'Digite um nome.'), onSave: v => saveProfile({ name: v.trim() }) }), 'Editar nome')),
    row('Sexo biológico', select([{ id: 'f', label: 'Feminino' }, { id: 'm', label: 'Masculino' }], p.sex, v => saveProfile({ sex: v }), 'Sexo biológico')),
    row('Nascimento', h('input', { type: 'date', value: p.birthDate, max: todayISO(), min: '1920-01-01', 'aria-label': 'Data de nascimento', onchange: e => e.target.value && e.target.value < todayISO() && saveProfile({ birthDate: e.target.value }) })),
    row('Altura', valueBtn(`${p.heightCm} cm`, () => editSheet({ title: 'Altura', label: 'Altura em centímetros', value: p.heightCm, inputmode: 'numeric',
      validate: v => (parseNum(v) >= 120 && parseNum(v) <= 230 ? null : 'Informe uma altura entre 120 e 230 cm.'),
      onSave: v => { const cm = Math.round(parseNum(v)); const g = validateGoal(p.goalKg, cm).ok ? p.goalKg : healthyRange(cm).ideal; return saveProfile({ heightCm: cm, goalKg: g }); } }), 'Editar altura')),
    row('Rotina', select(ACTIVITY, p.activity, v => saveProfile({ activity: v }), 'Nível de atividade')));

  const goalCard = plan.mode === 'menor' ? null : h('section.card.set-card', { 'aria-label': 'Meta' }, h('h3', 'Meta'),
    row('Peso-alvo', valueBtn(`${dec1(plan.goalKg)} kg`, () => editSheet({ title: 'Peso-alvo', label: 'Peso-alvo em quilos', value: dec1(plan.goalKg),
      hint: `A faixa saudável para ${p.heightCm} cm vai de ${dec1(range.min)} a ${dec1(range.max)} kg. O sugerido é ${dec1(range.ideal)} kg.`,
      validate: v => { const r = validateGoal(parseNum(v), p.heightCm); return r.ok ? null : r.reason; },
      onSave: v => saveProfile({ goalKg: Math.round(parseNum(v) * 10) / 10 }) }), 'Editar peso-alvo'),
      `Faixa saudável: ${dec1(range.min)} a ${dec1(range.max)} kg`),
    row('Ritmo', select(PACES.map(x => ({ id: x.id, label: `${x.label} (${x.hint})` })), p.pace, v => saveProfile({ pace: v }), 'Ritmo')),
    plan.adapted ? row('Gasto medido', h('button.btn.tonal.compact', { onclick: async () => { await saveProfile({ tdeeOverride: null }); toast('De volta à fórmula'); } }, 'Voltar à fórmula'), `${int(plan.tdee)} kcal por dia, calculado dos seus registros`) : null);

  const prefCard = h('section.card.set-card', { 'aria-label': 'Preferências' }, h('h3', 'Preferências'),
    row('Tema', segmented([{ id: 'auto', label: 'Automático' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Escuro' }], s.theme, async v => { await saveSettings({ theme: v }); applyTheme(); }, 'Tema')),
    row('Lembrete de peso', h('button.switch', { role: 'switch', 'aria-checked': String(s.weightReminder), 'aria-label': 'Lembrete de peso', onclick: () => saveSettings({ weightReminder: !s.weightReminder }) }, h('span')),
      'Mostra um cartão em Hoje até você se pesar'),
    row('Sugerir trocas mais leves', h('button.switch', { role: 'switch', 'aria-checked': String(s.showSwaps !== false), 'aria-label': 'Sugerir trocas mais leves', onclick: () => saveSettings({ showSwaps: s.showSwaps === false }) }, h('span')),
      'Mostra opções com menos calorias e o motivo, ao registrar e em Hoje'),
    row('Meta de líquidos', select([1500, 2000, 2500, 3000, 3500].map(v => ({ id: String(v), label: `${dec1(v / 1000)} L` })), String(s.waterGoal), v => saveSettings({ waterGoal: Number(v) }), 'Meta de líquidos')));

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
    h('p.card-sub', auth.current() ? 'Seus dados ficam neste aparelho e na nuvem da sua conta. O backup em JSON continua disponível.' : 'Tudo fica guardado só neste aparelho. Exporte um backup de vez em quando, ou entre numa conta para usar em outros aparelhos.'),
    h('div.data-actions',
      h('button.btn.tonal', { onclick: () => {
        const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `leve-backup-${todayISO()}.json` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Backup exportado');
      } }, 'Exportar JSON'),
      h('button.btn.tonal', { onclick: () => file.click() }, 'Importar JSON'), file,
      h('button.btn.ghost', { onclick: () => confirmSheet({ title: 'Apagar tudo?', message: auth.current() ? 'Perfil, diário, pesagens, favoritos e modelos serão apagados deste aparelho e da nuvem da sua conta, em todos os aparelhos. Não dá para desfazer.' : 'Perfil, diário, pesagens, favoritos e modelos serão apagados deste aparelho. Não dá para desfazer.', confirmLabel: 'Apagar tudo', onConfirm: async () => { await wipe(); applyTheme(); } }) }, 'Apagar tudo')));

  const about = h('section.card.about', { 'aria-label': 'Sobre' },
    h('p.about-notice', { role: 'note' }, h('b', 'O Leve não substitui médico ou nutricionista. '), 'As metas são estimativas baseadas em fórmulas populacionais. Gestantes, lactantes e pessoas com condições de saúde devem seguir orientação profissional.'),
    h('p.fine', 'Dados nutricionais: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada, NEPA/UNICAMP, 2011. Produtos com código de barras: Open Food Facts (licença ODbL). Medidas caseiras são estimativas.'),
    h('p.fine', 'Fórmulas: Mifflin-St Jeor para o metabolismo basal; faixa saudável pelo IMC de 18,5 a 24,9.'),
    h('p.fine', h('a.link', { href: '../' }, 'Sobre o Leve')));

  return h('div.screen.settings',
    h('header.screen-head', h('div', h('p.screen-date', 'Perfil'), h('h1', 'Ajustes'))),
    h('div.settings-grid', h('div.col', planCard, profileCard, goalCard), h('div.col', accountCard({ row }), prefCard, dataCard, about)));
}
