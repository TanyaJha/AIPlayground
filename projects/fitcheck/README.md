# fitcheck

> An AI copilot for the two-way fit between **what you've done** and **the roles you want.**

Most tools match you to a job from your résumé — a lossy compression of your career.
fitcheck works from the fuller record of everything you've done, and it runs in **both
directions.**

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

## Two ingestion lanes

| Lane | Covers | How |
|---|---|---|
| **API lane** | Greenhouse, Lever, Ashby, SmartRecruiters | Public no-auth job-board APIs. Enumerate *all* roles at a target company. Powers company-first discovery. |
| **Capture lane** | LinkedIn, Indeed, Workday, Amazon (53 of 83 sites) | Reads the authenticated DOM from inside the browser — works where AI fetch is blocked. This is `capture/`. |

Complementary: the API lane goes *deep on companies you're targeting*; the capture lane
scores *whatever you're already looking at*.

## Components

| Component | Role | Status |
|---|---|---|
| **`capture/`** | Capture lane — Chrome extension ("fitcheck Capture") that saves job tabs, captures JD text, exports for analysis | ✅ shipped (v0.6.0, 50 tests green) |
| **`curate/`** | The Curate arm — target → swap list. Rubric-driven Claude call ([`curate/`](./curate/)) | 🟢 building (v0.1, 10 tests green) |
| **`track/`** | Win/Loss capture — the `/track` skill + application & bank schemas that feed the outcome loop ([`track/`](./track/)) | 🟢 building (schema + skill in, ajv-validated) |
| **`resume/`** | The renderer — a résumé spec → ATS-safe .docx; enforces no-em-dash; driven by `/tailor` ([`resume/`](./resume/)) | 🟢 building (renderer + guard in) |
| `matcher/` | The shared relevance engine (Scout + Curate) | planned |
| `api-lane/` | Company → ATS resolver + job-board API client | planned |

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
