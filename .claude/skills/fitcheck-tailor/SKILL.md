---
name: fitcheck-tailor
description: >
  Assemble a tailored résumé from a Curate swap list + the achievement bank and render it to
  an ATS-safe .docx — fitcheck's last mile. Use after /curate, or when the user says "render
  this résumé", "tailor and build the doc", "turn this swap list into a résumé", "make the
  cloud-security version". Builds a résumé spec (projections/framings chosen per the target
  archetype) and calls projects/fitcheck/resume/render.js. Enforces one page + no em dashes.
---

# fitcheck /tailor — swap list → rendered résumé

The final step: `bank → /curate (swap list) → /tailor (spec) → render.js (.docx)`. Every
bullet is a **chosen framing pulled from a bank entry** for the target archetype, so the
résumé is a projection of the source of truth, not free text.

## Inputs
- A **Curate swap list** (ADD/PROMOTE/KEEP + the surfaced entries) — or the user naming a
  target archetype and letting you select from the bank directly.
- The **bank** (`bank.json`) — pick each surfaced entry's `framings[]` matching the target
  `archetype`; fall back to a sensible framing if none exists (and suggest adding one via
  `/bank`).
- Header/skills/education come from the bank owner's profile (private).

## Build the spec
Assemble a résumé spec per `projects/fitcheck/resume/resume.schema.json`:
`name`, `contact`, `summary`, `experience[]` (roles with `bullets[]` = chosen framings),
optional `projects[]`, `skills[]`, `education[]`. Use `**bold**` for lead phrases and key
metrics. Order bullets strongest-fit first (from the swap list's relevance).

## Render
```bash
cd projects/fitcheck/resume && npm install   # one time
node render.js <spec.json> <out.docx>
```
The renderer is **strict about the one formatting rule**: it fails if the spec contains an em
dash (—), naming the field. Fix with a colon, comma, or middot — never re-add the em dash.

## After rendering (close the loop)
1. **One page.** Verify it fits one page; if long, tighten bullets (drop the weakest, not the
   evidence) and re-render. Do not shrink margins below the template.
2. **Grade it.** Offer `/grade` on the underlying selection before the user sends it.
3. **Track it.** When it's the version that goes out, log via `/track` which framings were
   used, so a later outcome attributes back to them.

## Guardrails
- Bullets must come from real bank framings; honor each entry's `guardrails` and `visibility`
  (no private customer names / internal figures on the rendered doc).
- Never invent a bullet the bank doesn't support. If a gap needs filling, say so — that's a
  `/bank` task, not a rendering one.
- Private résumé specs and outputs stay out of the repo; only the renderer + schema are public.
