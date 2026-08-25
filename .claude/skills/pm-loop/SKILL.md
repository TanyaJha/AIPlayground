---
name: pm-loop
description: >
  Design, implement, and iterate on PM loops for AI products — the feedback and iteration
  infrastructure that makes a product get smarter over time. Use this skill whenever someone
  wants to build a feedback loop, design an agent loop, set up a PM iteration cadence,
  connect evals to product decisions, or asks how to make their AI product improve
  continuously. Also use it when someone says "I want to iterate faster", "how do I know
  if my prompt is getting better", "I want to build a loop for X", or describes wanting
  their system to self-improve. The skill is opinionated: it will tell you which loop type
  fits, how to structure it, and exactly what to build next — not a menu of options.

  Key sources: Aakash Gupta's "Loops for PMs" and Paweł Huryn's "Loop Engineering for PMs:
  20+ AI Agent Loops and Templates" (productcompass.pm).
---

# PM Loop Skill

A PM loop is not a workflow. A workflow runs once and stops. A **loop repeats and checks
its own work until a condition holds** — that distinction is everything. If your process
doesn't self-evaluate and decide whether to continue, it's a pipeline, not a loop.

---

## Step 1: Diagnose which loop type the user needs

Before designing anything, identify the category. Ask one question if unclear:
*"What problem are you trying to solve — discovering what to build, improving something
already built, or keeping your own work organized?"*

### The Three Loop Categories

#### 🔍 Product & Discovery
*Use when the user wants to learn something about users, market, or product quality.*

| Loop | Trigger | What it does |
|---|---|---|
| **Feedback clustering** | New feedback batch available | Group user complaints/corrections by theme; surface top pattern |
| **Competitor watch** | Weekly / new job posting / new product launch | Scan for what skills/features competitors are adding |
| **Win/loss** | Application sent or interview result received | Tag outcome + which version/bullets were used; update score |
| **Metric-anomaly tracing** | Score drops or spikes | Trace *why* a fit score changed — was it the JD, the achievements, the model? |
| **Prioritization** | Weekly | Given all signals this week, what's the one thing to improve? |
| **Strategy red-team** | Before a big change | Agent argues against the current approach; surface blind spots |

#### 🔨 Build & Ship
*Use when the user wants to improve something that already exists.*

| Loop | Trigger | What it does |
|---|---|---|
| **Prompt-improvement** | Eval score below threshold OR weekly | Run evals → find worst outputs → rewrite prompt → re-eval → compare delta |
| **AI-feature evals** | Every code change | Run golden test set; flag regressions before shipping |
| **Prototype iteration** | New feature idea | Build → test against real inputs → score → decide keep/kill |
| **Bug-fix from logs** | Error appears in output log | Trace failure → fix → verify fix doesn't break other cases |
| **Ship-check** | Before any push | Does new version pass all evals? Is it measurably better or at minimum neutral? |
| **Intended vs. implemented** | After building | Does what was built actually match what was specified? Run agent audit. |

#### 🗂 Personal & Ops
*Use when the user wants to stay organized, informed, or on top of their own system.*

| Loop | Trigger | What it does |
|---|---|---|
| **Inbox triage** | New job alerts | Auto-score against profile; surface only top 10%; skip the rest |
| **PRD hardening** | Before building | Agent reads spec → finds ambiguities, edge cases, missing success criteria → user resolves |
| **Doc freshness** | Weekly | Flag achievements/specs older than N weeks with no recent update |
| **Onboarding friction** | After new user/feature | Where does the loop break for someone new? Surface friction points. |

---

## Step 2: Design the loop anatomy

Every loop has exactly four parts. Help the user fill these in:

```
TRIGGER     → what starts this loop (schedule, event, threshold, manual)
ACTION      → what the agent does (search, score, draft, compare)
SELF-EVAL   → what condition determines if the loop continues or stops
             ("score > 4", "no new findings", "delta < 0.05", "human approved")
OUTPUT      → what exits the loop (a file, a decision, an updated prompt, a score)
```

**The self-eval condition is the most important and most skipped part.** Without it,
you have a pipeline. Push the user to be specific: not "until it's good" but
"until LLM judge scores ≥ 4/5 on all test cases" or "until two consecutive rounds
find zero new issues."

### Example — Prompt-improvement loop

```
TRIGGER     → Weekly cron OR eval pass rate drops below 70%
ACTION      → Run evals → collect outputs scored < 3 → ask LLM to rewrite prompt
              → re-run evals → compare pass rate
SELF-EVAL   → Did pass rate improve by ≥ 5%? If yes → ship new prompt.
              If no improvement after 3 iterations → flag for human review.
OUTPUT      → Updated prompt + delta report (old pass rate vs. new)
```

---

## Step 3: Connect loops to evals

Loops without evals are blind. Every loop that produces something measurable should
have an eval attached. The three-tier eval stack:

| Tier | What it measures | Speed | When to use |
|---|---|---|---|
| **Unit** | Deterministic correctness (did it extract the right field?) | Instant | Always, for any parsing/extraction step |
| **LLM-as-judge** | Soft quality (is this bullet relevant to the JD?) | Seconds | For any generation step |
| **Outcome** | Did the real-world thing happen? (interview, response) | Days/weeks | The north star; everything else is a proxy |

**Design principle:** Start with LLM-as-judge for speed. Build toward outcome evals
as real data arrives. Never confuse "LLM judge says it's good" with "it actually works."

### Writing a good LLM judge prompt

A judge should:
1. Have a **rubric** (not just "rate 1-5") — what does a 5 look like vs. a 3?
2. Be **adversarial** — told to look for problems, not confirm quality
3. Output **structured JSON** — `{score: 4, reason: "...", flagged_issue: "..."}`
4. Be **run 3 times** and averaged — judge outputs have variance

---

## Step 4: Track iteration

The PM loop only works if you can compare "before" and "after." Minimum viable tracking:

```
pm-log/
├── week-YYYY-WW.md     ← one file per week
│   ├── ## What shipped
│   ├── ## Eval delta (pass rate this week vs. last)
│   ├── ## Outcome signals (interviews, responses, rejections)
│   ├── ## One hypothesis tested
│   └── ## One hypothesis for next week
└── eval-history.json   ← machine-readable score history
```

The weekly file is the PM's memory. Commit it to the repo. After 4 weeks you'll have
patterns. After 8 weeks you'll have calibration data you can't get any other way.

---

## Step 5: For AI products specifically — feedback is the engine

The unique thing about AI product loops vs. regular PM loops: **the feedback goes back
into the model, not just the roadmap.** This means:

1. **Capture corrections from day one.** When the user edits an AI output, log that.
   The edit IS the ground truth label.
2. **Every output should have a thumbs up/down or equivalent.** Even coarse signal
   compounds fast.
3. **The outcome loop closes the system.** Did applying these bullets get a response?
   That outcome re-weights which bullets to surface next time for similar roles.

### The compounding loop (for this project specifically)

```
achievements.md
     ↓
[score_fit(job)] → select_bullets() → apply → outcome (Y/N)
                                                    ↓
                              ←─── re-weight scoring model ────
```

This is not a feature — it's the architecture. Build the outcome capture before the
scoring gets fancy.

---

## How to use this skill

When invoked, do this in order:

1. **Diagnose** — ask one clarifying question if needed, then name the loop type
2. **Fill the anatomy** — write out TRIGGER / ACTION / SELF-EVAL / OUTPUT with the user
3. **Identify the eval** — what tier? what's the judge rubric?
4. **Scaffold the tracking** — create the `pm-log/` structure or `eval-history.json`
5. **Name the first iteration** — what runs this week? be specific, not general

Be opinionated. "You need a prompt-improvement loop, not a feedback clustering loop —
here's why" is more useful than "here are your options." The user can push back.

### When the user wants "all the loops" or feels overwhelmed

This is the most common failure mode, and the instinct to be helpful makes it worse.
When someone asks to set up loops across their *whole* process, **do not fill out the
anatomy for three loops.** Three full TRIGGER/ACTION/SELF-EVAL/OUTPUT blocks is exactly
the wall of work that made them feel overwhelmed in the first place — you'd be handing
back the problem in a nicer font.

Instead:

1. **Reframe the overwhelm** as a sequencing problem, not a scope problem: they don't
   have too much to do, they're trying to do it in parallel.
2. **Pick ONE loop** — the highest-leverage one for their context — and fill out its full
   anatomy, eval, and this-week action. For an AI product, this is almost always the
   **prompt-improvement loop**, because the prompt IS the product; every other loop feeds
   into a void until output quality has a measurement.
3. **Name the other two loops in one line each** — "next, once this is running: a feedback
   clustering loop (Discovery) and a PRD hardening loop (Ops)" — so they see the path
   without being asked to build it now.

The output should leave the user with one thing to build this week, not three. If they
want the next loop's anatomy, they'll ask — and now they're asking from a place of
momentum instead of paralysis.

---

## Quick reference

**Aakash Gupta's framework** (news.aakashg.com/p/loops-pms):
- Loops are categorized as Product & Discovery, Build & Ship, Personal & Ops
- Feedback loops capture user corrections → feed back → model improves
- Build feedback capture from day one — it's the only way systems get smarter

**Paweł Huryn's framework** (productcompass.pm/p/loop-engineering-for-pms):
- A loop = repeats until a condition holds (not a one-shot workflow)
- 20+ named loops with copy-paste templates
- Loop anatomy: trigger → action → self-eval → output or loop again
- Prompt-improvement loop is the Build & Ship loop most AI PMs need first
