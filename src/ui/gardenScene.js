// Jardim a partir de arte renderizada (3D estilizado), em camadas, ligado aos dados reais.
// Direção de arte e entrega dos arquivos: ARTE_JARDIM.md.
//
// Arquivos em img/garden/ (WebP ou PNG — o app tenta .webp e depois .png):
//   scene              cenário sem a árvore principal (opaco, 1440 × 944)
//   tree-1 … tree-7    a árvore em cada fase (fundo transparente)
//   tree-1-dry … -7    a mesma árvore enfraquecida (mesma pose)
//   seedbed, special-<id>, deco-<id>, memory   camadas opcionais
//
// Dois formatos aceitos para as árvores (o app detecta sozinho):
//   • Quadro inteiro: 1440 × 944 (mesma proporção do cenário), já na posição — só empilha.
//   • Recorte: só a árvore com o montinho de terra, fundo transparente. O app encaixa a base do recorte
//     (centro da borda de baixo) no ponto do canteiro e usa a altura da fase. Ponto e alturas têm padrão
//     abaixo e podem ser ajustados em img/garden/garden.json, sem mexer no código.
//
// A vitalidade mistura a árvore saudável com a enfraquecida e tira um pouco da cor do cenário. A regada
// e as folhas caindo são uma camada leve de partículas. Sem a arte, o jardim usa o desenho em Canvas.

import { gardenCanvas } from './gardenCanvas.js';

export const ART = new URL('../../img/garden/', import.meta.url).href; // funciona de qualquer página
const FW = 1440, FH = 944; // quadro de referência (proporção do card: 360 : 236)
// Padrões para recortes: base do montinho no canteiro e altura de cada fase, em px do quadro 1440 × 944.
export const DEFAULT_LAYOUT = {
  anchor: { x: 720, y: 800 },
  heights: { 'tree-1': 150, 'tree-2': 200, 'tree-3': 270, 'tree-4': 350, 'tree-5': 440, 'tree-6': 520, 'tree-7': 580 },
  assets: {}, // por arquivo: { x, y, h } para ajustes finos
};

let artReady = null, sceneUrl = null, layoutP = null;
const probe = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
/** Primeiro formato que existe: .webp, depois .png. */
const find = async name => (await probe(ART + name + '.webp')) ?? (await probe(ART + name + '.png'));

async function probeArt() {
  if (artReady !== null) return artReady;
  const img = await find('scene');
  sceneUrl = img?.src ?? null;
  return (artReady = !!img);
}
function layout() {
  layoutP ??= fetch(ART + 'garden.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}))
    .then(j => ({ anchor: { ...DEFAULT_LAYOUT.anchor, ...(j.anchor ?? {}) }, heights: { ...DEFAULT_LAYOUT.heights, ...(j.heights ?? {}) }, assets: j.assets ?? {} }));
  return layoutP;
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
  probeArt().then(ok => (ok ? layout().then(L => slot.replaceChildren(artScene(opts, L))) : fallback()));
  return slot;
}

/** Posiciona uma camada: quadro inteiro (inset 0) ou recorte encaixado pela base. */
function place(img, name, L, heightKey = name) {
  const full = Math.abs(img.naturalWidth / img.naturalHeight - FW / FH) < 0.02 && img.naturalWidth >= 1000;
  if (full) { Object.assign(img.style, { inset: '0', width: '100%', height: '100%' }); return { full: true }; }
  const a = { ...L.anchor, ...(L.assets[name] ?? {}) };
  const h = L.assets[name]?.h ?? L.heights[heightKey] ?? 400;
  const w = h * (img.naturalWidth / img.naturalHeight);
  img.style.inset = 'auto'; // antes de left/top, senão os apaga
  Object.assign(img.style, {
    left: `${((a.x - w / 2) / FW) * 100}%`, top: `${((a.y - h) / FH) * 100}%`,
    width: `${(w / FW) * 100}%`, height: `${(h / FH) * 100}%`,
  });
  return { full: false, anchor: a };
}

/** Camada que pode não existir ainda: some sem quebrar o resto. */
function layer(name, cls, L, { style = {}, heightKey, onPlaced } = {}) {
  const img = new Image();
  img.className = 'gsc-l ' + cls; img.alt = ''; img.decoding = 'async'; img.draggable = false;
  for (const [k, v] of Object.entries(style)) img.style.setProperty(k.startsWith('--') ? k : k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), v);
  let triedPng = false;
  img.onload = () => { const p = place(img, name, L, heightKey); onPlaced?.(p); img.classList.add('in'); };
  img.onerror = () => { if (!triedPng) { triedPng = true; img.src = ART + name + '.png'; } else img.remove(); };
  img.src = ART + name + '.webp';
  return img;
}

function artScene(opts, L) {
  const wrap = document.createElement('div');
  wrap.className = 'gsc' + (opts.watering ? ' watering' : '');
  const vit = Math.max(0, Math.min(100, opts.main?.vitality ?? 100)) / 100;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', opts.main ? `Seu jardim, com a árvore em ${Math.round(vit * 100)}% de vitalidade` : 'Seu jardim, esperando a primeira árvore');
  // Cenário: perde um pouco da cor com a vitalidade baixa (nunca fica cinza).
  const scene = new Image();
  scene.className = 'gsc-l gsc-scene in'; scene.alt = ''; scene.src = sceneUrl;
  Object.assign(scene.style, { inset: '0', width: '100%', height: '100%', filter: `saturate(${(0.6 + 0.4 * vit).toFixed(2)}) brightness(${(0.94 + 0.06 * vit).toFixed(2)})` });
  const layers = [scene];
  if (opts.memories) layers.push(layer('memory', 'gsc-memory', L));
  for (const s of opts.specials ?? []) layers.push(layer(`special-${s.id}`, 'gsc-special', L));
  for (const d of opts.decorations ?? []) layers.push(layer(`deco-${d}`, 'gsc-deco', L));
  if (opts.main) {
    const n = Math.min(7, (opts.main.stage ?? 0) + 1);
    const tree = document.createElement('div');
    tree.className = 'gsc-tree';
    const setOrigin = p => { const a = p.anchor ?? L.anchor; tree.style.transformOrigin = `${(a.x / FW) * 100}% ${(a.y / FH) * 100}%`; };
    setOrigin({});
    // saudável por baixo, enfraquecida por cima: a mistura acompanha a vitalidade (10 dias até 0%)
    const dryAmt = Math.min(1, (1 - vit) * 1.1);
    tree.append(
      layer(`tree-${n}`, 'gsc-healthy', L, { onPlaced: setOrigin }),
      layer(`tree-${n}-dry`, 'gsc-dry', L, { heightKey: `tree-${n}`, style: { '--dry': dryAmt.toFixed(2) } }));
    layers.push(tree);
  } else layers.push(layer('seedbed', 'gsc-seedbed', L));
  const fx = document.createElement('canvas');
  fx.className = 'gsc-fx';
  layers.push(fx);
  wrap.append(...layers);
  particles(wrap, fx, { vit, alive: !!opts.main, watering: !!opts.watering, anchor: L.anchor });
  return wrap;
}

// Partículas leves: folhas caindo (mais com a vitalidade baixa) e gotas na regada do dia.
// Coordenadas no quadro 360 × 236 (o card), convertidas do ponto de âncora.
function particles(wrap, fx, { vit, alive, watering, anchor }) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const W = 360, H = 236, A = { x: (anchor.x / FW) * W, y: (anchor.y / FH) * H };
  let raf = 0, list = [], visible = true, width = 0;
  const waterUntil = watering ? performance.now() + 1800 : 0;
  const size = () => { width = wrap.clientWidth; const dpr = Math.min(3, devicePixelRatio || 1); fx.width = Math.round(width * dpr); fx.height = Math.round(width * (H / W) * dpr); fx.getContext('2d').setTransform((width / W) * dpr, 0, 0, (width / W) * dpr, 0, 0); };
  const tick = () => {
    raf = 0;
    if (!visible || !wrap.isConnected) return;
    if (!width) size();
    const c = fx.getContext('2d'), now = performance.now();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fx.width, fx.height); c.restore();
    if (alive && vit < 0.9 && Math.random() < (1 - vit) * 0.05) list.push({ k: 'leaf', x: A.x + (Math.random() - 0.5) * 90, y: A.y - 130 + Math.random() * 60, vy: 0.2 + Math.random() * 0.12, r: Math.random() * 6, t: 0 });
    if (now < waterUntil && Math.random() < 0.5) list.push({ k: 'drop', x: A.x + (Math.random() - 0.5) * 80, y: 4, vy: 2.4 + Math.random(), t: 0 });
    list = list.filter(p => p.y < A.y + 16 && p.t < 600);
    for (const p of list) {
      p.t++; p.y += p.vy;
      if (p.k === 'leaf') { p.x += Math.sin(p.t / 18) * 0.35 + 0.08; p.r += 0.03; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = `rgba(206,150,52,${Math.max(0, 1 - p.t / 500)})`; c.beginPath(); c.ellipse(0, 0, 2.6, 1.2, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      else { c.fillStyle = 'rgba(124,196,242,.85)'; c.beginPath(); c.ellipse(p.x, p.y, 1.1, 2.4, 0, 0, Math.PI * 2); c.fill(); }
    }
    if (list.length || now < waterUntil || (alive && vit < 0.9)) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
  new ResizeObserver(() => { size(); start(); }).observe(wrap);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(wrap);
}
