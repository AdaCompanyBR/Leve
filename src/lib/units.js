// Unidades de exibição. Tudo é guardado e calculado em unidades métricas (°C, kg, cm, km/h, mm);
// estas funções só convertem o que aparece na tela e o que a pessoa digita.
// A preferência vem de settings.units (store.js chama setUnitPrefs ao carregar e ao salvar).

export const UNIT_OPTIONS = {
  temp: { label: 'Temperatura', options: [{ id: 'c', label: '°C' }, { id: 'f', label: '°F' }] },
  weight: { label: 'Peso', options: [{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }] },
  height: { label: 'Altura', options: [{ id: 'cm', label: 'cm' }, { id: 'ftin', label: 'pés e pol.' }] },
  speed: { label: 'Vento', options: [{ id: 'kmh', label: 'km/h' }, { id: 'mph', label: 'mph' }] },
  rain: { label: 'Chuva', options: [{ id: 'mm', label: 'mm' }, { id: 'in', label: 'pol.' }] },
};
export const DEFAULT_UNITS = { temp: 'c', weight: 'kg', height: 'cm', speed: 'kmh', rain: 'mm' };

let prefs = { ...DEFAULT_UNITS };
export const setUnitPrefs = u => { prefs = { ...DEFAULT_UNITS, ...(u ?? {}) }; };
export const unitPref = k => prefs[k];

const LB = 2.20462262, IN = 2.54, MPH = 0.621371, MM_IN = 25.4;
const nf = d => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const n0 = nf(0), n1 = nf(1), n2 = nf(2);

// ---- Temperatura ----
const isF = () => prefs.temp === 'f';
export const tempLetter = () => (isF() ? 'F' : 'C');
export const toTemp = c => (isF() ? c * 9 / 5 + 32 : c);
/** "26°" (curto, para números grandes e listas). */
export const deg = c => (c == null ? '–' : `${Math.round(toTemp(c))}°`);
/** "26 °C" ou "79 °F" (em frases). */
export const temp = c => (c == null ? '–' : `${Math.round(toTemp(c))} °${tempLetter()}`);
/** Diferença de temperatura: 8 °C vira 14 °F. */
export const tempDelta = dc => `${Math.round(isF() ? dc * 9 / 5 : dc)} °${tempLetter()}`;

// ---- Peso ----
export const weightUnit = () => prefs.weight;
export const toWeight = kg => (prefs.weight === 'lb' ? kg * LB : kg);
export const fromWeight = v => (prefs.weight === 'lb' ? v / LB : v);
/** Número do peso já convertido, com uma casa: "70,5". */
export const weightNum = kg => (kg == null ? '–' : n1.format(toWeight(kg)));
/** "70,5 kg" ou "155,4 lb". */
export const weight = kg => (kg == null ? '–' : `${weightNum(kg)} ${prefs.weight}`);
/** Variação de peso (ritmo por semana, diferença): duas casas quando é pequena. */
export const weightDelta = kg => { const v = toWeight(kg); return `${(Math.abs(v) < 1 ? n2 : n1).format(v).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '')} ${prefs.weight}`; };
/** Limites de entrada do peso na unidade escolhida. */
export const weightRange = (minKg = 30, maxKg = 300) => [Math.round(toWeight(minKg)), Math.round(toWeight(maxKg))];

// ---- Altura ----
export const heightUnit = () => prefs.height;
export const cmToFtIn = cm => { let inches = Math.round(cm / IN), ft = Math.floor(inches / 12); inches -= ft * 12; return { ft, in: inches }; };
export const ftInToCm = (ft, inch) => Math.round((ft * 12 + inch) * IN);
/** "170 cm" ou "5′ 7″". */
export const height = cm => { if (cm == null) return '–'; if (prefs.height !== 'ftin') return `${Math.round(cm)} cm`; const v = cmToFtIn(cm); return `${v.ft}′ ${v.in}″`; };
/** Lê "5'7", "5 7", "5′ 7″", "5 pés 7" ou "67 in"; devolve cm ou NaN. */
export function parseFtIn(text) {
  const t = String(text ?? '').trim().toLowerCase();
  let m = t.match(/^(\d{1,2})\s*(?:'|′|pés?|ft)?\s*(\d{1,2}(?:[.,]\d+)?)?\s*(?:"|″|pol\.?|in)?$/);
  if (m && (m[2] != null || /'|′|pés?|ft/.test(t))) return ftInToCm(Number(m[1]), m[2] ? Number(m[2].replace(',', '.')) : 0);
  m = t.match(/^(\d{2,3}(?:[.,]\d+)?)\s*(?:"|″|pol\.?|in)$/);
  if (m) return Math.round(Number(m[1].replace(',', '.')) * IN);
  return NaN;
}

// ---- Vento e chuva ----
export const speed = kmh => (kmh == null ? '–' : prefs.speed === 'mph' ? `${n0.format(kmh * MPH)} mph` : `${n0.format(kmh)} km/h`);
export const rain = mm => (mm == null ? '–' : prefs.rain === 'in' ? `${n2.format(mm / MM_IN)} pol.` : `${n0.format(mm)} mm`);
