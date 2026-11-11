import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldApply, enqueue, pushRows, authMessage, rid } from '../src/lib/syncrules.js';

test('sincronização: vale a mudança mais recente', () => {
  assert.equal(shouldApply(null, { updated_at: 5 }), true);
  assert.equal(shouldApply({ ts: 1 }, { updated_at: 5 }), true);
  assert.equal(shouldApply({ ts: 9 }, { updated_at: 5 }), false);
  assert.equal(shouldApply({ ts: 5 }, { updated_at: 5 }), false);
});

test('sincronização: a fila guarda a última mudança de cada registro e nunca volta no tempo', () => {
  let s = enqueue({}, [{ store: 'entries', key: 'a' }], 100);
  s = enqueue(s, [{ store: 'entries', key: 'a', deleted: true }, { store: 'kv', key: 'profile' }], 100);
  assert.equal(s[rid('entries', 'a')].deleted, true);
  assert.ok(s[rid('entries', 'a')].ts > 100);
  assert.equal(s[rid('kv', 'profile')].dirty, true);
});

test('sincronização: valor sumido vira exclusão', () => {
  const rows = pushRows([{ store: 'entries', key: 'a', ts: 3, deleted: false }, { store: 'entries', key: 'b', ts: 4, deleted: false }],
    s => (s.key === 'a' ? { id: 'a', kcal: 10 } : undefined));
  assert.deepEqual(rows, [
    { store: 'entries', key: 'a', value: { id: 'a', kcal: 10 }, deleted: false, updated_at: 3 },
    { store: 'entries', key: 'b', value: null, deleted: true, updated_at: 4 },
  ]);
});

test('login: mensagens em português', () => {
  assert.equal(authMessage({ code: 'invalid_credentials' }), 'E-mail ou senha incorretos.');
  assert.match(authMessage({ error_description: 'Email not confirmed' }), /Confirme/);
  assert.match(authMessage({ code: 'network' }), /conexão/);
});
