// Jardim em Canvas: uma pequena maquete botânica desenhada por código.
// Componentes: céu e colinas, terreno (grama, solo fértil, pedras, flores, arbustos), árvore procedural
// (tronco, galhos, raízes e copa de folhas individuais com luz e sombra), árvores especiais ao fundo,
// decorações e uma camada leve de movimento (folhas caindo, gotas de regada, balanço da copa).
//
// A forma de cada árvore é fixa (semente pelo id dela): com o crescimento os galhos só ficam maiores,
// sem embaralhar o desenho. O crescimento é contínuo pelas regadas; a vitalidade muda cor e densidade.

const W = 360, H = 236, BASE_X = 180, BASE_Y = 190;

// ---------------------------------------------------------------------------
// Utilidades

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = typeof seed === 'string' ? hash(seed) : seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const css = (c, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`;
const ramp = (stops, t) => { t = clamp(t, 0, 1) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)); return mixRgb(stops[i], stops[i + 1], t - i); };

/** Crescimento contínuo (0–1) pelas regadas, sem saltos. */
export function growthOf(waterings) {
  const P = [[0, 0], [1, 0.06], [3, 0.13], [7, 0.3], [15, 0.48], [30, 0.66], [60, 0.82], [100, 0.94], [160, 1]];
  if (waterings >= 160) return 1;
  for (let i = 1; i < P.length; i++) if (waterings <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return lerp(y0, y1, (waterings - x0) / (x1 - x0)); }
  return 1;
}

// Paletas de folhas: [sombra, meio, luz, brilho]
const LEAVES = {
  verde: ['#2B5E2E', '#3F8A3C', '#6DB352', '#B5E07E'],
  agua: ['#185E5F', '#2A8E8A', '#55BDB2', '#A7E6DC'],
  fruit: ['#2E6430', '#4A9440', '#7CBF55', '#C2E58A'],
  maple: ['#7E2633', '#C2414A', '#EE6B5C', '#FFB49A'],
  blossom: ['#B95584', '#E486B0', '#F6B5CF', '#FFE3EE'],
  golden: ['#9A6A16', '#D49A2E', '#F2C552', '#FFE9A6'],
  cone: ['#173F2A', '#26623E', '#3E8C56', '#7FC27F'],
};
const DRY = ['#6E5A33', '#9B8048', '#C2A866', '#E2CF95'];
const SEASON_TINT = { outono: ['#8A4A20', '#C26A2A', '#E59A45', '#F6C987'], inverno: ['#3F5A4C', '#5E7F6C', '#8DA897', '#C9D8CC'] };

// ---------------------------------------------------------------------------
// Árvore

/**
 * Desenha uma árvore. o: { x, y, scale, g (0–1), vitality, kind, season, seed, dead, haze, fruits, flowers }.
 * Devolve a caixa da copa ({ cx, cy, r }) para sombras e partículas.
 */
export function drawTree(ctx, o) {
  const { x = BASE_X, y = BASE_Y, scale = 1, g = 0.5, vitality = 100, kind = 'verde', season = 'verao', seed = 'arvore', dead = false } = o;
  const vit = clamp(vitality, 0, 100) / 100;
  let pal = (LEAVES[kind] ?? LEAVES.verde).map(hexRgb);
  if (kind === 'verde' && SEASON_TINT[season]) pal = pal.map((c, i) => mixRgb(c, hexRgb(SEASON_TINT[season][i]), season === 'outono' ? 0.3 : 0.22));
  const dryAmt = Math.pow(1 - vit, 1.15) * 0.85;
  pal = pal.map((c, i) => mixRgb(c, hexRgb(DRY[i]), dryAmt));
  const bark = dead ? [[150, 140, 128], [104, 94, 84]] : [[150, 104, 70], [84, 54, 36]];

  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);

  // Muda (germinação): caule curvo e folhinhas, num solo escuro e fértil
  if (g < 0.1 && !dead) {
    const h = 10 + g * 140, rnd = rng(seed + 'muda');
    soil(ctx, 16, 5);
    ctx.strokeStyle = css(mixRgb(hexRgb('#4F8F3A'), hexRgb(DRY[1]), dryAmt)); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, -h * 0.5, 1, -h); ctx.stroke();
    const n = 3 + Math.round(g * 30);
    for (let i = 0; i < n; i++) {
      const t = 0.45 + (i / n) * 0.55, side = i % 2 ? 1 : -1;
      leaf(ctx, side * 1.2 + (rnd() - 0.5), -h * t, 3.2 + rnd() * 1.6 + g * 10, side * (0.9 + rnd() * 0.4) - Math.PI / 2 * 0, pal, 0.5 + rnd() * 0.4, 1);
    }
    ctx.restore();
    return { cx: x, cy: y - h * scale, r: 8 * scale };
  }

  // Estrutura: tronco e galhos, com crescimento contínuo
  const levels = 1 + g * 4.2;
  const trunkLen = 14 + g * 40, trunkW = 2.2 + g * 11;
  const segs = [], tips = [];
  const grow = (x0, y0, ang, len, w, depth, path) => {
    const r = rng(seed + path);
    const bend = (r() - 0.5) * 0.35;
    const ex = x0 + Math.sin(ang) * len, ey = y0 - Math.cos(ang) * len;
    const mx = x0 + Math.sin(ang + bend) * len * 0.5, my = y0 - Math.cos(ang + bend) * len * 0.5;
    const w2 = Math.max(0.6, w * 0.66);
    segs.push({ x0, y0, mx, my, ex, ey, w, w2, depth });
    const next = depth + 1;
    if (next < Math.ceil(levels)) {
      const lenScale = clamp(levels - next, 0.22, 1);
      const n = depth === 0 ? 3 : r() < 0.55 ? 2 : 3;
      const spread = depth === 0 ? 0.7 : 0.42 + r() * 0.16;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread * (0.8 + r() * 0.4) + (r() - 0.5) * 0.22;
        const childAng = (ang + off) * (depth >= 2 ? 0.72 : 0.84); // tendência para cima: copa arredondada
        const from = depth === 0 ? 0.72 + r() * 0.28 : 0.85 + r() * 0.15;
        const fx = x0 + (ex - x0) * from, fy = y0 + (ey - y0) * from;
        grow(fx, fy, childAng, len * (depth === 0 ? 0.72 : 0.64 + r() * 0.1) * lenScale, w2 * (0.78 + r() * 0.12), next, path + i);
      }
      if (depth >= 1 && depth >= levels - 2.6) tips.push({ x: ex, y: ey, d: depth, w: 0.75 });
    } else tips.push({ x: ex, y: ey, d: depth, w: 1 });
  };
  grow(0, 0, (rng(seed)() - 0.5) * 0.1, trunkLen, trunkW, 0, 't');

  // Encaixe: a árvore inteira cabe no quadro (altura e largura), sem cortar a copa
  const cr0 = 9 + g * 18;
  const topY = Math.min(...tips.map(t => t.y), 0) - cr0, halfW = Math.max(...tips.map(t => Math.abs(t.x)), 4) + cr0;
  const fit = Math.min(1, (o.maxH ?? 176) / -topY, (o.maxHalfW ?? 150) / halfW);
  ctx.scale(fit, fit);
  // Caixa da copa
  let cx = 0, cy = 0;
  tips.forEach(t => { cx += t.x; cy += t.y; });
  cx /= tips.length || 1; cy /= tips.length || 1;
  const R = Math.max(10, ...tips.map(t => Math.hypot(t.x - cx, t.y - cy))) + cr0 * 0.8;

  // Sombra no chão (luz do alto à esquerda)
  if (!o.haze) {
    const sr = Math.min(R * 0.9, 70);
    const sg = ctx.createRadialGradient(sr * 0.3, 2, 2, sr * 0.3, 2, sr);
    sg.addColorStop(0, 'rgba(20,48,22,.34)'); sg.addColorStop(0.6, 'rgba(20,48,22,.14)'); sg.addColorStop(1, 'rgba(20,48,22,0)');
    ctx.save(); ctx.translate(sr * 0.3, 2); ctx.scale(1, 0.26); ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.restore(); ctx.fillStyle = sg; ctx.fill();
    soil(ctx, 8 + trunkW * 1.6, 3 + trunkW * 0.3);
  }

  // Raízes discretas
  if (g > 0.3) {
    const rr = rng(seed + 'raiz');
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1, len = (6 + rr() * 8) * (0.6 + g);
      taper(ctx, side * trunkW * 0.3, -1, side * (trunkW * 0.5 + len * 0.5), -2 - rr() * 2, side * (trunkW * 0.5 + len), 1 + rr() * 2, trunkW * 0.42, 0.6, bark);
    }
  }

  // Folhas atrás dos galhos (profundidade), galhos, folhas da frente
  const leaves = [];
  if (!dead) {
    const keep = 0.32 + 0.68 * vit;
    tips.forEach((t, k) => {
      const r = rng(seed + 'f' + k);
      const cr = cr0 * (t.w === 1 ? 1 : 0.8);
      const n = Math.round((14 + g * 44) * (t.w === 1 ? 1 : 0.6));
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * cr;
        const lx = t.x + Math.cos(a) * d * 0.95, ly = t.y + Math.sin(a) * d * 1.05 - cr * 0.3;
        const keepRoll = r(), spotRoll = r(), rot = r() * Math.PI * 2, size = 2.6 + g * 2.4 + r() * 1.6, jitter = r();
        if (keepRoll > keep) continue;
        let light = 0.55 - ((lx - cx) * 0.55 + (ly - cy) * 0.85) / (R * 1.6) + (jitter - 0.5) * 0.22;
        light = clamp(light, 0, 1);
        const dry = spotRoll < (1 - vit) * 0.55;
        leaves.push({ x: lx, y: ly, rot, size, light, dry, back: d > cr * 0.65 && ly < t.y });
      }
    });
  }
  // volume: uma massa escura sob cada grupo de folhas, depois a sombra interna
  if (!dead && leaves.length) tips.forEach(t => { const gr = ctx.createRadialGradient(t.x + 2, t.y + 3, 1, t.x + 2, t.y + 3, cr0); gr.addColorStop(0, css(pal[0], 0.5 * (0.4 + 0.6 * vit))); gr.addColorStop(1, css(pal[0], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(t.x + 2, t.y + 3, cr0, 0, Math.PI * 2); ctx.fill(); });
  leaves.forEach(l => { if (l.back) leaf(ctx, l.x + 1.6, l.y + 2.2, l.size * 1.05, l.rot, pal, 0.05, 0.55); });
  segs.forEach(s => taper(ctx, s.x0, s.y0, s.mx, s.my, s.ex, s.ey, s.w, s.w2, bark, s.depth === 0));
  leaves.sort((a, b) => a.light - b.light);
  leaves.forEach(l => leaf(ctx, l.x, l.y, l.size, l.rot, l.dry ? DRY.map(hexRgb) : pal, l.light, 1));
  // Detalhes: flores, frutos, brilho
  if ((o.flowers || kind === 'blossom' || (kind === 'verde' && (g > 0.62 || season === 'primavera') && g > 0.25)) && vit > 0.6) {
    const r = rng(seed + 'flor'), n = Math.round(tips.length * (kind === 'blossom' ? 2.5 : 0.45));
    for (let i = 0; i < n; i++) { const t = tips[Math.floor(r() * tips.length)]; blossom(ctx, t.x + (r() - 0.5) * 14, t.y + (r() - 0.5) * 12, 1.6 + g * 1.2, kind === 'blossom' ? '#FFF3F8' : '#FFD6E6'); }
  }
  if ((o.fruits || kind === 'fruit') && vit > 0.5) {
    const r = rng(seed + 'fruto');
    tips.filter((_, i) => i % 3 === 0).forEach(t => { const fx = t.x + (r() - 0.5) * 10, fy = t.y + 4 + r() * 6; const gr = ctx.createRadialGradient(fx - 1, fy - 1, 0.5, fx, fy, 3.6); gr.addColorStop(0, '#FFD9A0'); gr.addColorStop(1, '#E2771F'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.restore();
  return { cx: x + cx * scale, cy: y + cy * scale, r: R * scale, top: y + (cy - R) * scale };
}

// Galho afinando, com luz à esquerda e casca levemente marcada
function taper(ctx, x0, y0, mx, my, x1, y1, w0, w1, bark, isTrunk = false) {
  const ang = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(ang), ny = Math.cos(ang);
  const wm = (w0 + w1) / 2;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
  ctx.quadraticCurveTo(mx + nx * wm / 2, my + ny * wm / 2, x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  ctx.quadraticCurveTo(mx - nx * wm / 2, my - ny * wm / 2, x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  ctx.closePath();
  const gr = ctx.createLinearGradient(x0 - w0, y0, x0 + w0, y0);
  gr.addColorStop(0, css(mixRgb(bark[0], [255, 255, 255], 0.12))); gr.addColorStop(0.45, css(bark[0])); gr.addColorStop(1, css(bark[1]));
  ctx.fillStyle = gr; ctx.fill();
  if (isTrunk && w0 > 6) {
    ctx.strokeStyle = css(bark[1], 0.35); ctx.lineWidth = 0.6;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * w0 * 0.22, y0 - 2); ctx.quadraticCurveTo(mx + k * wm * 0.2, my, x1 + k * w1 * 0.18, y1 + 4); ctx.stroke(); }
  }
}

// Folha: forma pontuda, cor da paleta pela luz
function leaf(ctx, x, y, s, rot, pal, light, alpha) {
  const c = ramp(pal, light);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.55, s, 0); ctx.quadraticCurveTo(0, s * 0.55, -s, 0);
  ctx.fillStyle = css(c, alpha); ctx.fill();
  if (alpha === 1 && s > 3.2) { ctx.strokeStyle = css(mixRgb(c, [255, 255, 255], 0.25), 0.5); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0); ctx.stroke(); }
  ctx.restore();
}

function blossom(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.62, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#F2B33D'; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
}

// Solo fértil em volta do tronco
function soil(ctx, rx, ry) {
  const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
  gr.addColorStop(0, 'rgba(92,62,40,.95)'); gr.addColorStop(0.7, 'rgba(110,78,50,.55)'); gr.addColorStop(1, 'rgba(110,78,50,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------------------
// Terreno e elementos

function sky(ctx, dark) {
  const gr = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  if (dark) { gr.addColorStop(0, '#16202E'); gr.addColorStop(1, '#22302B'); } else { gr.addColorStop(0, '#D6E8FA'); gr.addColorStop(1, '#EFF5EA'); }
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // luz difusa vindo da esquerda
  const lg = ctx.createRadialGradient(40, 20, 4, 40, 20, 220);
  lg.addColorStop(0, dark ? 'rgba(160,190,255,.10)' : 'rgba(255,250,230,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
}

function hills(ctx, dark, vivid) {
  const layers = [
    { y: 118, amp: 10, col: dark ? '#2C3F35' : '#B9D5AE', seed: 'h1' },
    { y: 132, amp: 8, col: dark ? '#2F4A36' : '#9CC88A', seed: 'h2' },
  ];
  for (const L of layers) {
    const r = rng(L.seed);
    ctx.beginPath(); ctx.moveTo(0, H);
    ctx.lineTo(0, L.y);
    for (let x = 0; x <= W; x += 40) ctx.quadraticCurveTo(x + 20, L.y - L.amp * (0.4 + r()), x + 40, L.y + (r() - 0.5) * 6);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = css(mixRgb(hexRgb(L.col), hexRgb(dark ? '#3A3F3A' : '#C8C6B4'), (1 - vivid) * 0.5)); ctx.fill();
  }
}

function ground(ctx, dark, vivid, season) {
  let stops = dark ? ['#3E6A3A', '#2F5530', '#24432A'] : ['#9FD57A', '#77BB5A', '#4E9440'];
  if (season === 'outono') stops = stops.map(c => css(mixRgb(hexRgb(c), hexRgb('#C9A24E'), 0.18)));
  if (season === 'inverno') stops = stops.map(c => css(mixRgb(hexRgb(c), hexRgb('#9FB2A2'), 0.2)));
  const muted = dark ? '#4A4B3E' : '#BDB894';
  const s = stops.map(c => (c.startsWith('#') ? hexRgb(c) : c.match(/[\d.]+/g).slice(0, 3).map(Number))).map(c => css(mixRgb(c, hexRgb(muted), (1 - vivid) * 0.55)));
  ctx.beginPath(); ctx.moveTo(0, 150);
  ctx.bezierCurveTo(70, 138, 120, 150, 180, 146);
  ctx.bezierCurveTo(250, 141, 300, 152, W, 144);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  const gr = ctx.createLinearGradient(0, 140, 0, H);
  gr.addColorStop(0, s[0]); gr.addColorStop(0.45, s[1]); gr.addColorStop(1, s[2]);
  ctx.fillStyle = gr; ctx.fill();
  // pequena elevação sob a árvore
  const mg = ctx.createRadialGradient(BASE_X - 10, BASE_Y - 4, 4, BASE_X, BASE_Y - 4, 130);
  mg.addColorStop(0, dark ? 'rgba(120,170,110,.12)' : 'rgba(255,255,220,.2)'); mg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.translate(BASE_X, BASE_Y - 4); ctx.scale(1, 0.24); ctx.beginPath(); ctx.arc(0, 0, 130, 0, Math.PI * 2); ctx.restore(); ctx.fillStyle = mg; ctx.fill();
}

function grass(ctx, dark, vivid) {
  const r = rng('grama'), base = dark ? [[58, 100, 54], [92, 140, 78]] : [[78, 140, 62], [150, 205, 110]];
  for (let i = 0; i < 520; i++) {
    const y = 146 + Math.pow(r(), 0.7) * (H - 146), x = r() * W;
    if (Math.abs(x - BASE_X) < 10 && Math.abs(y - BASE_Y) < 6) continue;
    const near = (y - 146) / (H - 146), len = 2 + near * 5 + r() * 2;
    const c = mixRgb(mixRgb(base[0], base[1], r()), [190, 180, 140], (1 - vivid) * 0.45);
    ctx.strokeStyle = css(c, 0.75); ctx.lineWidth = 0.5 + near * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (r() - 0.5) * 3, y - len * 0.6, x + (r() - 0.5) * 4, y - len); ctx.stroke();
  }
}

function stone(ctx, x, y, w, h, dark) {
  ctx.fillStyle = 'rgba(20,40,20,.22)'; ctx.beginPath(); ctx.ellipse(x + w * 0.15, y + h * 0.35, w * 0.62, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  const gr = ctx.createLinearGradient(x - w / 2, y - h, x + w / 2, y);
  gr.addColorStop(0, dark ? '#9AA19A' : '#E6E4DA'); gr.addColorStop(1, dark ? '#5F665F' : '#A9A79A');
  ctx.fillStyle = gr; ctx.beginPath();
  ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w / 2, y - h * 0.9, x - w * 0.1, y - h * 1.1, x + w * 0.2, y - h);
  ctx.bezierCurveTo(x + w * 0.5, y - h * 0.9, x + w / 2, y - h * 0.3, x + w / 2, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - w * 0.12, y - h * 0.72, w * 0.16, h * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
}

function flower(ctx, x, y, color, s = 1) {
  ctx.strokeStyle = '#4C8A3A'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5 * s); ctx.stroke();
  blossom(ctx, x, y - 5.5 * s, 1.5 * s, color);
}

// Arbusto: um tufo de folhas (mesmo desenho da copa), sem esferas
function bush(ctx, x, y, r, seed, vivid, dark) {
  ctx.fillStyle = 'rgba(20,48,22,.22)'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + 1, r * 1.15, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  const pal = (dark ? ['#1F4426', '#2F6634', '#4F9446', '#8CC46E'] : ['#2B5E2E', '#3F8A3C', '#6DB352', '#B5E07E']).map(hexRgb).map((c, i) => mixRgb(c, hexRgb(DRY[i]), (1 - vivid) * 0.5));
  const rnd = rng(seed), n = Math.round(r * 7);
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI, d = Math.sqrt(rnd()) * r; pts.push({ x: x + Math.cos(a) * d * 1.2 * (rnd() < 0.5 ? -1 : 1), y: y - Math.sin(a) * d * 0.9, rot: rnd() * 6.28, s: 2 + rnd() * 1.5, light: clamp(0.65 - (Math.sin(a) * d) / r * -0.4 - rnd() * 0.3, 0, 1) }); }
  pts.sort((a, b) => a.light - b.light).forEach(p => leaf(ctx, p.x, p.y, p.s, p.rot, pal, p.light, 1));
}

function pond(ctx, x, y, dark) {
  ctx.fillStyle = dark ? '#3E4A42' : '#CFC9B6'; ctx.beginPath(); ctx.ellipse(x, y, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
  const gr = ctx.createLinearGradient(x, y - 9, x, y + 9); gr.addColorStop(0, dark ? '#355C78' : '#9DD3EE'); gr.addColorStop(1, dark ? '#24435A' : '#5FAED6');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, 27, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - 8, y - 3, 9, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5DA552'; ctx.beginPath(); ctx.ellipse(x + 12, y + 2, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
}
function lantern(ctx, x, y, dark) {
  stone(ctx, x, y + 1, 9, 3, dark);
  ctx.fillStyle = dark ? '#7E847D' : '#BCC0B7'; ctx.fillRect(x - 1.6, y - 10, 3.2, 10);
  ctx.fillStyle = dark ? '#8E948C' : '#D3D6CE'; ctx.fillRect(x - 4.5, y - 16, 9, 6);
  ctx.fillStyle = '#FFE39A'; ctx.fillRect(x - 2.2, y - 14.6, 4.4, 3.2);
  ctx.fillStyle = dark ? '#6A7069' : '#A2A69D'; ctx.beginPath(); ctx.moveTo(x - 7, y - 16); ctx.lineTo(x, y - 21); ctx.lineTo(x + 7, y - 16); ctx.closePath(); ctx.fill();
}
function bench(ctx, x, y) {
  ctx.fillStyle = 'rgba(20,40,20,.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 13, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7A5134'; ctx.fillRect(x - 10, y - 5, 2, 6); ctx.fillRect(x + 8, y - 5, 2, 6);
  ctx.fillStyle = '#B9814F'; ctx.fillRect(x - 12, y - 7, 24, 2.6); ctx.fillStyle = '#C99560'; ctx.fillRect(x - 12, y - 12, 24, 2.4);
}
function steppingStones(ctx, dark) {
  [[120, 228, 9], [138, 218, 8], [152, 208, 7], [163, 199, 6]].forEach(([x, y, w]) => {
    ctx.fillStyle = dark ? '#7B807A' : '#E2DED1'; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x - w * 0.2, y - w * 0.1, w * 0.4, w * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  });
}

// Folhas caídas no chão (mais quando a vitalidade cai)
function fallen(ctx, vit, seed) {
  const n = Math.round((1 - vit) * 44), r = rng(seed + 'caidas'), pal = DRY.map(hexRgb);
  for (let i = 0; i < n; i++) leaf(ctx, BASE_X + (r() - 0.45) * 90, BASE_Y - 2 + r() * 14, 2.2 + r(), r() * 6.28, pal, r(), 0.9);
}

// ---------------------------------------------------------------------------
// Cena

const SPECIAL_POS = [[62, 140, 0.4], [304, 138, 0.42], [110, 132, 0.3], [252, 130, 0.32], [28, 150, 0.36], [338, 150, 0.34]];

/**
 * Monta o jardim num elemento. opts: { main: { waterings, vitality, id } | null, specials: [{ kind, id }],
 * memories, decorations, season, watering }. Devolve o elemento (canvas em camadas).
 */
export function gardenCanvas(opts) {
  const wrap = document.createElement('div');
  wrap.className = 'gcv';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', opts.main ? `Seu jardim, com a árvore em ${Math.round(opts.main.vitality)}% de vitalidade` : 'Seu jardim, esperando a primeira árvore');
  const bg = document.createElement('canvas'), tree = document.createElement('canvas'), fx = document.createElement('canvas');
  bg.className = 'gcv-bg'; tree.className = 'gcv-tree'; fx.className = 'gcv-fx';
  tree.style.transformOrigin = `${(BASE_X / W) * 100}% ${(BASE_Y / H) * 100}%`;
  wrap.append(bg, tree, fx);
  let canopy = null, width = 0, raf = 0, particles = [], visible = true, waterUntil = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vit = (opts.main?.vitality ?? 100) / 100;

  const setup = c => { const dpr = Math.min(3, window.devicePixelRatio || 1); c.width = Math.round(width * dpr); c.height = Math.round(width * (H / W) * dpr); const ctx = c.getContext('2d'); ctx.setTransform((width / W) * dpr, 0, 0, (width / W) * dpr, 0, 0); return ctx; };

  function render() {
    width = wrap.clientWidth; if (!width) return;
    const dark = isDark(), vivid = opts.main ? 0.35 + 0.65 * vit : 0.85;
    const a = setup(bg);
    sky(a, dark); hills(a, dark, vivid);
    // árvores especiais (permanentes), ao fundo e com um pouco de névoa
    (opts.specials ?? []).forEach((sp, i) => {
      const p = SPECIAL_POS[i]; if (!p) return;
      a.save(); a.globalAlpha = 0.92;
      drawTree(a, { x: p[0], y: p[1], scale: p[2], g: 0.78, vitality: 100, kind: sp.kind === 'round' ? 'agua' : sp.kind, season: opts.season, seed: 'esp-' + sp.id, haze: true });
      a.restore();
    });
    // memórias: uma árvore seca discreta ao longe
    if (opts.memories) { a.save(); a.globalAlpha = 0.55; drawTree(a, { x: 16, y: 146, scale: 0.28, g: 0.55, vitality: 0, dead: true, seed: 'memoria', haze: true }); a.restore(); }
    ground(a, dark, vivid, opts.season);
    if (opts.decorations?.includes('lago')) pond(a, 296, 168, dark);
    if (opts.decorations?.includes('ponte')) { a.strokeStyle = '#9C6B43'; a.lineWidth = 3; a.lineCap = 'round'; a.beginPath(); a.moveTo(274, 170); a.quadraticCurveTo(296, 158, 318, 170); a.stroke(); }
    bush(a, 96, 160, 10, 'b1', vivid, dark); bush(a, 262, 158, 9, 'b2', vivid, dark);
    grass(a, dark, vivid);
    if (opts.decorations?.includes('pedras')) steppingStones(a, dark);
    stone(a, 132, 196, 12, 6, dark); stone(a, 232, 200, 9, 5, dark); stone(a, 244, 204, 6, 3.5, dark);
    if (opts.decorations?.includes('lanterna')) lantern(a, 108, 184, dark);
    if (opts.decorations?.includes('banco')) bench(a, 268, 192);
    const fr = rng('flores'), nFlowers = Math.round((opts.decorations?.includes('flores') ? 22 : 10) * (0.3 + 0.7 * vivid));
    for (let i = 0; i < nFlowers; i++) { const left = fr() < 0.5; flower(a, left ? 20 + fr() * 90 : 250 + fr() * 100, 196 + fr() * 34, ['#FFFFFF', '#F7B6D2', '#FFD66B', '#C8B6F7'][Math.floor(fr() * 4)], 0.8 + fr() * 0.5); }
    bush(a, 40, 214, 13, 'b3', vivid, dark); bush(a, 330, 210, 14, 'b4', vivid, dark);
    if (opts.main) fallen(a, vit, opts.main.id);

    const b = setup(tree);
    if (opts.main) canopy = drawTree(b, { g: growthOf(opts.main.waterings), vitality: opts.main.vitality, season: opts.season, seed: opts.main.id });
    else { b.save(); b.translate(BASE_X, BASE_Y); soil(b, 18, 5); b.restore(); canopy = null; }
    setup(fx);
  }

  // Movimento: folhas caindo (mais quando a árvore está fraca) e gotas na regada
  function tick(t) {
    raf = 0;
    if (!visible || !width) return;
    const c = fx.getContext('2d');
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fx.width, fx.height); c.restore();
    const now = performance.now();
    if (canopy && vit < 0.9 && Math.random() < (1 - vit) * 0.05) particles.push({ type: 'leaf', x: canopy.cx + (Math.random() - 0.5) * canopy.r * 1.4, y: canopy.cy + (Math.random() - 0.3) * canopy.r * 0.6, vy: 0.18 + Math.random() * 0.12, vx: 0.15 + Math.random() * 0.2, rot: Math.random() * 6, life: 0 });
    if (now < waterUntil && Math.random() < 0.5) particles.push({ type: 'drop', x: BASE_X + (Math.random() - 0.5) * (canopy ? canopy.r * 1.6 : 30), y: 6 + Math.random() * 10, vy: 2.4 + Math.random(), life: 0 });
    particles = particles.filter(p => p.y < BASE_Y + 14 && p.life < 600);
    for (const p of particles) {
      p.life++;
      if (p.type === 'leaf') { p.y += p.vy; p.x += Math.sin(p.life / 18) * 0.35 + p.vx * 0.3; p.rot += 0.03; leaf(c, p.x, p.y, 2.6, p.rot, DRY.map(hexRgb), 0.6, clamp(1 - p.life / 500, 0, 1)); }
      else { p.y += p.vy; c.fillStyle = 'rgba(124,196,242,.85)'; c.beginPath(); c.ellipse(p.x, p.y, 1.1, 2.4, 0, 0, Math.PI * 2); c.fill(); }
    }
    if (particles.length || now < waterUntil || (canopy && vit < 0.9)) raf = requestAnimationFrame(tick);
  }
  const start = () => { if (!reduced && !raf) raf = requestAnimationFrame(tick); };

  const ro = new ResizeObserver(() => { if (wrap.clientWidth !== width) { render(); start(); } });
  ro.observe(wrap);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); });
  io.observe(wrap);
  if (opts.watering && !reduced) { waterUntil = performance.now() + 1800; wrap.classList.add('watering'); }
  // Tema trocado: redesenha
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => render();
  mq.addEventListener?.('change', onTheme);
  // Limpa quando sai da tela (a tela é recriada a cada atualização)
  const mo = new MutationObserver(() => { if (!wrap.isConnected) { ro.disconnect(); io.disconnect(); mo.disconnect(); mq.removeEventListener?.('change', onTheme); cancelAnimationFrame(raf); } });
  requestAnimationFrame(() => { if (wrap.isConnected) mo.observe(document.body, { childList: true, subtree: true }); render(); start(); });
  return wrap;
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
}
