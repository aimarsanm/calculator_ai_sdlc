// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mount } = require('../../web/calculator.js');
const html = fs.readFileSync(path.resolve(__dirname, '../../web/index.html'), 'utf8');

const click = (label) => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
  btn.click();
};
const flush = () => new Promise((r) => setTimeout(r, 0));
const mockFetch = (ok, data) => {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok, json: async () => data };
  };
  fn.calls = calls;
  return fn;
};
const text = (id) => document.getElementById(id).textContent;

beforeEach(() => {
  document.documentElement.innerHTML = html.replace(/<script[^>]*><\/script>/, '');
});

describe('renderizado de botones', () => {
  it.each('0123456789+-*/.'.split(''))('renderiza el botón %s', (key) => {
    expect(document.querySelector(`[data-key="${key}"]`)).not.toBeNull();
  });

  it('renderiza C e =', () => {
    expect(document.querySelector('[data-action="clear"]').textContent).toBe('C');
    expect(document.querySelector('[data-action="equals"]').textContent).toBe('=');
  });

  it('muestra 0 inicialmente', () => {
    expect(text('result')).toBe('0');
  });
});

describe('interacción y display', () => {
  it('actualiza la expresión al hacer clic', () => {
    mount(document, mockFetch(true, { result: 0 }));
    ['1', '2', '+', '3'].forEach(click);
    expect(text('expression')).toBe('12+3');
  });

  it('reemplaza operadores consecutivos y completa el punto decimal', () => {
    mount(document, mockFetch(true, { result: 0 }));
    ['7', '+', '*', '.', '5', '.'].forEach(click);
    expect(text('expression')).toBe('7*0.5');
  });

  it('C limpia el display', () => {
    mount(document, mockFetch(true, { result: 0 }));
    ['9', '-', '2'].forEach(click);
    click('C');
    expect(text('expression')).toBe('');
    expect(text('result')).toBe('0');
  });

  it('alterna el tema', () => {
    mount(document, mockFetch(true, { result: 0 }));
    document.getElementById('theme-toggle').click();
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});

describe('integración con backend mockeado', () => {
  it('5 + 3 = muestra 8 y envía la expresión', async () => {
    const fetchFn = mockFetch(true, { result: 8 });
    mount(document, fetchFn);
    ['5', '+', '3', '='].forEach(click);
    await flush();
    expect(fetchFn.calls).toEqual([{ url: '/api/calculate', body: { expression: '5+3' } }]);
    expect(text('result')).toBe('8');
  });

  it('muestra el error de división por cero', async () => {
    mount(document, mockFetch(false, { error: 'División por cero' }));
    ['1', '/', '0', '='].forEach(click);
    await flush();
    expect(text('result')).toBe('División por cero');
    expect(document.getElementById('result').classList.contains('error')).toBe(true);
  });

  it('muestra mensaje ante error de red y se recupera al pulsar una tecla', async () => {
    mount(document, async () => { throw new TypeError('fail'); });
    ['1', '+', '1', '='].forEach(click);
    await flush();
    expect(text('result')).toMatch(/conectar/);
    click('4');
    expect(text('expression')).toBe('4');
    expect(document.getElementById('result').classList.contains('error')).toBe(false);
  });

  it('muestra error genérico ante respuesta inválida', async () => {
    mount(document, mockFetch(false, {}));
    ['2', '+', '2', '='].forEach(click);
    await flush();
    expect(text('result')).toBe('Error desconocido');
  });

  it('continúa con el resultado al pulsar un operador', async () => {
    mount(document, mockFetch(true, { result: 8 }));
    ['5', '+', '3', '='].forEach(click);
    await flush();
    click('*');
    expect(text('expression')).toBe('8*');
  });
});
