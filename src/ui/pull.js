// Puxar para atualizar (celular): com a tela no topo, arrastar para baixo mostra o indicador;
// soltar depois do ponto sincroniza e recarrega a página. O gesto nativo do navegador fica
// desligado (overscroll-behavior no body), então este é o mesmo no Safari, no Chrome e com o
// app instalado na Tela de Início, onde o navegador não oferece o gesto.
import { h, icon, haptic, reducedMotion } from './dom.js';

const THRESHOLD = 72;   // px de puxada para valer
const MAX = 120;        // até onde o indicador desce
const resist = d => MAX * (1 - Math.exp(-d / (MAX * 1.1)));   // puxada com resistência, como no iOS

/** Liga o gesto. `onRefresh` roda antes de recarregar (ou no lugar, quando devolve false). */
export function initPullToRefresh({ onRefresh }) {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const ind = h('div.ptr', { 'aria-hidden': 'true' }, h('span.ptr-icon', icon('arrowdown')), h('span.ptr-spin'));
  const live = h('p.visually-hidden', { 'aria-live': 'polite' });
  document.body.append(ind, live);
  let startY = 0, startX = 0, pull = 0, active = false, armed = false, busy = false;

  const blocked = t => document.querySelector('.backdrop, .popover') || t.closest?.('input, textarea, select, .ruler, .liq-types, .week-cups, .chip-row, [contenteditable]');
  const show = d => {
    ind.style.transform = `translate(-50%, ${d - 52}px)`;
    ind.style.opacity = String(Math.min(1, d / (THRESHOLD * .7)));
    ind.querySelector('.ptr-icon').style.transform = `rotate(${Math.min(1, d / THRESHOLD) * 180}deg)`;
  };
  const reset = () => { ind.classList.remove('armed', 'loading'); ind.style.transition = reducedMotion() ? '' : 'transform .3s var(--ease-sheet), opacity .2s'; show(0); setTimeout(() => { ind.style.transition = ''; }, 320); };

  addEventListener('touchstart', e => {
    if (busy || e.touches.length !== 1 || scrollY > 0 || blocked(e.target)) { active = false; return; }
    startY = e.touches[0].clientY; startX = e.touches[0].clientX; pull = 0; active = true; armed = false;
  }, { passive: true });

  addEventListener('touchmove', e => {
    if (!active) return;
    const dy = e.touches[0].clientY - startY, dx = e.touches[0].clientX - startX;
    // Só conta puxada para baixo, mais vertical do que lateral, com a tela no topo.
    if (dy <= 0 || scrollY > 0 || (pull === 0 && Math.abs(dx) > dy)) { if (pull === 0) active = false; return; }
    e.preventDefault();
    pull = resist(dy);
    show(pull);
    const now = pull >= THRESHOLD;
    if (now !== armed) { armed = now; ind.classList.toggle('armed', armed); if (armed) haptic(10); }
  }, { passive: false });

  const end = async () => {
    if (!active) return;
    active = false;
    if (!armed) return reset();
    busy = true;
    ind.classList.remove('armed'); ind.classList.add('loading');
    ind.style.transition = 'transform .2s var(--ease)'; show(THRESHOLD * .85);
    live.textContent = 'Atualizando';
    let reloadPage = true;
    try { reloadPage = (await onRefresh?.()) !== false; } catch { /* recarrega mesmo assim */ }
    if (reloadPage) { location.reload(); return; }
    busy = false; live.textContent = 'Atualizado'; reset();
  };
  addEventListener('touchend', end);
  addEventListener('touchcancel', () => { if (active) { active = false; reset(); } });
}
