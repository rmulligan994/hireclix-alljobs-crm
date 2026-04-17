// === Database-aligned types for Email Campaign & Automation Module ===

export type ComposeKind = 'raw_html' | 'announcement_form';
export type CampaignStatus = 'draft' | 'sent';
export type RecipientStatus = 'queued' | 'sent' | 'failed' | 'skipped';
export type TemplateSource = 'manual' | 'form' | 'ai_generated';
export type BodyMode = 'default_react' | 'html_fragment';
export type EmailProvider = 'mailgun' | 'ses' | 'sendgrid' | 'postmark';

export type EmailKey =
  | 'access_approved'
  | 'access_denied'
  | 'access_needs_info'
  | 'access_request_received'
  | 'access_request_owner_notify'
  | 'member_password_reset';

export interface RecipientSource {
  type: 'talent_pool' | 'ats' | 'csv' | 'all_members';
  pool_id?: string;
  system?: string;
  filter?: Record<string, unknown>;
}

// === Content Block types ===

export interface HeadingBlock {
  type: 'heading';
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export interface TextBlock {
  type: 'text';
  id: string;
  content: string;
}

export interface ImageBlock {
  type: 'image';
  id: string;
  url: string;
  alt: string;
  width?: number;
  webflowAssetId?: string;
}

export interface ButtonBlock {
  type: 'button';
  id: string;
  label: string;
  url: string;
}

export interface DividerBlock {
  type: 'divider';
  id: string;
}

export interface SpacerBlock {
  type: 'spacer';
  id: string;
  height: number;
}

export type ContentBlock = HeadingBlock | TextBlock | ImageBlock | ButtonBlock | DividerBlock | SpacerBlock;

export interface AnnouncementForm {
  /** Small label / kicker above headline in designed templates */
  eyebrow: string;
  headline: string;
  subhead: string;
  message: string;
  /**
   * Sanitized inner HTML snapshot of `[data-region="body"]` from import (lists, basic inline).
   * When `useMessageRichHtml` is true and this is non-empty, preview prefers this over plain `message`.
   */
  messageRichHtml: string | null;
  useMessageRichHtml: boolean;
  /** Inbox preview line (preheader) */
  previewText: string;
  buttonLabel: string;
  buttonUrl: string;
  signOff: string;
  // Dynamic block system
  blocks: ContentBlock[];
  useBlocks: boolean;
}

export interface EmailCampaign {
  id: string;
  site_id: string;
  subject: string;
  html_body: string;
  compose_kind: ComposeKind;
  form_payload: AnnouncementForm | null;
  status: CampaignStatus;
  recipient_source: RecipientSource;
  sent_at: string | null;
  created_by: string;
  created_at: string;
  /** 0–100 for sent campaigns (UI / mock) */
  open_rate?: number;
  /** Resolved pool / source label for tables */
  pool_label?: string;
}

export interface EmailTemplate {
  id: string;
  site_id: string;
  name: string;
  subject: string;
  html_body: string;
  kind: ComposeKind;
  form_payload: AnnouncementForm | null;
  source: TemplateSource;
  webflow_asset_refs: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name: string;
  status: RecipientStatus;
  ats_source: string | null;
  created_at: string;
}

export interface EmailEvent {
  id: string;
  site_id: string;
  email_type: string;
  recipient: string;
  subject: string;
  success: boolean;
  provider: EmailProvider;
  provider_message_id: string;
  created_at: string;
}

export interface SiteEmailOverride {
  id: string;
  site_id: string;
  email_key: EmailKey;
  subject_template: string;
  body_mode: BodyMode;
  html_fragment: string;
}

export interface EmailProviderConfig {
  id: string;
  site_id: string;
  provider: EmailProvider;
  config: Record<string, string>;
  is_active: boolean;
}

// Merge tag definition
export interface MergeTag {
  tag: string;
  label: string;
  sample: string;
}

export const MERGE_TAGS: MergeTag[] = [
  { tag: '{{member_name}}', label: 'Member Name', sample: 'Jane Doe' },
  { tag: '{{site_name}}', label: 'Site Name', sample: 'Acme Corp' },
  { tag: '{{unsubscribe_url}}', label: 'Unsubscribe URL', sample: '#unsubscribe' },
  { tag: '{{job_title}}', label: 'Job Title', sample: 'Software Engineer' },
  { tag: '{{company_name}}', label: 'Company Name', sample: 'Acme Corp' },
  { tag: '{{apply_url}}', label: 'Apply URL', sample: '#apply' },
];

export const EMAIL_KEY_LABELS: Record<EmailKey, string> = {
  access_approved: 'Access Approved',
  access_denied: 'Access Denied',
  access_needs_info: 'More Info Needed',
  access_request_received: 'Request Received',
  access_request_owner_notify: 'New Request to Owner',
  member_password_reset: 'Member Password Reset',
};

export const EMAIL_KEY_MERGE_HINTS: Record<EmailKey, string[]> = {
  access_approved: ['{{member_name}}', '{{site_name}}'],
  access_denied: ['{{member_name}}', '{{site_name}}'],
  access_needs_info: ['{{member_name}}', '{{site_name}}'],
  access_request_received: ['{{member_name}}', '{{site_name}}'],
  access_request_owner_notify: ['{{member_name}}', '{{site_name}}'],
  member_password_reset: ['{{member_name}}', '{{site_name}}'],
};

// Brand settings for email customization
export interface BrandSettings {
  /** When false, previews use default blue / neutrals */
  useBrandColors: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl: string;
  companyName: string;
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  useBrandColors: false,
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  fontFamily: 'Arial, Helvetica, sans-serif',
  logoUrl: '',
  companyName: 'Your Company',
};

/** Web-safe fonts shown in Settings (email-safe) */
export const SETTINGS_EMAIL_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, Times, serif',
  'Verdana, Geneva, sans-serif',
  'Trebuchet MS, Helvetica, sans-serif',
] as const;

export const EMAIL_SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Helvetica, Arial, sans-serif',
  'Georgia, Times, serif',
  'Verdana, Geneva, sans-serif',
  'Trebuchet MS, Helvetica, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Lucida Sans, Lucida Grande, sans-serif',
  'Palatino Linotype, Book Antiqua, serif',
];
