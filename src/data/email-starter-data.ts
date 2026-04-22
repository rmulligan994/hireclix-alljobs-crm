import type { EmailCampaign, EmailTemplate, EmailEvent, SiteEmailOverride } from '@/types/email-types';
import { DEFAULT_COMPLIANCE_FOOTER, emailShell, ctaButton } from '@/lib/email/email-utils';

/** Set localStorage `email-module-seed-campaigns` = `1` to load sample campaigns (returning-user demo). */
export const MOCK_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'camp-1',
    site_id: 'site-1',
    subject: 'We\'re Hiring: Senior Engineers',
    html_body: '<h1>Join our team!</h1><p>We have exciting roles open.</p>',
    compose_kind: 'announcement_form',
    form_payload: {
      eyebrow: '',
      headline: 'We\'re Hiring!',
      subhead: 'Senior Engineer Roles',
      message: 'Join our growing engineering team.',
      messageRichHtml: null,
      useMessageRichHtml: false,
      previewText: 'Open roles on our engineering team',
      buttonLabel: 'View Roles',
      buttonUrl: 'https://careers.acme.com',
      signOff: 'Best, The Acme Team',
      blocks: [],
      useBlocks: false,
      complianceFooter: { ...DEFAULT_COMPLIANCE_FOOTER },
    },
    status: 'sent',
    recipient_source: { type: 'talent_pool', pool_id: 'pool-eng' },
    sent_at: '2025-03-15T10:30:00Z',
    created_by: 'user-1',
    created_at: '2025-03-14T09:00:00Z',
    open_rate: 42,
    pool_label: 'Engineering Candidates',
  },
  {
    id: 'camp-2',
    site_id: 'site-1',
    subject: 'Q2 Recruitment Drive',
    html_body: '<h1>Q2 Recruitment</h1>',
    compose_kind: 'raw_html',
    form_payload: null,
    status: 'draft',
    recipient_source: { type: 'ats', system: 'greenhouse', filter: { stage: 'Screen' } },
    sent_at: null,
    created_by: 'user-1',
    created_at: '2025-04-01T14:00:00Z',
    pool_label: 'Greenhouse · Screen',
  },
];

export const MOCK_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-1',
    site_id: 'site-1',
    name: 'Job Announcement',
    subject: 'New Role: {{jobTitle}}',
    html_body: '<h1>{{jobTitle}}</h1><p>Apply now at {{senderCompany}}</p>',
    kind: 'announcement_form',
    form_payload: { eyebrow: '', headline: '{{jobTitle}}', subhead: 'at {{senderCompany}}', message: 'We have an exciting new role for you.', messageRichHtml: null, useMessageRichHtml: false, previewText: '', buttonLabel: 'Apply Now', buttonUrl: '{{jobUrl}}', signOff: '', blocks: [], useBlocks: false, complianceFooter: { ...DEFAULT_COMPLIANCE_FOOTER } },
    source: 'manual',
    webflow_asset_refs: [],
    created_by: 'user-1',
    created_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-01-10T08:00:00Z',
  },
  {
    id: 'tpl-2',
    site_id: 'site-1',
    name: 'Event Invite',
    subject: 'You\'re Invited: Recruiting Event',
    html_body: '<h1>You\'re Invited</h1><p>Join us for our recruiting event.</p>',
    kind: 'raw_html',
    form_payload: null,
    source: 'ai_generated',
    webflow_asset_refs: [],
    created_by: 'user-1',
    created_at: '2025-02-20T12:00:00Z',
    updated_at: '2025-02-20T12:00:00Z',
  },
];

export const MOCK_EVENTS: EmailEvent[] = [
  { id: 'ev-1', site_id: 'site-1', email_type: 'campaign', recipient: 'alice@example.com', subject: 'We\'re Hiring: Senior Engineers', success: true, provider: 'mailgun', provider_message_id: 'mg-001', created_at: '2025-03-15T10:31:00Z' },
  { id: 'ev-2', site_id: 'site-1', email_type: 'campaign', recipient: 'bob@example.com', subject: 'We\'re Hiring: Senior Engineers', success: true, provider: 'mailgun', provider_message_id: 'mg-002', created_at: '2025-03-15T10:31:05Z' },
  { id: 'ev-3', site_id: 'site-1', email_type: 'campaign', recipient: 'carol@example.com', subject: 'We\'re Hiring: Senior Engineers', success: false, provider: 'mailgun', provider_message_id: 'mg-003', created_at: '2025-03-15T10:31:10Z' },
  { id: 'ev-4', site_id: 'site-1', email_type: 'notification', recipient: 'dave@example.com', subject: 'Access Approved', success: true, provider: 'ses', provider_message_id: 'ses-001', created_at: '2025-03-16T08:00:00Z' },
];

export const MOCK_OVERRIDES: SiteEmailOverride[] = [];

export const MOCK_TALENT_POOLS = [
  { id: 'pool-eng', name: 'Engineering Candidates', count: 142 },
  { id: 'pool-design', name: 'Design Candidates', count: 67 },
  { id: 'pool-pm', name: 'Product Managers', count: 38 },
  { id: 'pool-all', name: 'All Candidates', count: 523 },
];

/* ---- 1. Job Announcement ---- */
const jobAnnouncementHtml = emailShell(
  'New role open at {{senderCompany}} — {{jobTitle}}. Apply today!',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2563eb;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Now Hiring</td></tr>
</table>
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;color:#1a1a2e;font-weight:bold;">{{jobTitle}}</h1>
<p data-region="subheadline" style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#6b7280;">{{jobDepartment}} &bull; {{jobLocation}} &bull; {{jobType}}</p>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We have an exciting new opportunity at <strong>{{senderCompany}}</strong> that matches your background. We're looking for a <strong>{{jobTitle}}</strong> to join our {{jobDepartment}} team.</p>
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">If you're interested — or know someone who'd be a great fit — we'd love to hear from you.</p>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('View Role & Apply', '{{jobUrl}}')}
</td>
</tr>
<!-- Sign-off -->
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Best,<br/>The {{senderCompany}} Recruiting Team</p>
</td>
</tr>`
);

/* ---- 2. Event Invitation ---- */
const eventInvitationHtml = emailShell(
  'You\'re invited to {{event_name}} hosted by {{senderCompany}}.',
  `<!-- Hero Banner -->
<tr>
<td style="padding:40px;background-color:#2563eb;border-radius:8px 8px 0 0;text-align:center;" class="padding-mobile">
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">You're Invited</p>
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;color:#ffffff;font-weight:bold;">{{event_name}}</h1>
<p data-region="subheadline" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(255,255,255,0.85);">Hosted by {{senderCompany}}</p>
</td>
</tr>
<!-- Event Details -->
<tr>
<td data-region="body" style="padding:30px 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We'd love for you to join us at our upcoming event. Here are the details:</p>
</td>
</tr>
<!-- Details Box -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:6px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:6px;">DATE &amp; TIME</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;padding-bottom:14px;font-weight:bold;">Thursday, June 12, 2026 at 4:00 PM PT</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:6px;">LOCATION</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;padding-bottom:14px;font-weight:bold;">Virtual — link in calendar invite</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:6px;">FORMAT</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;font-weight:bold;">Live webinar + Q&amp;A</td></tr>
</table>
</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('RSVP Now', '{{rsvp_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">We hope to see you there!<br/>{{senderCompany}} Talent Team</p>
</td>
</tr>`
);

/* ---- 3. Candidate Newsletter ---- */
const candidateNewsletterHtml = emailShell(
  'Your monthly talent community update from {{senderCompany}}.',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:24px;color:#1a1a2e;">Talent Community Update</h1>
<p data-region="subheadline" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">Monthly talent roundup &bull; {{senderCompany}}</p>
</td>
</tr>
<!-- Intro -->
<tr>
<td data-region="body" style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Here's what's new at {{senderCompany}} this month — from open roles to company highlights.</p>
</td>
</tr>
<!-- Divider -->
<tr><td style="padding:0 40px;background-color:#ffffff;" class="padding-mobile"><table role="presentation" width="100%"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<!-- Section: Open Roles -->
<tr>
<td style="padding:20px 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2563eb;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Open Roles</p>
<h2 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:18px;color:#1a1a2e;">We're growing — join us!</h2>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;"><a href="{{role_1_url}}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2563eb;text-decoration:none;font-weight:bold;">{{role_1_title}}</a><br/><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">{{role_1_location}}</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;"><a href="{{role_2_url}}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2563eb;text-decoration:none;font-weight:bold;">{{role_2_title}}</a><br/><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">{{role_2_location}}</span></td></tr>
<tr><td style="padding:8px 0;"><a href="{{role_3_url}}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2563eb;text-decoration:none;font-weight:bold;">{{role_3_title}}</a><br/><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">{{role_3_location}}</span></td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:16px 40px 20px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('View All Openings', '{{careers_url}}')}
</td>
</tr>
<!-- Divider -->
<tr><td style="padding:0 40px;background-color:#ffffff;" class="padding-mobile"><table role="presentation" width="100%"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<!-- Section: Company News -->
<tr>
<td style="padding:20px 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2563eb;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Company News</p>
<h2 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:18px;color:#1a1a2e;">New office opening + product milestones</h2>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We opened a new hub and shipped features customers asked for most — read the recap on our blog.</p>
</td>
</tr>
<!-- Sign-off -->
<tr>
<td style="padding:20px 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Until next month,<br/>The {{senderCompany}} Talent Team</p>
</td>
</tr>`
);

/* ---- 4. Interview Confirmation ---- */
const interviewConfirmationHtml = emailShell(
  'Your interview with {{senderCompany}} is confirmed for {{interview_date}}.',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#059669;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">✓ Interview Confirmed</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:#1a1a2e;">Your Interview Details</h1>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Great news — your interview for <strong>{{jobTitle}}</strong> at {{senderCompany}} has been confirmed. Here's everything you need to know:</p>
</td>
</tr>
<!-- Details Card -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:4px;">DATE</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;padding-bottom:14px;font-weight:bold;">Wednesday, June 18, 2026</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:4px;">TIME</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;padding-bottom:14px;font-weight:bold;">2:00 PM PT (Pacific Time)</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:4px;">INTERVIEWER</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;padding-bottom:14px;font-weight:bold;">{{interviewer_name}}, {{interviewer_title}}</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:4px;">FORMAT</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;font-weight:bold;">Video call (link below)</td></tr>
</table>
</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Join / View Details', '{{interview_link}}', '#059669')}
</td>
</tr>
<!-- Prep Tips -->
<tr>
<td style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<h2 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a2e;">How to Prepare</h2>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">• Review the <a href="{{jobUrl}}" style="color:#2563eb;text-decoration:underline;">role description</a></td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">• Test your video / audio setup beforehand</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">• Prepare 2–3 questions for your interviewer</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">• Have a copy of your résumé handy</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Need to reschedule? <a href="{{reschedule_url}}" style="color:#2563eb;text-decoration:underline;">Let us know</a>.<br/>Good luck!<br/>{{senderCompany}} Recruiting</p>
</td>
</tr>`
);

/* ---- 5. Referral Request ---- */
const referralRequestHtml = emailShell(
  '{{senderCompany}} is hiring — know someone great? Refer them today!',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:#1a1a2e;">Know Someone Amazing?</h1>
<p data-region="subheadline" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">Help us grow our team — and earn a referral bonus.</p>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Great people know great people. We're expanding our <strong>{{jobDepartment}}</strong> team and would love your help finding the right talent.</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">If you know someone who'd thrive in the <strong>{{jobTitle}}</strong> role, send them our way. Successful referrals may qualify for a <strong>referral bonus</strong> (details in your employee handbook).</p>
</td>
</tr>
<!-- How it works -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:6px;">
<tr><td style="padding:20px 24px;">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a2e;font-weight:bold;">How it works</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">1. Click the button below to submit a referral</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">2. We'll reach out to your referral directly</td></tr>
<tr><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">3. If hired, you receive your bonus after 90 days</td></tr>
</table>
</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Submit a Referral', '{{referral_url}}', '#7c3aed')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Thanks for helping us grow!<br/>{{senderCompany}} People Team</p>
</td>
</tr>`
);

/* ---- 6. Talent Pool Re-engagement ---- */
const reEngagementHtml = emailShell(
  'New opportunities at {{senderCompany}} — we\'d love to reconnect!',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:#1a1a2e;">We'd Love to Reconnect</h1>
<p data-region="subheadline" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">New opportunities are waiting at {{senderCompany}}</p>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">It's been a while since we last connected, and a lot has changed at <strong>{{senderCompany}}</strong>. We've been growing, launching new initiatives, and opening exciting roles — and we think you might be a great fit.</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Here are a few highlights:</p>
</td>
</tr>
<!-- Highlights -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding:12px 16px;background-color:#eff6ff;border-radius:6px;margin-bottom:8px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2563eb;font-weight:bold;">🚀 New product launch</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">We shipped a major release customers have been asking for — more on the blog.</p>
</td>
</tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;">
<tr>
<td style="padding:12px 16px;background-color:#eff6ff;border-radius:6px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2563eb;font-weight:bold;">📈 Team growth</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">We’re hiring across engineering and design — refer a friend or explore open roles.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We'd love to catch up and explore whether there's a mutual fit. No pressure — just a conversation.</p>
${ctaButton('Explore Opportunities', '{{careers_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Looking forward to hearing from you,<br/>{{senderCompany}} Talent Team</p>
</td>
</tr>`
);

/* ---- 7. Welcome to Talent Community ---- */
const talentCommunityWelcomeHtml = emailShell(
  'Welcome to the {{senderCompany}} talent community!',
  `<!-- Hero Banner -->
<tr>
<td style="padding:0;border-radius:8px 8px 0 0;overflow:hidden;">
<img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=250&fit=crop" alt="Team collaboration" width="600" style="display:block;width:100%;height:auto;border:0;" class="fluid" />
</td>
</tr>
<tr>
<td style="padding:30px 40px 10px;background-color:#ffffff;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;color:#1a1a2e;font-weight:bold;">Welcome to Our Talent Community!</h1>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Thanks for joining the <strong>{{senderCompany}}</strong> talent community. You'll be the first to hear about new roles, events, and what it's like to work with us.</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">In the meantime, here's what you can explore:</p>
</td>
</tr>
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">🏢 <a href="{{careers_url}}" style="color:#2563eb;text-decoration:underline;">Browse open positions</a></td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">🎥 <a href="{{culture_url}}" style="color:#2563eb;text-decoration:underline;">Watch our culture video</a></td></tr>
<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">📝 <a href="{{blog_url}}" style="color:#2563eb;text-decoration:underline;">Read our engineering blog</a></td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Explore Careers', '{{careers_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">We're glad you're here,<br/>The {{senderCompany}} Talent Team</p>
</td>
</tr>`
);

/* ---- 8. Hiring Manager Introduction ---- */
const hiringManagerIntroHtml = emailShell(
  'Meet your potential future manager at {{senderCompany}}.',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2563eb;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Meet the Team</p>
<h1 data-region="headline" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:#1a1a2e;">A Note from Your Potential Manager</h1>
</td>
</tr>
<!-- Manager Card -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;">
<tr>
<td style="padding:20px 24px;" width="80" valign="top">
<img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face" alt="{{manager_name}}" width="64" height="64" style="border-radius:50%;display:block;" />
</td>
<td style="padding:20px 24px 20px 0;" valign="top">
<p style="margin:0 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a2e;font-weight:bold;">{{manager_name}}</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">{{manager_title}} · {{senderCompany}}</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">I'm {{manager_name}}, and I lead the {{jobDepartment}} team at {{senderCompany}}. I wanted to personally reach out because your background caught my attention.</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We're building something exciting and I'd love to share more about the role and our team's mission. Would you be open to a quick conversation?</p>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Schedule a Chat', '{{calendar_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Looking forward to connecting,<br/>{{manager_name}}</p>
</td>
</tr>`
);

/* ---- 9. Culture Spotlight ---- */
const cultureSpotlightHtml = emailShell(
  'See what it\'s like to work at {{senderCompany}}.',
  `<!-- Hero Image -->
<tr>
<td style="padding:0;border-radius:8px 8px 0 0;overflow:hidden;">
<img src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&h=280&fit=crop" alt="Team at work" width="600" style="display:block;width:100%;height:auto;border:0;" class="fluid" />
</td>
</tr>
<tr>
<td style="padding:30px 40px 10px;background-color:#ffffff;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;color:#1a1a2e;">Life at {{senderCompany}}</h1>
<p data-region="subheadline" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">A peek behind the scenes</p>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We believe great work happens when people feel valued, supported, and inspired. Here's a glimpse of what makes {{senderCompany}} a great place to build your career.</p>
</td>
</tr>
<!-- Team Photo -->
<tr>
<td style="padding:0 40px 16px;background-color:#ffffff;" class="padding-mobile">
<img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=520&h=260&fit=crop" alt="Team collaboration" width="520" style="display:block;max-width:100%;height:auto;border:0;border-radius:6px;" class="fluid" />
</td>
</tr>
<!-- Values -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:10px 16px;background:#eff6ff;border-radius:6px;margin-bottom:8px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2563eb;font-weight:bold;">🌱 Growth & Development</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">Learning stipends, mentorship programs, and career pathing for every role.</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;">
<tr><td style="padding:10px 16px;background:#f0fdf4;border-radius:6px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#059669;font-weight:bold;">🤝 Flexibility & Trust</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">Remote-first culture with flexible hours and unlimited PTO.</p>
</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Explore Our Culture', '{{culture_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">We'd love for you to be part of our story,<br/>{{senderCompany}} People Team</p>
</td>
</tr>`
);

/* ---- 10. Diversity & Inclusion Event ---- */
const deiEventHtml = emailShell(
  'Join us for {{event_name}} — a {{senderCompany}} D&I event.',
  `<!-- Hero Banner -->
<tr>
<td style="padding:0;border-radius:8px 8px 0 0;overflow:hidden;background:#7c3aed;">
<img src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=240&fit=crop" alt="Diversity event" width="600" style="display:block;width:100%;height:auto;border:0;opacity:0.85;" class="fluid" />
</td>
</tr>
<tr>
<td style="padding:30px 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7c3aed;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">D&I Event</p>
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:#1a1a2e;">{{event_name}}</h1>
<p data-region="subheadline" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">Hosted by {{senderCompany}}</p>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We're committed to building a workplace where everyone belongs. Join us for <strong>{{event_name}}</strong> to hear from leaders, share perspectives, and connect with our community.</p>
</td>
</tr>
<!-- Event Details -->
<tr>
<td style="padding:0 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#faf5ff;border:1px solid #e9d5ff;border-radius:6px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:4px;">DATE & TIME</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;padding-bottom:14px;font-weight:bold;">Tuesday, Sept 9, 2026 at 12:00 PM PT</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding-bottom:4px;">LOCATION</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;font-weight:bold;">HQ Auditorium + live stream</td></tr>
</table>
</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Register Now', '{{rsvp_url}}', '#7c3aed')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Together we're stronger,<br/>{{senderCompany}} D&I Team</p>
</td>
</tr>`
);

/* ---- 11. Passive Candidate Outreach ---- */
const passiveOutreachHtml = emailShell(
  '{{senderCompany}} — we think you\'d be a great fit.',
  `<!-- Logo Header -->
<tr>
<td style="padding:30px 40px 20px;background-color:#ffffff;border-radius:8px 8px 0 0;text-align:center;" class="padding-mobile">
<img src="https://placehold.co/180x45/2563eb/ffffff/png?text=Your+logo" alt="{{senderCompany}}" width="180" style="display:inline-block;max-height:45px;" />
</td>
</tr>
<tr>
<td style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<h1 data-region="headline" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#1a1a2e;text-align:center;">We'd Love to Connect</h1>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">I came across your profile and was impressed by your experience in <strong>{{skill_area}}</strong>. At <strong>{{senderCompany}}</strong>, we're solving interesting problems and building a team of exceptional people.</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">I'm not reaching out about a specific role — I'd simply love to start a conversation about what you're looking for in your career and whether {{senderCompany}} might be a fit down the road.</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">No pressure, no strings attached. Just a quick chat over coffee (virtual or in-person).</p>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('Let\'s Connect', '{{calendar_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Best,<br/>{{senderName}}<br/>{{senderTitle}}, {{senderCompany}}</p>
</td>
</tr>`
);

/* ---- 12. Employee Spotlight / Testimonial ---- */
const employeeSpotlightHtml = emailShell(
  'Hear from {{employee_name}} about life at {{senderCompany}}.',
  `<!-- Header -->
<tr>
<td style="padding:30px 40px 10px;background-color:#ffffff;border-radius:8px 8px 0 0;" class="padding-mobile">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2563eb;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Employee Spotlight</p>
<h1 data-region="headline" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:#1a1a2e;">Meet {{employee_name}}</h1>
<p data-region="subheadline" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">{{employee_title}} at {{senderCompany}}</p>
</td>
</tr>
<!-- Employee Photo -->
<tr>
<td style="padding:16px 40px;background-color:#ffffff;" class="padding-mobile">
<img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=520&h=300&fit=crop" alt="{{employee_name}}" width="520" style="display:block;max-width:100%;height:auto;border:0;border-radius:8px;" class="fluid" />
</td>
</tr>
<!-- Quote -->
<tr>
<td style="padding:10px 40px 20px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:4px solid #2563eb;background:#f8fafc;border-radius:0 6px 6px 0;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 8px;font-family:Georgia,serif;font-size:16px;line-height:26px;color:#374151;font-style:italic;">&ldquo;I get real ownership here — leadership trusts the team to ship and learn fast.&rdquo;</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">— {{employee_name}}, {{employee_title}}</p>
</td></tr>
</table>
</td>
</tr>
<tr>
<td data-region="body" style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">Hi {{fullName}},</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">We wanted to share {{employee_name}}'s story with you. At {{senderCompany}}, every person brings a unique perspective that makes our team stronger. Interested in writing your own story here?</p>
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;" class="padding-mobile">
${ctaButton('See Open Roles', '{{careers_url}}')}
</td>
</tr>
<tr>
<td style="padding:0 40px 30px;background-color:#ffffff;border-radius:0 0 8px 8px;" class="padding-mobile">
<p data-region="signoff" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#6b7280;">We'd love to meet you,<br/>{{senderCompany}} Talent Team</p>
</td>
</tr>`
);

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  category: 'Sourcing' | 'Scheduling' | 'Engagement' | 'Referrals';
  html: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: 'starter-1', name: 'Job Announcement', description: 'Announce a new open role with title, team, location, and Apply CTA.', subject: 'Now Hiring: {{jobTitle}} at {{senderCompany}}', category: 'Sourcing', html: jobAnnouncementHtml },
  { id: 'starter-2', name: 'Event Invitation', description: 'Invite candidates to a career fair, webinar, or recruiting event.', subject: 'You\'re Invited: {{event_name}} — {{senderCompany}}', category: 'Engagement', html: eventInvitationHtml },
  { id: 'starter-3', name: 'Candidate Newsletter', description: 'Monthly talent community update with open roles and company news.', subject: '{{senderCompany}} Talent Update', category: 'Engagement', html: candidateNewsletterHtml },
  { id: 'starter-4', name: 'Interview Confirmation', description: 'Confirm interview details with date, time, interviewer, and prep tips.', subject: 'Interview Confirmed: {{jobTitle}} — please review details inside', category: 'Scheduling', html: interviewConfirmationHtml },
  { id: 'starter-5', name: 'Referral Request', description: 'Ask your network to refer great candidates with referral bonus info.', subject: 'Know Someone Great? Refer Them to {{senderCompany}}', category: 'Referrals', html: referralRequestHtml },
  { id: 'starter-6', name: 'Talent Pool Re-engagement', description: 'Re-engage cold candidates with new opportunities and company highlights.', subject: 'New Opportunities at {{senderCompany}} — Let\'s Reconnect', category: 'Engagement', html: reEngagementHtml },
  { id: 'starter-7', name: 'Welcome to Talent Community', description: 'Welcome new members to your talent community with links and resources.', subject: 'Welcome to the {{senderCompany}} Talent Community!', category: 'Engagement', html: talentCommunityWelcomeHtml },
  { id: 'starter-8', name: 'Hiring Manager Introduction', description: 'Personal outreach from a hiring manager with headshot and calendar link.', subject: 'A Note from {{manager_name}} at {{senderCompany}}', category: 'Sourcing', html: hiringManagerIntroHtml },
  { id: 'starter-9', name: 'Culture Spotlight', description: 'Showcase your company culture with photos, values, and team highlights.', subject: 'Life at {{senderCompany}} — See What We\'re About', category: 'Engagement', html: cultureSpotlightHtml },
  { id: 'starter-10', name: 'D&I Event Invitation', description: 'Promote a diversity & inclusion event with details and registration.', subject: 'Join Us: {{event_name}} — {{senderCompany}}', category: 'Engagement', html: deiEventHtml },
  { id: 'starter-11', name: 'Passive Candidate Outreach', description: 'Warm outreach to passive candidates — no specific role, just a conversation.', subject: 'Hi {{fullName}} — Let\'s Connect', category: 'Sourcing', html: passiveOutreachHtml },
  { id: 'starter-12', name: 'Employee Spotlight', description: 'Share an employee testimonial with photo and quote to attract talent.', subject: 'Meet {{employee_name}} — Life at {{senderCompany}}', category: 'Engagement', html: employeeSpotlightHtml },
];
