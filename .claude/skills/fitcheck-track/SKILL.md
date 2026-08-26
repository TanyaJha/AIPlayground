---
name: fitcheck-track
description: >
  Log and update job applications for fitcheck's Win/Loss (outcome-aware evidence) loop.
  Use when the user applies to a role, hears back (callback / interview / offer / reject),
  goes silent past the threshold, or wants to review their application pipeline. Records
  WHICH FRAMING was used per application and attributes results back down to the evidence
  (achievement-bank) level, so the loop can eventually calibrate the eval judge against real
  outcomes. Also use for phrases like "log this application", "I heard back from X",
  "mark as sent", "show my pipeline", "win/loss review".
---

# fitcheck /track — the Win/Loss capture skill

This skill maintains the substrate of fitcheck's core loop (see
`projects/fitcheck/track/LOOP.md`). It does **capture and human-in-the-loop review** — it
does **not** auto-change any Curate default. That is deliberate: at a single job-seeker's
data volume, attributing a callback to a framing is causally hopeless, so this skill records
signal cleanly and lets the human decide.

## Files it maintains

- **`applications.json`** — an array of application entries
  (`projects/fitcheck/track/schema/application.schema.json`).
- The **achievement bank** — appends to each surfaced entry's `outcomes[]`
  (`projects/fitcheck/track/schema/bank-entry.schema.json`) when a result lands.
- **`pm-log/week-YYYY-WW.md`** — the weekly review note.

> **Privacy (hard rule):** these live in the user's **private** location (outside the git
> repo — the session scratchpad or their local machine), never committed. The schema, this
> skill, and `LOOP.md` are the only public parts. Confirm the private path with the user;
> never write real applications into the repo.

## Modes

### `log` — a new application
Collect: company, role, `role_archetype` (reuse existing values so outcomes are comparable),
`resume_used`, `achievements_surfaced[]` (bank ids), `framing_notes`, `channel`, and
`eval_scores_at_send` if a `/grade` run exists. Set `status: "prepared"` or `"sent"` with
`sent_at`. Append a `history` entry. Assign a slug `id` like `company-archetype-YYYY-MM`.

### `update` — a state change / result
Move `status` and set `result` + `result_at`. **On any terminal result** (callback /
interview / offer / reject / silence):
1. Append to each surfaced bank entry's `outcomes[]`: `{application_id, framing_id,
   archetype, result, logged_at}`.
2. Ask the user for a **one-line hypothesis** and store it on the application. Frame it as a
   hypothesis, not a conclusion — and **name the channel confounder explicitly** (a referral
   callback is not evidence a framing worked).
3. Do **not** change any Curate/framing default. State plainly that a pattern only graduates
   to a prior when it repeats across **≥2 comparable outcomes** (same archetype, same
   direction, channel controlled for).

### `review` — pipeline / win-loss
Summarize the pipeline by status. For results so far, surface *candidate* patterns strictly
as hypotheses, always with the caveat that n is tiny and channel dominates. If exactly one
comparable pair now agrees, flag it as "eligible to become a prior — your call," never as a
done conclusion.

### `week` — the weekly pm-log note
Write/append `pm-log/week-YYYY-WW.md` with: what was sent, eval delta (this week vs last),
outcome signals, one hypothesis tested, one for next week. This file is the calibration
record; after ~8 weeks it enables the v2 question: *does a high judge score correlate with
real callbacks?*

## Guardrails
- Never fabricate outcomes or dates. If unknown, leave `pending` / `null`.
- Always record `channel` — it is the first confounder to control for.
- Validate written JSON against the two schemas before saving.
- Keep the human in the loop for every prior update; this skill proposes, the user decides.
