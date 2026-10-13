(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalculatorUI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const OPERATORS = ['+', '-', '*', '/'];

  // Controlador sin DOM: mantiene el estado y delega el cálculo en el backend.
  function createCalculator({ fetchFn, onChange }) {
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
      } catch (e) {
        state.error = e instanceof TypeError ? 'No se pudo conectar con el servidor' : e.message;
      }
      notify();
    }

    return { press, clear, evaluate, getState: () => ({ ...state }) };
  }

  function mount(doc, fetchFn) {
    const exprEl = doc.getElementById('expression');
    const resultEl = doc.getElementById('result');
    const calc = createCalculator({
      fetchFn,
      onChange(s) {
        exprEl.textContent = s.expression;
        resultEl.textContent = s.error || s.result || (s.expression ? '' : '0');
        resultEl.classList.toggle('error', Boolean(s.error));
      },
    });
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
