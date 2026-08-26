# Scout: delegated to career-ops

fitcheck used to imagine building **Scout** (discovery — finding and scoring roles across the
market). It won't. [career-ops](https://github.com/santifer/career-ops) already does that
well, open-source, and its per-company-portal scan is a healthier signal than depending on a
single aggregator like LinkedIn. So fitcheck **references career-ops for Scout** and spends
its own depth on the half career-ops leaves open: **evidence + evaluation** (Curate + grade).

This is a deliberate positioning choice, and naming it is part of building in public.

## The split

```
career-ops (Scout / discovery)                 fitcheck (evidence + evaluation)
────────────────────────────────              ────────────────────────────────
scan 45+ company portals                       the achievement bank (source of truth)
score the market vs your CV (A–H)      ──JD──▶  /curate: reverse-match JD → swap list
tailor an ATS CV, track the funnel             /grade: rubric + LLM-judge on every output
find the hiring manager                        /track: outcome-aware evidence loop
```

The **handoff is the JD.** career-ops (or the capture extension, or a paste) surfaces a role;
its job description is the input to fitcheck's `/curate`. fitcheck does not scan, rank the
market, or maintain a wide funnel — it takes one target and answers *"which of my evidence
fits this, how do I frame it honestly, and is it any good?"*

## Where the reference lives (so it's real, not lip service)
- **`README.md` → "Where it fits"** — points users to career-ops for discovery.
- **`.claude/skills/fitcheck-curate`** — the Inputs section names career-ops as a source of
  the target JD.
- **This file** — the explicit boundary.

## What fitcheck keeps from the old "Scout" idea
Only the **evidence-side** part, which was never discovery: aggregating the bank upward into a
**master résumé that keeps up with time.** That is bank + `/tailor`, not market scanning — so
it stays with fitcheck. Discovery is career-ops's.

## Using both together (recommended personal workflow)
1. **career-ops** surfaces and scores roles; you pick the few worth your time.
2. For each, hand the JD to **`/curate`** → swap list; **`/grade`** it; **`/tailor`** to a doc.
3. **`/track`** logs which framing you used, and later the outcome — closing fitcheck's loop.

Two tools, one pipeline, no overlap.
