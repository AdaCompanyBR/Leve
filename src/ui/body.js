// Corpo da aba Líquidos: silhueta de frente (feminina ou masculina) que enche de baixo para cima,
// com uma camada de cor por bebida. O preenchimento mostra os líquidos registrados em relação à
// meta do dia; não é uma medida do corpo. Tudo em SVG, recortado pela própria silhueta.
import { drinkById } from '../lib/hydration.js';
import { reducedMotion } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 200, TOP = 14, BOTTOM = 452;
const mirror = d => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${(W - parseFloat(x)).toFixed(1)} ${y}`);

// Partes de cada silhueta. Os braços e as pernas da direita são o espelho da esquerda.
const SHAPES = {
  f: {
    hair: 'M100 19 C80 19 70 34 70 55 C70 74 73 89 78 101 C81 101 84 99 86 97 C84 88 83 78 84 64 L116 64 C117 78 116 88 114 97 C116 99 119 101 122 101 C127 89 130 74 130 55 C130 34 120 19 100 19 Z',
    head: { cx: 100, cy: 50, rx: 19.5, ry: 25 },
    neck: 'M92 70 L108 70 L109 90 L91 90 Z',
    torso: 'M100 86 C88 86 74 88 64 93 C56 97 54 106 56 118 L60 146 C62 160 68 170 72 180 C66 194 61 212 62 238 L138 238 C139 212 134 194 128 180 C132 170 138 160 140 146 L144 118 C146 106 144 97 136 93 C126 88 112 86 100 86 Z',
    arm: 'M62 96 C51 99 47 108 46 122 L42 176 C40 198 37 220 36 238 C35 248 40 254 45 251 C48 247 49 238 51 226 L57 180 L62 140 Z',
    leg: 'M64 232 L101 232 L99 256 C97 300 95 342 93 384 C92 408 91 424 91 436 L75 436 C74 414 72 386 70 346 C67 304 63 266 64 232 Z',
    foot: { cx: 82, cy: 441, rx: 12.5, ry: 6 },
  },
  m: {
    hair: 'M100 18 C80 18 74 30 75 48 C76 42 82 36 100 36 C118 36 124 42 125 48 C126 30 120 18 100 18 Z',
    head: { cx: 100, cy: 50, rx: 21, ry: 26 },
    neck: 'M90 70 L110 70 L112 92 L88 92 Z',
    torso: 'M100 88 C86 88 68 89 56 95 C47 100 45 110 47 124 L53 160 C56 178 60 196 62 238 L138 238 C140 196 144 178 147 160 L153 124 C155 110 153 100 144 95 C132 89 114 88 100 88 Z',
    arm: 'M55 98 C44 102 39 112 38 128 L35 182 C33 204 31 224 31 240 C31 250 37 256 42 252 C45 248 46 238 48 226 L54 182 L58 142 Z',
    leg: 'M63 232 L101 232 L99 258 C98 302 96 344 94 386 C93 410 92 426 92 438 L74 438 C73 416 71 388 69 348 C67 306 62 266 63 232 Z',
    foot: { cx: 82, cy: 443, rx: 13.5, ry: 6 },
  },
};

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

const hair = style => el('path', { d: (SHAPES[style] ?? SHAPES.f).hair, class: 'hair' });

function parts(style) {
  const s = SHAPES[style] ?? SHAPES.f;
  const list = [];
  list.push(el('ellipse', { cx: s.head.cx, cy: s.head.cy, rx: s.head.rx, ry: s.head.ry }));
  list.push(el('path', { d: s.neck }));
  list.push(el('path', { d: s.arm }), el('path', { d: mirror(s.arm) }));
  list.push(el('path', { d: s.leg }), el('path', { d: mirror(s.leg) }));
  list.push(el('path', { d: s.torso }));
  list.push(el('ellipse', { cx: s.foot.cx, cy: s.foot.cy, rx: s.foot.rx, ry: s.foot.ry }), el('ellipse', { cx: W - s.foot.cx, cy: s.foot.cy, rx: s.foot.rx, ry: s.foot.ry }));
  return list;
}

const yOf = f => BOTTOM - f * (BOTTOM - TOP);

// O nível mostrado persiste entre redesenhos: o líquido sobe de onde estava.
const shownByKey = new Map();
let uid = 0;

/**
 * Cria a figura. `bands` vem de fillBands (faixas de 0 a 1, de baixo para cima).
 * `key` identifica o dia, para animar só a diferença ao registrar.
 */
export function bodyFigure({ style = 'f', bands = [], level = 0, key = '', label = '' }) {
  const id = 'body' + (++uid);
  const svg = el('svg', { viewBox: `0 0 ${W} 460`, class: 'body-figure', role: 'img', 'aria-label': label });
  const defs = el('defs');
  const clip = el('clipPath', { id: id + '-clip' });
  parts(style).forEach(p => clip.append(p));
  // Volume: claro à esquerda, sombra à direita, como luz de cima.
  const sheen = el('linearGradient', { id: id + '-sheen', x1: 0, x2: 1, y1: 0, y2: 0 });
  sheen.append(el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.32' }), el('stop', { offset: '.42', 'stop-color': '#fff', 'stop-opacity': '0' }),
    el('stop', { offset: '.8', 'stop-color': '#000', 'stop-opacity': '0' }), el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '.12' }));
  defs.append(clip, sheen);
  svg.append(defs);

  // Cabelo atrás da cabeça e fora do líquido.
  const hairG = el('g', { class: 'body-hair' });
  hairG.append(hair(style));
  const outline = el('g', { class: 'body-outline' });
  parts(style).forEach(p => outline.append(p));
  const fill = el('g', { class: 'body-base' });
  parts(style).forEach(p => fill.append(p));
  const liquid = el('g', { 'clip-path': `url(#${id}-clip)` });
  const layers = el('g', { class: 'body-layers' });
  const wave = el('path', { class: 'body-wave' });
  const bubbles = el('g', { class: 'body-bubbles' });
  liquid.append(layers, wave, bubbles, el('rect', { x: 0, y: 0, width: W, height: 460, fill: `url(#${id}-sheen)`, class: 'body-sheen' }));
  svg.append(hairG, outline, fill, liquid);

  function draw(shown, phase) {
    layers.replaceChildren();
    let top = null;
    for (const b of bands) {
      if (b.from >= shown) break;
      const to = Math.min(b.to, shown);
      const d = drinkById(b.type);
      layers.append(el('rect', { x: 0, y: yOf(to), width: W, height: yOf(b.from) - yOf(to) + .6, fill: d.color, class: 'body-band' }));
      top = d;
    }
    if (!top || shown <= .002) { wave.setAttribute('d', ''); return; }
    // Superfície: uma onda baixa e lenta, só no topo.
    const y = yOf(shown), amp = shown >= .999 ? 0 : 2.2;
    let dpath = `M0 ${y + 6}`;
    for (let x = 0; x <= W; x += 10) dpath += ` L${x} ${(y + Math.sin(x / 22 + phase) * amp).toFixed(2)}`;
    dpath += ` L${W} ${y + 6} Z`;
    wave.setAttribute('d', dpath);
    wave.setAttribute('fill', top.color);
  }

  function makeBubbles() {
    bubbles.replaceChildren();
    if (reducedMotion()) return;
    for (const b of bands) {
      if (!drinkById(b.type).fizz) continue;
      const y1 = yOf(Math.min(b.to, level)), y0 = yOf(b.from), span = y0 - y1;
      if (span < 8) continue;
      const n = Math.min(10, Math.max(3, Math.round(span / 18)));
      for (let i = 0; i < n; i++) {
        const c = el('circle', { cx: 74 + ((i * 37) % 52), cy: y0 - 4, r: 1.2 + (i % 3) * .5, class: 'body-bubble' });
        c.style.setProperty('--rise', `${-(span - 6)}px`);
        c.style.animationDelay = `${(i * .6) % 3.6}s`;
        c.style.animationDuration = `${3 + (i % 3)}s`;
        bubbles.append(c);
      }
    }
  }

  const from = shownByKey.get(key) ?? 0;
  shownByKey.set(key, level);
  makeBubbles();
  if (reducedMotion() || Math.abs(level - from) < .001) { draw(level, 0); if (!reducedMotion()) idle(); return svg; }
  // Sobe com uma curva suave e assenta; depois a superfície fica ondulando devagar.
  const t0 = performance.now(), dur = 1100;
  const step = now => {
    if (!svg.isConnected && now - t0 > 50) return;
    const p = Math.min(1, (now - t0) / dur), e = 1 - (1 - p) ** 3;
    draw(from + (level - from) * e, now / 700);
    if (p < 1) requestAnimationFrame(step); else idle();
  };
  requestAnimationFrame(step);
  // Em repouso, só a superfície se move, cerca de 20 vezes por segundo; cheio, fica parado.
  function idle() {
    if (level <= .002 || level >= .999) return;
    let last = 0;
    const loop = now => {
      if (!svg.isConnected) return;
      if (now - last > 50) { last = now; waveOnly(now / 1400); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  function waveOnly(phase) {
    const y = yOf(level);
    let dpath = `M0 ${y + 6}`;
    for (let x = 0; x <= W; x += 10) dpath += ` L${x} ${(y + Math.sin(x / 22 + phase) * 2.2).toFixed(2)}`;
    wave.setAttribute('d', dpath + ` L${W} ${y + 6} Z`);
  }
  draw(from, 0);
  return svg;
}

/** Ícone de cada bebida (mesma linguagem dos ícones do app). */
export const DRINK_ICONS = {
  drop: '<path d="M12 3.6c3.1 3.7 5.7 6.8 5.7 10a5.7 5.7 0 0 1-11.4 0c0-3.2 2.6-6.3 5.7-10z"/>',
  mug: '<path d="M5 8h11v6.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1 1 1.4 1 2.5M11.5 3.5c0 1 1 1.4 1 2.5"/>',
  glass: '<path d="M6 4h12l-1.6 14.4a2 2 0 0 1-2 1.6H9.6a2 2 0 0 1-2-1.6z"/><path d="M6.7 9.5h10.6"/>',
  can: '<rect x="7" y="4" width="10" height="16" rx="2.5"/><path d="M7 7.5h10M7 16.5h10"/>',
  bottle: '<path d="M10 3.5h4v3l1.5 2.5V19a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 19V9L10 6.5z"/><path d="M8.5 12h7"/>',
};

/** Pastilha redonda com o ícone e a cor da bebida. */
export function drinkBadge(type, size = 30) {
  const d = drinkById(type);
  const t = document.createElement('template');
  t.innerHTML = `<span class="drink-badge" style="--c:${d.color};width:${size}px;height:${size}px" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${DRINK_ICONS[d.icon] ?? DRINK_ICONS.glass}</svg></span>`;
  return t.content.firstChild;
}

/** Copo da semana: camadas por bebida, cheio quando bate a meta do dia. */
export function cupFigure({ layers, goal, selected, met, label }) {
  const id = 'cup' + (++uid);
  const svg = el('svg', { viewBox: '0 0 40 64', class: 'cup' + (selected ? ' selected' : '') + (met ? ' met' : ''), role: 'img', 'aria-label': label });
  const shape = 'M4 6 L36 6 L32.5 58 C32.3 60.5 30.6 62 28 62 L12 62 C9.4 62 7.7 60.5 7.5 58 Z';
  const clip = el('clipPath', { id: id + '-c' });
  clip.append(el('path', { d: shape }));
  const defs = el('defs');
  defs.append(clip);
  svg.append(defs);
  svg.append(el('path', { d: shape, class: 'cup-glass' }));
  const g = el('g', { 'clip-path': `url(#${id}-c)` });
  const top = 8, bottom = 62, hgt = bottom - top;
  let at = 0;
  for (const l of layers) {
    if (at >= 1) break;
    const f = Math.min(1 - at, l.ml / goal);
    g.append(el('rect', { x: 0, width: 40, y: bottom - (at + f) * hgt, height: f * hgt + .4, fill: drinkById(l.type).color }));
    at += f;
  }
  svg.append(g, el('path', { d: shape, class: 'cup-rim' }));
  return svg;
}
