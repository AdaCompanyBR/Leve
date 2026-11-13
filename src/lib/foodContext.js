// Alimentação no contexto do dia: sugestões ligadas ao clima e às atividades. Não muda metas de
// calorias nem de macros e não classifica alimento como obrigatório ou proibido; cada sugestão só
// abre a busca do alimento, para a pessoa decidir.
//
// Regras:
// - Dia quente: sensação térmica de 27 °C ou mais (faixa "atenção ao calor" do NWS/NOAA).
//   Alimentos com muita água: entre 85% e 96% de água nas tabelas de referência (USDA FoodData Central).
// - Dia frio: sensação máxima de até 16 °C ou mínima de até 10 °C (regra do app, não oficial).
// - Dia de atividade: atividade moderada ou intensa de 30 minutos ou mais, feita ou planejada.

const WATERY = [
  { label: 'Melancia', query: 'Melancia, crua' }, { label: 'Melão', query: 'Melão, cru' }, { label: 'Morango', query: 'Morango, cru' },
  { label: 'Laranja', query: 'Laranja, baía, crua' }, { label: 'Abacaxi', query: 'Abacaxi, cru' }, { label: 'Pepino', query: 'Pepino, cru' },
  { label: 'Alface', query: 'Alface, crespa, crua' }, { label: 'Tomate', query: 'Tomate, com semente, cru' },
];
const WARM = [
  { label: 'Abóbora cozida', query: 'Abóbora, cabotian, cozida' }, { label: 'Cenoura cozida', query: 'Cenoura, cozida' }, { label: 'Feijão', query: 'Feijão, carioca, cozido' },
  { label: 'Batata-doce', query: 'Batata, doce, cozida' }, { label: 'Mandioquinha', query: 'Batata, baroa, cozida' },
];
const RECOVERY = [
  { label: 'Banana', query: 'Banana, prata, crua' }, { label: 'Iogurte natural', query: 'Iogurte, natural' }, { label: 'Ovo cozido', query: 'Ovo, de galinha, inteiro, cozido/10minutos' },
  { label: 'Aveia', query: 'Aveia, flocos, crua' }, { label: 'Pão integral', query: 'Pão, trigo, forma, integral' },
];

/** Sugestões do dia (no máximo duas), do mais relevante para o menos. */
export function foodTips(ctx, { activities = [] } = {}) {
  const out = [];
  const active = activities.filter(a => (a.minutes ?? 0) >= 30 && a.intensity !== 'leve');
  if (active.length) out.push({ id: 'atividade', title: 'Dia de atividade', text: 'Depois do exercício, uma refeição ou lanche com carboidrato e proteína ajuda na recuperação, dentro das suas metas do dia.', items: RECOVERY });
  const d = ctx?.todayDay;
  if (d) {
    const feelsMax = d.feelsMax ?? ctx.current?.feels;
    if (feelsMax != null && feelsMax >= 27) out.unshift({ id: 'calor', title: 'Dia quente', text: 'Frutas e verduras com muita água ajudam na hidratação, e refeições mais leves costumam ser mais confortáveis no calor, sempre dentro do seu plano.', items: WATERY, source: 'Teor de água de 85% a 96% (USDA FoodData Central).' });
    else if ((d.feelsMax != null && d.feelsMax <= 16) || (d.min != null && d.min <= 10)) out.push({ id: 'frio', title: 'Dia frio', text: 'Se quiser, prefira preparações quentes, como sopas de legumes, caldos caseiros e legumes cozidos.', items: WARM });
  }
  return out.slice(0, 2);
}
