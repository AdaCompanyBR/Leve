// Corpo da aba Líquidos: a ilustração de uma pessoa (feminina ou masculina, em person.js) que
// enche de baixo para cima com uma camada de cor por bebida. O líquido fica recortado pelo
// contorno do corpo e das roupas e se mistura ao desenho (multiplicação), então roupas,
// dobras e traços continuam visíveis mesmo com o corpo cheio. O cabelo fica por cima.
// O preenchimento mostra os líquidos registrados em relação à meta; não é uma medida do corpo.
import { drinkById } from '../lib/hydration.js';
import { reducedMotion } from './dom.js';
import { PEOPLE, W, H, TOP, BOTTOM } from './person.js';

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
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
  const person = PEOPLE[style] ?? PEOPLE.f;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'body-figure', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' });
  const defs = el('defs');
  const clip = el('clipPath', { id: id + '-clip' });
  for (const p of person.base) if (p.fill) clip.append(el('path', { d: p.d }));
  // Luz de cima e da esquerda: roupas um pouco mais escuras à direita.
  const light = el('linearGradient', { id: id + '-light', x1: 0, x2: 1, y1: 0, y2: 0 });
  light.append(el('stop', { offset: '.35', 'stop-color': 'var(--person-shade)', 'stop-opacity': 0 }), el('stop', { offset: '1', 'stop-color': 'var(--person-shade)', 'stop-opacity': '.16' }));
  const hairG = el('linearGradient', { id: id + '-hair', x1: 0, x2: 0, y1: 0, y2: 1 });
  hairG.append(el('stop', { offset: '0', 'stop-color': 'var(--person-hair-hi)' }), el('stop', { offset: '1', 'stop-color': 'var(--person-hair)' }));
  // As mãos ficam à frente das roupas: o véu e os traços das roupas não passam por cima delas.
  const mask = el('mask', { id: id + '-hands', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H });
  mask.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
  for (const p of person.base) if (p.kind === 'cut') mask.append(el('path', { d: p.d, fill: '#000' }));
  defs.append(clip, light, hairG, mask);
  svg.append(defs);

  const paint = (parts, g) => {
    for (const p of parts) {
      const a = { d: p.d, class: 'pp-' + p.kind };
      if (p.kind === 'hair') a.fill = `url(#${id}-hair)`;
      g.append(el('path', a));
    }
    return g;
  };
  const figure = paint(person.base.filter(p => p.kind !== 'line' && p.kind !== 'cut'), el('g', { class: 'person' }));
  figure.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: `url(#${id}-light)`, 'clip-path': `url(#${id}-clip)` }));

  // Líquido: camadas, superfície e bolhas, tudo dentro do contorno.
  const liquid = el('g', { 'clip-path': `url(#${id}-clip)` });
  const mix = el('g', { class: 'body-liquid' });
  const layers = el('g');
  const wave = el('path');
  mix.append(layers, wave);
  const surface = el('path', { class: 'body-surface' });
  const bubbles = el('g', { class: 'body-bubbles' });
  liquid.append(mix, surface, bubbles);
  // Por cima do líquido: um véu claro nas roupas (para separá-las da pele) e os traços de detalhe.
  const veil = el('g', { class: 'person-veil', mask: `url(#${id}-hands)` });
  for (const p of person.base) if (p.kind === 'cloth' || p.kind === 'shoe') veil.append(el('path', { d: p.d }));
  const ink = paint(person.base.filter(p => p.kind === 'line' && !p.top), el('g', { class: 'person', mask: `url(#${id}-hands)` }));
  const inkTop = paint(person.base.filter(p => p.kind === 'line' && p.top), el('g', { class: 'person' }));
  svg.append(figure, liquid, veil, ink, inkTop, paint(person.top, el('g', { class: 'person-top' })));

  let topColor = null;
  function waveAt(shown, phase) {
    if (!topColor || shown <= .002) { wave.setAttribute('d', ''); surface.setAttribute('d', ''); return; }
    const y = yOf(shown), amp = shown >= .999 ? 0 : 2.4;
    let top = '';
    for (let x = 0; x <= W; x += 12) top += ` L${x} ${(y + Math.sin(x / 26 + phase) * amp).toFixed(2)}`;
    wave.setAttribute('d', `M0 ${y + 8}${top} L${W} ${y + 8} Z`);
    wave.setAttribute('fill', topColor);
    surface.setAttribute('d', amp ? 'M' + top.slice(2) : '');
  }
  function draw(shown, phase) {
    layers.replaceChildren();
    topColor = null;
    for (const b of bands) {
      if (b.from >= shown) break;
      const to = Math.min(b.to, shown);
      topColor = drinkById(b.type).color;
      layers.append(el('rect', { x: 0, y: yOf(to), width: W, height: yOf(b.from) - yOf(to) + .6, fill: topColor, class: 'body-band' }));
    }
    waveAt(shown, phase);
  }

  function makeBubbles() {
    bubbles.replaceChildren();
    if (reducedMotion()) return;
    for (const b of bands) {
      if (!drinkById(b.type).fizz) continue;
      const y1 = yOf(Math.min(b.to, level)), y0 = yOf(b.from), span = y0 - y1;
      if (span < 10) continue;
      const n = Math.min(12, Math.max(3, Math.round(span / 20)));
      for (let i = 0; i < n; i++) {
        const c = el('circle', { cx: 94 + ((i * 37) % 54), cy: y0 - 4, r: 1.3 + (i % 3) * .55, class: 'body-bubble' });
        c.style.setProperty('--rise', `${-(span - 8)}px`);
        c.style.animationDelay = `${(i * .6) % 3.6}s`;
        c.style.animationDuration = `${3 + (i % 3)}s`;
        bubbles.append(c);
      }
    }
  }

  // Em repouso, só a superfície se move, cerca de 20 vezes por segundo; cheio, fica parado.
  function idle() {
    if (level <= .002 || level >= .999) return;
    let last = 0;
    const loop = now => {
      if (!svg.isConnected) return;
      if (now - last > 50) { last = now; waveAt(level, now / 1400); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  const from = shownByKey.get(key) ?? 0;
  shownByKey.set(key, level);
  makeBubbles();
  if (reducedMotion() || Math.abs(level - from) < .001) { draw(level, 0); if (!reducedMotion()) requestAnimationFrame(idle); return svg; }
  // Sobe com uma curva suave e assenta; depois a superfície fica ondulando devagar.
  const t0 = performance.now(), dur = 1100;
  const step = now => {
    if (!svg.isConnected && now - t0 > 50) return;
    const p = Math.min(1, (now - t0) / dur), e = 1 - (1 - p) ** 3;
    draw(from + (level - from) * e, now / 700);
    if (p < 1) requestAnimationFrame(step); else idle();
  };
  requestAnimationFrame(step);
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
