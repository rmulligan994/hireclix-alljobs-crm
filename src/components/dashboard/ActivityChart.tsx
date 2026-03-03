"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import {
  useMyActivityTimeSeries,
  getDateRangeFromPreset,
  normalizeDateRange,
  type DatePreset,
  type ActivityMetricKey,
} from '@/hooks/useMyActivity';
import type { DateRange } from '@/services/activityService';
import { ACTIVITY_METRICS } from '@/config/activityMetrics';

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

function getDefaultCustomRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return normalizeDateRange({ start, end });
}

/** For chart we need a bounded range; "all" uses last 365 days */
function getChartDateRange(preset: DatePreset, customRange: DateRange): DateRange {
  if (preset === 'custom') return customRange;
  if (preset === 'all') {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 365);
    return normalizeDateRange({ start, end });
  }
  const range = getDateRangeFromPreset(preset);
  if (!range) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return normalizeDateRange({ start, end });
  }
  return range;
}

export const ActivityChart = () => {
  const [datePreset, setDatePreset] = useState<DatePreset>('30');
  const [customRange, setCustomRange] = useState<DateRange>(getDefaultCustomRange);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<ActivityMetricKey>('newCandidatesAdded');

  const { data: currentUser } = useCurrentUser();
  const role = useCurrentUserRole();
  const userId = currentUser?.id;
  const scope = role === 'admin' ? 'org' : 'self';

  const chartDateRange = getChartDateRange(datePreset, customRange);

  const { data: timeSeriesData = [], isLoading } = useMyActivityTimeSeries(
    userId,
    selectedMetric,
    chartDateRange,
    scope
  );

  const selectedMetricConfig = ACTIVITY_METRICS.find((m) => m.key === selectedMetric);

  return (
    <Card className="p-6 shadow-card">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h3 className="font-heading text-lg font-semibold text-card-foreground">
            {scope === 'org' ? 'Organization Activity Over Time' : 'Activity Over Time'}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as ActivityMetricKey)}>
              <SelectTrigger className="w-[220px] border-border">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_METRICS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {DATE_PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  size="sm"
                  className={`rounded-none border-0 text-xs ${
                    datePreset === preset.value
                      ? 'bg-sky-blue/10 text-sky-blue border-b-2 border-sky-blue'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setDatePreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
              <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-none border-0 text-xs ${
                      datePreset === 'custom'
                        ? 'bg-sky-blue/10 text-sky-blue border-b-2 border-sky-blue'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: customRange.start, to: customRange.end }}
                    onSelect={(range) => {
                      if (range?.from) {
                        const end = range.to ?? range.from;
                        setCustomRange(normalizeDateRange({ start: range.from, end }));
                        setDatePreset('custom');
                        setCustomPopoverOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          {selectedMetricConfig?.label} over the selected timeframe
        </p>
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : timeSeriesData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data for this metric in the selected timeframe
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timeSeriesData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#C4C8CC', fontSize: 11 }}
                interval={timeSeriesData.length > 14 ? Math.floor(timeSeriesData.length / 7) : 0}
              />
              <YAxis
                tick={{ fill: '#C4C8CC', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(210 15% 16%)',
                  border: '1px solid hsl(210 10% 25%)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                }}
                formatter={(value: number) => [value, selectedMetricConfig?.label ?? 'Value']}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#54A3DA"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
