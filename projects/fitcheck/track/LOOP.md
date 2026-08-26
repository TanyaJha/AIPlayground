# The outcome-aware evidence loop

fitcheck's spine. Everything else — Curate, the eval harness, the renderer — feeds this
or is fed by it. Designed with the `pm-loop` skill.

## What it is (one sentence)

A **Win/Loss loop** that attributes real-world results (callback / silence / reject) back
down to the **evidence level** — *which achievement, framed which way, for which role
archetype* — so each entry in the achievement bank accumulates a track record of what
actually lands, and that signal (eventually) recalibrates both Curate's defaults and the
LLM-judge.

It closes the empty tier of fitcheck's three-tier eval stack:

```
assertions  (deterministic)   → have it
LLM-judge   (9 rubric dims)   → have it
outcome     (did it work?)    → this loop fills it
```

## The honest part: capture now, learn later

At the volume of a single job-seeker — a handful of applications, binary-ish noisy
outcomes — **you cannot statistically learn "which framing wins."** A callback depends on
referral, timing, comp band, req health, and recruiter load far more than on whether a
bullet said *Advanced* or *Evolved*. Attributing a callback to a framing at n=5 is causally
hopeless, and an automated re-weighting model built on it would overfit noise and lie.

So the loop is deliberately split:

- **v1 (now): structured capture + human-in-the-loop win/loss review.** Record the framing
  used with every application, so the signal accumulates cleanly. When a result lands, a
  human writes a one-line *hypothesis* — not a conclusion. Nothing auto-updates.
- **v2 (later, gated on data): calibration.** Once enough outcomes exist (~8+ weeks), ask
  the one question that needs real data: *does a high LLM-judge score correlate with real
  callbacks?* That correlation is the calibration you cannot get any other way — and it is
  what turns the judge from *plausible* to *trusted*.

Naming v2 as gated, instead of faking attribution at n=5, is the point. Knowing when **not**
to trust a model is the skill.

## Loop anatomy

```
TRIGGER    An application changes state: prepared → sent, or a result lands
           (callback / silence-after-N-weeks / reject).

ACTION     Log the event against the FRAMING used, not just the job:
           { application, role_archetype, achievements_surfaced[],
             framing_used, channel, eval_scores_at_send, result }.
           On a result, the human writes a one-line hypothesis.

SELF-EVAL  The anti-overfit guard — the part most loops skip:
           a pattern does NOT change a Curate default on n=1. It graduates
           to a prior only when it repeats across ≥2 comparable outcomes
           (same archetype, same direction). Until then it stays a logged
           hypothesis. Channel is always controlled for first.

OUTPUT     Either (a) nothing changes — n=1, logged; or
           (b) a human-approved update to a bank entry's `framings` priors
           for an archetype, plus a note in the weekly pm-log.
```

## Where the evals plug in

| Tier | Role in this loop | Cadence |
|---|---|---|
| Assertions | Structural sanity on the swap-list before send | instant, every run |
| LLM-judge (9 dims) | The **leading** quality signal you act on weekly (outcomes lag) | seconds |
| Outcome | The **lagging** north star this loop captures; calibrates the judge in v2 | weeks |

Rule the loop exists to enforce: **never confuse "judge says 4/5" with "it worked."** The
two are kept honest against each other here.

## Tracking

- `applications` log — one entry per application (`schema/application.schema.json`).
- Bank entries carry an `outcomes[]` array (`schema/bank-entry.schema.json`) — the same
  result, attributed down to the evidence.
- Weekly `pm-log/week-YYYY-WW.md` — what was sent, eval deltas, outcome signals, one
  hypothesis tested, one for next week. After 8 weeks this is the calibration record.

> Privacy: the **schema, this design, and the skill are public** (product/methodology).
> The **actual application log and real outcomes are private** — they live outside the repo
> and are never committed, same rule as the résumés.

## What runs when

- **This loop (Win/Loss):** event-driven — fires on send and on result. Build it first;
  the capture is irrecoverable if skipped.
- **Loop #2 (Prompt-improvement), named not built:** weekly — run the 9-dim judge over
  Curate outputs, rewrite the weakest dimension's prompt, re-eval, keep only on positive
  delta. That's the quality engine *between* outcomes, and it runs on signal you already
  have.

## Build order

1. **Capture substrate** (this): schema + `/track` skill + seed with real live applications.
2. Repackage `/curate` + `/grade` as skills that write `eval_scores_at_send` into the log.
3. Weekly `pm-log` habit + the prompt-improvement loop.
4. v2 calibration, once the data exists.
