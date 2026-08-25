#!/usr/bin/env node
/**
 * The eval runner — the prompt-improvement loop's measurement step.
 *
 * For each golden case:  Curate → assertions (free) → judge (rubric, 3×) → record.
 * Writes a timestamped result + appends to eval-history.json so you can compare
 * "before" and "after" a prompt change.
 *
 * Usage:
 *   node evals/run.js [--bank <file>] [--runs 3] [--only <caseId>] [--no-judge]
 *
 * Needs ANTHROPIC_API_KEY. Model via FITCHECK_MODEL / FITCHECK_JUDGE_MODEL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseAchievements } from '../src/achievements.js';
import { runCurate, DEFAULT_MODEL } from '../src/engine.js';
import { runAssertions } from './assertions.js';
import { scoreOutput } from './judge.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(HERE, 'cases');
const RESULTS_DIR = path.join(HERE, 'results');
const HISTORY = path.join(HERE, 'eval-history.json');

function parseArgs(argv) {
  const a = { bank: null, runs: 3, only: null, judge: true };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (t === '--bank') a.bank = rest[++i];
    else if (t === '--runs') a.runs = Number(rest[++i]);
    else if (t === '--only') a.only = rest[++i];
    else if (t === '--no-judge') a.judge = false;
  }
  return a;
}

function loadCases(only) {
  return fs.readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !only || name === only)
    .map((name) => {
      const dir = path.join(CASES_DIR, name);
      const expect = JSON.parse(fs.readFileSync(path.join(dir, 'expect.json'), 'utf8'));
      const jobText = fs.readFileSync(path.join(dir, expect.job || 'job.txt'), 'utf8');
      const resumeText = expect.resume ? fs.readFileSync(path.join(dir, expect.resume), 'utf8') : null;
      return { name, dir, expect, jobText, resumeText };
    });
}

function fail(msg) { process.stderr.write(msg + '\n'); process.exit(1); }

async function main() {
  const args = parseArgs(process.argv);
  if (!process.env.ANTHROPIC_API_KEY) fail('Set ANTHROPIC_API_KEY first.');

  const bankPath = args.bank || path.join(HERE, '..', 'examples', 'achievements.sample.md');
  const achievements = parseAchievements(fs.readFileSync(bankPath, 'utf8'));
  const bankIds = achievements.map((a) => a.id);

  const cases = loadCases(args.only);
  if (cases.length === 0) fail('No cases found under evals/cases/.');

  process.stderr.write(
    `Running ${cases.length} case(s) · bank=${path.basename(bankPath)} · ` +
    `engine=${DEFAULT_MODEL} · judge×${args.runs}\n\n`
  );

  const rows = [];
  for (const c of cases) {
    process.stderr.write(`▶ ${c.name}\n`);
    const result = await runCurate({ achievements, jobText: c.jobText, resumeText: c.resumeText });

    const asserts = runAssertions(result, {
      bankIds, hasResume: Boolean(c.resumeText), expect: c.expect.expect || {},
    });
    const failed = asserts.checks.filter((x) => !x.ok);

    let judge = null;
    if (args.judge) {
      judge = await scoreOutput({
        result, jobText: c.jobText, achievements, resumeText: c.resumeText, runs: args.runs,
      });
    }

    rows.push({ name: c.name, result, asserts, judge });

    // per-case line
    const a = asserts.passed ? 'PASS' : `FAIL(${failed.map((f) => f.id).join(',')})`;
    const g = judge ? (judge.gate_pass ? 'gate✓' : 'GATE✗') : '';
    const o = judge ? `overall ${judge.overall}/10` : '';
    process.stderr.write(`   assertions ${a}   ${g}   ${o}\n`);
    if (judge) process.stderr.write(`   ↳ ${judge.top_issues[0] || ''}\n`);
    process.stderr.write('\n');
  }

  // aggregate
  const nPass = rows.filter((r) => r.asserts.passed && (!r.judge || r.judge.gate_pass)).length;
  const overalls = rows.filter((r) => r.judge).map((r) => r.judge.overall);
  const summary = {
    pass_rate: round2(nPass / rows.length),
    mean_overall: overalls.length ? round2(overalls.reduce((a, b) => a + b, 0) / overalls.length) : null,
  };
  process.stderr.write(`— pass_rate ${summary.pass_rate}   mean_overall ${summary.mean_overall}\n`);

  // persist
  const ts = new Date().toISOString();
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const runRecord = {
    ts, engine: DEFAULT_MODEL, judge_runs: args.judge ? args.runs : 0,
    cases: rows.map((r) => ({
      name: r.name,
      assertions_passed: r.asserts.passed,
      failed_checks: r.asserts.checks.filter((x) => !x.ok).map((x) => ({ id: x.id, detail: x.detail })),
      gate_pass: r.judge ? r.judge.gate_pass : null,
      scores: r.judge ? r.judge.scores : null,
      overall: r.judge ? r.judge.overall : null,
      top_issue: r.judge ? r.judge.top_issues[0] || '' : null,
      result: r.result,
    })),
    summary,
  };
  const outFile = path.join(RESULTS_DIR, `${ts.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(runRecord, null, 2));

  const history = fs.existsSync(HISTORY) ? JSON.parse(fs.readFileSync(HISTORY, 'utf8')) : [];
  history.push({ ts, engine: DEFAULT_MODEL, ...summary,
    cases: runRecord.cases.map((c) => ({ name: c.name, assertions_passed: c.assertions_passed, gate_pass: c.gate_pass, overall: c.overall })) });
  fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2));

  process.stderr.write(`\nsaved ${path.relative(process.cwd(), outFile)} · history ${history.length} runs\n`);
}

function round2(n) { return Math.round(n * 100) / 100; }

main().catch((err) => { process.stderr.write((err && err.stack ? err.stack : String(err)) + '\n'); process.exit(1); });
