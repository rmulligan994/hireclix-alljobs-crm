import { supabase } from '@/integrations/supabase/client';

/**
 * Activity Service
 *
 * Provides "My Activity" metrics for the dashboard - counts of actions
 * performed by the current user within a date range.
 */

const PAGE_SIZE = 1000;

/** Fetch all rows with pagination (Supabase defaults to 1000 rows) */
async function fetchAllPaginated<T>(
  buildQuery: (range: { from: number; to: number }) => Promise<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery({ from: offset, to: offset + PAGE_SIZE - 1 });
    if (error) throw error;
    const rows = (data || []) as T[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

export type DateRange = {
  start: Date;
  end: Date;
};

export type MyActivityStats = {
  newCandidatesAdded: number;
  candidatesContacted: number;
  emailsSent: number;
  calls: number;
  candidatesSubmitted: number;
};

/**
 * Get stage name map from pipelines (stage ID -> name)
 */
async function getStageNameMap(): Promise<Map<string, string>> {
  const { data: pipelines, error } = await supabase.from('pipelines').select('id, stages');
  if (error) throw error;

  const map = new Map<string, string>();
  for (const p of pipelines || []) {
    const stages = (p.stages as { id: string; name: string }[]) || [];
    for (const s of stages) {
      if (s?.id && s?.name) map.set(s.id, s.name);
    }
  }
  return map;
}

export type ActivityScope = 'self' | 'org';

/**
 * Get activity stats within the date range.
 * - scope 'self': only the given user's activity (recruiter view)
 * - scope 'org': organization-wide activity (admin view)
 */
export async function getMyActivityStats(
  userId: string,
  dateRange?: DateRange,
  scope: ActivityScope = 'self'
): Promise<MyActivityStats> {
  const start = dateRange?.start?.toISOString();
  const end = dateRange?.end?.toISOString();
  const hasDateRange = !!start && !!end;
  const includeOrgWide = scope === 'org';

  let candidatesQuery = supabase
    .from('candidates')
    .select('id', { count: 'exact', head: true });
  if (!includeOrgWide) candidatesQuery = candidatesQuery.eq('created_by', userId);
  if (hasDateRange) {
    candidatesQuery = candidatesQuery.gte('created_at', start).lte('created_at', end);
  }

  let commsQuery = supabase
    .from('communications')
    .select('id, type, candidate_id');
  if (!includeOrgWide) commsQuery = commsQuery.eq('created_by', userId);
  if (hasDateRange) {
    commsQuery = commsQuery.gte('occurred_at', start).lte('occurred_at', end);
  }

  let pipelineQuery = supabase.from('pipeline_candidates').select('stage');
  if (hasDateRange) {
    pipelineQuery = pipelineQuery.gte('added_at', start).lte('added_at', end);
  }

  const [candidatesRes, commsRes, pipelineRes, stageNameMap] = await Promise.all([
    candidatesQuery,
    commsQuery,
    pipelineQuery,
    getStageNameMap(),
  ]);

  if (candidatesRes.error) throw candidatesRes.error;
  if (commsRes.error) throw commsRes.error;
  if (pipelineRes.error) throw pipelineRes.error;

  const newCandidatesAdded = candidatesRes.count ?? 0;

  const communications = commsRes.data || [];
  const emailsSent = communications.filter((c) => c.type === 'email').length;
  const calls = communications.filter((c) => c.type === 'call').length;
  const contactedCandidateIds = new Set(
    communications.filter((c) => c.type === 'email' || c.type === 'call').map((c) => c.candidate_id)
  );
  const candidatesContacted = contactedCandidateIds.size;

  const submittedStageNames = ['submitted', 'submission'];
  const pipelineRows = pipelineRes.data || [];
  let candidatesSubmitted = 0;
  for (const row of pipelineRows) {
    const stageName = (stageNameMap.get(row.stage || '') || '').toLowerCase();
    if (submittedStageNames.some((s) => stageName.includes(s))) {
      candidatesSubmitted++;
    }
  }

  return {
    newCandidatesAdded,
    candidatesContacted,
    emailsSent,
    calls,
    candidatesSubmitted,
  };
}

export type ActivityMetricKey =
  | 'newCandidatesAdded'
  | 'candidatesContacted'
  | 'emailsSent'
  | 'calls'
  | 'candidatesSubmitted';

export type ActivityTimeSeriesPoint = {
  date: string;
  label: string;
  value: number;
};

/**
 * Get time series data for a specific activity metric (for line chart).
 * Returns daily aggregates. For "all" time, uses last 365 days.
 * - scope 'self': only the given user's activity (recruiter view)
 * - scope 'org': organization-wide activity (admin view)
 */
export async function getMyActivityTimeSeries(
  userId: string,
  metricKey: ActivityMetricKey,
  dateRange?: DateRange,
  scope: ActivityScope = 'self'
): Promise<ActivityTimeSeriesPoint[]> {
  let start: Date;
  let end: Date;

  if (dateRange?.start && dateRange?.end) {
    start = new Date(dateRange.start);
    end = new Date(dateRange.end);
  } else {
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - 365);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const stageNameMap = await getStageNameMap();
  const submittedStageNames = ['submitted', 'submission'];
  const includeOrgWide = scope === 'org';

  if (metricKey === 'newCandidatesAdded') {
    const data = await fetchAllPaginated<{ created_at: string }>(async ({ from, to }) => {
      let q = supabase
        .from('candidates')
        .select('created_at')
        .gte('created_at', startStr)
        .lte('created_at', endStr);
      if (!includeOrgWide) q = q.eq('created_by', userId);
      return q.range(from, to);
    });
    return aggregateByDay(data, (d) => d.created_at, start, end);
  }

  if (metricKey === 'emailsSent') {
    const data = await fetchAllPaginated<{ occurred_at: string }>(async ({ from, to }) => {
      let q = supabase
        .from('communications')
        .select('occurred_at')
        .eq('type', 'email')
        .gte('occurred_at', startStr)
        .lte('occurred_at', endStr);
      if (!includeOrgWide) q = q.eq('created_by', userId);
      return q.range(from, to);
    });
    return aggregateByDay(data, (d) => d.occurred_at, start, end);
  }

  if (metricKey === 'calls') {
    const data = await fetchAllPaginated<{ occurred_at: string }>(async ({ from, to }) => {
      let q = supabase
        .from('communications')
        .select('occurred_at')
        .eq('type', 'call')
        .gte('occurred_at', startStr)
        .lte('occurred_at', endStr);
      if (!includeOrgWide) q = q.eq('created_by', userId);
      return q.range(from, to);
    });
    return aggregateByDay(data, (d) => d.occurred_at, start, end);
  }

  if (metricKey === 'candidatesContacted') {
    const data = await fetchAllPaginated<{ occurred_at: string; candidate_id: string }>(async ({ from, to }) => {
      let q = supabase
        .from('communications')
        .select('occurred_at, candidate_id')
        .in('type', ['email', 'call'])
        .gte('occurred_at', startStr)
        .lte('occurred_at', endStr);
      if (!includeOrgWide) q = q.eq('created_by', userId);
      return q.range(from, to);
    });
    const byDay = new Map<string, Set<string>>();
    for (const row of data) {
      const day = (row.occurred_at || '').split('T')[0];
      if (!byDay.has(day)) byDay.set(day, new Set());
      byDay.get(day)!.add(row.candidate_id);
    }
    return fillDateRange(start, end, (dayKey) => byDay.get(dayKey)?.size ?? 0);
  }

  if (metricKey === 'candidatesSubmitted') {
    const data = await fetchAllPaginated<{ stage: string; added_at: string }>(async ({ from, to }) => {
      return supabase
        .from('pipeline_candidates')
        .select('stage, added_at')
        .gte('added_at', startStr)
        .lte('added_at', endStr)
        .range(from, to);
    });
    const filtered = data.filter((row) => {
      const stageName = (stageNameMap.get(row.stage || '') || '').toLowerCase();
      return submittedStageNames.some((s) => stageName.includes(s));
    });
    return aggregateByDay(filtered, (d) => d.added_at, start, end);
  }

  return [];
}

function aggregateByDay<T>(
  rows: T[],
  getDate: (row: T) => string,
  rangeStart: Date,
  rangeEnd: Date
): ActivityTimeSeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = (getDate(row) || '').split('T')[0];
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  return fillDateRange(rangeStart, rangeEnd, (dayKey) => byDay.get(dayKey) ?? 0);
}

function fillDateRange(
  start: Date,
  end: Date,
  getValue: (dayKey: string) => number
): ActivityTimeSeriesPoint[] {
  const result: ActivityTimeSeriesPoint[] = [];
  const current = new Date(start);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  while (current <= end) {
    const dayKey = current.toISOString().split('T')[0];
    const value = getValue(dayKey);
    const label = `${monthNames[current.getMonth()]} ${current.getDate()}`;
    result.push({ date: dayKey, label, value });
    current.setDate(current.getDate() + 1);
  }

  return result;
}
