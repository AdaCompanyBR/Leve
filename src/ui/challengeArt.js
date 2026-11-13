// Ilustrações dos desafios: uma cena própria para cada um, desenhada em vetor no mesmo traço dos
// ícones do app (24 × 24, traço arredondado), branca sobre a cor da categoria, com formas de
// fundo e um selo com a duração. E as medalhas das conquistas.
import { categoryById } from '../lib/challenges.js';

// Desenho principal (grande) e dois detalhes pequenos por desafio.
const G = {
  drop: '<path d="M12 3.2c3.3 3.9 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 2.7-6.7 6-10.6z"/><path d="M9.3 14.6a2.8 2.8 0 0 0 2.7 2.7"/>',
  glass: '<path d="M6 4h12l-1.6 14.6a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8z"/><path d="M6.8 10.5c2.2 1 4.6-1 6.8 0s3 .2 3.6-.2"/>',
  bottle: '<path d="M10 2.8h4v3l1.8 2.6V19a2 2 0 0 1-2 2h-3.6a2 2 0 0 1-2-2V8.4L10 5.8z"/><path d="M8.2 12h7.6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><path d="M10 10.5c1 .8 1.8 1.8 2 3M13.2 9.6c-.2 1.2.2 2.2 1.2 2.9"/>',
  apple: '<path d="M12 7.5c-1.8-1.4-6-1.2-6 3.6 0 4.2 2.7 8.4 4.6 8.4.6 0 1-.4 1.4-.4s.8.4 1.4.4c1.9 0 4.6-4.2 4.6-8.4 0-4.8-4.2-5-6-3.6z"/><path d="M12 7.5c0-2 .8-3.4 2.4-4"/>',
  leaf: '<path d="M5 19c0-8.5 5.5-14 15-14 0 9.5-5.5 15-14 15"/><path d="M5 19c3-4 6-6.5 9.5-8.5"/>',
  wheat: '<path d="M12 21V8"/><path d="M12 11c-2.2 0-3.6-1.6-3.6-3.6 2.2 0 3.6 1.6 3.6 3.6zM12 11c2.2 0 3.6-1.6 3.6-3.6-2.2 0-3.6 1.6-3.6 3.6zM12 15.5c-2.2 0-3.6-1.6-3.6-3.6 2.2 0 3.6 1.6 3.6 3.6zM12 15.5c2.2 0 3.6-1.6 3.6-3.6-2.2 0-3.6 1.6-3.6 3.6zM12 6.5c0-1.6.4-2.8 1.2-3.7"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 7.5c0-1.2 1-1.2 1-2.4M13 7.5c0-1.2 1-1.2 1-2.4"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.8 0-1.6-1.4-1.6-1.4-3 0-1 .8-1.7 1.8-1.7h2.3a3.5 3.5 0 0 0 3.5-3.5c0-3.9-3.6-7-8-7z"/><circle cx="8" cy="11" r="1.1"/><circle cx="10.5" cy="7.5" r="1.1"/><circle cx="14.6" cy="7.8" r="1.1"/>',
  shoe: '<path d="M3.5 15.5V9.8l3.2.5 1.6 2.4 5.2 1 5.6 1.2a2 2 0 0 1 1.4 1.9v.7H3.5z"/><path d="M3.5 18.5h17.4M9 13.2l1.3-1.6M11.5 13.7l1.2-1.6"/>',
  walk: '<circle cx="13" cy="4.25" r="1.75"/><path d="m10.75 21 1.5-6.25 2.5 2.25V21M12.25 14.75 13 9l-3.25 1.5-1.25 3M13 9l1.75 3.25 2.75 1"/>',
  run: '<circle cx="14.5" cy="4.25" r="1.75"/><path d="m6.75 20.5 3.5-4.75 3.25 1.75 1.25 3.5M10.25 15.75 12 10.25l-3.75.75-1.75 2.75M12 10.25l2.5 2.25 3.75.75"/>',
  dumbbell: '<path d="M6.5 7.5v9M17.5 7.5v9M3.75 9.75v4.5M20.25 9.75v4.5M6.5 12h11"/>',
  chair: '<path d="M7 3.5v10h10M7 13.5V21M17 13.5V21M7 8.5h8.5a1.5 1.5 0 0 1 1.5 1.5v3.5"/>',
  stretch: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5 12 9l7-.5M12 9v6l-3.5 5.5M12 15l3.5 5.5"/>',
  moon: '<path d="M19.5 14.5A7.75 7.75 0 0 1 9.5 4.5a7.75 7.75 0 1 0 10 10z"/>',
  bed: '<path d="M3 18V6.5M3 14.5h18V18M3 11h5.5a2 2 0 0 1 2 2v1.5M10.5 11.5H19a2 2 0 0 1 2 2v1"/>',
  phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M10.5 5.5h3M4 4l16 16"/>',
  battery: '<rect x="3" y="7.5" width="16" height="9" rx="2"/><path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3"/>',
  sparkle: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.45 5.45l1.4 1.4M17.15 17.15l1.4 1.4M5.45 18.55l1.4-1.4M17.15 6.85l1.4-1.4"/>',
  heart: '<path d="M12 20s-7.25-4.4-7.25-9.75A4.1 4.1 0 0 1 12 7.9a4.1 4.1 0 0 1 7.25 2.35C19.25 15.6 12 20 12 20z"/>',
  zzz: '<path d="M6 6h5l-5 6h5M14 12h4l-4 5h4"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path d="m9.2 15 1.9 1.9 3.8-3.8"/>',
  thermo: '<path d="M14.5 13.6V5a2.5 2.5 0 0 0-5 0v8.6a4.25 4.25 0 1 0 5 0z"/><path d="M12 16.5V9"/>',
  target: '<circle cx="12" cy="12" r="8.25"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".9"/>',
  eye: '<path d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12z"/><circle cx="12" cy="12" r="3"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.3 2.1 1.9 3.5 1.9s2.6-.6 3.5-1.9M9 9.8h.01M15 9.8h.01"/>',
};

/** Ícone avulso no traço das ilustrações (benefícios), na cor do texto (currentColor). */
export function glyph(name, size = 24) {
  return tpl(`<svg class="ch-glyph" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${G[name] ?? G.sparkle}</svg>`);
}
const SCENES = {
  'agua-21': ['drop', 'glass', 'sparkle'], 'agua-pura-7': ['glass', 'drop', 'drop'], 'agua-ritmo-14': ['clock', 'drop', 'sun'],
  'prato-colorido-7': ['plate', 'leaf', 'apple'], 'frutas-7': ['apple', 'leaf', 'sparkle'], 'fibras-14': ['wheat', 'leaf', 'heart'],
  'consciente-7': ['bowl', 'heart', 'clock'], 'variedade-21': ['palette', 'apple', 'leaf'],
  'movimento-7': ['run', 'sparkle', 'heart'], 'caminhada-14': ['walk', 'shoe', 'sun'], 'corpo-21': ['dumbbell', 'run', 'sparkle'], 'pausas-7': ['stretch', 'chair', 'clock'],
  'sono-14': ['moon', 'zzz', 'sparkle'], 'desconecte-7': ['phone', 'moon', 'zzz'], 'recuperacao-7': ['bed', 'battery', 'heart'],
};

const tpl = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const g = (name, x, y, s, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="currentColor" stroke-width="${(1.7 / s * 1.6).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${G[name]}</g>`;

/** Cena do desafio. `size` em px; a cor vem da categoria. */
export function challengeArt(def, { size = 120, days = true } = {}) {
  const c = categoryById(def.cat), [main, a, b] = SCENES[def.id] ?? ['sparkle', 'heart', 'sun'];
  return tpl(`<svg class="ch-art" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true" style="color:#fff">
    <circle cx="66" cy="60" r="46" fill="#fff" fill-opacity=".16"/>
    <circle cx="66" cy="60" r="32" fill="#fff" fill-opacity=".14"/>
    <circle cx="22" cy="24" r="6" fill="#fff" fill-opacity=".22"/><circle cx="104" cy="98" r="4" fill="#fff" fill-opacity=".25"/>
    ${g(main, 36, 30, 2.5)}
    <g opacity=".95">${g(a, 6, 72, 1.25)}</g>
    <g opacity=".85">${g(b, 92, 8, 1.05)}</g>
    ${days ? `<g><circle cx="98" cy="74" r="13" fill="#fff"/><text x="98" y="79" text-anchor="middle" font-size="13" font-weight="700" fill="${c.ink}" font-family="-apple-system, system-ui, sans-serif">${def.days}</text></g>` : ''}
  </svg>`);
}

// ---------------------------------------------------------------------------
// Medalhas: uma família própria. Escudo hexagonal de cantos suaves, aro fino, face esmaltada em azul e
// um símbolo de traço desenhado para cada conquista. O aro muda só nas especiais (bronze, prata, ouro).
// Estados: bloqueada (cinza, com cadeado discreto), em andamento (face clara, símbolo em azul) e
// desbloqueada (face azul, brilho suave; `fresh` passa um reflexo uma vez).

const M = {
  sprout: '<path d="M12 20.5v-7.5"/><path d="M12 13c0-3.6-2.5-5.8-6.2-5.8 0 3.5 2.5 5.8 6.2 5.8z"/><path d="M12 11.2c0-3 2.1-5 5.3-5 0 3-2.1 5-5.3 5z"/><path d="M8.5 20.5h7"/>',
  streak: '<path d="M3.6 15.2c2.1 0 2.9-5.2 5.3-5.2s3 5.2 5.4 5.2c1.9 0 3-2.6 4.4-5.6"/><circle cx="19.6" cy="7.1" r="1.25" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.8v3.4M15.5 3.8v3.4"/><path d="m9.3 14.6 1.8 1.8 3.6-3.6"/>',
  rise: '<path d="M3.8 16.5 8.4 12l3.1 3 7.7-7.7"/><path d="M14.6 7.3h4.6v4.6"/>',
  peak: '<path d="M2.8 19.5 9.4 9.2l3.7 5.6 2.4-3.4 5.7 8.1z"/><path d="M15.5 11.4V4.6l3.4 1.4-3.4 1.4"/>',
  hundred: '<circle cx="12" cy="12" r="7.8"/><circle cx="12" cy="12" r="4.4" stroke-dasharray="1.6 1.9"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  flag: '<path d="M6.5 20.8V4"/><path d="M6.5 4.6h10.2l-2.1 3.6 2.1 3.6H6.5"/>',
  path: '<path d="M8 20.5c0-4.2 8.6-3.4 8.6-8.1S8.6 8.1 8.6 4"/><circle cx="8" cy="20.5" r=".9" fill="currentColor" stroke="none"/><circle cx="8.6" cy="3.6" r=".9" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  rings: '<circle cx="9.3" cy="12" r="5.3"/><circle cx="14.7" cy="12" r="5.3"/>',
  drop: '<path d="M12 3.4c3.2 3.8 5.9 7 5.9 10.4a5.9 5.9 0 0 1-11.8 0c0-3.4 2.7-6.6 5.9-10.4z"/><path d="M9.4 14.4a2.7 2.7 0 0 0 2.6 2.6"/>',
  leaf: '<path d="M5.2 18.8c0-8.3 5.4-13.6 14.6-13.6 0 9.2-5.4 14.6-13.6 14.6"/><path d="M5.2 18.8c2.9-3.9 5.9-6.4 9.3-8.3"/>',
  motion: '<circle cx="14.6" cy="4.6" r="1.7"/><path d="m7.2 20.2 3.4-4.6 3.2 1.7 1.2 3.4M10.6 15.6l1.7-5.4-3.7.7-1.7 2.7M12.3 10.2l2.4 2.2 3.7.7"/>',
  moon: '<path d="M19.3 14.6A7.6 7.6 0 0 1 9.4 4.7a7.6 7.6 0 1 0 9.9 9.9z"/>',
  balance: '<path d="M12 4.2v15.6M7.6 19.8h8.8M5.2 8.2h13.6"/><path d="m5.2 8.2-2.4 5h4.8zM18.8 8.2l-2.4 5h4.8z"/>',
  collection: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><path d="m16.5 13.6.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
};
export const MEDAL_SYMBOLS = Object.keys(M);

// Hexágono de pé com cantos arredondados (o arredondado vem de um traço grosso na mesma cor).
const hex = (cx, cy, r) => {
  const pts = [-90, -30, 30, 90, 150, 210].map(a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]);
  return 'M' + pts.map(p => p.map(n => n.toFixed(2)).join(' ')).join('L') + 'Z';
};
const RIM = {
  azul: ['#BFD6F6', '#5C8FDB'], ouro: ['#F1DCA4', '#B98C3A'], prata: ['#EEF0F3', '#9AA3AE'], bronze: ['#EBC2A2', '#A8693F'],
  cinza: ['#E3E5EA', '#C4C8D0'],
};
let medalSeq = 0;
/** Medalha. state: 'locked' | 'progress' | 'unlocked'. */
export function medalArt(a, { state: st = 'locked', size = 72, fresh = false } = {}) {
  const id = 'm' + (++medalSeq);
  const on = st === 'unlocked';
  const rim = RIM[on ? (a.tier ?? 'azul') : 'cinza'];
  const face = on ? ['#3D82E8', '#1F56B8'] : st === 'progress' ? ['#F1F6FE', '#E3ECFA'] : ['#F2F3F6', '#E6E8EC'];
  const ink = on ? '#F4F8FF' : st === 'progress' ? '#3478E5' : '#AEB3BC';
  const stars = a.stars ? Array.from({ length: a.stars }, (_, i) => {
    const x = 40 + (i - (a.stars - 1) / 2) * 9;
    return `<path transform="translate(${x} 22.5)" d="M0 -3.1 .95 -.95 3.1 0 .95 .95 0 3.1 -.95 .95 -3.1 0 -.95 -.95Z" fill="${ink}"/>`;
  }).join('') : '';
  const symY = a.stars ? 48 : 44;
  return tpl(`<svg class="medal medal-${st}${fresh ? ' fresh' : ''}" viewBox="0 0 80 88" width="${size}" height="${size * 1.1}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rim[0]}"/><stop offset="1" stop-color="${rim[1]}"/></linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${face[0]}"/><stop offset="1" stop-color="${face[1]}"/></linearGradient>
      <clipPath id="${id}c"><path d="${hex(40, 44, 29.5)}"/></clipPath>
    </defs>
    <path d="${hex(40, 44, 35)}" fill="url(#${id}r)" stroke="url(#${id}r)" stroke-width="7" stroke-linejoin="round"/>
    <path d="${hex(40, 44, 29.5)}" fill="url(#${id}f)" stroke="url(#${id}f)" stroke-width="5" stroke-linejoin="round"/>
    ${on ? `<g clip-path="url(#${id}c)"><path d="M0 0H80V40C60 30 30 34 0 46Z" fill="#fff" opacity=".1"/><rect class="medal-sheen" x="-40" y="0" width="22" height="88" fill="#fff" opacity="0" transform="skewX(-18)"/></g>` : ''}
    ${stars}
    <g transform="translate(${40 - 12 * 1.38} ${symY - 12 * 1.38}) scale(1.38)" fill="none" stroke="${ink}" stroke-width="${(2.3 / 1.38).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" color="${ink}">${M[a.medal] ?? M.sprout}</g>
    ${st === 'locked' ? `<g transform="translate(58 66)"><circle r="8.5" fill="#fff" stroke="#E1E4E9"/><g fill="none" stroke="#9BA1AB" stroke-width="1.6" stroke-linecap="round"><rect x="-3.6" y="-1.4" width="7.2" height="5.6" rx="1.4"/><path d="M-2.2 -1.4v-1.6a2.2 2.2 0 0 1 4.4 0v1.6"/></g></g>` : ''}
  </svg>`);
}

/**
 * Símbolo da ofensiva: três passos que sobem, ligados por uma linha contínua. Continuidade e avanço,
 * em azul sobre um quadrado claro; cinza quando a ofensiva está em zero.
 */
export function streakMark({ size = 44, muted = false } = {}) {
  return tpl(`<svg class="streak-mark${muted ? ' muted' : ''}" viewBox="0 0 44 44" width="${size}" height="${size}" aria-hidden="true">
    <rect width="44" height="44" rx="13" class="sm-bg"/>
    <path d="M11.5 29.5C15 29.5 16.5 22 22 22s7-7.5 10.5-7.5" fill="none" class="sm-line" stroke-width="2" stroke-linecap="round"/>
    <circle cx="11.5" cy="29.5" r="3.1" class="sm-dot sm-1"/>
    <circle cx="22" cy="22" r="3.1" class="sm-dot sm-2"/>
    <circle cx="32.5" cy="14.5" r="3.6" class="sm-dot sm-3"/>
  </svg>`);
}

/**
 * Emblema do nível: um cristal hexagonal facetado com o número integrado. A cor aprofunda a cada
 * etapa (níveis 1–3, 4–6, 7–9, 10+) e marcas no vértice de baixo mostram a etapa.
 */
const TIERS = [['#7FB0F5', '#4C8BEB'], ['#5C97F0', '#2F6FDB'], ['#3F7FE6', '#2457C0'], ['#2F6AD3', '#1A3F95']];
export function levelEmblem(level, pct, { size = 64 } = {}) {
  const tier = Math.min(3, Math.floor((level - 1) / 3));
  const [c1, c2] = TIERS[tier], id = 'lv' + (++medalSeq);
  const outer = hex(32, 34, 27), inner = hex(32, 34, 21.5);
  const marks = Array.from({ length: tier + 1 }, (_, i) => `<circle cx="${32 + (i - tier / 2) * 5}" cy="56.5" r="1.35" fill="#fff" opacity=".85"/>`).join('');
  return tpl(`<svg class="level-emblem" viewBox="0 0 64 68" width="${size}" height="${size * 68 / 64}" role="img" aria-label="Nível ${level}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <clipPath id="${id}c"><path d="${outer}"/></clipPath></defs>
    <path d="${outer}" fill="url(#${id})" stroke="url(#${id})" stroke-width="6" stroke-linejoin="round"/>
    <g clip-path="url(#${id}c)" opacity=".16"><path d="M32 2 L64 22 L64 0 Z M32 2 L0 22 L0 0Z" fill="#fff"/><path d="M0 46 L32 66 L64 46 L64 68 L0 68Z" fill="#000" opacity=".5"/></g>
    <path d="${inner}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.2" stroke-linejoin="round"/>
    <text x="32" y="41.5" text-anchor="middle" class="level-emblem-num">${level}</text>
    ${marks}
  </svg>`);
}
