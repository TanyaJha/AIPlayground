import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAchievements,
  slugify,
  achievementsToPromptBlock,
  parseBank,
  bankEntryToEntry,
  loadAchievements,
} from '../src/achievements.js';

test('slugify makes short stable ids', () => {
  assert.equal(slugify('Migrated auth service to GKE'), 'migrated-auth-service-to-gke');
  assert.equal(slugify('  Weird!! Title??  '), 'weird-title');
  assert.equal(slugify(''), 'achievement');
});

test('parses each ## heading into an entry', () => {
  const md = `# My bank
## First thing
did a thing
impact: 10% better

## Second thing
did another thing`;
  const entries = parseAchievements(md);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, 'first-thing');
  assert.equal(entries[0].title, 'First thing');
  assert.ok(entries[0].text.includes('did a thing'));
  assert.ok(entries[0].text.includes('impact: 10% better'));
  assert.equal(entries[1].title, 'Second thing');
});

test('ignores content before the first heading', () => {
  const md = `intro line that is not an achievement
## Only one
body`;
  const entries = parseAchievements(md);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, 'Only one');
});

test('gives duplicate titles distinct ids', () => {
  const md = `## Same
a
## Same
b`;
  const entries = parseAchievements(md);
  assert.equal(entries[0].id, 'same');
  assert.equal(entries[1].id, 'same-2');
});

test('empty input yields no entries', () => {
  assert.deepEqual(parseAchievements(''), []);
  assert.deepEqual(parseAchievements('no headings here\njust text'), []);
});

test('prompt block includes ids and titles', () => {
  const entries = parseAchievements('## Alpha\nbody one\n## Beta\nbody two');
  const block = achievementsToPromptBlock(entries);
  assert.ok(block.includes('[alpha] Alpha'));
  assert.ok(block.includes('body two'));
});

// --- bank.json (the source of truth) ---

test('bankEntryToEntry folds evidence, metrics, scope, tags, and guardrails into text', () => {
  const entry = bankEntryToEntry({
    id: 'checkout-rewrite',
    title: 'Rebuilt checkout 0->1',
    raw_evidence: 'Took legacy checkout to launch as a new service.',
    metrics: [{ value: '+18% conversion', basis: 'A/B 6 weeks', confidence: 'hard' }],
    scope: { role: 'PM', ownership: 'owned', team_size: '8 engineers' },
    tags: ['0-to-1', 'payments'],
    guardrails: ['Say incremental ARR, not the internal figure.'],
    visibility: 'public',
  });
  assert.equal(entry.id, 'checkout-rewrite');
  assert.equal(entry.title, 'Rebuilt checkout 0->1');
  assert.ok(entry.text.includes('Took legacy checkout'));
  assert.ok(entry.text.includes('+18% conversion (A/B 6 weeks; hard)'));
  assert.ok(entry.text.includes('Scope: PM, owned, 8 engineers'));
  assert.ok(entry.text.includes('Tags: 0-to-1, payments'));
  assert.ok(entry.text.includes('Must not claim: Say incremental ARR'));
});

test('bankEntryToEntry derives an id from the title when none is given', () => {
  const entry = bankEntryToEntry({ title: 'Migrated auth service', raw_evidence: 'x' });
  assert.equal(entry.id, 'migrated-auth-service');
});

test('parseBank reads a top-level array', () => {
  const json = JSON.stringify([
    { id: 'a', title: 'A', raw_evidence: 'did a', visibility: 'public' },
    { id: 'b', title: 'B', raw_evidence: 'did b', visibility: 'private' },
  ]);
  const entries = parseBank(json);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, 'a');
  assert.ok(entries[1].text.includes('did b')); // private entries are still scored locally
});

test('parseBank accepts {entries:[...]} and dedups ids', () => {
  const json = JSON.stringify({
    entries: [
      { id: 'x', title: 'X', raw_evidence: 'a', visibility: 'public' },
      { id: 'x', title: 'X again', raw_evidence: 'b', visibility: 'public' },
    ],
  });
  const entries = parseBank(json);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, 'x');
  assert.equal(entries[1].id, 'x-2');
});

test('parseBank throws a clear error on malformed JSON', () => {
  assert.throws(() => parseBank('{not json'), /didn't parse as JSON/);
  assert.throws(() => parseBank('42'), /must be an array of entries/);
});

test('loadAchievements auto-detects JSON vs markdown', () => {
  const md = loadAchievements('## Alpha\nbody');
  assert.equal(md[0].id, 'alpha');
  const js = loadAchievements('[{"id":"beta","title":"Beta","raw_evidence":"b","visibility":"public"}]');
  assert.equal(js[0].id, 'beta');
});
