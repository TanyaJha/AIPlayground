---
name: fitcheck
description: >
  The front door to fitcheck — the Claude Code-native tool for tailoring résumés, grading
  them, tracking applications, and prepping interviews from a private achievement bank. Use
  when someone says "use fitcheck", "help me with my résumé / job search", "start fitcheck",
  "how do I use fitcheck", or is new and doesn't know which fitcheck skill they need. Routes
  to the right sub-skill (bank / curate / grade / tailor / track / stories) and walks a new
  user through setup. Full guide: projects/fitcheck/USAGE.md.
---

# /fitcheck — orchestrator

fitcheck runs inside Claude Code: skills orchestrate two Node engines (`curate/`, `resume/`)
over the user's **private** achievement bank. Your job is to route the user to the right step
and, if they're new, get them set up. The end-to-end reference is
[`projects/fitcheck/USAGE.md`](../../projects/fitcheck/USAGE.md).

## First, orient

Ask (or infer) what they want, and route:

| They want to… | Route to |
|---|---|
| Build the bank in bulk from reviews / a work folder / a brag doc | **`/extract`** (fitcheck-extract) |
| Add or maintain a single achievement, framing, or audit | **`/bank`** (fitcheck-bank) |
| Tailor a résumé to a specific role | **`/curate`** then **`/tailor`** |
| Know if a résumé/selection is good | **`/grade`** (fitcheck-grade) |
| Render a résumé to .docx | **`/tailor`** (fitcheck-tailor) |
| Log an application or a result | **`/track`** (fitcheck-track) |
| Prep interview answers | **`/stories`** (fitcheck-stories) |
| Find jobs / scan the market | Not fitcheck — point to career-ops (see `SCOUT.md`) |

## If they're new (no bank yet)

1. Confirm prerequisites: Claude Code, Node (`npm install` in `curate/` and `resume/`), and
   `ANTHROPIC_API_KEY` for the LLM steps.
2. Establish **where their private data lives** — a private repo or local folder, **never**
   this public repo. `bank.json` and `applications.json` follow the schemas in
   `projects/fitcheck/track/schema/`.
3. Build the bank. If they have material to point at (performance reviews, a brag doc, a work
   folder, an old résumé), start with **`/extract`** — it ingests those in bulk. For a single
   accomplishment or a quick brain-dump, use **`/bank`**. Nothing else works well until the
   bank exists.
4. Then run one real cycle: pick a JD → `/curate` → `/grade` → `/tailor`. The first live run
   is what proves it end to end.

## The through-line to hold

- The **bank is the source of truth**; every résumé, bullet, and story is a projection of it.
- Every projection is **graded** (fabrication gate + rubrics) before it's trusted.
- Outcomes feed back via **`/track`** — capture now, learn later; never auto-change a default
  at low n.
- Respect the user's **curation taste** (their private taste file) and the hard rules: no
  fabrication, honor guardrails, no em dashes in a résumé.

Keep private data private. Only the engines, skills, and schemas are public.
