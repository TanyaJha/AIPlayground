/**
 * Capture orchestration.
 *
 * Capture is a deliberate, separate action rather than something that happens
 * at save time. The tradeoff that buys: you choose what gets read. The tradeoff
 * it costs: a tab that has since been closed can no longer be read, and there
 * is no way to recover it short of reopening the link.
 *
 * So the contract here is that nothing fails silently. Every saved job comes
 * back in exactly one bucket — captured, tab-closed, blocked, or errored — and
 * the popup reports the counts.
 *
 * Pipeline order matters: extract the FULL page text, then distill away the
 * company boilerplate, and only then apply the character cap. Truncating first
 * spends the budget on the "about us" section that opens most postings and
 * drops the qualifications off the end.
 */

import { extractJobText } from './extract.js';
import { distill } from './distill.js';
import { normalizeUrl } from './jobsites.js';
import { getJobs, updateJob } from './storage.js';


/**
 * Cap on the raw text kept per role.
 *
 * We store the untrimmed extraction so that changing Length or Trim is a local
 * recompute rather than a fresh page load — the difference between instant and
 * several minutes. 40k characters is far above any real posting while keeping
 * a 200-role list well inside storage limits.
 */
const RAW_CAP = 40000;

/** Pages no extension is allowed to inject into, whatever permissions it holds. */
const UNINJECTABLE = /^(chrome|edge|about|chrome-extension|moz-extension|devtools|view-source):|^https:\/\/chrome\.google\.com\/webstore|^https:\/\/microsoftedge\.microsoft\.com\/addons/;

/**
 * Do we already hold host permission for these origins?
 * @param {string[]} urls
 */
export async function hasPermissionFor(urls) {
  const origins = originsFor(urls);
  if (origins.length === 0) return true;
  return chrome.permissions.contains({ origins });
}

/**
 * Ask for host permission. Must be called directly from a user gesture —
 * Chrome rejects the prompt otherwise, which is why the popup calls this from
 * inside the click handler rather than after any await.
 *
 * @returns {Promise<boolean>} whether permission is now held
 */
export async function requestPermissionFor(urls) {
  const origins = originsFor(urls);
  if (origins.length === 0) return true;
  try {
    return await chrome.permissions.request({ origins });
  } catch (err) {
    console.error('[job-tab-collector] permission request failed', err);
    return false;
  }
}

function originsFor(urls) {
  const set = new Set();
  for (const url of urls) {
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        set.add(`${u.protocol}//${u.hostname}/*`);
      }
    } catch {
      /* unparseable URLs simply contribute no origin */
    }
  }
  return [...set];
}

/**
 * Which saved jobs currently have a matching open tab?
 * Matching is by normalized URL, so a tab whose URL has picked up tracking
 * params since it was saved still matches.
 *
 * @returns {Promise<{reachable: Array<{job: object, tabId: number}>, closed: object[]}>}
 */
export async function findCapturableTabs(jobs) {
  const tabs = await chrome.tabs.query({});
  const byUrl = new Map();
  for (const tab of tabs) {
    if (!tab.url || UNINJECTABLE.test(tab.url)) continue;
    const key = normalizeUrl(tab.url);
    if (!byUrl.has(key)) byUrl.set(key, tab);
  }

  const reachable = [];
  const closed = [];
  for (const job of jobs) {
    const tab = byUrl.get(job.normalizedUrl);
    if (tab) reachable.push({ job, tabId: tab.id });
    else closed.push(job);
  }
  return { reachable, closed };
}

/**
 * Capture text for every saved job whose tab is still open.
 *
 * @param {object} opts
 * @param {number} opts.maxChars per-job cap, applied after distilling
 * @param {boolean} opts.recapture re-read jobs that already have content
 * @param {boolean} opts.keepUnknown keep sections with unrecognised headings
 * @param {'all'|'unfetchable'} opts.scope which saved roles to consider
 * @param {(done: number, total: number) => void} [opts.onProgress]
 * @returns {Promise<{captured: number, closed: number, failed: number, skipped: number,
 *                    trimmedFrom: number, trimmedTo: number, errors: Array}>}
 */
export async function captureAll({
  maxChars = 6000, recapture = false, keepUnknown = true, trim = true,
  scope = 'all', onProgress,
} = {}) {
  const all = await getJobs();
  // 'unfetchable' limits work to the roles that genuinely need it — the ones an
  // AI cannot read from the link. 'all' treats the saved list as an archive,
  // so a posting taken down later is still readable.
  const inScope = scope === 'unfetchable' ? all.filter((j) => !j.fetchable) : all;
  const targets = recapture ? inScope : inScope.filter((j) => !j.content);
  const skipped = inScope.length - targets.length;

  const { reachable, closed } = await findCapturableTabs(targets);

  let captured = 0;
  let failed = 0;
  let trimmedFrom = 0;
  let trimmedTo = 0;
  const errors = [];
  let done = 0;

  for (const { job, tabId } of reachable) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractJobText,
        world: 'ISOLATED',
      });

      const payload = result && result.result;
      if (payload && payload.ok) {
        // With trimming off, fall back to a plain cap on the raw text — the
        // old behaviour, kept as an escape hatch for postings the section
        // classifier gets wrong.
        const refined = trim
          ? distill(payload.text, { maxChars, keepUnknown })
          : {
              text: payload.text.length > maxChars
                ? `${payload.text.slice(0, maxChars)}\n\n…[truncated]` : payload.text,
              chars: Math.min(payload.text.length, maxChars),
              kept: [], dropped: [], distilled: false,
            };
        await updateJob(job.normalizedUrl, {
          content: refined.text,
          contentRaw: payload.text.slice(0, RAW_CAP),
          contentCapturedAt: new Date().toISOString(),
          contentChars: refined.chars,
          contentRawChars: payload.chars,
          contentMethod: payload.method,
          contentDistilled: refined.distilled,
          contentKept: refined.kept,
          contentDropped: refined.dropped,
          captureError: null,
        });
        captured += 1;
        trimmedFrom += payload.chars;
        trimmedTo += refined.chars;
      } else {
        const message = (payload && payload.error) || 'no text extracted';
        await updateJob(job.normalizedUrl, { captureError: message });
        errors.push({ title: job.title, error: message });
        failed += 1;
      }
    } catch (err) {
      // Most commonly: permission not granted for this specific origin, or the
      // tab navigated away mid-capture.
      const message = String(err && err.message ? err.message : err);
      await updateJob(job.normalizedUrl, { captureError: message });
      errors.push({ title: job.title, error: message });
      failed += 1;
    }

    done += 1;
    if (onProgress) onProgress(done, reachable.length);
  }

  return { captured, closed: closed.length, failed, skipped, trimmedFrom, trimmedTo, errors };
}

// ---------------------------------------------------------------------------
// Reopening closed tabs
//
// Requiring the tab to still be open meant you had to predict, before closing
// anything, that you'd want the text later. Nobody does that. So for saved
// roles with no open tab we load the URL ourselves, in a minimized window the
// user never has to look at, and close it afterwards.
//
// This works on LinkedIn and Workday for the same reason capturing an open tab
// does: it is the user's own browser with the user's own session, so auth walls
// and bot checks never enter into it.
// ---------------------------------------------------------------------------

/** Wait for a tab to finish loading, resolving either way so one slow page can't wedge the batch. */
function waitForLoad(tabId, timeoutMs = 25000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (how) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(how);
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') finish('complete');
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    chrome.tabs.onUpdated.addListener(listener);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fill in missing text for saved roles, reopening any whose tab is closed.
 *
 * Open tabs are read in place (fast, no disruption). Everything else is loaded
 * sequentially in one minimized window, which is closed when the run finishes
 * or fails. Sequential on purpose: a fleet of parallel loads would spike memory
 * and get the user rate-limited by the very sites we need to read.
 *
 * @param {object} opts
 * @param {number} opts.maxChars per-role cap, applied after distilling
 * @param {boolean} opts.trim drop boilerplate sections
 * @param {boolean} opts.recapture also re-read roles that already have text
 * @param {'all'|'unfetchable'} [opts.scope] limit to roles that need capture
 * @param {() => boolean} [opts.isCancelled] polled between roles
 * @param {(p: {done: number, total: number, title: string, phase: string}) => void} [opts.onProgress]
 */
export async function fetchMissingText({
  maxChars = 6000, trim = true, recapture = false, keepUnknown = true,
  scope = 'all', isCancelled = () => false, onProgress = () => {},
} = {}) {
  const all = await getJobs();
  const inScope = scope === 'unfetchable' ? all.filter((j) => !j.fetchable) : all;
  const targets = recapture ? inScope : inScope.filter((j) => !j.content);
  const { reachable, closed } = await findCapturableTabs(targets);

  const total = reachable.length + closed.length;
  let done = 0;
  let captured = 0;
  let failed = 0;
  let reopened = 0;
  let trimmedFrom = 0;
  let trimmedTo = 0;
  const errors = [];

  const store = async (job, payload) => {
    const refined = trim
      ? distill(payload.text, { maxChars, keepUnknown })
      : {
          text: payload.text.length > maxChars
            ? `${payload.text.slice(0, maxChars)}\n\n…[truncated]` : payload.text,
          chars: Math.min(payload.text.length, maxChars),
          kept: [], dropped: [], distilled: false,
        };
    await updateJob(job.normalizedUrl, {
      content: refined.text,
      contentRaw: payload.text.slice(0, RAW_CAP),
      contentCapturedAt: new Date().toISOString(),
      contentChars: refined.chars,
      contentRawChars: payload.chars,
      contentMethod: payload.method,
      contentDistilled: refined.distilled,
      contentKept: refined.kept,
      contentDropped: refined.dropped,
      captureError: null,
    });
    captured += 1;
    trimmedFrom += payload.chars;
    trimmedTo += refined.chars;
  };

  const fail = async (job, message) => {
    await updateJob(job.normalizedUrl, { captureError: message });
    errors.push({ title: job.title, error: message });
    failed += 1;
  };

  // --- pass 1: tabs already open, read in place ---------------------------
  for (const { job, tabId } of reachable) {
    if (isCancelled()) return summary('cancelled');
    onProgress({ done, total, title: job.title, phase: 'reading open tab' });
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId }, func: extractJobText, world: 'ISOLATED',
      });
      const payload = res && res.result;
      if (payload && payload.ok) await store(job, payload);
      else await fail(job, (payload && payload.error) || 'no text extracted');
    } catch (err) {
      await fail(job, String(err && err.message ? err.message : err));
    }
    done += 1;
  }

  // --- pass 2: closed tabs, reopened in a hidden window -------------------
  let win = null;
  let workTabId = null;
  try {
    for (const job of closed) {
      if (isCancelled()) break;
      onProgress({ done, total, title: job.title, phase: 'reopening' });

      if (win === null) {
        // Minimized and unfocused: the user should never see this happen.
        win = await chrome.windows.create({ url: 'about:blank', state: 'minimized' });
        workTabId = win.tabs[0].id;
      }

      try {
        await chrome.tabs.update(workTabId, { url: job.url });
        await waitForLoad(workTabId);
        // Client-rendered pages finish "loading" before their content exists.
        await sleep(1500);

        let payload = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const [res] = await chrome.scripting.executeScript({
            target: { tabId: workTabId }, func: extractJobText, world: 'ISOLATED',
          });
          payload = res && res.result;
          if (payload && payload.ok && payload.chars > 400) break;
          // Too little text usually means the SPA hadn't hydrated yet.
          await sleep(2500);
        }

        if (payload && payload.ok) {
          await store(job, payload);
          reopened += 1;
        } else {
          await fail(job, (payload && payload.error) || 'no text found after reopening');
        }
      } catch (err) {
        await fail(job, String(err && err.message ? err.message : err));
      }
      done += 1;
    }
  } finally {
    if (win !== null) {
      try { await chrome.windows.remove(win.id); } catch { /* already gone */ }
    }
  }

  function summary(status) {
    return {
      status, captured, reopened, failed, total,
      trimmedFrom, trimmedTo, errors,
    };
  }
  return summary(isCancelled() ? 'cancelled' : 'done');
}

/**
 * Re-derive every saved role's text from its stored raw extraction.
 *
 * This is what makes Length and Trim feel like knobs rather than commitments:
 * the pages were already read, so switching Short -> Full is arithmetic on text
 * we already hold, not twenty page loads. Nothing here touches the network.
 *
 * Roles captured before raw text was retained have no `contentRaw`; their
 * existing (already-trimmed) text is adopted as the raw source so they still
 * respond to the controls. Re-fetching them gives a better result.
 *
 * @returns {Promise<{updated: number, needRefetch: number, chars: number}>}
 */
export async function reformatAll({ maxChars = 6000, trim = true, keepUnknown = true } = {}) {
  const jobs = await getJobs();
  let updated = 0;
  let needRefetch = 0;
  let chars = 0;

  for (const job of jobs) {
    const raw = job.contentRaw || job.content;
    if (!raw) continue;
    if (!job.contentRaw) needRefetch += 1;

    const refined = trim
      ? distill(raw, { maxChars, keepUnknown })
      : {
          text: raw.length > maxChars ? `${raw.slice(0, maxChars)}\n\n…[truncated]` : raw,
          chars: Math.min(raw.length, maxChars),
          kept: [], dropped: [], distilled: false,
        };

    await updateJob(job.normalizedUrl, {
      content: refined.text,
      contentRaw: raw,
      contentChars: refined.chars,
      contentDistilled: refined.distilled,
      contentKept: refined.kept,
      contentDropped: refined.dropped,
    });
    updated += 1;
    chars += refined.chars;
  }
  return { updated, needRefetch, chars };
}
