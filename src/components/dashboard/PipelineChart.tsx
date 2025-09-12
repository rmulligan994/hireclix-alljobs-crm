import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const pipelineData = [
  { stage: 'Sourced', count: 156, color: '#54A3DA' },
  { stage: 'Contacted', count: 89, color: '#0B3555' },
  { stage: 'Engaged', count: 67, color: '#FAA21B' },
  { stage: 'Qualified', count: 34, color: '#54A3DA' },
  { stage: 'Submitted', count: 12, color: '#0B3555' },
  { stage: 'Hired', count: 3, color: '#FAA21B' },
];

export const PipelineChart = () => {
  return (
    <Card className="p-6 shadow-card">
      <div className="mb-6">
        <h3 className="font-heading text-lg font-semibold text-card-foreground mb-2">
          Pipeline Overview
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Current candidates by pipeline stage
        </p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                fontFamily: 'Roboto'
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#54A3DA"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};