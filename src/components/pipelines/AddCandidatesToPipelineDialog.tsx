import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, User, Building, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Candidate {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
}

interface AddCandidatesToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineName: string;
  existingCandidateIds: string[];
  onAddCandidates: (candidates: { id: string; name: string; title: string; company: string }[]) => void;
}

// Mock candidates for selection
const availableCandidates: Candidate[] = [
  { id: 'new-1', name: 'Alex Thompson', title: 'Senior Software Engineer', company: 'Google', location: 'Mountain View, CA', skills: ['React', 'Go', 'Kubernetes'] },
  { id: 'new-2', name: 'Jessica Martinez', title: 'Full Stack Developer', company: 'Stripe', location: 'San Francisco, CA', skills: ['TypeScript', 'Node.js', 'PostgreSQL'] },
  { id: 'new-3', name: 'Ryan Park', title: 'Frontend Engineer', company: 'Airbnb', location: 'Seattle, WA', skills: ['React', 'Vue', 'CSS'] },
  { id: 'new-4', name: 'Samantha Liu', title: 'DevOps Engineer', company: 'Netflix', location: 'Los Angeles, CA', skills: ['AWS', 'Docker', 'Terraform'] },
  { id: 'new-5', name: 'Marcus Johnson', title: 'Backend Developer', company: 'Meta', location: 'New York, NY', skills: ['Python', 'Django', 'Redis'] },
  { id: 'new-6', name: 'Emily Chen', title: 'Mobile Developer', company: 'Uber', location: 'Austin, TX', skills: ['React Native', 'Swift', 'Kotlin'] },
  { id: 'new-7', name: 'David Wilson', title: 'Tech Lead', company: 'Amazon', location: 'Seattle, WA', skills: ['Java', 'AWS', 'Microservices'] },
  { id: 'new-8', name: 'Nina Patel', title: 'Software Architect', company: 'Microsoft', location: 'Redmond, WA', skills: ['C#', '.NET', 'Azure'] },
];

export function AddCandidatesToPipelineDialog({
  open,
  onOpenChange,
  pipelineName,
  existingCandidateIds,
  onAddCandidates,
}: AddCandidatesToPipelineDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredCandidates = availableCandidates.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const notAlreadyInPipeline = !existingCandidateIds.includes(c.id);
    return matchesSearch && notAlreadyInPipeline;
  });

  const handleToggleCandidate = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddSelected = () => {
    const selectedCandidates = availableCandidates
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({ id: c.id, name: c.name, title: c.title, company: c.company }));
    
    onAddCandidates(selectedCandidates);
    
    toast({
      title: 'Candidates added',
      description: `Added ${selectedCandidates.length} candidate${selectedCandidates.length !== 1 ? 's' : ''} to ${pipelineName}`,
    });
    
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
            placeholder="Search by name, title, company, or skills..."
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
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 pr-4">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
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
                    <p className="font-medium text-foreground">{candidate.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {candidate.title}
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {candidate.company}
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {candidate.location}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {candidate.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredCandidates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No candidates found</p>
              </div>
            )}
          </div>
        </ScrollArea>

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
