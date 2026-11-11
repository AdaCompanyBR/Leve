// Parser local de frases como "2 ovos mexidos e um pão francês". Sem IA.
// Entrega [{ qty, unit, query, raw }]; a busca na TACO fica em search.js.

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%/.,\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const WORDS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  meio: 0.5, meia: 0.5, duzia: 12,
};

// Ordem importa: as formas mais longas vêm antes.
const UNITS = [
  [/^colher(es)? (de )?sopa( cheias?| rasas?)?\b/, 'colher de sopa'],
  [/^colher(es)? (de )?sobremesa\b/, 'colher de sobremesa'],
  [/^colher(es)? (de )?(cha|cafe)\b/, 'colher de chá'],
  [/^colher(es)?\b/, 'colher de sopa'],
  [/^conchas?\b/, 'concha'],
  [/^fatias?\b/, 'fatia'],
  [/^(unidades?|un|und)\b/, 'unidade'],
  [/^copos?\b/, 'copo'],
  [/^xicaras?\b/, 'xícara'],
  [/^pedacos?\b/, 'pedaço'],
  [/^porc(ao|oes)\b/, 'porção'],
  [/^(kg|quilos?|kilos?)\b/, 'kg'],
  [/^(g|gr|gramas?)\b/, 'g'],
  [/^(ml|mililitros?)\b/, 'ml'],
  [/^(l|litros?)\b/, 'l'],
];

export const UNIT_LIST = ['g', 'ml', 'unidade', 'fatia', 'colher de sopa', 'colher de sobremesa', 'colher de chá', 'concha', 'copo', 'xícara', 'pedaço', 'porção'];

function readQty(s) {
  let m;
  if ((m = s.match(/^(\d+)\s*\/\s*(\d+)\s*/)) && +m[2]) return [m[1] / m[2], s.slice(m[0].length)];
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)\s*/))) {
    let q = parseFloat(m[1].replace(',', '.')), rest = s.slice(m[0].length);
    if ((m = rest.match(/^e (meio|meia)\b\s*/))) { q += 0.5; rest = rest.slice(m[0].length); }
    return [q, rest];
  }
  if ((m = s.match(/^([a-z]+)\b\s*/)) && m[1] in WORDS) {
    let q = WORDS[m[1]], rest = s.slice(m[0].length);
    if (m[1] === 'meia' && (m = rest.match(/^duzia( de)?\b\s*/))) { q = 6; rest = rest.slice(m[0].length); }
    else if ((m = rest.match(/^e (meio|meia)\b\s*/))) { q += 0.5; rest = rest.slice(m[0].length); }
    return [q, rest];
  }
  return [null, s];
}

function readUnit(s) {
  // "200g" e "200 g" chegam aqui como "g ..."
  for (const [re, unit] of UNITS) {
    const m = s.match(re);
    if (m) return [unit, s.slice(m[0].length).trim().replace(/^(de|do|da)\b\s*/, '')];
  }
  return [null, s];
}

export function parseSegment(raw) {
  let s = norm(raw);
  if (!s) return null;
  let [qty, rest] = readQty(s);
  let [unit, name] = readUnit(rest);
  if (qty == null) qty = 1;
  if (unit === 'kg') { unit = 'g'; qty *= 1000; }
  if (unit === 'l') { unit = 'ml'; qty *= 1000; }
  name = name.trim();
  if (!name || /^(e|de|do|da|com|mais)$/.test(name)) return null;
  return { qty, unit: unit ?? 'unidade', explicitUnit: unit != null, query: name, raw: raw.trim() };
}

/** Divide a frase em itens por vírgula, ponto e vírgula, "+", " e " e " mais ". */
export function parsePhrase(text) {
  // Protege "e meio/meia" para não virar separador.
  const safe = text.replace(/\s+e\s+(mei[oa])\b/gi, ' §$1');
  return safe
    .split(/\s*(?:(?<!\d),|,(?!\d)|[;+\n])\s*|\s+e\s+|\s+mais\s+/i)
    .map(p => parseSegment(p.replace(/§/g, 'e ')))
    .filter(Boolean);
}
