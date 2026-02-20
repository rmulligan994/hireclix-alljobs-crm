"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddCandidatesToPoolDialog } from '@/components/talent-pools/AddCandidatesToPoolDialog';
import { EditTalentPoolDialog } from '@/components/talent-pools/EditTalentPoolDialog';
import { BulkAddToPipelineDialog } from '@/components/candidates/BulkAddToPipelineDialog';
import { QuickNoteDialog } from '@/components/pipelines/QuickNoteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuSeparator,
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
import {
  ArrowLeft,
  UserPlus,
  Settings,
  Trash2,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  GitBranch,
  StickyNote,
  Users,
  Calendar,
  Clock,
  FolderOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateNote } from '@/hooks/useCommunications';
import { exportCandidatesToCsv } from '@/utils/exportCandidates';
import { useTalentPoolWithCandidates, useRemoveCandidateFromPool, useRemoveCandidatesFromPool, useAddCandidatesToPool, useDeleteTalentPool } from '@/hooks/useTalentPools';
import { useCandidates } from '@/hooks/useCandidates';
import { parseBooleanSearch, type SearchableCandidate } from '@/utils/booleanSearchParser';
import {
  CandidateFiltersPanel,
  type CandidateFilters,
  type FilterOption,
} from '@/components/candidates/search';

interface PoolCandidate {
  id: string;
  candidateId: string;
  name: string;
  title: string;
  company: string;
  location: string;
  source: string;
  tags: string[];
  pipelines: { id: string; name: string; stage: string }[];
  dateAdded: string;
}

const TalentPoolDetail = ({ id }: { id: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const createNote = useCreateNote();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CandidateFilters>({
    skills: [],
    locations: [],
    pipelines: [],
    pipelineStages: [],
    talentPools: [],
    sources: [],
    companies: [],
    experienceLevels: [],
    dateAdded: null,
    lastContact: null,
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [addCandidatesOpen, setAddCandidatesOpen] = useState(false);
  const [bulkAddToPipelineOpen, setBulkAddToPipelineOpen] = useState(false);
  const [editPoolOpen, setEditPoolOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteCandidate, setNoteCandidate] = useState<{ id: string; name: string } | null>(null);
  const [poolCandidates, setPoolCandidates] = useState<PoolCandidate[]>([]);

  const { data: pool, isLoading } = useTalentPoolWithCandidates(id || '');
  const { data: allCandidates } = useCandidates();
  const removeCandidateFromPool = useRemoveCandidateFromPool();
  const removeCandidatesFromPool = useRemoveCandidatesFromPool();
  const addCandidatesToPool = useAddCandidatesToPool();
  const deleteTalentPool = useDeleteTalentPool();

  // Build candidates with full info when pool and candidates are loaded
  useEffect(() => {
    if (pool?.candidates && allCandidates) {
      const candidatesWithInfo = pool.candidates.map(pc => {
        const candidate = allCandidates.find(c => c.id === pc.candidateId);
        return {
          id: pc.candidateId,
          candidateId: pc.candidateId,
          name: candidate ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() : 'Unknown',
          title: candidate?.title || '',
          company: candidate?.company || '',
          location: candidate?.location || '',
          source: candidate?.source || '',
          tags: candidate?.tags || [],
          pipelines: [],
          dateAdded: pc.addedAt.toISOString().split('T')[0],
        };
      });
      setPoolCandidates(candidatesWithInfo);
    }
  }, [pool, allCandidates]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background font-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onCopilotToggle={() => setCopilotOpen(!copilotOpen)} copilotOpen={copilotOpen} />
          <main className="flex-1 p-6">
            <div className="mb-6">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-12 w-full mb-6" />
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Talent Pool not found</h2>
          <p className="text-muted-foreground mb-4">The talent pool you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => router.push('/talent-pools')} className="bg-gradient-primary">Back to Talent Pools</Button>
        </div>
      </div>
    );
  }

  // Map PoolCandidate to SearchableCandidate for boolean search
  const toSearchable = (c: PoolCandidate): SearchableCandidate => ({
    firstName: c.name.split(' ')[0] || '',
    lastName: c.name.split(' ').slice(1).join(' ') || '',
    email: '',
    phone: '',
    company: c.company,
    title: c.title,
    location: c.location,
    skills: c.tags,
  });

  const filteredCandidates = (() => {
    let results = [...poolCandidates];

    // Apply boolean search (supports "phrases", AND, OR, NOT, (grouping))
    if (searchQuery.trim()) {
      const matcher = parseBooleanSearch(searchQuery.trim());
      if (matcher) {
        results = results.filter((c) => matcher(toSearchable(c)));
      } else {
        const q = searchQuery.toLowerCase();
        results = results.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
    }

    // Apply filters
    if (filters.skills.length > 0) {
      results = results.filter((c) =>
        filters.skills.some((skill) => c.tags.includes(skill))
      );
    }
    if (filters.locations.length > 0) {
      results = results.filter((c) =>
        filters.locations.includes(c.location || '')
      );
    }
    if (filters.companies.length > 0) {
      results = results.filter((c) =>
        filters.companies.includes(c.company || '')
      );
    }
    if (filters.sources.length > 0) {
      results = results.filter((c) =>
        filters.sources.includes(c.source || '')
      );
    }

    return results;
  })();

  const filterOptions = (() => {
    const skillCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const companyCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    poolCandidates.forEach((c) => {
      c.tags.forEach((s) => skillCounts.set(s, (skillCounts.get(s) || 0) + 1));
      if (c.location) locationCounts.set(c.location, (locationCounts.get(c.location) || 0) + 1);
      if (c.company) companyCounts.set(c.company, (companyCounts.get(c.company) || 0) + 1);
      if (c.source) sourceCounts.set(c.source, (sourceCounts.get(c.source) || 0) + 1);
    });
    return {
      skills: Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: skillCounts.get(value) } as FilterOption)),
      locations: Array.from(locationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: locationCounts.get(value) } as FilterOption)),
      pipelines: [] as FilterOption[],
      pipelineStages: [] as FilterOption[],
      talentPools: [] as FilterOption[],
      sources: Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: sourceCounts.get(value) } as FilterOption)),
      companies: Array.from(companyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: companyCounts.get(value) } as FilterOption)),
    };
  })();

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id));
    }
  };

  const handleAddCandidates = async (candidateIds: string[]) => {
    if (!allCandidates) return;
    
    try {
      await addCandidatesToPool.mutateAsync({
        poolId: id || '',
        candidateIds,
      });
      
      // Update local state with full candidate info
      const candidatesToAdd: PoolCandidate[] = candidateIds.map(candidateId => {
        const fullCandidate = allCandidates.find(c => c.id === candidateId);
        return {
          id: candidateId,
          candidateId,
          name: fullCandidate ? `${fullCandidate.firstName || ''} ${fullCandidate.lastName || ''}`.trim() : 'Unknown',
          title: fullCandidate?.title || '',
          company: fullCandidate?.company || '',
          location: fullCandidate?.location || '',
          source: fullCandidate?.source || '',
          tags: fullCandidate?.tags || [],
          pipelines: [],
          dateAdded: new Date().toISOString().split('T')[0],
        };
      });
      setPoolCandidates(prev => [...prev, ...candidatesToAdd]);
    } catch {
      toast({ title: 'Failed to add candidates', variant: 'destructive' });
    }
  };

  const handleRemoveCandidate = async (candidateId: string, candidateName: string) => {
    try {
      await removeCandidateFromPool.mutateAsync({ poolId: id || '', candidateId });
      setPoolCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch {
      toast({ title: 'Failed to remove candidate', variant: 'destructive' });
    }
  };

  const handleBulkRemove = async () => {
    if (!id || selectedCandidates.length === 0) return;
    try {
      await removeCandidatesFromPool.mutateAsync({ poolId: id, candidateIds: selectedCandidates });
      setPoolCandidates(prev => prev.filter(c => !selectedCandidates.includes(c.id)));
      setSelectedCandidates([]);
    } catch {
      // Error toast handled by mutation
    }
  };

  const handleExport = () => {
    if (!pool?.candidates || !allCandidates) return;
    const toExport = pool.candidates
      .map(pc => allCandidates.find(c => c.id === pc.candidateId))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        company: c.company,
        title: c.title,
        location: c.location,
        source: c.source,
        tags: c.tags,
        linkedinUrl: c.linkedinUrl,
        createdAt: c.createdAt,
      }));
    exportCandidatesToCsv(toExport, undefined, `talent-pool-${pool.name.replace(/\s+/g, '-')}-export.csv`);
  };

  const handleExportSelected = () => {
    if (!allCandidates || selectedCandidates.length === 0) return;
    const toExport = selectedCandidates
      .map(cid => allCandidates.find(c => c.id === cid))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        company: c.company,
        title: c.title,
        location: c.location,
        source: c.source,
        tags: c.tags ?? [],
        linkedinUrl: c.linkedinUrl,
        createdAt: c.createdAt,
      }));
    if (toExport.length === 0) {
      toast({ title: 'No candidates to export', variant: 'destructive' });
      return;
    }
    exportCandidatesToCsv(toExport, undefined, `talent-pool-selected-export.csv`);
  };

  const handleDeletePool = async () => {
    if (!id) return;
    try {
      await deleteTalentPool.mutateAsync(id);
      setDeleteDialogOpen(false);
      router.push('/talent-pools');
    } catch {
      toast({ title: 'Failed to delete pool', variant: 'destructive' });
    }
  };

  const handleOpenNoteDialog = (candidate: { id: string; name: string }) => {
    setNoteCandidate(candidate);
    setNoteDialogOpen(true);
  };

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onCopilotToggle={() => setCopilotOpen(!copilotOpen)} copilotOpen={copilotOpen} />

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="font-heading text-2xl font-bold text-foreground">{pool.name}</h1>
                <p className="text-sm text-muted-foreground">{pool.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setAddCandidatesOpen(true)} className="bg-gradient-primary hover:opacity-90">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Candidates
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-muted-foreground hover:text-foreground"
                  onClick={() => setEditPoolOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Pool
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-border">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="cursor-pointer text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Pool
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-blue" />
                <span>{poolCandidates.length} candidates</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(pool.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date(pool.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-4 p-3 mb-4 bg-sky-blue/10 border border-sky-blue/30 rounded-lg animate-fade-in">
              <span className="text-sm text-foreground">{selectedCandidates.length} selected</span>
              <Button size="sm" className="bg-sky-blue hover:bg-sky-blue/90 text-white" onClick={() => setBulkAddToPipelineOpen(true)}>
                <GitBranch className="w-4 h-4 mr-2" />
                Add to Pipeline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkRemove}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove from Pool
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportSelected} className="border-border">
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedCandidates([])} className="text-muted-foreground">
                Clear selection
              </Button>
            </div>
          )}

          {/* Search and Filter */}
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder='Search... Use "phrases", AND, OR, NOT, (grouping)'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-border focus:border-sky-blue"
                />
              </div>
              <Button
                variant="outline"
                className={`border-border ${filters.skills.length > 0 || filters.locations.length > 0 || filters.companies.length > 0 || filters.sources.length > 0 ? 'border-sky-blue text-sky-blue' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setIsFiltersOpen(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {(filters.skills.length + filters.locations.length + filters.companies.length + filters.sources.length) > 0 && (
                  <span className="ml-1.5 text-xs bg-sky-blue/20 text-sky-blue px-1.5 py-0.5 rounded">
                    {filters.skills.length + filters.locations.length + filters.companies.length + filters.sources.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          <CandidateFiltersPanel
            isOpen={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
            filters={filters}
            onChange={setFilters}
            options={filterOptions}
          />

          {/* Candidates Table or Empty State */}
          {poolCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-lg">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Users className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No candidates in this pool yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Add candidates to start building this talent segment and track potential hires.
              </p>
              <Button onClick={() => setAddCandidatesOpen(true)} className="bg-gradient-primary hover:opacity-90">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Candidates
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-deep-sea hover:bg-deep-sea">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-white data-[state=checked]:bg-sky-blue data-[state=checked]:border-sky-blue"
                      />
                    </TableHead>
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Title</TableHead>
                    <TableHead className="text-white">Company</TableHead>
                    <TableHead className="text-white">Tags</TableHead>
                    <TableHead className="text-white">Date Added</TableHead>
                    <TableHead className="text-white w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      className="hover:bg-sky-blue/5 cursor-pointer"
                      onClick={() => router.push(`/candidates/${candidate.candidateId}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedCandidates.includes(candidate.id)}
                          onCheckedChange={() => handleSelectCandidate(candidate.id)}
                          className="border-muted-foreground data-[state=checked]:bg-sky-blue data-[state=checked]:border-sky-blue"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{candidate.name}</TableCell>
                      <TableCell className="text-muted-foreground">{candidate.title}</TableCell>
                      <TableCell className="text-muted-foreground">{candidate.company}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {candidate.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          {candidate.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{candidate.tags.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="w-3 h-3" />
                          {new Date(candidate.dateAdded).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => router.push(`/candidates/${candidate.candidateId}`)} className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenNoteDialog(candidate)} className="cursor-pointer">
                              <StickyNote className="w-4 h-4 mr-2" />
                              Add Note
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <GitBranch className="w-4 h-4 mr-2" />
                              Add to Pipeline
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() => handleRemoveCandidate(candidate.id, candidate.name)}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove from Pool
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredCandidates.length === 0 && poolCandidates.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No candidates found matching your search.</p>
            </div>
          )}
        </main>
      </div>

      <AICopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />

      <AddCandidatesToPoolDialog
        open={addCandidatesOpen}
        onOpenChange={setAddCandidatesOpen}
        poolName={pool.name}
        existingCandidateIds={poolCandidates.map(c => c.candidateId)}
        onAddCandidates={handleAddCandidates}
      />

      <EditTalentPoolDialog
        open={editPoolOpen}
        onOpenChange={setEditPoolOpen}
        pool={pool}
      />

      <BulkAddToPipelineDialog
        open={bulkAddToPipelineOpen}
        onOpenChange={setBulkAddToPipelineOpen}
        candidateIds={selectedCandidates}
      />

      {noteCandidate && (
        <QuickNoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          candidateName={noteCandidate.name}
          onSaveNote={(content) => {
            createNote.mutate({ candidateId: noteCandidate.id, content });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete this talent pool?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete "{pool.name}" and remove all candidate associations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground hover:text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await handleDeletePool();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Pool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TalentPoolDetail;
