"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Building2, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const JOB_TAGS: MergeTag[] = [
  { name: 'Job Title', value: '{{jobTitle}}' },
  { name: 'Job Department', value: '{{jobDepartment}}' },
  { name: 'Job Location', value: '{{jobLocation}}' },
  { name: 'Job Type', value: '{{jobType}}' },
  { name: 'Job Description', value: '{{jobDescription}}' },
  { name: 'Job URL', value: '{{jobUrl}}' },
];

function filterTags(tags: MergeTag[], query: string): MergeTag[] {
  if (!query.trim()) return tags;
  const q = query.toLowerCase();
  return tags.filter((t) => t.name.toLowerCase().includes(q) || t.value.toLowerCase().includes(q));
}

interface MergeTagsPanelProps {
  hasJobContext?: boolean;
  className?: string;
}

export const MergeTagsPanel = ({ hasJobContext = false, className }: MergeTagsPanelProps) => {
  const [senderSearch, setSenderSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const { toast } = useToast();

  const handleCopy = (tag: MergeTag) => {
    navigator.clipboard.writeText(tag.value);
    toast({
      title: 'Copied',
      description: `${tag.name} (${tag.value}) — paste into the email with Cmd+V`,
    });
  };

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
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', tag.value);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleCopy(tag)}
              className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted cursor-pointer group"
            >
              <span className="text-muted-foreground group-hover:text-foreground">{tag.name}</span>
              <code className="text-[10px] text-sky-blue opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="text-xs font-medium text-muted-foreground mb-3">Merge Tags</div>
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
            {!hasJobContext && (
              <span className="text-[10px] text-muted-foreground" title="Select a job in campaign settings for job alerts">
                (select job)
              </span>
            )}
          </div>
          {renderTagList(JOB_TAGS, jobSearch, setJobSearch, 'Search job...')}
        </div>
      </div>
    </div>
  );
};
