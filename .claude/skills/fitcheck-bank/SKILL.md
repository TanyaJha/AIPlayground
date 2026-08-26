---
name: fitcheck-bank
description: >
  Create and maintain the fitcheck achievement bank — the atomic, guardrailed, outcome-aware
  source of truth that every résumé, bullet, and story is a projection of. Use when the user
  wants to add an accomplishment, structure raw material (a review, a brain-dump, a captured
  role) into bank entries, add an approved reframe for a role archetype, or audit the bank.
  Triggers: "add this to my bank", "structure my achievements", "turn my review into
  achievements", "add a framing for X roles", "audit my bank". Writes to the user's PRIVATE
  bank following projects/fitcheck/track/schema/bank-entry.schema.json.
---

# fitcheck /bank — maintain the source of truth

The bank is not a résumé and not a context blob: it is a set of **atomic, structured,
guardrailed** evidence objects. Every downstream artifact (a Curate swap list, a tailored
résumé, a STAR story) is a *lossy projection* of a selection from it. Get the bank right and
everything downstream is grounded; get it wrong and every projection inherits the flaw.

Schema: `projects/fitcheck/track/schema/bank-entry.schema.json`. Validate every entry.

> **Privacy (hard rule):** the bank holds customer names, internal figures, and unreleased
> detail. It is **private** — lives outside the repo (scratchpad / local), never committed.
> Only the schema is public.

## Modes

### `add` — raw material → structured entry
From a résumé line, a performance review, a brain-dump, or a captured role, produce one
**atomic** entry (one achievement, not a career summary):
- `raw_evidence` — the **lossless** narrative, including detail that never reaches a résumé.
- `metrics[]` — each with `basis` and `confidence` (hard / estimate / directional). Never
  invent a number; if unknown, leave it out.
- `scope` — role, ownership (owned/led/contributed/supported), team, customers.
- `tags[]` — skills/domains for retrieval.
- `guardrails[]` — **what must NOT be claimed** (e.g. "eight-figure, not the internal
  figure"; "engineer in cloud, PM in identity"; "not fully automated"). First-class data so
  `/grade` can enforce it.
- `visibility` — public or private.
Split anything that bundles two achievements. Dedup against existing entries by id.

### `framings` — add an approved reframe
For a target `archetype` (e.g. `cloud-security`, `ai-native`), add a `framings[]` entry: the
reframed line + `approved: true` once the user signs off. This is the library `/curate` and
the renderer choose from. Reframe **emphasis**, never facts or scope.

### `audit` — health check
Flag: entries missing guardrails, bundled (non-atomic) entries, untagged entries, metrics
without a basis, private detail marked public, or entries with no framing for a target the
user is pursuing. Propose fixes; the user approves.

### `export` — feed the engine
Emit `achievements.md` (the `## Title` + body format `/curate`'s CLI parses) from the
public-safe projection of the bank, so `node src/curate.js` can run on real data.

## Guardrails
- Atomic entries only; one achievement each.
- Never fabricate metrics, scope, or seniority.
- Honor `visibility`: private detail never leaves the bank into a public artifact.
- Validate against the schema before saving.
