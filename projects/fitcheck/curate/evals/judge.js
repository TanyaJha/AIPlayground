/**
 * The LLM-as-judge.
 *
 * Scores a Curate output against the Selection rubric (rubric.js). Two guards
 * against the documented judge biases:
 *   - adversarial framing (told to hunt for problems, not confirm quality)
 *   - run N times and average (judge scores have real variance)
 * For pairwise, we also randomize which output is "A" (defeats position bias).
 *
 * The judge is NOT told which prompt version produced an output (defeats
 * self-enhancement / authority bias). Its trust is established separately, by
 * calibrating against your hand-scores — see rubric.md.
 */
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { achievementsToPromptBlock } from '../src/achievements.js';
import { GATE, DIMENSIONS, OVERALL } from './rubric.js';

export const JUDGE_MODEL = process.env.FITCHECK_JUDGE_MODEL || 'claude-opus-5';

const dim = z.object({ score: z.number().int().min(0).max(5), note: z.string() });

// Build the per-dimension score shape FROM the rubric, so the judge schema can
// never drift out of sync with rubric.js.
const scoresShape = Object.fromEntries(DIMENSIONS.map((d) => [d.id, dim]));

export const JudgeVerdict = z.object({
  gate_pass: z.boolean(),
  gate_note: z.string(),
  scores: z.object(scoresShape),
  overall: z.number().min(0).max(10),
  top_issue: z.string(),
});

function rubricText() {
  const dims = DIMENSIONS.map(
    (d, i) => `${i + 1}. ${d.name} [${d.id}] — 0–5\n   5: ${d.five}\n   0: ${d.zero}`
  ).join('\n');
  return `GATE (pass/fail) — ${GATE.name}: ${GATE.rule}

DIMENSIONS (score each 0–5):
${dims}

${OVERALL.name}: ${OVERALL.scale}`;
}

const JUDGE_SYSTEM = `You are a skeptical hiring-side reviewer grading a tool that selects which of a
candidate's achievements to surface for a specific role. Your job is to find problems,
not to be encouraging. Be strict. If the output fabricates experience or asserts a
metric that wasn't given, fail the gate outright. You are not told which system or
version produced the output; judge only what is in front of you.

Length is not quality. A longer or more elaborate output is not better for being longer —
penalize padding, repetition, and hedging, and reward saying the right thing in fewer
words. Do not let verbosity raise any score.`;

function buildJudgeUser({ jobText, achievements, resumeText, result }) {
  return [
    `# Rubric\n${rubricText()}`,
    `# Target role\n${jobText.trim()}`,
    resumeText ? `# Candidate's current résumé\n${resumeText.trim()}` : `# (no current résumé was provided)`,
    `# Candidate's achievement bank (ground truth — nothing outside this is real)\n${achievementsToPromptBlock(achievements)}`,
    `# The output to grade (a swap list)\n${JSON.stringify(result, null, 2)}`,
    `# Instructions
Grade the output against the rubric. Check the gate first: does anything claim experience
or a metric not present in the bank? Then score each dimension 0–5 with a one-line note,
give an overall 0–10, and name the single biggest issue.`,
  ].join('\n\n');
}

const DIM_IDS = DIMENSIONS.map((d) => d.id);

/**
 * Score one output, averaging over `runs` judge calls.
 * @returns {Promise<{gate_pass:boolean, scores:object, overall:number, notes:string[], top_issues:string[], raw:object[]}>}
 */
export async function scoreOutput({ result, jobText, achievements, resumeText = null, runs = 3, model = JUDGE_MODEL, client }) {
  const anthropic = client || new Anthropic();
  const user = buildJudgeUser({ jobText, achievements, resumeText, result });

  const verdicts = [];
  for (let i = 0; i < runs; i++) {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 4000,
      system: JUDGE_SYSTEM,
      messages: [{ role: 'user', content: user }],
      output_config: { format: zodOutputFormat(JudgeVerdict) },
    });
    if (response.parsed_output) verdicts.push(response.parsed_output);
  }
  if (verdicts.length === 0) throw new Error('Judge returned no valid verdicts.');

  const avg = (nums) => nums.reduce((a, b) => a + b, 0) / nums.length;
  const scores = {};
  for (const id of DIM_IDS) scores[id] = round1(avg(verdicts.map((v) => v.scores[id].score)));

  return {
    gate_pass: verdicts.every((v) => v.gate_pass), // any judge failing the gate fails it
    scores,
    overall: round1(avg(verdicts.map((v) => v.overall))),
    notes: verdicts.map((v) => v.gate_note).filter(Boolean),
    top_issues: verdicts.map((v) => v.top_issue).filter(Boolean),
    raw: verdicts,
  };
}

// --- Pairwise: is output B better than output A? Randomized order per call. ---

const PairVerdict = z.object({
  winner: z.enum(['first', 'second', 'tie']),
  reason: z.string(),
});

/**
 * @returns {Promise<{winner:'a'|'b'|'tie', reason:string}>}
 */
export async function comparePair({ a, b, jobText, achievements, resumeText = null, model = JUDGE_MODEL, client, flip }) {
  const anthropic = client || new Anthropic();
  const swap = typeof flip === 'boolean' ? flip : Math.random() < 0.5; // randomize position
  const first = swap ? b : a;
  const second = swap ? a : b;

  const user = [
    `# Rubric\n${rubricText()}`,
    `# Target role\n${jobText.trim()}`,
    resumeText ? `# Candidate's current résumé\n${resumeText.trim()}` : `# (no current résumé)`,
    `# Achievement bank (ground truth)\n${achievementsToPromptBlock(achievements)}`,
    `# Output FIRST\n${JSON.stringify(first, null, 2)}`,
    `# Output SECOND\n${JSON.stringify(second, null, 2)}`,
    `# Instructions\nUsing the rubric, decide which output is better overall, or "tie".
Favor honesty and the right selections over length — a longer output is not a better one.`,
  ].join('\n\n');

  const response = await anthropic.messages.parse({
    model,
    max_tokens: 2000,
    system: JUDGE_SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: { format: zodOutputFormat(PairVerdict) },
  });
  const v = response.parsed_output || { winner: 'tie', reason: 'no verdict' };
  const winner = v.winner === 'tie' ? 'tie' : (v.winner === 'first' ? (swap ? 'b' : 'a') : (swap ? 'a' : 'b'));
  return { winner, reason: v.reason };
}

function round1(n) { return Math.round(n * 10) / 10; }
