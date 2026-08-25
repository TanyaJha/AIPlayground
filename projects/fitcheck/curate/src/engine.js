/**
 * The Curate engine: score(achievements, target) → swap list.
 *
 * One structured Claude call. Extracted so the CLI (curate.js) and the eval
 * harness (evals/run.js) call the exact same code — evals must test what ships.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { buildUserMessage, SYSTEM } from './prompt.js';
import { CurateResult } from './schema.js';

export const DEFAULT_MODEL = process.env.FITCHECK_MODEL || 'claude-opus-5';

/**
 * @param {{achievements: Array, jobText: string, resumeText?: string|null, model?: string, client?: any}} args
 * @returns {Promise<object>} a validated CurateResult
 */
export async function runCurate({ achievements, jobText, resumeText = null, model = DEFAULT_MODEL, client }) {
  const anthropic = client || new Anthropic();
  const response = await anthropic.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      { role: 'user', content: buildUserMessage({ achievements, jobText, resumeText }) },
    ],
    output_config: { format: zodOutputFormat(CurateResult) },
  });
  if (!response.parsed_output) {
    throw new Error('The model did not return a valid CurateResult.');
  }
  return response.parsed_output;
}
