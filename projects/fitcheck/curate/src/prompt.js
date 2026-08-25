/**
 * The engine's prompt. This IS the matcher — score(experience, target) is one
 * well-structured Claude call, not an algorithm. When we wrap evals around Curate
 * (the pm-loop prompt-improvement loop), this rubric is what we iterate on.
 */
import { achievementsToPromptBlock } from './achievements.js';

export const SYSTEM = `You are the matching engine inside fitcheck, a career tool.
Your job: score how well a person's past work supports a SPECIFIC target role, and
decide what belongs on a résumé tailored to that role.

Principles you never break:
- Never invent experience. Only reference achievements the person actually provided,
  by their id. If something isn't evidenced, it's a gap — say so plainly.
- Be blunt about weak fits. A shorter, honest list beats a padded one.
- Judge against THIS target, not résumés in general. The same achievement can be a 5
  for one role and a 2 for another.`;

/**
 * Build the user message.
 * @param {{achievements: Array, jobText: string, resumeText?: string}} args
 */
export function buildUserMessage({ achievements, jobText, resumeText }) {
  const hasResume = Boolean(resumeText && resumeText.trim());

  const relevanceRubric = `Score each achievement's relevance to the target, 1–5:
  5 — directly evidences a top requirement of the target, with specifics
  4 — a strong match to a stated requirement
  3 — relevant but generic; could apply to many roles
  2 — tangential to what this target wants
  1 — no real signal for this target`;

  const verdictRules = hasResume
    ? `A current résumé is provided. Assign each achievement a verdict:
  "add"     — strong (relevance ≥ 4) and NOT already on the résumé → put it on
  "promote" — strong and on the résumé but buried → move it up / lead with it
  "keep"    — on the résumé and already well-placed
  "demote"  — on the résumé but low relevance (≤ 2) to this target → cut or shrink
  "omit"    — not on the résumé and low relevance → leave it off`
    : `No current résumé was provided, so you can't compare against one. Use verdicts:
  "add"  — should be featured for this target (relevance ≥ 4)
  "keep" — solid supporting material (relevance 3)
  "omit" — low relevance (≤ 2); leave it off
  (Do not use "promote" or "demote" — those require a current résumé.)`;

  const parts = [
    `# Target role\n${jobText.trim()}`,
    hasResume ? `# My current résumé\n${resumeText.trim()}` : null,
    `# My achievement bank (the full record — much of this is NOT on my résumé)\n${achievementsToPromptBlock(
      achievements
    )}`,
    `# What to do
1. In one line, summarize what this target role actually wants (target_summary).
2. For EVERY achievement in the bank, return an entry in "ranked" with its id, title,
   a relevance score, a verdict, and a one-sentence reason. Sort most relevant first.
3. In "gaps", list requirements the target clearly wants that NONE of my achievements
   evidence. Mark each "dealbreaker" or "addressable", with a short suggestion
   (e.g. "cover-letter it", "worth a small project first").

${relevanceRubric}

${verdictRules}`,
  ].filter(Boolean);

  return parts.join('\n\n');
}
