'use strict';
// Extreme-value coverage. Bug: measured HCO3- 65 / target 70 passed
// validation after the high-target confirm() and produced a 175 mEq dose for
// a non-physiological (alkalotic) value; Infinity also passed isNaN().
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');
const { createEnv } = require('./helpers/fake-dom');

const status = (weight, actualHco3, targetHco3) =>
  C.validateInputs({ weight, actualHco3, targetHco3 }).status;

test('HCO3- above physiological range (> 60 mEq/L) is rejected', () => {
  assert.equal(status(60, 65, 70), 'error');
  assert.equal(status(60, 61, 62), 'error');
  assert.equal(status(60, 10, 61), 'error');   // target out of range
  assert.equal(status(60, 59, 60), 'confirm'); // boundary still allowed (confirm for > 22)
});

test('non-finite inputs are rejected', () => {
  assert.equal(status(Infinity, 10, 18), 'error');
  assert.equal(status(60, -Infinity, 18), 'error');
  assert.equal(status(60, 10, Infinity), 'error');
});

test('UI: HCO3- 65 → 70 with confirm accepted shows no dose', () => {
  const ui = createEnv();
  ui.set({ weight: 60, actual: 65, target: 70 });
  ui.calc();
  assert.equal(ui.visible('result-section'), false);
  assert.equal(ui.confirms.length, 0);
  assert.match(ui.alerts.at(-1), /60/);
});

test('any input that validates yields a finite, positive dose (no NaN/Infinity/negative)', () => {
  const weights = [NaN, -1, 0, 0.5, 1, 20, 60, 250, Infinity];
  const hco3 = [NaN, -5, 0, 0.5, 1, 10, 17.9, 18, 24, 30, 60, 61, 1000, Infinity];
  for (const vd of [0.5, 0.7]) for (const weight of weights)
    for (const actualHco3 of hco3) for (const targetHco3 of hco3) {
      if (C.validateInputs({ weight, actualHco3, targetHco3 }).status === 'error') continue;
      const d = C.computeDose({ vd, weight, actualHco3, targetHco3 });
      for (const k of ['totalMeq', 'firstMeq', 'secondMeq']) {
        assert.ok(Number.isFinite(d[k]) && d[k] > 0, `${k}=${d[k]} for ${JSON.stringify({ vd, weight, actualHco3, targetHco3 })}`);
      }
      const p = C.vialPlan(d.firstMeq);
      assert.ok(Number.isFinite(p.volMl) && p.vials >= 1, JSON.stringify(p));
    }
});
