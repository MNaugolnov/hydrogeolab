// Tiny TeX-subset -> HTML renderer (build time, no dependencies).
// Supports: \frac, \sqrt, ^, _, \left( \right), \ln \sin \log \mathrm \text,
// greek letters, \cdot \, \; \le \ge \ll \approx \times \sum \Delta.
const GREEK = { pi: 'π', rho: 'ρ', mu: 'μ', eta: 'η', alpha: 'α', beta: 'β', Sigma: 'Σ', sum: 'Σ',
  Delta: 'Δ', delta: 'δ', lambda: 'λ', phi: 'φ', Phi: 'Φ', gamma: 'γ', sigma: 'σ', tau: 'τ', varepsilon: 'ε' };
const SYM = { cdot: '·', times: '×', le: '≤', ge: '≥', ll: '≪', approx: '≈', ',': ' ', ';': ' ',
  quad: ' ', to: '→', pm: '±', infty: '∞', neq: '≠', ldots: '…' };
const FUN = ['ln', 'sin', 'cos', 'tg', 'ctg', 'log', 'lg', 'exp', 'min', 'max', 'sqrt'];

function tokenize(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      let j = i + 1;
      if (/[a-zA-Z]/.test(s[j])) { while (j < s.length && /[a-zA-Z]/.test(s[j])) j++; }
      else j++;
      t.push({ cmd: s.slice(i + 1, j) }); i = j; continue;
    }
    if (c === ' ') { i++; continue; }
    t.push({ ch: c }); i++;
  }
  return t;
}

function render(src) {
  const toks = tokenize(src); let p = 0;
  const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function group() {                 // {...} or single atom
    if (toks[p] && toks[p].ch === '{') {
      p++; const out = seq('}'); p++; return out;
    }
    return atom();
  }
  function rawText() {               // {text}
    let s = ''; if (toks[p] && toks[p].ch === '{') p++;
    let depth = 1;
    while (p < toks.length) {
      const tk = toks[p];
      if (tk.ch === '{') depth++;
      if (tk.ch === '}') { depth--; if (!depth) { p++; break; } }
      s += tk.ch !== undefined ? tk.ch : '\\' + tk.cmd; p++;
    }
    return s;
  }
  function atom() {
    const tk = toks[p++];
    if (!tk) return '';
    if (tk.cmd !== undefined) {
      const c = tk.cmd;
      if (c === 'frac') { const a = group(), b = group(); return `<span class="m-fr"><span class="m-n">${a}</span><span class="m-d">${b}</span></span>`; }
      if (c === 'sqrt') { const a = group(); return `<span class="m-sq"><span class="m-sqs">√</span><span class="m-sqb">${a}</span></span>`; }
      if (c === 'left') { const d = toks[p++]; return `<span class="m-lp">${esc(d.ch || '')}</span>`; }
      if (c === 'right') { const d = toks[p++]; return `<span class="m-lp">${esc(d.ch || '')}</span>`; }
      if (c === 'mathrm' || c === 'text' || c === 'operatorname') return `<span class="m-up">${esc(rawText())}</span>`;
      if (FUN.includes(c)) return `<span class="m-fn">${c}</span>`;
      if (GREEK[c]) return `<i class="m-g">${GREEK[c]}</i>`;
      if (SYM[c]) return `<span class="m-op">${SYM[c]}</span>`;
      if (c === '{' || c === '}') return c;
      return esc(c);
    }
    const ch = tk.ch;
    if (ch === '{') { const out = seq('}'); p++; return out; }
    if (/[a-zA-Z]/.test(ch)) return `<i>${ch}</i>`;
    if ('=+-<>'.includes(ch)) return `<span class="m-op">${ch === '-' ? '−' : esc(ch)}</span>`;
    if (ch === '*') return '·';
    return esc(ch);
  }
  function seq(end) {
    let out = '';
    while (p < toks.length && !(end && toks[p].ch === end)) {
      let a = atom();
      // scripts
      while (toks[p] && (toks[p].ch === '^' || toks[p].ch === '_')) {
        const kind = toks[p].ch; p++;
        const g = group();
        a = kind === '^' ? `${a}<sup>${g}</sup>` : `${a}<sub>${g}</sub>`;
      }
      out += a;
    }
    return out;
  }
  return `<span class="m">${seq(null)}</span>`;
}
module.exports = { render };
