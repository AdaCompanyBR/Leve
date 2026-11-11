// Trocas: para um alimento ou bebida, sugere opções com menos calorias e explica o porquê.
// Funções puras. As calorias das alternativas vêm da TACO, na mesma quantidade em gramas
// (ou ml). Água tem zero caloria; refrigerante zero aparece como "quase sem calorias", sem número.
import { norm } from './parser.js';

// Alternativas que não estão na TACO.
export const WATER = { label: 'Água ou água com gás', kcal100: 0 };
export const ZERO = { label: 'Refrigerante zero', kcal100: null };

const FRUITS = ['Morango, cru', 'Maçã, Fuji, com casca, crua', 'Banana, prata, crua'];
const LEAN = ['Frango, peito, sem pele, grelhado', 'Carne, bovina, patinho, sem gordura, grelhado', 'Merluza, filé, assado'];

/**
 * Regras na ordem de prioridade. `match` roda sobre o nome normalizado (sem acento, minúsculo).
 * `alts` são nomes exatos da TACO, ou WATER e ZERO.
 */
export const RULES = [
  { id: 'suco', match: /^(?!limao)(?!.*\b(zero|diet|light)\b).*(\bsuco\b|nectar|refresco)/,
    reason: 'Suco junta o açúcar de várias frutas num copo e quase não tem fibra. As calorias entram rápido e a fome volta logo.',
    alts: [WATER, ZERO, 'Chá, mate, infusão 5%', 'Laranja, pêra, crua'] },
  { id: 'refri', match: /^(?!.*\b(zero|diet|light|sem acucar)\b).*(refrigerante|\bcoca\b|coca-cola|guarana|fanta|sprite|pepsi|soda)/,
    reason: 'Refrigerante comum é basicamente açúcar dissolvido: soma calorias sem matar a fome.',
    alts: [ZERO, WATER, 'Chá, mate, infusão 5%'] },
  { id: 'alcool', match: /cerveja|vinho|cachaca|vodka|whisky|caipirinha|drink|chopp/,
    reason: 'O álcool tem 7 kcal por grama, quase o dobro do açúcar, e costuma abrir o apetite.',
    alts: [WATER, ZERO] },
  { id: 'achocolatado', match: /achocolatado/,
    reason: 'Achocolatado pronto vem com bastante açúcar. Iogurte natural mata a fome com menos calorias.',
    alts: ['Iogurte, natural, desnatado', 'Café, infusão 10%'] },
  { id: 'iogurte-sabor', match: /iogurte.*sabor|petit suisse/,
    reason: 'Iogurte com sabor tem açúcar adicionado. O natural com fruta picada fica doce sem esse extra.',
    alts: ['Iogurte, natural, desnatado', 'Iogurte, natural'] },
  { id: 'acucar', match: /^acucar|^mel\b|^melado/,
    reason: 'Açúcar e mel são calorias puras. Em bebidas, o paladar se acostuma com menos em poucas semanas.',
    alts: [{ label: 'Adoçante ou nada', kcal100: null }] },
  { id: 'chocolate', match: /^chocolate|com chocolate|de chocolate|bombom|brigadeiro|doce,? de leite|leite,? condensado|pe-de-moleque|pacoca|sorvete|pudim/,
    reason: 'Doces como esse são metade açúcar, metade gordura. Uma fruta resolve a vontade de doce com muito menos calorias.',
    alts: FRUITS },
  { id: 'biscoito', match: /biscoito.*(recheado|wafer|maisena)|\bbolo\b|\btorta\b|cereal matinal.*acucar/,
    reason: 'Biscoitos e bolos prontos somam açúcar, farinha refinada e gordura e saciam pouco.',
    alts: [...FRUITS, 'Pão, trigo, forma, integral'] },
  { id: 'chips', match: /chips|salgadinho/,
    reason: 'Salgadinho de pacote é frito e muito concentrado: um punhado já soma bastante.',
    alts: ['Pipoca, com óleo de soja, sem sal', 'Batata, inglesa, cozida'] },
  { id: 'batata-frita', match: /batata.*frita/,
    reason: 'A fritura faz a batata absorver óleo e multiplica as calorias.',
    alts: ['Batata, inglesa, cozida', 'Batata, doce, cozida', 'Batata, inglesa, sauté'] },
  { id: 'mandioca-frita', match: /mandioca.*frita|farofa/,
    reason: 'Fritura e farofa somam muita gordura à mandioca.',
    alts: ['Mandioca, cozida'] },
  { id: 'salgado', match: /coxinha|pastel|empada|croquete|esfirra|kibe|quibe.*frito|enroladinho/,
    reason: 'Salgados de massa frita têm muita gordura e pouca proteína para as calorias que trazem.',
    alts: ['Quibe, assado', 'Ovo, de galinha, inteiro, cozido/10minutos', 'Frango, peito, sem pele, grelhado'] },
  { id: 'embutido', match: /linguica|salame|mortadela|salsicha|toucinho|bacon|presunto, com capa/,
    reason: 'Embutidos e toucinho são carnes muito gordas e salgadas. Carnes magras dão mais proteína por caloria.',
    alts: ['Peru, congelado, assado', 'Presunto, sem capa de gordura', ...LEAN] },
  { id: 'carne-gorda', match: /carne, bovina.*(com gordura|picanha|cupim|costela|fraldinha|a milanesa|almondega)|porco.*(costela|bisteca|frita)|hamburguer/,
    reason: 'Cortes gordos, empanados e frituras somam muita gordura. Um corte magro grelhado dá a mesma proteína com menos calorias.',
    alts: LEAN },
  { id: 'frango-pele', match: /frango.*(com pele|milanesa|asa)|nugget/,
    reason: 'A pele e o empanado concentram a gordura do frango.',
    alts: ['Frango, peito, sem pele, grelhado', 'Frango, coxa, sem pele, cozida'] },
  { id: 'peixe-frito', match: /(pescada|merluza|sardinha|cacao|manjuba|lambari|camarao).*frit/,
    reason: 'Peixe frito absorve óleo. Assado ou grelhado mantém o peixe leve.',
    alts: ['Merluza, filé, assado', 'Pescada, filé, molho escabeche'] },
  { id: 'ovo-frito', match: /ovo.*frito|omelete/,
    reason: 'O óleo da frigideira soma calorias ao ovo. Cozido, ele fica com as mesmas proteínas.',
    alts: ['Ovo, de galinha, inteiro, cozido/10minutos'] },
  { id: 'queijo', match: /queijo, (prato|mozarela|parmesao|pasteurizado|minas, meia cura)|requeijao|cream cheese/,
    reason: 'Queijos amarelos e cremosos têm muita gordura. Os brancos e frescos têm bem menos.',
    alts: ['Queijo, ricota', 'Queijo, minas, frescal'] },
  { id: 'gordura', match: /^manteiga|^margarina|^maionese|^creme de leite/,
    reason: 'É quase só gordura: uma camada fina já soma muitas calorias.',
    alts: ['Queijo, ricota', 'Iogurte, natural'] },
  { id: 'pao', match: /pao, trigo, (frances|sovado)|^torrada|pao,? de queijo/,
    reason: 'O pão integral tem mais fibra, sacia por mais tempo e tem menos calorias no mesmo peso.',
    alts: ['Pão, trigo, forma, integral', 'Cuscuz, de milho, cozido com sal'] },
  { id: 'macarrao-inst', match: /macarrao, instantaneo/,
    reason: 'Macarrão instantâneo é pré-frito e vem com tempero muito salgado.',
    alts: ['Lasanha, massa fresca, cozida', 'Batata, inglesa, cozida'] },
  { id: 'acai', match: /acai.*xarope/,
    reason: 'O açaí adoçado vem com xarope. A polpa pura tem metade das calorias.',
    alts: ['Açaí, polpa, congelada'] },
];

/** Grupos em que a troca genérica (mesmo alimento, outra versão) não faz sentido. */
const NO_FALLBACK = new Set(['Cereais e derivados', 'Leite e derivados', 'Ovos e derivados', 'Nozes e sementes', 'Gorduras e óleos', 'Bebidas (alcoólicas e não alcoólicas)', 'Verduras, hortaliças e derivados', 'Frutas e derivados', 'Leguminosas e derivados']);
const ORGAN = /figado|coracao|bucho|lingua|moela|rim\b|miudo|orelha|rabo|mocoto/;
const RAW = /\b(cru|crua|crus|cruas|po|desidratad\w*|concentrad\w*|mistura para)\b/;
const words = s => new Set(norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 2));

/** Economia mínima para valer a sugestão: 15% e 15 kcal na porção. */
export const worthIt = (kcal, altKcal) => kcal - altKcal >= 15 && altKcal <= kcal * 0.85;

/**
 * Sugestões de troca para `grams` de `food` ({ n, k por 100 g, g? }).
 * `taco` é a lista completa da TACO. Devolve null quando não há troca que valha a pena.
 * Cada alternativa: { label, food (item da TACO ou null), kcal (na mesma quantidade, ou null), saved }.
 */
export function swapsFor(food, grams, taco, max = 3) {
  if (!food || !(grams > 0) || !(food.k > 0)) return null;
  const name = norm(food.n);
  const kcal = Math.round(food.k * grams / 100);
  const byName = new Map(taco.map(f => [f.n, f]));
  const build = alt => {
    if (typeof alt === 'string') {
      const f = byName.get(alt);
      if (!f || f.n === food.n) return null;
      const k = Math.round(f.k * grams / 100);
      return worthIt(kcal, k) ? { label: f.n, food: f, kcal: k, saved: kcal - k } : null;
    }
    if (kcal < 15) return null;
    return { label: alt.label, food: null, kcal: alt.kcal100 == null ? null : 0, saved: kcal };
  };

  const rule = RULES.find(r => r.match.test(name));
  if (rule) {
    const alts = rule.alts.map(build).filter(Boolean).slice(0, max);
    if (alts.length) return { rule: rule.id, reason: rule.reason, kcal, grams, alts };
  }

  // Troca genérica: outra versão do mesmo alimento na TACO, no mesmo estado (cru com cru, pronto com pronto).
  if (!food.g || NO_FALLBACK.has(food.g) || food.k < 120) return null;
  const head = name.split(',')[0].trim();
  const raw = RAW.test(name);
  const mine = words(food.n);
  const alts = taco
    .filter(f => f.g === food.g && f.n !== food.n && norm(f.n).split(',')[0].trim() === head && RAW.test(norm(f.n)) === raw && f.k <= food.k * 0.75 && !ORGAN.test(norm(f.n)))
    .map(f => ({ f, overlap: [...words(f.n)].filter(w => mine.has(w)).length }))
    .sort((a, b) => b.overlap - a.overlap || a.f.k - b.f.k)
    .map(({ f }) => build(f.n)).filter(Boolean).slice(0, 2);
  if (!alts.length) return null;
  return { rule: 'mesmo-alimento', reason: 'Outra versão do mesmo alimento, com bem menos calorias na mesma quantidade.', kcal, grams, alts };
}

/**
 * Trocas para os tipos de bebida da aba Líquidos. Lá não se sabe qual suco ou qual cerveja foi,
 * então a sugestão não traz números, só o motivo e as opções.
 */
export const DRINK_SWAPS = {
  suco: { reason: RULES[0].reason, alts: ['Água', 'Refrigerante zero', 'Chá sem açúcar', 'A fruta inteira, que tem fibra'] },
  refri: { reason: RULES[1].reason, alts: ['Refrigerante zero', 'Água com gás e limão', 'Chá gelado sem açúcar'] },
  alcool: { reason: `${RULES[2].reason} Além disso, ele não conta para a meta de líquidos.`, alts: ['Água com gás e limão', 'Refrigerante zero', 'Intercalar cada dose com um copo de água'] },
  isotonico: { reason: 'Isotônico tem açúcar e serve para treinos longos e intensos. No dia a dia, a água hidrata igual.', alts: ['Água', 'Água de coco, que tem menos açúcar'] },
};
