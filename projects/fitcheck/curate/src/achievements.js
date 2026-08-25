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

/** Render the parsed bank back into a compact block for the prompt. */
export function achievementsToPromptBlock(entries) {
  return entries
    .map((e) => `[${e.id}] ${e.title}\n${e.text}`.trim())
    .join('\n\n');
}
