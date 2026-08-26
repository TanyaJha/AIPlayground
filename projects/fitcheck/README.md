# fitcheck

> An AI copilot for the two-way fit between **what you've done** and **the roles you want.**

Most tools match you to a job from your résumé — a lossy compression of your career.
fitcheck works from the fuller record of everything you've done, and it runs in **both
directions.**

> **Start here → [USAGE.md](./USAGE.md)** — the end-to-end how-to (prerequisites, the
> workflow, where your data lives). Inside Claude Code, the front-door skill is **`/fitcheck`**.

## The two directions

```
SCOUT  (capability → market)
   achievements  →  jobs / target spaces  →  master résumé
   "Given everything I've done, where do I fit, and what résumé represents me there?"

CURATE  (target → capability)
   a job I want  →  check vs. achievements + résumé  →  swap experiences in / out
   "Given THIS target, pull the exact experiences that make me a strong fit."
```

Both are the **same core** — a relevance engine, `score(experience, target)` — run with a
different thing held fixed. Build the matcher once; **Scout** aggregates it upward,
**Curate** runs it as a search. Curate's output is a concrete **swap list**: add / promote
/ demote / gap.

> **Curate is fitcheck's core.** Scout's *discovery* (finding and scoring roles across the
> market) is delegated to [career-ops](https://github.com/santifer/career-ops) — see
> [`SCOUT.md`](./SCOUT.md). fitcheck keeps only Scout's evidence-side half: aggregating the
> bank upward into a master résumé.

> See [`NARRATIVE.md`](./NARRATIVE.md) for the full story, or the
> [designed one-pager](https://claude.ai/code/artifact/e1648e03-4e95-4373-bc15-2d1baa5b95bf).

## Getting a job description in

The input to Curate is a target JD. **Discovery is not fitcheck's job** — use
[career-ops](https://github.com/santifer/career-ops) to find and score roles (see
[`SCOUT.md`](./SCOUT.md)), or just paste the JD. For the narrow case of a role behind an auth
wall an AI can't fetch (LinkedIn, Workday), the optional [`capture/`](./capture/) extension
can grab the text from your open tab — an early experiment, not the recommended path.

## Components

| Component | Role | Status |
|---|---|---|
| **`curate/`** | The core — reverse-match a JD → swap list, plus the eval harness (fabrication gate + Selection & Rendering rubrics) ([`curate/`](./curate/)) | 🟢 core, tested |
| **`resume/`** | The renderer — a résumé spec → ATS-safe .docx; enforces no-em-dash; driven by `/tailor` ([`resume/`](./resume/)) | 🟢 in |
| **`track/`** | The outcome-aware Win/Loss loop — `/track` skill + application & bank schemas ([`track/`](./track/)) | 🟢 in, ajv-validated |
| `capture/` | Optional JD-grabber — Chrome extension that reads a JD from an authenticated tab. Early experiment, superseded by career-ops + paste; rough edges, not actively maintained ([`capture/`](./capture/)) | ⚪ early / optional |

## Where it fits

fitcheck is the **evidence + evaluation** layer, not a job-search command center. For
discovery — scanning company portals, scoring the market, tracking a wide funnel —
[career-ops](https://github.com/santifer/career-ops) is excellent and open-source; use it.
fitcheck owns the half it deliberately leaves open: the **reverse** direction (a target →
the exact evidence that fits) and a real **eval layer** that grades every projection against
your source-of-truth bank. The exact boundary and handoff is in [`SCOUT.md`](./SCOUT.md).

## The loop that makes it compound

fitcheck's spine is an **outcome-aware evidence loop** — a Win/Loss loop designed with the
`pm-loop` skill (see [`track/LOOP.md`](./track/LOOP.md)). Every application records *which
framing* was used, so a result attributes back down to the **evidence** level: which
achievement, framed which way, for which role archetype, actually landed.

```
tailor (Curate) → apply → outcome (callback / silence / reject)
        ↑                            │
        └──── attribute to the framing that was used ─────┘
```

Honest by design: at one job-seeker's data volume you **capture** the signal now and a human
reads it — you do **not** auto-learn "which framing wins" from n=5. Calibrating the eval
judge against real callbacks is v2, gated on having the data.

## Why I built this

I'm a PM learning to build with AI — taking the things I struggle with and turning them
into tools that make my life a little simpler, and hopefully yours too. fitcheck came out
of wanting too many things at once, and needing a way to aim at my goals with less
overwhelm.

The idea I keep coming back to: **I build the tools, then use my own tools to steer my
work.**
