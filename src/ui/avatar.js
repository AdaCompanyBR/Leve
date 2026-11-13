// Foto de perfil: círculo com a foto (ou as iniciais) e a janela para escolher, tirar ou remover.
// A imagem é recortada no centro em quadrado e reduzida para 320 px antes de ser guardada.
import { h, icon, toast, openSheet } from './dom.js';
import { state, saveAvatar } from '../store.js';

const SIZE = 320, MAX_BYTES = 25 * 1024 * 1024;

export const initials = name => (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/** Círculo da foto. Com `onclick`, vira botão com o selo da câmera. */
export function avatar({ size = 64, onclick } = {}) {
  const pic = state.avatar ? h('img', { src: state.avatar, alt: '' }) : h('span.avatar-initials', initials(state.profile?.name));
  const attrs = { style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * .36) + 'px' } };
  if (!onclick) return h('span.avatar', attrs, pic);
  return h('button.avatar.editable', { ...attrs, type: 'button', onclick, 'aria-label': state.avatar ? 'Trocar a foto de perfil' : 'Adicionar foto de perfil' },
    pic, h('span.avatar-badge', { 'aria-hidden': 'true' }, icon(state.avatar ? 'pencil' : 'plus')));
}

async function decode(file) {
  if ('createImageBitmap' in window) { try { return await createImageBitmap(file); } catch { /* tenta pelo <img> */ } }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

/** Recorta o centro em quadrado, reduz e devolve um JPEG em data URL. */
export async function processPhoto(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  if (file.size > MAX_BYTES) throw new Error('A imagem é grande demais. Escolha uma de até 25 MB.');
  let img;
  try { img = await decode(file); } catch { throw new Error('Não deu para abrir essa imagem. Tente outra foto.'); }
  const w = img.width, hgt = img.height, side = Math.min(w, hgt);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - side) / 2, (hgt - side) / 2, side, side, 0, 0, SIZE, SIZE);
  img.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function avatarSheet() {
  const pick = capture => {
    const input = h('input', { type: 'file', accept: 'image/*', hidden: true, ...(capture ? { capture: 'user' } : {}) });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      try { await saveAvatar(await processPhoto(file)); sheet.close(); toast('Foto de perfil atualizada'); }
      catch (err) { toast(err.message); }
    });
    document.body.append(input);
    input.click();
  };
  const touch = matchMedia('(pointer: coarse)').matches;
  const sheet = openSheet({ title: 'Foto de perfil', content: [
    h('div.avatar-preview', avatar({ size: 120 })),
    h('div.avatar-actions',
      h('button.btn.primary.block', { type: 'button', onclick: () => pick(false) }, state.avatar ? 'Escolher outra foto' : 'Escolher foto'),
      touch ? h('button.btn.secondary.block', { type: 'button', onclick: () => pick(true) }, 'Tirar foto') : null,
      state.avatar ? h('button.btn.plain.danger.block', { type: 'button', onclick: async () => { await saveAvatar(null); sheet.close(); toast('Foto removida'); } }, 'Remover foto') : null),
    h('p.fine', 'A foto é recortada em quadrado e reduzida antes de ser guardada. Com conta, ela sincroniza entre os seus aparelhos.'),
  ] });
  return sheet;
}
