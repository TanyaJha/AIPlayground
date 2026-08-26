# fitcheck resume — the renderer

> A résumé **spec** (JSON) in, an **ATS-safe `.docx`** out. The last mile of the pipeline:
> `/curate` + the bank choose *what* to say; this renders it.

One engine replaces per-résumé scripts. Single column, real text, no tables (ATS-safe),
Calibri, US Letter, tight one-page margins. Inline `**bold**` is supported in any text field.

## The one hard rule it enforces
**No em dashes.** `render.js` scans the spec and *fails loudly* if it finds `—`, naming the
offending fields, and tells you to use a colon, comma, or middot (`·`). This is a standing
rule, enforced at render time so it can't slip through. (En dashes in date ranges and minus
signs in metrics are fine — they aren't em dashes.)

## Use it
```bash
cd projects/fitcheck/resume
npm install                                   # one time (docx)
node render.js path/to/spec.json out.docx
# or try the fictional example:
node render.js examples/resume.example.json /tmp/example.docx
```
Or import it:
```js
import { renderResume, assertNoEmDash } from './render.js';
await renderResume(spec, 'out.docx');
```

## The spec
See [`resume.schema.json`](resume.schema.json) and [`examples/resume.example.json`](examples/resume.example.json).
Shape: `name`, `contact`, `summary`, `experience[]` (roles with `bullets[]`), and optional
`projects[]`, `skills[]`, `education[]`. Each bullet is usually a **chosen framing** pulled
from a bank entry for the target archetype — so the résumé is literally a projection of the
bank, not free text.

## Where it sits
```
bank (source of truth) --/curate--> swap list --/tailor--> spec --render.js--> .docx
                                                    │
                                              /grade the selection, /track the framing used
```
The `/tailor` skill assembles the spec from a Curate swap list + the bank and calls this
renderer. Personal résumé data stays private; only the engine and schema are public.
