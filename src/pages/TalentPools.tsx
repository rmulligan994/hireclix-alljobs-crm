import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { CreateTalentPoolDialog } from '@/components/talent-pools/CreateTalentPoolDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Users, Calendar, ChevronRight, FolderOpen } from 'lucide-react';
import { useTalentPoolsWithCounts } from '@/hooks/useTalentPools';

const TalentPools = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: talentPools, isLoading } = useTalentPoolsWithCounts();

  const filteredPools = (talentPools || []).filter(pool =>
    pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pool.description || '').toLowerCase().includes(searchQuery.toLowerCase())
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
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => setCreateDialogOpen(true)}
              >
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

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State - No pools exist */}
          {!isLoading && (!talentPools || talentPools.length === 0) && (
            <div className="bg-card rounded-lg border border-border p-12">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-sky-blue/10 flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="w-10 h-10 text-sky-blue" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-3">
                  No talent pools yet
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your first talent pool to start organizing candidates into curated segments.
                </p>
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Pool
                </Button>
              </div>
            </div>
          )}

          {/* Talent Pools Grid */}
          {!isLoading && talentPools && talentPools.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPools.map((pool) => (
                <Card 
                  key={pool.id} 
                  className="bg-card border-border hover:border-sky-blue transition-colors cursor-pointer group"
                  onClick={() => navigate(`/talent-pools/${pool.id}`)}
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
                          {pool.candidateCount || 0} candidates
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
          )}

          {/* No results for search */}
          {!isLoading && talentPools && talentPools.length > 0 && filteredPools.length === 0 && (
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

      <CreateTalentPoolDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};

export default TalentPools;