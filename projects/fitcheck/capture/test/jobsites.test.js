/**
 * Tests for the pure logic in src/lib/jobsites.js.
 *
 * These are the parts most likely to break silently: a bad normalization rule
 * means duplicate entries, a bad detection rule means job tabs don't get
 * pre-checked. Run with:  node --test test/
 *
 * No Chrome APIs are touched here, so this runs in plain Node.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectSite, normalizeUrl, inferCompany, cleanTitle, tabToJob,
} from '../src/lib/jobsites.js';

// ------------------------------------------------------------ normalizeUrl

test('LinkedIn job URLs collapse to the job id', () => {
  const withNoise =
    'https://www.linkedin.com/jobs/view/4212345678/?refId=abc%3D%3D&trackingId=xyz&position=3&pageNum=0';
  assert.equal(normalizeUrl(withNoise), 'https://www.linkedin.com/jobs/view/4212345678');
});

test('LinkedIn collection pages resolve to the highlighted job', () => {
  const collection =
    'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4212345678&discover=true';
  assert.equal(normalizeUrl(collection), 'https://www.linkedin.com/jobs/view/4212345678');
});

test('the same LinkedIn job from two entry points dedupes to one key', () => {
  const a = 'https://www.linkedin.com/jobs/view/4212345678/?refId=aaa';
  const b = 'https://linkedin.com/jobs/view/4212345678?trackingId=bbb&position=9';
  assert.equal(normalizeUrl(a), normalizeUrl(b));
});

test('Google Careers URLs collapse to the numeric job id', () => {
  const url =
    'https://www.google.com/about/careers/applications/jobs/results/98765432100-senior-data-scientist?src=Online&utm_source=linkedin';
  assert.equal(
    normalizeUrl(url),
    'https://www.google.com/about/careers/applications/jobs/results/98765432100'
  );
});

test('Google Careers dedupes across slug changes', () => {
  const a = 'https://www.google.com/about/careers/applications/jobs/results/123-data-scientist';
  const b = 'https://www.google.com/about/careers/applications/jobs/results/123-data-scientist-iii?location=US';
  assert.equal(normalizeUrl(a), normalizeUrl(b));
});

test('Indeed URLs collapse to the jk key', () => {
  const url = 'https://www.indeed.com/viewjob?jk=abc123def456&from=serp&vjk=zzz&tk=qqq';
  assert.equal(normalizeUrl(url), 'https://indeed.com/viewjob?jk=abc123def456');
});

test('tracking params are stripped but real params survive', () => {
  const url = 'https://job-boards.greenhouse.io/acme/jobs/4567?gh_src=abcd&utm_source=li&lang=en';
  const out = normalizeUrl(url);
  assert.ok(!out.includes('gh_src'), 'gh_src should be stripped');
  assert.ok(!out.includes('utm_source'), 'utm_source should be stripped');
  assert.ok(out.includes('lang=en'), 'a meaningful param should survive');
});

test('trailing slashes and www do not create duplicates', () => {
  const a = 'https://www.jobs.lever.co/acme/abc-123/';
  const b = 'https://jobs.lever.co/acme/abc-123';
  assert.equal(normalizeUrl(a), normalizeUrl(b));
});

test('unparseable input is returned unchanged rather than throwing', () => {
  assert.equal(normalizeUrl('not a url'), 'not a url');
});

// -------------------------------------------------------------- detectSite

test('a LinkedIn job page is a job; the LinkedIn feed is not', () => {
  assert.equal(detectSite('https://www.linkedin.com/jobs/view/4212345678').isJob, true);
  assert.equal(detectSite('https://www.linkedin.com/feed/').isJob, false);
});

test('LinkedIn and Indeed are flagged as not fetchable', () => {
  assert.equal(detectSite('https://www.linkedin.com/jobs/view/123').fetchable, false);
  assert.equal(detectSite('https://www.indeed.com/viewjob?jk=abc').fetchable, false);
});

test('Google Careers is detected and marked fetchable', () => {
  const d = detectSite('https://www.google.com/about/careers/applications/jobs/results/123-swe');
  assert.equal(d.isJob, true);
  assert.equal(d.fetchable, true);
  assert.equal(d.source, 'Google Careers');
});

test('a non-careers Google URL is not treated as a job', () => {
  assert.equal(detectSite('https://www.google.com/search?q=data+scientist').isJob, false);
});

test('ATS boards are detected', () => {
  for (const url of [
    'https://job-boards.greenhouse.io/anthropic/jobs/4001',
    'https://jobs.lever.co/acme/abc-123',
    'https://jobs.ashbyhq.com/acme/xyz',
    'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/123',
  ]) {
    assert.equal(detectSite(url).isJob, true, `${url} should be detected as a job`);
  }
});

test('a generic company careers page is detected', () => {
  assert.equal(detectSite('https://careers.acmecorp.com/openings/42').isJob, true);
  assert.equal(detectSite('https://acmecorp.com/careers/data-scientist').isJob, true);
});

test('ordinary browsing is not mistaken for a job posting', () => {
  for (const url of [
    'https://news.ycombinator.com/',
    'https://mail.google.com/mail/u/0/#inbox',
    'https://docs.python.org/3/library/re.html',
    'https://github.com/anthropics/claude-code',
  ]) {
    assert.equal(detectSite(url).isJob, false, `${url} should not be a job`);
  }
});

test('non-http schemes are rejected safely', () => {
  assert.equal(detectSite('chrome://extensions').isJob, false);
  assert.equal(detectSite('about:blank').isJob, false);
});

// ------------------------------------------------------------ inferCompany

test('company is inferred from ATS URL structure', () => {
  const cases = [
    ['https://job-boards.greenhouse.io/anthropic/jobs/4001', 'Anthropic'],
    ['https://jobs.lever.co/acme/abc-123', 'Acme'],
    ['https://bigco.breezy.hr/p/xyz', 'Bigco'],
    ['https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1', 'Acme'],
  ];
  for (const [url, expected] of cases) {
    const { site } = detectSite(url);
    assert.equal(inferCompany(url, site), expected, `failed for ${url}`);
  }
});

test('big-tech boards return a fixed company name', () => {
  const url = 'https://www.google.com/about/careers/applications/jobs/results/123-swe';
  const { site } = detectSite(url);
  assert.equal(inferCompany(url, site), 'Google');
});

// -------------------------------------------------------------- cleanTitle

test('LinkedIn "X hiring Y in Z" yields both role and company', () => {
  const { title, company } = cleanTitle(
    '(3) Acme Corp hiring Senior Data Scientist in Boston, MA | LinkedIn',
    'LinkedIn'
  );
  assert.equal(title, 'Senior Data Scientist');
  assert.equal(company, 'Acme Corp');
});

test('the unread-count prefix is removed', () => {
  const { title } = cleanTitle('(12) Data Analyst | LinkedIn', 'LinkedIn');
  assert.equal(title, 'Data Analyst');
});

test('Greenhouse application titles are parsed', () => {
  const { title, company } = cleanTitle('Job Application for Research Engineer at Anthropic', 'Greenhouse');
  assert.equal(title, 'Research Engineer');
  assert.equal(company, 'Anthropic');
});

test('a site-name suffix is stripped', () => {
  assert.equal(cleanTitle('Machine Learning Engineer - Indeed.com', 'Indeed').title,
    'Machine Learning Engineer');
});

test('an empty or missing title degrades gracefully', () => {
  assert.equal(cleanTitle('', 'LinkedIn').title, '(untitled)');
  assert.equal(cleanTitle(undefined, 'LinkedIn').title, '(untitled)');
});

test('a plain title is left alone', () => {
  assert.equal(cleanTitle('Staff Data Scientist, Search', 'Company site').title,
    'Staff Data Scientist, Search');
});

// ----------------------------------------------------------------- tabToJob

test('tabToJob produces a complete record with a content slot for v2', () => {
  const job = tabToJob({
    url: 'https://www.google.com/about/careers/applications/jobs/results/555-data-scientist?src=li',
    title: 'Data Scientist — Google Careers',
    favIconUrl: 'https://www.google.com/favicon.ico',
  });

  assert.equal(job.company, 'Google');
  assert.equal(job.source, 'Google Careers');
  assert.equal(job.isJob, true);
  assert.equal(job.fetchable, true);
  assert.equal(job.normalizedUrl,
    'https://www.google.com/about/careers/applications/jobs/results/555');
  assert.equal(job.content, null, 'content slot exists and is empty until v2');
  assert.ok(job.savedAt, 'savedAt is stamped');
});

test('tabToJob keeps the original URL alongside the normalized one', () => {
  const original = 'https://www.linkedin.com/jobs/view/999/?refId=keepme';
  const job = tabToJob({ url: original, title: 'Analyst | LinkedIn' });
  assert.equal(job.url, original, 'the clickable URL is preserved');
  assert.notEqual(job.url, job.normalizedUrl, 'the dedupe key is separate');
});

test('Indeed "Role - Company - Location" titles are split', () => {
  const { title, company } = cleanTitle('Data Analyst - Acme Inc - Indeed.com', 'Indeed');
  assert.equal(title, 'Data Analyst');
  assert.equal(company, 'Acme Inc');
});

test('the dash split does not mangle hyphenated titles on other sources', () => {
  const { title, company } = cleanTitle('Senior Data Scientist - Search Ranking', 'Greenhouse');
  assert.equal(title, 'Senior Data Scientist - Search Ranking');
  assert.equal(company, null);
});

// --------------------------------------------------- board coverage guard
//
// These exist because a batch of site definitions was once added by string
// replacement that silently didn't match, and the sites appeared supported
// while not being detected at all. A representative URL per board catches that.

test('every major ATS is detected from a realistic URL', () => {
  const cases = [
    ['https://job-boards.greenhouse.io/anthropic/jobs/4001', 'Greenhouse'],
    ['https://boards.greenhouse.io/stripe/jobs/5566', 'Greenhouse'],
    ['https://jobs.lever.co/figma/abc-123', 'Lever'],
    ['https://jobs.ashbyhq.com/openai/xyz', 'Ashby'],
    ['https://apply.workable.com/acme/j/ABC/', 'Workable'],
    ['https://jobs.smartrecruiters.com/Acme/743999', 'SmartRecruiters'],
    ['https://acme.wd5.myworkdayjobs.com/en-US/careers/job/123', 'Workday'],
    ['https://acme.breezy.hr/p/xyz', 'Breezy'],
    ['https://careers.acme.icims.com/jobs/1234/x/job', 'iCIMS'],
    ['https://acme.applytojob.com/apply/xyz', 'JazzHR'],
    ['https://acme.csod.com/ux/ats/careersite/1/home', 'Cornerstone'],
    ['https://acme.avature.net/careers/JobDetail/123', 'Avature'],
    ['https://acme.recruitee.com/o/engineer', 'Recruitee'],
    ['https://acme.bamboohr.com/careers/42', 'BambooHR'],
  ];
  for (const [url, expected] of cases) {
    const d = detectSite(url);
    assert.equal(d.isJob, true, `${url} should be detected`);
    assert.equal(d.source, expected, `${url} should be ${expected}`);
  }
});

test('every major job board is detected from a realistic URL', () => {
  const cases = [
    ['https://www.linkedin.com/jobs/view/4212345678', 'LinkedIn'],
    ['https://www.indeed.com/viewjob?jk=abc', 'Indeed'],
    ['https://www.dice.com/job-detail/abc', 'Dice'],
    ['https://builtin.com/job/data-scientist/123', 'Built In'],
    ['https://wellfound.com/jobs/12345-engineer', 'Wellfound'],
    ['https://weworkremotely.com/remote-jobs/acme-engineer', 'We Work Remotely'],
    ['https://remoteok.com/remote-jobs/123-eng', 'Remote OK'],
    ['https://www.workatastartup.com/jobs/12345', 'YC Work at a Startup'],
    ['https://www.naukri.com/job-listings-analyst-123', 'Naukri'],
    ['https://www.seek.com.au/job/12345', 'Seek'],
    ['https://www.ziprecruiter.com/jobs/acme/abc', 'ZipRecruiter'],
  ];
  for (const [url, expected] of cases) {
    const d = detectSite(url);
    assert.equal(d.isJob, true, `${url} should be detected`);
    assert.equal(d.source, expected, `${url} should be ${expected}`);
  }
});

test('big-tech career sites are detected with the right company', () => {
  const cases = [
    ['https://www.google.com/about/careers/applications/jobs/results/1-swe', 'Google'],
    ['https://www.amazon.jobs/en/jobs/12345/x', 'Amazon'],
    ['https://jobs.careers.microsoft.com/global/en/job/1234/x', 'Microsoft'],
    ['https://www.metacareers.com/jobs/12345/', 'Meta'],
    ['https://jobs.apple.com/en-us/details/200123/x', 'Apple'],
  ];
  for (const [url, company] of cases) {
    const { site, isJob } = detectSite(url);
    assert.equal(isJob, true, `${url} should be detected`);
    assert.equal(inferCompany(url, site), company, `${url} should infer ${company}`);
  }
});

test('generic subdomain prefixes are not mistaken for the company', () => {
  // careers.acme.icims.com is Acme, not "Careers".
  for (const [url, expected] of [
    ['https://careers.acme.icims.com/jobs/1/x', 'Acme'],
    ['https://jobs.bigco.csod.com/ux/ats/1/home', 'Bigco'],
    ['https://acme.wd5.myworkdayjobs.com/en-US/c/job/1', 'Acme'],
  ]) {
    const { site } = detectSite(url);
    assert.equal(inferCompany(url, site), expected, `failed for ${url}`);
  }
});

test('unfetchable sites are the ones that need capture', () => {
  // The badge drives whether the user bothers capturing, so the flags on the
  // sites that matter most are pinned here.
  for (const url of [
    'https://www.linkedin.com/jobs/view/1',
    'https://www.indeed.com/viewjob?jk=a',
    'https://www.amazon.jobs/en/jobs/1/x',
    'https://acme.wd5.myworkdayjobs.com/en-US/c/job/1',
  ]) {
    assert.equal(detectSite(url).fetchable, false, `${url} should need capture`);
  }
  for (const url of [
    'https://job-boards.greenhouse.io/acme/jobs/1',
    'https://jobs.lever.co/acme/1',
    'https://www.google.com/about/careers/applications/jobs/results/1-x',
  ]) {
    assert.equal(detectSite(url).fetchable, true, `${url} should be fetchable`);
  }
});
