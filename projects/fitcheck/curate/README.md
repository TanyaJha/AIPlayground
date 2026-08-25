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

## Develop

```bash
npm test          # unit tests for the parser + formatter (no API key needed)
```

The deterministic parts (parsing, formatting) are unit-tested offline. The engine's
quality is measured separately — that's the eval loop, coming next.

## Next

- **Evals** — a golden set of (achievements, job) → expected swap list, with an
  LLM-as-judge, wrapped in the pm-loop prompt-improvement loop.
- **Résumé-aware diffing** — read an existing résumé more precisely to sharpen
  PROMOTE / DEMOTE.
- Shared relevance engine with **Scout** (the other arm).
