// Atualização automática: cada publicação grava um version.json com a sua versão. O app guarda a
// versão com que abriu e confere de novo ao voltar para a tela e a cada 5 minutos; se mudou,
// recarrega sozinho. Espera um momento seguro: sem janela aberta e sem texto pela metade num campo.
let opened = null, pending = false, timer = null;

async function published() {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json())?.v ?? null;
  } catch { return null; }   // sem internet ou rodando localmente, sem o arquivo
}

// Seguro: nenhuma janela ou menu aberto e nenhum campo com texto sendo digitado.
const typing = () => { const el = document.activeElement?.closest?.('input, textarea, [contenteditable]'); return !!el && !!(el.value ?? el.textContent)?.trim(); };
const safe = () => !document.querySelector('.backdrop, .popover, .ptr.loading') && !typing();

async function apply() {
  clearTimeout(timer);
  if (!pending) return;
  if (!safe()) { timer = setTimeout(apply, 4000); return; }
  pending = false;
  await navigator.serviceWorker?.getRegistration?.().then(r => r?.update()).catch(() => {});
  location.reload();
}

async function check() {
  const v = await published();
  if (!v) return;
  if (!opened) { opened = v; return; }
  if (v !== opened) { pending = true; apply(); }
}

export function startUpdateChecks() {
  check();
  setInterval(check, 5 * 60_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  addEventListener('online', check);
}
