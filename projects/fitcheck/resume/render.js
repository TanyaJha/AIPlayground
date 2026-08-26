/**
 * fitcheck résumé renderer — a résumé spec (JSON) -> ATS-safe .docx.
 *
 * Generalizes the bespoke per-résumé builders into one engine: /curate + the bank
 * produce a spec, this renders it. Single column, real text, no tables (ATS-safe),
 * Calibri, US Letter, tight one-page margins.
 *
 * Enforces the one hard formatting rule at render time: NO EM DASHES. If the spec
 * contains one, rendering fails loudly and tells you where — because "no em dashes in a
 * résumé" is a standing rule, not a preference to re-litigate.
 *
 * Usage:  node render.js <spec.json> <out.docx>
 * Or import { renderResume } from './render.js' and pass a spec object.
 */
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';
import fs from 'node:fs';

const FONT = 'Calibri', INK = '111418', MUT = '444a52';

// --- inline formatting: **bold** within a string -> run segments -------------
function toSegments(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: m[1], b: true });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out.length ? out : [{ t: text }];
}

function runsFrom(text, opts = {}) {
  return toSegments(text).map((s) => new TextRun({
    text: s.t, bold: !!s.b, italics: !!opts.i,
    color: opts.color || INK, size: opts.size || 20, font: FONT,
  }));
}

// --- paragraph builders (shared style) ---------------------------------------
const bullet = (text) => new Paragraph({
  bullet: { level: 0 }, spacing: { after: 40, line: 250 }, children: runsFrom(text),
});
const heading = (text) => new Paragraph({
  spacing: { before: 150, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'b8bec6', space: 2 } },
  children: [new TextRun({ text, bold: true, size: 21, color: INK, font: FONT, allCaps: true, characterSpacing: 20 })],
});
const roleLine = (org, dates) => new Paragraph({
  spacing: { before: 90, after: 10 },
  children: [
    new TextRun({ text: org, bold: true, size: 21, color: INK, font: FONT }),
    ...(dates ? [new TextRun({ text: `  ${dates}`, italics: true, size: 18, color: MUT, font: FONT })] : []),
  ],
});
const plain = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 40, line: 250 }, alignment: opts.align,
  children: runsFrom(text, opts),
});

// --- the em-dash guard (hard rule) -------------------------------------------
export function assertNoEmDash(spec) {
  const hits = [];
  const walk = (v, path) => {
    if (typeof v === 'string') { if (v.includes('—')) hits.push(`${path}: ${v}`); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path ? `${path}.${k}` : k);
  };
  walk(spec, '');
  if (hits.length) {
    throw new Error(
      'Em dash (—) found — not allowed in a résumé. Use a colon, comma, or middot (·). Offending fields:\n  ' +
      hits.join('\n  ')
    );
  }
}

// --- the renderer ------------------------------------------------------------
export function buildDoc(spec) {
  assertNoEmDash(spec);
  const children = [];

  children.push(new Paragraph({
    spacing: { after: 20 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: spec.name, bold: true, size: 40, color: INK, font: FONT, characterSpacing: 20 })],
  }));
  if (spec.contact) children.push(plain(spec.contact, { align: AlignmentType.CENTER, color: MUT, size: 18, after: 80 }));
  if (spec.summary) children.push(plain(spec.summary, { after: 40 }));

  if (spec.experience?.length) {
    children.push(heading(spec.experienceHeading || 'Experience'));
    for (const role of spec.experience) {
      children.push(roleLine(role.org, role.dates));
      if (role.subline) children.push(plain(role.subline, { i: true, color: MUT, size: 19, after: 50 }));
      for (const b of (role.bullets || [])) children.push(bullet(b));
    }
  }
  if (spec.projects?.length) {
    children.push(heading('Projects'));
    for (const b of spec.projects) children.push(bullet(b));
  }
  if (spec.skills?.length) {
    children.push(heading('Skills'));
    for (const s of spec.skills) children.push(plain(`**${s.label}:** ${s.text}`, { size: 19, after: 30 }));
  }
  if (spec.education?.length) {
    children.push(heading('Education'));
    for (const b of spec.education) children.push(bullet(b));
  }

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 700, bottom: 700, left: 800, right: 800 } } },
      children,
    }],
  });
}

export async function renderResume(spec, outPath) {
  const buf = await Packer.toBuffer(buildDoc(spec));
  if (outPath) fs.writeFileSync(outPath, buf);
  return buf;
}

// --- CLI ---------------------------------------------------------------------
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [, , specPath, outPath] = process.argv;
  if (!specPath || !outPath) { process.stderr.write('Usage: node render.js <spec.json> <out.docx>\n'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  renderResume(spec, outPath)
    .then(() => process.stdout.write(`wrote ${outPath}\n`))
    .catch((e) => { process.stderr.write((e.message || String(e)) + '\n'); process.exit(1); });
}
