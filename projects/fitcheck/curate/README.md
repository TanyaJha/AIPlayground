# fitcheck Curate

> The **target → capability** arm of [fitcheck](../). Give it a job you want and it
> pulls the experiences that make you a strong fit — as a **swap list**.

```
your achievement bank  +  a target job  ( + optional current résumé )
        ↓
  score(experience, target)   ← one Claude call, rubric-driven
        ↓
  ＋ ADD / ↑ PROMOTE / · KEEP / ↓ DEMOTE  +  ⚠ GAPS
```

The engine is a **prompt, not an algorithm** — `score(experience, target)` is a single
structured Claude call ([`src/prompt.js`](src/prompt.js)). That's deliberate: it's the
PM-native way to build a matcher, and it's what the evals loop will iterate on next.

## Run it

```bash
cd projects/fitcheck/curate
npm install                       # one time
export ANTHROPIC_API_KEY=sk-ant-...

# try it against the bundled sample immediately:
node src/curate.js examples/job.sample.txt --achievements examples/achievements.sample.md

# against your own:
node src/curate.js path/to/target-job.txt --achievements achievements.md
node src/curate.js target-job.txt --achievements achievements.md --resume my-resume.txt
```

- No `--achievements`? It looks for `./achievements.md`, then falls back to the sample.
- `--resume` unlocks the full ADD / PROMOTE / DEMOTE swap; without it you get
  rank + select + gaps.
- `--json` prints the raw structured result instead of the formatted list.
- `FITCHECK_MODEL=claude-sonnet-5` to trade a little quality for lower cost
  (default is `claude-opus-5`).

## Your achievement bank

A plain markdown file. Each achievement starts with a `##` heading; everything under it
is kept as-is:

```markdown
## Migrated identity service to Kubernetes
Led a 3-engineer effort to move our auth service to GKE.
impact: cut deploy time from 40m to 6m; zero-downtime cutover
tags: kubernetes, identity, leadership
```

The bank is the whole point — it holds *everything* you've done, including the work
that never made it onto a résumé. See [`examples/achievements.sample.md`](examples/achievements.sample.md).

## How the pieces fit

| File | Job |
|---|---|
| `src/achievements.js` | Parse the bank into `{ id, title, text }` entries |
| `src/prompt.js` | Build the scoring prompt + rubric (the engine) |
| `src/schema.js` | The shape of the result — validated via structured outputs |
| `src/format.js` | Render the swap list for the terminal |
| `src/curate.js` | The CLI: read files → call Claude → print |

## Evals — is the engine any good?

A prompt with no eval is a guess. The [`evals/`](evals/) harness measures Curate's
quality on a golden set, using three layers (see [`evals/rubric.md`](evals/rubric.md)):

1. **Assertions** (`evals/assertions.js`) — deterministic, free tripwires: no
   hallucinated ids, full coverage, legal verdicts, plus per-case certainties you
   encode in each `expect.json` ("warehouse must be OMIT for the AI-PM role").
2. **LLM-judge** (`evals/judge.js`) — scores the [Selection rubric](evals/rubric.js)
   (a gate + 5 dimensions, 0–5 each), adversarially, run 3× and averaged. Identity
   hidden, pairwise order randomized — to defeat position / verbosity / self-enhancement bias.
3. **Calibration** — you hand-score a few outputs on the same rubric; trust the judge
   only once it agrees with you (~80%+). The human-in-the-loop, with teeth.

```bash
npm run eval                 # run all golden cases (needs ANTHROPIC_API_KEY)
npm run eval -- --only ai-pm # one case
npm run eval -- --runs 5     # more judge samples per case
```

Results append to `evals/eval-history.json` (the memory — kept in git); bulky per-run
dumps land in `evals/results/` (git-ignored). Golden cases live in
`evals/cases/<id>/` as a `job.txt` + an `expect.json` of assertions.

```bash
npm test          # unit tests for parser, formatter, and assertions (no API key needed)
```

## Next

- **Real golden cases** — swap the sample bank for your `achievements.md` and your real
  target jobs; add the stretch roles you flagged as honesty tests.
- **Calibrate the judge** against your hand-scores, then run the first
  prompt-improvement loop (tweak `src/prompt.js` → re-eval → pairwise old vs. new).
- **The résumé-writer** — turns selected achievements into XYZ bullets, graded by the
  Rendering rubric in `evals/rubric.md`.
- Shared relevance engine with **Scout** (the other arm).
