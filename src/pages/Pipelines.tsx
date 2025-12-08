import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Calendar, ChevronRight, Users, Archive, CheckCircle } from 'lucide-react';

const Pipelines = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pipelines = [
    {
      id: '1',
      title: 'Senior Frontend Developer - Q1 2024',
      status: 'active',
      stages: { sourced: 45, contacted: 32, engaged: 28, qualified: 18, submitted: 12, hired: 2 },
      createdAt: '2024-01-10',
    },
    {
      id: '2',
      title: 'Backend Engineer - Remote',
      status: 'active',
      stages: { sourced: 67, contacted: 45, engaged: 20, qualified: 12, submitted: 8, hired: 1 },
      createdAt: '2024-01-15',
    },
    {
      id: '3',
      title: 'Product Manager - NYC',
      status: 'active',
      stages: { sourced: 34, contacted: 22, engaged: 15, qualified: 8, submitted: 5, hired: 0 },
      createdAt: '2024-02-01',
    },
    {
      id: '4',
      title: 'Data Scientist - ML Team',
      status: 'active',
      stages: { sourced: 28, contacted: 18, engaged: 10, qualified: 6, submitted: 3, hired: 1 },
      createdAt: '2024-02-05',
    },
    {
      id: '5',
      title: 'DevOps Engineer - Q4 2023',
      status: 'archived',
      stages: { sourced: 52, contacted: 38, engaged: 22, qualified: 14, submitted: 9, hired: 3 },
      createdAt: '2023-10-15',
    },
    {
      id: '6',
      title: 'UX Designer - Brand Team',
      status: 'archived',
      stages: { sourced: 41, contacted: 29, engaged: 18, qualified: 10, submitted: 6, hired: 2 },
      createdAt: '2023-11-01',
    },
  ];

  const filteredPipelines = pipelines.filter(pipeline =>
    pipeline.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalCandidates = (stages: typeof pipelines[0]['stages']) => {
    return Object.values(stages).reduce((sum, count) => sum + count, 0);
  };

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
                  Pipelines
                </h1>
                <p className="font-body text-muted-foreground">
                  Manage role-specific recruitment funnels
                </p>
              </div>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Pipeline
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search pipelines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border focus:border-sky-blue"
              />
            </div>
          </div>

          {/* Pipelines Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-deep-sea hover:bg-deep-sea">
                  <TableHead className="text-white">Pipeline</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Stage Breakdown</TableHead>
                  <TableHead className="text-white">Total</TableHead>
                  <TableHead className="text-white">Created</TableHead>
                  <TableHead className="text-white"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPipelines.map((pipeline) => (
                  <TableRow 
                    key={pipeline.id} 
                    className="hover:bg-sky-blue/5 cursor-pointer"
                    onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{pipeline.title}</div>
                    </TableCell>
                    <TableCell>
                      {pipeline.status === 'active' ? (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs border-muted-foreground/30">
                          S: {pipeline.stages.sourced}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-muted-foreground/30">
                          C: {pipeline.stages.contacted}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-muted-foreground/30">
                          E: {pipeline.stages.engaged}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-muted-foreground/30">
                          Q: {pipeline.stages.qualified}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-sunrise text-sunrise">
                          H: {pipeline.stages.hired}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-foreground">
                        <Users className="w-4 h-4 text-sky-blue" />
                        {getTotalCandidates(pipeline.stages)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(pipeline.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPipelines.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No pipelines found matching your search.</p>
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

export default Pipelines;