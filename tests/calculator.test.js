const test = require('node:test');
const assert = require('node:assert');
const { createCalculator } = require('../web/calculator.js');

function setup(response = { ok: true, data: { result: 8 } }) {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok: response.ok, json: async () => response.data };
  };
  return { calc: createCalculator({ fetchFn }), calls };
}

test('flujo completo 5 + 3 = muestra 8', async () => {
  const { calc, calls } = setup();
  ['5', '+', '3'].forEach(calc.press);
  await calc.evaluate();
  assert.deepStrictEqual(calls, [{ url: '/api/calculate', body: { expression: '5+3' } }]);
  assert.strictEqual(calc.getState().result, '8');
});

test('captura de clics numéricos', () => {
  const { calc } = setup();
  '0123456789'.split('').forEach(calc.press);
  assert.strictEqual(calc.getState().expression, '0123456789');
});

test('reemplaza operadores consecutivos y rechaza operador inicial', () => {
  const { calc } = setup();
  calc.press('*');
  assert.strictEqual(calc.getState().expression, '');
  ['2', '+', '*'].forEach(calc.press);
  assert.strictEqual(calc.getState().expression, '2*');
});

test('solo un punto decimal por número', () => {
  const { calc } = setup();
  ['.', '5', '.'].forEach(calc.press);
  assert.strictEqual(calc.getState().expression, '0.5');
});

test('muestra error del backend y se recupera', async () => {
  const { calc } = setup({ ok: false, data: { error: 'División por cero' } });
  ['1', '/', '0'].forEach(calc.press);
  await calc.evaluate();
  assert.strictEqual(calc.getState().error, 'División por cero');
  calc.press('2');
  assert.strictEqual(calc.getState().error, '');
  assert.strictEqual(calc.getState().expression, '2');
});

test('error de red', async () => {
  const calc = createCalculator({ fetchFn: async () => { throw new TypeError('fail'); } });
  calc.press('1');
  await calc.evaluate();
  assert.match(calc.getState().error, /conectar/);
});

test('operador tras resultado continúa y C reinicia', async () => {
  const { calc } = setup();
  ['5', '+', '3'].forEach(calc.press);
  await calc.evaluate();
  calc.press('+');
  assert.strictEqual(calc.getState().expression, '8+');
  calc.clear();
  assert.deepStrictEqual([calc.getState().expression, calc.getState().result], ['', '']);
});
