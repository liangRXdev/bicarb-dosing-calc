'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('constants: 7% NaHCO3 = 70/84 mEq/mL, 20 mL vial = 16.67 mEq', () => {
  close(C.MEQ_PER_ML, 0.8333333333);
  close(C.MEQ_PER_VIAL, 16.6666666667, 1e-6);
});

test('computeDose matches README: Vd × kg × (target − measured), ½ first', () => {
  const d = C.computeDose({ vd: 0.5, weight: 60, actualHco3: 10, targetHco3: 18 });
  assert.deepEqual(d, { delta: 8, totalMeq: 240, firstMeq: 120, secondMeq: 120 });
  const s = C.computeDose({ vd: 0.7, weight: 70, actualHco3: 5, targetHco3: 18 });
  close(s.totalMeq, 637);
  close(s.firstMeq + s.secondMeq, s.totalMeq);
});

test('vialPlan: mEq → mL at 0.833 mEq/mL and vial breakdown', () => {
  assert.deepEqual(C.vialPlan(120), {
    volMl: 144, vials: 8, countText: '8 支',
    detailText: '7 支全量 + 1 支取 4.0 mL（共 144.0 mL）',
  });
  assert.equal(C.vialPlan(10).detailText, '1 支取 12.0 mL');
  assert.equal(C.vialPlan(C.MEQ_PER_VIAL).detailText, '1 支取 20.0 mL');
  const two = C.vialPlan(2 * C.MEQ_PER_VIAL);   // exact multiple of a vial
  assert.equal(two.vials, 2);
  assert.equal(two.detailText, '共 40.0 mL');
});

test('naLoadWarning: only when first dose > 100 mEq; NaCl g = mEq × 58.44 / 1000', () => {
  assert.equal(C.naLoadWarning(100), null);
  assert.match(C.naLoadWarning(120), /^第一劑鈉負荷約 120 mEq Na⁺（≈ 7\.0 g NaCl）/);
});

test('getPhSeverity cut-offs', () => {
  const lv = p => C.getPhSeverity(p).level;
  assert.equal(lv(7.09), 'critical');
  assert.equal(lv(7.10), 'severe');
  assert.equal(lv(7.20), 'severe');
  assert.equal(lv(7.21), 'moderate');
  assert.equal(lv(7.30), 'mild');
});

test('getPhMismatch', () => {
  assert.equal(C.getPhMismatch(null, 'A'), null);
  assert.equal(C.getPhMismatch(C.getPhSeverity(7.15), 'A'), null);
  assert.match(C.getPhMismatch(C.getPhSeverity(7.05), 'B'), /^⚠️ 場景與 pH 不符/);
  assert.match(C.getPhMismatch(C.getPhSeverity(7.25), 'A'), /超出場景 A/);
});

test('validateInputs: blank / zero / negative / measured ≥ target are blocked', () => {
  const v = (weight, actualHco3, targetHco3) => C.validateInputs({ weight, actualHco3, targetHco3 }).status;
  assert.equal(v(NaN, 10, 18), 'error');      // blank weight
  assert.equal(v(60, NaN, 18), 'error');      // blank HCO3
  assert.equal(v(60, 10, NaN), 'error');      // blank target
  assert.equal(v(0, 10, 18), 'error');
  assert.equal(v(-60, 10, 18), 'error');
  assert.equal(v(60, 0, 18), 'error');        // HCO3 = 0
  assert.equal(v(60, -2, 18), 'error');
  assert.equal(v(60, 18, 18), 'error');       // deficit = 0
  assert.equal(v(60, 25, 18), 'error');       // deficit < 0
  assert.equal(v(60, 10, 18), 'ok');
  assert.equal(v(60, 10, 22), 'ok');
  assert.equal(v(60, 10, 22.5), 'confirm');
});
