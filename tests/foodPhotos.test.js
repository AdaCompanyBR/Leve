import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoKind, mealPhoto, photoUrl } from '../src/lib/foodPhotos.js';
import { activityKcal } from '../src/lib/activity.js';
import { existsSync } from 'node:fs';

test('tipo de foto pelo nome e pelo grupo', () => {
  assert.equal(photoKind('Arroz, integral, cozido', 'Cereais e derivados'), 'arroz');
  assert.equal(photoKind('Feijão, carioca, cozido', 'Leguminosas e derivados'), 'feijao');
  assert.equal(photoKind('Frango, peito, sem pele, grelhado', 'Carnes e derivados'), 'frango');
  assert.equal(photoKind('Carne, bovina, patinho, grelhado', 'Carnes e derivados'), 'carne');
  assert.equal(photoKind('Banana, prata, crua', 'Frutas e derivados'), 'fruta');
  assert.equal(photoKind('Pão, trigo, francês'), 'pao');
  assert.equal(photoKind('Ovo, de galinha, inteiro, cozido', 'Ovos e derivados'), 'ovo');
  assert.equal(photoKind('Coisa desconhecida'), 'prato');
});

test('todas as fotos existem', () => {
  for (const k of ['arroz', 'feijao', 'massa', 'pao', 'frango', 'peixe', 'ovo', 'queijo', 'iogurte', 'leite', 'cafe', 'suco', 'doce', 'salgadinho', 'nozes', 'verdura', 'fruta', 'carne', 'pizza', 'prato', 'meal-cafe', 'meal-almoco', 'meal-lanche', 'meal-jantar'])
    assert.ok(existsSync(new URL('../' + photoUrl(k), import.meta.url)), k);
});

test('foto da refeição: ilustração, foto real do produto, foto do tipo', () => {
  assert.deepEqual(mealPhoto('cafe', []), { srcs: ['img/food/meal-cafe.webp'], real: false, label: 'Ilustração' });
  const real = mealPhoto('lanches', [{ name: 'Barra X', kcal: 90, food: { img: 'https://images.openfoodfacts.org/x.jpg' } }]);
  assert.equal(real.real, true);
  const kind = mealPhoto('almoco', [{ name: 'Alface', kcal: 5, food: {} }, { name: 'Arroz, cozido', kcal: 200, food: {} }]);
  assert.deepEqual(kind.srcs, ['img/food/arroz.webp', 'img/food/verdura.webp']); assert.equal(kind.real, false);
});

test('gasto das atividades', () => {
  assert.equal(activityKcal({ type: 'caminhada', intensity: 'leve', minutes: 60 }, 70), 245);
  assert.equal(activityKcal({ type: 'corrida', minutes: 30 }, 80), 440);
  assert.equal(activityKcal({ type: 'corrida', minutes: 30 }, null), 0);
});
