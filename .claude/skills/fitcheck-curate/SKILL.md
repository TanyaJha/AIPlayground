---
name: fitcheck-curate
description: >
  Reverse-match a target job description against the user's achievement bank and produce a
  swap list (ADD / PROMOTE / KEEP / DEMOTE) plus honest gaps — fitcheck's Curate arm. Use
  when the user has a specific role in mind and wants to know which of their experiences to
  surface and how to reframe them, or says "tailor my résumé for this JD", "what should I
  emphasize for this role", "curate for X". The target JD can come from career-ops (Scout),
  the capture extension, or a paste. Wraps projects/fitcheck/curate.
---

# fitcheck /curate — the reverse-match skill

Given a target JD + the achievement bank, this produces the swap list career-ops does not:
*which evidence fits THIS target, and how to reframe it honestly.* It wraps the existing
engine (`projects/fitcheck/curate/src/engine.js`) so evals test exactly what ships.

## Inputs
- **Target JD** — a file or paste. **Where it comes from is Scout's job, not fitcheck's:**
  see `projects/fitcheck/SCOUT.md`. Usually career-ops surfaced it, or the capture extension
  grabbed it, or the user pasted it.
- **Achievement bank** — the user's private `bank.json` (the source of truth; the engine reads
  it directly). An older hand-kept `achievements.md` also works. Private: run locally, never
  paste real customer data into a public place.
- **Current résumé** (optional) — unlocks PROMOTE/DEMOTE verdicts.

## Run it
From `projects/fitcheck/curate/` (needs `npm install` once and `ANTHROPIC_API_KEY`):
```
node src/curate.js <job-file> --achievements <bank.json> [--resume <resume-file>] --json
```
`--achievements` takes the user's `bank.json` (an array of entries) directly — or an
`achievements.md`. It auto-detects by extension/content.
Default model `claude-opus-5` (override with `FITCHECK_MODEL`; `claude-sonnet-5` is cheaper).
In a sandbox with no API key, say so plainly and have the user run it locally — do not fake a
result.

## Output → what to do with it
The result is a validated swap list: `ranked[]` with `{id, verdict (add|promote|keep|demote|
omit), relevance, reason}` + `gaps[]`. Present it grouped by verdict, strongest fit on top,
then:
1. **Grade it** — offer `/grade` (fitcheck-grade) on the output before trusting it. Never
   treat a swap list as done until the gate passes and the dimensions look clean.
2. **Tailor** — feed the ADD/PROMOTE set to the résumé builder to render a tailored doc.
3. **Log the framing** — offer `/track` (fitcheck-track): record `achievements_surfaced` and
   the framing used, so a later outcome attributes back to this exact selection.

## Guardrails (from the user's curation taste — enforce, don't just generate)
- **No fabrication.** Every surfaced claim traces to a real bank entry; honor each entry's
  `guardrails` (e.g. "eight-figure, not the internal figure"; "engineer in cloud, PM in
  identity").
- **Impact-led, proactive, outcome-present (XYZ), expert-survivable, concrete, show range.**
  These are the rubric dimensions `/grade` scores against — generate to them.
- **Never widen scope or imply seniority/ownership not held.**
