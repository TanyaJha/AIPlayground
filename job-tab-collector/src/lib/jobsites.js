/**
 * Job site detection, URL normalization, and metadata inference.
 *
 * Everything in this module is a pure function of a URL/title string, which
 * means it is testable in plain Node with no Chrome APIs involved.
 * See test/jobsites.test.js.
 */

/**
 * Known job boards and applicant tracking systems (ATS).
 *
 * `fetchable` records whether an external AI (Claude, ChatGPT) can actually
 * retrieve the page from the URL alone. LinkedIn and Indeed block automated
 * fetching via robots.txt, so handing over their URLs gets you nothing — those
 * need the v2 content capture path. Most ATS boards serve plain static HTML
 * and read fine.
 */
export const JOB_SITES = [
  // --- Big-tech career sites ---
  // Google verified fetchable 2026-08-25: server-rendered, listings expose
  // minimum qualifications directly in the HTML. Others are best guesses based
  // on whether the site is a server-rendered page or a client-side SPA.
  { id: 'google',    label: 'Google Careers',    host: /(^|\.)google\.com$/,        path: /^\/about\/careers\//, fetchable: true,  company: 'fixed', companyName: 'Google' },
  { id: 'googlecar', label: 'Google Careers',    host: /(^|\.)careers\.google\.com$/, path: null,                fetchable: true,  company: 'fixed', companyName: 'Google' },
  // Amazon verified NOT fetchable 2026-08-25: the search and detail pages are
  // client-rendered, so the served HTML has no listings in it.
  { id: 'amazon',    label: 'Amazon Jobs',       host: /(^|\.)amazon\.jobs$/,       path: null,                  fetchable: false, company: 'fixed', companyName: 'Amazon' },
  { id: 'microsoft', label: 'Microsoft Careers', host: /(^|\.)careers\.microsoft\.com$/, path: null,             fetchable: false, company: 'fixed', companyName: 'Microsoft' },
  { id: 'meta',      label: 'Meta Careers',      host: /(^|\.)metacareers\.com$/,   path: null,                  fetchable: false, company: 'fixed', companyName: 'Meta' },
  { id: 'apple',     label: 'Apple Jobs',        host: /(^|\.)jobs\.apple\.com$/,   path: null,                  fetchable: false, company: 'fixed', companyName: 'Apple' },
  { id: 'netflix',   label: 'Netflix Jobs',      host: /(^|\.)(jobs\.)?netflix\.com$/, path: /^\/(jobs|work)/,   fetchable: true,  company: 'fixed', companyName: 'Netflix' },
  { id: 'nvidia',    label: 'NVIDIA Careers',    host: /(^|\.)nvidia\.com$/,        path: /careers|jobs/,        fetchable: false, company: 'fixed', companyName: 'NVIDIA' },
  { id: 'salesforce', label: 'Salesforce',       host: /(^|\.)salesforce\.com$/,    path: /careers|jobs/,        fetchable: false, company: 'fixed', companyName: 'Salesforce' },
  { id: 'ibm',       label: 'IBM Careers',       host: /(^|\.)ibm\.com$/,           path: /careers|employment/,  fetchable: false, company: 'fixed', companyName: 'IBM' },
  { id: 'intel',     label: 'Intel Careers',     host: /(^|\.)intel\.com$/,         path: /jobs|careers/,        fetchable: false, company: 'fixed', companyName: 'Intel' },
  { id: 'adobe',     label: 'Adobe Careers',     host: /(^|\.)adobe\.com$/,         path: /careers|jobs/,        fetchable: false, company: 'fixed', companyName: 'Adobe' },
  { id: 'openai',    label: 'OpenAI Careers',    host: /(^|\.)openai\.com$/,        path: /careers|jobs/,        fetchable: true,  company: 'fixed', companyName: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Careers', host: /(^|\.)anthropic\.com$/,     path: /careers|jobs/,        fetchable: true,  company: 'fixed', companyName: 'Anthropic' },
  { id: 'uber',      label: 'Uber Careers',      host: /(^|\.)uber\.com$/,          path: /careers|jobs/,        fetchable: false, company: 'fixed', companyName: 'Uber' },
  { id: 'airbnb',    label: 'Airbnb Careers',    host: /(^|\.)airbnb\.com$/,        path: /careers|positions/,   fetchable: false, company: 'fixed', companyName: 'Airbnb' },
  { id: 'atlassian', label: 'Atlassian',         host: /(^|\.)atlassian\.com$/,     path: /careers|jobs/,        fetchable: false, company: 'fixed', companyName: 'Atlassian' },
  { id: 'shopify',   label: 'Shopify Careers',   host: /(^|\.)shopify\.com$/,       path: /careers|jobs/,        fetchable: false, company: 'fixed', companyName: 'Shopify' },
  { id: 'spotify',   label: 'Spotify Jobs',      host: /(^|\.)lifeatspotify\.com$/, path: null,                  fetchable: false, company: 'fixed', companyName: 'Spotify' },
  { id: 'tesla',     label: 'Tesla Careers',     host: /(^|\.)tesla\.com$/,         path: /careers/,             fetchable: false, company: 'fixed', companyName: 'Tesla' },
  { id: 'usajobs',   label: 'USAJOBS',           host: /(^|\.)usajobs\.gov$/,       path: null,                  fetchable: false, company: 'fixed', companyName: 'US Government' },

  // --- Aggregators / job boards (mostly hostile to automated fetching) ---
  { id: 'linkedin',      label: 'LinkedIn',      host: /(^|\.)linkedin\.com$/,        path: /^\/jobs\//,          fetchable: false },
  { id: 'indeed',        label: 'Indeed',        host: /(^|\.)indeed\.(com|co\.\w+)$/, path: null,                fetchable: false },
  { id: 'glassdoor',     label: 'Glassdoor',     host: /(^|\.)glassdoor\.(com|co\.\w+)$/, path: /job|Job/,        fetchable: false },
  { id: 'ziprecruiter',  label: 'ZipRecruiter',  host: /(^|\.)ziprecruiter\.com$/,    path: null,                 fetchable: false },
  { id: 'dice',          label: 'Dice',          host: /(^|\.)dice\.com$/,            path: /^\/job/,             fetchable: false },
  { id: 'monster',       label: 'Monster',       host: /(^|\.)monster\.com$/,         path: null,                 fetchable: false },
  { id: 'simplyhired',   label: 'SimplyHired',   host: /(^|\.)simplyhired\.com$/,     path: null,                 fetchable: false },
  { id: 'wellfound',     label: 'Wellfound',     host: /(^|\.)(wellfound|angel)\.(com|co)$/, path: null,          fetchable: false },
  { id: 'builtin',       label: 'Built In',      host: /(^|\.)builtin\.com$/,         path: /^\/job/,             fetchable: true  },
  { id: 'otta',          label: 'Otta',          host: /(^|\.)otta\.com$/,            path: null,                 fetchable: false },
  // We Work Remotely verified fetchable 2026-08-25 (server-rendered listings).
  { id: 'weworkremotely', label: 'We Work Remotely', host: /(^|\.)weworkremotely\.com$/, path: null,        fetchable: true  },
  { id: 'remoteok',      label: 'Remote OK',     host: /(^|\.)remoteok\.(com|io)$/,  path: null,                 fetchable: true  },
  { id: 'remotive',      label: 'Remotive',      host: /(^|\.)remotive\.(com|io)$/,  path: null,                 fetchable: true  },
  { id: 'workingnomads', label: 'Working Nomads', host: /(^|\.)workingnomads\.com$/, path: null,                 fetchable: true  },
  { id: 'flexjobs',      label: 'FlexJobs',      host: /(^|\.)flexjobs\.com$/,       path: null,                 fetchable: false },
  { id: 'ycombinator',   label: 'YC Work at a Startup', host: /(^|\.)workatastartup\.com$/, path: null,          fetchable: false },
  { id: 'handshake',     label: 'Handshake',     host: /(^|\.)joinhandshake\.com$/,  path: null,                 fetchable: false },
  { id: 'ladders',       label: 'Ladders',       host: /(^|\.)theladders\.com$/,     path: null,                 fetchable: false },
  { id: 'levels',        label: 'Levels.fyi',    host: /(^|\.)levels\.fyi$/,         path: /^\/jobs/,            fetchable: false },
  { id: 'hiringcafe',    label: 'Hiring Cafe',   host: /(^|\.)hiring\.cafe$/,        path: null,                 fetchable: false },
  { id: 'clearancejobs', label: 'ClearanceJobs', host: /(^|\.)clearancejobs\.com$/,  path: null,                 fetchable: false },
  { id: 'idealist',      label: 'Idealist',      host: /(^|\.)idealist\.org$/,       path: null,                 fetchable: true  },
  { id: 'seek',          label: 'Seek',          host: /(^|\.)seek\.com(\.au)?$/,    path: null,                 fetchable: false },
  { id: 'reed',          label: 'Reed',          host: /(^|\.)reed\.co\.uk$/,        path: null,                 fetchable: false },
  { id: 'totaljobs',     label: 'Totaljobs',     host: /(^|\.)totaljobs\.com$/,      path: null,                 fetchable: false },
  { id: 'stepstone',     label: 'StepStone',     host: /(^|\.)stepstone\.(com|de)$/, path: null,                 fetchable: false },
  { id: 'naukri',        label: 'Naukri',        host: /(^|\.)naukri\.com$/,         path: null,                 fetchable: false },
  { id: 'instahyre',     label: 'Instahyre',     host: /(^|\.)instahyre\.com$/,      path: null,                 fetchable: false },

  // --- ATS platforms (generally static HTML, usually fetchable) ---
  { id: 'greenhouse',    label: 'Greenhouse',    host: /(^|\.)greenhouse\.io$/,       path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'lever',         label: 'Lever',         host: /(^|\.)lever\.co$/,            path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'ashby',         label: 'Ashby',         host: /(^|\.)ashbyhq\.com$/,         path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'smartrecruiters', label: 'SmartRecruiters', host: /(^|\.)smartrecruiters\.com$/, path: null,             fetchable: true, company: 'firstPath' },
  { id: 'workable',      label: 'Workable',      host: /(^|\.)workable\.com$/,        path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'jobvite',       label: 'Jobvite',       host: /(^|\.)jobvite\.com$/,         path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'workday',       label: 'Workday',       host: /(^|\.)myworkdayjobs\.com$/,   path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'breezy',        label: 'Breezy',        host: /(^|\.)breezy\.hr$/,           path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'recruitee',     label: 'Recruitee',     host: /(^|\.)recruitee\.com$/,       path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'teamtailor',    label: 'Teamtailor',    host: /(^|\.)teamtailor\.com$/,      path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'bamboohr',      label: 'BambooHR',      host: /(^|\.)bamboohr\.com$/,        path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'icims',         label: 'iCIMS',         host: /(^|\.)icims\.com$/,           path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'taleo',         label: 'Taleo',         host: /(^|\.)taleo\.net$/,           path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'successfactors', label: 'SuccessFactors', host: /(^|\.)successfactors\.(com|eu)$/, path: null,           fetchable: false, company: 'subdomain' },
  { id: 'rippling',      label: 'Rippling',      host: /(^|\.)rippling(jobs)?\.com$/, path: /^\/(jobs|job)/,      fetchable: true  },
  { id: 'pinpoint',      label: 'Pinpoint',      host: /(^|\.)pinpointhq\.com$/,      path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'jazzhr',        label: 'JazzHR',        host: /(^|\.)applytojob\.com$/,     path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'comeet',        label: 'Comeet',        host: /(^|\.)comeet\.co$/,          path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'personio',      label: 'Personio',      host: /(^|\.)personio\.(com|de)$/,  path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'joincom',       label: 'Join.com',      host: /(^|\.)join\.com$/,           path: null,                 fetchable: true, company: 'firstPath' },
  { id: 'homerun',       label: 'Homerun',       host: /(^|\.)homerun\.co$/,         path: null,                 fetchable: true, company: 'subdomain' },
  { id: 'paylocity',     label: 'Paylocity',     host: /(^|\.)paylocity\.com$/,      path: /recruiting/,         fetchable: false },
  { id: 'paycom',        label: 'Paycom',        host: /(^|\.)paycomonline\.net$/,   path: null,                 fetchable: false },
  { id: 'adp',           label: 'ADP',           host: /(^|\.)workforcenow\.adp\.com$/, path: null,             fetchable: false },
  { id: 'ukg',           label: 'UKG',           host: /(^|\.)ultipro\.com$/,        path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'dayforce',      label: 'Dayforce',      host: /(^|\.)dayforcehcm\.com$/,    path: null,                 fetchable: false },
  { id: 'oraclecloud',   label: 'Oracle Cloud',  host: /(^|\.)oraclecloud\.com$/,    path: /CandidateExperience|hcmUI/, fetchable: false },
  { id: 'cornerstone',   label: 'Cornerstone',   host: /(^|\.)csod\.com$/,           path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'avature',       label: 'Avature',       host: /(^|\.)avature\.net$/,        path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'phenom',        label: 'Phenom',        host: /(^|\.)phenompeople\.com$/,   path: null,                 fetchable: false },
  { id: 'eightfold',     label: 'Eightfold',     host: /(^|\.)eightfold\.ai$/,       path: /careers|jobs/,       fetchable: false },
  { id: 'zohorecruit',   label: 'Zoho Recruit',  host: /(^|\.)zohorecruit\.(com|eu|in)$/, path: null,            fetchable: false, company: 'subdomain' },
  { id: 'freshteam',     label: 'Freshteam',     host: /(^|\.)freshteam\.com$/,      path: null,                 fetchable: false, company: 'subdomain' },
  { id: 'darwinbox',     label: 'Darwinbox',     host: /(^|\.)darwinbox\.(com|in)$/, path: null,                 fetchable: false, company: 'subdomain' },
];

/**
 * Generic career-page heuristic, applied only when no known site matched.
 * Deliberately conservative: it wants a careers-ish host OR a careers-ish path
 * segment, not merely the word "job" appearing anywhere in the URL.
 */
const GENERIC_CAREER_HOST = /^(careers?|jobs|work|join|apply|talent)\./i;
const GENERIC_CAREER_PATH = /^\/(careers?|jobs?|openings|positions|vacancies|join-us|work-with-us)(\/|$)/i;

/**
 * Query parameters that carry tracking/session state rather than identity.
 * Stripping these is what lets us recognise the same posting opened twice.
 */
const TRACKING_PARAMS = [
  // Generic campaign tracking
  /^utm_/i, /^ga_/i, /^_ga$/i, /^fbclid$/i, /^gclid$/i, /^msclkid$/i, /^mc_[ce]id$/i,
  // LinkedIn
  /^refId$/i, /^trackingId$/i, /^trk$/i, /^trkInfo$/i, /^lipi$/i, /^licu$/i,
  /^midToken$/i, /^midSig$/i, /^eBP$/i, /^originToken$/i, /^savedSearchId$/i,
  /^originalSubdomain$/i, /^position$/i, /^pageNum$/i, /^refresh$/i,
  // Indeed / Glassdoor / others
  /^from$/i, /^vjk$/i, /^tk$/i, /^advn$/i, /^adid$/i, /^sjdu$/i, /^jsa$/i,
  /^src$/i, /^source$/i, /^referrer$/i, /^ref$/i,
  // Greenhouse / Lever
  /^gh_src$/i, /^gh_jid$/i, /^lever-source/i,
];

const isTrackingParam = (key) => TRACKING_PARAMS.some((re) => re.test(key));

/**
 * Identify which known job site (if any) a URL belongs to.
 * @param {string} rawUrl
 * @returns {{site: object|null, isJob: boolean, source: string, fetchable: boolean}}
 */
export function detectSite(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return { site: null, isJob: false, source: 'Unknown', fetchable: false };
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { site: null, isJob: false, source: 'Unknown', fetchable: false };
  }

  for (const site of JOB_SITES) {
    if (!site.host.test(u.hostname)) continue;
    // A host match with a required path that doesn't match is a non-job page on
    // a job site (e.g. the LinkedIn feed rather than a posting).
    if (site.path && !site.path.test(u.pathname)) {
      return { site, isJob: false, source: site.label, fetchable: site.fetchable };
    }
    return { site, isJob: true, source: site.label, fetchable: site.fetchable };
  }

  const genericMatch =
    GENERIC_CAREER_HOST.test(u.hostname) || GENERIC_CAREER_PATH.test(u.pathname);
  if (genericMatch) {
    return {
      site: { id: 'generic', label: 'Company site', fetchable: true, company: 'domain' },
      isJob: true,
      source: 'Company site',
      fetchable: true,
    };
  }

  return { site: null, isJob: false, source: hostLabel(u.hostname), fetchable: true };
}

function hostLabel(hostname) {
  return hostname.replace(/^www\./, '');
}

/**
 * Strip tracking noise so the same posting always produces the same key.
 *
 * Beyond dropping tracking params, a few sites get special handling because
 * their canonical identity is a single path segment and everything else is
 * decoration (LinkedIn's /jobs/view/<id>/ is the main one).
 *
 * @param {string} rawUrl
 * @returns {string} normalized URL, or the original string if unparseable
 */
export function normalizeUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  u.hash = '';
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.protocol = 'https:';

  // LinkedIn: the job id is the whole identity.
  const liJob = u.hostname.endsWith('linkedin.com') && u.pathname.match(/\/jobs\/view\/(\d+)/);
  if (liJob) {
    return `https://www.linkedin.com/jobs/view/${liJob[1]}`;
  }

  // LinkedIn collections pages carry the real job in ?currentJobId=
  if (u.hostname.endsWith('linkedin.com') && u.searchParams.get('currentJobId')) {
    return `https://www.linkedin.com/jobs/view/${u.searchParams.get('currentJobId')}`;
  }

  // Google Careers: /about/careers/applications/jobs/results/<id>-<slug>
  // The numeric id is canonical; the slug and any search state are decoration.
  const gJob = u.pathname.match(/\/jobs\/results\/(\d+)(?:-[^/]*)?/);
  if (gJob && /google\.com$/.test(u.hostname)) {
    return `https://www.google.com/about/careers/applications/jobs/results/${gJob[1]}`;
  }

  // Indeed: identity is the ?jk= key.
  if (/indeed\./.test(u.hostname) && u.searchParams.get('jk')) {
    return `https://${u.hostname}/viewjob?jk=${u.searchParams.get('jk')}`;
  }

  for (const key of [...u.searchParams.keys()]) {
    if (isTrackingParam(key)) u.searchParams.delete(key);
  }
  u.searchParams.sort();

  // Drop a trailing slash so /jobs/123 and /jobs/123/ agree.
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1);
  }

  return u.toString();
}

/**
 * Infer the hiring company from URL structure alone.
 * ATS platforms encode it predictably: jobs.lever.co/<company>/<id>,
 * <company>.breezy.hr, job-boards.greenhouse.io/<company>/jobs/<id>.
 *
 * @returns {string|null} a display-cased company name, or null if not inferable
 */
export function inferCompany(rawUrl, site) {
  if (!site || !site.company) return null;
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }

  let raw = null;
  if (site.company === 'fixed') {
    return site.companyName || null;
  }
  if (site.company === 'firstPath') {
    const segments = u.pathname.split('/').filter(Boolean);
    // Skip routing prefixes some boards put in front of the company slug.
    const skip = new Set(['embed', 'jobs', 'job', 'careers', 'company', 'o', 'p']);
    raw = segments.find((s) => !skip.has(s.toLowerCase())) || null;
  } else if (site.company === 'subdomain') {
    const parts = u.hostname.split('.');
    if (parts.length > 2) {
      // Skip routing labels so careers.acme.icims.com yields "Acme", not
      // "Careers", and <company>.wd5.myworkdayjobs.com yields the company.
      const GENERIC = /^(careers?|jobs?|apply|talent|work|recruiting|hire|hiring|www|wd\d+)$/i;
      const meaningful = parts
        .slice(0, parts.length - 2)
        .filter((label) => !GENERIC.test(label));
      raw = meaningful.length > 0 ? meaningful[0] : null;
    }
  } else if (site.company === 'domain') {
    const parts = u.hostname.replace(/^(careers?|jobs|work|join|apply|talent)\./i, '').split('.');
    raw = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }

  if (!raw || raw.length < 2) return null;
  if (/^\d+$/.test(raw)) return null;
  return titleCase(raw.replace(/[-_+]+/g, ' ').trim());
}

function titleCase(s) {
  return s
    .split(/\s+/)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Turn a browser tab title into something readable in an export.
 *
 * Tab titles are noisy: unread-count prefixes, site-name suffixes, and
 * LinkedIn's "Acme hiring Senior Analyst in Boston" phrasing. This pulls the
 * role out and, when the title format gives it away, the company too.
 *
 * @returns {{title: string, company: string|null}}
 */
export function cleanTitle(rawTitle, sourceLabel) {
  let t = (rawTitle || '').trim();
  if (!t) return { title: '(untitled)', company: null };

  // "(3) Senior Data Scientist ..." — notification counter
  t = t.replace(/^\(\d+\+?\)\s*/, '');

  let company = null;

  // LinkedIn: "Acme Corp hiring Senior Data Scientist in Boston, MA | LinkedIn"
  const hiring = t.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i);
  if (hiring) {
    company = hiring[1].trim();
    t = hiring[2].trim();
  }

  // Strip a trailing " | Site", " - Site", " at Site" suffix.
  const suffixes = [
    'LinkedIn', 'Indeed.com', 'Indeed', 'Glassdoor', 'ZipRecruiter', 'Dice.com', 'Dice',
    'Monster.com', 'Monster', 'SimplyHired', 'Wellfound', 'AngelList', 'Built In', 'Otta',
    'Greenhouse', 'Lever', 'Ashby', 'SmartRecruiters', 'Workable', 'Jobvite', 'Workday',
    'BambooHR', 'Recruitee', 'Teamtailor', 'Breezy HR', 'Job Application',
  ];
  if (sourceLabel && !suffixes.includes(sourceLabel)) suffixes.push(sourceLabel);

  for (const suffix of suffixes) {
    const re = new RegExp(`\\s*[|\\-–—·]\\s*${escapeRegex(suffix)}\\s*$`, 'i');
    if (re.test(t)) {
      t = t.replace(re, '').trim();
      break;
    }
  }

  // "Job Application for Senior Analyst at Acme" (Greenhouse's format)
  const ghMatch = t.match(/^Job Application for\s+(.+?)\s+at\s+(.+)$/i);
  if (ghMatch) {
    t = ghMatch[1].trim();
    company = company || ghMatch[2].trim();
  }

  // Trailing " at Acme" where we still have no company.
  if (!company) {
    const atMatch = t.match(/^(.+?)\s+at\s+([A-Z][\w&.,'\- ]{1,40})$/);
    if (atMatch) {
      t = atMatch[1].trim();
      company = atMatch[2].trim();
    }
  }

  // Aggregators that reliably use "Role - Company - Location" titles.
  // Scoped to those sources on purpose: applying a generic dash-split
  // everywhere would mangle legitimate titles like
  // "Senior Data Scientist - Search Ranking".
  const DASH_SEPARATED_SOURCES = new Set(['Indeed', 'Glassdoor', 'ZipRecruiter', 'SimplyHired']);
  if (!company && DASH_SEPARATED_SOURCES.has(sourceLabel)) {
    const parts = t.split(/\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      t = parts[0];
      company = parts[1];
    }
  }

  t = t.replace(/\s{2,}/g, ' ').replace(/[|\-–—·]\s*$/, '').trim();
  return { title: t || '(untitled)', company };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the stored record for a browser tab.
 * `content` is intentionally present and null — v2 (page-text capture) fills it
 * in without a storage migration.
 */
export function tabToJob(tab, now = new Date()) {
  const { site, isJob, source, fetchable } = detectSite(tab.url);
  const { title, company: titleCompany } = cleanTitle(tab.title, source);
  const urlCompany = inferCompany(tab.url, site);

  return {
    id: normalizeUrl(tab.url),
    url: tab.url,
    normalizedUrl: normalizeUrl(tab.url),
    title,
    rawTitle: tab.title || '',
    company: titleCompany || urlCompany || null,
    source,
    siteId: site ? site.id : null,
    isJob,
    fetchable,
    favIconUrl: tab.favIconUrl || null,
    savedAt: now.toISOString(),
    notes: '',
    content: null,
    contentCapturedAt: null,
  };
}
