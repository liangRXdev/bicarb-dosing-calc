'use strict';
// Bug: a previous dose stayed on screen after inputs changed or a new
// calculation was rejected, so the displayed mEq/vials no longer matched
// the inputs shown above them.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEnv } = require('./helpers/fake-dom');

function calculated() {
  const ui = createEnv();
  ui.set({ pH: 7.15, weight: 60, actual: 10, target: 18 });
  ui.calc();
  assert.ok(ui.visible('result-section'));
  return ui;
}

test('rejected recalculation (measured ≥ target) hides the old dose', () => {
  const ui = calculated();
  ui.set({ actual: 20 });
  ui.calc();
  assert.equal(ui.alerts.at(-1), '目標 HCO₃⁻ 須大於實測值');
  assert.equal(ui.visible('result-section'), false);
  assert.equal(ui.visible('checklist-section'), false);
});

test('cancelled high-target confirm hides the old dose', () => {
  const ui = calculated();
  ui.setConfirm(false);
  ui.set({ target: 24 });
  ui.calc();
  assert.equal(ui.confirms.length, 1);
  assert.equal(ui.visible('result-section'), false);
});

test('editing any input invalidates the displayed dose', () => {
  for (const field of ['pH', 'weight', 'actual', 'target']) {
    const ui = calculated();
    ui.set({ [field]: 12 });
    assert.equal(ui.visible('result-section'), false, field);
  }
});

test('switching Vd invalidates the displayed dose', () => {
  const ui = calculated();
  ui.vd(0.7);
  assert.equal(ui.visible('result-section'), false);
});

test('switching scenario invalidates the displayed dose (IHCA alert would be stale)', () => {
  const ui = calculated();
  ui.scenario('C');
  assert.equal(ui.visible('result-section'), false);
});
