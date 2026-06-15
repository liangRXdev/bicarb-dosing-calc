'use strict';

// ── Constants ──
const VIAL_MG_PER_ML = 70;       // Taiwan spec: 70 mg/mL
const VIAL_ML        = 20;        // 20 mL per vial
const NAHCO3_MW      = 84;        // g/mol (also mg/mEq)
const MEQ_PER_ML     = VIAL_MG_PER_ML / NAHCO3_MW;   // 0.8333 mEq/mL
const MEQ_PER_VIAL   = MEQ_PER_ML * VIAL_ML;          // 16.667 mEq/vial
const NA_WARN_MEQ    = 100;       // warn if single dose > 100 mEq Na+

// ── State ──
let currentVd = 0.3;
let currentScenario = null;

// ── DOM refs ──
const btnAcute    = document.getElementById('btn-acute');
const btnChronic  = document.getElementById('btn-chronic');
const calcBtn     = document.getElementById('calc-btn');
const resultSec   = document.getElementById('result-section');
const checklistSec= document.getElementById('checklist-section');

// ── Vd Toggle ──
[btnAcute, btnChronic].forEach(btn => {
  btn.addEventListener('click', () => {
    currentVd = parseFloat(btn.dataset.vd);
    btnAcute.classList.toggle('vd-btn--active',  currentVd === 0.3);
    btnChronic.classList.toggle('vd-btn--active', currentVd === 0.5);
  });
});

// ── Scenario selection ──
document.querySelectorAll('input[name="scenario"]').forEach(radio => {
  radio.addEventListener('change', () => {
    currentScenario = radio.value;
    updateScenarioUI();
  });
});

function updateScenarioUI() {
  document.querySelectorAll('.js-aki-item').forEach(el =>
    el.classList.toggle('hidden', currentScenario !== 'A'));
  document.querySelectorAll('.js-vp-item').forEach(el =>
    el.classList.toggle('hidden', currentScenario !== 'B'));
}

// ── Main Calculation ──
calcBtn.addEventListener('click', calculate);

function calculate() {
  const weight     = parseFloat(document.getElementById('weight').value);
  const actualHco3 = parseFloat(document.getElementById('actual-hco3').value);
  const targetHco3 = parseFloat(document.getElementById('target-hco3').value);

  // Validation
  if (isNaN(weight) || isNaN(actualHco3) || isNaN(targetHco3)) {
    alert('請輸入體重、實測 HCO₃⁻ 及目標 HCO₃⁻');
    return;
  }
  if (weight <= 0 || actualHco3 <= 0) {
    alert('數值須大於 0');
    return;
  }
  if (targetHco3 <= actualHco3) {
    alert('目標 HCO₃⁻ 須大於實測值');
    return;
  }
  if (targetHco3 > 22) {
    if (!confirm(`目標 HCO₃⁻ ${targetHco3} mEq/L 偏高（試驗中目標為 ≤ 18–20）\n建議不超過 20 mEq/L 以避免過度矯正。\n繼續計算？`)) return;
  }

  const delta    = targetHco3 - actualHco3;
  const totalMeq = currentVd * weight * delta;
  const firstMeq  = totalMeq / 2;
  const secondMeq = totalMeq / 2;

  // Display formula
  document.getElementById('formula-box').innerHTML =
    `所需 NaHCO₃ = <em>Vd</em> × <em>體重</em> × (<em>目標 HCO₃⁻</em> − <em>實測 HCO₃⁻</em>)<br>` +
    `= <em>${currentVd}</em> × <em>${weight} kg</em> × (<em>${targetHco3}</em> − <em>${actualHco3}</em>) mEq/L<br>` +
    `= <em>${totalMeq.toFixed(1)} mEq</em>　→　先給 ½ = <em>${firstMeq.toFixed(1)} mEq</em>，1–4h 後複查 ABG 再給餘 ½`;

  // Main result tiles
  document.getElementById('r-total').textContent  = totalMeq.toFixed(1);
  document.getElementById('r-first').textContent  = firstMeq.toFixed(1);
  document.getElementById('r-second').textContent = secondMeq.toFixed(1);

  // Vial calculation
  renderVials('first',  firstMeq);
  renderVials('second', secondMeq);
  renderVials('total',  totalMeq);

  // Na+ warning (each mEq NaHCO₃ delivers 1 mEq Na+)
  const naAlert     = document.getElementById('na-alert');
  const naAlertText = document.getElementById('na-alert-text');
  if (firstMeq > NA_WARN_MEQ) {
    naAlertText.textContent =
      `第一劑鈉負荷約 ${firstMeq.toFixed(0)} mEq Na⁺（等同 ${(firstMeq * 58.44 / 1000).toFixed(1)} g NaCl）。` +
      `基礎血鈉偏高者（Na⁺ > 140 mmol/L）需密切監測；建議慢速輸注並分次給予。`;
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

  // Scroll to results
  resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderVials(slot, meq) {
  const volMl    = meq / MEQ_PER_ML;                    // volume needed (mL)
  const vialsNeeded = Math.ceil(volMl / VIAL_ML);        // whole vials to prepare
  const usedVol  = volMl.toFixed(1);                    // exact mL to inject

  const countEl  = document.getElementById(`v-${slot}-count`);
  const detailEl = document.getElementById(`v-${slot}-detail`);

  if (countEl) countEl.textContent = `${vialsNeeded} 支`;
  if (detailEl) {
    if (meq <= MEQ_PER_VIAL) {
      detailEl.textContent = `1 支取 ${usedVol} mL`;
    } else {
      const fullVials = vialsNeeded - 1;
      const lastVolMl = (volMl - fullVials * VIAL_ML).toFixed(1);
      if (parseFloat(lastVolMl) > 0 && parseFloat(lastVolMl) < VIAL_ML) {
        detailEl.textContent = `${fullVials} 支全量 + 1 支取 ${lastVolMl} mL（共 ${usedVol} mL）`;
      } else {
        detailEl.textContent = `共 ${usedVol} mL`;
      }
    }
  }
}
