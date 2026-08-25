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
| `matcher/` | The relevance engine (Scout + Curate) | planned |
| `resume/` | Master-résumé builder + the swap-list writer | planned |
| `api-lane/` | Company → ATS resolver + job-board API client | planned |

## The loop that makes it compound

fitcheck isn't a one-shot tool — it improves as it's used (see the `pm-loop` skill):

```
apply → outcome (response? interview?) → recalibrate what the engine surfaces
competitor-watch + doc-freshness → keep the master résumé current with the market
```

## How it fits my own hunt

fitcheck is my personal workbench, pointed at **PKI / PQC / identity** target spaces.
Using it to run my own domain job hunt is how it builds my PKI/AI résumé. It's a
supporting exhibit in the portfolio — the PKI/PQC × AI tools are the centerpieces.
