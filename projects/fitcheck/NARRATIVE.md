# fitcheck — the narrative

> The two-way fit between **what you've done** and **the roles you want.**

📄 **Designed one-pager:** https://claude.ai/code/artifact/e1648e03-4e95-4373-bc15-2d1baa5b95bf

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

## Getting the jobs in: two ingestion lanes

Complementary by design — one goes deep on the companies you're targeting, the other
reads whatever you're already looking at.

| Lane | Covers | How |
|---|---|---|
| **API lane** | Greenhouse, Lever, Ashby | Public, no-auth job-board APIs. Enumerate *every* open role at a target company, with full descriptions. Powers company-first discovery. |
| **Capture lane** | LinkedIn, Indeed, Workday (53 of 83 sites) | No usable API. A browser extension reads the authenticated DOM from inside your session, so bot-blocking never applies. This is **fitcheck Capture**, and it's shipped. |

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
| `capture/` | Capture lane — the Chrome extension | ✅ shipped (50 tests green) |
| `curate/` | The Curate arm — target → swap list | 🟢 building (v0.1) |
| `api-lane/` | Company → ATS resolver + job-board API client | next |
| `matcher/` | The shared relevance engine — both directions | next |
| `resume/` | Master-résumé builder + the swap-list writer | next |

## Why I built this

I'm a PM learning to build with AI — taking the things I struggle with and turning them
into tools that make my life a little simpler, and hopefully yours too. fitcheck came out
of wanting too many things at once, and needing a way to aim at my goals with less
overwhelm.

The idea I keep coming back to: **I build the tools, then use my own tools to steer my
work.**
