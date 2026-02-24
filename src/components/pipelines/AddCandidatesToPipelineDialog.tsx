import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, User, Building, MapPin } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useCandidatesWithEnrichment } from '@/hooks/useCandidates';
import { useDebounce } from '@/hooks/useDebounce';
import { parseBooleanSearch } from '@/utils/booleanSearchParser';

interface AddCandidatesToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineName: string;
  existingCandidateIds: string[];
  onAddCandidates: (candidateIds: string[]) => void;
}

export function AddCandidatesToPipelineDialog({
  open,
  onOpenChange,
  pipelineName,
  existingCandidateIds,
  onAddCandidates,
}: AddCandidatesToPipelineDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { data: candidates, isLoading } = useCandidatesWithEnrichment();

  const availableCandidates = (candidates || []).filter(
    c => !existingCandidateIds.includes(c.id)
  );

  const filteredCandidates = useMemo(() => {
    let results = [...availableCandidates];

    if (debouncedSearchQuery.trim()) {
      const matcher = parseBooleanSearch(debouncedSearchQuery.trim());
      if (matcher) {
        results = results.filter(c =>
          matcher({
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            email: c.email || '',
            phone: c.phone || '',
            company: c.company || '',
            title: c.title || '',
            location: c.location || '',
            skills: c.tags || [],
          })
        );
      } else {
        const q = debouncedSearchQuery.toLowerCase();
        results = results.filter(
          c =>
            `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(q) ||
            (c.title || '').toLowerCase().includes(q) ||
            (c.company || '').toLowerCase().includes(q) ||
            (c.location || '').toLowerCase().includes(q) ||
            (c.tags || []).some(s => s.toLowerCase().includes(q))
        );
      }
    }

    return results;
  }, [availableCandidates, debouncedSearchQuery]);

  const handleToggleCandidate = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddSelected = () => {
    onAddCandidates(selectedIds);
    setSelectedIds([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-blue" />
            Add Candidates to Pipeline
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select candidates to add to "{pipelineName}"
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder='Search... Use "phrases", AND, OR, NOT, (grouping)'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-border focus:border-sky-blue"
          />
        </div>

        {/* Selection count */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-sky-blue/10 border border-sky-blue/30 rounded-lg">
            <span className="text-sm text-foreground">
              {selectedIds.length} candidate{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setSelectedIds([])}
              className="text-muted-foreground h-7"
            >
              Clear
            </Button>
          </div>
        )}

        {/* Candidates List */}
        <div className="min-h-[200px] max-h-[400px] overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 pr-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {availableCandidates.length === 0
                  ? 'All candidates are already in this pipeline'
                  : 'No candidates found matching your search'}
              </p>
            </div>
          ) : (
            <Virtuoso
              data={filteredCandidates}
              className="pr-2 overflow-y-scroll"
              itemContent={(index, candidate) => (
                <div className="pb-2">
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedIds.includes(candidate.id)
                        ? 'border-sky-blue bg-sky-blue/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => handleToggleCandidate(candidate.id)}
                  >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.includes(candidate.id)}
                      onCheckedChange={() => handleToggleCandidate(candidate.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {candidate.title && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {candidate.title}
                          </span>
                        )}
                        {candidate.company && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {candidate.company}
                          </span>
                        )}
                        {candidate.location && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {candidate.location}
                          </span>
                        )}
                      </div>
                      {candidate.tags && candidate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.tags.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              )}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedIds.length === 0}
            className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add {selectedIds.length > 0 ? selectedIds.length : ''} Candidate{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
