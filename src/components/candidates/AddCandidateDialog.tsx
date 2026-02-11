"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  MapPin, 
  Tag,
  StickyNote,
  CheckCircle,
  UserPlus,
  GitBranch,
  Eye,
  X,
  AlertCircle,
  AlertTriangle,
  GitMerge,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFindDuplicates, useCreateCandidate } from '@/hooks/useCandidates';
import { communicationService } from '@/services';
import { MergeCandidateDialog } from './MergeCandidateDialog';
import type { Candidate } from '@/types';

const candidateSchema = z.object({
  firstName: z.string().trim().max(50, 'First name must be less than 50 characters').optional().or(z.literal('')),
  lastName: z.string().trim().max(50, 'Last name must be less than 50 characters').optional().or(z.literal('')),
  email: z.string().trim().max(255, 'Email must be less than 255 characters').optional().or(z.literal('')),
  phone: z.string().trim().max(30, 'Phone must be less than 30 characters').optional().or(z.literal('')),
  company: z.string().trim().max(100, 'Company must be less than 100 characters').optional().or(z.literal('')),
  jobTitle: z.string().trim().max(100, 'Job title must be less than 100 characters').optional().or(z.literal('')),
  location: z.string().trim().max(100, 'Location must be less than 100 characters').optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
}).refine((data) => {
  const hasEmail = data.email && data.email.trim().length > 0;
  const hasPhone = data.phone && data.phone.trim().length > 0;
  return hasEmail || hasPhone;
}, {
  message: 'Please provide at least an email address or phone number',
  path: ['contactInfo'],
}).refine((data) => {
  if (data.email && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.email.trim());
  }
  return true;
}, {
  message: 'Please enter a valid email address',
  path: ['email'],
});

type CandidateFormData = z.infer<typeof candidateSchema>;

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceOptions = [
  'LinkedIn',
  'Referral',
  'Job Board',
  'Company Website',
  'Recruiting Event',
  'Cold Outreach',
  'Other',
];

const suggestedTags = ['React', 'TypeScript', 'Python', 'Java', 'Remote', 'Senior', 'Mid-level', 'Junior'];

export function AddCandidateDialog({ open, onOpenChange }: AddCandidateDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [duplicateCandidate, setDuplicateCandidate] = useState<Candidate | null>(null);
  const [duplicateMatchType, setDuplicateMatchType] = useState<'email' | 'phone' | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [proceedAnyway, setProceedAnyway] = useState(false);

  const createCandidate = useCreateCandidate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      location: '',
      source: '',
      notes: '',
    },
  });

  const email = watch('email');
  const phone = watch('phone');
  const hasContactInfo = (email && email.trim().length > 0) || (phone && phone.trim().length > 0);
  
  // Get the root error for contactInfo validation
  const contactError = (errors as any).contactInfo?.message as string | undefined;

  // Use real duplicate checking from the database
  const { data: duplicates } = useFindDuplicates(
    proceedAnyway ? undefined : email,
    proceedAnyway ? undefined : phone
  );

  // Update duplicate state when duplicates are found
  useEffect(() => {
    if (proceedAnyway) {
      setDuplicateCandidate(null);
      setDuplicateMatchType(null);
      return;
    }
    
    if (duplicates && duplicates.length > 0) {
      const dup = duplicates[0];
      setDuplicateCandidate(dup);
      // Determine match type
      if (email && dup.email?.toLowerCase() === email.toLowerCase()) {
        setDuplicateMatchType('email');
      } else if (phone && dup.phone === phone) {
        setDuplicateMatchType('phone');
      }
    } else {
      setDuplicateCandidate(null);
      setDuplicateMatchType(null);
    }
  }, [duplicates, email, phone, proceedAnyway]);

  const onSubmit = async (data: CandidateFormData) => {
    try {
      const result = await createCandidate.mutateAsync({
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company: data.company || undefined,
        title: data.jobTitle || undefined,
        location: data.location || undefined,
        source: data.source || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      // Write initial note to notes table if provided
      const notesContent = data.notes?.trim();
      if (notesContent && result.id) {
        await communicationService.createNote({
          candidateId: result.id,
          content: notesContent,
        });
      }

      setCreatedCandidateId(result.id);
      setShowSuccess(true);
      setProceedAnyway(false);
      setDuplicateCandidate(null);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleSaveAndAddAnother = (data: CandidateFormData) => {
    onSubmit(data);
    // Reset form but keep dialog open
    setTimeout(() => {
      setShowSuccess(false);
      reset();
      setSelectedTags([]);
      setProceedAnyway(false);
    }, 100);
  };

  const handleViewProfile = () => {
    onOpenChange(false);
    setShowSuccess(false);
    reset();
    setSelectedTags([]);
    router.push(`/candidates/${createdCandidateId}`);
  };

  const handleAddToPipeline = () => {
    onOpenChange(false);
    setShowSuccess(false);
    reset();
    setSelectedTags([]);
    // Navigate to pipelines or show pipeline selection
    router.push('/pipelines');
  };

  const handleAddAnother = () => {
    setShowSuccess(false);
    reset();
    setSelectedTags([]);
    setProceedAnyway(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowSuccess(false);
    reset();
    setSelectedTags([]);
    setProceedAnyway(false);
    setDuplicateCandidate(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleViewExistingProfile = () => {
    if (duplicateCandidate) {
      onOpenChange(false);
      router.push(`/talent/${duplicateCandidate.id}`);
    }
  };

  const handleOpenMergeDialog = () => {
    setShowMergeDialog(true);
  };

  const handleProceedAnyway = () => {
    setProceedAnyway(true);
    setDuplicateCandidate(null);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">
              Candidate Added!
            </h2>
            <p className="text-muted-foreground mb-6">
              What would you like to do next?
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleViewProfile}
                className="bg-gradient-primary hover:opacity-90 w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Profile
              </Button>
              <Button 
                onClick={handleAddToPipeline}
                variant="outline"
                className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white w-full"
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Add to Pipeline
              </Button>
              <Button 
                onClick={handleAddAnother}
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Another Candidate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-blue" />
              Add Candidate
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Quickly add a new candidate to your database
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Duplicate Warning */}
            {duplicateCandidate && !proceedAnyway && (
              <div className="p-4 rounded-lg bg-sunrise/10 border border-sunrise/30 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-sunrise flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      A candidate with this {duplicateMatchType} already exists:
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {duplicateCandidate.firstName} {duplicateCandidate.lastName}
                      {duplicateCandidate.title && ` • ${duplicateCandidate.title}`}
                      {duplicateCandidate.company && ` at ${duplicateCandidate.company}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleViewExistingProfile}
                    className="border-sunrise text-sunrise hover:bg-sunrise hover:text-white"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Profile
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenMergeDialog}
                    className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                  >
                    <GitMerge className="w-3 h-3 mr-1" />
                    Merge with Existing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleProceedAnyway}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Proceed Anyway
                  </Button>
                </div>
              </div>
            )}

            {/* Contact Info Section - Required */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="w-4 h-4 text-sky-blue" />
                Contact Information
                <span className="text-sunrise text-xs">*At least email or phone required</span>
              </div>

              {/* Contact validation error */}
              {contactError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{contactError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-muted-foreground">
                    First Name <span className="text-xs">(Optional)</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    className="border-border focus:border-sky-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-muted-foreground">
                    Last Name <span className="text-xs">(Optional)</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    {...register('lastName')}
                    className="border-border focus:border-sky-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    {...register('email')}
                    className={`border-border focus:border-sky-blue ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <span className="text-xs text-destructive">{errors.email.message}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...register('phone')}
                    className="border-border focus:border-sky-blue"
                  />
                </div>
              </div>
            </div>

            {/* Optional Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Briefcase className="w-4 h-4 text-sky-blue" />
                Professional Details
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-muted-foreground flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Company <span className="text-xs">(Optional)</span>
                  </Label>
                  <Input
                    id="company"
                    placeholder="Acme Corp"
                    {...register('company')}
                    className="border-border focus:border-sky-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Job Title <span className="text-xs">(Optional)</span>
                  </Label>
                  <Input
                    id="jobTitle"
                    placeholder="Software Engineer"
                    {...register('jobTitle')}
                    className="border-border focus:border-sky-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location <span className="text-xs">(Optional)</span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    {...register('location')}
                    className="border-border focus:border-sky-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-muted-foreground">
                    Source <span className="text-xs">(Optional)</span>
                  </Label>
                  <Select onValueChange={(value) => setValue('source', value)}>
                    <SelectTrigger className="border-border">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {sourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Tag className="w-4 h-4 text-sky-blue" />
                Tags & Skills
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} className="bg-sky-blue/20 text-sky-blue border-sky-blue px-2 py-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {suggestedTags.filter(t => !selectedTags.includes(t)).map((tag) => (
                  <Badge 
                    key={tag}
                    variant="outline"
                    className="border-border text-muted-foreground hover:border-sky-blue hover:text-sky-blue cursor-pointer px-2 py-1"
                    onClick={() => toggleTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-muted-foreground flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                Notes <span className="text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any initial notes about this candidate..."
                {...register('notes')}
                className="border-border focus:border-sky-blue min-h-[80px] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit(handleSaveAndAddAnother)()}
                disabled={!hasContactInfo || (duplicateCandidate !== null && !proceedAnyway)}
                className="flex-1 border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Save & Add Another
              </Button>
              <Button
                type="submit"
                disabled={!hasContactInfo || (duplicateCandidate !== null && !proceedAnyway)}
                className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Create Candidate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {duplicateCandidate && (
        <MergeCandidateDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          existingCandidate={duplicateCandidate}
          newCandidateData={{
            firstName: getValues('firstName'),
            lastName: getValues('lastName'),
            email: getValues('email'),
            phone: getValues('phone'),
            company: getValues('company'),
            title: getValues('jobTitle'),
            location: getValues('location'),
            source: getValues('source'),
            tags: selectedTags,
            notes: getValues('notes'),
          }}
          onMergeComplete={() => {
            handleClose();
          }}
        />
      )}
    </>
  );
}
