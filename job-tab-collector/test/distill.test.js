/**
 * Tests for the section distiller.
 *
 * The fixture below mirrors the shape of a real posting: company blurb first,
 * the actual job in the middle, legal boilerplate at the end. That ordering is
 * the whole reason this module exists — a naive character cap keeps the blurb
 * and discards the qualifications.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { distill, classifyHeading } from '../src/lib/distill.js';

const POSTING = `Senior Product Manager, Search Intelligence

## About Google
Google is a global technology company. Our mission is to organize the world's
information and make it universally accessible and useful. We have been named
one of the best places to work for fifteen consecutive years, and our culture
of innovation is second to none. Since our founding we have grown from a
research project into a company serving billions of people across search,
video, cloud, and mobile. We believe that great things happen when diverse
perspectives come together, and we have built our workplace around that
conviction. Our offices span more than fifty countries and our employees speak
over a hundred languages. Everything we build starts with the user, and we
measure our success by the difference we make in people's daily lives. We are
relentlessly focused on the long term, willing to invest years in problems
that matter, and unafraid to change direction when the evidence tells us to.

## Why join us
You'll be surrounded by brilliant colleagues in a fast-paced environment where
your ideas matter. We move fast and think big. You will have access to
world-class infrastructure, generous learning budgets, and mentorship from
some of the most accomplished practitioners in the industry. Our teams operate
with a high degree of autonomy, and we trust people to make decisions close to
the work. We invest heavily in internal mobility, so the role you start in is
rarely the role you finish in.

## About the role
FLAG_ROLE As a Senior Product Manager on Search Intelligence, you will define
the roadmap for ranking quality and lead a cross-functional team.

## Minimum qualifications
- FLAG_MINQUAL Bachelor's degree or equivalent practical experience
- 8 years of experience in product management
- Experience with data analysis and SQL

## Preferred qualifications
- FLAG_PREFQUAL MBA or advanced degree in a quantitative field
- Experience shipping machine learning products at scale
- Excellent written and verbal communication skills

## Responsibilities
- FLAG_RESP Define and drive the product roadmap for search ranking
- Partner with engineering and UX to ship features
- Analyze metrics and run experiments

## Benefits and perks
FLAG_BENEFITS Comprehensive health insurance, generous parental leave, free
meals, on-site gym, and a annual wellness stipend.

## Equal Opportunity Employer
FLAG_EEO Google is proud to be an equal opportunity workplace and is an
affirmative action employer. We do not discriminate on the basis of race,
color, religion, or veteran status.

## Similar jobs
FLAG_SIMILAR Product Manager, Ads. Product Manager, Cloud.
`;

const has = (text, flag) => text.includes(flag);

// --------------------------------------------------------- classifyHeading

test('role and qualification headings are kept', () => {
  for (const h of [
    'Responsibilities', 'Minimum qualifications', 'Preferred Qualifications',
    'About the role', "What you'll do", 'Requirements', 'Who you are',
    'Basic Qualifications', 'What we are looking for', 'Skills',
  ]) {
    assert.equal(classifyHeading(h), 'keep', `"${h}" should be kept`);
  }
});

test('company boilerplate and legal headings are dropped', () => {
  for (const h of [
    'About us', 'About Google', 'Why join us', 'Our mission', 'Our culture',
    'Benefits and perks', 'Equal Opportunity Employer', 'Diversity and Inclusion',
    'Similar jobs', 'What we offer', 'Life at Acme',
  ]) {
    assert.equal(classifyHeading(h), 'drop', `"${h}" should be dropped`);
  }
});

test('pay information is kept, not treated as benefits fluff', () => {
  for (const h of ['Salary range', 'Compensation', 'Pay Transparency Notice', 'Base pay']) {
    assert.equal(classifyHeading(h), 'keep', `"${h}" should be kept`);
  }
});

test('an unrecognised heading is neither kept nor dropped outright', () => {
  assert.equal(classifyHeading('Some Unusual Heading We Never Anticipated'), 'unknown');
});

test('trailing punctuation on a heading does not defeat matching', () => {
  assert.equal(classifyHeading('Responsibilities:'), 'keep');
  assert.equal(classifyHeading('About us —'), 'drop');
});

// ----------------------------------------------------------------- distill

test('the job content survives and the fluff does not', () => {
  const { text } = distill(POSTING, { maxChars: 100000 });

  for (const flag of ['FLAG_ROLE', 'FLAG_MINQUAL', 'FLAG_PREFQUAL', 'FLAG_RESP']) {
    assert.ok(has(text, flag), `${flag} should have been kept`);
  }
  for (const flag of ['FLAG_BENEFITS', 'FLAG_EEO', 'FLAG_SIMILAR']) {
    assert.ok(!has(text, flag), `${flag} should have been dropped`);
  }
});

test('distilling meaningfully shrinks a posting', () => {
  const { originalChars, chars, distilled } = distill(POSTING, { maxChars: 100000 });
  assert.equal(distilled, true);
  assert.ok(chars < originalChars * 0.75,
    `expected a real reduction, got ${originalChars} -> ${chars}`);
});

test('kept and dropped sections are both reported', () => {
  const { kept, dropped } = distill(POSTING, { maxChars: 100000 });
  assert.ok(kept.includes('Responsibilities'));
  assert.ok(kept.includes('Preferred qualifications'));
  assert.ok(dropped.includes('About Google'));
  assert.ok(dropped.includes('Equal Opportunity Employer'));
});

test('THE BUG THIS FIXES: qualifications survive a tight cap', () => {
  // 1200 chars is far less than the posting. Truncating the raw text at that
  // length keeps only the company blurb; distilling first keeps the job.
  const naive = POSTING.slice(0, 1200);
  assert.ok(!has(naive, 'FLAG_PREFQUAL'),
    'sanity check: naive truncation loses the preferred qualifications');

  const { text } = distill(POSTING, { maxChars: 1200 });
  assert.ok(has(text, 'FLAG_MINQUAL'), 'minimum qualifications survive the cap');
  assert.ok(has(text, 'FLAG_RESP'), 'responsibilities survive the cap');
  assert.ok(!has(text, 'FLAG_EEO'), 'EEO boilerplate still dropped');
});

test('unknown sections are kept by default rather than silently discarded', () => {
  const text = [
    '## Responsibilities', 'Do the thing.',
    '## Wildcard Section Name', 'KEEP_ME something potentially important.',
  ].join('\n');
  assert.ok(distill(text, { maxChars: 10000 }).text.includes('KEEP_ME'));
});

test('unknown sections can be dropped when asked', () => {
  const text = [
    '## Responsibilities', 'Do the thing.',
    '## Wildcard Section Name', 'DROP_ME something.',
  ].join('\n');
  const { text: out } = distill(text, { maxChars: 10000, keepUnknown: false });
  assert.ok(!out.includes('DROP_ME'));
  assert.ok(out.includes('Do the thing.'));
});

test('text with no headings is passed through untouched', () => {
  const plain = 'Just one long paragraph of job description with no structure at all.';
  const { text, distilled } = distill(plain, { maxChars: 10000 });
  assert.equal(distilled, false);
  assert.equal(text, plain);
});

test('a posting that is entirely boilerplate falls back rather than returning nothing', () => {
  const allFluff = [
    '## About us', 'We are a company.',
    '## Benefits', 'We have benefits.',
    '## Equal Opportunity Employer', 'We are one.',
  ].join('\n');
  const { text, distilled } = distill(allFluff, { maxChars: 10000 });
  assert.equal(distilled, false, 'falls back instead of distilling to empty');
  assert.ok(text.includes('We are a company.'), 'original text is returned');
});

test('the preamble before the first heading is kept but bounded', () => {
  const long = `${'x'.repeat(3000)}\n## Responsibilities\nDo the thing.`;
  const { text } = distill(long, { maxChars: 100000, preambleMax: 500 });
  assert.ok(text.includes('Do the thing.'));
  assert.ok(text.length < 1200, `preamble should be capped, got ${text.length} chars`);
});

test('truncation is flagged and marked in the text', () => {
  const big = ['## Responsibilities', 'y'.repeat(5000)].join('\n');
  const { truncated, text } = distill(big, { maxChars: 500 });
  assert.equal(truncated, true);
  assert.ok(text.includes('[truncated]'));
});

test('empty input does not throw', () => {
  assert.equal(distill('').text, '');
  assert.equal(distill(undefined).text, '');
});
