// Entrar com Face ID ou digital (WebAuthn, autenticador do próprio aparelho).
// Onde o navegador oferece a extensão PRF (iPhone com iOS 18+, Chrome no Android e no computador),
// a sessão da conta fica cifrada com uma chave que só sai do aparelho depois do rosto ou da digital.
// Sem PRF, o Face ID funciona como trava da tela do app: a sessão fica guardada sem cifra.
const KEY = 'leve-biometric';
const enc = new TextEncoder(), dec = new TextDecoder();
const SALT = enc.encode('leve-session-key-v1');

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rand = n => crypto.getRandomValues(new Uint8Array(n));

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* bloqueado */ } };

export const enabled = () => !!read();
export const secure = () => !!read()?.prf;

export async function available() {
  try { return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
  catch { return false; }
}

async function aesKey(prfOutput) {
  const base = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode('leve') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function assertion(credId, withPrf) {
  const cred = await navigator.credentials.get({ publicKey: {
    challenge: rand(32), timeout: 60000, userVerification: 'required',
    allowCredentials: [{ type: 'public-key', id: unb64(credId), transports: ['internal', 'hybrid'] }],
    ...(withPrf ? { extensions: { prf: { eval: { first: SALT } } } } : {}),
  } });
  if (!cred) throw new Error('cancelado');
  return cred.getClientExtensionResults?.().prf?.results?.first ?? null;
}

/** Faz uma função que cifra e guarda a sessão com a chave do Face ID. */
function sealerFor(key, credId) {
  return async session => {
    const iv = rand(12);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(session)));
    write({ credId, prf: true, iv: b64(iv), data: b64(data) });
  };
}

/**
 * Cadastra o Face ID para esta conta neste aparelho. Devolve o "sealer" (ou null sem PRF),
 * que a conta usa para guardar a sessão cifrada.
 */
export async function enroll(email) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: rand(32), timeout: 60000,
    rp: { name: 'Leve' },
    user: { id: rand(16), name: email, displayName: email },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    extensions: { prf: { eval: { first: SALT } } },
  } });
  const credId = b64(cred.rawId);
  const ext = cred.getClientExtensionResults?.().prf;
  let out = ext?.results?.first ?? null;
  if (!out && ext?.enabled) out = await assertion(credId, true).catch(() => null);
  if (out) {
    const seal = sealerFor(await aesKey(out), credId);
    return { seal, prf: true };
  }
  write({ credId, prf: false });
  return { seal: null, prf: false };
}

/** Pede o Face ID. Devolve a sessão guardada (cifrada ou não) e o sealer para guardar renovações. */
export async function unlock(readPlain) {
  const info = read();
  if (!info) throw new Error('sem cadastro');
  const out = await assertion(info.credId, info.prf);
  if (!info.prf) return { session: readPlain(), seal: null };
  if (!out) throw new Error('sem chave');
  const key = await aesKey(out);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(info.iv) }, key, unb64(info.data));
  return { session: JSON.parse(dec.decode(plain)), seal: sealerFor(key, info.credId) };
}

export const disable = () => write(null);
