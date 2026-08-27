/**
 * Parse an achievements bank (markdown) into structured entries.
 *
 * The bank is the point of fitcheck: it holds *everything* you've done — the
 * uncompressed record — not just what fits on a résumé. Format is deliberately
 * simple so it's easy to keep by hand:
 *
 *   ## Migrated auth service to GKE
 *   Led a 3-engineer team to move our identity service to Kubernetes.
 *   impact: cut deploy time from 40m to 6m; zero downtime cutover
 *   tags: kubernetes, identity, leadership
 *
 * Each `##` heading starts a new achievement. Everything under it (including any
 * `impact:` / `tags:` lines) is kept as the entry's text — the model reads it as
 * written, so there's nothing brittle to get wrong.
 */

/** Turn a title into a short stable id, e.g. "Migrated auth service" -> "migrated-auth-service". */
export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'achievement';
}

/**
 * @param {string} markdown  contents of an achievements.md file
 * @returns {Array<{id: string, title: string, text: string}>}
 */
export function parseAchievements(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const entries = [];
  let current = null;
  const seen = new Map(); // id -> count, to keep ids unique

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (current) entries.push(finalize(current));
      const title = heading[1];
      let id = slugify(title);
      if (seen.has(id)) {
        const n = seen.get(id) + 1;
        seen.set(id, n);
        id = `${id}-${n}`;
      } else {
        seen.set(id, 1);
      }
      current = { id, title, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
    // Lines before the first heading (e.g. a top-level # title) are ignored.
  }
  if (current) entries.push(finalize(current));
  return entries;
}

function finalize(c) {
  const text = c.bodyLines.join('\n').trim();
  return { id: c.id, title: c.title, text };
}

/**
 * Flatten one bank.json entry (see track/schema/bank-entry.schema.json) into the
 * simple {id, title, text} the engine scores. We fold the entry's metrics, scope,
 * tags, and — importantly — its `guardrails` into the text, so the matcher reasons
 * over the full record AND knows what must not be claimed from each achievement.
 */
export function bankEntryToEntry(e) {
  const parts = [];
  if (e.raw_evidence) parts.push(String(e.raw_evidence).trim());

  if (Array.isArray(e.metrics) && e.metrics.length) {
    const m = e.metrics
      .map((x) => {
        const meta = [x.basis, x.confidence].filter(Boolean).join('; ');
        return meta ? `${x.value} (${meta})` : x.value;
      })
      .filter(Boolean)
      .join('; ');
    if (m) parts.push(`Metrics: ${m}`);
  }

  if (e.scope && typeof e.scope === 'object') {
    const s = [e.scope.role, e.scope.ownership, e.scope.team_size, e.scope.customers]
      .filter(Boolean)
      .join(', ');
    if (s) parts.push(`Scope: ${s}`);
  }

  if (Array.isArray(e.tags) && e.tags.length) parts.push(`Tags: ${e.tags.join(', ')}`);

  if (Array.isArray(e.guardrails) && e.guardrails.length) {
    parts.push(`Must not claim: ${e.guardrails.join(' ')}`);
  }

  const title = e.title || e.id || 'achievement';
  return { id: e.id || slugify(title), title, text: parts.join('\n').trim() };
}

/**
 * Parse a bank.json file (the source of truth) into engine entries. Accepts a
 * top-level array of bank entries, or an object wrapping one as {entries:[...]}
 * or {bank:[...]}. Ids are kept unique.
 * @param {string} jsonText
 * @returns {Array<{id: string, title: string, text: string}>}
 */
export function parseBank(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`bank.json didn't parse as JSON: ${err.message}`);
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.entries)
      ? data.entries
      : Array.isArray(data?.bank)
        ? data.bank
        : null;
  if (!list) throw new Error('bank.json must be an array of entries (or {entries:[...]}).');

  const seen = new Map();
  return list.map((e) => {
    const entry = bankEntryToEntry(e);
    let id = entry.id;
    if (seen.has(id)) {
      const n = seen.get(id) + 1;
      seen.set(id, n);
      id = `${id}-${n}`;
    } else {
      seen.set(id, 1);
    }
    return { ...entry, id };
  });
}

/**
 * Load entries from either format. The bank.json (JSON) is the source of truth;
 * achievements.md (markdown) is the older hand-kept format, still supported.
 * Detection: pass `json` explicitly (e.g. from the file extension), or let it
 * sniff — content beginning with `[` or `{` is treated as JSON.
 * @param {string} text
 * @param {{json?: boolean|null}} [opts]
 */
export function loadAchievements(text, { json = null } = {}) {
  const looksJson = json != null ? json : /^\s*[[{]/.test(text);
  return looksJson ? parseBank(text) : parseAchievements(text);
}

/** Render the parsed bank back into a compact block for the prompt. */
export function achievementsToPromptBlock(entries) {
  return entries
    .map((e) => `[${e.id}] ${e.title}\n${e.text}`.trim())
    .join('\n\n');
}
