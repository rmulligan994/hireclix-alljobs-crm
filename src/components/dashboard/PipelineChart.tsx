import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelines, useCandidatesByStage } from '@/hooks/usePipelines';
import { Loader2 } from 'lucide-react';

export const PipelineChart = () => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined);

  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines('active');
  const { data: pipelineData = [], isLoading: dataLoading } = useCandidatesByStage(selectedPipelineId);

  const chartData = pipelineData.map((d) => ({
    stage: d.stage,
    count: d.count,
    color: '#54A3DA',
  }));

  const isLoading = pipelinesLoading || dataLoading;

  return (
    <Card className="p-6 shadow-card">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="font-heading text-lg font-semibold text-card-foreground">
            Pipeline Overview
          </h3>
          <Select
            value={selectedPipelineId ?? 'all'}
            onValueChange={(v) => setSelectedPipelineId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[180px] border-border">
              <SelectValue placeholder="Filter by pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipelines</SelectItem>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          Current candidates by pipeline stage
        </p>
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No pipeline data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#C4C8CC', fontSize: 12, fontFamily: 'Roboto' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#C4C8CC', fontSize: 12, fontFamily: 'Roboto' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(210 15% 16%)',
                  border: '1px solid hsl(210 10% 25%)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontFamily: 'Roboto',
                }}
              />
              <Bar dataKey="count" fill="#54A3DA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
