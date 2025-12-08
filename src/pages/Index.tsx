import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  MessageSquare,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotCollapsed, setCopilotCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background font-body">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
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
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCopilotCollapsed(!copilotCollapsed)}
                  className="border-sunrise text-sunrise hover:bg-sunrise hover:text-neutral-charcoal"
                >
                  AI Copilot
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="New Candidate Leads"
                value="247"
                change="60%"
                trend="up"
                icon={Users}
                variant="primary"
              />
              <MetricCard
                title="Active Campaigns"
                value="12"
                change="45%"
                trend="up"
                icon={Calendar}
              />
              <MetricCard
                title="Response Rate"
                value="28.5%"
                change="35%"
                trend="up"
                icon={TrendingUp}
              />
              <MetricCard
                title="Pipeline Velocity"
                value="18 days"
                change="25%"
                trend="up"
                icon={MessageSquare}
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
        collapsed={copilotCollapsed}
        onToggle={() => setCopilotCollapsed(!copilotCollapsed)}
      />
    </div>
  );
};

export default Index;
