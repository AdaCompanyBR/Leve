// Desafios, conquistas e campanhas. Regras puras: recebem os registros que o app já tem
// (líquidos, diário de comida, atividades) e um registro rápido próprio só para o que o app não
// mede (sono, telas, pausas, percepção das refeições). Nada é guardado em dobro: o progresso é
// sempre recalculado a partir dos registros originais.
//
// Princípios de segurança (valem para todo o catálogo):
// - metas sempre individuais (a meta de líquidos da pessoa, minutos escolhidos por ela);
// - nenhum desafio de restrição, jejum, perda de peso, suplemento ou água acima da meta;
// - os dias não precisam ser seguidos e perder um dia não zera nada;
// - um desafio só termina quando o critério é cumprido, nunca só porque o prazo passou.
import { dayTotal } from './hydration.js';
import { addDays, diffDays } from './dates.js';

export const SAFETY = 'Os desafios têm finalidade educativa e de incentivo a hábitos saudáveis. Cada pessoa possui necessidades e condições de saúde diferentes. Antes de iniciar qualquer desafio, converse com seu médico ou profissional de saúde habilitado para verificar se a atividade é adequada para você. Não faça mudanças alimentares, restrições ou exercícios que possam comprometer sua saúde sem orientação profissional.';
export const DISCOMFORT = 'Se sentir desconforto, dor, tontura, falta de ar ou qualquer sintoma, interrompa a atividade e procure orientação profissional. Em caso de urgência, ligue 192 (SAMU).';

export const CATEGORIES = [
  { id: 'hidratacao', label: 'Hidratação', color: '#2F8FE6', ink: '#0B4F8C', soft: '#E3F0FC' },
  { id: 'alimentacao', label: 'Alimentação', color: '#34A853', ink: '#1C6B33', soft: '#E3F4E7' },
  { id: 'atividade', label: 'Atividade física', color: '#F2711C', ink: '#9A3F06', soft: '#FDEBDF' },
  { id: 'sono', label: 'Sono e recuperação', color: '#7B5CD6', ink: '#47309A', soft: '#EEE9FB' },
  { id: 'bemestar', label: 'Bem-estar', color: '#E9B10C', ink: '#7A5A00', soft: '#FCF3D6' },
];
export const categoryById = id => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];

// Grupos da TACO usados pelos critérios de alimentação.
const VEG = 'Verduras, hortaliças e derivados', FRUIT = 'Frutas e derivados';
const NOT_FRESH = /suco|doce|geleia|calda|néctar|nectar|desidratad|cristalizad|em pó|polpa/i;
const hourOf = ts => new Date(ts).getHours();

/**
 * Catálogo. `benefits` são pares [ícone, texto], com linguagem cuidadosa ("ajuda a"), nunca promessa
 * de resultado médico. Cada desafio diz o que conta como "dia cumprido" (`day`) e quantos dias são
 * necessários (`needed`). `measure` explica de onde vem o dado; `targets` são as metas que a
 * pessoa escolhe ao começar (sempre individuais, nunca universais).
 */
export const CHALLENGES = [
  {
    id: 'agua-21', cat: 'hidratacao', title: 'Hábito de hidratação', days: 21, level: 2, art: 'agua-21',
    short: 'Atinja a sua meta de líquidos em 21 dias.',
    about: 'Um desafio para transformar a hidratação em rotina. Conta cada dia em que você atinge a sua própria meta de líquidos, a mesma da aba Líquidos.',
    goal: 'Atingir a sua meta individual de líquidos em 21 dias, que não precisam ser seguidos.',
    how: 'Registre as bebidas na aba Líquidos, como já faz. O desafio lê esses registros e marca sozinho cada dia em que a meta foi atingida.',
    measure: 'Registros da aba Líquidos comparados com a sua meta do dia.',
    benefits: [['calendar', 'Ajuda a criar uma rotina de hidratação'], ['thermo', 'A água participa da regulação da temperatura do corpo'], ['target', 'Deixa mais fácil perceber quanto você bebe de verdade'], ['clock', 'Ajuda a lembrar de beber água em dias corridos']],
    tips: ['Deixe uma garrafa à vista na mesa de trabalho', 'Beba um copo ao acordar e outro em cada refeição', 'Cadastre as bebidas que você mais toma no botão de lista da aba Líquidos: registrar fica com um toque', 'Em dias quentes, distribua os líquidos ao longo do dia', 'Não passe muito da sua meta: mais não é melhor'],
    targets: { key: 'share', label: 'Contar o dia quando chegar a', options: [{ id: 1, label: '100% da meta' }, { id: 0.8, label: '80% da meta' }], default: 1 },
    needsGoal: true, blockIfRestricted: true,
    day: (d, x, t) => { const ml = x.liquids(d), goal = x.goalFor(d); return { value: ml, target: Math.round(goal * t), done: ml >= goal * t, unit: 'ml' }; },
  },
  {
    id: 'agua-pura-7', cat: 'hidratacao', title: 'Água pura', days: 7, level: 1, art: 'agua-pura-7',
    short: 'Registre o que você bebe de água todos os dias.',
    about: 'Um primeiro passo simples: prestar atenção na água que você bebe. Não há quantidade mínima, só o hábito de registrar.',
    goal: 'Registrar água (com ou sem gás) em 7 dias.',
    how: 'Registre a água na aba Líquidos. Cada dia com pelo menos um registro de água conta.',
    measure: 'Registros de água e de água com gás da aba Líquidos.',
    benefits: [['eye', 'Aumenta a consciência sobre quanto você bebe'], ['drop', 'Valoriza a água como bebida do dia a dia'], ['calendar', 'Prepara o terreno para o desafio de 21 dias']],
    tips: ['Registre logo depois de beber, para não esquecer', 'Use o botão + da aba Líquidos: um toque registra o copo de sempre', 'Vale água com gás e água saborizada sem açúcar'],
    day: (d, x) => { const ml = x.waterOnly(d); return { value: ml, target: 1, done: ml > 0, unit: 'ml' }; },
  },
  {
    id: 'agua-ritmo-14', cat: 'hidratacao', title: 'Hidratação consciente', days: 14, level: 2, art: 'agua-ritmo-14',
    short: 'Distribua os líquidos pela manhã, tarde e noite.',
    about: 'Em vez de beber tudo de uma vez, o desafio incentiva uma rotina mais regular, com líquidos nos três períodos do dia.',
    goal: 'Em 14 dias, registrar líquidos de manhã (até 12h), à tarde (12h às 18h) e à noite (depois das 18h).',
    how: 'O desafio olha o horário de cada bebida registrada na aba Líquidos. O dia conta quando há registro nos três períodos.',
    measure: 'Horários dos registros da aba Líquidos.',
    benefits: [['clock', 'Mantém a hidratação regular ao longo do dia'], ['sun', 'Ajuda a não chegar ao fim do dia com sede'], ['moon', 'Evita beber muito de uma vez antes de dormir']],
    tips: ['Associe a bebida a momentos fixos: ao acordar, no almoço, no fim da tarde', 'Se registrar depois, ajuste o horário na janela da bebida', 'À noite, prefira quantidades menores se elas atrapalharem o sono'],
    blockIfRestricted: true,
    day: (d, x) => { const p = x.periods(d); return { value: p, target: 3, done: p >= 3, unit: 'períodos' }; },
  },
  {
    id: 'prato-colorido-7', cat: 'alimentacao', title: 'Prato colorido', days: 7, level: 1, art: 'prato-colorido-7',
    short: 'Duas verduras ou legumes diferentes no dia.',
    about: 'Verduras e legumes de cores diferentes trazem nutrientes diferentes. O desafio conta os dias em que você registra pelo menos duas verduras ou legumes diferentes.',
    goal: 'Em 7 dias, registrar pelo menos 2 verduras ou legumes diferentes no dia.',
    how: 'Registre as refeições na aba Registrar. O desafio identifica os alimentos do grupo de verduras e hortaliças da tabela TACO.',
    measure: 'Alimentos do diário, pelo grupo da tabela TACO.',
    benefits: [['palette', 'Cores diferentes trazem vitaminas e minerais diferentes'], ['leaf', 'Verduras e legumes dão saciedade com poucas calorias'], ['plate', 'Refeições mais coloridas e saborosas']],
    tips: ['Monte o prato começando pela salada', 'Tenha legumes já lavados e cortados na geladeira', 'Experimente uma cor nova por dia: abóbora, beterraba, couve'],
    day: (d, x) => { const n = x.distinctInGroup(d, VEG); return { value: n, target: 2, done: n >= 2, unit: 'itens' }; },
  },
  {
    id: 'frutas-7', cat: 'alimentacao', title: 'Semana das frutas', days: 7, level: 1, art: 'frutas-7',
    short: 'Pelo menos uma fruta fresca no dia.',
    about: 'Frutas in natura são práticas e combinam com qualquer refeição. O desafio conta os dias com pelo menos uma fruta fresca registrada, respeitando as suas necessidades.',
    goal: 'Em 7 dias, registrar pelo menos 1 fruta fresca no dia.',
    how: 'Registre as frutas na aba Registrar. Sucos, doces e frutas em calda não contam.',
    measure: 'Alimentos do grupo de frutas da tabela TACO, sem sucos e doces.',
    benefits: [['apple', 'Estimula alimentos in natura, como recomenda o Guia Alimentar para a População Brasileira'], ['leaf', 'Frutas trazem fibras, vitaminas e água'], ['clock', 'Uma opção prática para os lanches']],
    tips: ['Deixe frutas à vista na cozinha', 'Leve uma fruta na bolsa para o lanche da tarde', 'Prefira a fruta inteira ao suco'],
    day: (d, x) => { const n = x.distinctInGroup(d, FRUIT, f => !NOT_FRESH.test(f.n)); return { value: n, target: 1, done: n >= 1, unit: 'frutas' }; },
  },
  {
    id: 'fibras-14', cat: 'alimentacao', title: 'Mais fibras', days: 14, level: 2, art: 'fibras-14',
    short: 'Fibras proporcionais à sua meta de calorias.',
    about: 'As fibras vêm de grãos integrais, feijões, frutas e verduras. A meta é proporcional à sua meta de calorias, e não um número igual para todos.',
    goal: 'Em 14 dias, chegar à sua meta de fibras: 14 g a cada 1.000 kcal da sua meta diária.',
    how: 'Registre as refeições. O desafio soma as fibras dos alimentos da tabela TACO; alimentos sem esse dado não entram na conta.',
    measure: 'Fibras dos alimentos registrados (tabela TACO), quando disponíveis.',
    benefits: [['wheat', 'Fibras ajudam no funcionamento do intestino'], ['bowl', 'Aumentam a saciedade das refeições'], ['heart', 'Fazem parte de uma alimentação equilibrada']],
    tips: ['Troque o arroz branco pelo integral algumas vezes na semana', 'Inclua feijão, lentilha ou grão-de-bico', 'Aumente as fibras aos poucos e beba líquidos ao longo do dia'],
    needsKcal: true,
    day: (d, x) => { const g = x.fiber(d), t = Math.round((x.kcalTarget * 14) / 1000); return { value: Math.round(g), target: t, done: t > 0 && g >= t, unit: 'g' }; },
  },
  {
    id: 'consciente-7', cat: 'alimentacao', title: 'Alimentação consciente', days: 7, level: 1, art: 'consciente-7',
    short: 'Três refeições registradas e a sua saciedade.',
    about: 'Comer com atenção ajuda a perceber a fome e a saciedade. O desafio pede o registro das refeições e uma pergunta rápida no fim do dia.',
    goal: 'Em 7 dias, registrar pelo menos 3 refeições e responder como você se sentiu depois delas.',
    how: 'Registre as refeições como sempre. À noite, responda no desafio uma pergunta de um toque sobre a saciedade.',
    measure: 'Refeições do diário e a sua resposta à pergunta do dia.',
    benefits: [['heart', 'Ajuda a perceber os sinais de fome e saciedade'], ['clock', 'Torna os horários das refeições mais regulares'], ['bowl', 'Mais atenção ao sabor e à textura da comida']],
    tips: ['Coma sentado e sem telas sempre que puder', 'Repare no sabor e na textura das primeiras garfadas', 'Não há resposta certa: a pergunta é só para você se observar'],
    checkin: 'mindful',
    day: (d, x) => { const m = x.meals(d), c = x.checkin(d)?.mindful; return { value: m, target: 3, done: m >= 3 && !!c, unit: 'refeições', note: c ? null : 'Falta a pergunta do dia' }; },
  },
  {
    id: 'variedade-21', cat: 'alimentacao', title: 'Variedade no prato', days: 21, level: 3, art: 'variedade-21',
    short: 'Alimentos de quatro grupos diferentes no dia.',
    about: 'Variar os grupos de alimentos é uma forma simples de equilibrar a alimentação. Conta cada dia com alimentos de pelo menos quatro grupos da tabela TACO.',
    goal: 'Em 21 dias, registrar alimentos de pelo menos 4 grupos diferentes no dia.',
    how: 'Registre as refeições. O desafio identifica o grupo de cada alimento (cereais, feijões, verduras, frutas, carnes, ovos, leite e outros).',
    measure: 'Grupos da tabela TACO dos alimentos registrados.',
    benefits: [['palette', 'Incentiva variedade nutricional'], ['target', 'Ajuda a equilibrar os grupos de alimentos'], ['sparkle', 'Ajuda a sair da rotina no prato']],
    tips: ['Arroz e feijão já são dois grupos', 'Some uma fruta no lanche e uma verdura no almoço', 'Experimente um alimento novo por semana'],
    day: (d, x) => { const n = x.groups(d); return { value: n, target: 4, done: n >= 4, unit: 'grupos' }; },
  },
  {
    id: 'movimento-7', cat: 'atividade', title: 'Movimento diário', days: 7, level: 1, art: 'movimento-7',
    short: 'Alguns minutos de movimento por dia.',
    about: 'Qualquer movimento conta: caminhar, pedalar, dançar, alongar. Você escolhe quantos minutos por dia, de acordo com a sua condição.',
    goal: 'Em 7 dias, fazer os minutos de atividade que você escolher.',
    how: 'Registre as atividades no cartão Atividades da aba Hoje e marque como feitas. O desafio soma os minutos do dia.',
    measure: 'Atividades feitas registradas no app.',
    benefits: [['calendar', 'Ajuda a criar regularidade de movimento'], ['chair', 'Reduz o tempo parado, como recomenda a OMS'], ['smile', 'Se mexer costuma melhorar a disposição']],
    tips: ['Comece pelo que for confortável: 10 minutos já contam', 'Prefira horários frescos; o app mostra o clima do horário', 'Dividir em duas caminhadas curtas também vale'],
    targets: { key: 'minutes', label: 'Minutos por dia', options: [{ id: 10, label: '10 min' }, { id: 15, label: '15 min' }, { id: 20, label: '20 min' }, { id: 30, label: '30 min' }], byActivity: { sedentario: 10, leve: 15, moderado: 20, alto: 30, extremo: 30 } },
    day: (d, x, t) => { const m = x.minutes(d); return { value: m, target: t, done: m >= t, unit: 'min' }; },
  },
  {
    id: 'caminhada-14', cat: 'atividade', title: 'Caminhada consciente', days: 14, level: 2, art: 'caminhada-14',
    short: 'Acumule minutos de caminhada em 14 dias.',
    about: 'A caminhada é uma das atividades mais acessíveis. O desafio soma os minutos de caminhada até chegar ao total que você escolher.',
    goal: 'Acumular, em até 14 dias de caminhada, o total de minutos que você escolher.',
    how: 'Registre cada caminhada no cartão Atividades (tipo Caminhada) e marque como feita. O desafio soma os minutos.',
    measure: 'Caminhadas feitas registradas no app.',
    benefits: [['shoe', 'Atividade aeróbica de baixo impacto'], ['walk', 'Pode ser feita perto de casa e sem equipamento'], ['heart', 'Atividade aeróbica regular faz parte de uma rotina saudável']],
    tips: ['Use um tênis confortável', 'Comece em ritmo leve e aumente aos poucos', 'Prefira trajetos com sombra e evite os horários mais quentes'],
    total: true,
    targets: { key: 'total', label: 'Total de minutos', options: [{ id: 90, label: '90 min' }, { id: 150, label: '150 min' }, { id: 210, label: '210 min' }, { id: 300, label: '300 min' }], byActivity: { sedentario: 90, leve: 150, moderado: 210, alto: 300, extremo: 300 } },
    day: (d, x) => { const m = x.minutes(d, 'caminhada'); return { value: m, target: 0, done: m > 0, unit: 'min' }; },
  },
  {
    id: 'corpo-21', cat: 'atividade', title: 'Corpo em movimento', days: 21, level: 3, art: 'corpo-21',
    short: 'Dias ativos e atividades variadas em 21 dias.',
    about: 'Variar as atividades trabalha o corpo de formas diferentes. Você escolhe quantos dias ativos quer ter em 21 dias, com pelo menos dois tipos de atividade.',
    goal: 'Ter os dias ativos que você escolher, com pelo menos 2 tipos diferentes de atividade no total.',
    how: 'Registre as atividades no cartão Atividades e marque como feitas. Cada dia com atividade feita conta.',
    measure: 'Atividades feitas registradas no app.',
    benefits: [['calendar', 'Estimula a consistência'], ['dumbbell', 'Combina resistência, força e mobilidade'], ['battery', 'Mais disposição no dia a dia']],
    tips: ['Alterne dias mais leves e mais intensos', 'Inclua alongamento ou mobilidade nos dias de descanso', 'Respeite os dias de recuperação'],
    variety: 2,
    targets: { key: 'days', label: 'Dias ativos', options: [{ id: 9, label: '9 dias' }, { id: 12, label: '12 dias' }, { id: 15, label: '15 dias' }], default: 12 },
    day: (d, x) => { const m = x.minutes(d); return { value: m, target: 1, done: m > 0, unit: 'min' }; },
  },
  {
    id: 'pausas-7', cat: 'atividade', title: 'Pausas ativas', days: 7, level: 1, art: 'pausas-7',
    short: 'Pausas de movimento no meio do dia sentado.',
    about: 'Levantar e se mexer por alguns minutos interrompe longos períodos sentado. Você registra as pausas do dia com um toque.',
    goal: 'Em 7 dias, fazer o número de pausas que você escolher.',
    how: 'Ao fim do dia, registre no desafio quantas pausas você fez. Cada pausa é levantar e se mexer por 2 a 5 minutos.',
    measure: 'Registro rápido no próprio desafio (o app não detecta pausas sozinho).',
    benefits: [['chair', 'Reduz o tempo sedentário'], ['stretch', 'Alivia a rigidez de quem passa muito tempo sentado'], ['clock', 'Pausas curtas cabem em qualquer rotina']],
    tips: ['Levante a cada hora para beber água', 'Atenda ligações em pé ou andando', 'Alongue pescoço, ombros e costas'],
    checkin: 'pauses',
    targets: { key: 'pauses', label: 'Pausas por dia', options: [{ id: 2, label: '2' }, { id: 3, label: '3' }, { id: 4, label: '4' }, { id: 5, label: '5' }], default: 3 },
    day: (d, x, t) => { const n = x.checkin(d)?.pauses ?? 0; return { value: n, target: t, done: n >= t, unit: 'pausas' }; },
  },
  {
    id: 'sono-14', cat: 'sono', title: 'Rotina de sono', days: 14, level: 2, art: 'sono-14',
    short: 'Dormir e acordar perto dos mesmos horários.',
    about: 'Horários regulares ajudam o corpo a descansar melhor. Você escolhe os horários de dormir e acordar que fazem sentido para você.',
    goal: 'Em 14 dias, dormir e acordar a até 45 minutos dos horários que você escolher.',
    how: 'Pela manhã, registre no desafio a hora em que dormiu e a hora em que acordou.',
    measure: 'Registro rápido no próprio desafio (o app ainda não lê dados de sono).',
    benefits: [['clock', 'Incentiva a regularidade do sono'], ['moon', 'Ajuda o corpo a reconhecer a hora de descansar'], ['sun', 'Ajuda a acordar com mais disposição']],
    tips: ['Mantenha os horários também no fim de semana', 'Evite cafeína no fim da tarde', 'Deixe o quarto escuro e fresco'],
    checkin: 'sleep',
    targets: { key: 'sleep', label: 'Horários', kind: 'sleep' },
    day: (d, x, t) => { const s = x.checkin(d)?.sleep; if (!s) return { value: null, target: null, done: false, unit: '' }; const ok = near(s.bed, t.bed) && near(s.wake, t.wake); return { value: `${s.bed}–${s.wake}`, target: `${t.bed}–${t.wake}`, done: ok, unit: '' }; },
  },
  {
    id: 'desconecte-7', cat: 'bemestar', title: 'Desconecte-se', days: 7, level: 1, art: 'desconecte-7',
    short: 'Um tempo sem telas antes de dormir.',
    about: 'Deixar o celular de lado antes de dormir ajuda a desacelerar. Você escolhe quanto tempo quer ficar sem telas.',
    goal: 'Em 7 dias, ficar sem telas pelo tempo que você escolher antes de dormir.',
    how: 'Pela manhã, registre no desafio quanto tempo ficou sem telas antes de dormir.',
    measure: 'Registro rápido no próprio desafio.',
    benefits: [['phone', 'Incentiva hábitos de desaceleração noturna'], ['moon', 'Menos estímulo antes de dormir'], ['sparkle', 'Mais tempo para leitura, conversa ou descanso']],
    tips: ['Carregue o celular longe da cama', 'Troque a tela por leitura, banho ou alongamento', 'Use o modo descanso do celular'],
    checkin: 'screens',
    targets: { key: 'screens', label: 'Sem telas antes de dormir', options: [{ id: 30, label: '30 min' }, { id: 45, label: '45 min' }, { id: 60, label: '1 hora' }], default: 30 },
    day: (d, x, t) => { const m = x.checkin(d)?.screens; return { value: m ?? null, target: t, done: m != null && m >= t, unit: 'min' }; },
  },
  {
    id: 'recuperacao-7', cat: 'sono', title: 'Recuperação consciente', days: 7, level: 1, art: 'recuperacao-7',
    short: 'Ouvir o corpo e respeitar o descanso.',
    about: 'Descansar também faz parte de uma rotina ativa. O desafio pede que você diga como o corpo está e respeite os dias de descanso.',
    goal: 'Em 7 dias, registrar como o corpo está e, nos dias de cansaço ou dor, não fazer atividade intensa.',
    how: 'Responda no desafio como o corpo está. O app cruza a resposta com as atividades registradas.',
    measure: 'Registro rápido no próprio desafio e as atividades registradas.',
    benefits: [['battery', 'Equilíbrio entre atividade e recuperação'], ['bed', 'Descanso também faz parte de uma rotina ativa'], ['heart', 'Ajuda a perceber os sinais de cansaço']],
    tips: ['Dia de descanso não é dia perdido', 'Um sono bom é parte da recuperação', 'Dor que não passa merece avaliação profissional'],
    checkin: 'body',
    day: (d, x) => { const b = x.checkin(d)?.body; if (!b) return { value: null, target: null, done: false, unit: '' }; const ok = b === 'bem' || !x.intense(d); return { value: b, target: null, done: ok, unit: '', note: ok ? null : 'Atividade intensa num dia de cansaço' }; },
  },
];
export const challengeById = id => CHALLENGES.find(c => c.id === id) ?? null;

const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
/** Dois horários a até 45 minutos um do outro (considera a virada da meia-noite). */
export function near(a, b, tol = 45) { const d = Math.abs(toMin(a) - toMin(b)) % 1440; return Math.min(d, 1440 - d) <= tol; }

// ---------------------------------------------------------------------------
// Fonte de dados: tudo lido dos registros originais.

export function sources({ drinks = [], legacy = {}, goalFor, entries = [], foodById, activities = [], checkins = {}, kcalTarget = null }) {
  const byDate = (list, d) => list.filter(x => x.date === d);
  const foodsOn = d => byDate(entries, d).map(e => ({ e, f: e.foodId ? foodById(e.foodId) : null }));
  const done = d => byDate(activities, d).filter(a => a.status === 'feita');
  return {
    goalFor, kcalTarget,
    liquids: d => dayTotal(drinks, legacy, d).total,
    waterOnly: d => byDate(drinks, d).filter(x => x.type === 'agua' || x.type === 'gas').reduce((s, x) => s + x.ml, 0) + (legacy[d] ?? 0),
    periods: d => new Set(byDate(drinks, d).filter(x => x.ts).map(x => { const h = hourOf(x.ts); return h < 12 ? 'm' : h < 18 ? 't' : 'n'; })).size,
    distinctInGroup: (d, g, ok = () => true) => new Set(foodsOn(d).filter(({ f }) => f?.g === g && ok(f)).map(({ f }) => f.id)).size,
    groups: d => new Set(foodsOn(d).map(({ f }) => f?.g).filter(Boolean)).size,
    fiber: d => foodsOn(d).reduce((s, { e, f }) => s + (f?.fb != null && e.grams ? (f.fb * e.grams) / 100 : 0), 0),
    meals: d => new Set(byDate(entries, d).map(e => e.meal)).size,
    minutes: (d, type) => done(d).filter(a => !type || a.type === type).reduce((s, a) => s + (a.minutes || 0), 0),
    types: dates => new Set(activities.filter(a => a.status === 'feita' && dates.includes(a.date)).map(a => a.type)).size,
    intense: d => done(d).some(a => a.intensity === 'intensa'),
    checkin: d => checkins[d] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Avaliação de um desafio da pessoa.

/** Dias do desafio que contam (exclui os dias em pausa), do início até hoje ou até o fim. */
export function countedDates(uc, today) {
  const last = uc.endDate && uc.endDate < today ? uc.endDate : today;
  const out = [];
  for (let d = uc.startDate; d <= last; d = addDays(d, 1)) {
    const paused = (uc.pauses ?? []).some(p => d >= p.from && (!p.to || d < p.to));
    if (!paused) out.push(d);
  }
  return out;
}

export function needed(def, target) {
  if (def.targets?.key === 'days') return target;
  return def.days;
}

/**
 * Progresso: { days: [{date, value, target, done}], completed, needed, pct, done, total? }.
 * Concluído só quando o critério é cumprido (nunca só pelo prazo).
 */
export function evaluate(def, uc, src, today) {
  const t = uc.target;
  const dates = countedDates(uc, today);
  const days = dates.map(d => ({ date: d, ...def.day(d, src, t) }));
  const completed = days.filter(x => x.done).length;
  if (def.total) {
    const sum = days.reduce((s, x) => s + (x.value || 0), 0);
    const pct = Math.min(100, Math.round((sum / t) * 100));
    return { days, completed, needed: def.days, sum, totalTarget: t, pct, done: sum >= t, remaining: Math.max(0, t - sum) };
  }
  const need = needed(def, t);
  let done = completed >= need;
  let missing = null;
  if (def.variety && done && src.types(days.filter(x => x.done).map(x => x.date)) < def.variety) { done = false; missing = `Falta variar: faça pelo menos ${def.variety} tipos diferentes de atividade.`; }
  const pct = Math.min(100, Math.round((Math.min(completed, need) / need) * 100)) - (missing ? 1 : 0);
  return { days, completed, needed: need, pct, done, remaining: Math.max(0, need - completed), missing };
}

/** Comparação dos últimos 7 dias com os 7 anteriores (para o indicador de evolução). */
export function trend(days) {
  const last = days.slice(-7), prev = days.slice(-14, -7);
  if (prev.length < 3) return null;
  const a = last.filter(x => x.done).length / last.length, b = prev.filter(x => x.done).length / prev.length;
  return a > b + 0.1 ? 'subindo' : a < b - 0.1 ? 'caindo' : 'estável';
}

/**
 * Ajuste adaptativo: depois de 7 dias com menos de 40% dos dias cumpridos, sugere a meta
 * imediatamente mais leve (nunca mais exigente). Desafios sem meta ajustável não mudam.
 */
export function adaptiveSuggestion(def, uc, ev) {
  if (!def.targets?.options || ev.done) return null;
  const elapsed = ev.days.length;
  if (elapsed < 7 || ev.completed / elapsed >= 0.4) return null;
  const opts = def.targets.options, i = opts.findIndex(o => o.id === uc.target);
  const easier = def.targets.key === 'share' ? opts[i + 1] : opts[i - 1];
  return easier ? { target: easier.id, label: easier.label } : null;
}

/** Meta inicial sugerida (individual, a partir do perfil). */
export function defaultTarget(def, profile = {}) {
  const T = def.targets;
  if (!T) return null;
  if (T.kind === 'sleep') { const wake = profile.wake ?? '07:00'; return { bed: addMin(wake, -8 * 60), wake }; }
  if (T.byActivity) return T.byActivity[profile.activity] ?? T.options[0].id;
  return T.default ?? T.options[0].id;
}
const pad = n => String(n).padStart(2, '0');
export const addMin = (t, m) => { const v = ((toMin(t) + m) % 1440 + 1440) % 1440; return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`; };

/** Pode começar? Bloqueios ligados à saúde e a dados que faltam. */
export function startBlock(def, { restricted = false, kcalTarget = null } = {}) {
  if (def.blockIfRestricted && restricted) return 'Com a orientação médica para limitar líquidos ligada em Ajustes, este desafio não está disponível. Siga a orientação do seu médico.';
  if (def.needsKcal && !kcalTarget) return 'Este desafio usa a sua meta de calorias, que o app não calcula no seu caso. Converse com um nutricionista sobre fibras.';
  return null;
}

// ---------------------------------------------------------------------------
// Recomendações: só a partir dos registros dos últimos 14 dias. Sem dados, não há recomendação.

export function recommend({ src, today, active = [], restricted = false, kcalTarget = null }) {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, -i - 1));
  const daysWith = f => dates.filter(f).length;
  const has = { drinks: daysWith(d => src.liquids(d) > 0), food: daysWith(d => src.meals(d) > 0), move: daysWith(d => src.minutes(d) > 0) };
  const metGoal = daysWith(d => src.liquids(d) >= src.goalFor(d));
  const out = [];
  const add = (id, why) => { const def = challengeById(id); if (!active.includes(id) && !startBlock(def, { restricted, kcalTarget })) out.push({ id, why }); };
  if (has.drinks >= 3) add(metGoal >= 7 ? 'agua-ritmo-14' : 'agua-21', `Você registrou líquidos em ${has.drinks} dos últimos 14 dias.`);
  else if (has.drinks > 0) add('agua-pura-7', 'Você começou a registrar líquidos.');
  if (has.food >= 3) {
    const veg = daysWith(d => src.distinctInGroup(d, VEG) >= 2);
    add(veg < 4 ? 'prato-colorido-7' : 'variedade-21', `Você registrou refeições em ${has.food} dos últimos 14 dias.`);
  }
  if (has.move >= 2) add(has.move >= 6 ? 'corpo-21' : 'movimento-7', `Você registrou atividades em ${has.move} dos últimos 14 dias.`);
  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Campanhas sazonais: datas fixas no calendário, cada uma destacando desafios.

export const CAMPAIGNS = [
  { id: 'hidratacao', title: 'Semana da Hidratação', text: 'No auge do verão, um convite para cuidar dos líquidos.', from: '01-15', to: '01-21', ids: ['agua-21', 'agua-ritmo-14', 'agua-pura-7'], cat: 'hidratacao' },
  { id: 'movimento', title: 'Mês do Movimento', text: 'Abril tem o Dia Mundial da Atividade Física (6 de abril). Um mês para se mexer mais, no seu ritmo.', from: '04-01', to: '04-30', ids: ['movimento-7', 'caminhada-14', 'corpo-21', 'pausas-7'], cat: 'atividade' },
  { id: 'alimentacao', title: 'Semana da Alimentação Consciente', text: 'Em torno do Dia Mundial da Alimentação (16 de outubro).', from: '10-13', to: '10-19', ids: ['consciente-7', 'prato-colorido-7', 'frutas-7'], cat: 'alimentacao' },
  { id: 'hidratacao-dez', title: 'Semana da Hidratação', text: 'O calor chegou: um convite para cuidar dos líquidos.', from: '12-01', to: '12-07', ids: ['agua-21', 'agua-ritmo-14', 'agua-pura-7'], cat: 'hidratacao' },
];
/** Campanha ativa hoje, ou a próxima (com os dias que faltam). */
export function campaignFor(today) {
  const y = Number(today.slice(0, 4)), md = today.slice(5);
  const active = CAMPAIGNS.find(c => md >= c.from && md <= c.to);
  if (active) return { ...active, active: true, until: `${y}-${active.to}` };
  const next = CAMPAIGNS.map(c => { const start = `${md < c.from ? y : y + 1}-${c.from}`; return { ...c, start, inDays: diffDays(today, start) }; }).sort((a, b) => a.inDays - b.inDays)[0];
  return { ...next, active: false };
}

// ---------------------------------------------------------------------------
// Conquistas: só por critério cumprido, nunca por começar.

// Conquistas: as de desafios e as de ofensiva. `progress` mostra o andamento (valor e meta) das que
// estão em andamento; `tier` marca as especiais (bronze, prata, ouro), poucas de propósito.
const ofDays = n => s => ({ value: Math.min(s.streak?.best ?? 0, n), target: n });
const binary = ok => ({ value: ok ? 1 : 0, target: 1 });
export const ACHIEVEMENTS = [
  { id: 'primeiro-dia', group: 'ofensiva', title: 'Primeiro dia', text: 'Completou o primeiro dia da ofensiva.', medal: 'sprout', test: s => (s.streak?.best ?? 0) >= 1, progress: ofDays(1) },
  { id: 'uma-semana', group: 'ofensiva', title: 'Uma semana', text: 'Manteve 7 dias seguidos de ofensiva.', medal: 'streak', stars: 1, test: s => (s.streak?.best ?? 0) >= 7, progress: ofDays(7) },
  { id: 'duas-semanas', group: 'ofensiva', title: 'Duas semanas', text: 'Manteve 14 dias seguidos de ofensiva.', medal: 'streak', stars: 2, test: s => (s.streak?.best ?? 0) >= 14, progress: ofDays(14) },
  { id: 'um-mes', group: 'ofensiva', title: 'Consistência mensal', text: 'Manteve 30 dias seguidos de ofensiva.', medal: 'streak', stars: 3, tier: 'ouro', test: s => (s.streak?.best ?? 0) >= 30, progress: ofDays(30) },
  { id: 'semanas', group: 'ofensiva', title: 'Semanas em ritmo', text: 'Teve 4 semanas consistentes.', medal: 'calendar', test: s => (s.streak?.consistentWeeks ?? 0) >= 4, progress: s => ({ value: Math.min(s.streak?.consistentWeeks ?? 0, 4), target: 4 }) },
  { id: 'superacao', group: 'ofensiva', title: 'Superação', text: 'Retomou a rotina e fez 7 dias seguidos depois de uma interrupção.', medal: 'rise', tier: 'bronze', test: s => !!s.streak?.comebackOn, progress: s => binary(!!s.streak?.comebackOn) },
  { id: 'recordista', group: 'ofensiva', title: 'Recordista', text: 'Superou o seu recorde pessoal de ofensiva.', medal: 'peak', tier: 'prata', test: s => !!s.streak?.recordBeatenOn, progress: s => binary(!!s.streak?.recordBeatenOn) },
  { id: 'cem-dias', group: 'ofensiva', title: '100 dias ativos', text: 'Somou 100 dias cumpridos, seguidos ou não.', medal: 'hundred', tier: 'ouro', test: s => (s.streak?.totalActive ?? 0) >= 100, progress: s => ({ value: Math.min(s.streak?.totalActive ?? 0, 100), target: 100 }) },
  { id: 'primeiros-passos', group: 'desafios', title: 'Primeiros passos', text: 'Concluiu o primeiro desafio.', medal: 'flag', test: s => s.concluded.length >= 1, progress: s => ({ value: Math.min(s.concluded.length, 1), target: 1 }) },
  { id: 'persistencia', group: 'desafios', title: 'Persistência', text: 'Cumpriu 7 dias de um mesmo desafio.', medal: 'path', test: s => s.maxDays >= 7, progress: s => ({ value: Math.min(s.maxDays, 7), target: 7 }) },
  { id: 'disciplina', group: 'desafios', title: 'Disciplina', text: 'Concluiu um desafio de 14 dias.', medal: 'target', test: s => s.concluded.some(c => c.def.days === 14), progress: s => binary(s.concluded.some(c => c.def.days === 14)) },
  { id: 'consistencia', group: 'desafios', title: 'Consistência', text: 'Concluiu um desafio de 21 dias.', medal: 'rings', test: s => s.concluded.some(c => c.def.days === 21), progress: s => binary(s.concluded.some(c => c.def.days === 21)) },
  { id: 'hidratacao', group: 'desafios', title: 'Hidratação em dia', text: 'Concluiu um desafio de hidratação.', medal: 'drop', cat: 'hidratacao', test: s => s.concluded.some(c => c.def.cat === 'hidratacao'), progress: s => binary(s.concluded.some(c => c.def.cat === 'hidratacao')) },
  { id: 'alimentacao', group: 'desafios', title: 'Alimentação consciente', text: 'Concluiu um desafio de alimentação.', medal: 'leaf', cat: 'alimentacao', test: s => s.concluded.some(c => c.def.cat === 'alimentacao'), progress: s => binary(s.concluded.some(c => c.def.cat === 'alimentacao')) },
  { id: 'corpo-ativo', group: 'desafios', title: 'Corpo ativo', text: 'Concluiu um desafio de atividade física.', medal: 'motion', cat: 'atividade', test: s => s.concluded.some(c => c.def.cat === 'atividade'), progress: s => binary(s.concluded.some(c => c.def.cat === 'atividade')) },
  { id: 'bom-descanso', group: 'desafios', title: 'Bom descanso', text: 'Concluiu um desafio de sono ou recuperação.', medal: 'moon', cat: 'sono', test: s => s.concluded.some(c => c.def.cat === 'sono'), progress: s => binary(s.concluded.some(c => c.def.cat === 'sono')) },
  { id: 'equilibrio', group: 'desafios', title: 'Equilíbrio', text: 'Concluiu um desafio de bem-estar.', medal: 'balance', cat: 'bemestar', test: s => s.concluded.some(c => c.def.cat === 'bemestar'), progress: s => binary(s.concluded.some(c => c.def.cat === 'bemestar')) },
  { id: 'colecionador', group: 'desafios', title: 'Colecionador', text: 'Concluiu 5 desafios.', medal: 'collection', tier: 'prata', test: s => s.concluded.length >= 5, progress: s => ({ value: Math.min(s.concluded.length, 5), target: 5 }) },
];

function stats({ mine, evals, streak }) {
  const concluded = mine.filter(uc => uc.status === 'concluido').map(uc => ({ uc, def: challengeById(uc.challengeId) })).filter(x => x.def);
  const maxDays = Math.max(0, ...mine.map(uc => evals[uc.id]?.completed ?? uc.final?.completed ?? 0));
  return { concluded, maxDays, streak };
}
/** Conquistas que deveriam estar desbloqueadas agora (ids). `streak`: resumo de computeStreak. */
export function earned({ mine, evals = {}, streak = null }) {
  const s = stats({ mine, evals, streak });
  return ACHIEVEMENTS.filter(a => a.test(s)).map(a => a.id);
}
/** Andamento de cada conquista ({ id: { value, target } }). */
export function achievementProgress({ mine, evals = {}, streak = null }) {
  const s = stats({ mine, evals, streak });
  return Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a.progress(s)]));
}
