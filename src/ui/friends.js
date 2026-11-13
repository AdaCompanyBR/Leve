// Amigos na aba Líquidos: cartão com você e quem compartilha com você, tela "Compartilhamento",
// convite por link, aceite e gerenciamento (quem vê você, quem você vê, avisos e cutucadas).
import { h, icon, int, toast, openSheet, busy, confirmSheet } from './dom.js';
import { state, saveSettings, liquidsOn, waterGoalOn, bodyStyle } from '../store.js';
import { todayISO } from '../lib/dates.js';
import { miniFigure } from './body.js';
import { goToLogin } from './account.js';
import * as sh from '../share.js';

const INVITE = 'leve-invite';
const stash = { get: () => { try { return localStorage.getItem(INVITE); } catch { return null; } }, set: v => { try { v ? localStorage.setItem(INVITE, v) : localStorage.removeItem(INVITE); } catch { /* sem armazenamento */ } } };

/** Guarda o código de um link #convite=... antes de o app limpar o endereço. */
export function captureInvite() {
  const m = location.hash.match(/^#convite=([A-Za-z0-9]{8,32})$/);
  if (!m) return false;
  stash.set(m[1]);
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

// ---------------------------------------------------------------------------

function meCard() {
  const today = todayISO();
  return { id: 'me', name: state.profile?.name || 'Você', body: bodyStyle(), ml: liquidsOn(today).total, goal: waterGoalOn(today), me: true };
}

/** Linha de uma pessoa: figura pequena, nome, ml e % e a barra. */
function personRow(p, { big = false } = {}) {
  const pct = Math.round((p.ml / p.goal) * 100), left = p.goal - p.ml, met = p.ml >= p.goal;
  const actions = !p.me && big && p.allowPokes
    ? h('button.btn.tonal.poke-btn', { type: 'button', onclick: e => busy(e.currentTarget, async () => {
      try { await sh.poke(p.id, met ? 'aplauso' : 'cutucada'); toast(met ? `Aplauso enviado para ${p.name}` : `Cutucada enviada para ${p.name}`); }
      catch (err) { toast(err.message); }
    }) }, met ? 'Aplaudir' : 'Cutucar') : null;
  return h('div.person-row' + (big ? '.big' : ''),
    h('div.person-fig', miniFigure({ style: p.body, level: p.ml / p.goal })),
    h('div.person-info',
      h('p.person-name', p.me ? `${p.name} (Eu)` : p.name),
      h('p.person-amount', h('b', `${int(p.ml)} ml`), ` · ${pct}%`),
      h('div.person-bar', { role: 'progressbar', 'aria-label': `Líquidos de ${p.name}`, 'aria-valuemin': 0, 'aria-valuemax': p.goal, 'aria-valuenow': Math.min(p.ml, p.goal) },
        h('span', { style: { width: `${Math.min(100, pct)}%` } })),
      big ? h('p.person-left' + (met ? '.done' : ''), met ? 'Meta atingida' : `Faltam ${int(left)} ml`) : null,
      big && p.me ? h('p.person-note', icon('eye'), 'Quem você convidar vai ver isso') : null,
      big && !p.me && !p.fresh ? h('p.person-note', 'Ainda sem registros hoje') : null),
    actions);
}

const placeholderRow = () => h('div.person-row.placeholder',
  h('div.person-fig.empty', icon('plus')),
  h('p.person-name.muted', 'Seu amigo aqui'),
  h('button.btn.tonal.poke-btn', { type: 'button', onclick: e => { e.stopPropagation(); inviteSheet(); } }, 'Convidar'));

// ---------------------------------------------------------------------------
// Cartão da aba Líquidos.

export function friendsCard() {
  if (!sh.available()) return null;
  const body = h('div.friends-body');
  const card = h('section.card.friends-card', { 'aria-label': 'Amigos' },
    h('div.card-head', h('h3', 'Amigos'), sh.signedIn() ? h('button.link.inline.friends-more', { type: 'button', onclick: () => friendsScreen() }, 'Ver tudo', icon('next')) : null),
    body);
  const paint = () => {
    if (!sh.signedIn()) {
      body.replaceChildren(h('p.card-sub', 'Compartilhe o seu progresso de líquidos com amigos e acompanhe o deles. Para isso, entre na sua conta.'),
        h('button.btn.tonal.block', { type: 'button', onclick: () => goToLogin('entrar') }, 'Entrar'));
      return;
    }
    if (sh.share.missing) { body.replaceChildren(h('p.card-sub', 'O compartilhamento ainda não foi ativado no servidor.')); return; }
    const rows = [personRow(meCard()), ...sh.share.friends.map(f => personRow(f))];
    if (!sh.share.friends.length) rows.push(placeholderRow());
    body.replaceChildren(h('button.friends-open', { type: 'button', 'aria-label': 'Abrir compartilhamento', onclick: () => friendsScreen() }), ...rows);
  };
  paint();
  const off = sh.onShare(() => { if (!card.isConnected) return off(); paint(); });
  return card;
}

// ---------------------------------------------------------------------------
// Tela "Compartilhamento".

export function friendsScreen() {
  const list = h('div.friends-list');
  const paint = () => {
    const rows = [personRow(meCard(), { big: true }), ...sh.share.friends.map(f => personRow(f, { big: true }))];
    if (!sh.share.friends.length) rows.push(placeholderRow());
    list.replaceChildren(...rows);
  };
  paint();
  const off = sh.onShare(paint);
  sh.refresh();
  return openSheet({
    title: 'Compartilhamento', wide: true, onClose: off,
    content: [
      h('div.friends-head', h('div', h('h3', 'Mantenham-se hidratados juntos'), h('p.card-sub', 'O progresso de hoje de quem compartilha com você.')), h('span.friends-day', 'Hoje')),
      list,
      h('button.btn.primary.block', { type: 'button', onclick: () => inviteSheet() }, 'Compartilhe seu progresso'),
      h('p.fine', 'Quem você convidar vê seu nome, sua meta e quanto você bebeu no dia. Não vê cada bebida nem o diário de comida. Quando essas pessoas compartilharem o progresso delas, ele aparece aqui.'),
      h('button.btn.secondary.block', { type: 'button', onclick: () => manageSheet() }, icon('settings'), 'Gerenciar compartilhamento'),
    ],
  });
}

// ---------------------------------------------------------------------------
// Convite: um link que vale 7 dias.

export function inviteSheet() {
  const box = h('div.invite-box', h('p.sheet-text', 'Criando o link…'));
  const sheet = openSheet({ title: 'Convidar', content: [h('p.sheet-text', 'Envie este link para quem você quer que acompanhe o seu progresso de líquidos. Ele vale por 7 dias e pode ser usado por mais de uma pessoa.'), box] });
  sh.createInvite().then(link => {
    const field = h('input.invite-link', { type: 'text', readonly: true, value: link, 'aria-label': 'Link do convite', onfocus: e => e.target.select() });
    const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Link copiado'); } catch { field.focus(); field.select(); toast('Selecione e copie o link'); } };
    box.replaceChildren(field, h('div.sheet-actions',
      navigator.share ? h('button.btn.primary', { type: 'button', onclick: () => navigator.share({ title: 'Leve', text: `${state.profile?.name || 'Eu'} quer compartilhar o progresso de líquidos com você no Leve.`, url: link }).catch(() => {}) }, 'Compartilhar') : null,
      h('button.btn.secondary', { type: 'button', onclick: copy }, 'Copiar link')));
  }).catch(err => box.replaceChildren(h('p.sheet-text.error', err.message)));
  return sheet;
}

// ---------------------------------------------------------------------------
// Gerenciar: quem vê você, quem você vê, avisos e cutucadas.

const sw = (label, on, change) => h('button.switch', { type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': label, onclick: e => {
  const next = e.currentTarget.getAttribute('aria-checked') !== 'true';
  e.currentTarget.setAttribute('aria-checked', String(next)); change(next);
} }, h('span'));
const row = (label, control, hint) => h('div.set-row', h('div.set-label', h('span', label), hint ? h('span.set-hint', hint) : null), control);

export function manageSheet() {
  const body = h('div.manage');
  const paint = () => {
    const mine = sh.share.sharingWith, theirs = sh.share.friends;
    body.replaceChildren(
      h('section.set-card', h('h3', 'Você está compartilhando com'),
        mine.length ? h('div.set-rows', mine.map(p => row(p.name, h('button.btn.plain.compact.danger', { type: 'button', onclick: () => confirmSheet({
          title: `Parar de compartilhar com ${p.name}?`, message: `${p.name} deixa de ver o seu progresso. Dá para convidar de novo depois.`, confirmLabel: 'Parar',
          onConfirm: async () => { try { await sh.stopSharingWith(p.id); toast('Compartilhamento encerrado'); } catch (err) { toast(err.message); } } }) }, 'Parar'))))
          : h('p.manage-empty', 'Ninguém vê o seu progresso ainda.'),
        h('button.btn.primary.block', { type: 'button', onclick: () => inviteSheet() }, 'Compartilhar meu progresso')),
      h('section.set-card', h('h3', 'Compartilhando com você'),
        theirs.length ? h('div.set-rows', theirs.map(p => row(p.name, h('button.btn.plain.compact.danger', { type: 'button', onclick: () => confirmSheet({
          title: `Remover ${p.name}?`, message: `Você deixa de ver o progresso de ${p.name}.`, confirmLabel: 'Remover',
          onConfirm: async () => { try { await sh.stopSeeing(p.id); toast('Removido'); } catch (err) { toast(err.message); } } }) }, 'Remover'))))
          : h('p.manage-empty', 'Ninguém compartilhou o progresso com você ainda. Peça para um amigo enviar um convite.')),
      h('section.set-card', h('h3', 'Avisos'),
        h('div.set-rows', row('Avisar quando um amigo bater a meta', sw('Avisar quando um amigo bater a meta', state.settings.shareNotify !== false, v => saveSettings({ shareNotify: v })))),
        h('p.card-sub', 'O aviso aparece no app, uma vez por dia por amigo.')),
      h('section.set-card', h('h3', 'Cutucadas'),
        h('div.set-rows', row('Permitir cutucadas e aplausos', sw('Permitir cutucadas e aplausos', state.settings.allowPokes !== false, async v => { await saveSettings({ allowPokes: v }); sh.publish(true).catch(() => {}); }))),
        h('p.card-sub', 'Quem vê o seu progresso pode te cutucar quando você ficar para trás, ou aplaudir quando bater a meta, até 3 vezes por dia por pessoa.')));
  };
  paint();
  const off = sh.onShare(paint);
  return openSheet({ title: 'Gerenciar compartilhamento', wide: true, onClose: off, content: body });
}

// ---------------------------------------------------------------------------
// Aceitar um convite recebido por link.

let checking = false;
export async function checkInvite() {
  const code = stash.get();
  if (!code || checking || document.querySelector('.backdrop')) return;
  if (!sh.signedIn()) {
    const sheet = openSheet({ title: 'Convite', content: [
      h('p.sheet-text', 'Você recebeu um convite para acompanhar o progresso de líquidos de um amigo. Para aceitar, entre na sua conta ou crie uma.'),
      h('div.sheet-actions', h('button.btn.secondary', { type: 'button', onclick: () => sheet.close() }, 'Agora não'), h('button.btn.primary', { type: 'button', onclick: () => goToLogin('entrar') }, 'Entrar')),
    ] });
    return;
  }
  checking = true;
  try {
    const info = await sh.inviteInfo(code);
    if (!info || !info.valid) { stash.set(null); toast('Este convite venceu ou não existe mais. Peça um link novo.'); return; }
    if (info.mine) { stash.set(null); toast('Este convite é seu. Envie o link para outra pessoa.'); return; }
    const name = info.owner_name || 'Um amigo';
    let back = true;
    const sheet = openSheet({
      title: 'Convite', cancel: 'Agora não', onClose: () => stash.set(null),
      action: { label: 'Aceitar', run: async () => {
        try { await sh.acceptInvite(code, back); stash.set(null); sheet.close(); toast(`Agora você acompanha ${name}`); }
        catch (err) { toast(err.message); }
      } },
      content: [
        h('p.sheet-text', `${name} quer compartilhar o progresso de líquidos com você. Você vai ver o quanto ${name} bebeu no dia e a meta.`),
        h('div.set-rows.invite-back', row('Compartilhar o meu de volta', sw('Compartilhar o meu de volta', true, v => { back = v; }), `${name} passa a ver o seu nome, a sua meta e quanto você bebeu no dia.`)),
      ],
    });
  } catch (err) {
    toast(err.message);
  } finally { checking = false; }
}
