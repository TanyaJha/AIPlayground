# The Rendering rubric — how a résumé reads

The pair to the [Selection rubric](rubric.js). Selection grades **which** achievements to
surface; Rendering grades **how** each bullet is written. Separate on purpose: a
perfectly-selected bullet can still read like a clipped, label-colon fragment, and nothing in
the Selection rubric catches it.

> Why this exists: résumé prose drifted into telegraphic "**Noun phrase:** clause, clause"
> fragments that a plain LLM out-wrote, because the eval graded selection and never prose.
> This rubric closes that gap. Source of truth: [`rendering-rubric.js`](rendering-rubric.js).

### Gate (pass/fail) — Faithful and guardrailed
Every claim traces to a real bank entry **and** every entry's guardrails are honored. A leaked
private figure (an internal dollar estimate where "eight-figure" was required), a rejected
framing, or an estimate stated as hard fact **fails outright.** (This gate has teeth because a
real comparison résumé failed it: it wrote the internal dollar figure and a framing the
candidate had explicitly rejected.)

### Dimensions — 0–5 each
1. **Complete sentence, not a fragment** — verb-led sentences a person would say aloud; no
   label-colon headings, no telegraphic lists.
2. **Concrete substance** — says what the thing *is or does*, not a vague abstraction.
3. **Full-bodied, not over-compressed** — enough detail to be credible; the achievement never
   reads smaller than it was.
4. **Impact-forward (XYZ)** — strong action, result present (did X using Y, led to Z).
5. **Reads like a person wrote it** — natural rhythm, varied verbs, no template feel.
6. **No padding** — full-bodied but every word earns its place.
7. **One idea per bullet** — a single clean point; secondary clauses and stapled-on lists are
   pruned (learned from a candidate's own finalized résumé, where this was the strongest instinct).
8. **Domain-fluent** — acronyms defined inline once then reused (PQC, AD FS, SoA); insider terms
   used confidently, reading as a practitioner, not an explainer.

> **3 and 6 are in deliberate tension** — full-bodied vs. no padding — so "richer" can't become
> "bloated" and "tight" can't become "clipped". **7 (one idea)** is the counterweight to 3 that
> keeps "full-bodied" from becoming "crammed". That tension is the fix for the original
> over-compression.
