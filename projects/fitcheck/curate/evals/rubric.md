# Curate eval rubrics

Two separate rubrics — because Curate and the résumé-writer are two different
machines. Grading them as one would make the eval incoherent.

| Rubric | Grades | Component | Status |
|---|---|---|---|
| **Selection** (below) | Which achievements to pick / rank / gap | **Curate** | active |
| **Rendering** | Is the written bullet XYZ, tight, ATS-clean? | résumé-writer | when we build the master résumé |

The **Selection rubric** is the single source of truth in [`rubric.js`](rubric.js) — the
judge builds its prompt from that object. This doc mirrors it for humans.

---

## Selection rubric (Curate)

### Gate — must pass, or the whole output fails
- **No fabrication.** Every claim traces to a real achievement. No invented experience;
  no asserted metric that wasn't provided. A placeholder *addressed to the user*
  (`"[X% — you fill in]"`) is fine; a fabricated number stated as fact is not.

### Dimensions — scored 0–5 each (coarse on purpose)
1. **Valid translation** — cross-domain reframes are fair (an engineer who owned a
   recurring pain point → PM signal) *without* implying a role/scope not held.
2. **Right things on top** — genuine best-fit achievements are ADD/PROMOTE, strongest first.
3. **Honest & adjacent gaps** — names real gaps; offers gap-adjacent achievements over silence.
4. **Impact & ownership reasoning** — reasons are outcome-led, driver verbs, not participation.
5. **Recruiter-plausible & concise** — a 6–8s skim would nod; tight, no clunky jargon.

Plus an **Overall** 0–10 holistic score, allowed to diverge when one issue dominates.

---

## How the rubric is used (the loop)

1. **Assertions** (free, deterministic) — structural + your per-case certainties.
2. **LLM-judge** — scores gate + the 5 dimensions + overall, adversarially, run 3× and
   averaged. Identity hidden, order randomized (to defeat position / verbosity /
   self-enhancement bias).
3. **Calibration** — you hand-score a few outputs on this same rubric. We only trust
   the judge once it agrees with you (≈80%+). If it doesn't, we fix the *rubric/judge*,
   not the product. This is the human-in-the-loop, with teeth.
4. **Pairwise** — when the prompt changes, the judge compares old vs. new (randomized
   order) and we keep the change only if it wins **and** breaks no assertion.

---

## Rendering rubric (résumé-writer — future)

Recorded now so we don't lose it; applied when we build the master résumé.

- **XYZ formula** — "Accomplished [X] as measured by [Y] by doing [Z]" (Google/Laszlo Bock).
- **Strong action verb first** — drove, launched, cut, shipped; never "responsible for".
- **Metrics or honest placeholders** — real numbers, or `[X% — you fill in]`. Never a
  fabricated figure.
- **≤ 2 sentences**, ~11–12pt. A third sentence must earn its space.
- **ATS-aware, not stuffed** — mirror the posting's language, but keyword-stuffing reads
  as a red flag to both smarter parsers and recruiters. Readability wins ties.
- **No dense read** — well-known language over internal/technical jargon.
