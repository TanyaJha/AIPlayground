/**
 * Assertions — the deterministic tripwire.
 *
 * These are pass/fail statements about a Curate result that need NO AI: they run
 * in plain code, instantly and for free. They catch black-and-white breakage
 * (a hallucinated id, a missing achievement, an illegal verdict) before we spend
 * a judge call on nuance. Two layers:
 *   - structural: always true of any valid output
 *   - expectations: per-case certainties YOU encode in expect.json
 */

const LEGAL_VERDICTS_WITH_RESUME = new Set(['add', 'promote', 'keep', 'demote', 'omit']);
const LEGAL_VERDICTS_NO_RESUME = new Set(['add', 'keep', 'omit']);
const LEGAL_SEVERITY = new Set(['dealbreaker', 'addressable']);

function findById(ranked, id) {
  return (ranked || []).find((r) => r.id === id);
}

function countStrong(ranked) {
  return (ranked || []).filter((r) => (r.relevance || 0) >= 4).length;
}

/**
 * @param {object} result  a CurateResult
 * @param {{bankIds: string[], hasResume: boolean, expect?: object}} ctx
 * @returns {{passed: boolean, checks: Array<{id:string, ok:boolean, detail:string}>}}
 */
export function runAssertions(result, ctx) {
  const { bankIds, hasResume, expect = {} } = ctx;
  const bank = new Set(bankIds);
  const ranked = result.ranked || [];
  const gaps = result.gaps || [];
  const checks = [];
  const add = (id, ok, detail = '') => checks.push({ id, ok, detail });

  // --- structural ---
  const badIds = ranked.map((r) => r.id).filter((id) => !bank.has(id));
  add('ids-valid', badIds.length === 0,
    badIds.length ? `hallucinated ids: ${badIds.join(', ')}` : '');

  const rankedIds = ranked.map((r) => r.id);
  const seen = new Set(rankedIds);
  const missing = bankIds.filter((id) => !seen.has(id));
  const dupes = rankedIds.filter((id, i) => rankedIds.indexOf(id) !== i);
  add('full-coverage', missing.length === 0 && dupes.length === 0,
    [missing.length ? `missing: ${missing.join(', ')}` : '',
     dupes.length ? `duplicated: ${[...new Set(dupes)].join(', ')}` : ''].filter(Boolean).join('; '));

  const badRel = ranked.filter((r) => !Number.isInteger(r.relevance) || r.relevance < 1 || r.relevance > 5);
  add('relevance-range', badRel.length === 0,
    badRel.length ? `out-of-range: ${badRel.map((r) => `${r.id}=${r.relevance}`).join(', ')}` : '');

  const legal = hasResume ? LEGAL_VERDICTS_WITH_RESUME : LEGAL_VERDICTS_NO_RESUME;
  const badVerdict = ranked.filter((r) => !legal.has(r.verdict));
  add('verdict-legal', badVerdict.length === 0,
    badVerdict.length
      ? `illegal for ${hasResume ? 'résumé' : 'no-résumé'} mode: ${badVerdict.map((r) => `${r.id}:${r.verdict}`).join(', ')}`
      : '');

  const badSev = gaps.filter((g) => !LEGAL_SEVERITY.has(g.severity));
  add('gap-severity-legal', badSev.length === 0,
    badSev.length ? `illegal severities: ${badSev.map((g) => g.severity).join(', ')}` : '');

  // --- expectations (per-case certainties) ---
  const strong = countStrong(ranked);
  if (expect.minStrong != null)
    add('min-strong', strong >= expect.minStrong, `strong(≥4)=${strong}, need ≥${expect.minStrong}`);
  if (expect.maxStrong != null)
    add('max-strong', strong <= expect.maxStrong, `strong(≥4)=${strong}, allow ≤${expect.maxStrong}`);
  if (expect.minGaps != null)
    add('min-gaps', gaps.length >= expect.minGaps, `gaps=${gaps.length}, need ≥${expect.minGaps}`);

  for (const [id, min] of Object.entries(expect.minRelevance || {})) {
    const r = findById(ranked, id);
    add(`min-rel:${id}`, !!r && r.relevance >= min,
      r ? `relevance=${r.relevance}, need ≥${min}` : `id "${id}" not in output`);
  }
  for (const [id, max] of Object.entries(expect.maxRelevance || {})) {
    const r = findById(ranked, id);
    add(`max-rel:${id}`, !!r && r.relevance <= max,
      r ? `relevance=${r.relevance}, allow ≤${max}` : `id "${id}" not in output`);
  }
  for (const [id, allowed] of Object.entries(expect.mustVerdict || {})) {
    const r = findById(ranked, id);
    const set = Array.isArray(allowed) ? allowed : [allowed];
    add(`verdict:${id}`, !!r && set.includes(r.verdict),
      r ? `verdict=${r.verdict}, allow one of [${set.join(', ')}]` : `id "${id}" not in output`);
  }

  return { passed: checks.every((c) => c.ok), checks };
}
