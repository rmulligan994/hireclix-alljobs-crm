import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus } from 'lucide-react';
import { mockCandidates } from '@/data/mockCandidates';

interface AddCandidatesToPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolName: string;
  existingCandidateIds: string[];
  onAddCandidates: (candidates: { id: string; name: string; title: string; company: string }[]) => void;
}

export const AddCandidatesToPoolDialog = ({
  open,
  onOpenChange,
  poolName,
  existingCandidateIds,
  onAddCandidates,
}: AddCandidatesToPoolDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const availableCandidates = mockCandidates.filter(
    c => !existingCandidateIds.includes(c.id)
  );

  const filteredCandidates = availableCandidates.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleCandidate = (candidateId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleAddSelected = () => {
    const candidatesToAdd = mockCandidates
      .filter(c => selectedCandidates.includes(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        title: c.title,
        company: c.company,
      }));
    onAddCandidates(candidatesToAdd);
    setSelectedCandidates([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedCandidates([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5 text-sky-blue" />
            Add Candidates to {poolName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search and select candidates to add to this talent pool.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, title, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-border focus:border-sky-blue"
          />
        </div>

        {selectedCandidates.length > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-sky-blue/10 rounded-lg">
            <span className="text-sm text-foreground">
              {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCandidates([])}
              className="text-muted-foreground text-xs"
            >
              Clear
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {availableCandidates.length === 0
                ? 'All candidates are already in this pool'
                : 'No candidates found matching your search'}
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCandidates.includes(candidate.id)
                    ? 'border-sky-blue bg-sky-blue/10'
                    : 'border-border hover:border-sky-blue/50'
                }`}
                onClick={() => handleToggleCandidate(candidate.id)}
              >
                <Checkbox
                  checked={selectedCandidates.includes(candidate.id)}
                  onCheckedChange={() => handleToggleCandidate(candidate.id)}
                  className="border-muted-foreground data-[state=checked]:bg-sky-blue data-[state=checked]:border-sky-blue"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {candidate.title} at {candidate.company}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedCandidates.length === 0}
            className="bg-gradient-primary hover:opacity-90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add {selectedCandidates.length > 0 ? selectedCandidates.length : ''} Candidate{selectedCandidates.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};