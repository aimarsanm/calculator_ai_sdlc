const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mount } = require('../web/calculator.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

function el(attrs = {}) {
  const listeners = {};
  const classes = new Set();
  return {
    dataset: attrs,
    textContent: '',
    classList: { toggle: (c, on) => (on === undefined ? !classes.has(c) : on) ? classes.add(c) : classes.delete(c), has: (c) => classes.has(c) },
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
    click: () => listeners.click(),
  };
}

// DOM mínimo construido a partir de los botones reales de index.html.
function buildDoc() {
  const keys = [...html.matchAll(/data-key="([^"]+)"/g)].map((m) => el({ key: m[1] }));
  const clear = el({ action: 'clear' });
  const equals = el({ action: 'equals' });
  const byId = { expression: el(), result: el(), 'theme-toggle': el() };
  const root = { classList: byId.expression.classList };
  return {
    keys, clear, equals, byId, root,
    doc: {
      documentElement: root,
      getElementById: (id) => byId[id],
      querySelectorAll: () => keys,
      querySelector: (sel) => (sel.includes('clear') ? clear : equals),
    },
  };
}

test('index.html contiene dígitos, operadores, punto, C e =', () => {
  const { keys } = buildDoc();
  const names = keys.map((k) => k.dataset.key);
  for (const k of '0123456789+-*/.') assert.ok(names.includes(k), `falta ${k}`);
  assert.match(html, /data-action="clear"/);
  assert.match(html, /data-action="equals"/);
});

test('clics 5 + 3 = muestran 8 en pantalla', async () => {
  const { keys, equals, byId, doc } = buildDoc();
  const fetchFn = async () => ({ ok: true, json: async () => ({ result: 8 }) });
  mount(doc, fetchFn);
  for (const k of ['5', '+', '3']) keys.find((b) => b.dataset.key === k).click();
  assert.strictEqual(byId.expression.textContent, '5+3');
  await equals.click();
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(byId.result.textContent, '8');
});

test('muestra el error del backend y C limpia la pantalla', async () => {
  const { keys, equals, clear, byId, doc } = buildDoc();
  const fetchFn = async () => ({ ok: false, json: async () => ({ error: 'División por cero' }) });
  mount(doc, fetchFn);
  for (const k of ['1', '/', '0']) keys.find((b) => b.dataset.key === k).click();
  equals.click();
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(byId.result.textContent, 'División por cero');
  assert.ok(byId.result.classList.has('error'));
  clear.click();
  assert.strictEqual(byId.result.textContent, '0');
});
