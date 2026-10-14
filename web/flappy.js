(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlappyGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 320, H = 440, GROUND = 40;
  const BIRD = { x: 70, r: 12 };
  const GRAVITY = 0.45, FLAP = -7.5, SPEED = 2.2;
  const PIPE_W = 52, GAP = 120, PIPE_EVERY = 100;
  const STORAGE_KEY = 'flappy-best';

  // Lógica pura del juego (sin DOM) para poder probarla de forma determinista.
  function createGame({ storage, random = Math.random } = {}) {
    const load = () => {
      try { return Number(storage && storage.getItem(STORAGE_KEY)) || 0; } catch (e) { return 0; }
    };
    const g = { state: 'ready', y: H / 2, vy: 0, pipes: [], score: 0, best: load(), sincePipe: 0 };

    function reset() {
      Object.assign(g, { y: H / 2, vy: 0, pipes: [], score: 0, sincePipe: PIPE_EVERY });
    }

    function addPipe() {
      const min = 50, max = H - GROUND - GAP - 50;
      g.pipes.push({ x: W, gapY: min + random() * (max - min), scored: false });
    }

    function end() {
      g.state = 'over';
      if (g.score > g.best) {
        g.best = g.score;
        try { storage && storage.setItem(STORAGE_KEY, String(g.best)); } catch (e) { /* sin persistencia */ }
      }
    }

    function flap() {
      if (g.state === 'ready' || g.state === 'over') {
        reset();
        g.state = 'playing';
      }
      g.vy = FLAP;
    }

    function collides(p) {
      const withinX = BIRD.x + BIRD.r > p.x && BIRD.x - BIRD.r < p.x + PIPE_W;
      return withinX && (g.y - BIRD.r < p.gapY || g.y + BIRD.r > p.gapY + GAP);
    }

    function tick() {
      if (g.state !== 'playing') return;
      g.vy += GRAVITY;
      g.y += g.vy;
      g.sincePipe += SPEED;
      if (g.sincePipe >= PIPE_EVERY + PIPE_W + 60) { g.sincePipe = 0; addPipe(); }
      for (const p of g.pipes) {
        p.x -= SPEED;
        if (!p.scored && p.x + PIPE_W < BIRD.x - BIRD.r) { p.scored = true; g.score += 1; }
      }
      g.pipes = g.pipes.filter((p) => p.x + PIPE_W > 0);
      if (g.y - BIRD.r <= 0) { g.y = BIRD.r; return end(); }
      if (g.y + BIRD.r >= H - GROUND) { g.y = H - GROUND - BIRD.r; return end(); }
      if (g.pipes.some(collides)) end();
    }

    return { game: g, flap, tick };
  }

  function draw(ctx, g) {
    ctx.fillStyle = '#4ec0ca'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5cb85c';
    for (const p of g.pipes) {
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - GROUND - p.gapY - GAP);
    }
    ctx.fillStyle = '#ded895'; ctx.fillRect(0, H - GROUND, W, GROUND);
    ctx.fillStyle = '#f7d02c';
    ctx.beginPath(); ctx.arc(BIRD.x, g.y, BIRD.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(String(g.score), W / 2, 50);
    ctx.font = 'bold 20px system-ui, sans-serif';
    if (g.state === 'ready') ctx.fillText('Presiona para jugar', W / 2, H / 2 - 50);
    if (g.state === 'over') ctx.fillText('Game Over', W / 2, H / 2 - 50);
  }

  function mount(doc, opts = {}) {
    const canvas = doc.getElementById('flappy-canvas');
    if (!canvas) return null;
    const win = opts.win || doc.defaultView || {};
    const storage = opts.storage !== undefined ? opts.storage : win.localStorage;
    const { game, flap, tick } = createGame({ storage, random: opts.random });
    const scoreEl = doc.getElementById('flappy-score');
    const bestEl = doc.getElementById('flappy-best');
    const btn = doc.getElementById('flappy-start');
    const ctx = canvas.getContext && canvas.getContext('2d');
    canvas.width = W; canvas.height = H;

    function render() {
      scoreEl.textContent = String(game.score);
      bestEl.textContent = String(game.best);
      btn.textContent = game.state === 'playing' ? 'Saltar' : game.state === 'over' ? 'Reiniciar' : 'Jugar';
      if (ctx) draw(ctx, game);
    }
    const action = () => { flap(); render(); };

    canvas.addEventListener('click', action);
    canvas.addEventListener('touchstart', (e) => { if (e.preventDefault) e.preventDefault(); action(); });
    btn.addEventListener('click', action);
    doc.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target && e.target.tagName;
      if (t === 'BUTTON' && e.target !== btn) return;
      if (e.preventDefault) e.preventDefault();
      action();
    });

    if (opts.loop !== false && win.requestAnimationFrame) {
      const frame = () => { tick(); render(); win.requestAnimationFrame(frame); };
      win.requestAnimationFrame(frame);
    }
    render();
    return { game, flap: action, tick: () => { tick(); render(); } };
  }

  if (typeof document !== 'undefined' && document.getElementById('flappy-canvas')) mount(document);

  return { createGame, mount, STORAGE_KEY, constants: { W, H, GROUND, GAP, PIPE_W } };
});
