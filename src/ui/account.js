// Telas da conta: entrar, criar conta, esqueci a senha, nova senha, trava do Face ID e o cartão em Ajustes.
import { h, icon, openSheet, field, toast, segmented } from './dom.js';
import * as auth from '../auth.js';
import * as bio from '../biometric.js';
import * as sync from '../sync.js';
import { wipe } from '../store.js';

const MIN_PASSWORD = 8;
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function passwordInput(autocomplete) {
  const input = h('input', { type: 'password', autocomplete, minlength: MIN_PASSWORD, required: true });
  const toggle = h('button.pw-toggle', { type: 'button', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false', onclick: () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Esconder senha' : 'Mostrar senha');
    toggle.textContent = show ? 'Esconder' : 'Mostrar';
  } }, 'Mostrar');
  return { input, wrap: h('div.pw-wrap', input, toggle) };
}
const pwField = (label, pw, hint) => {
  const f = field(label, pw.input, hint);
  f.replaceChild(pw.wrap, pw.input);
  pw.wrap.prepend(pw.input); // field() tirou o campo de dentro do wrap
  return f;
};

/** Depois de entrar: liga a sincronização e oferece o Face ID. */
export async function afterLogin({ quiet } = {}) {
  await sync.start();
  if (!quiet) toast(`Conectado como ${auth.userEmail()}`);
  if (!bio.enabled() && await bio.available()) setTimeout(offerBiometric, quiet ? 0 : 600);
}

/** Entrar ou criar conta. */
export function loginSheet({ mode = 'entrar', onDone } = {}) {
  let m = mode;
  const email = h('input', { type: 'email', autocomplete: 'username', inputmode: 'email', autocapitalize: 'none', spellcheck: false, required: true, autofocus: true });
  const pw = passwordInput(m === 'criar' ? 'new-password' : 'current-password');
  const pw2 = passwordInput('new-password');
  const err = h('p.ob-err', { role: 'alert' });
  const submit = h('button.btn.primary.block', { type: 'submit' });
  const extra = h('div');

  const tabs = segmented([{ id: 'entrar', label: 'Entrar' }, { id: 'criar', label: 'Criar conta' }], m, id => { m = id; err.textContent = ''; paint(); }, 'Entrar ou criar conta');
  function paint() {
    pw.input.autocomplete = m === 'criar' ? 'new-password' : 'current-password';
    submit.textContent = m === 'criar' ? 'Criar conta' : 'Entrar';
    extra.replaceChildren(m === 'criar'
      ? pwField('Repita a senha', pw2)
      : h('button.link.forgot', { type: 'button', onclick: () => { sheet.close(); setTimeout(() => recoverSheet(email.value), 280); } }, 'Esqueci a senha'));
    pwHint.textContent = m === 'criar' ? `Pelo menos ${MIN_PASSWORD} caracteres.` : '';
  }
  const pwHint = h('p.field-hint');

  async function go(e) {
    e.preventDefault();
    err.textContent = '';
    if (!emailOk(email.value)) { err.textContent = 'Digite um e-mail válido.'; return email.focus(); }
    if (pw.input.value.length < MIN_PASSWORD) { err.textContent = `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`; return pw.input.focus(); }
    if (m === 'criar' && pw.input.value !== pw2.input.value) { err.textContent = 'As senhas não são iguais.'; return pw2.input.focus(); }
    submit.disabled = true; submit.textContent = m === 'criar' ? 'Criando…' : 'Entrando…';
    try {
      if (m === 'criar') {
        const r = await auth.signUp(email.value, pw.input.value);
        if (r.confirm) {
          sheet.close();
          openSheet({ title: 'Confirme o seu e-mail', content: [
            h('p.sheet-text', `Enviamos um link para ${email.value.trim()}. Abra o e-mail neste aparelho e toque no link para ativar a conta. Depois é só entrar.`),
          ] });
          return;
        }
      } else {
        await auth.signIn(email.value, pw.input.value);
      }
      sheet.close();
      await afterLogin();
      onDone?.();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      submit.disabled = false; paint();
    }
  }

  const sheet = openSheet({
    title: 'Sua conta do Leve',
    content: h('form.auth-form', { onsubmit: go, novalidate: true },
      h('p.sheet-text', 'Com a conta, seus dados ficam guardados na nuvem e aparecem no celular e no computador.'),
      tabs,
      field('E-mail', email),
      pwField('Senha', pw), pwHint,
      extra, err, submit),
  });
  paint();
  return sheet;
}

export function recoverSheet(prefill = '') {
  const email = h('input', { type: 'email', autocomplete: 'username', inputmode: 'email', autocapitalize: 'none', value: prefill, required: true, autofocus: true });
  const err = h('p.ob-err', { role: 'alert' });
  const sheet = openSheet({
    title: 'Esqueci a senha',
    content: h('form', { novalidate: true, onsubmit: async e => {
      e.preventDefault();
      if (!emailOk(email.value)) { err.textContent = 'Digite um e-mail válido.'; return; }
      try {
        await auth.recover(email.value);
        sheet.close();
        toast('Se houver conta com este e-mail, o link para criar uma nova senha chega em instantes.');
      } catch (ex) { err.textContent = ex.message; }
    } },
      h('p.sheet-text', 'Enviamos um link para você criar uma nova senha. Abra o e-mail neste aparelho.'),
      field('E-mail', email), err,
      h('button.btn.primary.block', { type: 'submit' }, 'Enviar link')),
  });
  return sheet;
}

export function newPasswordSheet() {
  const pw = passwordInput('new-password');
  const err = h('p.ob-err', { role: 'alert' });
  const sheet = openSheet({
    title: 'Crie uma nova senha',
    content: h('form', { novalidate: true, onsubmit: async e => {
      e.preventDefault();
      if (pw.input.value.length < MIN_PASSWORD) { err.textContent = `Use pelo menos ${MIN_PASSWORD} caracteres.`; return; }
      try { await auth.setPassword(pw.input.value); sheet.close(); toast('Senha alterada'); }
      catch (ex) { err.textContent = ex.message; }
    } }, pwField('Nova senha', pw, `Pelo menos ${MIN_PASSWORD} caracteres.`), err, h('button.btn.primary.block', { type: 'submit' }, 'Salvar senha')),
  });
  setTimeout(() => pw.input.focus(), 80);
  return sheet;
}

/** Ativa o Face ID / digital para esta conta neste aparelho. */
export async function enableBiometric() {
  try {
    const { seal, prf } = await bio.enroll(auth.userEmail() ?? 'Leve');
    auth.setSealer(seal);
    toast(prf ? 'Pronto: entre com o rosto ou a digital' : 'Pronto: o app pede o rosto ou a digital ao abrir');
    return true;
  } catch (ex) {
    if (ex?.name !== 'NotAllowedError') toast('Não foi possível ativar. Confira se o aparelho tem Face ID ou digital cadastrados.');
    return false;
  }
}
export function disableBiometric() { bio.disable(); auth.setSealer(null); toast('Face ID desligado neste aparelho'); }

function offerBiometric() {
  const sheet = openSheet({ title: 'Entrar com Face ID ou digital?', content: [
    h('p.sheet-text', 'Da próxima vez, abra o Leve com o rosto ou a digital, sem digitar a senha. Dá para desligar em Ajustes.'),
    h('div.sheet-actions',
      h('button.btn.ghost', { onclick: () => sheet.close() }, 'Agora não'),
      h('button.btn.primary', { onclick: async () => { sheet.close(); await enableBiometric(); } }, icon('face'), 'Ativar')),
  ] });
}

/**
 * Tela de entrada quando o Face ID está ligado. `onUnlock` roda depois de abrir;
 * "Usar e-mail e senha" troca o Face ID pelo login normal.
 */
export function lockScreen(root, onUnlock) {
  const msg = h('p.lock-msg', { role: 'status', 'aria-live': 'polite' });
  const btn = h('button.btn.primary.block', { type: 'button', autofocus: true, onclick: tryUnlock }, icon('face'), 'Entrar com Face ID ou digital');
  async function tryUnlock() {
    btn.disabled = true; msg.textContent = '';
    try {
      const { session, seal } = await bio.unlock(auth.restorePlain);
      if (!session) throw new Error('sem sessão');
      auth.restoreUnlocked(session, seal);
      onUnlock();
    } catch (ex) {
      msg.textContent = ex?.name === 'NotAllowedError' ? 'Não confirmado. Toque para tentar de novo.' : 'Não deu para abrir com o Face ID. Entre com e-mail e senha.';
    } finally { btn.disabled = false; }
  }
  root.replaceChildren(h('div.lock',
    h('div.lock-body',
      h('span.brand-mark.lock-mark', { 'aria-hidden': 'true' }),
      h('h1', 'Leve'),
      h('p.lock-sub', 'Seus dados estão protegidos.'),
      btn, msg,
      h('button.link', { type: 'button', onclick: () => { bio.disable(); auth.forget(); loginSheet({ onDone: onUnlock }); } }, 'Usar e-mail e senha'))));
  btn.focus();
}

const ago = t => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'agora há pouco' : s < 3600 ? `há ${Math.round(s / 60)} min` : `às ${new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
function statusText(st) {
  if (st.state === 'syncing') return 'Sincronizando…';
  if (st.state === 'error') return {
    offline: `Sem internet. ${st.pending ? `${st.pending} ${st.pending === 1 ? 'mudança espera' : 'mudanças esperam'} a conexão.` : 'Tudo o que você fizer fica guardado aqui.'}`,
    schema: 'A nuvem ainda não foi preparada: rode o arquivo supabase/schema.sql no Supabase.',
    auth: 'A sessão expirou. Saia e entre de novo.',
    falha: 'A sincronização falhou. Tentamos de novo em instantes.',
  }[st.error];
  return st.last ? `Sincronizado ${ago(st.last)}.` : 'Pronto para sincronizar.';
}

/** Cartão "Conta" em Ajustes. */
export function accountCard({ row }) {
  if (!auth.configured()) {
    return h('section.card.set-card', { 'aria-label': 'Conta' }, h('h3', 'Conta'),
      h('p.card-sub', 'A conta e a sincronização entre aparelhos ainda não foram configuradas neste app. Veja “Conta e sincronização” no README do projeto.'));
  }
  const s = auth.current();
  if (!s) {
    return h('section.card.set-card.account', { 'aria-label': 'Conta' }, h('h3', 'Conta'),
      h('p.card-sub', 'Entre para guardar seus dados na nuvem e usar o Leve no celular e no computador com os mesmos registros.'),
      h('div.data-actions',
        h('button.btn.primary', { onclick: () => loginSheet({ mode: 'entrar' }) }, 'Entrar'),
        h('button.btn.tonal', { onclick: () => loginSheet({ mode: 'criar' }) }, 'Criar conta')));
  }
  const st = sync.getStatus();
  const statusEl = h('p.card-sub.sync-status', { role: 'status', 'aria-live': 'polite' }, statusText(st));
  const off = sync.onStatus(x => { if (!statusEl.isConnected) return off(); statusEl.textContent = statusText(x); });
  const bioRow = h('div');
  bio.available().then(ok => {
    if (!ok) return;
    const on = bio.enabled();
    bioRow.replaceWith(row('Entrar com Face ID ou digital',
      h('button.switch', { role: 'switch', 'aria-checked': String(on), 'aria-label': 'Entrar com Face ID ou digital', onclick: async e => {
        const btn = e.currentTarget;
        if (bio.enabled()) disableBiometric(); else await enableBiometric();
        btn.setAttribute('aria-checked', String(bio.enabled()));
      } }, h('span')),
      'Pede o rosto ou a digital ao abrir o app'));
  });
  return h('section.card.set-card.account', { 'aria-label': 'Conta' }, h('h3', 'Conta'),
    row('E-mail', h('span.account-email', s.user?.email ?? '—')),
    statusEl,
    bioRow,
    h('div.data-actions',
      h('button.btn.tonal', { onclick: () => sync.syncNow() }, 'Sincronizar agora'),
      h('button.btn.ghost', { onclick: logoutSheet }, 'Sair')));
}

function logoutSheet() {
  const pending = sync.getStatus().pending;
  const sheet = openSheet({ title: 'Sair da conta?', content: [
    h('p.sheet-text', pending
      ? `${pending} ${pending === 1 ? 'mudança ainda não subiu' : 'mudanças ainda não subiram'} para a nuvem. Conecte-se à internet antes de sair para não perdê-las.`
      : 'Seus dados continuam guardados na nuvem. Ao entrar de novo, eles voltam.'),
    h('div.logout-actions',
      h('button.btn.strong.block', { onclick: () => logout(true) }, 'Sair e apagar os dados deste aparelho'),
      h('button.btn.tonal.block', { onclick: () => logout(false) }, 'Sair e manter os dados aqui'),
      h('button.btn.ghost.block', { onclick: () => sheet.close() }, 'Cancelar')),
  ] });
  async function logout(erase) {
    await sync.syncNow();
    await sync.stop({ forgetDevice: true });
    bio.disable();
    await auth.signOut();
    sheet.close();
    if (erase) await wipe(); else toast('Você saiu da conta');
  }
}

