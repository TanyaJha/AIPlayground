/**
 * Section distiller.
 *
 * A captured job post is mostly not the job. Company mission statements, EEO
 * boilerplate, benefits lists, and "why you'll love it here" routinely account
 * for more than half the text — and because that material sits at the *top* of
 * most postings, a naive character cap spends its whole budget on it and cuts
 * off the qualifications entirely.
 *
 * This module takes the structured text produced by extract.js (headings marked
 * with a leading `## `) and keeps only the sections that describe the actual
 * job: what you'd do, and what you'd need.
 *
 * Everything here is a pure string function, so it is fully testable in plain
 * Node with no browser involved. See test/distill.test.js.
 */

/**
 * Headings whose sections we keep. Matched case-insensitively as substrings of
 * the heading line, so "Minimum qualifications:" matches `qualification`.
 */
const KEEP = [
  // What the job is
  'responsibilit', 'what you will do', "what you'll do", 'what you will be doing',
  "what you'll be doing", 'the role', 'about the role', 'about this role',
  'in this role', 'your impact', 'the impact', 'day-to-day', 'day to day',
  'job description', 'position summary', 'role summary', 'job summary',
  'the opportunity', 'essential function', 'essential dutie', 'dutie',
  'what the job involves', 'scope', 'you will', 'core focus', 'the work',
  'about the job', 'job details', 'what you would do',

  // What you need
  'qualification', 'requirement', 'skills', 'experience', 'who you are',
  "what we're looking for", 'what we are looking for', 'you have', 'you bring',
  'must have', 'must-have', 'nice to have', 'nice-to-have', 'preferred',
  'minimum', 'basic', 'desired', 'ideal candidate', 'background',
  'competenc', 'expertise', 'proficien', 'education',

  // Practical decision factors — not fluff
  'salary', 'compensation', 'pay range', 'base pay', 'pay transparency',
  'location', 'remote', 'travel', 'visa', 'sponsorship', 'clearance',
  'tech stack', 'technolog', 'tools you',
];

/**
 * Headings whose sections we drop. Only consulted when nothing in KEEP matched,
 * so a heading like "Compensation and benefits" is kept for the pay figure
 * rather than dropped as a perks list.
 */
const DROP = [
  // Company marketing
  'about us', 'about the company', 'about our', 'our story', 'our mission',
  'our vision', 'our values', 'our culture', 'our team is', 'who we are',
  'why join', 'why work', 'why us', 'why you', 'life at', 'working at',
  'what we offer', 'what we do', 'company overview', 'our commitment',
  'meet the team', 'our people', 'perks', 'benefit', 'total reward',
  'wellness', 'wellbeing', 'well-being', 'time off', 'vacation', 'holiday',
  'insurance', 'retirement', 'parental leave',

  // Legal and process boilerplate
  'equal opportunit', 'equal employment', 'eeo', 'e-verify', 'everify',
  'diversity', 'inclusion', 'belonging', 'affirmative action',
  'accommodation', 'disabilit', 'veteran', 'protected status',
  'background check', 'drug screen', 'privacy', 'legal', 'disclaimer',
  'notice to', 'fair chance', 'ban the box', 'right to work',
  'agencies', 'recruiters', 'third party', 'third-party',

  // Site chrome that survived extraction
  'similar job', 'related job', 'recommended for you', 'more jobs',
  'share this', 'apply now', 'sign in', 'cookie', 'newsletter',
  'follow us', 'social', 'subscribe',
];

/** Is this line a section heading emitted by extract.js? */
function isHeading(line) {
  return line.startsWith('## ');
}

function headingText(line) {
  return line.slice(3).trim();
}

/**
 * Decide what to do with a section, given its heading.
 * @returns {'keep'|'drop'|'unknown'}
 */
export function classifyHeading(heading) {
  const h = heading.toLowerCase().replace(/[:•\-–—*]+\s*$/, '').trim();
  if (!h) return 'unknown';

  if (KEEP.some((k) => h.includes(k))) return 'keep';

  // "About <CompanyName>" is the single most common boilerplate heading, and
  // listing every company is obviously hopeless. Anything starting with "about"
  // is company blurb unless it is about the job itself — and the job-shaped
  // variants ("About the role", "About this position") already matched KEEP
  // above, so reaching here means it did not.
  if (/^about\b/.test(h) && !/\b(role|job|position|team|opportunity|work|you)\b/.test(h)) {
    return 'drop';
  }

  if (DROP.some((d) => h.includes(d))) return 'drop';
  return 'unknown';
}

/**
 * Split structured text into sections at heading boundaries.
 * Text before the first heading becomes a section with a null heading.
 */
function splitSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = { heading: null, lines: [] };

  for (const line of lines) {
    if (isHeading(line)) {
      if (current.heading !== null || current.lines.some((l) => l.trim())) {
        sections.push(current);
      }
      current = { heading: headingText(line), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading !== null || current.lines.some((l) => l.trim())) {
    sections.push(current);
  }
  return sections;
}

const bodyOf = (section) => section.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

/**
 * Keep the parts of a job post that describe the job.
 *
 * @param {string} text structured text from extract.js
 * @param {object} [opts]
 * @param {number} [opts.maxChars] cap applied AFTER filtering, not before
 * @param {number} [opts.preambleMax] cap on the untitled text before the first
 *   heading — usually a one-paragraph intro worth keeping, occasionally a wall
 *   of company blurb that is not
 * @param {boolean} [opts.keepUnknown] keep sections whose heading matched
 *   neither list. Defaults true: better to carry some extra text than to
 *   silently discard a section named something we didn't anticipate.
 * @returns {{text: string, kept: string[], dropped: string[], originalChars: number,
 *            chars: number, truncated: boolean, distilled: boolean}}
 */
export function distill(text, {
  maxChars = 6000,
  preambleMax = 700,
  keepUnknown = true,
} = {}) {
  const original = (text || '').trim();
  const originalChars = original.length;

  const sections = splitSections(original);
  const headed = sections.filter((s) => s.heading !== null);

  // With no headings at all there is nothing to reason about. Return the text
  // as-is (truncated) rather than guessing at boundaries and cutting something
  // real. One heading is enough to work with.
  if (headed.length === 0) {
    const truncated = original.length > maxChars;
    return {
      text: truncated ? `${original.slice(0, maxChars)}\n\n…[truncated]` : original,
      kept: [], dropped: [], originalChars,
      chars: Math.min(original.length, maxChars),
      truncated, distilled: false,
    };
  }

  const kept = [];
  const dropped = [];
  const out = [];

  for (const section of sections) {
    const body = bodyOf(section);

    if (section.heading === null) {
      // Preamble: keep a bounded amount of it.
      if (!body) continue;
      out.push(body.length > preambleMax ? `${body.slice(0, preambleMax)}…` : body);
      continue;
    }

    const verdict = classifyHeading(section.heading);
    const keep = verdict === 'keep' || (verdict === 'unknown' && keepUnknown);

    if (!keep) {
      dropped.push(section.heading);
      continue;
    }
    // A heading with no body under it is a stray bold line, not a section.
    if (!body) {
      dropped.push(section.heading);
      continue;
    }

    kept.push(section.heading);
    out.push(`## ${section.heading}\n${body}`);
  }

  let result = out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

  // Everything got dropped — almost certainly a misclassification, so fall back
  // to the unfiltered text rather than handing back nothing.
  if (!result) {
    const truncated = original.length > maxChars;
    return {
      text: truncated ? `${original.slice(0, maxChars)}\n\n…[truncated]` : original,
      kept: [], dropped, originalChars,
      chars: Math.min(original.length, maxChars),
      truncated, distilled: false,
    };
  }

  const truncated = result.length > maxChars;
  if (truncated) result = `${result.slice(0, maxChars)}\n\n…[truncated]`;

  return {
    text: result,
    kept, dropped, originalChars,
    chars: result.length,
    truncated,
    distilled: true,
  };
}
