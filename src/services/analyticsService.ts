import { supabase } from '@/integrations/supabase/client';

/**
 * Analytics Service
 *
 * Provides aggregated analytics data for the Analytics page.
 * All queries respect the optional date range.
 */

export type DateRange = {
  start: Date;
  end: Date;
};

export type SourceStat = {
  name: string;
  value: number;
  color: string;
};

export type ConversionStage = {
  stage: string;
  count: number;
};

export type TimelinePoint = {
  month: string;
  monthKey: string;
  candidates: number;
  hired: number;
};

// Color palette for source distribution (matches AddCandidateDialog options)
const SOURCE_COLORS: Record<string, string> = {
  LinkedIn: '#54A3DA',
  Referral: '#0B3555',
  Referrals: '#0B3555',
  'Job Board': '#C4C8CC',
  'Job Boards': '#C4C8CC',
  'Company Website': '#22C55E',
  Website: '#22C55E',
  'Recruiting Event': '#FAA21B',
  'Cold Outreach': '#8B5CF6',
  Direct: '#FAA21B',
  Other: '#94A3B8',
  Unknown: '#64748B',
};

const DEFAULT_SOURCE_COLOR = '#94A3B8';

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? DEFAULT_SOURCE_COLOR;
}

/**
 * Get candidate counts grouped by source
 */
export async function getSourceStats(dateRange?: DateRange): Promise<SourceStat[]> {
  let query = supabase.from('candidates').select('source');

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  const grouped = new Map<string, number>();
  for (const row of data || []) {
    const source = row.source?.trim() || 'Unknown';
    grouped.set(source, (grouped.get(source) || 0) + 1);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      color: getSourceColor(name),
    }));
}

/**
 * Get pipeline conversion funnel - candidates per stage across all pipelines
 */
export async function getConversionFunnel(dateRange?: DateRange): Promise<ConversionStage[]> {
  let query = supabase.from('pipeline_candidates').select('stage, added_at, updated_at');

  if (dateRange) {
    query = query
      .gte('added_at', dateRange.start.toISOString())
      .lte('added_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  const grouped = new Map<string, number>();
  for (const row of data || []) {
    const stage = row.stage || 'Unknown';
    grouped.set(stage, (grouped.get(stage) || 0) + 1);
  }

  // Sort by count descending for bar chart
  return Array.from(grouped.entries())
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);
}

// Common stage names that indicate "hired"
const HIRED_STAGE_NAMES = ['hired', 'offer accepted', 'placed', 'closed won'];

function isHiredStage(stage: string): boolean {
  const lower = (stage || '').toLowerCase();
  return HIRED_STAGE_NAMES.some((name) => lower.includes(name));
}

/**
 * Get hiring timeline - new candidates and hired per month
 */
export async function getHiringTimeline(dateRange?: DateRange): Promise<TimelinePoint[]> {
  const start = dateRange?.start ?? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11); // 12 months back for "all time"
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const end = dateRange?.end ?? new Date();

  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const [candidatesRes, pipelineRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('created_at')
      .gte('created_at', startStr)
      .lte('created_at', endStr),
    supabase
      .from('pipeline_candidates')
      .select('stage, updated_at')
      .gte('updated_at', startStr)
      .lte('updated_at', endStr),
  ]);

  if (candidatesRes.error) throw candidatesRes.error;
  if (pipelineRes.error) throw pipelineRes.error;

  const monthKeys = new Set<string>();
  const candidatesByMonth = new Map<string, number>();
  const hiredByMonth = new Map<string, number>();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.add(key);
    candidatesByMonth.set(key, 0);
    hiredByMonth.set(key, 0);
  }

  for (const row of candidatesRes.data || []) {
    const date = new Date(row.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthKeys.has(key)) {
      candidatesByMonth.set(key, (candidatesByMonth.get(key) || 0) + 1);
    }
  }

  for (const row of pipelineRes.data || []) {
    if (!isHiredStage(row.stage)) continue;
    const date = new Date(row.updated_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthKeys.has(key)) {
      hiredByMonth.set(key, (hiredByMonth.get(key) || 0) + 1);
    }
  }

  const sortedKeys = Array.from(monthKeys).sort();

  return sortedKeys.map((key) => {
    const [year, month] = key.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    return {
      month: monthNames[monthIndex],
      monthKey: key,
      candidates: candidatesByMonth.get(key) || 0,
      hired: hiredByMonth.get(key) || 0,
    };
  });
}
