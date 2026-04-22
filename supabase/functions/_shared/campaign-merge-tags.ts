/**
 * Campaign email merge tags — shared by send-campaign-email and send-campaign-test-email.
 * Uses the same {{ token }} syntax as the app preview (optional whitespace inside braces).
 */

export interface MergeContextCandidate {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  source?: string | null;
  tags?: string[] | string | null;
  linkedin_url?: string | null;
}

export interface MergeContext {
  candidate: MergeContextCandidate;
  campaign: { name?: string | null };
  sender: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    company?: string | null;
    title?: string | null;
    linkedin_url?: string | null;
  };
  org: { company_name?: string | null; brand_name?: string | null; base_url?: string | null };
  job: {
    title?: string | null;
    department?: string | null;
    location?: string | null;
    type?: string | null;
    description?: string | null;
    url?: string | null;
    view_url?: string | null;
  } | null;
  recipientId: string;
  baseUrl: string;
  /** "r" = campaign_recipient id (default); "c" = candidate id for welcome / transactional links */
  unsubscribeRecipientParam?: "r" | "c";
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function buildMergeValueMap(ctx: MergeContext): Record<string, string> {
  const { candidate, campaign, sender, org, job, recipientId, baseUrl, unsubscribeRecipientParam } = ctx;
  const unsubParam = unsubscribeRecipientParam ?? "r";
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "";
  const skills = Array.isArray(candidate.tags) ? candidate.tags.join(", ") : String(candidate.tags || "");
  const senderName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "";
  const senderCompany = org.company_name || sender.company || "";
  const unsubscribeLink = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/unsubscribe?${unsubParam}=${recipientId}`
    : "#";
  const jobUrl = job?.url || job?.view_url || "";
  const baseNorm = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  const orgBase = org.base_url ? org.base_url.replace(/\/$/, "") : "";
  const siteBase = baseNorm || orgBase;

  const map: Record<string, string> = {
    firstName: candidate.first_name || "",
    lastName: candidate.last_name || "",
    fullName,
    email: candidate.email || "",
    company: candidate.company || "",
    title: candidate.title || "",
    skills,
    location: candidate.location || "",
    source: candidate.source || "",
    linkedinUrl: candidate.linkedin_url || "",
    campaignName: campaign.name || "",
    currentDate: new Date().toLocaleDateString(),
    currentTime: new Date().toLocaleTimeString(),
    senderName,
    senderTitle: sender.title || "",
    senderCompany,
    senderBrand: org.brand_name || "",
    senderEmail: sender.email || "",
    senderLinkedinUrl: sender.linkedin_url || "",
    jobTitle: job?.title || "",
    jobDepartment: job?.department || "",
    jobLocation: job?.location || "",
    jobType: job?.type || "",
    jobDescription: job?.description || "",
    jobUrl,
    unsubscribeLink,
    viewInBrowserLink: "#",
    company_name: senderCompany,
    member_name: fullName,
    job_title: job?.title || "",
    apply_url: jobUrl,
    unsubscribe_url: unsubscribeLink,
    recruiter_name: senderName,
    recruiter_email: sender.email || "",
    recruiter_title: sender.title || "",
    site_name: senderCompany,
    // Snake_case / starter aliases → real CRM fields
    department: job?.department || "",
    employment_type: job?.type || "",
    job_url: jobUrl,
    linkedin_url: candidate.linkedin_url || "",
    // Sensible fallbacks from org base URL (starters may reference these paths)
    careers_url: siteBase ? `${siteBase}/careers` : "",
    culture_url: siteBase ? `${siteBase}/culture` : "",
    blog_url: siteBase ? `${siteBase}/blog` : "",
    // Tokens used in starter HTML with no campaign metadata — replaced at send so they are not "unknown"
    event_name: campaign.name || "",
    event_date: "",
    event_time: "",
    event_location: "",
    event_format: "",
    rsvp_url: jobUrl,
    newsletter_month: "",
    newsletter_year: "",
    news_headline: "",
    news_summary: "",
    role_1_title: job?.title || "",
    role_1_location: job?.location || "",
    role_1_url: jobUrl,
    role_2_title: "",
    role_2_location: "",
    role_2_url: "",
    role_3_title: "",
    role_3_location: "",
    role_3_url: "",
    interview_date: "",
    interview_time: "",
    timezone: "",
    interviewer_name: senderName,
    interviewer_title: sender.title || "",
    interview_format: "",
    interview_link: jobUrl,
    reschedule_url: siteBase ? `${siteBase}/contact` : "",
    referral_bonus: "",
    referral_url: jobUrl,
    highlight_1_title: "",
    highlight_1_description: "",
    highlight_2_title: "",
    highlight_2_description: "",
    manager_name: senderName,
    manager_title: sender.title || "",
    calendar_url: siteBase ? `${siteBase}/contact` : "",
    employee_name: fullName,
    employee_title: candidate.title || "",
    employee_quote: "",
    skill_area: skills,
    interview_location: job?.location || "",
    event_url: jobUrl,
    event_name_short: campaign.name || "",
  };

  return map;
}

/**
 * Every key the send pipeline may substitute. Keep in sync with app
 * `src/lib/email/merge-context-replacement-keys.ts` for launch validation.
 */
export const MERGE_CONTEXT_REPLACEMENT_KEYS: readonly string[] = [
  "apply_url",
  "blog_url",
  "calendar_url",
  "campaignName",
  "careers_url",
  "company",
  "company_name",
  "culture_url",
  "currentDate",
  "currentTime",
  "department",
  "email",
  "employee_name",
  "employee_quote",
  "employee_title",
  "employment_type",
  "event_date",
  "event_format",
  "event_location",
  "event_name",
  "event_name_short",
  "event_time",
  "event_url",
  "firstName",
  "fullName",
  "highlight_1_description",
  "highlight_1_title",
  "highlight_2_description",
  "highlight_2_title",
  "interview_date",
  "interview_format",
  "interview_link",
  "interview_location",
  "interview_time",
  "interviewer_name",
  "interviewer_title",
  "jobDescription",
  "jobDepartment",
  "jobLocation",
  "jobTitle",
  "jobType",
  "jobUrl",
  "job_title",
  "job_url",
  "lastName",
  "linkedinUrl",
  "linkedin_url",
  "location",
  "manager_name",
  "manager_title",
  "member_name",
  "news_headline",
  "news_summary",
  "newsletter_month",
  "newsletter_year",
  "recruiter_email",
  "recruiter_name",
  "recruiter_title",
  "referral_bonus",
  "referral_url",
  "reschedule_url",
  "role_1_location",
  "role_1_title",
  "role_1_url",
  "role_2_location",
  "role_2_title",
  "role_2_url",
  "role_3_location",
  "role_3_title",
  "role_3_url",
  "rsvp_url",
  "senderBrand",
  "senderCompany",
  "senderEmail",
  "senderLinkedinUrl",
  "senderName",
  "senderTitle",
  "site_name",
  "skill_area",
  "skills",
  "source",
  "timezone",
  "title",
  "unsubscribeLink",
  "unsubscribe_url",
  "viewInBrowserLink",
];

export function replaceMergeTags(content: string, ctx: MergeContext): string {
  const map = buildMergeValueMap(ctx);
  return content.replace(TOKEN_RE, (full, key: string) => (key in map ? map[key]! : full));
}

/** Any remaining `{{name}}` tokens after replacement (unknown keys or typos). */
export function listUnreplacedMergeTags(subject: string, html: string): string[] {
  const keys = new Set<string>();
  for (const chunk of [subject, html]) {
    const re = new RegExp(TOKEN_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) keys.add(m[1]);
  }
  return [...keys].sort();
}

export function assertFullyResolvedMergeTags(
  subject: string,
  html: string,
): { ok: true } | { ok: false; keys: string[] } {
  const keys = listUnreplacedMergeTags(subject, html);
  if (keys.length === 0) return { ok: true };
  return { ok: false, keys };
}
