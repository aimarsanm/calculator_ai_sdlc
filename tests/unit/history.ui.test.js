// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mount } = require('../../web/calculator.js');
const html = fs.readFileSync(path.resolve(__dirname, '../../web/index.html'), 'utf8');
const flush = () => new Promise((r) => setTimeout(r, 0));
const click = (label) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label).click();

function fakeApi(initial) {
  let history = [...initial];
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET' });
    if (url === '/api/history' && opts.method === 'DELETE') {
      history = [];
      return { ok: true, json: async () => ({ history }) };
    }
    if (url === '/api/history') return { ok: true, json: async () => ({ history }) };
    history.push({ expression: JSON.parse(opts.body).expression, result: 3 });
    return { ok: true, json: async () => ({ result: 3 }) };
  };
  fn.calls = calls;
  return fn;
}

beforeEach(() => {
  document.documentElement.innerHTML = html.replace(/<script[^>]*><\/script>/g, '');
});

describe('panel de historial', () => {
  it('renderiza las entradas recibidas de la API', async () => {
    mount(document, fakeApi([{ expression: '1+2', result: 3 }, { expression: '4*5', result: 20 }]));
    await flush();
    const items = [...document.querySelectorAll('.history-item')];
    expect(items.map((i) => i.textContent)).toEqual(['4*5 = 20', '1+2 = 3']);
    expect(document.getElementById('history-empty').hidden).toBe(true);
  });

  it('muestra el estado vacío', async () => {
    mount(document, fakeApi([]));
    await flush();
    expect(document.querySelectorAll('.history-item').length).toBe(0);
    expect(document.getElementById('history-empty').hidden).toBe(false);
  });

  it('carga el resultado en el display al hacer clic', async () => {
    mount(document, fakeApi([{ expression: '1+2', result: 3 }]));
    await flush();
    document.querySelector('.history-item').click();
    expect(document.getElementById('expression').textContent).toBe('3');
  });

  it('se actualiza tras un cálculo exitoso', async () => {
    const api = fakeApi([]);
    mount(document, api);
    await flush();
    ['1', '+', '2'].forEach(click);
    click('=');
    await flush();
    await flush();
    expect(document.querySelector('.history-item').textContent).toBe('1+2 = 3');
  });

  it('limpia el historial vía DELETE', async () => {
    const api = fakeApi([{ expression: '1+2', result: 3 }]);
    mount(document, api);
    await flush();
    click('Limpiar historial');
    await flush();
    expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true);
    expect(document.querySelectorAll('.history-item').length).toBe(0);
  });

  it('se puede colapsar', async () => {
    mount(document, fakeApi([]));
    document.getElementById('history-toggle').click();
    expect(document.getElementById('history-panel').classList.contains('collapsed')).toBe(true);
  });
});