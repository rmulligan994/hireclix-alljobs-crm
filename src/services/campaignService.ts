import { supabase } from '@/integrations/supabase/client';
import type { 
  Campaign, 
  CampaignEmail, 
  CampaignRecipient,
  CreateCampaignInput, 
  UpdateCampaignInput,
  CreateCampaignEmailInput,
  UpdateCampaignEmailInput,
  AudienceFilter
} from '@/types/Campaign';
import type { Json } from '@/integrations/supabase/types';

// Helper to convert AudienceFilter to Json
const audienceFilterToJson = (filter?: AudienceFilter): Json => {
  if (!filter) return {};
  return filter as unknown as Json;
};

// Helper to convert Json to AudienceFilter
const jsonToAudienceFilter = (json: Json): AudienceFilter => {
  if (!json || typeof json !== 'object') return {};
  return json as unknown as AudienceFilter;
};

export const campaignService = {
  // Campaign CRUD
  async getAll(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      status: c.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(c.audience_filter)
    }));
  },

  async getById(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? {
      ...data,
      status: data.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(data.audience_filter)
    } : null;
  },

  async create(input: CreateCampaignInput): Promise<Campaign> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: input.name,
        type: input.type || 'email',
        goal: input.goal,
        audience_filter: audienceFilterToJson(input.audience_filter),
        scheduled_at: input.scheduled_at,
        job_id: input.job_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(data.audience_filter)
    };
  },

  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.goal !== undefined) updateData.goal = input.goal;
    if (input.audience_filter !== undefined) updateData.audience_filter = audienceFilterToJson(input.audience_filter);
    if (input.scheduled_at !== undefined) updateData.scheduled_at = input.scheduled_at;
    if (input.job_id !== undefined) updateData.job_id = input.job_id;

    const { data, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(data.audience_filter)
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Campaign Emails CRUD
  async getEmails(campaignId: string): Promise<CampaignEmail[]> {
    const { data, error } = await supabase
      .from('campaign_emails')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(e => ({
      ...e,
      bee_json: e.bee_json as Record<string, unknown> | undefined
    }));
  },

  async createEmail(input: CreateCampaignEmailInput): Promise<CampaignEmail> {
    const { data, error } = await supabase
      .from('campaign_emails')
      .insert({
        campaign_id: input.campaign_id,
        step_order: input.step_order,
        delay_days: input.delay_days || 0,
        delay_hours: input.delay_hours || 0,
        subject: input.subject,
        bee_json: input.bee_json as Json,
        html_content: input.html_content,
        email_template_id: input.email_template_id,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      bee_json: data.bee_json as Record<string, unknown> | undefined
    };
  },

  async updateEmail(id: string, input: UpdateCampaignEmailInput): Promise<CampaignEmail> {
    const updateData: Record<string, unknown> = {};
    if (input.step_order !== undefined) updateData.step_order = input.step_order;
    if (input.delay_days !== undefined) updateData.delay_days = input.delay_days;
    if (input.delay_hours !== undefined) updateData.delay_hours = input.delay_hours;
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.bee_json !== undefined) updateData.bee_json = input.bee_json as Json;
    if (input.html_content !== undefined) updateData.html_content = input.html_content;
    if (input.email_template_id !== undefined) updateData.email_template_id = input.email_template_id;

    const { data, error } = await supabase
      .from('campaign_emails')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      bee_json: data.bee_json as Record<string, unknown> | undefined
    };
  },

  async deleteEmail(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_emails')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Campaign Recipients
  async getRecipients(campaignId: string): Promise<CampaignRecipient[]> {
    const { data, error } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;
    return (data || []).map(r => ({
      ...r,
      status: r.status as CampaignRecipient['status']
    }));
  },

  async addRecipients(campaignId: string, candidateIds: string[]): Promise<void> {
    const recipients = candidateIds.map(candidateId => ({
      campaign_id: campaignId,
      candidate_id: candidateId,
    }));

    const { error } = await supabase
      .from('campaign_recipients')
      .upsert(recipients, { onConflict: 'campaign_id,candidate_id' });

    if (error) throw error;
  },

  async removeRecipient(campaignId: string, candidateId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_recipients')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('candidate_id', candidateId);

    if (error) throw error;
  },

  // Get candidates based on audience filter
  async getFilteredCandidates(filter: AudienceFilter): Promise<{ id: string; first_name: string; last_name: string; email: string }[]> {
    let query = supabase.from('candidates').select('id, first_name, last_name, email');

    // Filter by talent pools
    if (filter.talentPoolIds && filter.talentPoolIds.length > 0) {
      const { data: poolCandidates } = await supabase
        .from('talent_pool_candidates')
        .select('candidate_id')
        .in('talent_pool_id', filter.talentPoolIds);
      
      if (poolCandidates && poolCandidates.length > 0) {
        const candidateIds = poolCandidates.map(pc => pc.candidate_id);
        query = query.in('id', candidateIds);
      } else {
        return []; // No candidates in selected pools
      }
    }

    // Filter by pipelines
    if (filter.pipelineIds && filter.pipelineIds.length > 0) {
      const { data: pipelineCandidates } = await supabase
        .from('pipeline_candidates')
        .select('candidate_id')
        .in('pipeline_id', filter.pipelineIds);
      
      if (pipelineCandidates && pipelineCandidates.length > 0) {
        const candidateIds = pipelineCandidates.map(pc => pc.candidate_id);
        query = query.in('id', candidateIds);
      } else {
        return [];
      }
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      query = query.overlaps('tags', filter.tags);
    }

    // Filter by location
    if (filter.locations && filter.locations.length > 0) {
      query = query.in('location', filter.locations);
    }

    // Filter by source
    if (filter.sources && filter.sources.length > 0) {
      query = query.in('source', filter.sources);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get recipient count for a filter
  async getRecipientCount(filter: AudienceFilter): Promise<number> {
    const candidates = await this.getFilteredCandidates(filter);
    return candidates.length;
  }
};
