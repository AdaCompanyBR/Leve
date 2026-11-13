// Leve: casca do app, navegação e registro do service worker.
import { h, icon } from './ui/dom.js';
import { state, load, subscribe } from './store.js';
import { ui, setNavigator, go } from './ui/state.js';
import { onboarding } from './ui/onboarding.js';
import { todayScreen } from './ui/today.js';
import { logScreen } from './ui/log.js';
import { liquidsScreen } from './ui/liquids.js';
import { progressScreen } from './ui/progress.js';
import { settingsScreen, applyTheme } from './ui/settings.js';
import { todayISO } from './lib/dates.js';
import { reload } from './store.js';
import * as auth from './auth.js';
import * as bio from './biometric.js';
import * as sync from './sync.js';
import * as share from './share.js';
import { toast } from './ui/dom.js';
import { captureInvite, checkInvite } from './ui/friends.js';
import { initPullToRefresh } from './ui/pull.js';

// Link de convite (#convite=...): guarda o código antes de o app limpar o endereço.
captureInvite();
import { lockScreen, newPasswordSheet, afterLogin, logoutSheet, authScreen, localMode, goToLogin, welcomeScreen, welcomed } from './ui/account.js';

const root = document.getElementById('app');
// Telas e grupos da navegação. `side`: só na barra lateral do computador (no celular, o botão + abre Registrar).
const TABS = [
  { id: 'hoje', label: 'Hoje', icon: 'today', screen: todayScreen, group: 'Diário' },
  { id: 'registrar', label: 'Registrar', icon: 'fork', screen: logScreen, group: 'Diário', side: true },
  { id: 'liquidos', label: 'Líquidos', icon: 'drop', screen: liquidsScreen, group: 'Diário' },
  { id: 'progresso', label: 'Progresso', icon: 'progress', screen: progressScreen, group: 'Acompanhar' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings', screen: settingsScreen, group: 'Conta' },
];
const SIDE_KEY = 'leve-sidebar';

let shell = null, lastTab = null, onboardingOpen = false;

function setCollapsed(on) {
  document.documentElement.classList.toggle('side-collapsed', on);
  try { localStorage.setItem(SIDE_KEY, on ? 'collapsed' : 'open'); } catch { /* bloqueado */ }
  shell?.nav.querySelector('.nav-collapse')?.setAttribute('aria-label', on ? 'Mostrar a barra lateral' : 'Recolher a barra lateral');
}

function buildShell() {
  try { document.documentElement.classList.toggle('side-collapsed', localStorage.getItem(SIDE_KEY) === 'collapsed'); } catch { /* bloqueado */ }
  const main = h('main.main', { id: 'conteudo', tabindex: '-1' });
  const items = [];
  let group = null;
  for (const t of TABS) {
    if (t.group !== group) { group = t.group; items.push(h('span.nav-group-label', { 'aria-hidden': 'true' }, group)); }
    items.push(h('button.nav-item' + (t.side ? '.only-side' : ''), { type: 'button', 'data-tab': t.id, title: t.label,
      onclick: () => go(t.id, (t.id === 'hoje' || t.id === 'liquidos') && ui.tab === t.id ? { date: todayISO() } : {}) }, icon(t.icon), h('span', t.label)));
  }
  const collapsed = document.documentElement.classList.contains('side-collapsed');
  const nav = h('nav.nav', { 'aria-label': 'Principal' },
    h('div.nav-top',
      h('div.brand', h('span.brand-mark', { 'aria-hidden': 'true' }), h('span.brand-name', 'Leve')),
      h('button.icon-btn.nav-collapse', { type: 'button', 'aria-label': collapsed ? 'Mostrar a barra lateral' : 'Recolher a barra lateral',
        onclick: () => setCollapsed(!document.documentElement.classList.contains('side-collapsed')) }, icon('sidebar'))),
    h('div.nav-items', items),
    h('div.nav-foot'));
  const fab = h('button.fab', { type: 'button', 'aria-label': 'Registrar comida', onclick: () => go('registrar', { meal: null }) }, icon('plus'));
  root.replaceChildren(h('a.skip', { href: '#conteudo' }, 'Pular para o conteúdo'), nav, main, fab);
  // Cabeçalho de vidro: o título pequeno aparece quando o título grande sai da tela.
  addEventListener('scroll', paintTopbar, { passive: true });
  return { main, nav, fab };
}

function paintTopbar() {
  const bar = shell?.main.querySelector('.topbar'), big = shell?.main.querySelector('.screen-head h1');
  if (!bar || !big) return;
  bar.classList.toggle('scrolled', big.getBoundingClientRect().bottom < bar.offsetHeight);
}

/** Rodapé do menu: entrar ou sair da conta. */
function paintAccount(foot) {
  if (!auth.configured()) return foot.replaceChildren(h('p', 'Seus dados ficam só neste aparelho.'));
  const s = auth.current();
  foot.replaceChildren(s
    ? h('div.nav-account',
      h('span.nav-account-label', 'Conectado como'),
      h('span.nav-account-email', { title: s.user?.email ?? '' }, s.user?.email ?? 'sua conta'),
      h('button.nav-item.nav-logout', { type: 'button', onclick: logoutSheet }, icon('logout'), h('span', 'Sair')))
    : h('div.nav-account',
      h('p', 'Seus dados estão só neste aparelho.'),
      h('button.btn.primary.compact.nav-login', { type: 'button', onclick: () => goToLogin('entrar') }, 'Entrar')));
}

function render() {
  if (!state.profile) {
    shell = null; lastTab = null;
    if (!onboardingOpen) { onboardingOpen = true; ui.tab = 'hoje'; ui.date = todayISO(); onboarding(root); }
    return;
  }
  onboardingOpen = false;
  shell ??= buildShell();
  paintAccount(shell.nav.querySelector('.nav-foot'));
  const tab = TABS.find(t => t.id === ui.tab) ?? TABS[0];
  shell.nav.querySelectorAll('.nav-item').forEach(b => { const on = b.dataset.tab === tab.id; b.classList.toggle('active', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  const changed = lastTab !== tab.id;
  const scroll = changed ? 0 : shell.main.scrollTop || document.scrollingElement.scrollTop;
  // Mantém o foco em campos da tela ao redesenhar (ex.: busca)
  const active = document.activeElement;
  const refocus = !changed && shell.main.contains(active) && active.matches('.log-input') ? { sel: '.log-input', pos: active.selectionStart } : null;
  let node;
  try { node = tab.screen(); }
  catch (err) { console.error(err); node = errorState('Esta tela não abriu.', 'Seus dados continuam salvos. Tente de novo ou volte para Hoje.'); }
  node.classList.toggle('enter', changed);
  const title = node.querySelector('.screen-head h1')?.textContent ?? tab.label;
  shell.main.replaceChildren(h('div.topbar', { 'aria-hidden': 'true' }, h('span.topbar-title', title)), node);
  // O Líquidos tem o seu próprio + no centro da tela.
  shell.fab.hidden = tab.id === 'registrar' || tab.id === 'liquidos';
  document.scrollingElement.scrollTop = scroll;
  if (refocus) { const el = shell.main.querySelector(refocus.sel); el?.focus(); try { el?.setSelectionRange(refocus.pos, refocus.pos); } catch { /* tipo sem seleção */ } }
  document.title = `${tab.label} | Leve`;
  paintTopbar();
  lastTab = tab.id;
}

function errorState(title, text) {
  return h('div.screen', h('div.card.empty', h('p.empty-title', title), h('p.empty-text', text),
    h('div.empty-actions', h('button.btn.primary', { onclick: () => location.reload() }, 'Tentar de novo'))));
}

async function start() {
  root.replaceChildren(h('div.boot', { role: 'status', 'aria-label': 'Carregando' }, h('span.boot-ring')));
  try { await load(); }
  catch (err) {
    console.error(err);
    root.replaceChildren(h('div.boot-error', errorState('O Leve não conseguiu abrir os dados.',
      'Pode ser o modo de navegação privada, que bloqueia o armazenamento, ou a primeira abertura sem internet. Abra em uma janela normal, com conexão, e tente de novo.')));
    return;
  }
  sync.setReloader(async () => { await reload(); applyTheme(); });
  applyTheme();
  if (!auth.configured()) { if (/^#(entrar|criar-conta)$/.test(location.hash)) history.replaceState(null, '', location.pathname); return open(); }
  // Links do e-mail (confirmar conta, trocar senha) chegam com a sessão no endereço.
  const redirect = auth.fromRedirect();
  if (redirect) {
    open();
    if (redirect.type === 'recovery') newPasswordSheet();
    await afterLogin({ quiet: redirect.type === 'recovery' });
    return;
  }
  // Face ID ligado: nada aparece antes do rosto ou da digital.
  if (bio.enabled()) return lockScreen(root, () => { open(); sync.start(); });
  if (auth.restorePlain()) { history.replaceState(null, '', location.pathname); open(); sync.start(); return; }
  // Sem conta conectada: tela de login, a não ser que a pessoa tenha escolhido usar sem conta.
  // Vindo da landing, "Criar conta" já abre na aba certa.
  const want = { '#entrar': 'entrar', '#criar-conta': 'criar' }[location.hash];
  if (want) history.replaceState(null, '', location.pathname + location.search);
  if (want) return authScreen(root, { mode: want, onEnter: open });
  if (!localMode()) return welcomed() ? authScreen(root, { mode: 'entrar', onEnter: open }) : welcomeScreen(root, () => authScreen(root, { mode: 'entrar', onEnter: open }));
  open();
}

// Atalho de busca: "/" ou Cmd/Ctrl+K abre Registrar com a busca em foco.
addEventListener('keydown', e => {
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if (!shell || document.querySelector('.backdrop')) return;
  if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault();
    if (ui.tab !== 'registrar') go('registrar', { meal: null });
    setTimeout(() => shell?.main.querySelector('.log-input')?.focus(), 0);
  }
});

// Já dentro do app, um link para #entrar ou #criar-conta abre a conta numa sheet.
addEventListener('hashchange', () => {
  if (captureInvite()) { if (shell) checkInvite(); return; }
  const want = { '#entrar': 'entrar', '#criar-conta': 'criar' }[location.hash];
  if (!want || !auth.configured()) return;
  if (!auth.current()) goToLogin(want); else history.replaceState(null, '', location.pathname + location.search);
});

function open() {
  shell = null; lastTab = null;
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  setNavigator(render);
  subscribe(render);
  auth.onAuth(() => {
    if (state.profile) render(); else if (shell) paintAccount(shell.nav.querySelector('.nav-foot'));
    // Compartilhamento acompanha a sessão; um convite pendente é oferecido depois de entrar.
    if (auth.current()) { share.start(); setTimeout(() => state.profile && checkInvite(), 600); } else share.stop();
  });
  share.setNotifier(msg => toast(msg));
  render();
  share.start();
  setTimeout(() => state.profile && checkInvite(), 600);
  // Pede ao navegador para não apagar os dados sob pressão de espaço.
  navigator.storage?.persist?.().catch(() => {});
}

start();

// Puxar para atualizar: envia o que estiver pendente e recarrega. Com Face ID ligado, recarregar
// pediria o rosto de novo, então só sincroniza e redesenha.
initPullToRefresh({ onRefresh: async () => {
  const wait = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  await wait(Promise.all([sync.syncNow(), navigator.serviceWorker?.getRegistration?.().then(r => r?.update())]).catch(() => {}), 4000);
  if (bio.enabled() && auth.current()) { await wait(share.refresh(), 3000); if (shell) render(); return false; }
  return true;
} });

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
