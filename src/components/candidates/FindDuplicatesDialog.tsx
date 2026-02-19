"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GitMerge, Eye, Mail, Phone, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { MergeCandidateDialog } from './MergeCandidateDialog';
import { useFindAllDuplicates } from '@/hooks/useCandidates';
import type { Candidate } from '@/types';

interface FindDuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindDuplicatesDialog({ open, onOpenChange }: FindDuplicatesDialogProps) {
  const router = useRouter();
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<{
    existing: Candidate;
    duplicate: Candidate;
  } | null>(null);

  const { data: duplicates = [], isLoading } = useFindAllDuplicates(open);

  const handleReview = (candidate: Candidate) => {
    onOpenChange(false);
    router.push(`/candidates/${candidate.id}`);
  };

  const handleMerge = (existing: Candidate, duplicate: Candidate) => {
    setSelectedPair({ existing, duplicate });
    setMergeDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-sky-blue" />
              Find Duplicate Candidates
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Review and merge potential duplicate records
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-sky-blue" />
                <span className="ml-2 text-muted-foreground">Checking for duplicates...</span>
              </div>
            ) : duplicates.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-medium text-foreground mb-2">No duplicates found</h3>
                <p className="text-sm text-muted-foreground">
                  Your candidate database looks clean!
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-sunrise/10 border border-sunrise/30">
                  <AlertTriangle className="w-4 h-4 text-sunrise" />
                  <span className="text-sm text-foreground">
                    Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {duplicates.map(({ candidate, duplicates: dups, matchType }, index) => (
                  <Card key={index} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={matchType === 'email' ? 'bg-sky-blue/20 text-sky-blue' : 'bg-sunrise/20 text-sunrise'}>
                          {matchType === 'email' ? <Mail className="w-3 h-3 mr-1" /> : <Phone className="w-3 h-3 mr-1" />}
                          {matchType === 'email' ? 'Email match' : 'Phone match'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Candidate 1 */}
                        <div className="p-3 rounded-lg border border-border bg-background/50">
                          <p className="font-medium text-foreground">
                            {candidate.firstName} {candidate.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{candidate.title}</p>
                          <p className="text-sm text-muted-foreground">{candidate.company}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {candidate.email || '(no email)'}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {candidate.phone || '(no phone)'}
                          </div>
                        </div>

                        {/* Candidate 2 */}
                        {dups.map((dup) => (
                          <div key={dup.id} className="p-3 rounded-lg border border-border bg-background/50">
                            <p className="font-medium text-foreground">
                              {dup.firstName} {dup.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{dup.title}</p>
                            <p className="text-sm text-muted-foreground">{dup.company}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {dup.email || '(no email)'}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {dup.phone || '(no phone)'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(candidate)}
                          className="flex-1 border-border text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMerge(candidate, dups[0])}
                          className="flex-1 bg-sky-blue hover:bg-sky-blue/90 text-white"
                        >
                          <GitMerge className="w-3 h-3 mr-1" />
                          Merge
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedPair && (
        <MergeCandidateDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          existingCandidate={selectedPair.existing}
          duplicateCandidate={selectedPair.duplicate}
          redirectOnComplete={false}
          newCandidateData={{
            firstName: selectedPair.duplicate.firstName,
            lastName: selectedPair.duplicate.lastName,
            email: selectedPair.duplicate.email,
            phone: selectedPair.duplicate.phone,
            company: selectedPair.duplicate.company,
            title: selectedPair.duplicate.title,
            location: selectedPair.duplicate.location,
            source: selectedPair.duplicate.source,
            tags: selectedPair.duplicate.tags,
          }}
          onMergeComplete={() => {
            setSelectedPair(null);
          }}
        />
      )}
    </>
  );
}
