// Jardim a partir de arte renderizada (3D estilizado), em camadas, ligado aos dados reais.
//
// A arte fica em img/garden/ (ver ARTE_JARDIM.md). Todas as camadas têm o MESMO quadro e a MESMA câmera
// (1440 × 944, proporção 360 : 236), então elas só se empilham, sem posicionar nada à mão:
//   scene.webp               cenário sem a árvore (fundo opaco)
//   seedbed.webp             canteiro vazio, quando não há árvore viva
//   tree-1.webp … tree-7.webp       a árvore em cada fase (fundo transparente)
//   tree-1-dry.webp … tree-7-dry.webp  a mesma árvore enfraquecida (mesma pose, folhas secas e ralas)
//   special-<id>.webp        cada árvore especial no seu lugar (transparente)
//   deco-<id>.webp           cada decoração no seu lugar (transparente)
//   memory.webp              a árvore seca das memórias, ao longe (transparente)
//
// A vitalidade mistura a árvore saudável com a enfraquecida e tira um pouco da cor do cenário. A regada
// e as folhas caindo são uma camada leve de partículas. Sem a arte, o jardim usa o desenho em Canvas.

import { gardenCanvas } from './gardenCanvas.js';

export const ART = 'img/garden/';
const W = 360, H = 236, ANCHOR = { x: 180, y: 190 }; // base do tronco no quadro (igual em todas as fases)
let artReady = null; // null: ainda não sabe · true/false: a arte existe?

function probeArt() {
  if (artReady !== null) return Promise.resolve(artReady);
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(artReady = true);
    img.onerror = () => res(artReady = false);
    img.src = ART + 'scene.webp';
  });
}

/**
 * Jardim. opts: { main: { stage (0–6), waterings, vitality, id } | null, specials: [{ id, kind }], memories,
 * decorations, season, watering }. Usa a arte quando ela existe; senão, o desenho em Canvas.
 */
export function gardenIllustration(opts) {
  const slot = document.createElement('div');
  slot.className = 'gsc-slot';
  const fallback = () => slot.replaceChildren(gardenCanvas(opts));
  if (artReady === false) { fallback(); return slot; }
  probeArt().then(ok => (ok ? slot.replaceChildren(artScene(opts)) : fallback()));
  return slot;
}

function layer(src, cls, style = {}) {
  const img = new Image();
  img.className = 'gsc-l ' + cls; img.alt = ''; img.decoding = 'async'; img.draggable = false;
  img.onerror = () => img.remove(); // camada que ainda não existe: some sem quebrar o resto
  img.src = ART + src;
  Object.assign(img.style, style);
  return img;
}

function artScene(opts) {
  const wrap = document.createElement('div');
  wrap.className = 'gsc' + (opts.watering ? ' watering' : '');
  const vit = Math.max(0, Math.min(100, opts.main?.vitality ?? 100)) / 100;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', opts.main ? `Seu jardim, com a árvore em ${Math.round(vit * 100)}% de vitalidade` : 'Seu jardim, esperando a primeira árvore');
  // O cenário perde um pouco da cor com a vitalidade baixa (nunca fica cinza).
  const scene = layer('scene.webp', 'gsc-scene', { filter: `saturate(${(0.6 + 0.4 * vit).toFixed(2)}) brightness(${(0.94 + 0.06 * vit).toFixed(2)})` });
  const layers = [scene];
  if (opts.memories) layers.push(layer('memory.webp', 'gsc-memory'));
  for (const s of opts.specials ?? []) layers.push(layer(`special-${s.id}.webp`, 'gsc-special'));
  for (const d of opts.decorations ?? []) layers.push(layer(`deco-${d}.webp`, 'gsc-deco'));
  if (opts.main) {
    const n = Math.min(7, (opts.main.stage ?? 0) + 1);
    const tree = document.createElement('div');
    tree.className = 'gsc-tree';
    tree.style.transformOrigin = `${(ANCHOR.x / W) * 100}% ${(ANCHOR.y / H) * 100}%`;
    // saudável por baixo, enfraquecida por cima: a mistura acompanha a vitalidade (10 dias até 0%)
    const dryAmt = Math.min(1, (1 - vit) * 1.1);
    tree.append(layer(`tree-${n}.webp`, 'gsc-healthy'), layer(`tree-${n}-dry.webp`, 'gsc-dry', { opacity: dryAmt.toFixed(2) }));
    layers.push(tree);
  } else layers.push(layer('seedbed.webp', 'gsc-seedbed'));
  const fx = document.createElement('canvas');
  fx.className = 'gsc-fx';
  layers.push(fx);
  wrap.append(...layers);
  particles(wrap, fx, { vit, alive: !!opts.main, watering: !!opts.watering });
  return wrap;
}

// Partículas leves: folhas caindo (mais com a vitalidade baixa) e gotas na regada do dia.
function particles(wrap, fx, { vit, alive, watering }) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = 0, list = [], visible = true, width = 0;
  const waterUntil = watering ? performance.now() + 1800 : 0;
  const size = () => { width = wrap.clientWidth; const dpr = Math.min(3, devicePixelRatio || 1); fx.width = Math.round(width * dpr); fx.height = Math.round(width * (H / W) * dpr); fx.getContext('2d').setTransform((width / W) * dpr, 0, 0, (width / W) * dpr, 0, 0); };
  const tick = () => {
    raf = 0;
    if (!visible || !wrap.isConnected) return;
    if (!width) size();
    const c = fx.getContext('2d'), now = performance.now();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fx.width, fx.height); c.restore();
    if (alive && vit < 0.9 && Math.random() < (1 - vit) * 0.05) list.push({ k: 'leaf', x: ANCHOR.x + (Math.random() - 0.5) * 90, y: 60 + Math.random() * 60, vy: 0.2 + Math.random() * 0.12, r: Math.random() * 6, t: 0 });
    if (now < waterUntil && Math.random() < 0.5) list.push({ k: 'drop', x: ANCHOR.x + (Math.random() - 0.5) * 80, y: 4, vy: 2.4 + Math.random(), t: 0 });
    list = list.filter(p => p.y < ANCHOR.y + 16 && p.t < 600);
    for (const p of list) {
      p.t++; p.y += p.vy;
      if (p.k === 'leaf') { p.x += Math.sin(p.t / 18) * 0.35 + 0.08; p.r += 0.03; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = `rgba(184,152,82,${Math.max(0, 1 - p.t / 500)})`; c.beginPath(); c.ellipse(0, 0, 2.6, 1.2, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      else { c.fillStyle = 'rgba(124,196,242,.85)'; c.beginPath(); c.ellipse(p.x, p.y, 1.1, 2.4, 0, 0, Math.PI * 2); c.fill(); }
    }
    if (list.length || now < waterUntil || (alive && vit < 0.9)) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
  new ResizeObserver(() => { size(); start(); }).observe(wrap);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(wrap);
}
