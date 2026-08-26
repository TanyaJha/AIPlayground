# fitcheck — the narrative

> The two-way fit between **what you've done** and **the roles you want.**

📄 **Designed one-pager:** https://claude.ai/code/artifact/e1648e03-4e95-4373-bc15-2d1baa5b95bf
🗺️ **System map** (the whole pipeline in one picture): [`system-map.html`](./system-map.html) · [rendered](https://claude.ai/code/artifact/f4ac6297-1b0e-4609-b8ac-b73f8cab0b0f)

Most tools match you to a job from your résumé — a lossy compression of your career.
fitcheck works from the fuller record of everything you've done, and it runs in **both
directions.**

```
              SCOUT  →
   achievements ───────────▶ [ relevance engine ] ◀─────────── roles & spaces
                            score(experience, target)   ←  CURATE
```

---

## The problem: a résumé is a lossy copy of you

A résumé compresses a career onto one page; a profile compresses the résumé again. Every
tool that matches on those inherits their blind spots — the side project you never wrote
up, the result that didn't fit the margin. The best-fit role gets missed not because you
can't do it, but because the evidence never made the page. fitcheck keeps the
*uncompressed* record and reasons from that.

## How it works: one engine, run two directions

Both directions are the same atomic operation — `score(experience, target)` — with a
different thing held fixed. Build the matcher once; **Scout** aggregates it upward,
**Curate** runs it as a search.

### Scout — capability → market
Given everything I've done, where do I fit — and what résumé represents me in that space?
Company-first: enumerate every open role at a target and rank the fit.
- **fixed:** achievements → **search:** many roles → **out:** best-fit spaces + master résumé

### Curate — target → capability
Given *this* role, pull the exact experiences that make me a strong fit — at any
granularity: one job, a domain, a company. The target is a parameter.
- **fixed:** one target → **search:** my achievements → **out:** a curated swap list

## Curate, made concrete: the output is a swap list

Hold a target fixed, diff it against your current résumé, and the moves write themselves:

```
target — "Senior AI PM, Microsoft"
＋ ADD       built an LLM eval harness      — in achievements, not on résumé, target wants it
＋ ADD       shipped an agent feedback loop
↑ PROMOTE    the AI-product bullet to the top
↓ DEMOTE     the logistics-ops bullet       — irrelevant here
⚠ GAP        wants distributed-systems depth you can't evidence — cover-letter it
```

## Getting the jobs in: Scout leverages career-ops

Finding and scoring the roles — the Scout side's *discovery* — is already a well-built,
open-source problem: [career-ops](https://github.com/santifer/career-ops) scans company
portals and ranks the market. So fitcheck doesn't rebuild that. It **leverages the goodness
of career-ops** to get jobs in, and spends its own depth on the part that's still novel: the
**reverse** direction — a target → the exact evidence that fits — and grading every
projection against the uncompressed record. (An early browser extension, `capture/`, can
still grab a JD from an authenticated tab; it's archived and optional now.)

## Why it compounds

fitcheck isn't a one-shot tool. Outcomes feed back into the engine, and the market keeps
the résumé honest:

```
apply → outcome (response? interview?) → recalibrate what the engine surfaces
new postings in your space → skill drift detected → flag what the master résumé is missing
```

The résumé becomes a living document that tracks its target market — not a file you
rewrite from scratch every hunt.

## Status

| Component | Role | Status |
|---|---|---|
| `curate/` | The core — target → swap list + the eval harness | 🟢 core, tested |
| `resume/` | The renderer — swap list → ATS-safe résumé | 🟢 in |
| `track/` | The outcome-aware Win/Loss loop | 🟢 in |
| `archive/capture/` | The early browser capture extension | ⚪ archived |

## Why I built this

I'm a PM learning to build with AI — taking the things I struggle with and turning them
into tools that make my life a little simpler, and hopefully yours too. fitcheck came out
of wanting too many things at once, and needing a way to aim at my goals with less
overwhelm.

The idea I keep coming back to: **I build the tools, then use my own tools to steer my
work.**
