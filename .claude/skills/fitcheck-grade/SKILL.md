---
name: fitcheck-grade
description: >
  Grade a fitcheck Curate output (or a résumé/bullet selection) against the Selection rubric
  using the eval harness — a pass/fail fabrication gate + 9 LLM-judge dimensions (run 3x and
  averaged) + deterministic assertions. Use when the user wants to know if a swap list or
  tailored output is actually good, before trusting or sending it, or says "grade this",
  "eval my curate output", "is this résumé selection solid", "run the evals". Produces scores
  that feed the outcome loop (eval_scores_at_send in /track). Wraps projects/fitcheck/curate/evals.
---

# fitcheck /grade — the eval skill

The measurement half of fitcheck. It refuses to let "looks good" stand in for "is good": a
Curate output is graded adversarially before it's trusted, and the scores become the leading
signal in the outcome loop (`projects/fitcheck/track/LOOP.md`).

## The rubric (single source of truth)
`projects/fitcheck/curate/evals/rubric.js` — do not restate it elsewhere; it drives the
judge. Structure:
- **GATE (pass/fail):** `no_fabrication`. Fails the whole output regardless of everything else.
- **9 dimensions (0–5 each):** valid_translation, **technical_accuracy** (expert-survivable),
  right_on_top, **evidence_spread** (anti-concentration), honest_gaps, impact_ownership,
  **proactive_framing**, recruiter_plausible, conciseness. (The bold three encode the user's
  own curation taste — see the private master context.)
- **Overall:** 0–10 holistic.

## Run it
From `projects/fitcheck/curate/` (needs `npm install` + `ANTHROPIC_API_KEY`):
```
node evals/run.js [--bank <file>] [--only <caseId>] [--runs 3] [--no-judge]
```
For each golden case: Curate → assertions (free, deterministic) → judge (rubric, 3x averaged)
→ writes a timestamped result and appends `evals/eval-history.json` (the before/after record).
Bias guards are built in: adversarial framing, identity hidden, judged 3x, pairwise order
randomized. No API key in the sandbox → have the user run it locally; never invent scores.

## Reading the result
- `gate_pass` — if false, stop; the output is unusable until the fabrication is fixed.
- per-dimension scores + `top_issue` — the weakest dimension is the next thing to fix (this
  is the hook for the prompt-improvement loop: rewrite that dimension's guidance, re-eval,
  keep only on positive delta).
- `overall` + `pass_rate` / `mean_overall` across cases.

## How it feeds the loop
When grading the output that will actually be sent, capture the scores as
`eval_scores_at_send` via `/track`. That is what later lets the v2 question be asked: *did a
high judge score correlate with a real callback?* — the calibration that turns the judge from
plausible to trusted. Until then: **never confuse "judge says 4/5" with "it worked."**

## Scope note
Today `/grade` covers the **Selection rubric** (Curate swap lists). Grading **referrals** has
its own rubric, specified but not built — see `projects/fitcheck/curate/evals/BACKLOG.md`.
When asked to grade a referral, apply that spec's dimensions by hand and say it's pre-harness.
