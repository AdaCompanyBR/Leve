// Medidas caseiras -> gramas. São ESTIMATIVAS de porção (a TACO só traz valores
// por 100 g), sempre mostradas com "≈" e com os gramas editáveis antes de salvar.
import { norm } from './parser.js';

// [trecho do nome normalizado, gramas]
const BY_UNIT = {
  unidade: [['codorna', 10], ['ovo', 50], ['pao, de queijo', 40], ['frances', 50], ['pao', 50], ['banana', 85], ['maca', 130],
    ['laranja', 180], ['tangerina', 135], ['pera', 130], ['kiwi', 75], ['pessego', 110], ['goiaba', 170], ['manga', 300],
    ['batata', 140], ['tomate', 120], ['cenoura', 100], ['biscoito', 6], ['torrada', 10], ['coxinha', 80], ['pastel', 80], ['iogurte', 170]],
  fatia: [['pao', 25], ['mozarela', 20], ['prato', 20], ['queijo', 30], ['presunto', 15], ['mortadela', 15], ['peito de peru', 15],
    ['bolo', 60], ['pizza', 120], ['melancia', 200], ['melao', 90], ['mamao', 170], ['abacaxi', 75], ['tomate', 15]],
  'colher de sopa': [['arroz', 25], ['feijao', 20], ['acucar', 12], ['azeite', 8], ['oleo', 8], ['manteiga', 10], ['margarina', 10],
    ['requeijao', 30], ['aveia', 15], ['farinha', 15], ['mel', 15], ['maionese', 15], ['leite, de vaca, integral, po', 10]],
  concha: [['feijao', 140], ['lentilha', 140], ['grao', 140]],
};

const DEFAULT = { unidade: 100, fatia: 30, 'colher de sopa': 15, 'colher de sobremesa': 10, 'colher de chá': 5, concha: 130, copo: 200, 'xícara': 200, 'pedaço': 100, 'porção': 100 };

/** Gramas de 1 unidade da medida para o alimento. `known` é falso quando caiu no valor genérico. */
export function gramsPerUnit(foodName, unit) {
  if (unit === 'g' || unit === 'ml') return { grams: 1, exact: true, known: true };
  const name = norm(foodName);
  const hit = (BY_UNIT[unit] ?? []).find(([key]) => name.includes(key));
  if (hit) return { grams: hit[1], exact: false, known: true };
  return { grams: DEFAULT[unit] ?? 100, exact: false, known: unit !== 'unidade' && unit !== 'pedaço' && unit !== 'porção' };
}

export function toGrams(foodName, unit, qty) {
  const u = gramsPerUnit(foodName, unit);
  return { grams: Math.round(u.grams * qty), exact: u.exact, known: u.known };
}

/** Calorias e macros de `grams` de um alimento com valores por 100 g. */
export function nutrientsFor(food, grams) {
  const r = grams / 100;
  const r1 = n => Math.round(n * r * 10) / 10;
  return { kcal: Math.round(food.k * r), p: r1(food.p), c: r1(food.c), f: r1(food.f) };
}
