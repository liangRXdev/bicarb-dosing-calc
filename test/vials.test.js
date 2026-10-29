'use strict';
// Bug: vial count was computed from the unrounded volume but the text used
// the 0.1 mL-rounded volume. Repro: 23 kg, HCO3 1 → 15.5, Vd 0.5 → first dose
// 83.375 mEq = 100.05 mL → "6 支" next to "共 100.0 mL" (100 mL = 5 vials).
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

function assertConsistent(meq) {
  const p = C.vialPlan(meq);
  const total = /共 ([\d.]+) mL/.exec(p.detailText) || /^1 支取 ([\d.]+) mL$/.exec(p.detailText);
  assert.ok(total, p.detailText);
  const shownMl = parseFloat(total[1]);
  assert.equal(p.vials, Math.max(1, Math.ceil(shownMl / C.VIAL_ML)), `${meq} mEq: ${p.countText} / ${p.detailText}`);
  assert.equal(p.countText, `${p.vials} 支`);
  const split = /^(\d+) 支全量 \+ 1 支取 ([\d.]+) mL/.exec(p.detailText);
  if (split) {
    assert.equal(+split[1] + 1, p.vials);
    assert.ok(Math.abs(+split[1] * C.VIAL_ML + +split[2] - shownMl) < 1e-9, p.detailText);
    assert.ok(+split[2] > 0 && +split[2] < C.VIAL_ML, p.detailText);
  }
}

test('repro: 83.375 mEq (100.05 mL)', () => assertConsistent(83.375));

test('vial count always matches the displayed volume', () => {
  for (const vd of [0.5, 0.7]) for (let w = 20; w <= 250; w += 0.5)
    for (let a = 1; a < 24; a += 0.5) for (const t of [15.5, 18, 20]) {
      if (t <= a) continue;
      const d = C.computeDose({ vd, weight: w, actualHco3: a, targetHco3: t });
      assertConsistent(d.firstMeq);
      assertConsistent(d.totalMeq);
    }
});
