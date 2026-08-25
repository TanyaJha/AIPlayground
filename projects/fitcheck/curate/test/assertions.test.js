import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAssertions } from '../evals/assertions.js';

const bankIds = ['a', 'b', 'warehouse'];

function baseResult() {
  return {
    target_summary: 'x',
    ranked: [
      { id: 'a', title: 'A', relevance: 5, verdict: 'add', reason: 'r' },
      { id: 'b', title: 'B', relevance: 3, verdict: 'keep', reason: 'r' },
      { id: 'warehouse', title: 'W', relevance: 1, verdict: 'omit', reason: 'r' },
    ],
    gaps: [{ requirement: 'g', severity: 'addressable', suggestion: 's' }],
  };
}

const ctx = (over = {}) => ({ bankIds, hasResume: false, ...over });
const check = (res, id) => res.checks.find((c) => c.id === id);

test('a clean output passes all structural checks', () => {
  const res = runAssertions(baseResult(), ctx());
  assert.equal(res.passed, true);
});

test('catches a hallucinated id', () => {
  const r = baseResult();
  r.ranked.push({ id: 'ghost', title: 'G', relevance: 4, verdict: 'add', reason: 'r' });
  const res = runAssertions(r, ctx());
  assert.equal(check(res, 'ids-valid').ok, false);
  assert.ok(check(res, 'ids-valid').detail.includes('ghost'));
});

test('catches a missing achievement (coverage)', () => {
  const r = baseResult();
  r.ranked = r.ranked.slice(0, 2); // drop warehouse
  const res = runAssertions(r, ctx());
  assert.equal(check(res, 'full-coverage').ok, false);
  assert.ok(check(res, 'full-coverage').detail.includes('warehouse'));
});

test('flags promote/demote when there is no résumé', () => {
  const r = baseResult();
  r.ranked[0].verdict = 'promote';
  const res = runAssertions(r, ctx({ hasResume: false }));
  assert.equal(check(res, 'verdict-legal').ok, false);
});

test('allows promote/demote when a résumé is present', () => {
  const r = baseResult();
  r.ranked[0].verdict = 'promote';
  const res = runAssertions(r, ctx({ hasResume: true }));
  assert.equal(check(res, 'verdict-legal').ok, true);
});

test('relevance out of range fails', () => {
  const r = baseResult();
  r.ranked[0].relevance = 9;
  const res = runAssertions(r, ctx());
  assert.equal(check(res, 'relevance-range').ok, false);
});

test('expectations: min-relevance and must-verdict', () => {
  const res = runAssertions(baseResult(), ctx({
    expect: { minRelevance: { a: 4 }, mustVerdict: { warehouse: ['omit'] } },
  }));
  assert.equal(check(res, 'min-rel:a').ok, true);
  assert.equal(check(res, 'verdict:warehouse').ok, true);
});

test('expectations: weak-fit case (maxStrong + minGaps)', () => {
  // pretend a stretch role: too many strong hits should fail maxStrong
  const r = baseResult();
  r.ranked[1].relevance = 5; // now two strong (a, b)
  const res = runAssertions(r, ctx({ expect: { maxStrong: 1, minGaps: 2 } }));
  assert.equal(check(res, 'max-strong').ok, false);
  assert.equal(check(res, 'min-gaps').ok, false); // only 1 gap
});

test('expectation referencing a missing id fails clearly', () => {
  const res = runAssertions(baseResult(), ctx({ expect: { minRelevance: { nope: 4 } } }));
  assert.equal(check(res, 'min-rel:nope').ok, false);
  assert.ok(check(res, 'min-rel:nope').detail.includes('not in output'));
});
