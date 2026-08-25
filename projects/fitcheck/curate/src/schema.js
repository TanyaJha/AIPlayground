/**
 * The shape of Curate's output — the "swap list".
 *
 * We ask Claude to return exactly this structure (validated at the API layer via
 * structured outputs), so the rest of the code never has to parse free text.
 */
import { z } from 'zod';

export const VERDICTS = ['add', 'promote', 'keep', 'demote', 'omit'];

export const CurateResult = z.object({
  // One line: what this target role actually wants.
  target_summary: z.string(),

  // Every achievement, scored and given a verdict relative to the target.
  ranked: z.array(
    z.object({
      id: z.string(), // must match an id from the achievements bank
      title: z.string(),
      relevance: z.number().int().min(1).max(5),
      verdict: z.enum(['add', 'promote', 'keep', 'demote', 'omit']),
      reason: z.string(),
    })
  ),

  // Requirements the target wants that NO achievement evidences.
  gaps: z.array(
    z.object({
      requirement: z.string(),
      severity: z.enum(['dealbreaker', 'addressable']),
      suggestion: z.string(),
    })
  ),
});
