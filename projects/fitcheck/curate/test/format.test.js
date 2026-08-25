import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResult } from '../src/format.js';

const sample = {
  target_summary: 'AI PM who can build evals and ship on cloud infra',
  ranked: [
    { id: 'evals', title: 'Built an LLM eval harness', relevance: 5, verdict: 'add', reason: 'Directly matches the evaluation requirement.' },
    { id: 'k8s', title: 'Migrated service to Kubernetes', relevance: 4, verdict: 'promote', reason: 'Cloud infra, a listed plus.' },
    { id: 'warehouse', title: 'Warehouse picking route', relevance: 1, verdict: 'omit', reason: 'Unrelated to this target.' },
  ],
  gaps: [
    { requirement: '5+ years PM experience', severity: 'dealbreaker', suggestion: 'Only mention if you have it.' },
    { requirement: 'Security depth', severity: 'addressable', suggestion: 'Cover-letter it.' },
  ],
};

test('renders target, verdicts, and gaps without color', () => {
  const out = renderResult(sample, { color: false });
  assert.ok(out.includes('TARGET'));
  assert.ok(out.includes('AI PM who can build evals'));
  assert.ok(out.includes('ADD'));
  assert.ok(out.includes('Built an LLM eval harness'));
  assert.ok(out.includes('PROMOTE'));
  assert.ok(out.includes('OMIT'));
  assert.ok(out.includes('GAPS'));
  assert.ok(out.includes('dealbreaker'));
  assert.ok(out.includes('Cover-letter it.'));
});

test('groups verdicts: ADD appears before OMIT', () => {
  const out = renderResult(sample, { color: false });
  assert.ok(out.indexOf('ADD') < out.indexOf('OMIT'));
});

test('handles empty ranked/gaps gracefully', () => {
  const out = renderResult({ target_summary: 'x', ranked: [], gaps: [] }, { color: false });
  assert.ok(out.includes('TARGET'));
  assert.ok(!out.includes('GAPS'));
});

test('color mode adds ansi escape codes', () => {
  const out = renderResult(sample, { color: true });
  assert.ok(out.includes('\x1b['));
});
