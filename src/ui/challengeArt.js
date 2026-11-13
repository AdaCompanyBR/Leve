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

/** Medalha de uma conquista: colorida quando conquistada, cinza e com cadeado quando não. */
const MEDAL = { star: 'sparkle', flame: 'sun', shield: 'heart', trophy: 'sparkle', drop: 'drop', leaf: 'leaf', run: 'run', moon: 'moon', sun: 'sun', medal: 'sparkle' };
export function medalArt(a, { unlocked, color = '#E9B10C', size = 72 }) {
  const glyph = MEDAL[a.medal] ?? 'sparkle';
  const fill = unlocked ? color : '#B9BEC6';
  return tpl(`<svg class="medal" viewBox="0 0 72 72" width="${size}" height="${size}" aria-hidden="true" style="color:#fff">
    <path d="M22 4h10l4 16-8 4zM50 4H40l-4 16 8 4z" fill="${fill}" opacity=".55"/>
    <circle cx="36" cy="42" r="26" fill="${fill}"/>
    <circle cx="36" cy="42" r="20" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
    ${unlocked ? g(glyph, 24, 30, 1) : '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><rect x="28" y="40" width="16" height="12" rx="2.5"/><path d="M31 40v-4a5 5 0 0 1 10 0v4"/></g>'}
  </svg>`);
}
