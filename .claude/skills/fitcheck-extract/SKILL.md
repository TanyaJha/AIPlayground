---
name: fitcheck-extract
description: >
  Build or grow the fitcheck achievement bank in bulk by pointing at source materials — a
  person's performance reviews (year-end, mid-year), a folder of project work, brag docs,
  promo packets, an old résumé, 1:1 notes, launch write-ups. Reads each source, extracts
  atomic achievements with metrics, scope, and guardrails, dedups against the existing bank,
  and writes validated entries. Use when the user says "build my bank from my reviews",
  "extract achievements from these docs", "ingest my work folder", "I have my performance
  reviews", "turn my brag doc into a bank", or is setting up their bank from scratch and has
  material to point at. Writes to the user's PRIVATE bank.json following
  projects/fitcheck/track/schema/bank-entry.schema.json.
---

# fitcheck /extract — build the bank from your real sources

The fastest way to a real bank is not typing it from memory — it is pointing at the record you
already have. Reviews, brag docs, promo packets, and project folders are dense with
achievements, metrics, and scope you have forgotten. This skill reads those sources and turns
them into **atomic, guardrailed bank entries** (the same schema `/bank` writes, one at a time).

**Relationship to the other skills:**
- **`/extract`** (this) — *bulk ingestion.* Many sources in → many entries out, deduped.
  This is the front-loading step, run once at setup and again after each review cycle.
- **`/bank`** — *single-entry maintenance.* Add one, add a framing, audit, export.
- After extracting, hand off to `/bank audit`, then `/curate` for a real target.

Schema: `projects/fitcheck/track/schema/bank-entry.schema.json`. Validate every entry before
writing.

> **Privacy (hard rule):** these sources are the most sensitive data the user has — ratings,
> internal figures, customer names, unreleased work. The bank is **private**: it lives in the
> user's own location (e.g. `~/fitcheck-data/bank.json` or a private repo), **never** in this
> public repo. Read the sources locally; never paste their contents anywhere external.

## Step 1 — point it at sources

Ask the user what they have, and take file paths, a folder, or pasted text. Good sources, best
first:

| Source | What it yields |
|---|---|
| **Performance reviews** (year-end, mid-year, self-reviews) | The richest vein — accomplishments, impact, ratings, manager/peer language, scope. Cover several cycles. |
| **Promotion packet / brag doc** | Already achievement-shaped; often has metrics and scope spelled out. |
| **A folder of project work** (PRDs, launch docs, retros, decks) | Ground truth for what shipped, when, and your role. |
| **An old résumé** | Pre-compressed bullets to re-expand into full entries. |
| **1:1 notes, kudos, award nominations, launch emails** | Outcomes and third-party validation you would never claim from memory. |

For a folder, glob for documents (`.md`, `.txt`, `.pdf`, `.docx`, `.pptx`) and read each; use the
`pdf` / `docx` / `pptx` skills for those formats. Tell the user which files you found before
you start, and if a source is huge, process it in passes rather than truncating.

## Step 2 — extract, per source

For each source, pull out **every distinct achievement**. Split anything that bundles two.
For each one, build a bank entry:

- **`raw_evidence`** — the LOSSLESS narrative, including detail that never reaches a résumé. This
  is the truth every future projection is checked against.
- **`metrics[]`** — each with `value`, `basis`, and `confidence` (`hard` / `estimate` /
  `directional`). This is where the user's word "outcomes" lands: the *result/impact* of the
  work (shipped X, moved Y, cut Z) goes here or in `raw_evidence`. **Never invent a number;** if
  a review says "significant impact" with no figure, record it as directional prose, not a
  fabricated metric.
- **`scope`** — role, ownership (`owned` / `led` / `contributed` / `supported`), team size,
  customers. Reviews are the best source for honest scope; use their language, do not inflate.
- **`tags[]`** — skills/domains for retrieval.
- **`guardrails[]`** — what must NOT be claimed (e.g. "eight-figure, not the internal figure";
  "engineer in cloud, PM in identity"; "co-led, not sole owner"). Reviews often reveal exactly
  the internal number or the shared credit that becomes a guardrail. Capture these as you go —
  they are what keeps every later résumé honest.
- **`visibility`** — `private` if it contains customer names, internal figures, or unreleased
  dates; else `public`.
- **`id`** — a stable slug from the title.

> **Note on `outcomes[]`:** that schema field is reserved for *job-application* results
> (callback / interview / offer, wired up by `/track`) — NOT performance-review outcomes. Do
> not put a promotion or a rating there. Impact from the work itself belongs in `metrics` /
> `raw_evidence`.

## Step 3 — merge, dedup, and review with the user

- **Dedup** across sources and against the existing `bank.json`: the same launch appears in a
  review, the brag doc, and a retro. Merge them into one richer entry (best metric, fullest
  evidence, union of guardrails), do not create three.
- **Present the batch for approval before writing.** Show the proposed entries grouped by
  source, flag low-confidence metrics and anything you guessed, and let the user correct scope
  and guardrails. This is a capture-now / human-verifies step — never auto-commit extracted
  claims the user has not seen.
- **Write** the approved entries to the user's private `bank.json` (append + dedup by id),
  validated against the schema.

## Step 4 — hand off

- Run **`/bank audit`** to flag entries still missing guardrails, tags, or a framing for a
  target the user is pursuing.
- Suggest adding **framings** (`/bank framings`) for the archetypes the user is targeting.
- Then the bank is ready for **`/curate`** against a real JD.

## Guardrails
- **Atomic entries only** — one achievement each; split bundles.
- **Never fabricate** a metric, scope, or seniority. Absent detail is a gap, not a guess.
- **Guardrails are first-class** — extract what must not be claimed, so `/grade` can enforce it.
- **Honor `visibility`** — private detail never leaks into a public artifact downstream.
- **Human in the loop** — the user approves the batch before anything is written.
- **Validate** every entry against the schema before saving; keep the bank private.
