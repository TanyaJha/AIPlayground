/**
 * Render a CurateResult as a readable swap list for the terminal.
 * Kept separate (and pure) so it's easy to unit-test without calling the API.
 */

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', cyan: '\x1b[36m', amber: '\x1b[33m', gray: '\x1b[90m',
};

const VERDICT_STYLE = {
  add:     { label: '＋ ADD',     color: C.green },
  promote: { label: '↑ PROMOTE', color: C.cyan },
  keep:    { label: '· KEEP',    color: C.gray },
  demote:  { label: '↓ DEMOTE',  color: C.gray },
  omit:    { label: '× OMIT',    color: C.gray },
};

const VERDICT_ORDER = ['add', 'promote', 'keep', 'demote', 'omit'];

/**
 * @param {import('./schema.js').CurateResult|object} result
 * @param {{color?: boolean}} [opts]
 * @returns {string}
 */
export function renderResult(result, opts = {}) {
  const color = opts.color !== false;
  const paint = (s, code) => (color ? `${code}${s}${C.reset}` : s);

  const out = [];
  out.push(paint('TARGET', C.bold) + '  ' + (result.target_summary || ''));
  out.push('');

  // group by verdict, sort within group by relevance desc
  const byVerdict = new Map(VERDICT_ORDER.map((v) => [v, []]));
  for (const r of result.ranked || []) {
    (byVerdict.get(r.verdict) || byVerdict.get('omit')).push(r);
  }
  for (const list of byVerdict.values()) {
    list.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }

  for (const v of VERDICT_ORDER) {
    const list = byVerdict.get(v);
    if (!list || list.length === 0) continue;
    const style = VERDICT_STYLE[v];
    for (const r of list) {
      const head = paint(style.label.padEnd(9), style.color) +
        ' ' + paint(`[${r.relevance}]`, C.dim) + ' ' + r.title;
      out.push(head);
      if (r.reason) out.push('          ' + paint(r.reason, C.gray));
    }
    out.push('');
  }

  const gaps = result.gaps || [];
  if (gaps.length) {
    out.push(paint('GAPS', C.bold));
    for (const g of gaps) {
      const tag = g.severity === 'dealbreaker'
        ? paint('⚠ dealbreaker', C.amber)
        : paint('◦ addressable', C.gray);
      out.push(`  ${tag}  ${g.requirement}`);
      if (g.suggestion) out.push('                ' + paint(g.suggestion, C.gray));
    }
    out.push('');
  }

  return out.join('\n');
}
