// Regras da sincronização, sem rede nem banco. Vale a mudança mais recente (por registro).

export const SYNCED = ['kv', 'entries', 'weights', 'foods', 'templates', 'drinks'];
export const rid = (store, key) => `${store}|${key}`;

/** Um registro vindo da nuvem deve sobrescrever o deste aparelho? */
export function shouldApply(local, remote) {
  if (!local) return true;
  if (remote.updated_at > local.ts) return true;
  return false;
}

/** Junta mudanças locais na fila: a última mudança de cada registro vale. */
export function enqueue(stamps, changes, now) {
  const out = { ...stamps };
  let t = now;
  for (const c of changes) {
    const id = rid(c.store, c.key);
    t = Math.max(t, (out[id]?.ts ?? 0) + 1);
    out[id] = { id, store: c.store, key: String(c.key), ts: t, dirty: true, deleted: !!c.deleted };
  }
  return out;
}

/** Linhas para enviar à nuvem a partir da fila e dos valores atuais. */
export function pushRows(dirty, valueOf) {
  return dirty.map(s => {
    const value = s.deleted ? null : valueOf(s);
    return { store: s.store, key: s.key, value: value ?? null, deleted: s.deleted || value == null, updated_at: s.ts };
  });
}

/** Mensagens do Supabase Auth em português. */
export function authMessage(err) {
  const code = err?.code ?? err?.error_code ?? err?.error ?? '';
  const msg = String(err?.msg ?? err?.message ?? err?.error_description ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'Confirme o seu e-mail pelo link que enviamos antes de entrar.';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'Já existe uma conta com este e-mail. Use “Entrar”.';
  if (code === 'weak_password' || msg.includes('password should')) return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit')) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (code === 'validation_failed' || msg.includes('invalid format') || msg.includes('unable to validate email')) return 'Este e-mail não parece válido.';
  if (code === 'network') return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  return 'Não deu certo. Tente de novo em instantes.';
}
