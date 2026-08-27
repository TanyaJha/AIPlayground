# AIPlayground

> A public workshop where I build AI tools as a PM — combining deep PKI / identity /
> post-quantum domain expertise with hands-on AI building.

This is a **monorepo**: every project lives here, each self-contained with its own
README. The through-line is [`CLAUDE.md`](./CLAUDE.md) — the mission, thesis, and how
I work.

## Projects

| Project | What it is | Status |
|---|---|---|
| [**fitcheck**](./projects/fitcheck/) | The evidence + evaluation layer for a job search (complement to [career-ops](https://github.com/santifer/career-ops), which owns discovery): a graded achievement bank → Curate → grade → tailor → track → stories. Personal job-hunt workbench. | 🟢 complete & usable ([USAGE](./projects/fitcheck/USAGE.md)); capture archived |
| **PKI / PQC × AI** | The centerpieces: AI tooling for post-quantum migration, PKI posture, and certificate infrastructure. | 🟡 next — ideas incoming |

## Skills

Reusable playbooks that make the building repeatable (in [`.claude/skills/`](./.claude/skills/)):

| Skill | What it does |
|---|---|
| [**pm-loop**](./.claude/skills/pm-loop/) | Design PM feedback loops for AI products — trigger → action → self-eval → output, connected to evals. |
| [**fitcheck**](./.claude/skills/fitcheck/) | Front door — routes to the right fitcheck skill and walks setup (see [USAGE](./projects/fitcheck/USAGE.md)). |
| [**fitcheck-curate**](./.claude/skills/fitcheck-curate/) | Reverse-match a target JD against your achievement bank → a swap list (add/promote/keep/demote + gaps). |
| [**fitcheck-grade**](./.claude/skills/fitcheck-grade/) | Grade a Curate output against the Selection rubric — fabrication gate + 9 judge dimensions, run 3×. |
| [**fitcheck-track**](./.claude/skills/fitcheck-track/) | Log applications for the outcome loop; attribute results back to the evidence + framing that was used. |
| [**fitcheck-tailor**](./.claude/skills/fitcheck-tailor/) | Assemble a tailored résumé from a swap list + bank and render it to an ATS-friendly document. |
| [**fitcheck-extract**](./.claude/skills/fitcheck-extract/) | Build the bank in bulk — point at performance reviews, a brag doc, or a work folder and extract atomic, guardrailed achievements. |
| [**fitcheck-bank**](./.claude/skills/fitcheck-bank/) · [**fitcheck-stories**](./.claude/skills/fitcheck-stories/) | Maintain the source-of-truth achievement bank; project STAR interview stories from it. |

## How this repo is organized

```
aiplayground/
├── CLAUDE.md            # mission, thesis, operating contract — read this first
├── projects/           # the products, one folder each, each with its own README
│   └── fitcheck/        # the career product (evidence + evaluation layer)
│       ├── curate/      # the core: reverse-match engine + eval harness
│       ├── resume/      # the renderer (spec → ATS-safe .docx)
│       ├── track/       # the outcome-aware evidence loop
│       └── archive/     # early capture extension, kept for reference
├── .claude/skills/     # reusable skills (pm-loop + fitcheck-* skills)
└── pm-log/             # loop tracking (as it accrues)
```

Built in public, one thing at a time, deep over broad.
