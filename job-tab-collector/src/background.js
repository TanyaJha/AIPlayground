/**
 * Service worker.
 *
 * MV3 service workers are short-lived — they spin up on demand and get torn
 * down when idle, so there is no long-running state here. All state lives in
 * chrome.storage.local. This file handles the badge count and the download,
 * both of which are more reliable outside the popup (the popup can close
 * mid-operation and cancel work started in its context).
 */

import { getJobs } from './lib/storage.js';
import { fetchMissingText } from './lib/capture.js';

/**
 * Fetching runs HERE, not in the popup.
 *
 * A popup is destroyed the moment it loses focus — clicking back into the page,
 * switching tabs, anything. A batch that reopens two dozen pages takes minutes,
 * so running it in the popup meant it died the first time the user looked away.
 * The worker survives that; the popup just subscribes to progress.
 */
let fetchState = {
  running: false, cancelled: false,
  done: 0, total: 0, title: '', phase: '',
  result: null,
};

function snapshot() {
  return { ...fetchState };
}

async function startFetch(options) {
  if (fetchState.running) return snapshot();
  fetchState = {
    running: true, cancelled: false,
    done: 0, total: 0, title: '', phase: 'starting', result: null,
  };

  try {
    const result = await fetchMissingText({
      ...options,
      isCancelled: () => fetchState.cancelled,
      onProgress: ({ done, total, title, phase }) => {
        fetchState.done = done;
        fetchState.total = total;
        fetchState.title = title;
        fetchState.phase = phase;
      },
    });
    fetchState.result = result;
  } catch (err) {
    console.error('[job-tab-collector] fetch failed', err);
    fetchState.result = { status: 'error', error: String(err && err.message ? err.message : err) };
  } finally {
    fetchState.running = false;
    fetchState.phase = '';
    refreshBadge();
  }
  return snapshot();
}

async function refreshBadge() {
  try {
    const jobs = await getJobs();
    const count = jobs.length;
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#2f6f4f' });
  } catch (err) {
    console.error('[job-tab-collector] badge refresh failed', err);
  }
}

chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.jobs) refreshBadge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'download') {
    handleDownload(message.payload)
      .then((id) => sendResponse({ ok: true, id }))
      .catch((err) => {
        console.error('[job-tab-collector] download failed', err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // keep the message channel open for the async response
  }

  if (message?.type === 'startFetch') {
    // Deliberately not awaited: reply immediately so the popup can start
    // showing progress, and let the run continue after the popup closes.
    startFetch(message.payload || {});
    sendResponse({ ok: true, state: snapshot() });
    return false;
  }

  if (message?.type === 'cancelFetch') {
    fetchState.cancelled = true;
    sendResponse({ ok: true, state: snapshot() });
    return false;
  }

  if (message?.type === 'getFetchState') {
    sendResponse({ ok: true, state: snapshot() });
    return false;
  }

  if (message?.type === 'refreshBadge') {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

/**
 * Download via a data: URL rather than a blob: URL.
 *
 * Blob URLs are tied to the context that created them. A service worker can be
 * torn down at any moment, which can invalidate the blob before Chrome has
 * finished reading it. Data URLs carry their payload inline and have no such
 * lifetime problem.
 */
async function handleDownload({ text, filename, mime }) {
  const encoded = base64EncodeUtf8(text);
  const url = `data:${mime};base64,${encoded}`;
  return chrome.downloads.download({ url, filename, saveAs: true });
}

function base64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const CHUNK = 0x8000; // avoid blowing the argument limit on large exports
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
