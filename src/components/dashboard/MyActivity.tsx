"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { UserPlus, Users, Mail, Phone, Send, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import {
  useMyActivityStats,
  getDateRangeFromPreset,
  normalizeDateRange,
  type DatePreset,
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

export const MyActivity = () => {
  const [datePreset, setDatePreset] = useState<DatePreset>('30');
  const [customRange, setCustomRange] = useState<DateRange>(getDefaultCustomRange);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const role = useCurrentUserRole();
  const userId = currentUser?.id;
  const scope = role === 'admin' ? 'org' : 'self';

  const dateRange: DateRange | undefined =
    datePreset === 'custom' ? customRange : getDateRangeFromPreset(datePreset);

  const { data: stats, isLoading } = useMyActivityStats(userId, dateRange, scope);

  const colorClasses: Record<string, string> = {
    'sky-blue': 'bg-sky-blue/10 text-sky-blue',
    'deep-sea': 'bg-deep-sea/10 text-deep-sea',
    sunrise: 'bg-sunrise/10 text-sunrise',
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <h3 className="font-heading text-lg font-semibold text-card-foreground">
            {scope === 'org' ? 'Organization Activity' : 'My Activity'}
          </h3>
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
        <p className="font-body text-sm text-muted-foreground">
          {scope === 'org'
            ? 'Organization-wide activity in the selected timeframe'
            : 'Your activity in the selected timeframe'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {ACTIVITY_METRICS.map(({ key, label, icon: Icon, color }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color] || 'bg-muted'}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm text-foreground">{label}</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {stats?.[key]?.toLocaleString() ?? '0'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
