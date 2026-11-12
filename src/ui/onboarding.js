// Onboarding: uma pergunta por tela e uma revelação no fim.
import { h, icon, int, dec1, parseNum, reducedMotion, haptic } from './dom.js';
import { ACTIVITY, PACES, GAIN_PACES, GOALS, plan, ageOn } from '../lib/calc.js';
import { MEAL_COUNTS, WAKE_TIMES, buildRoutine } from '../lib/routine.js';
import { routinePreview } from './routine.js';
import { todayISO, fmtDate } from '../lib/dates.js';
import { saveProfile } from '../store.js';
import { configured } from '../auth.js';
import { goToLogin } from './account.js';

export function onboarding(root) {
  const data = { name: '', goal: null, sex: null, birthDate: '', heightCm: null, weightKg: null, activity: null, pace: null, gainPace: null, meals: null, wake: null };
  let step = 0, dir = 1;

  const choice = (key, options) => () => h('div.choices', { role: 'radiogroup' }, options.map(o =>
    h('button.choice', { type: 'button', role: 'radio', 'aria-checked': String(data[key] === o.id), onclick: () => { data[key] = o.id; haptic(); next(); } },
      h('span.choice-label', o.label), o.hint ? h('span.choice-hint', o.hint) : null)));

  const number = (key, { unit, min, max, placeholder, decimals }) => () => {
    const input = h('input.big-input', { inputmode: decimals ? 'decimal' : 'numeric', autocomplete: 'off', placeholder, value: data[key] ? String(data[key]).replace('.', ',') : '', 'aria-describedby': 'ob-err', autofocus: true });
    input.addEventListener('input', () => { data[key] = parseNum(input.value); });
    input.validate = () => (data[key] >= min && data[key] <= max ? null : `Informe um valor entre ${min} e ${max} ${unit}.`);
    return h('div.big-field', input, h('span.big-unit', unit));
  };

  const allSteps = [
    { q: 'Como podemos chamar você?', sub: 'Só para o Leve chamar você pelo nome.', body: () => {
      const input = h('input.big-input.text', { autocomplete: 'given-name', placeholder: 'Seu nome', value: data.name, maxlength: 30, autofocus: true });
      input.addEventListener('input', () => { data.name = input.value.trim(); });
      input.validate = () => (data.name ? null : 'Digite um nome ou apelido.');
      return h('div.big-field', input);
    } },
    { q: 'Qual é o seu objetivo?', sub: 'O Leve monta o plano e a rotina a partir daqui. Dá para mudar depois.', auto: true, body: choice('goal', GOALS) },
    { q: 'Qual é o seu sexo biológico?', sub: 'A fórmula do gasto de energia muda conforme o sexo.', auto: true,
      body: choice('sex', [{ id: 'f', label: 'Feminino' }, { id: 'm', label: 'Masculino' }]) },
    { q: 'Quando você nasceu?', sub: 'A idade entra no cálculo do metabolismo.', body: () => {
      const input = h('input.big-input.text', { type: 'date', max: todayISO(), min: '1920-01-01', value: data.birthDate, autofocus: true, 'aria-label': 'Data de nascimento' });
      input.addEventListener('input', () => { data.birthDate = input.value; });
      input.validate = () => (data.birthDate && data.birthDate < todayISO() && data.birthDate >= '1920-01-01' ? null : 'Escolha uma data de nascimento válida.');
      return h('div.big-field', input);
    } },
    { q: 'Qual é a sua altura?', body: number('heightCm', { unit: 'cm', min: 120, max: 230, placeholder: '170' }) },
    { q: 'E o seu peso hoje?', sub: 'Se puder, pese-se pela manhã, antes de comer.', body: number('weightKg', { unit: 'kg', min: 30, max: 300, placeholder: '70,0', decimals: true }) },
    { q: 'Como é a sua rotina?', auto: true, body: choice('activity', ACTIVITY) },
    { q: 'Em que ritmo você quer ir?', sub: 'Ritmos suaves são mais fáceis de manter.', auto: true, body: choice('pace', PACES), when: () => data.goal === 'perder' },
    { q: 'Quanto acima do gasto?', sub: 'Superávits pequenos fazem o ganho ser mais músculo do que gordura.', auto: true, body: choice('gainPace', GAIN_PACES), when: () => data.goal === 'ganhar' },
    { q: 'Quantas refeições você faz por dia?', sub: 'Conte lanches e ceia.', auto: true, body: choice('meals', MEAL_COUNTS.map(n => ({ id: n, label: `${n} refeições` }))) },
    { q: 'Que horas você costuma acordar?', sub: 'Os horários das refeições partem daqui.', auto: true, body: choice('wake', WAKE_TIMES.map(t => ({ id: t, label: t.replace(':00', 'h') }))) },
  ];
  // Perguntas que dependem do objetivo (ritmo de perda ou de ganho) só aparecem quando valem.
  const active = () => allSteps.filter(s => !s.when || s.when());

  function next() {
    const input = root.querySelector('.big-input');
    const err = input?.validate?.();
    const errEl = root.querySelector('#ob-err');
    if (err) { if (errEl) errEl.textContent = err; input.focus(); return; }
    dir = 1; step++; render();
  }
  function back() { dir = -1; step--; render(); }

  function render() {
    const steps = active();
    if (step >= steps.length) return reveal();
    const s = steps[step];
    const body = s.body();
    const form = h('form.ob-step', { style: { '--dir': dir }, onsubmit: e => { e.preventDefault(); next(); } },
      h('h1.ob-q', s.q),
      s.sub ? h('p.ob-sub', s.sub) : null,
      body,
      h('p.ob-err', { id: 'ob-err', role: 'alert' }),
      s.auto ? null : h('button.btn.primary.block', { type: 'submit' }, 'Continuar'),
      step === 0 && configured() ? h('button.link.ob-login', { type: 'button', onclick: () => goToLogin('entrar') }, 'Já tenho conta: entrar e trazer meus dados') : null);
    root.replaceChildren(h('div.ob',
      h('header.ob-top',
        step > 0 ? h('button.icon-btn', { 'aria-label': 'Voltar', onclick: back }, icon('back')) : h('span.icon-btn.placeholder'),
        h('div.ob-progress', { role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': steps.length, 'aria-valuenow': step + 1, 'aria-label': `Pergunta ${step + 1} de ${steps.length}` },
          h('span', { style: { width: `${((step + 1) / steps.length) * 100}%` } })),
        h('span.icon-btn.placeholder')),
      form));
    form.querySelector('[autofocus]')?.focus({ preventScroll: true });
  }

  function countUp(el, to, format) {
    if (reducedMotion()) { el.textContent = format(to); return; }
    const t0 = performance.now(), dur = 1100;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - (1 - p) ** 4;
      el.textContent = format(to * e);
      if (p < 1 && el.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function reveal() {
    const today = todayISO();
    const p = plan(data, today);
    const stat = (label, value, note) => h('div.reveal-stat', h('span.reveal-label', label), h('span.reveal-value', value), note ? h('span.reveal-note', note) : null);
    const big = h('span.reveal-big');
    const name = data.name;
    let headline, lead = 'Sua meta diária', foot;
    const goalWord = { perder: 'perder peso', ganhar: 'ganhar massa', definir: 'definir o corpo', manter: 'manter o peso', saude: 'comer melhor' }[p.goal];
    if (p.mode === 'menor') {
      headline = `${name}, o Leve não cria metas de calorias para menores de 18 anos.`;
      lead = 'Você pode usar o diário, os líquidos e a rotina de hábitos. Para metas, procure um médico ou nutricionista.';
    } else if (p.mode === 'manutencao' && p.goal === 'perder') {
      headline = 'Seu peso já está na meta sugerida.';
      lead = 'Sua meta diária é a de manutenção.';
    } else {
      headline = `${name}, este é o seu plano para ${goalWord}.`;
    }
    if (p.locks.includes('piso')) foot = `Ajustamos a meta para não ficar abaixo de ${int(p.floor)} kcal por dia, o mínimo seguro.${p.mode === 'deficit' ? ` O ritmo real será de cerca de ${dec1(p.kgWeek)} kg por semana.` : ''}`;
    else if (p.locks.includes('deficit25')) foot = `Limitamos o déficit a 25% do seu gasto. O ritmo real será de cerca de ${dec1(p.kgWeek)} kg por semana.`;
    else if (p.locks.includes('imc-alto')) foot = 'Com IMC acima de 27, somar calorias tende a virar mais gordura do que músculo. Por isso a meta fica no seu gasto, com proteína alta e treino de força. Vale considerar “Definir o corpo”.';
    else if (p.locks.includes('superavit15')) foot = 'Limitamos o superávit a 15% do seu gasto.';
    if (p.bmi < 18.5 && p.goal !== 'ganhar') foot = 'Seu IMC está abaixo de 18,5. O Leve não corta calorias nesse caso; vale conversar com um médico ou nutricionista.';

    const routine = buildRoutine({ profile: data, plan: p, waterGoal: 2000 });
    const gasto = stat('Gasto diário estimado', `${int(p.tdee)} kcal`, `${ageOn(data.birthDate, today)} anos, ${data.heightCm} cm`);
    const prot = p.macros ? stat('Proteína por dia', `${int(p.macros.protein)} g`) : null;
    const grid = p.mode === 'menor' ? null : p.goal === 'perder'
      ? [stat('IMC atual', dec1(p.bmi)), stat('Faixa saudável', `${dec1(p.range.min)} a ${dec1(p.range.max)} kg`),
        stat('Peso sugerido', `${dec1(p.goalKg)} kg`, 'Meio da faixa saudável. Você pode ajustar depois.'),
        p.mode === 'deficit' && p.eta ? stat('Chegada prevista', fmtDate(p.eta, { day: 'numeric', month: 'long', year: 'numeric' })) : null, gasto]
      : p.goal === 'ganhar' ? [stat('Acima do gasto', `+${int(p.surplus)} kcal`), prot, gasto]
        : p.goal === 'definir' && p.mode === 'recomposicao' ? [stat('Abaixo do gasto', `−${int(p.deficit)} kcal`), prot, gasto]
          : [stat('IMC atual', dec1(p.bmi)), prot, gasto];

    root.replaceChildren(h('div.ob.reveal',
      h('header.ob-top', h('button.icon-btn', { 'aria-label': 'Voltar', onclick: () => { step = active().length - 1; dir = -1; render(); } }, icon('back'))),
      h('div.reveal-body',
        h('h1.ob-q', headline),
        p.target ? h('div.reveal-hero', h('span.reveal-label', lead), h('div.reveal-kcal', big, h('span.reveal-unit', 'kcal'))) : h('p.ob-sub', lead),
        grid ? h('div.reveal-grid', grid) : null,
        foot ? h('p.reveal-foot', foot) : null,
        h('section.reveal-routine', h('h2.reveal-h', 'Sua rotina'), routinePreview(routine)),
        h('p.reveal-disclaimer', 'O Leve não substitui médico, nutricionista ou profissional de educação física.'),
        h('button.btn.primary.block', { autofocus: true, onclick: async () => { haptic(12); await saveProfile({ ...data, goalKg: p.goalKg, createdAt: today }); } }, 'Começar'))));
    if (p.target) countUp(big, p.target, int);
  }

  render();
}
