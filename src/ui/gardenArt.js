// Arte do jardim: árvores e cenário em vetor, com volume (luz no alto à esquerda, sombra embaixo),
// profundidade (camadas de copa atrás e na frente) e movimento suave. Leve e sem internet.
//
// treeMarkup() devolve o desenho de uma árvore como texto SVG (para compor no cenário);
// treeArt() embrulha uma árvore num <svg>; gardenScene() monta o jardim inteiro.

let seq = 0;
const tpl = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

// ---------------------------------------------------------------------------
// Cores

const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
const mixP = (p, q, t) => p.map((c, i) => mix(c, q[i], t));

// Paletas da copa: [luz, meio, sombra]
const PAL = {
  verde: ['#A6E07A', '#5DB552', '#2F7D3D'],
  agua: ['#9BE3D6', '#3FB1A6', '#1D7270'],
  fruit: ['#B7E27D', '#6CB84E', '#357B36'],
  maple: ['#FF9C7A', '#EC5A55', '#A93342'],
  blossom: ['#FFD3E4', '#F49BC0', '#CF6A97'],
  golden: ['#FFE7A0', '#F3BE48', '#B98320'],
  cone: ['#8FCB78', '#3E9A57', '#1F5E3C'],
};
const DRY = ['#D9C27E', '#B39352', '#7E6335'];
const SEASON = {
  primavera: { tint: null, blossoms: true },
  verao: { tint: null },
  outono: { tint: ['#F4B860', '#D9822B', '#9C5426'], amount: 0.28 },
  inverno: { tint: ['#B9CBBE', '#7E9A8A', '#4E6A5C'], amount: 0.25 },
};

// ---------------------------------------------------------------------------
// Forma por estágio. Coordenadas num quadro 200 × 220, chão em y = 192, tronco em x = 100.
// blobs: [x, y, r] da copa; os primeiros ficam atrás.

const STAGE_SHAPE = [
  { trunk: 0, blobs: [] }, // germinação: broto
  { trunk: [5, 3, 46], blobs: [[92, 142, 14], [110, 140, 13], [100, 128, 15]] },
  { trunk: [8, 4, 66], blobs: [[80, 124, 18], [120, 122, 18], [100, 106, 22], [88, 104, 15], [114, 102, 16]] },
  { trunk: [11, 5, 78], branches: true, blobs: [[70, 112, 22], [130, 110, 22], [84, 92, 24], [118, 90, 25], [100, 74, 26], [100, 102, 22], [76, 98, 16]] },
  { trunk: [13, 6, 84], branches: true, blobs: [[64, 108, 24], [136, 106, 24], [80, 84, 27], [122, 82, 28], [100, 64, 28], [100, 96, 26], [70, 90, 18], [132, 90, 18]] },
  { trunk: [17, 7, 92], branches: true, roots: true, blobs: [[56, 102, 26], [144, 100, 26], [72, 76, 30], [130, 74, 30], [100, 52, 32], [100, 88, 30], [62, 84, 20], [140, 84, 20], [86, 58, 22], [116, 56, 22]] },
  { trunk: [20, 8, 96], branches: true, roots: true, blobs: [[50, 100, 28], [150, 98, 28], [68, 72, 32], [134, 70, 32], [100, 44, 35], [100, 84, 32], [56, 80, 22], [146, 80, 22], [82, 50, 24], [120, 48, 24], [100, 20, 18]] },
];

function trunkPath(w0, w1, H) {
  const b = 192, t = b - H;
  return `M${100 - w0} ${b} C${100 - w0 * 0.6} ${b - H * 0.35} ${100 - w1 - 2} ${t + H * 0.3} ${100 - w1} ${t} L${100 + w1} ${t} C${100 + w1 + 2} ${t + H * 0.3} ${100 + w0 * 0.6} ${b - H * 0.35} ${100 + w0} ${b} Z`;
}

/**
 * Uma árvore como texto SVG (quadro 200 × 220).
 * stage: 0–6 · vitality: 0–100 · kind: paleta/forma · season · dead · id: prefixo único dos gradientes.
 */
export function treeMarkup({ stage = 0, vitality = 100, kind = 'verde', season = 'verao', dead = false, fruits = false, flowers = false, sparkle = false, id = 'tr' + (++seq) } = {}) {
  const sh = STAGE_SHAPE[Math.max(0, Math.min(6, stage))];
  let pal = PAL[kind] ?? PAL.verde;
  const s = SEASON[season];
  if (kind === 'verde' && s?.tint) pal = mixP(pal, s.tint, s.amount);
  const weak = Math.max(0, (100 - vitality) / 100);
  pal = mixP(pal, DRY, Math.min(0.9, weak * 1.05));
  const bark = dead ? ['#A79C90', '#7C7166'] : ['#8C5A3A', '#5B3824'];
  const defs = `<defs>
    <radialGradient id="${id}c" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".55" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></radialGradient>
    <radialGradient id="${id}b" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></radialGradient>
    <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="${bark[0]}"/><stop offset="1" stop-color="${bark[1]}"/></linearGradient>
  </defs>`;
  const shadow = `<ellipse cx="100" cy="194" rx="${sh.trunk ? 30 + stage * 7 : 18}" ry="${sh.trunk ? 7 + stage : 5}" fill="#1E3A20" opacity=".16"/>`;

  // Germinação: monte de terra e broto
  if (!sh.trunk) {
    if (dead) return `${defs}${shadow}<ellipse cx="100" cy="191" rx="16" ry="5" fill="#9B7A5A"/><path d="M100 190v-12M100 182l-5-5" stroke="#9C8F82" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
    return `${defs}${shadow}<ellipse cx="100" cy="191" rx="18" ry="6" fill="#A9825D"/><ellipse cx="97" cy="189" rx="10" ry="3" fill="#C09872"/>
      <g class="tree-canopy"><path d="M100 190c0-8 0-14 .5-20" stroke="#4E9A45" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M100.5 174c-9 0-14-5-14-12 8 0 14 4 14 12z" fill="url(#${id}c)"/><path d="M100.5 170c0-8 6-13 14-13 0 8-6 13-14 13z" fill="url(#${id}c)"/></g>`;
  }

  const [w0, w1, H] = sh.trunk, top = 192 - H;
  let trunk = `<path d="${trunkPath(w0, w1, H)}" fill="url(#${id}t)"/>`;
  if (sh.roots) trunk += `<path d="M${100 - w0} 191c-8 1-14 4-20 3M${100 + w0} 191c8 1 14 4 21 2M${100 - w0 * 0.4} 192c-3 3-6 5-10 6" stroke="url(#${id}t)" stroke-width="${w0 * 0.45}" stroke-linecap="round" fill="none"/>`;
  if (sh.branches || dead) {
    const bw = Math.max(2.5, w1 * 0.9);
    trunk += `<path d="M100 ${top + H * 0.32}c-10-6-18-14-24-26M100 ${top + H * 0.22}c10-6 18-12 24-24M100 ${top + 6}c-2-10 0-18 2-24" stroke="url(#${id}t)" stroke-width="${bw}" stroke-linecap="round" fill="none"/>`;
  }
  if (dead) {
    // árvore seca: galhos finos e nenhuma folha
    trunk += `<path d="M76 ${top + H * 0.32 - 26}c-6-6-8-12-8-18M124 ${top + H * 0.22 - 24}c6-4 9-10 10-16M102 ${top - 18}c4-6 4-12 2-16" stroke="${bark[1]}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    return `${defs}${shadow}${trunk}`;
  }
  // Copa: menos folhagem quando a vitalidade cai
  const keep = vitality >= 60 ? sh.blobs.length : Math.max(2, Math.round(sh.blobs.length * (0.45 + vitality / 120)));
  const blobs = sh.blobs.slice(0, keep);
  const back = blobs.map(([x, y, r]) => `<circle cx="${x + 3}" cy="${y + 5}" r="${r}" fill="url(#${id}b)"/>`).join('');
  const front = blobs.map(([x, y, r]) => kind === 'cone'
    ? `<path d="M${x} ${y - r * 1.25} L${x + r} ${y + r * 0.7} Q${x} ${y + r * 0.95} ${x - r} ${y + r * 0.7} Z" fill="url(#${id}c)"/>`
    : `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}c)"/>`).join('');
  // Detalhes: flores (primavera, florescimento ou cerejeira), frutos, brilho
  let deco = '';
  const showFlowers = flowers || kind === 'blossom' || (kind === 'verde' && (stage >= 4 || (s?.blossoms && stage >= 2)) && vitality >= 60);
  if (showFlowers) deco += blobs.flatMap(([x, y, r], i) => [[x - r * 0.4, y - r * 0.3], [x + r * 0.35, y + r * 0.1], [x - r * 0.05, y + r * 0.45]].slice(0, 1 + (i % 3)))
    .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${kind === 'blossom' ? '#FFF2F7' : '#FFC2D9'}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1" fill="#F59E0B" opacity=".7"/>`).join('');
  if (fruits || kind === 'fruit') deco += blobs.filter((_, i) => i % 2 === 0).map(([x, y, r]) => `<circle cx="${x + r * 0.3}" cy="${y + r * 0.35}" r="3.6" fill="#F28C28"/><circle cx="${x + r * 0.3 - 1}" cy="${y + r * 0.35 - 1.2}" r="1.1" fill="#FFD9A8"/>`).join('');
  if (sparkle || kind === 'golden') deco += `<g class="tree-sparkle">${[[60, 60], [146, 44], [104, 18], [154, 110], [48, 120]].map(([x, y], i) => `<path d="M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#FFF3C4" style="animation-delay:${i * 0.5}s"/>`).join('')}</g>`;
  // Folhas caindo quando a árvore está fraca
  const falling = vitality < 70 ? `<g class="tree-falling">${[0, 1, 2].map(i => `<ellipse cx="${80 + i * 18}" cy="${top - 10 + i * 6}" rx="3.2" ry="1.8" fill="${pal[1]}" style="animation-delay:${i * 1.3}s"/>`).join('')}</g>` : '';
  return `${defs}${shadow}${trunk}<g class="tree-canopy">${back}${front}${deco}</g>${falling}`;
}

/** Uma árvore num <svg> próprio. */
export function treeArt(opts = {}, { size = 160, label = '' } = {}) {
  return tpl(`<svg class="tree-art${opts.dead ? ' is-dead' : ''}" viewBox="0 0 200 220" width="${size}" height="${size * 1.1}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${treeMarkup(opts)}</svg>`);
}

// ---------------------------------------------------------------------------
// Cenário

const DECO = {
  banco: (x, y) => `<g transform="translate(${x} ${y})"><rect x="-14" y="-8" width="28" height="4" rx="2" fill="#B07A4E"/><rect x="-14" y="-14" width="28" height="3.5" rx="1.75" fill="#C68B5A"/><rect x="-12" y="-4" width="3" height="8" fill="#7C5234"/><rect x="9" y="-4" width="3" height="8" fill="#7C5234"/></g>`,
  lanterna: (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="2" rx="8" ry="2.5" fill="#000" opacity=".12"/><rect x="-3" y="-12" width="6" height="14" rx="1.5" fill="#B9BDB6"/><rect x="-7" y="-20" width="14" height="9" rx="2" fill="#CFD3CC"/><rect x="-3.5" y="-18" width="7" height="5" rx="1" fill="#FFE7A3"/><path d="M-10 -20 L0 -27 L10 -20 Z" fill="#9DA39A"/></g>`,
  pedras: () => `<g fill="#E4E1D6" stroke="#CFCABB" stroke-width=".8">${[[118, 196, 9], [140, 204, 8], [164, 210, 9], [190, 214, 8], [214, 214, 9], [238, 210, 8]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.5}"/>`).join('')}</g>`,
  flores: (x, y) => `<g transform="translate(${x} ${y})">${[[-12, 0, '#F49BC0'], [-4, -3, '#FFD36B'], [5, 1, '#F49BC0'], [13, -2, '#FFFFFF'], [0, 4, '#B9A3F5']].map(([a, b, c]) => `<circle cx="${a}" cy="${b}" r="4.2" fill="#5DB552"/><circle cx="${a}" cy="${b - 1.5}" r="2.4" fill="${c}"/>`).join('')}</g>`,
  lago: (x, y) => `<g transform="translate(${x} ${y})"><ellipse rx="34" ry="13" fill="#8CC9E8"/><ellipse rx="34" ry="13" fill="none" stroke="#C9C3B4" stroke-width="3"/><ellipse cx="-8" cy="-3" rx="12" ry="3" fill="#fff" opacity=".35"/><ellipse cx="14" cy="4" rx="5" ry="2" fill="#5DB552"/></g>`,
  ponte: (x, y) => `<g transform="translate(${x} ${y})"><path d="M-22 4 Q0 -10 22 4" fill="none" stroke="#B07A4E" stroke-width="6" stroke-linecap="round"/><path d="M-20 -2 Q0 -16 20 -2" fill="none" stroke="#8C5A3A" stroke-width="1.6"/></g>`,
};
const DECO_POS = { banco: [262, 176], lanterna: [92, 172], pedras: [0, 0], flores: [278, 196], lago: [300, 150], ponte: [300, 150] };

// Lugares das árvores especiais e das memórias (ao fundo, menores, para dar profundidade)
const SPECIAL_POS = [[70, 108, 0.42], [290, 104, 0.42], [118, 92, 0.34], [244, 90, 0.34], [40, 140, 0.46], [328, 132, 0.4]];
const MEMORY_POS = [[24, 108, 0.26], [44, 100, 0.22], [12, 96, 0.2]];

// Arbustos e tufos fixos do terreno (não são conquistas: só dão volume e profundidade).
function bushes(id, grass, layer) {
  const B = layer === 'back' ? [[96, 124, 11], [262, 122, 10], [210, 112, 8], [150, 116, 7]] : [[40, 182, 12], [322, 178, 13], [118, 206, 9], [250, 206, 10], [292, 196, 7]];
  const tufts = layer === 'front' ? [[70, 204], [208, 214], [336, 196], [24, 168]].map(([x, y]) => `<path d="M${x} ${y}c-1-5-3-8-6-10M${x} ${y}c0-6 1-10 3-13M${x} ${y}c2-4 5-7 8-8" stroke="${grass[2]}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`).join('') : '';
  return B.map(([x, y, r], i) => `<g><ellipse cx="${x + 2}" cy="${y + r * 0.7}" rx="${r * 1.1}" ry="${r * 0.32}" fill="#1E3A20" opacity=".14"/><circle cx="${x + 2}" cy="${y + 2}" r="${r}" fill="url(#${id}bb)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}bf)"/>${i % 2 === 0 ? `<circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="1.8" fill="#FFC2D9"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.15}" r="1.6" fill="#FFF"/>` : ''}</g>`).join('') + tufts;
}

/**
 * Jardim inteiro. main: { stage, vitality, dead } ou null (sem árvore) · specials: [{ kind }] ·
 * memories: quantas árvores secas · decorations: ids desbloqueados · season · watering: animar a regada.
 */
export function gardenScene({ main, specials = [], memories = 0, decorations = [], season = 'verao', watering = false }) {
  const id = 'gd' + (++seq);
  const grass = SEASON[season]?.tint ? mixP(['#B4E08A', '#7CC461', '#4E9A45'], SEASON[season].tint, 0.2) : ['#B4E08A', '#7CC461', '#4E9A45'];
  const place = (x, y, s, markup) => `<g transform="translate(${x - 100 * s} ${y - 192 * s}) scale(${s})">${markup}</g>`;
  const back = specials.map((sp, i) => SPECIAL_POS[i] ? place(...SPECIAL_POS[i], treeMarkup({ stage: 5, vitality: 100, kind: sp.kind === 'round' ? 'agua' : sp.kind, season, id: `${id}s${i}` })) : '').join('');
  const mem = Array.from({ length: Math.min(3, memories) }, (_, i) => place(...MEMORY_POS[i], treeMarkup({ stage: 3, vitality: 0, dead: true, id: `${id}m${i}` }))).join('');
  const decoBehind = decorations.filter(d => d === 'lago' || d === 'ponte').map(d => DECO[d](...DECO_POS[d])).join('');
  const decoFront = decorations.filter(d => !['lago', 'ponte'].includes(d)).map(d => DECO[d](...DECO_POS[d])).join('');
  const mainTree = main
    ? place(180, 188, 0.92, treeMarkup({ ...main, season, id: `${id}t` }))
    : `<g transform="translate(180 184)"><ellipse rx="16" ry="5" fill="#9B7A5A"/><ellipse cx="-3" cy="-1" rx="8" ry="2.4" fill="#B48C68"/></g>`;
  const drops = watering ? `<g class="garden-water">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${150 + i * 12} 30c0 3-2 5-2 7a2 2 0 0 0 4 0c0-2-2-4-2-7z" fill="#7CC4F2" style="animation-delay:${i * 0.12}s"/>`).join('')}<ellipse class="garden-ripple" cx="180" cy="188" rx="20" ry="5" fill="none" stroke="#7CC4F2" stroke-width="1.5"/></g>` : '';
  return tpl(`<svg class="garden-scene" viewBox="0 0 360 236" role="img" aria-label="Seu jardim">
    <defs>
      <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--garden-sky-1)"/><stop offset="1" stop-color="var(--garden-sky-2)"/></linearGradient>
      <radialGradient id="${id}g" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="${grass[0]}"/><stop offset=".6" stop-color="${grass[1]}"/><stop offset="1" stop-color="${grass[2]}"/></radialGradient>
      <radialGradient id="${id}bf" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#C3E89A"/><stop offset=".6" stop-color="#76BE5C"/><stop offset="1" stop-color="#3F8A44"/></radialGradient>
      <radialGradient id="${id}bb" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#5DA552"/><stop offset="1" stop-color="#2F6E36"/></radialGradient>
      <linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98D63"/><stop offset="1" stop-color="#8A6444"/></linearGradient>
    </defs>
    <rect width="360" height="236" fill="url(#${id}sky)"/>
    <ellipse cx="180" cy="168" rx="172" ry="58" fill="url(#${id}e)"/>
    <ellipse cx="180" cy="158" rx="172" ry="58" fill="url(#${id}g)"/>
    <path d="M60 196 C120 176 150 150 180 132 S260 108 320 112" fill="none" stroke="#EEE6D3" stroke-width="12" stroke-linecap="round" opacity=".9"/>
    ${decoBehind}${mem}${back}${bushes(id, grass, 'back')}${decoFront}${mainTree}${bushes(id, grass, 'front')}${drops}
  </svg>`);
}
