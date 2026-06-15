'use strict';

// ── Constants ──
const VIAL_MG_PER_ML = 70;       // Taiwan spec: 70 mg/mL
const VIAL_ML        = 20;        // 20 mL per vial
const NAHCO3_MW      = 84;        // g/mol (also mg/mEq)
const MEQ_PER_ML     = VIAL_MG_PER_ML / NAHCO3_MW;   // 0.8333 mEq/mL
const MEQ_PER_VIAL   = MEQ_PER_ML * VIAL_ML;          // 16.667 mEq/vial
const NA_WARN_MEQ    = 100;       // warn if single dose > 100 mEq Na+

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

// ── pH Severity ──
function getPhSeverity(pH) {
  if (pH < 7.10) return {
    level:  'critical',
    label:  '重度酸中毒（pH < 7.10）',
    detail: 'BICARICU-2 分層：此組 AKI 更嚴重，KRT 獲益可能更顯著；BICAR-ICU 納入範圍內',
    scenarioHint: { ok: ['A'], warn: 'B', warnMsg: 'pH < 7.10 符合場景 A（pH ≤ 7.20 + AKI），建議優先選用場景 A' }
  };
  if (pH <= 7.20) return {
    level:  'severe',
    label:  '中重度酸中毒（pH 7.10–7.20）',
    detail: '符合 BICAR-ICU 及 BICARICU-2 納入標準（pH ≤ 7.20）；合併 AKI stage 2–3 者 KRT 獲益最強',
    scenarioHint: { ok: ['A', 'B'], warn: null }
  };
  if (pH < 7.30) return {
    level:  'moderate',
    label:  '中度酸中毒（pH 7.20–7.30）',
    detail: 'SODa-BIC（NEJM 2026）族群範圍；此 pH 僅在合併升壓劑時有 RCT 支持，且主要終點 NS',
    scenarioHint: { ok: ['B', 'D'], warn: 'A', warnMsg: 'pH > 7.20，超出場景 A（BICAR-ICU/BICARICU-2）納入標準，建議改選場景 B' }
  };
  return {
    level:  'mild',
    label:  'pH ≥ 7.30（超出 RCT 納入範圍）',
    detail: '目前無 RCT 支持在此 pH 常規使用 NaHCO₃；若仍計算，建議審慎評估臨床適應症',
    scenarioHint: { ok: ['D'], warn: null }
  };
}

function renderPhSeverity(pH) {
  const bar     = document.getElementById('ph-severity');
  const display = document.getElementById('ph-display');
  const badge   = document.getElementById('ph-badge');
  const detail  = document.getElementById('ph-detail');

  if (isNaN(pH)) {
    bar.classList.add('hidden');
    return null;
  }

  const s = getPhSeverity(pH);
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
  if (!s || !scenario || !s.scenarioHint.warn || s.scenarioHint.warn !== scenario) {
    alert.classList.add('hidden');
    return;
  }
  text.textContent = '⚠️ 場景與 pH 不符：' + s.scenarioHint.warnMsg;
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
    if (!confirm(
      `目標 HCO₃⁻ ${targetHco3} mEq/L 偏高（試驗目標 ≤ 18–20）\n` +
      `建議不超過 20 mEq/L 以避免過度矯正。\n繼續計算？`
    )) return;
  }

  const delta    = targetHco3 - actualHco3;
  const totalMeq = currentVd * weight * delta;
  const firstMeq  = totalMeq / 2;
  const secondMeq = totalMeq / 2;

  // pH severity
  const severity = renderPhSeverity(pH);
  renderPhMismatch(severity, currentScenario);

  // Formula display
  document.getElementById('formula-box').innerHTML =
    `所需 NaHCO₃ = <em>Vd</em> × <em>體重</em> × (<em>目標 HCO₃⁻</em> − <em>實測 HCO₃⁻</em>)<br>` +
    `= <em>${currentVd}</em> × <em>${weight} kg</em> × (<em>${targetHco3}</em> − <em>${actualHco3}</em>) mEq/L<br>` +
    `= <em>${totalMeq.toFixed(1)} mEq</em>　→　先給 ½ = <em>${firstMeq.toFixed(1)} mEq</em>，1–4h 後複查 ABG 再給餘 ½`;

  // Result tiles
  document.getElementById('r-total').textContent  = totalMeq.toFixed(1);
  document.getElementById('r-first').textContent  = firstMeq.toFixed(1);
  document.getElementById('r-second').textContent = secondMeq.toFixed(1);

  // Vial calculation
  renderVials('first',  firstMeq);
  renderVials('second', secondMeq);
  renderVials('total',  totalMeq);

  // Na+ load warning
  const naAlert     = document.getElementById('na-alert');
  const naAlertText = document.getElementById('na-alert-text');
  if (firstMeq > NA_WARN_MEQ) {
    naAlertText.textContent =
      `第一劑鈉負荷約 ${firstMeq.toFixed(0)} mEq Na⁺` +
      `（≈ ${(firstMeq * 58.44 / 1000).toFixed(1)} g NaCl）。` +
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

  resultSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderVials(slot, meq) {
  const volMl      = meq / MEQ_PER_ML;
  const vialsNeeded = Math.ceil(volMl / VIAL_ML);
  const usedVol    = volMl.toFixed(1);

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
