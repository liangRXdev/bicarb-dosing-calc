'use strict';
// Pure calculation core (no DOM). Loaded by index.html as a classic <script>
// (exposes window.BicarbCalc) and by Node tests via require().
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BicarbCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // ── Constants ──
  const VIAL_MG_PER_ML = 70;       // Taiwan spec: 70 mg/mL
  const VIAL_ML        = 20;        // 20 mL per vial
  const NAHCO3_MW      = 84;        // g/mol (also mg/mEq)
  const MEQ_PER_ML     = VIAL_MG_PER_ML / NAHCO3_MW;   // 0.8333 mEq/mL
  const MEQ_PER_VIAL   = MEQ_PER_ML * VIAL_ML;          // 16.667 mEq/vial
  const NA_WARN_MEQ    = 100;       // warn if single dose > 100 mEq Na+
  const NACL_MG_PER_MEQ = 58.44;
  const TARGET_CONFIRM_ABOVE = 22;  // confirm() if target HCO3- exceeds this

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
      detail: 'SODa-BIC（NEJM 2026，雙盲）族群範圍：合併升壓劑亦不改善 MAKE30、死亡或升壓劑天數 → 不建議常規使用',
      scenarioHint: { ok: ['B', 'D'], warn: 'A', warnMsg: 'pH > 7.20，超出場景 A（BICAR-ICU/BICARICU-2）納入標準，建議改選場景 B' }
    };
    return {
      level:  'mild',
      label:  'pH ≥ 7.30（超出 RCT 納入範圍）',
      detail: '目前無 RCT 支持在此 pH 常規使用 NaHCO₃；若仍計算，建議審慎評估臨床適應症',
      scenarioHint: { ok: ['D'], warn: null }
    };
  }

  // Returns the scenario-mismatch message, or null if none applies.
  function getPhMismatch(severity, scenario) {
    if (!severity || !scenario || !severity.scenarioHint.warn ||
        severity.scenarioHint.warn !== scenario) return null;
    return '⚠️ 場景與 pH 不符：' + severity.scenarioHint.warnMsg;
  }

  // ── Validation ──
  // { status: 'error', message } → block; { status: 'confirm', message } → ask; { status: 'ok' }
  function validateInputs({ weight, actualHco3, targetHco3 }) {
    if (isNaN(weight) || isNaN(actualHco3) || isNaN(targetHco3)) {
      return { status: 'error', message: '請輸入體重、實測 HCO₃⁻ 及目標 HCO₃⁻' };
    }
    if (weight <= 0 || actualHco3 <= 0) {
      return { status: 'error', message: '數值須大於 0' };
    }
    if (targetHco3 <= actualHco3) {
      return { status: 'error', message: '目標 HCO₃⁻ 須大於實測值' };
    }
    if (targetHco3 > TARGET_CONFIRM_ABOVE) {
      return {
        status: 'confirm',
        message: `目標 HCO₃⁻ ${targetHco3} mEq/L 偏高（試驗目標 ≤ 18–20）\n` +
                 `建議不超過 20 mEq/L 以避免過度矯正。\n繼續計算？`
      };
    }
    return { status: 'ok' };
  }

  // ── Dose ──
  // Deficit (mEq) = Vd × weight × (target − measured HCO3-); give ½ first.
  function computeDose({ vd, weight, actualHco3, targetHco3 }) {
    const delta    = targetHco3 - actualHco3;
    const totalMeq = vd * weight * delta;
    return { delta, totalMeq, firstMeq: totalMeq / 2, secondMeq: totalMeq / 2 };
  }

  // ── Vials (7% NaHCO3, 20 mL) ──
  function vialPlan(meq) {
    const volMl       = meq / MEQ_PER_ML;
    const vialsNeeded = Math.ceil(volMl / VIAL_ML);
    const usedVol     = volMl.toFixed(1);
    let detail;
    if (meq <= MEQ_PER_VIAL) {
      detail = `1 支取 ${usedVol} mL`;
    } else {
      const fullVials = vialsNeeded - 1;
      const lastVolMl = (volMl - fullVials * VIAL_ML).toFixed(1);
      if (parseFloat(lastVolMl) > 0 && parseFloat(lastVolMl) < VIAL_ML) {
        detail = `${fullVials} 支全量 + 1 支取 ${lastVolMl} mL（共 ${usedVol} mL）`;
      } else {
        detail = `共 ${usedVol} mL`;
      }
    }
    return { volMl, vials: vialsNeeded, countText: `${vialsNeeded} 支`, detailText: detail };
  }

  // ── Na+ load ──
  function naLoadWarning(firstMeq) {
    if (!(firstMeq > NA_WARN_MEQ)) return null;
    return `第一劑鈉負荷約 ${firstMeq.toFixed(0)} mEq Na⁺` +
      `（≈ ${(firstMeq * NACL_MG_PER_MEQ / 1000).toFixed(1)} g NaCl）。` +
      `基礎血鈉偏高者（Na⁺ > 140 mmol/L）需密切監測；建議慢速輸注並分次給予。`;
  }

  return {
    VIAL_MG_PER_ML, VIAL_ML, NAHCO3_MW, MEQ_PER_ML, MEQ_PER_VIAL, NA_WARN_MEQ,
    TARGET_CONFIRM_ABOVE,
    getPhSeverity, getPhMismatch, validateInputs, computeDose, vialPlan, naLoadWarning,
  };
});
