"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Download, Loader2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  useSourceStats,
  useConversionFunnel,
  useHiringTimeline,
  getDateRangeFromPreset,
  normalizeDateRange,
  type DatePreset,
} from '@/hooks/useAnalytics';
import type { DateRange } from '@/services/analyticsService';

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

const Analytics = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('30');
  const [customRange, setCustomRange] = useState<DateRange>(getDefaultCustomRange);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  const dateRange: DateRange | undefined =
    datePreset === 'custom'
      ? customRange
      : getDateRangeFromPreset(datePreset);

  const { data: sourceData = [], isLoading: sourceLoading } = useSourceStats(dateRange);
  const { data: conversionData = [], isLoading: conversionLoading } = useConversionFunnel(dateRange);
  const { data: timelineData = [], isLoading: timelineLoading } = useHiringTimeline(dateRange);

  const hasSourceData = sourceData.length > 0;
  const hasConversionData = conversionData.length > 0;
  const hasTimelineData = timelineData.length > 0;
  const totalSourceCount = sourceData.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                  Analytics
                </h1>
                <p className="font-body text-muted-foreground">
                  Track performance metrics and insights
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {DATE_PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
                    <Button
                      key={preset.value}
                      variant="ghost"
                      size="sm"
                      className={`rounded-none border-0 ${
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
                        className={`rounded-none border-0 ${
                          datePreset === 'custom'
                            ? 'bg-sky-blue/10 text-sky-blue border-b-2 border-sky-blue'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {datePreset === 'custom'
                          ? `${format(customRange.start, 'MMM d')} – ${format(customRange.end, 'MMM d')}`
                          : 'Custom'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 bg-popover" align="start">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Quick select</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'Last 7 days', days: 7 },
                              { label: 'Last 30 days', days: 30 },
                              { label: 'Last 90 days', days: 90 },
                              { label: 'This month', isMonth: true },
                            ].map((preset) => (
                              <Button
                                key={preset.label}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  const end = new Date();
                                  const start = new Date();
                                  if ('days' in preset) {
                                    start.setDate(start.getDate() - preset.days);
                                  } else {
                                    start.setDate(1);
                                  }
                                  setCustomRange(normalizeDateRange({ start, end }));
                                }}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Or pick a range</p>
                          <CalendarComponent
                            mode="range"
                            numberOfMonths={2}
                            selected={{ from: customRange.start, to: customRange.end }}
                            onSelect={(range) => {
                              if (range?.from) {
                                const end = range.to || range.from;
                                setCustomRange(normalizeDateRange({ start: range.from, end }));
                              }
                            }}
                          />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">
                            {format(customRange.start, 'MMM d')} – {format(customRange.end, 'MMM d')}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDatePreset('custom');
                              setCustomPopoverOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="conversion">Conversion</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Timeline Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Candidate Pipeline Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineLoading ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mr-2" />
                      Loading timeline...
                    </div>
                  ) : !hasTimelineData ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                      <p>No timeline data for this period</p>
                      <p className="text-sm mt-1">Add candidates to see trends over time</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="candidates" 
                          stroke="#54A3DA" 
                          strokeWidth={2}
                          name="New Candidates"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="hired" 
                          stroke="#FAA21B" 
                          strokeWidth={2}
                          name="Hired"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Candidate Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sourceLoading ? (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" />
                        Loading sources...
                      </div>
                    ) : !hasSourceData ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No source data for this period</p>
                        <p className="text-sm mt-1">Add candidates with a source to see distribution</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {sourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))' 
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Conversion Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversionLoading ? (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" />
                        Loading funnel...
                      </div>
                    ) : !hasConversionData ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No pipeline data for this period</p>
                        <p className="text-sm mt-1">Add candidates to pipelines to see the funnel</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={conversionData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                          <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))' 
                            }} 
                          />
                          <Bar dataKey="count" fill="#54A3DA" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="sources" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Source Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {sourceLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mr-2" />
                      Loading sources...
                    </div>
                  ) : !hasSourceData ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                      <p>No source data for this period</p>
                      <p className="text-sm mt-1">Add candidates with a source to see performance details</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sourceData.map((source) => (
                        <div key={source.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: source.color }}
                            />
                            <div>
                              <div className="font-medium text-foreground">{source.name}</div>
                              <div className="text-sm text-muted-foreground">{source.value} candidates</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-foreground">
                              {totalSourceCount > 0 ? ((source.value / totalSourceCount) * 100).toFixed(1) : 0}%
                            </div>
                            <div className="text-sm text-muted-foreground">of total</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export default Analytics;
