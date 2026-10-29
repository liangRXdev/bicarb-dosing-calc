'use strict';
// Golden snapshot of the UI output captured from the pre-refactor script.js
// (commit 4a79e9b). Any diff here means rendered output changed.
const test = require('node:test');
const assert = require('node:assert/strict');
const golden = require('./fixtures/golden.json');
const { run } = require('./helpers/make-golden');

test('UI output matches golden snapshot from 4a79e9b', () => {
  const actual = run(['js/calc.js', 'script.js']);
  assert.equal(actual.length, golden.length);
  actual.forEach((row, i) => assert.deepEqual(row, golden[i], JSON.stringify(golden[i].input)));
});
