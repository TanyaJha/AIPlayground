/**
 * The Selection rubric — the contract Curate is graded against.
 *
 * This is the SINGLE SOURCE OF TRUTH. The LLM-judge builds its prompt from this
 * object, and rubric.md mirrors it for humans. Change it here, not in two places.
 *
 * Grades the SWAP LIST (which achievements, verdicts, gaps) — NOT the final
 * résumé bullet text. Bullet wording is a separate component (the résumé-writer)
 * with its own "Rendering rubric".
 */

// A GATE is pass/fail: if it fails, the whole output is unusable regardless of
// how good everything else is. Fabrication is the cardinal résumé sin.
export const GATE = {
  id: 'no_fabrication',
  name: 'No fabrication',
  rule:
    'Every claim traces to a real achievement in the bank. No invented experience, ' +
    'no asserted metric that was not provided. A placeholder addressed to the user ' +
    '(e.g. "[X% — you fill in]") is allowed; a fabricated number stated as fact is NOT.',
};

// DIMENSIONS are scored 0–5 (coarse on purpose — coarse scales are more reliable).
export const DIMENSIONS = [
  {
    id: 'valid_translation',
    name: 'Valid translation',
    five: 'Cross-domain reframes are fair — e.g. an engineer who owned a recurring ' +
      'pain point is surfaced as PM signal — without ever implying a role, title, or ' +
      'scope the person did not hold.',
    zero: 'Reframes overreach: they imply seniority, ownership, or scope not evidenced.',
  },
  {
    id: 'right_on_top',
    name: 'Right things on top',
    five: 'The achievements that genuinely fit THIS target are the ones marked ADD/PROMOTE, ' +
      'ordered strongest-fit first.',
    zero: 'An obvious best-fit achievement is buried, mis-verdicted, or omitted.',
  },
  {
    id: 'honest_gaps',
    name: 'Honest & adjacent gaps',
    five: 'Names the real gaps plainly; where a gap-adjacent achievement exists, offers it ' +
      'rather than staying silent.',
    zero: 'Papers over a gap, or leaves a requirement unaddressed when an adjacent ' +
      'achievement was available.',
  },
  {
    id: 'impact_ownership',
    name: 'Impact & ownership reasoning',
    five: 'Each "reason" is outcome-led and uses driver language (drove, launched, cut, ' +
      'shipped) — what the person did that changed the result.',
    zero: 'Reasoning is participation/ops-led ("helped with", "was involved in") or ' +
      'describes tasks rather than outcomes.',
  },
  {
    id: 'recruiter_plausible',
    name: 'Recruiter-plausible',
    five: 'Reads in well-known PM language a recruiter skimming for 6–8 seconds would nod ' +
      'at — no clunky, internal, or overly technical jargon.',
    zero: 'Jargon-heavy or phrased in internal/technical terms a recruiter would stall on.',
  },
  {
    id: 'conciseness',
    name: 'Conciseness — length is not quality',
    five: 'Says the right thing in as few words as it needs. Reasons are tight one-liners; ' +
      'gaps are crisp. No padding, repetition, or hedging.',
    zero: 'Bloated — verbose reasons, repetition, or hedging. A longer output is never ' +
      'better for being longer.',
  },
];

export const OVERALL = {
  id: 'overall',
  name: 'Overall',
  scale: '0–10 holistic score, allowed to diverge from the per-dimension average when ' +
    'one issue dominates the read.',
};
