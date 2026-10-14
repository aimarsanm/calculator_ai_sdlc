(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalculatorUI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const OPERATORS = ['+', '-', '*', '/'];

  // Controlador sin DOM: mantiene el estado y delega el cálculo en el backend.
  function createCalculator({ fetchFn, onChange }) {
    const state = { expression: '', result: '', error: '' };
    const notify = () => {
      if (onChange) onChange({ ...state });
      state.fromEvaluate = false;
    };

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
        state.fromEvaluate = true;
      } catch (e) {
        state.error = e instanceof TypeError ? 'No se pudo conectar con el servidor' : e.message;
      }
      notify();
    }

    function load(expression, result) {
      state.expression = String(expression);
      state.result = result === undefined ? '' : String(result);
      state.error = '';
      state.justEvaluated = result !== undefined;
      notify();
    }

    return { press, clear, evaluate, load, getState: () => ({ ...state }) };
  }

  async function fetchHistory(fetchFn) {
    const res = await fetchFn('/api/history');
    const data = await res.json();
    return Array.isArray(data.history) ? data.history : [];
  }

  function renderHistory(listEl, doc, items, onPick) {
    listEl.textContent = '';
    if (!items.length) {
      const empty = doc.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'Sin cálculos';
      listEl.appendChild(empty);
      return;
    }
    [...items].reverse().forEach((item) => {
      const li = doc.createElement('li');
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.textContent = item.expression + ' = ' + item.result;
      btn.addEventListener('click', () => onPick(item));
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function mount(doc, fetchFn) {
    const exprEl = doc.getElementById('expression');
    const resultEl = doc.getElementById('result');
    const listEl = doc.getElementById('history-list');
    const clearHistoryEl = doc.getElementById('history-clear');
    let calc;
    async function refreshHistory() {
      if (!listEl) return;
      try {
        renderHistory(listEl, doc, await fetchHistory(fetchFn), (i) => calc.load(i.expression, i.result));
      } catch (e) { /* historial no disponible */ }
    }
    calc = createCalculator({
      fetchFn,
      onChange(s) {
        exprEl.textContent = s.expression;
        resultEl.textContent = s.error || s.result || (s.expression ? '' : '0');
        resultEl.classList.toggle('error', Boolean(s.error));
        if (s.fromEvaluate && !s.error) refreshHistory();
      },
    });
    if (clearHistoryEl) {
      clearHistoryEl.addEventListener('click', async () => {
        try { await fetchFn('/api/history', { method: 'DELETE' }); } catch (e) { /* ignorar */ }
        await refreshHistory();
      });
    }
    refreshHistory();
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

  return { createCalculator, mount };
});
