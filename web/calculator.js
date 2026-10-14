(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalculatorUI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const OPERATORS = ['+', '-', '*', '/'];

  // Controlador sin DOM: mantiene el estado y delega el cálculo en el backend.
  function createCalculator({ fetchFn, onChange, onEvaluated }) {
    const state = { expression: '', result: '', error: '' };
    const notify = () => onChange && onChange({ ...state });

    function press(key) {
      if (state.error || state.justEvaluated) {
        const keepResult = state.justEvaluated && !state.error && OPERATORS.includes(key);
        state.expression = keepResult ? state.result : '';
        state.result = '';
        state.error = '';
        state.justEvaluated = false;
      }
      const last = state.expression.slice(-1);
      if (OPERATORS.includes(key)) {
        if (!state.expression) {
          if (key !== '-') return;
        } else if (OPERATORS.includes(last)) {
          state.expression = state.expression.slice(0, -1);
        }
      } else if (key === '.') {
        const current = state.expression.split(/[+\-*/]/).pop();
        if (current.includes('.')) return;
        if (current === '') state.expression += '0';
      }
      state.expression += key;
      notify();
    }

    function clear() {
      state.expression = '';
      state.result = '';
      state.error = '';
      state.justEvaluated = false;
      notify();
    }

    async function evaluate() {
      if (!state.expression || state.justEvaluated) return;
      try {
        const res = await fetchFn('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expression: state.expression }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error desconocido');
        state.result = String(data.result);
        state.justEvaluated = true;
        if (onEvaluated) onEvaluated();
      } catch (e) {
        state.error = e instanceof TypeError ? 'No se pudo conectar con el servidor' : e.message;
      }
      notify();
    }

    function load(value) {
      state.expression = String(value);
      state.result = '';
      state.error = '';
      state.justEvaluated = false;
      notify();
    }

    return { press, clear, evaluate, load, getState: () => ({ ...state }) };
  }

  // Renderiza el historial y lo sincroniza con el backend.
  function createHistory({ doc, fetchFn, onSelect }) {
    const listEl = doc.getElementById('history-list');
    const emptyEl = doc.getElementById('history-empty');

    function render(items) {
      listEl.textContent = '';
      emptyEl.hidden = items.length > 0;
      items.slice().reverse().forEach((item) => {
        const li = doc.createElement('li');
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'history-item';
        btn.dataset.expression = item.expression;
        btn.dataset.result = String(item.result);
        btn.textContent = `${item.expression} = ${item.result}`;
        btn.addEventListener('click', () => onSelect(String(item.result)));
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    }

    async function refresh() {
      try {
        const res = await fetchFn('/api/history');
        const data = await res.json();
        if (res.ok) render(Array.isArray(data.history) ? data.history : []);
      } catch (e) { /* el historial es opcional */ }
    }

    async function clear() {
      try {
        const res = await fetchFn('/api/history', { method: 'DELETE' });
        if (res.ok) render([]);
      } catch (e) { /* sin conexión */ }
    }

    return { refresh, clear, render };
  }

  function mount(doc, fetchFn) {
    const exprEl = doc.getElementById('expression');
    const resultEl = doc.getElementById('result');
    let history = null;
    const calc = createCalculator({
      fetchFn,
      onEvaluated: () => history && history.refresh(),
      onChange(s) {
        exprEl.textContent = s.expression;
        resultEl.textContent = s.error || s.result || (s.expression ? '' : '0');
        resultEl.classList.toggle('error', Boolean(s.error));
      },
    });
    if (doc.getElementById('history-list')) {
      history = createHistory({ doc, fetchFn, onSelect: calc.load });
      doc.getElementById('history-clear').addEventListener('click', history.clear);
      const panel = doc.getElementById('history-panel');
      doc.getElementById('history-toggle').addEventListener('click', () => {
        panel.classList.toggle('collapsed');
      });
      history.refresh();
    }
    doc.querySelectorAll('[data-key]').forEach((btn) =>
      btn.addEventListener('click', () => calc.press(btn.dataset.key)));
    doc.querySelector('[data-action="clear"]').addEventListener('click', calc.clear);
    doc.querySelector('[data-action="equals"]').addEventListener('click', calc.evaluate);
    doc.getElementById('theme-toggle').addEventListener('click', () =>
      doc.documentElement.classList.toggle('light'));
    return calc;
  }

  if (typeof document !== 'undefined' && document.getElementById('expression')) {
    mount(document, (...a) => fetch(...a));
  }

  return { createCalculator, createHistory, mount };
});
