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

1. **fitcheck** — *personal workbench, building in public.* An AI copilot for the
   two-way fit between what I've done and the roles I want (see `projects/fitcheck/`).
   Its capture component is shipped. Solves a real, persistent problem for me and
   others; outlives any single role. Pointed at PKI/AI target spaces, using it
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

- `projects/fitcheck/` — **the career product.** AI copilot for the two-way fit between
  what I've done and the roles I want. Two arms (A: achievements → jobs → master résumé;
  B: a target job → pull the best supporting achievements → swap in/out), one relevance
  engine, two ingestion lanes (API + capture). Personal workbench, pointed at PKI/AI
  target spaces. See its README for the full vision.
  - `projects/fitcheck/capture/` — the **capture component** ("fitcheck Capture",
    Chrome MV3 extension). Detects job tabs across 83 sites, captures JD text from the
    authenticated DOM where AI fetch is blocked, distills, exports for résumé-fit
    analysis. One component of fitcheck (the capture lane), not the whole product.
- `.claude/skills/pm-loop/` — skill for designing PM loops on AI products
  (trigger → action → self-eval → output; the three loop categories; connecting loops
  to evals). Used to design the feedback loops in every product here.
- **The two-arm relevance engine** generalizes beyond jobs — e.g. score each crypto
  asset against "quantum-vulnerable" is the same architecture, pointed at PKI work.

## Working agreements for code

- Small, understandable steps. Show me the shape before the detail.
- Prefer boring, well-supported tools over clever ones.
- Tests and a short "why" comment where it aids understanding, matching surrounding
  style.
- When a decision has real tradeoffs, surface them and recommend one — don't bury
  them or dump a menu.
