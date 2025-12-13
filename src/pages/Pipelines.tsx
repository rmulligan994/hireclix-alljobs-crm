import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { CreatePipelineDialog } from '@/components/pipelines/CreatePipelineDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Calendar, ChevronRight, Users, Archive, CheckCircle, MoreHorizontal, ArchiveRestore, Settings, GitBranch } from 'lucide-react';
import { usePipelines, useArchivePipeline, useUnarchivePipeline } from '@/hooks/usePipelines';
import { Pipeline } from '@/types/Pipeline';

type ViewFilter = 'active' | 'archived' | 'all';

const Pipelines = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: pipelines, isLoading } = usePipelines(viewFilter);
  const archivePipeline = useArchivePipeline();
  const unarchivePipeline = useUnarchivePipeline();

  const filteredPipelines = (pipelines || []).filter(pipeline => 
    pipeline.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArchiveClick = (e: React.MouseEvent, pipeline: Pipeline) => {
    e.stopPropagation();
    setSelectedPipeline(pipeline);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (selectedPipeline) {
      if (selectedPipeline.status === 'active') {
        await archivePipeline.mutateAsync(selectedPipeline.id);
      } else {
        await unarchivePipeline.mutateAsync(selectedPipeline.id);
      }
    }
    setArchiveDialogOpen(false);
    setSelectedPipeline(null);
  };

  const filterOptions: { label: string; value: ViewFilter }[] = [
    { label: 'Active Pipelines', value: 'active' },
    { label: 'Archived Pipelines', value: 'archived' },
    { label: 'All Pipelines', value: 'all' },
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
                  Pipelines
                </h1>
                <p className="font-body text-muted-foreground">
                  Manage role-specific recruitment funnels
                </p>
              </div>
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pipeline
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search pipelines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border focus:border-sky-blue"
              />
            </div>
            
            {/* View Filter Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setViewFilter(option.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewFilter === option.value
                      ? 'bg-sky-blue text-white'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-deep-sea hover:bg-deep-sea">
                    <TableHead className="text-white">Pipeline</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Stages</TableHead>
                    <TableHead className="text-white">Created</TableHead>
                    <TableHead className="text-white"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty State - No pipelines exist */}
          {!isLoading && (!pipelines || pipelines.length === 0) && (
            <div className="bg-card rounded-lg border border-border p-12">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-sky-blue/10 flex items-center justify-center mx-auto mb-6">
                  <GitBranch className="w-10 h-10 text-sky-blue" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-3">
                  No pipelines yet
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your first pipeline to start tracking candidates through your hiring process. 
                  Each pipeline represents a role you're hiring for.
                </p>
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Pipeline
                </Button>
              </div>
            </div>
          )}

          {/* Pipelines Table */}
          {!isLoading && pipelines && pipelines.length > 0 && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-deep-sea hover:bg-deep-sea">
                    <TableHead className="text-white">Pipeline</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Stages</TableHead>
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
                        <div className="font-medium text-foreground">{pipeline.name}</div>
                        {pipeline.description && (
                          <div className="text-sm text-muted-foreground">{pipeline.description}</div>
                        )}
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
                        <div className="flex items-center gap-1 text-foreground">
                          <Users className="w-4 h-4 text-sky-blue" />
                          {pipeline.stages?.length || 0} stages
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="w-3 h-3" />
                          {new Date(pipeline.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/pipelines/${pipeline.id}`);
                                }}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Edit Stages
                              </DropdownMenuItem>
                              {pipeline.status === 'active' ? (
                                <DropdownMenuItem 
                                  onClick={(e) => handleArchiveClick(e as any, pipeline)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive Pipeline
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={(e) => handleArchiveClick(e as any, pipeline)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <ArchiveRestore className="w-4 h-4 mr-2" />
                                  Unarchive Pipeline
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* No results for filter/search */}
          {!isLoading && pipelines && pipelines.length > 0 && filteredPipelines.length === 0 && (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pipelines found matching your criteria.</p>
              <Button 
                variant="ghost" 
                className="mt-3 text-sky-blue"
                onClick={() => {
                  setSearchQuery('');
                  setViewFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </main>
      </div>

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {selectedPipeline?.status === 'active' ? 'Archive this pipeline?' : 'Unarchive this pipeline?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {selectedPipeline?.status === 'active' 
                ? 'It will be hidden from the main view but remain accessible for reporting.'
                : 'It will be restored to the active pipelines view.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchiveConfirm}
              className="bg-gradient-primary hover:opacity-90"
            >
              {selectedPipeline?.status === 'active' ? 'Archive' : 'Unarchive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Pipeline Dialog */}
      <CreatePipelineDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};

export default Pipelines;
