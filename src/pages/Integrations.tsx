import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Check, ExternalLink } from 'lucide-react';

const Integrations = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const integrations = [
    {
      name: 'LinkedIn Recruiter',
      description: 'Import candidates and sync activity from LinkedIn Recruiter',
      category: 'sourcing',
      connected: true,
      logo: '🔗',
    },
    {
      name: 'Greenhouse',
      description: 'Sync candidates and job postings with your ATS',
      category: 'ats',
      connected: true,
      logo: '🏢',
    },
    {
      name: 'SeekOut',
      description: 'Source diverse candidates and import to your pipeline',
      category: 'sourcing',
      connected: false,
      logo: '🔍',
    },
    {
      name: 'Lever',
      description: 'Integrate with Lever ATS for seamless candidate flow',
      category: 'ats',
      connected: false,
      logo: '⚡',
    },
    {
      name: 'SmartRecruiters',
      description: 'Connect your SmartRecruiters workflows',
      category: 'ats',
      connected: false,
      logo: '🎯',
    },
    {
      name: 'iCIMS',
      description: 'Sync candidate data with iCIMS platform',
      category: 'ats',
      connected: false,
      logo: '📊',
    },
    {
      name: 'Workday',
      description: 'Enterprise HRIS integration for candidate management',
      category: 'hris',
      connected: false,
      logo: '💼',
    },
    {
      name: 'Slack',
      description: 'Get notifications and updates in Slack',
      category: 'communication',
      connected: true,
      logo: '💬',
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
                  Integrations
                </h1>
                <p className="font-body text-muted-foreground">
                  Connect your favorite tools and platforms
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                className="pl-10 border-deep-sea focus:border-sky-blue"
              />
            </div>
          </div>

          {/* Integrations Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="all">All Integrations</TabsTrigger>
              <TabsTrigger value="connected">Connected</TabsTrigger>
              <TabsTrigger value="sourcing">Sourcing</TabsTrigger>
              <TabsTrigger value="ats">ATS</TabsTrigger>
              <TabsTrigger value="hris">HRIS</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration) => (
                  <Card 
                    key={integration.name}
                    className={`hover:border-sky-blue/50 transition-colors ${
                      integration.connected ? 'border-sky-blue/30' : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-3xl">{integration.logo}</div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            {integration.connected && (
                              <Badge className="mt-1 bg-sky-blue/20 text-sky-blue border-sky-blue">
                                <Check className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="mt-2">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {integration.connected ? (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 border-deep-sea text-deep-sea hover:bg-deep-sea hover:text-white"
                          >
                            Configure
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-sunrise text-sunrise hover:bg-sunrise hover:text-white"
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button className="w-full bg-gradient-primary hover:opacity-90">
                          Connect
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="connected" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations
                  .filter((integration) => integration.connected)
                  .map((integration) => (
                    <Card 
                      key={integration.name}
                      className="border-sky-blue/30 hover:border-sky-blue/50 transition-colors"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-3xl">{integration.logo}</div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              <Badge className="mt-1 bg-sky-blue/20 text-sky-blue border-sky-blue">
                                <Check className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <CardDescription className="mt-2">
                          {integration.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 border-deep-sea text-deep-sea hover:bg-deep-sea hover:text-white"
                          >
                            Configure
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-sunrise text-sunrise hover:bg-sunrise hover:text-white"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
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

export default Integrations;
