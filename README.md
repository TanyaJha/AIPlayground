# AIPlayground

> A public workshop where I build AI tools as a PM — combining deep PKI / identity /
> post-quantum domain expertise with hands-on AI building.

This is a **monorepo**: every project lives here, each self-contained with its own
README. The through-line is [`CLAUDE.md`](./CLAUDE.md) — the mission, thesis, and how
I work.

## Projects

| Project | What it is | Status |
|---|---|---|
| [**fitcheck**](./projects/fitcheck/) | AI copilot for the two-way fit between what you've done and the roles you want. Personal job-hunt workbench. | 🟢 building — capture component shipped |
| **PKI / PQC × AI** | The centerpieces: AI tooling for post-quantum migration, PKI posture, and certificate infrastructure. | 🟡 next — ideas incoming |

## Skills

Reusable playbooks that make the building repeatable (in [`.claude/skills/`](./.claude/skills/)):

| Skill | What it does |
|---|---|
| [**pm-loop**](./.claude/skills/pm-loop/) | Design PM feedback loops for AI products — trigger → action → self-eval → output, connected to evals. |

## How this repo is organized

```
aiplayground/
├── CLAUDE.md            # mission, thesis, operating contract — read this first
├── projects/           # the products, one folder each, each with its own README
│   └── fitcheck/        # the career product
│       └── tab-collector/   # its capture component (Chrome extension)
├── .claude/skills/     # reusable skills (pm-loop)
└── pm-log/             # loop tracking (as it accrues)
```

Built in public, one thing at a time, deep over broad.
