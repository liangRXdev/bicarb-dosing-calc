'use strict';
// Input grid for the golden (characterization) snapshot. Only "normal" inputs
// whose output must not change across the refactor; deliberate behaviour
// changes are covered by dedicated tests instead.
const cases = [];
const scenarios = [null, 'A', 'B', 'C', 'D'];
const pHs = ['', 6.95, 7.10, 7.15, 7.20, 7.25, 7.30, 7.40];
const rows = [
  // weight, actual, target
  [60, 10, 18], [70, 5, 18], [50, 12, 18], [80, 8, 20], [45, 15, 18],
  [100, 4, 18], [150, 3, 18], [20, 17, 18], [65.5, 9.5, 17.5], [90, 2, 22],
  [120, 6, 18], [55, 14.5, 18], [40, 1, 15.5],
];
let i = 0;
for (const [weight, actual, target] of rows) {
  for (const vd of [0.5, 0.7]) {
    const scenario = scenarios[i % scenarios.length];
    const pH = pHs[i % pHs.length];
    cases.push({ weight, actual, target, vd, scenario, pH });
    i++;
  }
}
module.exports = { cases };
