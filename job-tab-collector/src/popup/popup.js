/**
 * Popup controller.
 *
 * Two views: the live tab picker and the persisted saved list. State lives in
 * chrome.storage.local; this file is presentation and event wiring only.
 */

import { tabToJob } from '../lib/jobsites.js';
import {
  getJobs, addJobs, removeJob, clearJobs, getSettings, saveSettings,
} from '../lib/storage.js';
import { formatJobs } from '../lib/export.js';
import { requestPermissionFor, findCapturableTabs, reformatAll } from '../lib/capture.js';

const $ = (id) => document.getElementById(id);

const el = {
  tabList: $('tab-list'),
  tabsEmpty: $('tabs-empty'),
  tabsStatus: $('tabs-status'),
  saveSelected: $('save-selected'),
  showAllTabs: $('show-all-tabs'),
  selectAll: $('select-all'),
  selectNone: $('select-none'),
  savedList: $('saved-list'),
  savedEmpty: $('saved-empty'),
  savedStatus: $('saved-status'),
  savedCount: $('saved-count'),
  exportBtn: $('export-btn'),
  clearAll: $('clear-all'),
  promptMode: $('prompt-mode'),
  exportFormat: $('export-format'),
  captureBtn: $('capture-btn'),
  captureLength: $('capture-length'),
  captureStatus: $('capture-status'),
  version: $('version'),
  trimBoilerplate: $('trim-boilerplate'),
  autoCapture: $('auto-capture'),
  cancelBtn: $('cancel-btn'),
  refetchBtn: $('refetch-btn'),
};

let allTabs = [];      // job records built from every open tab
let settings = null;

/**
 * URLs of every saved job, kept in sync by renderSaved().
 *
 * Held at module scope so the Capture click handler can request host
 * permissions as its very first async call. Chrome only honours a permission
 * prompt that originates from a live user gesture, and awaiting a storage read
 * first is enough to lose it.
 */
let savedUrls = [];

// ---------------------------------------------------------------- utilities

/** Chrome tab URLs we can never do anything useful with. */
function isAddressable(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url);
}

function setStatus(node, message, { transient = true } = {}) {
  node.textContent = message;
  if (transient && message) {
    setTimeout(() => {
      if (node.textContent === message) node.textContent = '';
    }, 3200);
  }
}

function faviconImg(job) {
  const img = document.createElement('img');
  img.className = 'row-favicon';
  img.alt = '';
  img.src = job.favIconUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>';
  img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  return img;
}

function metaLine(job, { showSaved = false } = {}) {
  const bits = [];
  if (job.company) bits.push(job.company);
  bits.push(job.source);
  if (showSaved && job.savedAt) bits.push(new Date(job.savedAt).toLocaleDateString());

  const span = document.createElement('span');
  span.textContent = bits.join(' · ');

  const wrap = document.createElement('div');
  wrap.className = 'row-meta';
  wrap.appendChild(span);

  const addBadge = (cls, text, tip) => {
    wrap.appendChild(document.createTextNode(' '));
    const badge = document.createElement('span');
    badge.className = `badge ${cls}`;
    badge.textContent = text;
    badge.title = tip;
    wrap.appendChild(badge);
  };

  // Once the description has been captured, the AI no longer needs to fetch the
  // page — so the "not fetchable" warning stops being relevant and is replaced.
  if (showSaved && job.content) {
    addBadge('badge-ok', `text ${Math.round((job.contentChars || job.content.length) / 100) / 10}k`,
      `Job description captured ${job.contentCapturedAt
        ? new Date(job.contentCapturedAt).toLocaleString() : ''}. ` +
      'It travels with the export, so the AI does not need to open the link.');
  } else if (!job.fetchable) {
    addBadge('badge-warn', 'not fetchable',
      'This site blocks automated fetching, so an AI cannot open it from the URL alone. ' +
      'Use "Capture job text" while the tab is still open.');
  } else if (showSaved) {
    addBadge('badge-miss', 'no text',
      'No description captured. The AI can still fetch this one from the link.');
  }

  return wrap;
}

// ------------------------------------------------------------- tabs view

async function loadTabs() {
  const tabs = await chrome.tabs.query({});
  allTabs = tabs.filter((t) => isAddressable(t.url)).map((t) => tabToJob(t));
  renderTabs();
}

function visibleTabs() {
  return settings.showAllTabs ? allTabs : allTabs.filter((j) => j.isJob);
}

function renderTabs() {
  const rows = visibleTabs();
  el.tabList.replaceChildren();
  el.tabsEmpty.hidden = rows.length > 0;

  for (const job of rows) {
    const row = document.createElement('label');
    row.className = 'row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = job.normalizedUrl;
    // Job pages start checked; unrelated tabs shown via "show all" do not.
    cb.checked = job.isJob;
    cb.addEventListener('change', updateSaveButton);

    const body = document.createElement('div');
    body.className = 'row-body';

    const title = document.createElement('div');
    title.className = 'row-title';
    title.textContent = job.title;
    title.title = job.url;

    body.append(title, metaLine(job));
    row.append(cb, faviconImg(job), body);
    el.tabList.appendChild(row);
  }

  updateSaveButton();
}

function selectedTabJobs() {
  const checked = new Set(
    [...el.tabList.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value)
  );
  return visibleTabs().filter((j) => checked.has(j.normalizedUrl));
}

function updateSaveButton() {
  const n = selectedTabJobs().length;
  el.saveSelected.disabled = n === 0;
  el.saveSelected.textContent = n === 0 ? 'Save selected' : `Save ${n}`;
}

// ------------------------------------------------------------ saved view

async function renderSaved() {
  const jobs = await getJobs();
  savedUrls = jobs.map((j) => j.url);
  el.savedCount.textContent = String(jobs.length);
  el.savedEmpty.hidden = jobs.length > 0;
  el.exportBtn.disabled = jobs.length === 0;
  el.captureBtn.disabled = jobs.length === 0;
  el.savedList.replaceChildren();

  for (const job of jobs) {
    const row = document.createElement('div');
    row.className = 'row';

    const body = document.createElement('div');
    body.className = 'row-body';

    const link = document.createElement('a');
    link.className = 'row-title';
    link.textContent = job.title;
    link.href = job.url;
    link.title = job.url;
    link.target = '_blank';
    link.rel = 'noreferrer';

    body.append(link, metaLine(job, { showSaved: true }));

    const remove = document.createElement('button');
    remove.className = 'row-remove';
    remove.textContent = '×';
    remove.title = 'Remove from list';
    remove.setAttribute('aria-label', `Remove ${job.title}`);
    remove.addEventListener('click', async () => {
      await removeJob(job.normalizedUrl);
      await renderSaved();
    });

    row.append(faviconImg(job), body, remove);
    el.savedList.appendChild(row);
  }
}

// -------------------------------------------------------------- actions

async function handleSaveSelected() {
  const picked = selectedTabJobs();
  if (picked.length === 0) return;

  // Work out the capture plan synchronously, before any await, so the
  // permission prompt below still counts as coming from this click.
  const mode = el.autoCapture.value;
  const wanted = mode === 'all' ? picked
    : mode === 'unfetchable' ? picked.filter((j) => !j.fetchable)
    : [];

  let granted = false;
  if (wanted.length > 0) {
    granted = await requestPermissionFor(wanted.map((j) => j.url));
  }

  const { added, skipped } = await addJobs(picked);
  await renderSaved();

  // Jump straight to the saved list. Exporting is the whole point of saving,
  // and leaving the user on the picker hid the next step behind a tab they
  // had no reason to click.
  switchView('saved');

  const parts = [];
  if (added) parts.push(`Saved ${added}`);
  if (skipped) parts.push(`${skipped} already on the list`);
  setStatus(el.savedStatus, parts.join(' · ') || 'Nothing new to add');

  // Hand off to the worker rather than capturing here: this popup is destroyed
  // the moment it loses focus, and a batch of page reads takes long enough that
  // running it inline routinely got cut off half-finished.
  if (wanted.length > 0 && granted) {
    await chrome.runtime.sendMessage({
      type: 'startFetch',
      payload: {
        maxChars: Number(el.captureLength.value) || 6000,
        trim: el.trimBoilerplate.checked,
        scope: mode === 'all' ? 'all' : 'unfetchable',
      },
    });
    pollFetchState();
  } else if (wanted.length > 0 && !granted) {
    setStatus(el.captureStatus,
      'Saved, but page-access permission was declined — no text captured',
      { transient: false });
  }
}

async function handleExport() {
  const jobs = await getJobs();
  if (jobs.length === 0) return;

  const { text, ext, mime } = formatJobs(jobs, settings);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `jobs-${stamp}.${ext}`;

  el.exportBtn.disabled = true;
  setStatus(el.savedStatus, 'Preparing…', { transient: false });

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'download',
      payload: { text, filename, mime },
    });
    setStatus(el.savedStatus, res?.ok ? `Exported ${jobs.length}` : `Failed: ${res?.error || 'unknown'}`);
  } catch (err) {
    setStatus(el.savedStatus, `Failed: ${err.message}`);
  } finally {
    el.exportBtn.disabled = false;
  }
}

/**
 * Fetch the text for every saved role that doesn't have it yet.
 *
 * Roles whose tab is still open are read in place; the rest are reopened in a
 * minimized window and closed again. The user shouldn't have to know or care
 * which case a given role falls into — hence one button, not two.
 *
 * The work itself runs in the service worker, so closing this popup mid-run
 * doesn't abort it.
 */
async function handleFetch({ recapture = false } = {}) {
  if (savedUrls.length === 0) return;

  // First await, so the permission prompt still counts as user-initiated.
  const granted = await requestPermissionFor(savedUrls);
  if (!granted) {
    setStatus(el.captureStatus,
      'Permission declined — cannot read page text', { transient: false });
    return;
  }

  await chrome.runtime.sendMessage({
    type: 'startFetch',
    payload: {
      maxChars: Number(el.captureLength.value) || 6000,
      trim: el.trimBoilerplate.checked,
      recapture,
    },
  });
  pollFetchState();
}

/**
 * Re-derive stored text at the current Length / Trim settings.
 * Local only — no page loads, so it returns immediately.
 */
async function applyFormatting() {
  const res = await reformatAll({
    maxChars: Number(el.captureLength.value) || 6000,
    trim: el.trimBoilerplate.checked,
  });
  await renderSaved();
  if (res.updated === 0) return;
  const kb = Math.round(res.chars / 100) / 10;
  const note = res.needRefetch > 0
    ? ` · ${res.needRefetch} captured before raw text was kept — Re-fetch all for a cleaner result`
    : '';
  setStatus(el.captureStatus,
    `Reformatted ${res.updated} · ${kb}k total${note}`, { transient: false });
}

async function handleCancel() {
  await chrome.runtime.sendMessage({ type: 'cancelFetch' });
  setStatus(el.captureStatus, 'Stopping…', { transient: false });
}

let pollTimer = null;

/** Mirror the worker's progress into the popup, and keep mirroring while it runs. */
async function pollFetchState() {
  let res;
  try {
    res = await chrome.runtime.sendMessage({ type: 'getFetchState' });
  } catch {
    return; // worker asleep; nothing running
  }
  const state = res && res.state;
  if (!state) return;

  el.captureBtn.disabled = state.running;
  el.cancelBtn.hidden = !state.running;

  if (state.running) {
    const where = state.phase === 'reopening' ? 'reopening' : 'reading';
    setStatus(el.captureStatus,
      `${where} ${state.done + 1}/${state.total} — ${state.title || ''}`,
      { transient: false });
    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollFetchState, 600);
    return;
  }

  clearTimeout(pollTimer);
  await renderSaved();

  const r = state.result;
  if (!r) { await refreshCaptureHint(); return; }
  if (r.status === 'error') {
    setStatus(el.captureStatus, `Failed: ${r.error}`, { transient: false });
    return;
  }
  const bits = [];
  if (r.captured) bits.push(`Got text for ${r.captured}`);
  if (r.reopened) bits.push(`${r.reopened} reopened`);
  if (r.trimmedFrom > 0 && r.trimmedTo < r.trimmedFrom) {
    bits.push(`trimmed ${Math.round(100 - (r.trimmedTo / r.trimmedFrom) * 100)}%`);
  }
  if (r.failed) bits.push(`${r.failed} failed`);
  if (r.status === 'cancelled') bits.push('stopped');
  setStatus(el.captureStatus, bits.join(' · ') || 'Nothing to fetch', { transient: false });
}

/** Say up front how much work the button will do, and how much needs reopening. */
async function refreshCaptureHint() {
  const jobs = await getJobs();
  const pending = jobs.filter((j) => !j.content);
  el.refetchBtn.hidden = jobs.length === 0;
  el.captureBtn.textContent = pending.length
    ? `Fetch text for ${pending.length}` : 'All roles have text';
  // Disabled only when there is genuinely nothing to fetch — "Re-fetch all"
  // stays available so the user is never stuck with the text they first got.
  el.captureBtn.disabled = pending.length === 0;

  if (pending.length === 0) {
    const withRaw = jobs.filter((j) => j.contentRaw).length;
    setStatus(el.captureStatus,
      jobs.length ? `${withRaw}/${jobs.length} can be reformatted instantly` : '',
      { transient: false });
    return;
  }
  const { reachable } = await findCapturableTabs(pending);
  const reopen = pending.length - reachable.length;
  setStatus(el.captureStatus,
    reopen > 0 ? `${reopen} will be reopened in the background` : 'all tabs still open',
    { transient: false });
}

async function handleClearAll() {
  const jobs = await getJobs();
  if (jobs.length === 0) return;
  if (!confirm(`Remove all ${jobs.length} saved roles? This can't be undone.`)) return;
  await clearJobs();
  await renderSaved();
  setStatus(el.savedStatus, 'Cleared');
}

function switchView(view) {
  for (const btn of document.querySelectorAll('.tab-btn')) {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  }
  $('view-tabs').hidden = view !== 'tabs';
  $('view-saved').hidden = view !== 'saved';
  if (view === 'saved') pollFetchState().then(refreshCaptureHintIfIdle);
}

// ----------------------------------------------------------------- init

/** Only overwrite the status line with a hint when nothing is running. */
async function refreshCaptureHintIfIdle() {
  const res = await chrome.runtime.sendMessage({ type: 'getFetchState' }).catch(() => null);
  if (!res || !res.state || !res.state.running) await refreshCaptureHint();
}

async function init() {
  el.version.textContent = `v${chrome.runtime.getManifest().version}`;
  settings = await getSettings();

  el.showAllTabs.checked = settings.showAllTabs;
  el.promptMode.value = settings.promptMode;
  el.exportFormat.value = settings.exportFormat;
  el.captureLength.value = String(settings.captureMaxChars);
  el.trimBoilerplate.checked = settings.trimBoilerplate !== false;
  el.autoCapture.value = settings.autoCapture || 'unfetchable';

  await Promise.all([loadTabs(), renderSaved()]);
  // Pick up a run already in flight from a previous popup session.
  await pollFetchState();

  el.showAllTabs.addEventListener('change', async () => {
    settings = await saveSettings({ showAllTabs: el.showAllTabs.checked });
    renderTabs();
  });

  el.promptMode.addEventListener('change', async () => {
    settings = await saveSettings({
      promptMode: el.promptMode.value,
      includePromptHeader: el.promptMode.value !== 'none',
    });
  });

  el.exportFormat.addEventListener('change', async () => {
    settings = await saveSettings({ exportFormat: el.exportFormat.value });
  });

  el.selectAll.addEventListener('click', () => {
    el.tabList.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = true; });
    updateSaveButton();
  });

  el.selectNone.addEventListener('click', () => {
    el.tabList.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = false; });
    updateSaveButton();
  });

  el.autoCapture.addEventListener('change', async () => {
    settings = await saveSettings({ autoCapture: el.autoCapture.value });
  });

  // Length and Trim are knobs, not commitments: the raw text is already stored,
  // so changing either re-derives every role's text locally and instantly.
  el.trimBoilerplate.addEventListener('change', async () => {
    settings = await saveSettings({ trimBoilerplate: el.trimBoilerplate.checked });
    await applyFormatting();
  });

  el.captureLength.addEventListener('change', async () => {
    settings = await saveSettings({ captureMaxChars: Number(el.captureLength.value) });
    await applyFormatting();
  });

  el.refetchBtn.addEventListener('click', () => handleFetch({ recapture: true }));

  el.saveSelected.addEventListener('click', handleSaveSelected);
  el.exportBtn.addEventListener('click', handleExport);
  el.captureBtn.addEventListener('click', handleFetch);
  el.cancelBtn.addEventListener('click', handleCancel);
  el.clearAll.addEventListener('click', handleClearAll);

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

init().catch((err) => {
  console.error('[job-tab-collector] init failed', err);
  setStatus(el.tabsStatus, `Error: ${err.message}`, { transient: false });
});
