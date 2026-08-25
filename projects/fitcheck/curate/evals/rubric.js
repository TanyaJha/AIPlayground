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
    // Distinct from the fabrication gate: the achievement is real, but a reframe can
    // still introduce a DOMAIN error a recruiter would miss and an expert interviewer
    // would catch. (Drawn from a real miss: attaching a "harvest-now, decrypt-later"
    // confidentiality threat to a signature scheme, where it does not apply.)
    id: 'technical_accuracy',
    name: 'Technical accuracy — expert-survivable',
    five: 'Every domain claim in the reasons survives a domain expert, not just a ' +
      'recruiter — technical terms are applied correctly and no capability is ' +
      'mis-described. A reframe changes emphasis, never technical meaning.',
    zero: 'A reframe introduces a domain error — misapplies a technical term or asserts ' +
      'a property the work does not have (e.g. attaching a confidentiality threat to a ' +
      'signature scheme) — the kind of thing an expert interviewer would flag.',
  },
  {
    id: 'right_on_top',
    name: 'Right things on top',
    five: 'The achievements that genuinely fit THIS target are the ones marked ADD/PROMOTE, ' +
      'ordered strongest-fit first.',
    zero: 'An obvious best-fit achievement is buried, mis-verdicted, or omitted.',
  },
  {
    // Anti-concentration: one initiative stacking the whole shortlist makes a broad
    // candidate read as narrow. Only fires when the bank + target actually allow breadth
    // — a genuine specialist role, or a bank centered on one thing, is not penalized.
    id: 'evidence_spread',
    name: 'Evidence spread — anti-concentration',
    five: 'The surfaced (add / promote, top-ranked) achievements show range across ' +
      'distinct products, skills, or scopes where the bank and target allow — no single ' +
      'initiative dominates the shortlist.',
    zero: 'The shortlist over-concentrates on one initiative or product when the bank ' +
      'offered relevant breadth, making the candidate look narrower than they are.',
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
    // Sibling to impact_ownership but distinct: ownership is "you did it and it mattered";
    // proactive framing is "you got ahead of it / created the scope" vs "you cleaned up
    // after a fire". Held in check by the gate — reframe initiative, never invent it.
    id: 'proactive_framing',
    name: 'Proactive framing',
    five: 'Reasons cast the candidate as driving and initiating — creating scope, ' +
      'getting ahead of a problem — rather than reacting to a fire, where the achievement ' +
      'genuinely supports it.',
    zero: 'Reasons read as reactive ("responded to an escalation", "helped when X broke") ' +
      'though the achievement supports a proactive frame — OR overreach by inventing ' +
      'initiative the achievement does not support.',
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
