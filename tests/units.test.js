import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setUnitPrefs, deg, temp, tempDelta, weight, weightNum, fromWeight, weightDelta, height, parseFtIn, cmToFtIn, speed, rain } from '../src/lib/units.js';
import { buildContext, alerts } from '../src/lib/environment.js';
import { forecast, NOW, curve } from './fixtures.js';

test('métrico por padrão', () => {
  setUnitPrefs(null);
  assert.equal(deg(26.4), '26°'); assert.equal(temp(36), '36 °C'); assert.equal(weight(70.46), '70,5 kg');
  assert.equal(height(170), '170 cm'); assert.equal(speed(62), '62 km/h'); assert.equal(rain(7.6), '8 mm');
});

test('imperial: °F, lb, pés e polegadas, mph e polegadas de chuva', () => {
  setUnitPrefs({ temp: 'f', weight: 'lb', height: 'ftin', speed: 'mph', rain: 'in' });
  assert.equal(deg(26), '79°'); assert.equal(temp(0), '32 °F'); assert.equal(temp(37), '99 °F'); assert.equal(tempDelta(8), '14 °F');
  assert.equal(weight(70), '154,3 lb'); assert.equal(weightNum(100), '220,5');
  assert.ok(Math.abs(fromWeight(154.3) - 70) < 0.05);
  assert.equal(weightDelta(0.5), '1,1 lb');
  setUnitPrefs(null); assert.equal(weightDelta(0.5), '0,5 kg'); assert.equal(weightDelta(0.25), '0,25 kg'); assert.equal(weightDelta(2), '2 kg');
  setUnitPrefs({ temp: 'f', weight: 'lb', height: 'ftin', speed: 'mph', rain: 'in' });
  assert.equal(height(170), '5′ 7″'); assert.deepEqual(cmToFtIn(183), { ft: 6, in: 0 });
  assert.equal(speed(100), '62 mph'); assert.equal(rain(25.4), '1,00 pol.');
  setUnitPrefs(null);
});

test('leitura de altura em pés e polegadas', () => {
  assert.equal(parseFtIn("5'7"), 170); assert.equal(parseFtIn('5 7'), 170); assert.equal(parseFtIn('5′ 7″'), 170);
  assert.equal(parseFtIn('6 pés'), 183); assert.equal(parseFtIn('67 in'), 170); assert.ok(Number.isNaN(parseFtIn('abc')));
});

test('as frases do clima seguem a unidade escolhida', () => {
  setUnitPrefs({ temp: 'f' });
  const ctx = buildContext({ forecast: forecast({ feels: curve(24, 36) }), now: NOW });
  assert.match(alerts(ctx).find(a => a.category === 'calor').text, /97 °F por volta das 15h/);
  setUnitPrefs(null);
  assert.match(alerts(ctx).find(a => a.category === 'calor').text, /36 °C/);
});
