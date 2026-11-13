// Onboarding: uma pergunta por tela e uma revelação no fim.
import { h, icon, int, dec1, reducedMotion, haptic } from './dom.js';
import { ACTIVITY, PACES, GAIN_PACES, GOALS, plan, ageOn } from '../lib/calc.js';
import { MEAL_COUNTS, WAKE_TIMES, buildRoutine } from '../lib/routine.js';
import { routinePreview } from './routine.js';
import { todayISO, fmtDate } from '../lib/dates.js';
import { state, saveProfile, saveSettings, setWaterGoal } from '../store.js';
import { DEFAULT_UNITS, unitPref, weight, weightDelta, height } from '../lib/units.js';
import { CLIMATES, suggestWaterGoal } from '../lib/hydration.js';
import { configured } from '../auth.js';
import { goToLogin } from './account.js';

export function onboarding(root) {
  const data = { name: '', goal: null, sex: null, birthDate: '', heightCm: null, weightKg: null, activity: null, climate: null, pace: null, gainPace: null, meals: null, wake: null };
  let step = 0, dir = 1;

  // Ícones das opções, no mesmo traço dos ícones do app.
  const G = {
    perder: '<path d="M12 4v13M6.5 11.5 12 17l5.5-5.5"/><path d="M5 20.5h14"/>',
    ganhar: '<path d="M3.5 9.5v5M6.5 7.5v9M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>',
    definir: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.900L12 18.500l-1.900-5.700L4.500 10.900 10.100 9z"/><path d="M18.500 16.500v4M16.500 18.500h4"/>',
    manter: '<path d="M4 12h16M7.500 8.500 4 12l3.500 3.500M16.500 8.500 20 12l-3.500 3.500"/>',
    saude: '<path d="M12 20s-7.250-4.400-7.250-9.750A4.100 4.100 0 0 1 12 7.900a4.100 4.100 0 0 1 7.250 2.350C19.250 15.600 12 20 12 20z"/>',
    f: '<circle cx="12" cy="9" r="5.250"/><path d="M12 14.250V21M8.750 17.750h6.500"/>',
    m: '<circle cx="10" cy="14" r="5.250"/><path d="M13.750 10.250 19.500 4.500M14.500 4.500h5v5"/>',
    sedentario: '<circle cx="9.500" cy="5" r="2"/><path d="M9.500 9v5.500h5.500V20M6 20h4.500"/>',
    leve: '<circle cx="12" cy="4.500" r="2"/><path d="M12 8.500v6.500l-3 5M12 15l3 5M8 11.500l4-3 4 3"/>',
    moderado: '<circle cx="13.500" cy="4.500" r="2"/><path d="M12.500 8.500 10 14l4 2.250V20.500M10 14l-4.250 1.250M12.500 8.500 8.500 9.250 7 12M13 9l3 2.750h3"/>',
    alto: '<path d="M3.500 9.500v5M6.500 7.500v9M17.500 7.500v9M20.500 9.500v5M6.500 12h11"/>',
    extremo: '<path d="M12.200 3.500c.6 3.200-3.700 5.100-3.700 9.600a5 5 0 0 0 10 0c0-2-.9-3.600-2-4.700-.2 1.500-.9 2.400-1.700 2.900-.1-2.800-1.100-5.800-2.600-7.800z"/>',
    calor: '<circle cx="12" cy="12" r="3.750"/><path d="M12 3.500v2M12 18.500v2M3.500 12h2M18.500 12h2M6 6l1.400 1.400M16.600 16.600 18 18M6 18l1.400-1.400M16.600 7.400 18 6"/>',
    temperado: '<circle cx="8" cy="7.500" r="2.500"/><path d="M8 2.750v1M3.250 7.500h1M4.600 4.100l.75.75M11.400 4.100l-.75.75"/><path d="M9 19.500h7.750a3.250 3.250 0 0 0 .35-6.480A4.500 4.500 0 0 0 8.600 14.550 2.500 2.500 0 0 0 9 19.500z"/>',
    frio: '<path d="M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9M12 6.250l-2-2M12 6.250l2-2M12 17.750l-2 2M12 17.750l2 2"/>',
  };
  const glyph = id => {
    if (!G[id]) return null;
    const t = document.createElement('template');
    t.innerHTML = `<svg class="opt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[id]}</svg>`;
    return t.content.firstChild;
  };

  // Opções em cartões: ícone, título, descrição e a marca de seleção. Escolher não avança; quem avança é o Continuar.
  const choice = (key, options, fallbackIcon) => () => {
    const el = h('div.opts', { role: 'radiogroup' }, options.map(o => {
      const b = h('button.opt', { type: 'button', role: 'radio', 'aria-checked': String(data[key] === o.id), onclick: () => {
        data[key] = o.id; haptic();
        el.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-checked', String(x === b)));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } },
      fallbackIcon ? icon(fallbackIcon, 'opt-icon') : glyph(o.id),
      h('span.opt-text', h('span.opt-label', o.label), o.hint ? h('span.opt-hint', o.hint) : null),
      h('span.opt-check', { 'aria-hidden': 'true' }, icon('check')));
      return b;
    }));
    el.validate = () => (data[key] != null ? null : 'Escolha uma opção para continuar.');
    return el;
  };

  // Régua deslizante: arraste (ou use as setas) e o valor aparece em destaque. `units` permite
  // trocar a unidade de exibição (kg ou lb); o valor guardado fica sempre na unidade base.
  const GAP = 12;
  const ruler = (key, { min, max, step, start, units, pref }) => () => {
    let u = units.find(x => x.id === unitPref(pref)) ?? units[0];
    if (!(data[key] >= min && data[key] <= max)) data[key] = start;
    const fmt = v => (u.fmt ? u.fmt(v) : u.dec ? dec1(v) : int(v));
    const value = h('span.ruler-num'), unitEl = h('span.ruler-unit');
    const track = h('div.ruler-track');
    const scroller = h('div.ruler-scroll', { tabindex: -1 }, track);
    const box = h('div.ruler', { role: 'slider', tabindex: 0, 'aria-label': 'Arraste para ajustar', autofocus: true }, scroller, h('span.ruler-needle', { 'aria-hidden': 'true' }));
    // Em passos da unidade exibida.
    const lo = () => Math.ceil(min * u.k / u.step), hi = () => Math.floor(max * u.k / u.step);
    const shown = () => Math.min(hi(), Math.max(lo(), Math.round(data[key] * u.k / u.step)));
    let n = 0, lock = false;
    function label() {
      value.textContent = fmt(n * u.step); unitEl.textContent = u.fmt ? '' : u.label;
      box.setAttribute('aria-valuemin', lo() * u.step); box.setAttribute('aria-valuemax', hi() * u.step);
      box.setAttribute('aria-valuenow', n * u.step); box.setAttribute('aria-valuetext', `${fmt(n * u.step)} ${u.label}`);
    }
    function set(next, scroll = true) {
      n = Math.min(hi(), Math.max(lo(), next));
      data[key] = Math.round((n * u.step / u.k) * 10) / 10;
      label();
      if (scroll) { lock = true; scroller.scrollLeft = (n - lo()) * GAP; requestAnimationFrame(() => { lock = false; }); }
    }
    function build() {
      track.style.width = `${(hi() - lo()) * GAP + 1}px`;
      track.style.setProperty('--major', `${GAP * u.major}px`);
      track.style.setProperty('--shift', `${-((lo() % u.major) * GAP)}px`);
      n = shown(); set(n);
    }
    scroller.addEventListener('scroll', () => { if (!lock) set(lo() + Math.round(scroller.scrollLeft / GAP), false); });
    box.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); set(lo()); } else if (e.key === 'End') { e.preventDefault(); set(hi()); } else if (d) { e.preventDefault(); set(n + d); }
    });
    // Mouse: arrastar a régua.
    let drag = null;
    scroller.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { drag = { x: e.clientX, left: scroller.scrollLeft }; scroller.setPointerCapture(e.pointerId); } });
    scroller.addEventListener('pointermove', e => { if (drag) scroller.scrollLeft = drag.left - (e.clientX - drag.x); });
    const drop = () => { if (drag) { drag = null; set(n); } };
    scroller.addEventListener('pointerup', drop); scroller.addEventListener('pointercancel', drop);
    const toggle = units.length > 1 ? h('div.unit-pills', { role: 'radiogroup', 'aria-label': 'Unidade' }, units.map(x =>
      h('button.unit-pill', { type: 'button', role: 'radio', 'aria-checked': String(x === u), onclick: e => {
        u = x; toggle.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b === e.currentTarget))); build();
        saveSettings({ units: { ...DEFAULT_UNITS, ...(state.settings.units ?? {}), [pref]: x.id } });
      } }, x.label))) : null;
    const el = h('div.ruler-wrap', toggle, h('p.ruler-value', { 'aria-hidden': 'true' }, value, unitEl), box);
    el.validate = () => (data[key] >= min && data[key] <= max ? null : 'Ajuste a régua para continuar.');
    requestAnimationFrame(build);
    return el;
  };

  const allSteps = [
    { q: 'Como podemos chamar você?', sub: 'Só para o Leve chamar você pelo nome.', body: () => {
      const input = h('input.big-input.text', { autocomplete: 'given-name', placeholder: 'Seu nome', value: data.name, maxlength: 30, autofocus: true });
      input.addEventListener('input', () => { data.name = input.value.trim(); });
      const el = h('div.big-field', input);
      el.validate = () => (data.name ? null : 'Digite um nome ou apelido.');
      return el;
    } },
    { q: 'Qual é o seu objetivo?', sub: 'O Leve monta o plano e a rotina a partir daqui. Dá para mudar depois.', body: choice('goal', GOALS) },
    { q: 'Qual é o seu sexo biológico?', sub: 'A fórmula do gasto de energia muda conforme o sexo.',
      body: choice('sex', [{ id: 'f', label: 'Feminino' }, { id: 'm', label: 'Masculino' }]) },
    { q: 'Quando você nasceu?', sub: 'A idade entra no cálculo do metabolismo.', body: () => {
      const input = h('input.big-input.text', { type: 'date', max: todayISO(), min: '1920-01-01', value: data.birthDate, autofocus: true, 'aria-label': 'Data de nascimento' });
      input.addEventListener('input', () => { data.birthDate = input.value; });
      const el = h('div.big-field', input);
      el.validate = () => (data.birthDate && data.birthDate < todayISO() && data.birthDate >= '1920-01-01' ? null : 'Escolha uma data de nascimento válida.');
      return el;
    } },
    { q: 'Qual é a sua altura?', sub: 'A altura entra no cálculo do gasto de energia.', body: ruler('heightCm', { min: 120, max: 230, start: 170, pref: 'height', units: [{ id: 'cm', label: 'cm', k: 1, step: 1, major: 10 }, { id: 'ftin', label: 'pés e pol.', k: 1 / 2.54, step: 1, major: 12, fmt: v => `${Math.floor(v / 12)}′ ${Math.round(v % 12)}″` }] }) },
    { q: 'Qual é o seu peso?', sub: 'O peso pesa bastante na meta de calorias e na de líquidos. Se puder, pese-se pela manhã.',
      body: ruler('weightKg', { min: 30, max: 300, start: 70, pref: 'weight', units: [{ id: 'kg', label: 'kg', k: 1, step: 0.5, major: 10, dec: true }, { id: 'lb', label: 'lb', k: 2.20462, step: 1, major: 10 }] }) },
    { q: 'Nível de atividade', sub: 'Quanto mais você se mexe, mais energia e mais líquidos o corpo pede.', body: choice('activity', ACTIVITY) },
    { q: 'Clima', sub: 'No calor o corpo perde mais água. Isso ajusta a sua meta de líquidos.', body: choice('climate', CLIMATES) },
    { q: 'Em que ritmo você quer ir?', sub: 'Ritmos suaves são mais fáceis de manter.', body: choice('pace', PACES, 'progress'), when: () => data.goal === 'perder' },
    { q: 'Quanto acima do gasto?', sub: 'Superávits pequenos fazem o ganho ser mais músculo do que gordura.', body: choice('gainPace', GAIN_PACES, 'progress'), when: () => data.goal === 'ganhar' },
    { q: 'Quantas refeições você faz por dia?', sub: 'Conte lanches e ceia.', body: choice('meals', MEAL_COUNTS.map(n => ({ id: n, label: `${n} refeições` })), 'fork') },
    { q: 'Que horas você costuma acordar?', sub: 'Os horários das refeições partem daqui.', body: choice('wake', WAKE_TIMES.map(t => ({ id: t, label: t.replace(':00', 'h') })), 'clock') },
  ];
  // Perguntas que dependem do objetivo (ritmo de perda ou de ganho) só aparecem quando valem.
  const active = () => allSteps.filter(s => !s.when || s.when());

  let current = null;
  function next() {
    const err = current?.validate?.();
    const errEl = root.querySelector('#ob-err');
    if (err) { if (errEl) errEl.textContent = err; current.querySelector('input, [tabindex="0"], button')?.focus(); return; }
    dir = 1; step++; render();
  }
  function back() { dir = -1; step--; render(); }

  function render() {
    const steps = active();
    if (step >= steps.length) return reveal();
    const s = steps[step];
    const body = current = s.body();
    const go = h('button.btn.primary.ob-next', { type: 'submit' }, 'Continuar');
    const form = h('form.ob-step', { style: { '--dir': dir }, onsubmit: e => { e.preventDefault(); next(); } },
      h('h1.ob-q', s.q),
      s.sub ? h('p.ob-sub', s.sub) : null,
      body,
      h('p.ob-err', { id: 'ob-err', role: 'alert' }),
      h('div.ob-foot', go,
        step === 0 && configured() ? h('button.link.ob-login', { type: 'button', onclick: () => goToLogin('entrar') }, 'Já tenho conta: entrar e trazer meus dados') : null));
    body.addEventListener('change', () => { root.querySelector('#ob-err').textContent = ''; });
    root.replaceChildren(h('div.ob',
      h('header.ob-top',
        step > 0 ? h('button.icon-btn.ob-back', { 'aria-label': 'Voltar', onclick: back }, icon('back')) : h('span.icon-btn.placeholder'),
        h('div.ob-dashes', { role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': steps.length, 'aria-valuenow': step + 1, 'aria-label': `Pergunta ${step + 1} de ${steps.length}` },
          steps.map((_, i) => h('span' + (i <= step ? '.on' : '')))),
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
    if (p.locks.includes('piso')) foot = `Ajustamos a meta para não ficar abaixo de ${int(p.floor)} kcal por dia, o mínimo seguro.${p.mode === 'deficit' ? ` O ritmo real será de cerca de ${weightDelta(p.kgWeek)} por semana.` : ''}`;
    else if (p.locks.includes('deficit25')) foot = `Limitamos o déficit a 25% do seu gasto. O ritmo real será de cerca de ${weightDelta(p.kgWeek)} por semana.`;
    else if (p.locks.includes('imc-alto')) foot = 'Com IMC acima de 27, somar calorias tende a virar mais gordura do que músculo. Por isso a meta fica no seu gasto, com proteína alta e treino de força. Vale considerar “Definir o corpo”.';
    else if (p.locks.includes('superavit15')) foot = 'Limitamos o superávit a 15% do seu gasto.';
    if (p.bmi < 18.5 && p.goal !== 'ganhar') foot = 'Seu IMC está abaixo de 18,5. O Leve não corta calorias nesse caso; vale conversar com um médico ou nutricionista.';

    const water = suggestWaterGoal({ weightKg: data.weightKg, activity: data.activity, climate: data.climate });
    const routine = buildRoutine({ profile: data, plan: p, waterGoal: water });
    const liq = stat('Líquidos por dia', `${dec1(water / 1000)} L`, 'Pelo seu peso, rotina e clima.');
    const gasto = stat('Gasto diário estimado', `${int(p.tdee)} kcal`, `${ageOn(data.birthDate, today)} anos, ${height(data.heightCm)}`);
    const prot = p.macros ? stat('Proteína por dia', `${int(p.macros.protein)} g`) : null;
    const grid = p.mode === 'menor' ? null : p.goal === 'perder'
      ? [liq, stat('IMC atual', dec1(p.bmi)), stat('Faixa saudável', `${weight(p.range.min)} a ${weight(p.range.max)}`),
        stat('Peso sugerido', weight(p.goalKg), 'Meio da faixa saudável. Você pode ajustar depois.'),
        p.mode === 'deficit' && p.eta ? stat('Chegada prevista', fmtDate(p.eta, { day: 'numeric', month: 'long', year: 'numeric' })) : null, gasto]
      : p.goal === 'ganhar' ? [stat('Acima do gasto', `+${int(p.surplus)} kcal`), prot, liq, gasto]
        : p.goal === 'definir' && p.mode === 'recomposicao' ? [stat('Abaixo do gasto', `−${int(p.deficit)} kcal`), prot, liq, gasto]
          : [stat('IMC atual', dec1(p.bmi)), prot, liq, gasto];

    root.replaceChildren(h('div.ob.reveal',
      h('header.ob-top', h('button.icon-btn', { 'aria-label': 'Voltar', onclick: () => { step = active().length - 1; dir = -1; render(); } }, icon('back'))),
      h('div.reveal-body',
        h('h1.ob-q', headline),
        p.target ? h('div.reveal-hero', h('span.reveal-label', lead), h('div.reveal-kcal', big, h('span.reveal-unit', 'kcal'))) : h('p.ob-sub', lead),
        grid ? h('div.reveal-grid', grid) : null,
        foot ? h('p.reveal-foot', foot) : null,
        h('section.reveal-routine', h('h2.reveal-h', 'Sua rotina'), routinePreview(routine)),
        h('p.reveal-disclaimer', 'O Leve não substitui médico, nutricionista ou profissional de educação física.'),
        h('button.btn.primary.block', { autofocus: true, onclick: async () => { haptic(12); await setWaterGoal(water); await saveProfile({ ...data, goalKg: p.goalKg, createdAt: today }); } }, 'Começar'))));
    if (p.target) countUp(big, p.target, int);
  }

  render();
}
