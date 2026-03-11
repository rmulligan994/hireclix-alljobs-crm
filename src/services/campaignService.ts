import { supabase } from '@/integrations/supabase/client';
import type { 
  Campaign, 
  CampaignEmail, 
  CampaignRecipient,
  CreateCampaignInput, 
  UpdateCampaignInput,
  CreateCampaignEmailInput,
  UpdateCampaignEmailInput,
  AudienceFilter,
  LeadStatus,
  ScheduleRecurrence
} from '@/types/Campaign';
import { getLeadUsageStatus } from '@/utils/leadUsage';
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

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      name: input.name,
      type: input.type || 'email',
      goal: input.goal,
      audience_filter: audienceFilterToJson(input.audience_filter),
      scheduled_at: input.scheduled_at,
      job_id: input.job_id ?? null,
      folder_id: input.folder_id ?? null,
      is_organization_campaign: input.is_organization_campaign ?? false,
    };
    if (input.schedule_recurrence !== undefined) {
      insertData.schedule_recurrence = input.schedule_recurrence as import('@/integrations/supabase/types').Json;
    }
    const { data, error } = await supabase
      .from('campaigns')
      .insert(insertData)
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
    if (input.schedule_recurrence !== undefined) updateData.schedule_recurrence = input.schedule_recurrence as import('@/integrations/supabase/types').Json ?? null;
    if (input.job_id !== undefined) updateData.job_id = input.job_id;
    if (input.folder_id !== undefined) updateData.folder_id = input.folder_id;
    if (input.is_organization_campaign !== undefined) updateData.is_organization_campaign = input.is_organization_campaign;
    if (input.archived_at !== undefined) updateData.archived_at = input.archived_at;

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

  // Get candidates based on audience filter (uses candidates_enriched for last_activity_at)
  async getFilteredCandidates(filter: AudienceFilter): Promise<{ id: string; first_name: string; last_name: string; email: string; last_activity_at: string | null }[]> {
    // Require at least one pool or pipeline to avoid fetching all candidates
    const hasPool = filter.talentPoolIds && filter.talentPoolIds.length > 0;
    const hasPipeline = filter.pipelineIds && filter.pipelineIds.length > 0;
    if (!hasPool && !hasPipeline) {
      return [];
    }

    let query = (supabase as any).from('candidates_enriched').select('id, first_name, last_name, email, last_activity_at');

    // Filter by talent pools
    if (hasPool) {
      const { data: poolCandidates } = await supabase
        .from('talent_pool_candidates')
        .select('candidate_id')
        .in('talent_pool_id', filter.talentPoolIds);
      
      if (poolCandidates && poolCandidates.length > 0) {
        const candidateIds = poolCandidates.map((pc: { candidate_id: string }) => pc.candidate_id);
        query = query.in('id', candidateIds);
      } else {
        return []; // No candidates in selected pools
      }
    }

    // Filter by pipelines
    if (hasPipeline) {
      const { data: pipelineCandidates } = await supabase
        .from('pipeline_candidates')
        .select('candidate_id')
        .in('pipeline_id', filter.pipelineIds);
      
      if (pipelineCandidates && pipelineCandidates.length > 0) {
        const candidateIds = pipelineCandidates.map((pc: { candidate_id: string }) => pc.candidate_id);
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
    let results = (data || []) as { id: string; first_name: string; last_name: string; email: string; last_activity_at: string | null }[];

    // Filter by lead status (stoplight)
    if (filter.leadStatus && filter.leadStatus.length > 0) {
      const allowed = new Set<LeadStatus>(filter.leadStatus);
      results = results.filter((c) => {
        const lastActivityAt = c.last_activity_at ? new Date(c.last_activity_at) : null;
        const status = getLeadUsageStatus(lastActivityAt);
        return allowed.has(status);
      });
    }

    return results;
  },

  // Get recipient count for a filter
  async getRecipientCount(filter: AudienceFilter): Promise<number> {
    const candidates = await this.getFilteredCandidates(filter);
    return candidates.length;
  },

  // Get campaigns filtered by scope (my vs org)
  async getMyCampaigns(): Promise<Campaign[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      status: c.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(c.audience_filter)
    }));
  },

  async getOrgCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_organization_campaign', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      status: c.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(c.audience_filter)
    }));
  },

  async getArchivedCampaigns(): Promise<Campaign[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      status: c.status as Campaign['status'],
      audience_filter: jsonToAudienceFilter(c.audience_filter)
    }));
  },

  async getScheduledEmails(): Promise<Array<{
    id: string;
    campaign_id: string;
    campaign_email_id: string;
    campaign_name: string;
    campaign_email_subject: string;
    step_order: number;
    total_steps: number;
    schedule_label: string | null;
    scheduled_at: string;
    scheduled_date: string;
    recipient_count: number;
    source?: 'scheduled_emails' | 'campaign';
  }>> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        campaign_email_id,
        scheduled_at,
        campaigns(name, schedule_recurrence),
        campaign_emails(subject, step_order)
      `)
      .eq('status', 'pending')
      .gte('scheduled_at', startOfToday)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;

    // Get total steps per campaign
    const campaignIds = [...new Set((data || []).map((r: { campaign_id: string }) => r.campaign_id))];
    const totalByCampaign = new Map<string, number>();
    if (campaignIds.length > 0) {
      const { data: emailRows } = await supabase
        .from('campaign_emails')
        .select('campaign_id')
        .in('campaign_id', campaignIds);
      for (const row of emailRows || []) {
        totalByCampaign.set(row.campaign_id, (totalByCampaign.get(row.campaign_id) || 0) + 1);
      }
    }

    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formatScheduleLabel = (rec: { type?: string; dayOfWeek?: number; dayOfMonth?: number; time?: string } | null): string | null => {
      if (!rec || !rec.type) return null;
      const time = rec.time ? ` at ${rec.time.replace(/^(\d+):(\d+)$/, (_, h, m) => {
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const h12 = hour % 12 || 12;
        return `${h12}:${m.padStart(2, '0')}${ampm}`;
      })}` : '';
      if (rec.type === 'daily') return `daily${time}`;
      if (rec.type === 'weekly' && rec.dayOfWeek != null) return `weekly on ${WEEKDAYS[rec.dayOfWeek]}${time}`;
      if (rec.type === 'monthly' && rec.dayOfMonth != null) return `monthly on day ${rec.dayOfMonth}${time}`;
      return null;
    };

    // Group by campaign + step + date so drip campaigns with many recipients don't show 100s of rows
    const grouped = new Map<string, { id: string; campaign_id: string; campaign_email_id: string; campaign_name: string; subject: string; step_order: number; schedule_recurrence: ScheduleRecurrence | null; scheduled_at: string; scheduled_date: string; count: number }>();
    for (const row of data || []) {
      const datePart = (row.scheduled_at as string).slice(0, 10);
      const key = `${row.campaign_id}-${row.campaign_email_id}-${datePart}`;
      const existing = grouped.get(key);
      const rec = (row.campaigns as { schedule_recurrence?: ScheduleRecurrence })?.schedule_recurrence ?? null;
      if (existing) {
        existing.count++;
        if (row.scheduled_at < existing.scheduled_at) existing.scheduled_at = row.scheduled_at;
      } else {
        grouped.set(key, {
          id: row.id,
          campaign_id: row.campaign_id,
          campaign_email_id: row.campaign_email_id,
          campaign_name: (row.campaigns as { name?: string })?.name || 'Unknown',
          subject: (row.campaign_emails as { subject?: string })?.subject || '',
          step_order: (row.campaign_emails as { step_order?: number })?.step_order ?? 1,
          schedule_recurrence: rec,
          scheduled_at: row.scheduled_at,
          scheduled_date: datePart,
          count: 1,
        });
      }
    }
    let result = Array.from(grouped.values()).map(g => ({
      ...g,
      campaign_email_subject: g.subject,
      recipient_count: g.count,
      total_steps: totalByCampaign.get(g.campaign_id) ?? 1,
      schedule_label: formatScheduleLabel(g.schedule_recurrence),
      source: 'scheduled_emails' as const,
    }));

    // Fallback: include campaigns with status=scheduled and future scheduled_at that may not have scheduled_emails yet
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: scheduledCampaigns } = await supabase
        .from('campaigns')
        .select('id, name, scheduled_at, schedule_recurrence')
        .eq('status', 'scheduled')
        .gte('scheduled_at', startOfToday)
        .or(`user_id.eq.${user.id},is_organization_campaign.eq.true`);
      const seenCampaignIds = new Set(result.map(r => r.campaign_id));
      for (const c of scheduledCampaigns || []) {
        if (seenCampaignIds.has(c.id)) continue;
        const { data: emails } = await supabase
          .from('campaign_emails')
          .select('id, subject, step_order')
          .eq('campaign_id', c.id)
          .order('step_order', { ascending: true })
          .limit(1);
        const firstEmail = emails?.[0];
        const { count } = await supabase
          .from('campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', c.id);
        result.push({
          id: `campaign-${c.id}`,
          campaign_id: c.id,
          campaign_email_id: firstEmail?.id ?? c.id,
          campaign_name: c.name || 'Untitled',
          campaign_email_subject: firstEmail?.subject ?? 'First email',
          step_order: 1,
          total_steps: 1,
          schedule_label: formatScheduleLabel(c.schedule_recurrence as ScheduleRecurrence),
          scheduled_at: c.scheduled_at!,
          scheduled_date: c.scheduled_at!.slice(0, 10),
          recipient_count: count ?? 0,
          source: 'campaign',
        });
      }
      result.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    }

    return result;
  },

  async cancelCampaignSchedule(campaignId: string): Promise<void> {
    // Cancel all pending scheduled_emails so cron does not send them
    const { error: cancelError } = await supabase
      .from('scheduled_emails')
      .update({ status: 'cancelled' })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');
    if (cancelError) throw cancelError;

    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'draft', scheduled_at: null })
      .eq('id', campaignId);
    if (error) throw error;
  },

  async cancelScheduledSend(campaignId: string, campaignEmailId: string, scheduledDate: string): Promise<void> {
    const startOfDay = `${scheduledDate}T00:00:00.000Z`;
    const endOfDay = `${scheduledDate}T23:59:59.999Z`;
    const { error } = await supabase
      .from('scheduled_emails')
      .update({ status: 'cancelled' })
      .eq('campaign_id', campaignId)
      .eq('campaign_email_id', campaignEmailId)
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)
      .eq('status', 'pending');
    if (error) throw error;
  },

  async getFolders(): Promise<import('@/types/Campaign').CampaignFolder[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('campaign_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createFolder(name: string): Promise<import('@/types/Campaign').CampaignFolder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from('campaign_folders')
      .insert({ name, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async duplicate(campaignId: string, newName: string): Promise<Campaign> {
    const campaign = await this.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    const emails = await this.getEmails(campaignId);
    const newCampaign = await this.create({
      name: newName,
      type: campaign.type,
      goal: campaign.goal,
      audience_filter: campaign.audience_filter,
      folder_id: campaign.folder_id ?? undefined,
    });
    for (const e of emails) {
      await this.createEmail({
        campaign_id: newCampaign.id,
        step_order: e.step_order,
        delay_days: e.delay_days,
        delay_hours: e.delay_hours,
        subject: e.subject,
        bee_json: e.bee_json,
        html_content: e.html_content,
      });
    }
    return newCampaign;
  },

  async getRecipientValidation(campaignId: string, candidateIds: string[]): Promise<{ valid: number; noEmail: number; unsubscribed: number }> {
    if (candidateIds.length === 0) return { valid: 0, noEmail: 0, unsubscribed: 0 };
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, email')
      .in('id', candidateIds);
    let unsubscribed = 0;
    if (campaignId) {
      const { data: existing } = await supabase
        .from('campaign_recipients')
        .select('candidate_id, status')
        .eq('campaign_id', campaignId)
        .in('candidate_id', candidateIds);
      const unsubscribedIds = new Set((existing || []).filter(r => r.status === 'unsubscribed').map(r => r.candidate_id));
      unsubscribed = (candidates || []).filter(c => unsubscribedIds.has(c.id)).length;
    }
    const noEmail = (candidates || []).filter(c => !c.email || !c.email.trim()).length;
    const valid = (candidates?.length || 0) - noEmail - unsubscribed;
    return { valid, noEmail, unsubscribed };
  },
};
