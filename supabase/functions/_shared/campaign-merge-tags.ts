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

  return {
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
  };
}

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
