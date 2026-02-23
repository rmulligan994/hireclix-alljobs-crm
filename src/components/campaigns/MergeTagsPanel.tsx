"use client";

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Building2, Briefcase, Check } from 'lucide-react';
import { useJobsForMergePanel } from '@/hooks/useJobs';

interface MergeTag {
  name: string;
  value: string;
}

const SENDER_TAGS: MergeTag[] = [
  { name: 'Sender Name', value: '{{senderName}}' },
  { name: 'Sender Email', value: '{{senderEmail}}' },
  { name: 'Sender Company', value: '{{senderCompany}}' },
  { name: 'Sender Brand', value: '{{senderBrand}}' },
];

const CANDIDATE_TAGS: MergeTag[] = [
  { name: 'First Name', value: '{{firstName}}' },
  { name: 'Last Name', value: '{{lastName}}' },
  { name: 'Full Name', value: '{{fullName}}' },
  { name: 'Email', value: '{{email}}' },
  { name: 'Company', value: '{{company}}' },
  { name: 'Title', value: '{{title}}' },
  { name: 'Skills', value: '{{skills}}' },
  { name: 'Location', value: '{{location}}' },
  { name: 'Source', value: '{{source}}' },
  { name: 'LinkedIn URL', value: '{{linkedinUrl}}' },
];

function filterTags(tags: MergeTag[], query: string): MergeTag[] {
  if (!query.trim()) return tags;
  const q = query.toLowerCase();
  return tags.filter((t) => t.name.toLowerCase().includes(q) || t.value.toLowerCase().includes(q));
}

interface MergeTagsPanelProps {
  className?: string;
  /** Called after copy; parent can e.g. focus the editor for paste */
  onCopy?: (text: string) => void;
}

export const MergeTagsPanel = ({ className, onCopy }: MergeTagsPanelProps) => {
  const [senderSearch, setSenderSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: jobs = [] } = useJobsForMergePanel(jobSearch);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
    onCopy?.(text);
  }, [onCopy]);

  const handleCopy = useCallback((text: string) => {
    copyToClipboard(text);
  }, [copyToClipboard]);

  const handleDragStart = useCallback((e: React.DragEvent, text: string) => {
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      copyToClipboard(text);
    }
  }, [copyToClipboard]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const renderTagList = (tags: MergeTag[], search: string, setSearch: (v: string) => void, placeholder: string) => (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
      <ScrollArea className="h-24">
        <div className="space-y-1">
          {filterTags(tags, search).map((tag) => (
            <div
              key={tag.value}
              draggable
              onDragStart={(e) => handleDragStart(e, tag.value)}
              onClick={() => handleCopy(tag.value)}
              className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted cursor-grab active:cursor-grabbing group"
            >
              <span className="text-muted-foreground group-hover:text-foreground">{tag.name}</span>
              <code className="text-[10px] text-sky-blue opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[80px]">
                {tag.value}
              </code>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className={className}>
      <div className="text-xs font-medium text-muted-foreground mb-1">Merge Tags</div>
      <p className="text-[10px] text-muted-foreground mb-3">Click to copy or drag to drop zone. Or use <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">@</kbd> in the editor.</p>

      {/* Drop zone - click or drag to copy, then paste in editor */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-2 rounded border-2 border-dashed p-2 text-center text-xs transition-colors ${
          isDragOver ? 'border-sky-blue bg-sky-blue/10' : 'border-muted-foreground/30 hover:border-muted-foreground/50'
        }`}
      >
        {copiedText ? (
          <span className="text-green-600 dark:text-green-400 flex items-center justify-center gap-1 font-medium">
            <Check className="w-3.5 h-3.5 shrink-0" /> Copied! Click in editor and paste (⌘V)
          </span>
        ) : (
          <span className="text-muted-foreground">Click or drop here to copy · paste in editor with ⌘V</span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-3.5 h-3.5 text-sky-blue" />
            <span className="text-xs font-medium">Sender Info</span>
          </div>
          {renderTagList(SENDER_TAGS, senderSearch, setSenderSearch, 'Search sender...')}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-3.5 h-3.5 text-sky-blue" />
            <span className="text-xs font-medium">Candidate Info</span>
          </div>
          {renderTagList(CANDIDATE_TAGS, candidateSearch, setCandidateSearch, 'Search candidate...')}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-sky-blue" />
            <span className="text-xs font-medium">Job Info</span>
            <span className="text-[10px] text-muted-foreground">(actual job content)</span>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <ScrollArea className="h-32">
              {jobs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No jobs found. Sync from career site.</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.id} className="rounded border p-2 space-y-1">
                      <div className="font-medium text-xs truncate">{job.title}</div>
                      <div className="flex flex-wrap gap-1">
                        {job.title && (
                          <span
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.title)}
                            onClick={() => handleCopy(job.title)}
                            className="px-1.5 py-0.5 rounded bg-muted text-[10px] cursor-grab hover:bg-sky-blue/20 text-sky-blue"
                          >
                            Title
                          </span>
                        )}
                        {job.department && (
                          <span
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.department!)}
                            onClick={() => handleCopy(job.department!)}
                            className="px-1.5 py-0.5 rounded bg-muted text-[10px] cursor-grab hover:bg-sky-blue/20 text-sky-blue"
                          >
                            Dept
                          </span>
                        )}
                        {job.location && (
                          <span
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.location!)}
                            onClick={() => handleCopy(job.location!)}
                            className="px-1.5 py-0.5 rounded bg-muted text-[10px] cursor-grab hover:bg-sky-blue/20 text-sky-blue"
                          >
                            Location
                          </span>
                        )}
                        {job.type && (
                          <span
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.type!)}
                            onClick={() => handleCopy(job.type!)}
                            className="px-1.5 py-0.5 rounded bg-muted text-[10px] cursor-grab hover:bg-sky-blue/20 text-sky-blue"
                          >
                            Type
                          </span>
                        )}
                        {job.description && (
                          <span
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.description!.slice(0, 500))}
                            onClick={() => handleCopy(job.description!.slice(0, 500))}
                            className="px-1.5 py-0.5 rounded bg-muted text-[10px] cursor-grab hover:bg-sky-blue/20 text-sky-blue"
                          >
                            Description
                          </span>
                        )}
                        {job.url && (
                          <span
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.url!)}
                            onClick={() => handleCopy(job.url!)}
                            className="px-1.5 py-0.5 rounded bg-muted text-[10px] cursor-grab hover:bg-sky-blue/20 text-sky-blue"
                          >
                            URL
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};
