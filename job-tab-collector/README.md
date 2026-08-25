# Job Tab Collector

A Chrome extension that turns your open job-posting tabs into a saved shortlist,
then exports it as a file you can hand to Claude or ChatGPT along with your
resume.

Built to solve one specific annoyance: you open twenty roles while job hunting,
then have to copy-paste every link by hand to get an AI to look at them.

---

## What it does

- Reads your open tabs and **auto-detects job postings** across **83 job boards
  and ATS platforms** — Google, Microsoft, Amazon, Meta, Apple and other big-tech
  career sites; LinkedIn, Indeed, Glassdoor, Dice, Wellfound, Built In,
  ZipRecruiter, We Work Remotely, Remote OK, YC Work at a Startup, Naukri, Seek
  and other aggregators; Greenhouse, Lever, Ashby, Workday, SmartRecruiters,
  Workable, JazzHR, iCIMS, Taleo, Cornerstone, Avature, Oracle Cloud and other
  ATS platforms
- Pre-checks the job tabs, leaves everything else unchecked
- **Saves them to a persistent list** — close the tab, keep the role
- **Deduplicates** by normalized URL, so the same posting opened from a search
  page and from an email doesn't get saved twice
- Pulls out the **role title and company** from the tab title and URL structure
- **Captures the job description text** straight from the open tab, which works
  on sites an AI can't fetch at all (LinkedIn, Indeed, Workday)
- **Exports** to Markdown, JSON, or a plain URL list, with a prompt header
  aimed at resume-fit analysis

---

## The fetchability problem

This matters more than it sounds, so it's worth reading before you use the thing.

When you paste a job URL into Claude or ChatGPT and ask it to analyze the role,
the AI has to fetch that page. **Some job sites block automated fetching**, so
the AI gets nothing back. It cannot tell you what it didn't read, so a link that
silently failed looks the same as one that had nothing interesting in it.

Verified 2026-08-25:

| Site | Fetchable? | Notes |
|------|-----------|-------|
| **Google Careers** | ✅ Yes | Server-rendered; even exposes minimum qualifications in the listing |
| **Greenhouse** | ✅ Yes | Static HTML, reads cleanly |
| **Lever / Ashby / Workable** | ✅ Yes | Static HTML |
| **We Work Remotely** | ✅ Yes | Server-rendered listings |
| **LinkedIn** | ❌ No | Blocked by `robots.txt` — returns nothing, every time |
| **Indeed** | ❌ No | Blocked |
| **Amazon Jobs** | ❌ No | Client-rendered; the served HTML has no listings |
| **Workday** | ❌ No | Client-side rendered; the HTML arrives empty |

Of the 83 sites, 30 are marked fetchable and 53 need capture. Google, Amazon,
Greenhouse and We Work Remotely were tested directly; the rest are classified by
whether the site is server-rendered or a client-side SPA, erring toward
"capture it" when unsure.

The export **marks every row** as fetchable or not, and the prompt header tells
the AI to say so rather than quietly skipping.

**This is what "Capture job text" solves.** The extension reads the page from
inside your logged-in browser, so it sees the fully-rendered, authenticated DOM
exactly as you do — bot-blocking never enters into it. Once a role's text is
captured it travels inside the export, and the AI never needs to open the link.
Captured rows lose the "not fetchable" warning and gain a text badge.

---

## Install

The extension is unpacked — there's no Chrome Web Store listing, and it doesn't
need one.

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `job-tab-collector/` folder
5. Pin it from the puzzle-piece menu so it's one click away

Works in Chrome, Edge, Brave, Arc, and Opera — anything Chromium-based.
Firefox needs a separate manifest; not currently supported.

---

## Use

**Collecting.** Open job postings as you browse. When you've got a batch, click
the extension icon. The **Open tabs** view lists what it found, with job pages
already ticked. Untick anything you don't want, hit **Save**. The badge count on
the icon tells you how many roles are on the list.

**Capturing.** Two ways, and the automatic one is usually what you want.

*On save (automatic).* The **On save, grab text for** dropdown on the Open tabs
view decides what gets read the moment you save:

| Setting | What happens |
|---------|--------------|
| `unfetchable roles` (default) | Reads only the roles an AI can't open from a link — LinkedIn, Indeed, Workday, Amazon. These are the ones where a closed tab means the content is gone. |
| `all roles` | Reads every role you save. Turns the saved list into a **durable archive** — if a posting is taken down next month, you still have the description. |
| `nothing` | No automatic capture; use the manual button. |

This matters because capture only works while the tab is open. Saving is the
one moment every tab is guaranteed to still be there, so grabbing the text then
avoids losing it later.

*Manually.* On the **Saved** tab, **Fetch text for N** gets the description for
every saved role that doesn't have one — in one click, whether or not the tab is
still open.

Roles whose tab is open are read in place. **For the rest, the extension reopens
the page itself**, in a minimized window you never have to look at, reads it, and
closes it. That works on LinkedIn and Workday for the same reason reading an open
tab does: it's your browser and your session, so auth walls and bot checks never
come into it.

The run happens in the background service worker, not the popup, so you can close
the popup and carry on working — reopen it to see progress. **Cancel** stops it
between roles.

The first capture of either kind asks Chrome for page-access permission — see
Permissions below.

**Length** and **Trim fluff** are knobs, not commitments. The full untrimmed
text is stored alongside the formatted version, so changing either **re-derives
every role instantly** — no page loads, no waiting. Try Short, look at the
export, switch to Full, switch back. Same result every time.

- **Short / Medium / Full** cap each description at roughly 2.5k, 6k, and 15k
  characters. The cap applies *after* trimming, so the budget goes to the
  qualifications rather than the mission statement.
- **Trim fluff** (on by default) drops company boilerplate — see What gets kept.

**Re-fetch all** re-reads every page from scratch. You only need it when a
posting has changed, or for roles captured before the raw text was retained. Medium is about 1,500 tokens per
role, so twenty roles lands around 30k tokens — comfortable for Claude.

**Exporting.** Saving drops you straight onto the **Saved** tab, where the
export controls live. Pick a prompt mode:

| Mode | What the exported file asks the AI to do |
|------|------------------------------------------|
| **Rank these by fit** | Score every role against your resume and achievement notes, call out matches that come from the achievements rather than the resume, flag dealbreakers, tell you what to apply to first |
| **Tailor my resume** | Find recurring themes across the roles, identify what your resume doesn't currently show, and propose specific bullets drawn from your achievement notes |
| **No prompt — data only** | Just the table |

Hit **Export file** and you get `jobs-YYYY-MM-DD.md`.

**Then:** upload that file to Claude alongside your resume and your achievement
notes. The prompt header is written assuming all three are present — the
achievement-notes part is the point, since that's where the accomplishments live
that never made it onto the resume.

The prompt text lives in `src/lib/export.js` as plain strings under
`PROMPT_TEMPLATES`. Edit them freely; nothing else depends on the wording.

---

## Permissions, and why each one

| Permission | When | Why |
|-----------|------|-----|
| `tabs` | At install | Read the URL and title of open tabs. |
| `storage` | At install | Keep the saved list across browser restarts. |
| `unlimitedStorage` | At install | Hold the full untrimmed text so formatting changes are instant. |
| `downloads` | At install | Write the export file. |
| `scripting` | At install | Inject the extractor. Inert without host access. |
| Host access | **Only when you first hit Capture** | Read page content. |

Host access is declared as `optional_host_permissions`, not `host_permissions`.
The practical difference: installing shows **no** "read all your data on all
websites" warning, and the extension genuinely cannot read any page until you
grant it at the moment you first press Capture. Revoke any time from the
extension's Details → Site access, and capture stops working while everything
else keeps running.

Nothing leaves your machine either way: no network requests, no analytics, no
remote server. The saved list and captured text live in `chrome.storage.local`;
the export goes to your Downloads folder.

---

## What gets kept

A job post is mostly not the job. Company mission statements, benefits lists,
and EEO boilerplate routinely account for over half the text — and because that
material sits at the **top** of most postings, a plain character cap spends its
whole budget there and cuts the qualifications off the end entirely.

So capture runs in this order: **extract the full page → drop the fluff →
then apply the cap.**

**Kept:** responsibilities, what you'll be doing, minimum and preferred
qualifications, requirements, skills, who-you-are, salary and pay range,
location, visa and clearance requirements.

**Dropped:** about-the-company, our mission/values/culture, why join us,
benefits and perks, EEO and diversity statements, accommodation and background
check notices, recruiter/agency notices, similar-jobs lists.

A section whose heading matches neither list is **kept** — better to carry
some extra text than to silently discard something unanticipated.

On the test fixture this cuts a posting by 71%. In a real browser against
realistic pages, 56%. If it gets a posting wrong, untick **Trim fluff** and
recapture to get the raw text.

Two safety nets: a posting with no detectable headings is passed through
untouched, and if filtering would leave nothing at all, the original text is
returned instead.

## How capture works

Two strategies, tried in order:

1. **Per-site container hints** — a short list of "which box holds the
   description" selectors for the sites that matter most (LinkedIn, Google,
   Workday, Greenhouse, Lever, Ashby, Indeed, and a few more). A stale selector
   costs nothing; it falls through to (2).
2. **Generic density scoring** — strip page chrome (nav, header, footer, aside,
   forms, scripts), then score every block by text length, penalising blocks
   that are mostly link text, rewarding real paragraphs and sentences. The
   winner is the description. This is what handles company career pages nobody
   has ever seen.

**Structured field extraction is a deliberate non-goal.** No parsing of salary,
seniority, or years-required into fields. That's what the AI reading the export
is for. Field-level scrapers break every few weeks when a site changes its
markup; a text dump degrades gracefully, and a slightly messy dump is still
perfectly readable to a model.

### Still to come

- Status tracking per role (interested / applied / interviewing / rejected)
- Notes field UI — the `notes` slot already exists in storage
- Export a selected subset rather than the whole list

---

## Development

```bash
npm test      # 50 unit tests, no dependencies — uses node:test
npm run lint  # syntax-check every JS file

# End-to-end: loads the unpacked extension into a real Chromium and drives
# the popup. Needs `npm install playwright` first.
npm run test:e2e
```

The e2e run opens stub tabs at real-looking job URLs (network is fully
intercepted, so it's offline and deterministic), then checks that the popup
detects the right tabs, parses titles, dedupes, saves, persists across a
reload, captures and distills description text, and produces a valid
export. 47 checks, including fetching with every tab closed and
switching Length/Trim back and forth. It
writes screenshots and two sample exports to `test/screenshots/`.

One gap worth knowing: the e2e run loads a **copy** of the extension whose
manifest pre-grants host access, because `chrome.permissions.request()` needs a
live user gesture and its prompt is a native dialog Playwright cannot click.
The extraction pipeline is fully covered; the permission prompt itself is
verified by hand.

Tests cover the pure logic in `src/lib/jobsites.js`: URL normalization, job-site
detection, company inference, and tab-title cleaning. These are the parts that
fail silently — a bad normalization rule means duplicate saves, a bad detection
rule means your job tabs don't get pre-checked — so they're worth pinning down.
No Chrome APIs are touched, so it all runs in plain Node.

```
job-tab-collector/
├── manifest.json           # MV3
├── src/
│   ├── background.js       # service worker: badge, downloads, the fetch batch
│   ├── lib/
│   │   ├── jobsites.js     # detection, normalization, title parsing (pure)
│   │   ├── extract.js      # injected page-text extractor (self-contained)
│   │   ├── distill.js      # section filter: keep the job, drop the blurb (pure)
│   │   ├── capture.js      # permissions, tab matching, injection, reopening
│   │   ├── storage.js      # chrome.storage.local wrapper, dedupe
│   │   └── export.js       # markdown / json / url formatters + prompts
│   └── popup/              # UI
├── test/
└── icons/
```

---

## Known limitations

- **Title parsing is heuristic.** Tab titles have no standard format. Common
  patterns are handled (`Acme hiring Senior Analyst in Boston | LinkedIn`,
  `Job Application for X at Y`, Indeed's `Role - Company - Location`), but an
  unusual one will land in the export slightly untidy. Cosmetic — the link is
  always correct.
- **`fetchable` flags are per-site, not per-page.** Four sites were verified
  directly; the rest are classified by rendering style and could change. A wrong
  flag only costs you an unnecessary capture or a spurious warning.
- **Reopening is sequential and takes a few seconds per role.** Twenty roles is
  a couple of minutes. It runs in the background and can be cancelled.
- **Extraction is heuristic.** It gets the description block on the sites
  tested, but an unusual layout may pull in some surrounding text. Harmless —
  the AI reads around it.
- **No editing of saved entries yet.** You can remove and re-add. The `notes`
  field exists in storage but has no UI.
- **Chromium only.**
