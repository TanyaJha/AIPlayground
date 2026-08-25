/**
 * Persistence layer over chrome.storage.local.
 *
 * The saved list is the point of the extension: tabs get closed, the shortlist
 * shouldn't disappear with them. Dedupe is by normalized URL, so reopening the
 * same posting from a different search doesn't create a second entry.
 */

const KEY = 'jobs';
const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = {
  showAllTabs: false,      // show non-job tabs in the picker
  exportFormat: 'markdown', // markdown | json | urls
  promptMode: 'rank',       // rank | tailor | none
  includePromptHeader: true,
  captureMaxChars: 6000,    // per-job cap, applied AFTER trimming
  trimBoilerplate: true,    // drop company blurb / benefits / EEO sections
  autoCapture: 'unfetchable', // off | unfetchable | all — capture text at save time
};

async function read(key, fallback) {
  const result = await chrome.storage.local.get(key);
  return result[key] === undefined ? fallback : result[key];
}

async function write(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

/** @returns {Promise<Array>} saved jobs, newest first */
export async function getJobs() {
  const jobs = await read(KEY, []);
  return jobs.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

/**
 * Add jobs, skipping any whose normalized URL is already saved.
 * @returns {Promise<{added: number, skipped: number, total: number}>}
 */
export async function addJobs(newJobs) {
  const existing = await read(KEY, []);
  const seen = new Set(existing.map((j) => j.normalizedUrl));

  let added = 0;
  let skipped = 0;
  for (const job of newJobs) {
    if (seen.has(job.normalizedUrl)) {
      skipped += 1;
      continue;
    }
    seen.add(job.normalizedUrl);
    existing.push(job);
    added += 1;
  }

  await write(KEY, existing);
  return { added, skipped, total: existing.length };
}

/** Remove one job by normalized URL. */
export async function removeJob(normalizedUrl) {
  const existing = await read(KEY, []);
  const next = existing.filter((j) => j.normalizedUrl !== normalizedUrl);
  await write(KEY, next);
  return next.length;
}

/** Patch a saved job in place (used for notes now, page content in v2). */
export async function updateJob(normalizedUrl, patch) {
  const existing = await read(KEY, []);
  const next = existing.map((j) =>
    j.normalizedUrl === normalizedUrl ? { ...j, ...patch } : j
  );
  await write(KEY, next);
}

export async function clearJobs() {
  await write(KEY, []);
}

export async function getSettings() {
  const stored = await read(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await write(SETTINGS_KEY, next);
  return next;
}
