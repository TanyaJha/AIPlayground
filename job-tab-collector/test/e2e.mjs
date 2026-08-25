/**
 * End-to-end smoke test: loads the unpacked extension into a real Chromium
 * instance and drives the popup.
 *
 * Network is fully intercepted — every non-extension request is fulfilled with
 * a stub page carrying a realistic <title>. That means the test exercises the
 * real detection/normalization path against real-looking URLs, deterministically
 * and with no external dependency.
 *
 * Run:  node test/e2e.mjs
 * Not part of `npm test` (needs a browser); run it before shipping a change.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(EXT, 'test', 'screenshots');

/** URL -> page title, mimicking what each site really puts in the tab. */
const FIXTURES = {
  'https://www.google.com/about/careers/applications/jobs/results/1234-senior-data-scientist?src=li':
    'Senior Data Scientist, Ads — Google Careers',
  'https://www.google.com/about/careers/applications/jobs/results/1234-senior-data-scientist':
    'Senior Data Scientist, Ads — Google Careers',   // same job, different URL: must dedupe
  'https://www.linkedin.com/jobs/view/4212345678/?refId=xy':
    '(3) Stripe hiring Machine Learning Engineer in Seattle, WA | LinkedIn',
  'https://job-boards.greenhouse.io/anthropic/jobs/4001':
    'Job Application for Research Engineer at Anthropic',
  'https://www.indeed.com/viewjob?jk=abc123&from=serp':
    'Data Analyst - Acme Inc - Indeed.com',
  'https://news.ycombinator.com/':
    'Hacker News',                                    // non-job: must NOT be pre-checked
};

/**
 * A stub job page with the shape of a real one: navigation and footer chrome
 * that the extractor must strip, and a description block it must find.
 * The MARKER strings let the assertions prove which part was extracted.
 */
function jobPageHtml(title) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body>
  <nav><a href="/">Home</a><a href="/jobs">Jobs</a><a href="/about">About</a></nav>
  <header><a href="/login">Sign in</a><a href="/register">Join now</a></header>
  <aside><a href="/j/1">Similar role 1</a><a href="/j/2">Similar role 2</a></aside>
  <main>
    <div id="job-details">
      <h2>About Acme Corporation</h2>
      <p>MARKER_ABOUTUS Acme is a global leader in things. Our mission is to do
         the things well. We have been named a best place to work many times and
         our culture of innovation is second to none. Founded decades ago, we now
         serve customers in over ninety countries and believe deeply that diverse
         perspectives make better products for everyone we serve.</p>
      <h2>Benefits and perks</h2>
      <p>MARKER_BENEFITS Health insurance, parental leave, free lunch, gym.</p>
      <h2>About the role</h2>
      <p>MARKER_DESCRIPTION We are looking for a data scientist to join the team,
         working on measurement, experimentation, and causal inference.</p>
      <h3>Minimum qualifications</h3>
      <ul>
        <li>MARKER_QUALS 5 years of experience with Python and SQL</li>
        <li>Experience designing and analysing A/B tests</li>
        <li>MS or PhD in a quantitative field, or equivalent practical experience</li>
      </ul>
      <h3>Responsibilities</h3>
      <ul>
        <li>MARKER_RESP Build and maintain experimentation pipelines</li>
        <li>Partner with product and engineering on metric definition</li>
      </ul>
      <h2>Equal Opportunity Employer</h2>
      <p>MARKER_EEO We do not discriminate on the basis of race, religion, or
         veteran status. Accommodations available on request.</p>
    </div>
  </main>
  <footer><a href="/privacy">Privacy</a><a href="/terms">MARKER_FOOTER Terms</a></footer>
</body></html>`;
}

const results = [];
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ ok, label, actual, expected });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`);
  if (!ok) console.log(`         expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const userDataDir = fs.mkdtempSync('/tmp/jtc-profile-');
fs.mkdirSync(SHOTS, { recursive: true });

/**
 * chrome.permissions.request() only works from a live user gesture, and the
 * resulting prompt is a native browser dialog that Playwright cannot click. So
 * the test loads a COPY of the extension whose manifest declares the host
 * permission up front, converting the optional grant into a standing one.
 *
 * What this means: the extraction pipeline below is fully tested, but the
 * permission PROMPT itself is not. That path is verified by hand.
 */
const TEST_EXT = fs.mkdtempSync('/tmp/jtc-ext-');
fs.cpSync(EXT, TEST_EXT, {
  recursive: true,
  filter: (src) => !/node_modules|[/\\]\.git|screenshots/.test(src),
});
{
  const mf = path.join(TEST_EXT, 'manifest.json');
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.host_permissions = ['http://*/*', 'https://*/*'];
  delete m.optional_host_permissions;
  fs.writeFileSync(mf, JSON.stringify(m, null, 2));
}

console.log('Launching Chromium with the unpacked extension…');
console.log('(host permission pre-granted in the test copy; the runtime prompt is verified manually)\n');

// Extensions are not supported by Playwright's headless shell, so this needs a
// full Chromium under a virtual display (the runner wraps it in xvfb-run).
// CHROME_PATH lets the sandbox point at its pre-installed build.
const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: [
    `--disable-extensions-except=${TEST_EXT}`,
    `--load-extension=${TEST_EXT}`,
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});

// Stub out the network so detection runs against real-looking URLs offline.
await ctx.route('**/*', async (route) => {
  const url = route.request().url();
  // The extension's own pages, scripts, and styles must load for real —
  // stubbing them would serve popup.js as HTML and break module loading.
  if (!/^https?:/.test(url)) return route.continue();
  const title = FIXTURES[url] ?? 'Untitled';
  await route.fulfill({
    status: 200,
    contentType: 'text/html',
    // charset matters: without it Chromium decodes as Latin-1 and mangles the
    // em-dashes that real job-site titles use as separators.
    body: jobPageHtml(title),
  });
});

try {
  // --- 1. does the extension load at all? ---
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  // `url` is a method on Worker in Playwright, a property on some other builds.
  const swUrl = typeof sw.url === 'function' ? sw.url() : sw.url;
  const extId = new URL(swUrl).host;
  check('service worker registers (manifest is valid)', typeof extId === 'string' && extId.length > 10, true);
  console.log(`         extension id: ${extId}\n`);

  // --- 2. open the fixture tabs ---
  for (const url of Object.keys(FIXTURES)) {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded' });
  }
  console.log(`  ..    opened ${Object.keys(FIXTURES).length} tabs\n`);

  // --- 3. open the popup ---
  const popup = await ctx.newPage();
  // Listeners attach before navigation so a failure during init is captured.
  const pageErrors = [];
  popup.on('pageerror', (e) => pageErrors.push(String(e)));
  popup.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  try {
    await popup.waitForSelector('#tab-list .row', { timeout: 10000 });
  } catch (err) {
    console.log('\n  popup failed to render rows. Captured errors:');
    pageErrors.forEach((e) => console.log(`    ! ${e}`));
    throw err;
  }

  // --- 4. detection: only job tabs listed, and all pre-checked ---
  const rows = await popup.$$eval('#tab-list .row', (els) =>
    els.map((el) => ({
      title: el.querySelector('.row-title').textContent,
      meta: el.querySelector('.row-meta').textContent.trim(),
      checked: el.querySelector('input').checked,
    }))
  );
  console.log('  Detected job tabs:');
  rows.forEach((r) => console.log(`         · ${r.title}  [${r.meta}]`));
  console.log();

  check('non-job tabs are hidden by default', rows.some((r) => r.title === 'Hacker News'), false);
  check('all listed job tabs are pre-checked', rows.every((r) => r.checked), true);
  check('LinkedIn role+company parsed from tab title',
    rows.some((r) => r.title === 'Machine Learning Engineer' && r.meta.includes('Stripe')), true);
  check('Greenhouse role+company parsed',
    rows.some((r) => r.title === 'Research Engineer' && r.meta.includes('Anthropic')), true);
  check('Indeed "Role - Company" split',
    rows.some((r) => r.title === 'Data Analyst' && r.meta.includes('Acme Inc')), true);
  check('Google Careers company inferred from URL',
    rows.some((r) => r.meta.includes('Google')), true);
  check('Google Careers title suffix is stripped',
    rows.some((r) => r.title === 'Senior Data Scientist, Ads'), true);
  check('unfetchable sites are badged',
    await popup.$$eval('#tab-list .badge-warn', (e) => e.length), 2);

  await popup.screenshot({ path: path.join(SHOTS, '1-open-tabs.png'), fullPage: true });

  // --- 5. save, and confirm dedupe of the two identical Google URLs ---
  await popup.click('#save-selected');
  await popup.waitForFunction(() => document.getElementById('saved-count').textContent !== '0',
    null, { timeout: 5000 });

  const savedCount = await popup.$eval('#saved-count', (e) => e.textContent);
  check('4 unique roles saved from 5 job tabs (Google dupe collapsed)', savedCount, '4');

  // With auto-capture set to "unfetchable", saving should have already read the
  // LinkedIn and Indeed roles without any further click.
  // Auto-capture runs in the service worker now, so wait on the worker's own
  // completion signal rather than racing it.
  await popup.waitForFunction(async () => {
    const res = await chrome.runtime.sendMessage({ type: 'getFetchState' });
    return res && res.state && !res.state.running && res.state.result !== null;
  }, null, { timeout: 30000 });

  const autoCaptured = await popup.evaluate(async () => {
    const { getJobs } = await import('../lib/storage.js');
    const jobs = await getJobs();
    return {
      unfetchableWithText: jobs.filter((j) => !j.fetchable && j.content).length,
      unfetchableTotal: jobs.filter((j) => !j.fetchable).length,
      fetchableWithText: jobs.filter((j) => j.fetchable && j.content).length,
    };
  });
  console.log(`         auto-capture on save: ${JSON.stringify(autoCaptured)}`);
  check('auto-capture read the unfetchable roles at save time',
    autoCaptured.unfetchableWithText, autoCaptured.unfetchableTotal);
  check('auto-capture left fetchable roles alone (scope respected)',
    autoCaptured.fetchableWithText, 0);

  // Saving should land the user on the saved list, where Export lives.
  check('saving auto-switches to the Saved view',
    await popup.$eval('#view-saved', (e) => !e.hidden), true);
  check('the Export button is visible right after saving',
    await popup.isVisible('#export-btn'), true);

  const status = await popup.$eval('#saved-status', (e) => e.textContent);
  console.log(`         status line: "${status}"\n`);

  // --- 6. saved view renders and persists to storage ---
  await popup.waitForSelector('#saved-list .row');
  const savedRows = await popup.$$eval('#saved-list .row', (els) =>
    els.map((el) => el.querySelector('.row-title').textContent));
  check('saved view lists every saved role', savedRows.length, 4);

  await popup.screenshot({ path: path.join(SHOTS, '2-saved-list.png'), fullPage: true });

  // --- 7. saving the same tabs again adds nothing ---
  await popup.click('.tab-btn[data-view="tabs"]');
  await popup.click('#save-selected');
  await popup.waitForTimeout(400);
  check('re-saving the same tabs adds no duplicates',
    await popup.$eval('#saved-count', (e) => e.textContent), '4');

  // --- 8. the export file actually generates, end to end ---
  await popup.click('.tab-btn[data-view="saved"]');
  const exported = await popup.evaluate(async () => {
    const { getJobs, getSettings } = await import('../lib/storage.js');
    const { formatJobs } = await import('../lib/export.js');
    const jobs = await getJobs();
    return formatJobs(jobs, await getSettings());
  });
  check('export produces a markdown file', exported.ext, 'md');
  check('export includes the ranking prompt', exported.text.includes('rank these 4 roles by fit'), true);
  check('export flags unfetchable links', exported.text.includes('| **no** |'), true);
  check('export contains every role', (exported.text.match(/^\| \d+ \|/gm) || []).length, 4);

  fs.writeFileSync(path.join(SHOTS, 'sample-export.md'), exported.text);

  // --- 8b. content capture (v2) ---
  check('host permission is held (pre-granted in the test copy)',
    await sw.evaluate(() => chrome.permissions.contains({ origins: ['https://*/*'] })), true);

  // Close every job tab first. This is the case that used to be unrecoverable:
  // text was only obtainable while the tab happened to still be open.
  for (const p of ctx.pages()) {
    if (/google\.com|linkedin|greenhouse|indeed/.test(p.url())) await p.close();
  }
  const stillOpen = await popup.evaluate(async () => {
    const { getJobs } = await import('../lib/storage.js');
    const { findCapturableTabs } = await import('../lib/capture.js');
    const jobs = await getJobs();
    return (await findCapturableTabs(jobs)).reachable.length;
  });
  check('all job tabs are closed before fetching', stillOpen, 0);

  const cap = await popup.evaluate(async () => {
    const { fetchMissingText } = await import('../lib/capture.js');
    return fetchMissingText({ maxChars: 6000, recapture: true });
  });
  console.log(`         fetch result: ${JSON.stringify(cap)}\n`);

  check('text fetched for every role despite every tab being closed', cap.captured, 4);
  check('all four were reopened in the background', cap.reopened, 4);
  check('nothing failed', cap.failed, 0);

  const captured = await popup.evaluate(async () => {
    const { getJobs } = await import('../lib/storage.js');
    return (await getJobs()).map((j) => ({
      title: j.title, chars: j.contentChars, method: j.contentMethod,
      hasDesc: (j.content || '').includes('MARKER_DESCRIPTION'),
      hasQuals: (j.content || '').includes('MARKER_QUALS'),
      hasResp: (j.content || '').includes('MARKER_RESP'),
      hasFooter: (j.content || '').includes('MARKER_FOOTER'),
      hasNav: (j.content || '').includes('Similar role 1'),
      hasAboutUs: (j.content || '').includes('MARKER_ABOUTUS'),
      hasBenefits: (j.content || '').includes('MARKER_BENEFITS'),
      hasEeo: (j.content || '').includes('MARKER_EEO'),
      distilled: j.contentDistilled,
      rawChars: j.contentRawChars,
    }));
  });
  captured.forEach((c) => console.log(
    `         · ${c.title}: ${c.rawChars} -> ${c.chars} chars via ${c.method}` +
    `${c.distilled ? ' (distilled)' : ''}`));
  console.log();

  check('extracted the description body', captured.every((c) => c.hasDesc), true);
  check('extracted the minimum qualifications', captured.every((c) => c.hasQuals), true);
  check('extracted the responsibilities', captured.every((c) => c.hasResp), true);
  check('stripped the footer', captured.every((c) => !c.hasFooter), true);
  check('stripped the related-jobs sidebar', captured.every((c) => !c.hasNav), true);
  check('the distiller ran on the captured pages', captured.every((c) => c.distilled), true);
  check('dropped the "About <company>" blurb', captured.every((c) => !c.hasAboutUs), true);
  check('dropped the benefits section', captured.every((c) => !c.hasBenefits), true);
  check('dropped the EEO boilerplate', captured.every((c) => !c.hasEeo), true);
  check('trimming actually shrank the text',
    captured.every((c) => c.chars < c.rawChars), true);

  // The badge should now say "text", not "not fetchable".
  await popup.reload();
  // The popup always opens on the tab picker, so the saved rows exist but are
  // hidden until the view is switched. Switch first, then wait for visibility.
  await popup.click('.tab-btn[data-view="saved"]');
  await popup.waitForSelector('#saved-list .row', { state: 'visible' });
  check('unfetchable warnings are replaced once text is captured',
    await popup.$$eval('#saved-list .badge-warn', (e) => e.length), 0);
  check('captured rows are badged', 
    await popup.$$eval('#saved-list .badge-ok', (e) => e.length), 4);

  await popup.screenshot({ path: path.join(SHOTS, '3-captured.png'), fullPage: true });

  // Export now carries the descriptions, not just links.
  const exported2 = await popup.evaluate(async () => {
    const { getJobs, getSettings } = await import('../lib/storage.js');
    const { formatJobs } = await import('../lib/export.js');
    return formatJobs(await getJobs(), await getSettings());
  });
  check('export includes a job-descriptions section',
    exported2.text.includes('## Job descriptions'), true);
  check('export carries the actual qualifications text',
    exported2.text.includes('MARKER_QUALS'), true);
  fs.writeFileSync(path.join(SHOTS, 'sample-export-with-text.md'), exported2.text);
  console.log(`         export with text: ${exported2.text.length} chars\n`);

  // --- 8b2. Length / Trim are reversible without refetching -------------
  const sizeAt = async (maxChars, trim) => popup.evaluate(async (args) => {
    const { reformatAll } = await import('../lib/capture.js');
    const { getJobs } = await import('../lib/storage.js');
    await reformatAll({ maxChars: args.maxChars, trim: args.trim });
    const jobs = await getJobs();
    return {
      total: jobs.reduce((n, j) => n + (j.contentChars || 0), 0),
      hasAboutUs: jobs.some((j) => (j.content || '').includes('MARKER_ABOUTUS')),
      hasQuals: jobs.every((j) => (j.content || '').includes('MARKER_QUALS')),
    };
  }, { maxChars, trim });

  const short = await sizeAt(2500, true);
  const full = await sizeAt(15000, true);
  const untrimmed = await sizeAt(15000, false);
  const backToShort = await sizeAt(2500, true);
  console.log(`         short=${short.total}  full=${full.total}  untrimmed=${untrimmed.total}\n`);

  check('switching Trim off restores the boilerplate', untrimmed.hasAboutUs, true);
  check('switching Trim back on removes it again', backToShort.hasAboutUs, false);
  check('untrimmed text is larger than trimmed', untrimmed.total > full.total, true);
  check('qualifications survive every setting',
    short.hasQuals && full.hasQuals && backToShort.hasQuals, true);
  check('returning to a previous setting reproduces it exactly',
    backToShort.total, short.total);

  // --- 8c. the hidden window is cleaned up ---
  const windows = await sw.evaluate(() => chrome.windows.getAll().then((w) => w.length));
  check('the background window used for reopening is closed afterwards', windows, 1);

  // --- 9. no runtime errors anywhere ---
  check('no uncaught errors in the popup', pageErrors, []);

  // --- 10. state survives a popup reload (real persistence, not memory) ---
  await popup.reload();
  await popup.waitForSelector('#saved-count');
  check('saved list survives a popup reload',
    await popup.$eval('#saved-count', (e) => e.textContent), '4');

} finally {
  await ctx.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.rmSync(TEST_EXT, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log(`screenshots + sample export written to test/screenshots/`);
process.exit(failed.length === 0 ? 0 : 1);
