// Anel vivo de calorias em canvas. Reage a cada registro com uma mola e,
// quando o movimento é permitido, um brilho percorre devagar o trecho preenchido.
import { reducedMotion } from './dom.js';

let shown = 0; // valor exibido persiste entre renderizações: o anel anima de onde estava
let velocity = 0;

/** `thickness`: espessura do anel em fração da largura (o padrão é o anel grande). */
export function createRing(canvas, getTarget, { thickness = 0.105, min = 18 } = {}) {
  const ctx = canvas.getContext('2d');
  let raf = 0, last = 0, size = 0, colors = readColors();

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    return { accent: cs.getPropertyValue('--accent').trim(), light: cs.getPropertyValue('--accent-2').trim(), track: cs.getPropertyValue('--track').trim() };
  }

  function resize() {
    const css = canvas.clientWidth || 260;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    size = css;
    canvas.width = canvas.height = Math.round(css * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(value, time) {
    const w = size, c = w / 2, lw = Math.max(min, w * thickness), r = c - lw / 2 - 6;
    const start = -Math.PI / 2;
    ctx.clearRect(0, 0, w, w);
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;

    ctx.strokeStyle = colors.track;
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
    if (value <= 0.002) return;

    const v = Math.min(value, 2);
    const end = start + v * Math.PI * 2;
    const grad = ctx.createConicGradient(start, c, c);
    grad.addColorStop(0, colors.light);
    grad.addColorStop(0.85, colors.accent);
    grad.addColorStop(1, colors.light);
    ctx.strokeStyle = grad;

    // Primeira volta
    ctx.beginPath(); ctx.arc(c, c, r, start, start + Math.min(v, 1) * Math.PI * 2); ctx.stroke();

    // Acima de 100%: a segunda volta passa por cima, com sombra na ponta. Sem cor de alerta.
    const hx = c + r * Math.cos(end), hy = c + r * Math.sin(end);
    if (v > 1) {
      ctx.strokeStyle = colors.accent;
      ctx.beginPath(); ctx.arc(c, c, r, start, end); ctx.stroke();
    }
    if (v > 0.9) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = lw * 0.35;
      ctx.shadowOffsetX = -Math.sin(end) * 3; ctx.shadowOffsetY = Math.cos(end) * 3;
      ctx.fillStyle = v > 1 ? colors.accent : colors.light;
      ctx.beginPath(); ctx.arc(hx, hy, lw / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Brilho que percorre o trecho preenchido
    if (!reducedMotion()) {
      const span = v * Math.PI * 2, len = Math.min(0.5, span * 0.5);
      const pos = start + ((time / 5200) % 1) * (span + len) - len;
      const a0 = Math.max(start, pos), a1 = Math.min(end, pos + len);
      if (a1 > a0) {
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath(); ctx.arc(c, c, r, a0, a1); ctx.stroke();
      }
    }
  }

  function frame(time) {
    if (!canvas.isConnected) return cleanup(); // tela trocou: para o laço
    const dt = Math.min(0.032, (time - last) / 1000 || 0.016);
    last = time;
    const target = getTarget();
    if (reducedMotion()) { shown = target; velocity = 0; }
    else {
      const k = 130, d = 17; // mola
      velocity += (k * (target - shown) - d * velocity) * dt;
      shown += velocity * dt;
    }
    draw(Math.max(0, shown), time);
    if (!reducedMotion() && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const restart = () => {
    cancelAnimationFrame(raf);
    if (!canvas.isConnected) return cleanup();
    colors = readColors(); resize(); raf = requestAnimationFrame(frame);
  };
  function cleanup() {
    cancelAnimationFrame(raf); ro.disconnect();
    mq.removeEventListener('change', restart);
    document.removeEventListener('visibilitychange', restart);
  }
  const ro = new ResizeObserver(restart);
  ro.observe(canvas);
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', restart);
  document.addEventListener('visibilitychange', restart);
  restart();
  return { refresh: restart };
}
