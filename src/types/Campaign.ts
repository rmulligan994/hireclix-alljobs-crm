export interface ScheduleRecurrence {
  type: 'daily' | 'weekly' | 'monthly' | 'custom' | 'specific_dates';
  dayOfWeek?: number; // 0=Sun, 1=Mon, ...
  dayOfMonth?: number; // 1-31
  time?: string; // "09:00"
  endOnDate?: string; // YYYY-MM-DD - automatic end date for daily/weekly/monthly
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  type: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  /** DB uses null for empty */
  goal?: string | null;
  audience_filter?: AudienceFilter;
  scheduled_at?: string | null;
  schedule_recurrence?: ScheduleRecurrence | null;
  job_id?: string | null;
  folder_id?: string | null;
  is_organization_campaign?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignFolder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface ScheduledEmail {
  id: string;
  campaign_id: string;
  campaign_email_id: string;
  campaign_recipient_id: string;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface CampaignEmail {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  bee_json?: Record<string, unknown>;
  html_content?: string | null;
  email_template_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  candidate_id: string;
  status: 'pending' | 'scheduled' | 'sent' | 'opened' | 'clicked' | 'responded' | 'bounced' | 'complained' | 'unsubscribed' | 'failed' | 'rejected';
  message_id?: string | null;
  sent_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  responded_at?: string | null;
  created_at: string;
}

export type LeadStatus = "red" | "yellow" | "green";

export interface AudienceFilter {
  talentPoolIds?: string[];
  pipelineIds?: string[];
  pipelineStages?: string[];
  tags?: string[];
  locations?: string[];
  sources?: string[];
  leadStatus?: LeadStatus[];
}

export interface CreateCampaignInput {
  name: string;
  type?: string;
  goal?: string;
  audience_filter?: AudienceFilter;
  scheduled_at?: string;
  schedule_recurrence?: ScheduleRecurrence | null;
  job_id?: string | null;
  folder_id?: string | null;
  is_organization_campaign?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  type?: string;
  status?: Campaign['status'];
  goal?: string;
  audience_filter?: AudienceFilter;
  scheduled_at?: string;
  schedule_recurrence?: ScheduleRecurrence | null;
  job_id?: string | null;
  folder_id?: string | null;
  is_organization_campaign?: boolean;
  archived_at?: string | null;
}

export interface CreateCampaignEmailInput {
  campaign_id: string;
  step_order: number;
  delay_days?: number;
  delay_hours?: number;
  subject: string;
  bee_json?: Record<string, unknown>;
  html_content?: string;
  email_template_id?: string;
}

export interface UpdateCampaignEmailInput {
  step_order?: number;
  delay_days?: number;
  delay_hours?: number;
  subject?: string;
  bee_json?: Record<string, unknown>;
  html_content?: string;
  email_template_id?: string;
}
