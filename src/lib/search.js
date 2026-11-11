// Busca aproximada em nomes de alimentos (TACO usa "Pão, trigo, francês").
import { norm } from './parser.js';

const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'no', 'na', 'ao', 'tipo', 'sem']);

// Como as pessoas falam -> como a TACO escreve.
const ALIAS = {
  frances: 'trigo frances', mussarela: 'mozarela', mucarela: 'mozarela', muzzarela: 'mozarela',
  mandioca: 'mandioca', aipim: 'mandioca', macaxeira: 'mandioca', mexerica: 'tangerina', bergamota: 'tangerina',
  abobrinha: 'abobrinha', jerimum: 'abobora', bife: 'carne bovina grelhado', hamburguer: 'hamburguer bovino',
  cafe: 'cafe infusao', cafezinho: 'cafe infusao', pipoca: 'pipoca', refri: 'refrigerante', iogurte: 'iogurte natural',
  mamao: 'mamao papaia', pao: 'pao trigo', ovo: 'ovo galinha inteiro', ovos: 'ovo galinha inteiro',
  frango: 'frango peito sem pele', feijao: 'feijao carioca', arroz: 'arroz tipo 1', banana: 'banana prata',
  maca: 'maca fuji', laranja: 'laranja pera crua', batata: 'batata inglesa', azeite: 'azeite oliva', acucar: 'acucar refinado',
  manteiga: 'manteiga com sal', aveia: 'aveia flocos', alface: 'alface crespa', tomate: 'tomate com semente', queijo: 'queijo',
  mexido: 'frito', mexidos: 'frito', mexida: 'frito',
};

const COOKED = ['cozido', 'cozida', 'assado', 'assada', 'grelhado', 'grelhada', 'frito', 'frita', 'refogado', 'refogada'];

export function stem(t) {
  if (t.length > 4 && t.endsWith('oes')) return t.slice(0, -3) + 'ao';
  if (t.length > 4 && t.endsWith('aes')) return t.slice(0, -3) + 'ao';
  if (t.length > 3 && t.endsWith('s')) t = t.slice(0, -1);
  // gênero: cozida -> cozido
  if (t.length > 4 && t.endsWith('a') && /(ad|id)a$/.test(t)) t = t.slice(0, -1) + 'o';
  return t;
}

export const tokens = s => norm(s).replace(/[,/.-]/g, ' ').split(' ').filter(t => t && !STOP.has(t)).map(stem);

function lev1(a, b) {
  // Distância de edição <= 1, só para palavras de 5 letras ou mais.
  if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const matchTok = (q, t) => (q === t ? 1 : t.startsWith(q) && q.length >= 3 ? 0.85 : lev1(q, t) ? 0.7 : 0);

export function makeIndex(foods) {
  return foods.map(food => ({ food, toks: tokens(food.n), raw: norm(food.n) }));
}

function expand(query) {
  const base = tokens(query);
  // Apelidos só entram quando a pessoa não detalhou (ex.: "arroz" sozinho vira "arroz tipo 1").
  const out = [];
  for (const t of base) {
    const alias = ALIAS[t];
    if (alias && (base.length <= 2 || alias.split(' ').length === 1)) out.push(...tokens(alias).map((x, i) => ({ t: x, w: i === 0 ? 1 : 0.35 })));
    else out.push({ t, w: 1 });
  }
  return out;
}

export function search(index, query, limit = 8) {
  const q = expand(query);
  if (!q.length) return [];
  const asked = new Set(q.map(x => x.t));
  const wantsRaw = asked.has('cru') || asked.has('crua');
  const totalW = q.reduce((s, x) => s + x.w, 0);
  const results = [];
  for (const entry of index) {
    let got = 0, firstHit = false;
    for (const { t, w } of q) {
      let best = 0;
      entry.toks.forEach((tok, i) => {
        const m = matchTok(t, tok);
        if (m > best) { best = m; if (i === 0 && w === 1) firstHit = true; }
      });
      got += best * w;
    }
    if (!got) continue;
    let score = got / totalW;
    if (score < 0.34) continue;
    if (firstHit) score += 0.25;
    score -= Math.max(0, entry.toks.length - q.length) * 0.02; // nomes mais curtos primeiro
    const isRaw = entry.toks.includes('cru');
    if (!wantsRaw && isRaw && !/fruta|verdura|hortalic/i.test(entry.food.g ?? '')) score -= 0.12;
    if (!wantsRaw && COOKED.some(c => entry.toks.includes(stem(c)))) score += 0.03;
    results.push({ food: entry.food, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
