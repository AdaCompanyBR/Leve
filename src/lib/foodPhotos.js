// Fotos do diário alimentar. Função pura, testável.
// - Cada refeição tem uma foto ilustrativa para quando ainda não há nada registrado.
// - Um alimento registrado usa a foto real do produto quando ela existe (Open Food Facts, `img`);
//   sem ela, uma foto ilustrativa do tipo de alimento, escolhida pelo nome e pelo grupo da TACO.
// A tela sempre marca as fotos ilustrativas como tal, para não parecer o alimento de fato consumido.
// Fotos: Unsplash (licença Unsplash), em img/food/ (ver img/food/CREDITOS.md).

export const MEAL_PHOTO = { cafe: 'meal-cafe', almoco: 'meal-almoco', lanches: 'meal-lanche', jantar: 'meal-jantar' };

// Primeiro pelo nome (mais específico), depois pelo grupo da TACO.
const BY_NAME = [
  [/\bpizza/, 'pizza'],
  [/\b(arroz|risoto)/, 'arroz'],
  [/\b(feij[aã]o|lentilha|gr[aã]o.de.bico|ervilha|soja)/, 'feijao'],
  [/\b(macarr[aã]o|massa|espaguete|lasanha|nhoque|talharim)/, 'massa'],
  [/\b(p[aã]o|p[aã]es|torrada|bisnaguinha|tapioca|cuscuz)/, 'pao'],
  [/^ovos?\b|\bovos? (cozido|frito|mexido)|omelete/, 'ovo'],
  [/\b(frango|galinha|peru|chester)/, 'frango'],
  [/\b(peixe|atum|sardinha|salm[aã]o|til[aá]pia|camar[aã]o|bacalhau|merluza|pescada)/, 'peixe'],
  [/\b(queijo|requeij[aã]o|ricota|mussarela|muçarela)/, 'queijo'],
  [/\b(iogurte|coalhada|kefir)/, 'iogurte'],
  [/\b(caf[eé]|cappuccino)|(^|\s)ch[aá]([\s,]|$)/, 'cafe'],
  [/\b(suco|vitamina|smoothie|refrigerante)/, 'suco'],
  [/\b(chocolate|bolo|doce|brigadeiro|sorvete|biscoito recheado|pudim|bombom)/, 'doce'],
  [/\b(leite|achocolatado)/, 'leite'],
  [/\b(batata frita|salgadinho|chips|pipoca)/, 'salgadinho'],
  [/\b(castanha|amendoim|nozes|am[eê]ndoa|semente)/, 'nozes'],
  [/\b(salada|alface|r[uú]cula|agri[aã]o)/, 'verdura'],
];
const BY_GROUP = {
  'Frutas e derivados': 'fruta',
  'Verduras, hortaliças e derivados': 'verdura',
  'Cereais e derivados': 'pao',
  'Leguminosas e derivados': 'feijao',
  'Carnes e derivados': 'carne',
  'Pescados e frutos do mar': 'peixe',
  'Ovos e derivados': 'ovo',
  'Leite e derivados': 'leite',
  'Produtos açucarados': 'doce',
  'Bebidas (alcoólicas e não alcoólicas)': 'suco',
  'Nozes e sementes': 'nozes',
};
// "iogurte" usa a mesma foto do lanche (iogurte com frutas).
const FILE = { iogurte: 'meal-lanche' };

/** Nome da foto ilustrativa para um alimento (nome e grupo). */
export function photoKind(name = '', group) {
  const n = String(name).toLowerCase();
  for (const [re, kind] of BY_NAME) if (re.test(n)) return kind;
  return BY_GROUP[group] ?? 'prato';
}

export const photoUrl = kind => `img/food/${FILE[kind] ?? kind}.webp`;

/**
 * Fotos do cartão de uma refeição (até três, sem repetir o tipo), da que tem mais calorias para a que tem menos.
 * items: [{ name, kcal, food }] (food: o alimento salvo, com `g` e talvez `img`).
 * Devolve { srcs, real, label }: `real` só quando a primeira foto é a do próprio produto registrado.
 */
export function mealPhoto(mealId, items = []) {
  if (!items.length) return { srcs: [photoUrl(MEAL_PHOTO[mealId] ?? 'prato')], real: false, label: 'Ilustração' };
  const sorted = [...items].sort((a, b) => (b.kcal ?? 0) - (a.kcal ?? 0));
  const seen = new Set(), srcs = [];
  for (const i of sorted) {
    const src = i.food?.img ?? photoUrl(photoKind(i.name, i.food?.g));
    if (seen.has(src)) continue;
    seen.add(src); srcs.push(src);
    if (srcs.length === 3) break;
  }
  const real = !!sorted[0].food?.img;
  return { srcs, real, label: real ? sorted[0].name : 'Ilustrativa' };
}
