# fitcheck Quickstart — zero to your first tailored résumé

A from-scratch walkthrough for someone who has never run fitcheck. In about 20 minutes you
go from an empty machine to a real, graded, tailored `.docx` built from your own achievements.

**Read this once before you start, because two things trip everyone up:**

1. **fitcheck is not an app.** It runs *inside Claude Code*. You do some steps in a **terminal**
   (setup, running the engines) and some by **talking to Claude** (building your bank, driving
   the workflow). Each step below is labeled 🖥️ **TERMINAL** or 💬 **IN CLAUDE**.
2. **Your bank is built by talking to Claude, not by a command.** There is no
   `build-bank.sh`. You hand Claude your raw material and it structures it. That conversation
   *is* the bank builder.

---

## What you need

- **Claude Code** — installed and signed in ([how](https://code.claude.com/docs)). This is its
  own login, separate from the API key below.
- **Node 18+** — check with `node --version`.
- **An Anthropic API key** (`sk-ant-...`) — only the `/curate` and `/grade` steps call the model.
  Rendering a résumé needs no key. Get one at the [Anthropic Console](https://console.anthropic.com/).
- **~20 minutes** and some **raw material about yourself**: an old résumé, a performance review,
  or just bullet notes. The more honest detail, the better the bank.

---

## Step 0 — get the code  🖥️ TERMINAL

```bash
git clone https://github.com/TanyaJha/AIPlayground
cd AIPlayground

# install the two small engines (one time)
cd projects/fitcheck/curate && npm install
cd ../resume            && npm install
cd ../../..                      # back to the repo root
```

## Step 1 — set your API key  🖥️ TERMINAL

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

(Put it in your shell profile if you don't want to repeat it. This is for the *engines*;
Claude Code itself is already signed in from the step above.)

## Step 2 — make a private home for your data  🖥️ TERMINAL

Your bank holds real names, numbers, and unreleased detail. **It must live outside this public
repo.** A folder in your home directory (or a private git repo you own) is perfect:

```bash
mkdir -p ~/fitcheck-data
```

Everything personal — `bank.json`, `achievements.md`, `applications.json`, résumé specs, and the
rendered `.docx` files — lives here. Nothing personal ever gets committed to the AIPlayground repo.

## Step 3 — build your bank  💬 IN CLAUDE

Open Claude Code **with the repo as your working directory** (so the `/fitcheck` skills load),
then:

```
/fitcheck
```

Tell it you're new and want to build your bank. Or go straight to `/bank`. Then **paste your raw
material** — an old résumé, a review, a brain-dump. Claude will:

- break it into **atomic entries** (one achievement each),
- attach **guardrails** (what must *not* be claimed — "eight-figure, not the internal figure"),
- keep the **lossless** detail that never fits a résumé,
- and write it all to `bank.json`.

**Tell it where your data lives**, e.g.:

> "Save my bank to `~/fitcheck-data/bank.json`."

This is the source of truth. Everything else is a projection of it, so it's worth doing well.
Budget most of your 20 minutes here. **This one file is all you maintain** — `bank.json`.

## Step 4 — point fitcheck at a real job  🖥️ or 💬

Save a job description you actually care about as `~/fitcheck-data/job.txt`. Then curate — two
equivalent ways:

**Easy (let Claude drive it):**
```
/curate my bank for ~/fitcheck-data/job.txt
```

**Direct (run the engine yourself):**  🖥️ TERMINAL
```bash
cd projects/fitcheck/curate
node src/curate.js ~/fitcheck-data/job.txt --achievements ~/fitcheck-data/bank.json --json
```

That `--achievements <path>` **is** how you "point to your bank" — you hand it your `bank.json`
directly. (There's no stored config; you name the path, or you just tell Claude the folder.)
The output is a **swap list**: which achievements to ADD / PROMOTE / KEEP / DEMOTE for this
role, plus honest gaps.

## Step 5 — grade, tailor, track  💬 IN CLAUDE

```
/grade      # score the swap list — a fabrication gate + the rubric. Don't send what fails.
/tailor     # assemble a spec from your bank's framings and render an ATS-safe .docx
/track      # log the application and which framing you used, so outcomes attribute back
```

`/tailor` runs the renderer (`node render.js <spec.json> out.docx`) and writes the `.docx` to
your private folder. It **refuses to render an em dash** — that's the one hard formatting rule.

That's the full loop: **bank → curate → grade → tailor → track**, all grounded in one private
source of truth.

---

## Want to see it work *before* building a bank? (optional, 30 seconds)

The repo ships fictional sample data, so you can watch each engine run with zero personal data:

**The renderer — no API key needed:**  🖥️ TERMINAL
```bash
cd projects/fitcheck/resume
node render.js examples/resume.example.json /tmp/demo.docx   # → a real .docx
```

**The curate brain — needs your API key:**  🖥️ TERMINAL
```bash
cd projects/fitcheck/curate
node src/curate.js examples/job.sample.txt   # auto-uses the bundled sample bank
```

---

## Where everything lives (recap)

```
AIPlayground/                     ← public repo, cloned. The machinery only.
  projects/fitcheck/
    curate/   resume/   track/    ← the engines + skills + schemas

~/fitcheck-data/                  ← YOU create this. Private. Never committed.
  bank.json                       ← your source of truth — the ONE file you maintain
  job.txt                         ← the JD you're targeting
  applications.json               ← your outcome log
  *.docx                          ← rendered résumés
```

## Honest caveats

- **This is a developer-flavored setup** — clone, `npm install`, an API key. There's no
  one-click installer yet. Fine for a technical friend; for a non-technical one, the fastest
  path is to sit with them and drive it together.
- **The bank takes real effort** — it's built in conversation, not generated. That's the point:
  garbage in, garbage out. A thoughtful bank is what makes every downstream résumé good.
- **Bring your own API key.** fitcheck never ships one.

Full reference (every skill, every flag): [`USAGE.md`](./USAGE.md). The big picture in one
image: [`system-map.html`](./system-map.html).
