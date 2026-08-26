/**
 * The Rendering rubric — how a résumé READS, graded as code.
 *
 * The pair to the Selection rubric (rubric.js). Selection grades WHICH achievements to
 * surface; Rendering grades HOW each bullet is written. They are separate on purpose: a
 * perfectly-chosen bullet can still read like a clipped, label-colon fragment, and nothing
 * in the Selection rubric would catch it. (It didn't — that gap is why résumé prose drifted
 * into telegraphic fragments a plain LLM out-wrote.)
 *
 * SINGLE SOURCE OF TRUTH for prose quality. rendering-rubric.md mirrors it for humans.
 */

// GATE — pass/fail. Fabrication is the cardinal sin; so is leaking a guardrail. This gate
// has teeth precisely because a comparison résumé failed it: it wrote the internal dollar
// figure and a framing the candidate had explicitly rejected.
export const GATE = {
  id: 'faithful_and_guardrailed',
  name: 'Faithful and guardrailed',
  rule:
    'Every claim traces to a real bank entry, AND every entry\'s guardrails are honored. ' +
    'A leaked private figure (e.g. an internal dollar estimate where "eight-figure" was ' +
    'required), a rejected framing, or an estimate stated as hard fact fails the gate outright.',
};

// DIMENSIONS — scored 0–5. #3 (full-bodied) and #6 (no padding) are in deliberate tension,
// so "richer" can't quietly become "bloated" and "tight" can't become "clipped".
export const DIMENSIONS = [
  {
    id: 'complete_sentence',
    name: 'Complete sentence, not a fragment',
    five: 'Each bullet reads as a complete, verb-led sentence a person would say out loud. ' +
      'No label-colon headings ("Cloud engineering (X): built…"), no telegraphic lists.',
    zero: 'Bullets are labeled fragments or clipped noun-phrase lists that read like headings, not prose.',
  },
  {
    id: 'concrete_substance',
    name: 'Concrete substance',
    five: 'Says what the thing actually is or does (e.g. "diagnoses replication and ' +
      'account-lockout failures with read-only workflows"), not a vague abstraction.',
    zero: 'Dumbed-down or hand-wavy ("managed the product", "drove improvements") with no specifics.',
  },
  {
    id: 'full_bodied',
    name: 'Full-bodied, not over-compressed',
    five: 'Carries enough detail to be credible and vivid; the reader learns the scope, the ' +
      'how, and the result without having to guess.',
    zero: 'Compressed so hard the meaning is lost or the achievement reads smaller than it was.',
  },
  {
    id: 'impact_forward',
    name: 'Impact-forward (XYZ)',
    five: 'Leads with a strong action and lands a result: did X using Y, which led to Z. The ' +
      'outcome is present, not implied.',
    zero: 'Task- or duty-led with no result, or the result is buried.',
  },
  {
    id: 'reads_human',
    name: 'Reads like a person wrote it',
    five: 'Natural rhythm, varied verbs, no robotic template feel; you could read it aloud in an interview.',
    zero: 'Formulaic or AI-templated cadence; every bullet has the same shape.',
  },
  {
    id: 'no_padding',
    name: 'No padding',
    five: 'Full-bodied but every word earns its place; no filler, hedging, or repetition.',
    zero: 'Wordy or repetitive; length that does not add information.',
  },
];

export const OVERALL = {
  id: 'overall',
  name: 'Overall',
  scale: '0–10 holistic prose score, allowed to diverge from the average when one issue ' +
    '(a fragment style, a dumbed-down bullet) dominates the read.',
};
