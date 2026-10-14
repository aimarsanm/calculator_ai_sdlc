// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createGame, mount, STORAGE_KEY } = require('../../web/flappy.js');
const html = fs.readFileSync(path.resolve(__dirname, '../../web/index.html'), 'utf8');

const memStorage = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; }, d };
};

beforeEach(() => {
  document.documentElement.innerHTML = html.replace(/<script[^>]*><\/script>/g, '');
});

describe('lógica del juego', () => {
  it('empieza en estado ready con puntuación 0 y récord cargado', () => {
    const { game } = createGame({ storage: memStorage({ [STORAGE_KEY]: '7' }) });
    expect(game.state).toBe('ready');
    expect(game.score).toBe(0);
    expect(game.best).toBe(7);
  });

  it('flap inicia la partida y la gravedad hace caer al pájaro hasta Game Over', () => {
    const { game, flap, tick } = createGame({ storage: memStorage(), random: () => 0.5 });
    flap();
    expect(game.state).toBe('playing');
    for (let i = 0; i < 500 && game.state === 'playing'; i++) tick();
    expect(game.state).toBe('over');
  });

  it('colisiona con el techo', () => {
    const { game, flap, tick } = createGame({ storage: memStorage() });
    flap();
    for (let i = 0; i < 100 && game.state === 'playing'; i++) flap(), tick();
    expect(game.state).toBe('over');
  });

  it('guarda el récord en localStorage y permite reiniciar', () => {
    const storage = memStorage();
    const { game, flap, tick } = createGame({ storage });
    flap();
    game.score = 5;
    for (let i = 0; i < 500 && game.state === 'playing'; i++) tick();
    expect(game.state).toBe('over');
    expect(storage.d[STORAGE_KEY]).toBe('5');
    flap();
    expect(game.state).toBe('playing');
    expect(game.score).toBe(0);
    expect(game.best).toBe(5);
  });

  it('genera tuberías y puntúa al superarlas', () => {
    const { game, flap, tick } = createGame({ storage: memStorage(), random: () => 0.5 });
    flap();
    const gapCenter = () => (game.pipes[0] ? game.pipes[0].gapY + 60 : 220);
    for (let i = 0; i < 400 && game.state === 'playing' && game.score < 1; i++) {
      if (game.y > gapCenter() + 10) flap();
      tick();
    }
    expect(game.pipes.length).toBeGreaterThan(0);
    expect(game.score).toBeGreaterThanOrEqual(1);
  });
});

describe('componente en el DOM', () => {
  it('renderiza canvas, puntuación inicial y botón Jugar', () => {
    mount(document, { loop: false, storage: memStorage() });
    expect(document.getElementById('flappy-canvas')).not.toBeNull();
    expect(document.getElementById('flappy-score').textContent).toBe('0');
    expect(document.getElementById('flappy-best').textContent).toBe('0');
    expect(document.getElementById('flappy-start').textContent).toBe('Jugar');
  });

  it('clic en el canvas, tecla espacio y botón inician el juego', () => {
    const f = mount(document, { loop: false, storage: memStorage() });
    document.getElementById('flappy-canvas').click();
    expect(f.game.state).toBe('playing');
    expect(document.getElementById('flappy-start').textContent).toBe('Saltar');

    const g2 = mount(document, { loop: false, storage: memStorage() });
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    expect(g2.game.state).toBe('playing');
  });

  it('muestra Reiniciar tras Game Over', () => {
    const f = mount(document, { loop: false, storage: memStorage() });
    f.flap();
    for (let i = 0; i < 500 && f.game.state === 'playing'; i++) f.tick();
    expect(document.getElementById('flappy-start').textContent).toBe('Reiniciar');
  });
});
