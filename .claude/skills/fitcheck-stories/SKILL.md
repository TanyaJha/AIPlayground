---
name: fitcheck-stories
description: >
  Turn achievement-bank entries into STAR+Reflection interview stories, and pull the best
  story for a given behavioral question — fitcheck's interview story bank (an idea borrowed
  from career-ops). Use when the user is prepping for behavioral interviews, says "build
  interview stories", "give me a STAR for X", "what's my best example of leadership /
  ambiguity / conflict", or "where are my story gaps". Reads the same private bank the
  résumé projects from (projects/fitcheck/track/schema/bank-entry.schema.json).
---

# fitcheck /stories — the interview story bank

One bank, two outputs: the résumé projects **bullets** from it; this projects **stories**.
Same source of truth, same honesty guardrails — so a story never claims what a bullet
couldn't, and both trace to the same `raw_evidence`.

STAR+Reflection = Situation, Task, Action, Result, **and** a one-line reflection (what you
learned / would do differently). The reflection is what makes a story read as self-aware
rather than rehearsed.

## Modes

### `build` — bank entry → STAR story
Expand one entry into a spoken-length STAR+Reflection narrative. Draw Situation/Task from
`raw_evidence` and `scope`; Action in first person and specific; Result from `metrics[]`
(honoring `guardrails` — e.g. "eight-figure", no customer names). Keep it ~90 seconds spoken.

### `drill` — behavioral question → best story
Given a question ("tell me about a time you influenced without authority", "a failure",
"a conflict"), pick the strongest-fit entry from the bank and shape its story to the prompt.
Name the one runner-up so the user has a backup.

### `gaps` — coverage check
Map the bank against the common behavioral themes (leadership, ambiguity, conflict, failure,
influence-without-authority, data-driven decision, customer obsession, disagreement with a
senior). Flag themes with **no** strong story — those are prep priorities, and often a signal
of a `/bank` entry worth adding.

## Guardrails
- Every story traces to a real bank entry; no invented situations or numbers.
- Honor each entry's `guardrails` and `visibility` (interviews are external — treat customer
  names / internal figures as private unless already public).
- Reflection must be honest, not a humble-brag; a real "what I'd do differently" builds trust.
