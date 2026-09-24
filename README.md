# bicarb-dosing-calc

**English** | [繁體中文](README.zh-TW.md)

> Sodium bicarbonate (NaHCO₃) dosing calculator for metabolic acidosis
> A clinical decision-support tool integrating 2018–2026 critical-care RCT evidence

**Online:** https://liangrxdev.github.io/bicarb-dosing-calc/ (interface in Traditional Chinese)

---

## Purpose

Helps clinical pharmacists and critical-care teams, in ICU metabolic acidosis, to:

1. Calculate the NaHCO₃ replacement amount with the deficit formula
2. Judge timing of use against current RCT evidence (scenario stratification)
3. Convert to the number of 7% ampoules commonly used in Taiwan
4. Provide Na⁺ load warnings and a monitoring checklist

> ⚠️ **Disclaimer**: This tool is for reference by **healthcare professionals** only and does not replace clinical judgment. All dose suggestions must be adjusted to actual ABG and electrolyte results. It contains no patient data and makes no diagnostic recommendations.

---

## Features

| Feature | Description |
|------|------|
| **Deficit formula** | `Vd × weight × (target HCO₃⁻ − measured HCO₃⁻)`; Vd switchable between **0.5 (standard) / 0.7 (severe)**; the result only indicates the first-dose order of magnitude |
| **Clinical scenario stratification** | 4 scenarios, each labelled with its evidence level (strongest evidence / not recommended routinely [vasopressor and IHCA scenarios] / calculation only) |
| **pH severity stratification** | Automatically grades the entered pH (< 7.10 / 7.10–7.20 / 7.20–7.30 / ≥ 7.30), maps it to RCT inclusion ranges and cross-checks the selected scenario |
| **Taiwan ampoule conversion** | 7% NaHCO₃ (70 mg/mL) 20 mL/ampoule = **16.67 mEq/ampoule**; automatically computes the number of ampoules and the exact volume to draw |
| **Na⁺ load warning** | Flags sodium load when a single dose > 100 mEq (with NaCl equivalent) |
| **Monitoring checklist** | Before / during / after; AKI stage and vasopressor items appear dynamically by scenario |
| **Evidence summary table** | Results of 5 trials at a glance, color-tiered |

---

## Formula

```
Required NaHCO₃ (mEq) = Vd × weight (kg) × (target HCO₃⁻ − measured HCO₃⁻)
```

- **Vd coefficient (HCO₃⁻ volume of distribution)**: standard **0.5**; in severe acidosis (pH < 7.10 or HCO₃⁻ < 10) the bicarbonate space grows to 0.6–0.8 (Garella 1973), conservatively taken as 0.7
  - Note: this formula's input is (target − measured HCO₃⁻), so the coefficient is the HCO₃⁻ volume of distribution. **Do not mix with the base-deficit method**: the 0.3 in `NaHCO₃ = 0.3 × kg × base deficit` pairs with BE and is not interchangeable with this formula's 0.5
  - **The coefficient itself is uncertain**: the base-deficit method also uses **0.4** (Jung 2026, *Curr Opin Crit Care*; per Fujii 2019, apparent Vd ≈ 0.4 L/kg 1 h after infusion, varying with condition and infusion rate). The formula only sets the first-dose magnitude; titrate by ABG thereafter
- **Target HCO₃⁻**: ≤ 18 mEq/L recommended; do not normalize to 24 (trial target was pH ≥ 7.30)
- **Divided dosing**: give ½ first, recheck ABG (30–60 min if unstable or on concentrated infusion; otherwise 1–4 h) before deciding the rest
- **Daily maximum**: ≤ 500 mEq/24h (BICAR-ICU / BICARICU-2 protocol: 4.2% NaHCO₃ 1000 mL/24h)

### Taiwan product specifications

| Item | Value |
|------|------|
| Concentration | 7% NaHCO₃ = 70 mg/mL = 0.833 mEq/mL |
| Package | 20 mL / ampoule |
| Content per ampoule | **16.67 mEq** |
| Dilution to 4.2% (protocol concentration) | 3 parts 7% + 2 parts water for injection |

---

## Evidence Base

| Trial | Design | Population | Main results | KRT/RRT |
|------|------|------|---------|---------|
| **BICAR-ICU** (Lancet 2018) | Open-label RCT, N=389 | pH≤7.20, general ICU | Composite endpoint NS; AKI stratum Day-28 mortality ↓ (HR 0.59, P=.013) | 52%→35% ↓ |
| **BICARICU-2** (JAMA 2025) | Open-label RCT, N=627 | pH≤7.20 + KDIGO AKI 2–3 | 90-day mortality NS (P=.91) | 50%→35% ↓, NNT≈6.5 |
| **SODa-BIC** (NEJM 2026) | Double-blind RCT, N=498 (mITT) | pH<7.30 + vasopressors | MAKE30 NS (+1.2 pp, −7.1 to 9.4, P=.78); hypokalemia 1.6% vs 0 → **not recommended routinely** | 20.9%→16.8% (−3.9 pp, CI crosses 0) |
| **BIHCA** (JAMA 2026) | Double-blind RCT, N=779 | In-hospital cardiac arrest | ROSC NS (RR 1.05, P=.62) | — |
| **Chen et al** (CCM 2026) | Meta-analysis, N=1111 | 4 RCTs (through 2025/10) | Mortality RR 0.84 (NS); Bayesian 90.4% | RR 0.69, TSA firm |

**Clinical takeaways:**
- pH ≤ 7.20 + moderate-to-severe AKI (KDIGO 2–3) → strongest evidence for reducing kidney replacement therapy (KRT/RRT)
- In-hospital cardiac arrest (IHCA) → a double-blind RCT showed no difference in ROSC; **not recommended routinely**
- Mortality: trends favorable across trials but none reached significance

---

## Tech

- Pure frontend: HTML / CSS / JavaScript (no framework, no dependencies, no build step)
- Fonts: Noto Sans TC + DM Mono
- CSS: BEM naming
- Deployment: GitHub Pages (root of the main branch)

### Run locally

Just open `index.html` in a browser; no server needed.

---

## License and Data Protection

- No user input is collected or transmitted; all calculation happens locally in the browser
- Clinical data are cited from published RCTs and meta-analyses; source years and institutions are shown in the tool

---

*Last updated: 2026-06-15*
