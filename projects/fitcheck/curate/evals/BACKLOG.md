# Curate — evals backlog

Parked ideas, specified well enough to pull into a real build when they earn priority.
Not a to-do list to burn down — each item waits until it's the right next thing.

---

## Referral-critique rubric *(parked 2026-08-25)*

A **separate rubric** from the Selection rubric (`rubric.js`). It grades a **referral
draft**, not a swap list — different input (a written vouch) and different output
(critique + suggested rewrite) — so it must not be folded into `rubric.js`. New file
when built (e.g. `referral-rubric.js`), same rubric-as-code + adversarial LLM-judge
pattern the Selection rubric uses.

**Why it exists.** A referral is a *character and fit check, not résumé vomit* — it
should show what is **not** on the résumé and calibrate every claim to how the referrer
actually knows the candidate. (This is curation-taste #9; see the private context file.)

**Gate (pass/fail).** No fabricated relationship, and no claim the referrer could not
truthfully make from their real vantage.

**Seed dimensions (score 0–5 each):**
- **Non-redundant with the résumé** — surfaces character, trajectory, and judgment the
  résumé can't; does not restate bullets.
- **Vantage-calibrated** — claims match how the referrer knows the candidate. A friend
  who has *seen them work* but not worked with them vouches for trajectory and character,
  not coworker-level task intimacy. No reaching for intimacy that wasn't earned.
- **Specific & human** — concrete moments over adjectives; does not read as generic or
  AI-written.
- **Fit-to-role** — one honest line connecting the person to *this* team, without turning
  into a spec sheet.
- **Warm but credible** — advocacy that stays believable; clear-eyed about where the
  candidate is stretching (which raises trust rather than lowering it).

**When built:** add a golden case or two (a strong referral, a résumé-vomit one), and
calibrate the judge against hand-scores the same way the Selection rubric does.
