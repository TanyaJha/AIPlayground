/**
 * Page-text extraction.
 *
 * `extractJobText` is injected into the page by chrome.scripting.executeScript,
 * which serializes it and runs it in the page's own world. That imposes a hard
 * constraint: **it must be entirely self-contained.** No imports, no closures
 * over module scope, no helper functions defined outside its body. Everything it
 * needs lives inside it. This is why the file looks like one long function
 * rather than a tidy set of small ones.
 *
 * Strategy, in order:
 *   1. Try a small list of per-site container selectors. These are *container*
 *      hints only — "which box holds the description" — not field-level parsing.
 *      Containers change far less often than field markup, and a miss costs
 *      nothing because we fall through to (2).
 *   2. Generic density scoring: strip page chrome, then pick the block element
 *      with the most text and the lowest proportion of link text. This is what
 *      handles the long tail of company career pages we've never seen.
 *
 * The deliberate non-goal is structured field extraction (salary, seniority,
 * years required). That's what the AI reading the export is for. Scrapers that
 * parse fields break every few weeks; a text dump degrades gracefully.
 *
 * Output format: section headings found in the DOM are marked with a leading
 * `## ` so distill.js can find section boundaries in plain text. Extraction no
 * longer truncates — filtering has to happen first, or a character cap gets
 * spent on the company boilerplate that sits at the top of most postings and
 * the qualifications fall off the end.
 */

/**
 * Runs in the page. Returns a plain object (must be structured-cloneable).
 *
 * @returns {{ok: boolean, text: string, chars: number, method: string, truncated: boolean, error?: string}}
 */
export function extractJobText() {
  try {
    // --- per-site container hints -------------------------------------
    const HINTS = [
      { host: /linkedin\.com$/, selectors: [
        '.jobs-description__content', '.jobs-box__html-content',
        '#job-details', '.description__text', '.show-more-less-html__markup',
      ] },
      { host: /greenhouse\.io$/, selectors: ['#content', '.job__description', '.job-post'] },
      { host: /lever\.co$/, selectors: ['.posting-page', '.section-wrapper', '.content'] },
      { host: /ashbyhq\.com$/, selectors: ['[class*="_descriptionText"]', '#job-description'] },
      { host: /google\.com$/, selectors: ['[class*="KwJkGe"]', 'main [role="main"]', '.yVFmQd'] },
      { host: /myworkdayjobs\.com$/, selectors: ['[data-automation-id="jobPostingDescription"]'] },
      { host: /indeed\.com$/, selectors: ['#jobDescriptionText', '.jobsearch-JobComponent-description'] },
      { host: /amazon\.jobs$/, selectors: ['.content .section', '#job-detail'] },
      { host: /smartrecruiters\.com$/, selectors: ['.job-sections', '[itemprop="description"]'] },
      { host: /workable\.com$/, selectors: ['[data-ui="job-description"]', '.section--text'] },
      { host: /icims\.com$/, selectors: ['.iCIMS_JobContent', '#jobDescriptionText'] },
    ];

    // Read text from a node, preferring innerText (which respects layout and
    // gives usable line breaks) but falling back to textContent when innerText
    // comes back suspiciously short — some sites clip content via CSS in ways
    // that innerText honours but the DOM still holds.
    const readText = (node) => {
      const inner = (node.innerText || '').trim();
      const raw = (node.textContent || '').trim();
      return raw.length > inner.length * 1.5 ? raw : inner;
    };

    const tidy = (s) =>
      s.replace(/ /g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        .trim();

    // Collect the text of every element that reads as a section heading, so
    // matching lines can be marked in the flat text. Real heading tags first,
    // then the very common "short bold line on its own" pattern.
    const headingsIn = (root) => {
      const found = new Set();
      const add = (el) => {
        const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (t && t.length <= 120) found.add(t);
      };
      root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(add);
      root.querySelectorAll('p,div,li').forEach((el) => {
        const t = (el.textContent || '').trim();
        if (!t || t.length > 90) return;
        const kids = el.children;
        if (kids.length === 1 && /^(strong|b)$/i.test(kids[0].tagName) &&
            (kids[0].textContent || '').trim() === t) add(el);
      });
      return found;
    };

    // Prefix any line that exactly matches a heading. Done on the flat text
    // rather than by mutating the DOM — this runs on the user's live page.
    const markHeadings = (text, headings) =>
      text.split('\n')
        .map((line) => (headings.has(line.trim()) ? `## ${line.trim()}` : line))
        .join('\n');

    const finish = (text, method, node) => {
      const cleaned = markHeadings(tidy(text), node ? headingsIn(node) : new Set());
      // A generous safety cap only, to avoid shipping a pathological page.
      // Real trimming is distill.js's job, after filtering.
      const HARD_CAP = 60000;
      const capped = cleaned.length > HARD_CAP ? cleaned.slice(0, HARD_CAP) : cleaned;
      return {
        ok: capped.length > 0,
        text: capped,
        chars: capped.length,
        method,
        truncated: false,
      };
    };

    // --- 1. hinted containers -----------------------------------------
    const host = location.hostname;
    for (const hint of HINTS) {
      if (!hint.host.test(host)) continue;
      for (const sel of hint.selectors) {
        const node = document.querySelector(sel);
        if (!node) continue;
        const text = readText(node);
        // A hint that matches a near-empty node is a stale selector, not a
        // genuinely empty posting — keep looking rather than returning junk.
        if (text.length >= 200) return finish(text, `hint:${sel}`, node);
      }
    }

    // --- 2. generic density scoring -----------------------------------
    const STRIP = [
      'script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'template',
      'nav', 'header', 'footer', 'aside', 'form', 'button', 'select', 'input',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '[role="search"]', '[role="alert"]', '[aria-hidden="true"]', '[hidden]',
      '.cookie', '.cookies', '#cookie-banner', '.modal', '.popup', '.toast',
      '.breadcrumb', '.breadcrumbs', '.sidebar', '.share', '.social',
    ].join(',');

    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(STRIP).forEach((n) => n.remove());

    let best = null;
    let bestScore = 0;
    const candidates = clone.querySelectorAll(
      'article, main, section, div, td, [role="main"], [itemprop="description"]'
    );

    for (const node of candidates) {
      const text = (node.textContent || '').trim();
      if (text.length < 200) continue;

      // Link-heavy blocks are listings and menus, not descriptions.
      let linkChars = 0;
      for (const a of node.querySelectorAll('a')) {
        linkChars += (a.textContent || '').length;
      }
      const linkDensity = linkChars / text.length;
      if (linkDensity > 0.5) continue;

      // Favour blocks that read like prose: real sentences, real paragraphs.
      const paragraphs = node.querySelectorAll('p, li').length;
      const commas = (text.match(/,/g) || []).length;
      const score = text.length * (1 - linkDensity) + paragraphs * 25 + commas * 3;

      // Prefer the deepest node that still scores well, so we get the
      // description rather than the whole page wrapper containing it.
      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    }

    if (best) return finish(readText(best), 'density', best);

    // --- 3. last resort ------------------------------------------------
    const bodyText = readText(clone);
    if (bodyText.length > 100) return finish(bodyText, 'body', clone);

    return { ok: false, text: '', chars: 0, method: 'none', truncated: false,
      error: 'no substantial text found on the page' };
  } catch (err) {
    return { ok: false, text: '', chars: 0, method: 'error', truncated: false,
      error: String(err && err.message ? err.message : err) };
  }
}
