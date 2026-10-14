(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Router = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const VIEWS = ['home', 'calculator', 'flappy'];

  function viewFromHash(hash) {
    const name = String(hash || '').replace(/^#\/?/, '');
    return VIEWS.includes(name) ? name : 'home';
  }

  function mount(doc, win) {
    function show() {
      const current = viewFromHash(win.location.hash);
      doc.querySelectorAll('[data-view]').forEach((el) => {
        el.hidden = el.dataset.view !== current;
      });
      return current;
    }
    win.addEventListener('hashchange', show);
    // Evita que la barra espaciadora haga saltar al pájaro fuera de la vista del juego.
    doc.addEventListener('keydown', (e) => {
      if ((e.code === 'Space' || e.key === ' ') && viewFromHash(win.location.hash) !== 'flappy') e.stopImmediatePropagation();
    }, true);
    return { show, navigate(name) { win.location.hash = name === 'home' ? '#/' : '#/' + name; show(); } };
  }

  if (typeof document !== 'undefined' && document.querySelector('[data-view]')) {
    mount(document, window).show();
  }

  return { mount, viewFromHash, VIEWS };
});
