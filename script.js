'use strict';
// DOM wiring only; all arithmetic lives in js/calc.js (window.BicarbCalc).
const Calc = BicarbCalc;

// ── State ──
let currentVd = 0.5;
let currentScenario = null;

// ── DOM refs ──
const btnStandard  = document.getElementById('btn-standard');
const btnSevere    = document.getElementById('btn-severe');
const calcBtn      = document.getElementById('calc-btn');
const resultSec    = document.getElementById('result-section');
const checklistSec = document.getElementById('checklist-section');

// ── Vd Toggle ──
[btnStandard, btnSevere].forEach(btn => {
  btn.addEventListener('click', () => {
    currentVd = parseFloat(btn.dataset.vd);
    btnStandard.classList.toggle('vd-btn--active', currentVd === 0.5);
    btnSevere.classList.toggle('vd-btn--active',   currentVd === 0.7);
    invalidateResults();
  });
});

// ── Scenario selection ──
document.querySelectorAll('input[name="scenario"]').forEach(radio => {
  radio.addEventListener('change', () => {
    currentScenario = radio.value;
    updateScenarioUI();
    invalidateResults();
  });
});

// ── Stale-result guard ──
// A displayed dose must always correspond to the inputs on screen: hide it
// as soon as anything it depends on changes or a recalculation is rejected.
['ph', 'weight', 'actual-hco3', 'target-hco3'].forEach(id =>
  document.getElementById(id).addEventListener('input', invalidateResults));

function invalidateResults() {
  resultSec.classList.add('hidden');
  checklistSec.classList.add('hidden');
}

function updateScenarioUI() {
  document.querySelectorAll('.js-aki-item').forEach(el =>
    el.classList.toggle('hidden', currentScenario !== 'A'));
  document.querySelectorAll('.js-vp-item').forEach(el =>
    el.classList.toggle('hidden', currentScenario !== 'B'));
}

// ── pH Severity ──
function renderPhSeverity(pH) {
  const bar     = document.getElementById('ph-severity');
  const display = document.getElementById('ph-display');
  const badge   = document.getElementById('ph-badge');
  const detail  = document.getElementById('ph-detail');

  if (isNaN(pH)) {
    bar.classList.add('hidden');
    return null;
  }

  const s = Calc.getPhSeverity(pH);
  bar.dataset.level     = s.level;
  display.textContent   = pH.toFixed(2);
  badge.textContent     = s.label;
  detail.textContent    = s.detail;
  bar.classList.remove('hidden');
  return s;
}

function renderPhMismatch(s, scenario) {
  const alert = document.getElementById('ph-mismatch-alert');
  const text  = document.getElementById('ph-mismatch-text');
  const msg   = Calc.getPhMismatch(s, scenario);
  if (!msg) {
    alert.classList.add('hidden');
    return;
  }
  text.textContent = msg;
  alert.classList.remove('hidden');
}

// ── Main Calculation ──
calcBtn.addEventListener('click', calculate);

function calculate() {
  const pH         = parseFloat(document.getElementById('ph').value);
  const weight     = parseFloat(document.getElementById('weight').value);
  const actualHco3 = parseFloat(document.getElementById('actual-hco3').value);
  const targetHco3 = parseFloat(document.getElementById('target-hco3').value);

  // Validation
  const v = Calc.validateInputs({ weight, actualHco3, targetHco3 });
  if (v.status === 'error') {
    invalidateResults();
    alert(v.message);
    return;
  }
  if (v.status === 'confirm' && !confirm(v.message)) {
    invalidateResults();
    return;
  }

  const { totalMeq, firstMeq, secondMeq } =
    Calc.computeDose({ vd: currentVd, weight, actualHco3, targetHco3 });

  // pH severity
  const severity = renderPhSeverity(pH);
  renderPhMismatch(severity, currentScenario);

  // Formula display
  document.getElementById('formula-box').innerHTML =
    `所需 NaHCO₃ = <em>Vd</em> × <em>體重</em> × (<em>目標 HCO₃⁻</em> − <em>實測 HCO₃⁻</em>)<br>` +
    `= <em>${currentVd}</em> × <em>${weight} kg</em> × (<em>${targetHco3}</em> − <em>${actualHco3}</em>) mEq/L<br>` +
    `= <em>${totalMeq.toFixed(1)} mEq</em>　→　先給 ½ = <em>${firstMeq.toFixed(1)} mEq</em>，複查 ABG 後再決定是否給餘 ½<br>` +
    `<small>分布體積係數本身不確定（隨酸中毒嚴重度、輸注速度而異）：此數值僅為第一劑量級，請依 ABG 滴定</small>`;

  // Result tiles
  document.getElementById('r-total').textContent  = totalMeq.toFixed(1);
  document.getElementById('r-first').textContent  = firstMeq.toFixed(1);
  document.getElementById('r-second').textContent = secondMeq.toFixed(1);

  // Vial calculation
  renderVials('first',  firstMeq);
  renderVials('second', secondMeq);
  renderVials('total',  totalMeq);

  // Na+ load warning
  const naAlert = document.getElementById('na-alert');
  const naText  = Calc.naLoadWarning(firstMeq);
  if (naText) {
    document.getElementById('na-alert-text').textContent = naText;
    naAlert.classList.remove('hidden');
  } else {
    naAlert.classList.add('hidden');
  }

  // IHCA warning
  document.getElementById('ihca-alert').classList.toggle('hidden', currentScenario !== 'C');

  // Show sections
  resultSec.classList.remove('hidden');
  checklistSec.classList.remove('hidden');
  updateScenarioUI();

  resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderVials(slot, meq) {
  const plan     = Calc.vialPlan(meq);
  const countEl  = document.getElementById(`v-${slot}-count`);
  const detailEl = document.getElementById(`v-${slot}-detail`);
  if (countEl)  countEl.textContent  = plan.countText;
  if (detailEl) detailEl.textContent = plan.detailText;
}
