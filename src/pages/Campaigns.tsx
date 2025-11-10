import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Play, Pause, Mail, Calendar, TrendingUp, Users } from 'lucide-react';

const Campaigns = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotCollapsed, setCopilotCollapsed] = useState(true);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);

  const campaigns = [
    {
      id: '1',
      name: 'Frontend Developer Outreach',
      type: 'nurture',
      status: 'active',
      recipients: 156,
      sent: 124,
      opened: 67,
      responded: 23,
      startDate: '2024-01-15',
    },
    {
      id: '2',
      name: 'Q1 Tech Event Invitation',
      type: 'event',
      status: 'active',
      recipients: 89,
      sent: 89,
      opened: 45,
      responded: 12,
      startDate: '2024-01-20',
    },
    {
      id: '3',
      name: 'Product Manager Pipeline',
      type: 'job_alert',
      status: 'paused',
      recipients: 203,
      sent: 156,
      opened: 89,
      responded: 34,
      startDate: '2024-01-10',
    },
  ];

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                  Campaigns
                </h1>
                <p className="font-body text-muted-foreground">
                  Create and manage email campaigns and sequences
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  Template Library
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setShowCampaignBuilder(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">12</div>
                    <div className="text-sm text-muted-foreground">Active Campaigns</div>
                  </div>
                  <Mail className="w-8 h-8 text-sky-blue" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">369</div>
                    <div className="text-sm text-muted-foreground">Total Recipients</div>
                  </div>
                  <Users className="w-8 h-8 text-sky-blue" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">54.6%</div>
                    <div className="text-sm text-muted-foreground">Open Rate</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-sunrise" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">18.7%</div>
                    <div className="text-sm text-muted-foreground">Response Rate</div>
                  </div>
                  <Calendar className="w-8 h-8 text-sunrise" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns List */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="all">All Campaigns</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6 space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:border-sky-blue/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <Badge 
                            className={
                              campaign.status === 'active' 
                                ? 'bg-sky-blue/20 text-sky-blue border-sky-blue' 
                                : 'bg-muted text-muted-foreground border-border'
                            }
                          >
                            {campaign.status}
                          </Badge>
                          <Badge variant="secondary">{campaign.type}</Badge>
                        </div>
                        <CardDescription>
                          Started {new Date(campaign.startDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {campaign.status === 'active' ? (
                          <Button variant="outline" size="sm" className="border-sunrise text-sunrise hover:bg-sunrise hover:text-white">
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{campaign.recipients}</div>
                        <div className="text-xs text-muted-foreground">Recipients</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{campaign.sent}</div>
                        <div className="text-xs text-muted-foreground">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-sky-blue">{campaign.opened}</div>
                        <div className="text-xs text-muted-foreground">Opened</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-sunrise">{campaign.responded}</div>
                        <div className="text-xs text-muted-foreground">Responded</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">
                          {((campaign.responded / campaign.sent) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Response Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AICopilot 
        collapsed={copilotCollapsed}
        onToggle={() => setCopilotCollapsed(!copilotCollapsed)}
      />

      <CampaignBuilder 
        open={showCampaignBuilder}
        onOpenChange={setShowCampaignBuilder}
      />
    </div>
  );
};

export default Campaigns;
