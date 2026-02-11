"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Calendar } from 'lucide-react';
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

const Analytics = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const sourceData = [
    { name: 'LinkedIn', value: 145, color: '#54A3DA' },
    { name: 'Referrals', value: 89, color: '#0B3555' },
    { name: 'Direct', value: 67, color: '#FAA21B' },
    { name: 'Job Boards', value: 45, color: '#C4C8CC' },
  ];

  const conversionData = [
    { stage: 'Sourced', count: 346 },
    { stage: 'Contacted', count: 278 },
    { stage: 'Engaged', count: 189 },
    { stage: 'Qualified', count: 123 },
    { stage: 'Submitted', count: 67 },
    { stage: 'Hired', count: 34 },
  ];

  const timelineData = [
    { month: 'Jan', candidates: 45, hired: 4 },
    { month: 'Feb', candidates: 52, hired: 6 },
    { month: 'Mar', candidates: 48, hired: 5 },
    { month: 'Apr', candidates: 67, hired: 8 },
    { month: 'May', candidates: 71, hired: 7 },
    { month: 'Jun', candidates: 63, hired: 4 },
  ];

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
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last 30 Days
                </Button>
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
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
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Candidate Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Conversion Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={conversionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Bar dataKey="count" fill="#54A3DA" />
                      </BarChart>
                    </ResponsiveContainer>
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
                            {((source.value / sourceData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">of total</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
