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
import { lockScreen, newPasswordSheet, afterLogin } from './ui/account.js';

const root = document.getElementById('app');
const TABS = [
  { id: 'hoje', label: 'Hoje', icon: 'today', screen: todayScreen },
  { id: 'registrar', label: 'Registrar', icon: 'log', screen: logScreen },
  { id: 'liquidos', label: 'Líquidos', icon: 'drop', screen: liquidsScreen },
  { id: 'progresso', label: 'Progresso', icon: 'progress', screen: progressScreen },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings', screen: settingsScreen },
];

let shell = null, lastTab = null, onboardingOpen = false;

function buildShell() {
  const main = h('main.main', { id: 'conteudo', tabindex: '-1' });
  const nav = h('nav.nav', { 'aria-label': 'Principal' },
    h('div.brand', h('span.brand-mark', { 'aria-hidden': 'true' }), h('span.brand-name', 'Leve')),
    h('div.nav-items', TABS.map(t => h('button.nav-item', { 'data-tab': t.id, onclick: () => go(t.id, (t.id === 'hoje' || t.id === 'liquidos') && ui.tab === t.id ? { date: todayISO() } : {}) }, icon(t.icon), h('span', t.label)))),
    h('p.nav-foot', 'Seus dados ficam só neste aparelho.'));
  root.replaceChildren(h('a.skip', { href: '#conteudo' }, 'Pular para o conteúdo'), nav, main);
  return { main, nav };
}

function render() {
  if (!state.profile) {
    shell = null; lastTab = null;
    if (!onboardingOpen) { onboardingOpen = true; ui.tab = 'hoje'; ui.date = todayISO(); onboarding(root); }
    return;
  }
  onboardingOpen = false;
  shell ??= buildShell();
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
  shell.main.replaceChildren(node);
  document.scrollingElement.scrollTop = scroll;
  if (refocus) { const el = shell.main.querySelector(refocus.sel); el?.focus(); try { el?.setSelectionRange(refocus.pos, refocus.pos); } catch { /* tipo sem seleção */ } }
  document.title = `${tab.label} | Leve`;
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
  if (!auth.configured()) return open();
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
  if (auth.restorePlain()) { open(); sync.start(); return; }
  open();
}

function open() {
  shell = null; lastTab = null;
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  setNavigator(render);
  subscribe(render);
  auth.onAuth(() => { if (state.profile) render(); });
  render();
  // Pede ao navegador para não apagar os dados sob pressão de espaço.
  navigator.storage?.persist?.().catch(() => {});
}

start();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
