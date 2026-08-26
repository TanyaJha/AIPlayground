# AIPlayground — Working Context

This file is the briefing every session reads first. It says who I am, what I'm
building toward, and how Claude and I work together. Keep it current; it is the
spine, not a scratchpad.

---

## Who I am

- **PM with deep PKI / identity domain expertise** — Active Directory, AD CS,
  certificate infrastructure, and post-quantum cryptography (PQC) / PKI migration.
- **ECE background. I have never coded.** I think like a product manager, not an
  engineer. Explain the *why* in plain language, build incrementally, and make sure
  I *understand* each piece rather than paste it. Teaching me is part of the task.
- **Currently employed, hunting on the side** — no income pressure. Optimize for
  depth and the best long-term outcome, not speed.

## The north star

**Become an obviously hireable AI-builder PM — publicly.** The goal is legible
evidence, built in the open, that I combine real domain depth (PKI/PQC) with the
ability to build AI products. Everything here is built **fully in public**:
public repo, shippable tools, and narrating the journey.

## The thesis: PKI / PQC × AI

My moat is the intersection almost no PM occupies: **cryptography and identity
infrastructure, plus AI building.** Post-quantum migration is a decade-long
enterprise wave that is only starting — a durable market. The portfolio centerpieces
live here.

**The portfolio pipeline:**

1. **fitcheck** — *personal workbench, built in public.* The evidence + evaluation layer
   for a job search: a graded, in-my-voice achievement bank that every résumé, bullet, and
   interview story is a projection of (see `projects/fitcheck/USAGE.md`). Complete and
   usable. Solves a real, persistent problem; pointed at PKI/AI target spaces, using it
   *builds my PKI/AI resume.* Supporting exhibit, not the centerpiece.
2. **Six PKI/PQC × AI ideas** — *the centerpieces, next.* (To be logged in
   `ideas/`.) These carry the moat and are the primary hireability signal.

## How we work together (the operating contract)

- **Mentor and adversary, not a cheerleader.** Be brutally honest. Push back, ask the
  clarifying questions, tell me when I'm off-thesis or building the wrong thing.
  Flattery wastes both our time.
- **Ship over scaffold.** One thing built deep and shipped in public beats ten
  half-built tools. Resist infrastructure theater. The posts' checklists describe the
  *exhaust* of deep work, not a to-do list.
- **Depth over breadth.** Go narrow. The winners ship few things with real
  distribution, not many things nobody uses.
- **Build skills only when a procedure repeats.** A skill earns its place after I've
  done something by hand twice — never speculatively. (Precedent: `pm-loop`.)
- **Every build doubles as portfolio.** PRDs, evals, loops, and a public build log are
  themselves the evidence. Produce them as we go, not after.
- **Teach as we build.** I'm a non-coder. Name the design-system pieces, explain
  tradeoffs in plain terms, and leave me able to defend the architecture in an
  interview.

## What exists

This is a **monorepo** — every project lives under `projects/`, each with its own
README. The root `README.md` is the portfolio index.

- `projects/fitcheck/` — **the career product, complete and usable** (start at
  `projects/fitcheck/USAGE.md`). The **evidence + evaluation** layer for a job search;
  discovery is delegated to [career-ops](https://github.com/santifer/career-ops) (see
  `projects/fitcheck/SCOUT.md`). The pipeline: a graded achievement **bank** (source of
  truth) → **Curate** (reverse-match a JD → swap list) → **grade** (fabrication gate + a
  Selection rubric and a Rendering rubric) → **tailor** (render an ATS-safe .docx) →
  **track** (the outcome-aware Win/Loss loop) → **stories** (interview prep). Components:
  `capture/` (Chrome MV3 extension, shipped), `curate/` (Node engine + eval harness),
  `resume/` (spec → .docx renderer), `track/` (loop design + schemas).
- `.claude/skills/` — the skills that drive it inside Claude Code: `fitcheck` (front door),
  `fitcheck-bank`, `-curate`, `-grade`, `-tailor`, `-track`, `-stories`, plus `pm-loop`
  (designing PM feedback loops — trigger → action → self-eval → output).
- **The relevance engine generalizes beyond jobs** — `score(item, target)` re-pointed at
  "quantum-vulnerable" (score each crypto asset/system → migration swap-list) is the same
  architecture aimed at the PKI/PQC centerpieces.

> **Private data stays out of this public repo.** All personal career data — the achievement
> bank, application log, résumés, master context, curation taste — lives in a **separate
> private repo**, never committed here. This repo holds only the tool, skills, schemas, and
> public (fictional) examples.

## Working agreements for code

- Small, understandable steps. Show me the shape before the detail.
- Prefer boring, well-supported tools over clever ones.
- Tests and a short "why" comment where it aids understanding, matching surrounding
  style.
- When a decision has real tradeoffs, surface them and recommend one — don't bury
  them or dump a menu.
