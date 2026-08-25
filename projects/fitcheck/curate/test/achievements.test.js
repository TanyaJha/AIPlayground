import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAchievements, slugify, achievementsToPromptBlock } from '../src/achievements.js';

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
