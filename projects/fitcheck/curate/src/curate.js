#!/usr/bin/env node
/**
 * Curate — fitcheck's target → capability arm.
 *
 * Given a target job description and your achievement bank, it pulls the
 * experiences that best support that target and prints a swap list:
 * ADD / PROMOTE / KEEP / DEMOTE, plus the gaps you can't evidence.
 *
 * Usage:
 *   node src/curate.js <job-file> [--achievements <file>] [--resume <file>] [--json]
 *
 * Needs an Anthropic API key in the environment (ANTHROPIC_API_KEY).
 * Override the model with FITCHECK_MODEL (default: claude-opus-5).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import { loadAchievements } from './achievements.js';
import { runCurate, DEFAULT_MODEL } from './engine.js';
import { renderResult } from './format.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL = DEFAULT_MODEL;

function parseArgs(argv) {
  const args = { job: null, achievements: null, resume: null, json: false };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--json') args.json = true;
    else if (a === '--achievements') args.achievements = rest[++i];
    else if (a === '--resume') args.resume = rest[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('-') && !args.job) args.job = a;
  }
  return args;
}

const HELP = `curate — pull the experiences that best fit a target role.

Usage:
  node src/curate.js <job-file> [options]

Options:
  --achievements <file>   your achievement bank — bank.json (an array of entries)
                          or an achievements.md (default: ./bank.json, then
                          ./achievements.md, then the bundled example)
  --resume <file>         your current résumé — unlocks ADD/PROMOTE/DEMOTE
  --json                  print raw JSON instead of the formatted swap list
  -h, --help              show this

Environment:
  ANTHROPIC_API_KEY   required
  FITCHECK_MODEL      model id (default: claude-opus-5; try claude-sonnet-5 to save cost)
`;

function readFileOr(pathname, fallback) {
  try {
    return fs.readFileSync(pathname, 'utf8');
  } catch {
    return fallback;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.job) {
    process.stdout.write(HELP);
    process.exit(args.job ? 0 : 1);
  }

  // --- read the target ---
  let jobText;
  try {
    jobText = fs.readFileSync(args.job, 'utf8');
  } catch {
    fail(`Couldn't read the job file: ${args.job}`);
  }

  // --- read the bank (explicit path, then ./bank.json, then ./achievements.md, then sample) ---
  let achText, achSource;
  if (args.achievements) {
    achText = readFileOr(args.achievements, null);
    if (achText == null) fail(`Couldn't read the achievements file: ${args.achievements}`);
    achSource = args.achievements;
  } else {
    // Prefer bank.json (the single source of truth), then a hand-kept markdown file.
    achText = readFileOr(path.resolve(process.cwd(), 'bank.json'), null);
    achSource = 'bank.json';
    if (achText == null) {
      achText = readFileOr(path.resolve(process.cwd(), 'achievements.md'), null);
      achSource = 'achievements.md';
    }
    if (achText == null) {
      achText = fs.readFileSync(path.join(HERE, '..', 'examples', 'achievements.sample.md'), 'utf8');
      achSource = 'examples/achievements.sample.md (no bank.json or achievements.md found — using the sample)';
    }
  }
  // JSON if the file is named *.json, otherwise sniff the content.
  const isJson = /\.json$/i.test(achSource) || /^\s*[[{]/.test(achText);
  let achievements;
  try {
    achievements = loadAchievements(achText, { json: isJson });
  } catch (err) {
    fail(err.message);
  }
  if (achievements.length === 0) {
    fail('No achievements found. Point --achievements at your bank.json (an array of ' +
         'entries) or an achievements.md (each entry starts with a "## Title" line).');
  }

  // --- optional résumé ---
  let resumeText = null;
  if (args.resume) {
    resumeText = readFileOr(args.resume, null);
    if (resumeText == null) fail(`Couldn't read the résumé file: ${args.resume}`);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    fail('Set ANTHROPIC_API_KEY in your environment first.\n' +
         '  export ANTHROPIC_API_KEY=sk-ant-...');
  }

  if (!args.json) {
    process.stderr.write(
      `Scoring ${achievements.length} achievements against the target ` +
      `(${achSource})…\n\n`
    );
  }

  let result;
  try {
    result = await runCurate({ achievements, jobText, resumeText, model: MODEL });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) fail('Invalid API key.');
    if (err instanceof Anthropic.RateLimitError) fail('Rate limited — wait a moment and retry.');
    if (err instanceof Anthropic.APIError) fail(`API error ${err.status}: ${err.message}`);
    throw err;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(renderResult(result, { color: process.stdout.isTTY }) + '\n');
  }
}

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write((err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(1);
});
