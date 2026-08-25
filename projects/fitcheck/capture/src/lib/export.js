/**
 * Export formatters.
 *
 * The output of this extension is a file you hand to an AI along with your
 * resume and achievement docs. So the file isn't just data — it carries a
 * prompt header that sets up the task, and it is explicit about which links
 * the AI will and won't be able to open.
 */

/**
 * Prompt headers, one per use case.
 *
 * These are plain strings. Edit them freely — nothing else depends on their
 * wording. `{{COUNT}}` is substituted with the number of roles.
 */
export const PROMPT_TEMPLATES = {
  rank: `# Task: rank these {{COUNT}} roles by fit

Alongside this file I'm giving you my resume and my achievement notes. The
achievement notes contain work that is **not** on my resume — side projects,
results I never wrote up, things I did that didn't fit the page limit. Treat
both as evidence of what I can do.

Please:

1. Open each job link below that is marked **fetchable**. For links marked
   *not fetchable*, say so and skip rather than guessing at the content.
2. For each role you could read, pull out the required qualifications, the
   core responsibilities, and any hard filters (years of experience, location,
   work authorization, security clearance, degree requirements).
3. Rank the roles from best to worst fit for me. For each one give:
   - a fit score out of 10 and a one-line justification
   - which of my qualifications map to their requirements
   - **specifically call out matches that come from my achievement notes
     rather than my resume** — those are the ones I'd otherwise miss
   - the gaps, and whether each gap is a dealbreaker or something I could
     address in a cover letter
4. End with a short list: which roles should I apply to first, and why.

Be blunt about weak fits. I'd rather cut the list than pad it.
`,

  tailor: `# Task: help me tailor my resume to these {{COUNT}} roles

Alongside this file I'm giving you my resume and my achievement notes. The
achievement notes contain work that is **not** currently on my resume.

Please:

1. Open each job link below that is marked **fetchable**. For links marked
   *not fetchable*, say so and skip rather than guessing at the content.
2. Across all the roles you could read, identify the recurring themes — the
   skills, tools, and kinds of experience that keep coming up.
3. Compare those themes against my resume and tell me:
   - what my resume already covers well
   - what these roles want that my resume doesn't currently show
   - **what my achievement notes contain that would close those gaps but
     isn't on my resume yet** — this is the most useful part; be thorough
4. Propose concrete resume edits: specific bullets to add, rewrite, or cut.
   Write the actual bullet text, using my real accomplishments — don't invent
   experience I don't have, and don't inflate what's there.
5. If some roles want something I genuinely cannot evidence, say so plainly
   instead of stretching.
`,

  none: '',
};

const FETCHABLE_NOTE = `> **A note on the links:** some job sites block automated fetching, so an AI
> cannot open them from the URL alone. Those are marked *not fetchable* below —
> for those, paste the job description text in yourself, or the analysis will
> silently skip them.
`;

function fillTemplate(template, jobs) {
  return template.replace(/\{\{COUNT\}\}/g, String(jobs.length));
}

function escapePipes(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Markdown export — the default. Readable by a human, parseable by an AI.
 */
export function toMarkdown(jobs, { promptMode = 'rank', includePromptHeader = true } = {}) {
  const lines = [];
  const stamp = new Date().toISOString().slice(0, 10);

  if (includePromptHeader && PROMPT_TEMPLATES[promptMode]) {
    lines.push(fillTemplate(PROMPT_TEMPLATES[promptMode], jobs).trim(), '');
  }

  const unfetchable = jobs.filter((j) => !j.fetchable).length;
  if (unfetchable > 0) {
    lines.push(FETCHABLE_NOTE.trim(), '');
  }

  lines.push(`## ${jobs.length} saved role${jobs.length === 1 ? '' : 's'} — exported ${stamp}`, '');

  if (jobs.length === 0) {
    lines.push('_No roles saved._');
    return lines.join('\n');
  }

  lines.push('| # | Role | Company | Source | Fetchable | Link |');
  lines.push('|---|------|---------|--------|-----------|------|');
  jobs.forEach((job, i) => {
    lines.push(
      `| ${i + 1} | ${escapePipes(job.title)} | ${escapePipes(job.company || '—')} | ` +
        `${escapePipes(job.source)} | ${job.fetchable ? 'yes' : '**no**'} | ${escapePipes(job.url)} |`
    );
  });
  lines.push('');

  // Any captured page content (v2) or personal notes get their own section, so
  // the table above stays scannable.
  const withExtras = jobs.filter((j) => j.content || j.notes);
  if (withExtras.length > 0) {
    lines.push('---', '', '## Job descriptions', '');
    withExtras.forEach((job) => {
      lines.push(`### ${job.title}${job.company ? ` — ${job.company}` : ''}`);
      lines.push(`<${job.url}>`, '');
      if (job.notes) lines.push(`**My notes:** ${job.notes}`, '');
      if (job.content) lines.push(job.content.trim(), '');
      lines.push('---', '');
    });
  }

  return lines.join('\n');
}

/** JSON export — for when you want to script against it rather than paste it. */
export function toJson(jobs) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: jobs.length,
      jobs: jobs.map((j) => ({
        title: j.title,
        company: j.company,
        source: j.source,
        url: j.url,
        fetchable: j.fetchable,
        savedAt: j.savedAt,
        notes: j.notes || '',
        content: j.content || null,
      })),
    },
    null,
    2
  );
}

/** Bare URL list — one per line. */
export function toUrls(jobs) {
  return jobs.map((j) => j.url).join('\n');
}

export function formatJobs(jobs, settings) {
  switch (settings.exportFormat) {
    case 'json':
      return { text: toJson(jobs), ext: 'json', mime: 'application/json' };
    case 'urls':
      return { text: toUrls(jobs), ext: 'txt', mime: 'text/plain' };
    case 'markdown':
    default:
      return {
        text: toMarkdown(jobs, settings),
        ext: 'md',
        mime: 'text/markdown',
      };
  }
}
