'use strict';
// Minimal DOM stub: just enough of `document` for script.js to run under Node
// (no jsdom, keeps the repo dependency-free).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');

function makeClassList(initial) {
  const set = new Set(initial);
  return {
    add: c => set.add(c),
    remove: c => set.delete(c),
    contains: c => set.has(c),
    toggle(c, force) {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c); else set.delete(c);
      return on;
    },
  };
}

function makeEl(id, { classes = [], dataset = {}, value = '' } = {}) {
  const listeners = {};
  return {
    id, value, dataset: { ...dataset },
    textContent: '', innerHTML: '',
    classList: makeClassList(classes),
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type) { (listeners[type] || []).forEach(fn => fn({ target: this })); },
    scrollIntoView() {},
  };
}

// Elements that start hidden in index.html
const HIDDEN_IDS = ['result-section', 'checklist-section', 'ihca-alert',
  'ph-severity', 'ph-mismatch-alert', 'na-alert'];

function createEnv({ scripts = ['js/calc.js', 'script.js'] } = {}) {
  const els = new Map();
  const get = id => {
    if (!els.has(id)) els.set(id, makeEl(id, { classes: HIDDEN_IDS.includes(id) ? ['hidden'] : [] }));
    return els.get(id);
  };
  els.set('btn-standard', makeEl('btn-standard', { classes: ['vd-btn', 'vd-btn--active'], dataset: { vd: '0.5' } }));
  els.set('btn-severe', makeEl('btn-severe', { classes: ['vd-btn'], dataset: { vd: '0.7' } }));
  els.set('target-hco3', makeEl('target-hco3', { value: '18' }));

  const radios = ['A', 'B', 'C', 'D'].map(v => makeEl('s-' + v.toLowerCase(), { value: v }));
  const akiItems = [makeEl('aki-1', { classes: ['hidden'] })];
  const vpItems = [makeEl('vp-1', { classes: ['hidden'] })];
  const inputs = ['ph', 'weight', 'actual-hco3', 'target-hco3'].map(get);

  const alerts = [];
  const confirms = [];
  let confirmAnswer = true;

  const document = {
    getElementById: get,
    querySelectorAll(sel) {
      if (sel === 'input[name="scenario"]') return radios;
      if (sel === '.js-aki-item') return akiItems;
      if (sel === '.js-vp-item') return vpItems;
      if (sel === '.js-calc-input') return inputs;
      return [];
    },
  };
  const ctx = vm.createContext({
    document,
    alert: msg => alerts.push(msg),
    confirm: msg => { confirms.push(msg); return confirmAnswer; },
    console,
  });
  for (const rel of scripts) {
    const file = path.join(ROOT, rel);
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel });
  }

  const ui = {
    el: get, alerts, confirms,
    setConfirm(v) { confirmAnswer = v; },
    set(fields) {
      const map = { pH: 'ph', weight: 'weight', actual: 'actual-hco3', target: 'target-hco3' };
      for (const [k, v] of Object.entries(fields)) {
        const el = get(map[k]);
        el.value = v === undefined ? '' : String(v);
        el.dispatch('input');
      }
    },
    vd(v) { get(v === 0.7 ? 'btn-severe' : 'btn-standard').dispatch('click'); },
    scenario(s) { const r = radios.find(x => x.value === s); r.dispatch('change'); },
    calc() { get('calc-btn').dispatch('click'); },
    visible: id => !get(id).classList.contains('hidden'),
    snapshot() {
      const ids = ['r-total', 'r-first', 'r-second',
        'v-first-count', 'v-first-detail', 'v-second-count', 'v-second-detail',
        'v-total-count', 'v-total-detail', 'na-alert-text', 'ph-display', 'ph-badge',
        'ph-detail', 'ph-mismatch-text'];
      const out = { text: {}, html: get('formula-box').innerHTML, visible: {} };
      ids.forEach(id => { out.text[id] = get(id).textContent; });
      HIDDEN_IDS.forEach(id => { out.visible[id] = ui.visible(id); });
      out.phLevel = get('ph-severity').dataset.level || null;
      out.alerts = alerts.slice();
      out.confirms = confirms.slice();
      return out;
    },
  };
  return ui;
}

module.exports = { createEnv, ROOT };
