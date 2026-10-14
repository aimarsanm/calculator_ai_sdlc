// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mount, viewFromHash } = require('../../web/router.js');
const html = fs.readFileSync(path.resolve(__dirname, '../../web/index.html'), 'utf8');

const visible = () => [...document.querySelectorAll('[data-view]')].filter((e) => !e.hidden).map((e) => e.dataset.view);

let router;
beforeEach(() => {
  document.documentElement.innerHTML = html.replace(/<script[^>]*><\/script>/g, '');
  window.location.hash = '';
  router = mount(document, window);
  router.show();
});

describe('pantalla principal', () => {
  it('renderiza los dos botones de navegación y el indicador de historial', () => {
    expect(document.getElementById('nav-calculator').textContent).toMatch(/Calculadora/);
    expect(document.getElementById('nav-calculator').textContent).toMatch(/Historial/);
    expect(document.getElementById('nav-flappy').textContent).toMatch(/Flappy Bird/);
    expect(visible()).toEqual(['home']);
  });

  it('viewFromHash cae en home para rutas desconocidas', () => {
    expect(viewFromHash('#/calculator')).toBe('calculator');
    expect(viewFromHash('#/flappy')).toBe('flappy');
    expect(viewFromHash('#/nada')).toBe('home');
    expect(viewFromHash('')).toBe('home');
  });
});

describe('navegación', () => {
  it('clic en Calculadora muestra la calculadora y volver regresa al inicio', () => {
    window.location.hash = document.getElementById('nav-calculator').getAttribute('href');
    expect(router.show()).toBe('calculator');
    expect(visible()).toEqual(['calculator']);
    window.location.hash = document.querySelector('[data-view="calculator"] .back').getAttribute('href');
    expect(router.show()).toBe('home');
    expect(visible()).toEqual(['home']);
  });

  it('clic en Flappy Bird muestra el juego con botón de volver', () => {
    window.location.hash = document.getElementById('nav-flappy').getAttribute('href');
    expect(router.show()).toBe('flappy');
    expect(visible()).toEqual(['flappy']);
    expect(document.querySelector('[data-view="flappy"] .back')).not.toBeNull();
  });

  it('navigate cambia la vista', () => {
    router.navigate('flappy');
    expect(visible()).toEqual(['flappy']);
    router.navigate('home');
    expect(visible()).toEqual(['home']);
  });
});
