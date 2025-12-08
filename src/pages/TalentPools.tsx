import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Calendar, ChevronRight } from 'lucide-react';

const TalentPools = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const talentPools = [
    {
      id: '1',
      name: 'Senior Engineers',
      description: 'Experienced engineers with 5+ years in full-stack development',
      candidateCount: 156,
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Remote-First Candidates',
      description: 'Candidates who prefer or require fully remote positions',
      candidateCount: 89,
      createdAt: '2024-02-01',
    },
    {
      id: '3',
      name: 'JavaScript Experts',
      description: 'Specialists in React, Node.js, and modern JS frameworks',
      candidateCount: 234,
      createdAt: '2024-01-20',
    },
    {
      id: '4',
      name: 'Data Scientists',
      description: 'ML engineers and data analysts with Python expertise',
      candidateCount: 67,
      createdAt: '2024-02-10',
    },
    {
      id: '5',
      name: 'Product Leaders',
      description: 'Senior PMs and Directors with B2B SaaS experience',
      candidateCount: 45,
      createdAt: '2024-01-25',
    },
    {
      id: '6',
      name: 'Bay Area Talent',
      description: 'Candidates located in San Francisco Bay Area',
      candidateCount: 312,
      createdAt: '2024-02-05',
    },
  ];

  const filteredPools = talentPools.filter(pool =>
    pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  Talent Pools
                </h1>
                <p className="font-body text-muted-foreground">
                  Create and manage curated segments of candidates
                </p>
              </div>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Pool
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search talent pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border focus:border-sky-blue"
              />
            </div>
          </div>

          {/* Talent Pools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPools.map((pool) => (
              <Card 
                key={pool.id} 
                className="bg-card border-border hover:border-sky-blue transition-colors cursor-pointer group"
                onClick={() => navigate(`/talent?pool=${pool.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground group-hover:text-sky-blue transition-colors">
                      {pool.name}
                    </CardTitle>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-sky-blue transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {pool.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-blue" />
                      <Badge variant="secondary" className="bg-sky-blue/10 text-sky-blue">
                        {pool.candidateCount} candidates
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(pool.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No talent pools found matching your search.</p>
            </div>
          )}
        </main>
      </div>

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export default TalentPools;