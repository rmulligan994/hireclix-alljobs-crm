export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  type: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  goal?: string;
  audience_filter?: AudienceFilter;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignEmail {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  bee_json?: Record<string, unknown>;
  html_content?: string;
  email_template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  candidate_id: string;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'responded' | 'bounced' | 'complained' | 'unsubscribed' | 'failed' | 'rejected';
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  responded_at?: string;
  created_at: string;
}

export interface AudienceFilter {
  talentPoolIds?: string[];
  pipelineIds?: string[];
  pipelineStages?: string[];
  tags?: string[];
  locations?: string[];
  sources?: string[];
}

export interface CreateCampaignInput {
  name: string;
  type?: string;
  goal?: string;
  audience_filter?: AudienceFilter;
  scheduled_at?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  type?: string;
  status?: Campaign['status'];
  goal?: string;
  audience_filter?: AudienceFilter;
  scheduled_at?: string;
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
