import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, AlertCircle } from 'lucide-react';

const Pipelines = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const pipelineStages = [
    {
      name: 'Sourced',
      count: 45,
      candidates: [
        { name: 'John Smith', title: 'Software Engineer', daysInStage: 2 },
        { name: 'Emily Davis', title: 'Product Designer', daysInStage: 1 },
      ],
    },
    {
      name: 'Contacted',
      count: 32,
      candidates: [
        { name: 'Michael Brown', title: 'Data Analyst', daysInStage: 5 },
        { name: 'Sarah Wilson', title: 'UX Researcher', daysInStage: 3 },
      ],
    },
    {
      name: 'Engaged',
      count: 28,
      candidates: [
        { name: 'Alex Johnson', title: 'Frontend Developer', daysInStage: 7 },
        { name: 'Lisa Martinez', title: 'DevOps Engineer', daysInStage: 4 },
      ],
    },
    {
      name: 'Qualified',
      count: 18,
      candidates: [
        { name: 'David Chen', title: 'Data Scientist', daysInStage: 10 },
      ],
    },
    {
      name: 'Submitted',
      count: 12,
      candidates: [
        { name: 'Maria Garcia', title: 'Product Manager', daysInStage: 14 },
      ],
    },
    {
      name: 'Hired',
      count: 8,
      candidates: [],
    },
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
                  Pipeline Management
                </h1>
                <p className="font-body text-muted-foreground">
                  Track candidates through your hiring pipeline
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  Configure Stages
                </Button>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pipeline
                </Button>
              </div>
            </div>
          </div>

          {/* Pipeline Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">143</div>
                <div className="text-sm text-muted-foreground">Total Candidates</div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">18 days</div>
                <div className="text-sm text-muted-foreground">Avg. Time in Pipeline</div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">32%</div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Kanban Board */}
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {pipelineStages.map((stage) => (
              <div key={stage.name} className="flex-shrink-0 w-80">
                <Card className="bg-card border-border">
                  <CardHeader className="bg-deep-sea text-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        {stage.name}
                      </CardTitle>
                      <Badge className="bg-sky-blue text-white">
                        {stage.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 min-h-[400px]">
                    {stage.candidates.map((candidate, idx) => (
                      <Card 
                        key={idx} 
                        className="p-4 cursor-pointer hover:border-sky-blue transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="font-medium text-foreground">{candidate.name}</div>
                          <div className="text-sm text-muted-foreground">{candidate.title}</div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {candidate.daysInStage} days
                            </div>
                            {candidate.daysInStage > 7 && (
                              <AlertCircle className="w-4 h-4 text-sunrise" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                    {stage.candidates.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No candidates in this stage
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </main>
      </div>

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export default Pipelines;
