# AIPlayground

> A public workshop where I build AI tools as a PM — combining deep PKI / identity /
> post-quantum domain expertise with hands-on AI building.

This is a **monorepo**: every project lives here, each self-contained with its own
README. The through-line is [`CLAUDE.md`](./CLAUDE.md) — the mission, thesis, and how
I work.

## Projects

| Project | What it is | Status |
|---|---|---|
| [**fitcheck**](./projects/fitcheck/) | The evidence + evaluation layer for a job search (complement to [career-ops](https://github.com/santifer/career-ops), which owns discovery): a reverse-match **Curate** engine, an **eval** harness, and an outcome loop. Personal job-hunt workbench. | 🟢 building — capture shipped; curate + loop in |
| **PKI / PQC × AI** | The centerpieces: AI tooling for post-quantum migration, PKI posture, and certificate infrastructure. | 🟡 next — ideas incoming |

## Skills

Reusable playbooks that make the building repeatable (in [`.claude/skills/`](./.claude/skills/)):

| Skill | What it does |
|---|---|
| [**pm-loop**](./.claude/skills/pm-loop/) | Design PM feedback loops for AI products — trigger → action → self-eval → output, connected to evals. |
| [**fitcheck-curate**](./.claude/skills/fitcheck-curate/) | Reverse-match a target JD against your achievement bank → a swap list (add/promote/keep/demote + gaps). |
| [**fitcheck-grade**](./.claude/skills/fitcheck-grade/) | Grade a Curate output against the Selection rubric — fabrication gate + 9 judge dimensions, run 3×. |
| [**fitcheck-track**](./.claude/skills/fitcheck-track/) | Log applications for the outcome loop; attribute results back to the evidence + framing that was used. |

## How this repo is organized

```
aiplayground/
├── CLAUDE.md            # mission, thesis, operating contract — read this first
├── projects/           # the products, one folder each, each with its own README
│   └── fitcheck/        # the career product (evidence + evaluation layer)
│       ├── capture/     # capture component (Chrome extension)
│       ├── curate/      # reverse-match engine + eval harness
│       └── track/       # the outcome-aware evidence loop
├── .claude/skills/     # reusable skills (pm-loop, fitcheck-curate/grade/track)
└── pm-log/             # loop tracking (as it accrues)
```

Built in public, one thing at a time, deep over broad.
