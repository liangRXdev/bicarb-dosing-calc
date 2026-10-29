'use strict';
// Regenerate the golden snapshot: node test/helpers/make-golden.js <script...>
// Was run once against the pre-refactor script.js (commit 4a79e9b).
const fs = require('node:fs');
const path = require('node:path');
const { createEnv } = require('./fake-dom');
const { cases } = require('./cases');

function run(scripts) {
  return cases.map(c => {
    const ui = createEnv({ scripts });
    if (c.vd === 0.7) ui.vd(0.7);
    if (c.scenario) ui.scenario(c.scenario);
    ui.set({ pH: c.pH, weight: c.weight, actual: c.actual, target: c.target });
    ui.calc();
    return { input: c, output: ui.snapshot() };
  });
}

if (require.main === module) {
  const scripts = process.argv.slice(2);
  const out = path.join(__dirname, '..', 'fixtures', 'golden.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(run(scripts.length ? scripts : ['script.js']), null, 1) + '\n');
  console.log('wrote', out);
}
module.exports = { run };
