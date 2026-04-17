/**
 * Merge tag palette for the HTML email builder (keys without braces).
 * Aligned with supabase/functions/send-campaign-email replaceMergeTags + legacy aliases.
 */

export type MergeTagCategory = 'Candidate' | 'Job' | 'Sender' | 'Campaign' | 'System';

export interface MergeTagDefinition {
  key: string;
  label: string;
  category: MergeTagCategory;
}

export const MERGE_TAG_CATALOG: MergeTagDefinition[] = [
  { key: 'firstName', label: 'First name', category: 'Candidate' },
  { key: 'lastName', label: 'Last name', category: 'Candidate' },
  { key: 'fullName', label: 'Full name', category: 'Candidate' },
  { key: 'email', label: 'Email', category: 'Candidate' },
  { key: 'company', label: 'Company', category: 'Candidate' },
  { key: 'title', label: 'Title', category: 'Candidate' },
  { key: 'skills', label: 'Skills', category: 'Candidate' },
  { key: 'location', label: 'Location', category: 'Candidate' },
  { key: 'source', label: 'Source', category: 'Candidate' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', category: 'Candidate' },
  { key: 'jobTitle', label: 'Job title', category: 'Job' },
  { key: 'jobDepartment', label: 'Job department', category: 'Job' },
  { key: 'jobLocation', label: 'Job location', category: 'Job' },
  { key: 'jobType', label: 'Job type', category: 'Job' },
  { key: 'jobDescription', label: 'Job description', category: 'Job' },
  { key: 'jobUrl', label: 'Job URL', category: 'Job' },
  { key: 'senderName', label: 'Sender name', category: 'Sender' },
  { key: 'senderTitle', label: 'Sender title', category: 'Sender' },
  { key: 'senderCompany', label: 'Sender company', category: 'Sender' },
  { key: 'senderBrand', label: 'Sender brand', category: 'Sender' },
  { key: 'senderEmail', label: 'Sender email', category: 'Sender' },
  { key: 'senderLinkedinUrl', label: 'Sender LinkedIn', category: 'Sender' },
  { key: 'campaignName', label: 'Campaign name', category: 'Campaign' },
  { key: 'currentDate', label: 'Current date', category: 'Campaign' },
  { key: 'currentTime', label: 'Current time', category: 'Campaign' },
  { key: 'unsubscribeLink', label: 'Unsubscribe link', category: 'System' },
  { key: 'viewInBrowserLink', label: 'View in browser', category: 'System' },
];

export function buildUniversalMergeTagKeys(htmlBody: string, extraKeys: string[]): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const fromHtml = new Set<string>();
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, 'g');
  while ((m = r.exec(htmlBody)) !== null) fromHtml.add(m[1]);

  const catalog = MERGE_TAG_CATALOG.map(t => t.key);
  return [...new Set([...catalog, ...fromHtml, ...extraKeys])].sort((a, b) => a.localeCompare(b));
}
