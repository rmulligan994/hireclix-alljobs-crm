import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AddCandidateDialog } from '@/components/candidates/AddCandidateDialog';
import { 
  Users, 
  Calendar, 
  GitBranch, 
  Briefcase,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background font-body">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />
        
        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                  Dashboard
                </h1>
                <p className="font-body text-muted-foreground">
                  Welcome back, Sarah! Here's what's happening with your talent pipeline.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Current Report
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setAddCandidateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Metrics Overview */}
          <div className="mb-8">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
              Metrics Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Candidates"
                value="1,247"
                icon={Users}
              />
              <MetricCard
                title="Active Pipelines"
                value="4"
                icon={GitBranch}
              />
              <MetricCard
                title="Open Jobs"
                value="24"
                icon={Briefcase}
              />
              <MetricCard
                title="Placements This Month"
                value="12"
                icon={TrendingUp}
              />
            </div>
          </div>

          {/* Charts and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineChart />
            <ActivityFeed />
          </div>
        </main>
      </div>

      {/* AI Copilot */}
      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      {/* Add Candidate Dialog */}
      <AddCandidateDialog 
        open={addCandidateOpen}
        onOpenChange={setAddCandidateOpen}
      />
    </div>
  );
};

export default Index;