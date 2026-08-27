# Using fitcheck

fitcheck is a **Claude Code–native** tool: you drive it by invoking skills inside Claude
Code, which orchestrate two small Node engines over **your own private achievement bank**.
It is not a website or a hosted app — it runs on your machine, and your career data never
leaves it.

> **New here? Start with [QUICKSTART.md](./QUICKSTART.md)** — a linear, copy-pasteable
> zero-to-first-résumé walkthrough. This page is the full reference behind it.

**What it's for:** keep a living master achievement bank, reverse-tailor a résumé to a
specific role, grade it before you send, track applications and outcomes, and prep interview
stories — in your own voice, with a fabrication gate on every claim.

---

## Prerequisites (one time)

1. **Claude Code** (this is how you invoke the skills).
2. **Node 18+**, then install the two engines:
   ```bash
   cd projects/fitcheck/curate  && npm install
   cd ../resume                 && npm install
   ```
3. **An Anthropic API key** for the LLM steps (`/curate`, `/grade`):
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```
4. *(Optional, archived)* the **capture extension** — load
   `projects/fitcheck/archive/capture/` unpacked in Chrome (`chrome://extensions` →
   Developer mode → Load unpacked) to grab JD text from an authenticated tab. An early
   experiment; career-ops or a paste is the recommended path.

## Where your data lives (important)

Your **bank** and **application log** are private (customer names, internal figures). Keep
them **outside this public repo** — a private git repo you own, or a local folder. Point the
skills/engines at that path. Never commit `bank.json` or `applications.json` here.

A starting bank is two files following the schemas in
[`track/schema/`](track/schema/): `bank.json` (array of bank entries) and `applications.json`
(array of applications).

---

## The workflow

```
        /bank                 capture / paste          /curate            /grade
  build the achievement  →   a target job's JD   →   swap list      →   score it
        bank (private)                                (add/promote/keep)   (gate + rubric)
                                                            │                  │
                                                            ▼                  ▼
                                                        /tailor            /track
                                                    render the .docx    log the app + outcome
                                                            │                  │
                                                            └──── /stories ────┘  (interview prep)
```

### 1. Build your bank — `/bank`
In Claude Code: *"structure my achievements into the bank"* or paste a review / brain-dump.
It writes atomic, guardrailed entries (`bank.json`) with **framings per role archetype**. This
is the source of truth everything else projects from.

### 2. Get a target JD
From the capture extension, from [career-ops](https://github.com/santifer/career-ops)
(discovery — see [SCOUT.md](SCOUT.md)), or just paste it.

### 3. Curate — `/curate`
*"curate my bank for this JD."* Runs `node curate/src/curate.js <job> --achievements bank.json`
and returns a **swap list**: which achievements to ADD / PROMOTE / KEEP / DEMOTE, plus honest
gaps.

### 4. Grade — `/grade`
*"grade this."* Runs the eval harness: a **fabrication gate** + the Selection rubric (which
achievements) and the Rendering rubric (how the prose reads). Don't send anything the gate
fails.

### 5. Tailor — `/tailor`
*"render the résumé."* Assembles a résumé **spec** from the chosen framings and runs
`node resume/render.js <spec> out.docx` → an ATS-safe `.docx`. It **refuses to render an em
dash** and keeps to your taste rules.

### 6. Track — `/track`
*"mark this as sent"* / *"I got a callback."* Logs the application with the **framing used**,
and when a result lands, attributes it back to the evidence. This is the
[outcome loop](track/LOOP.md).

### 7. Stories — `/stories`
*"give me a STAR for influencing without authority."* Projects interview stories from the same
bank, with a gap check.

---

## Quick reference

| You want to… | Say / run |
|---|---|
| Build or edit your bank | `/bank` |
| Tailor to a role | `/curate` → `/tailor` |
| Check quality before sending | `/grade` |
| Track an application / outcome | `/track` |
| Prep interview answers | `/stories` |
| Run curate directly | `node curate/src/curate.js <job.txt> --achievements <bank>` |
| Render a résumé directly | `node resume/render.js <spec.json> <out.docx>` |

## Honest status

Each component is built and tested; the LLM steps need your key and are best **run live once**
to confirm end to end. fitcheck is a personal workbench first — it gets sharper as the
[outcome loop](track/LOOP.md) accumulates real results in your voice.
