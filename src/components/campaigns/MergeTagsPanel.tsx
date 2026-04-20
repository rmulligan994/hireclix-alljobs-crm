"use client";

import { useState, useCallback, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, Building2, Briefcase, Check, Copy, Link2 } from 'lucide-react';
import { useJobById } from '@/hooks/useJobs';

interface MergeTag {
  name: string;
  value: string;
}

const SENDER_TAGS: MergeTag[] = [
  { name: 'Sender Name', value: '{{senderName}}' },
  { name: 'Sender Title', value: '{{senderTitle}}' },
  { name: 'Sender Email', value: '{{senderEmail}}' },
  { name: 'Sender LinkedIn', value: '{{senderLinkedinUrl}}' },
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
  { name: 'Position Title', value: '{{jobTitle}}' },
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
  campaignJobId?: string | null;
  /** `popover`: one outer scroll (parent); shorter tag lists without nested ScrollArea clipping */
  variant?: 'default' | 'popover';
}

export const MergeTagsPanel = ({ campaignJobId, variant = 'default' }: MergeTagsPanelProps) => {
  const inPopover = variant === 'popover';
  const [senderSearch, setSenderSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const { data: job } = useJobById(campaignJobId ?? null);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(text);
    setTimeout(() => setCopiedValue(null), 1500);
  }, []);

  const renderTagList = (
    tags: MergeTag[],
    search: string,
    setSearch: (v: string) => void,
    placeholder: string
  ) => (
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
      {inPopover ? (
        <div className="rounded-md border border-border/60 bg-muted/20 px-1">
          <div className="space-y-1 py-0.5">
            {filterTags(tags, search).map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => copyToClipboard(tag.value)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted text-left group"
              >
                <span className="text-muted-foreground group-hover:text-foreground truncate">{tag.name}</span>
                {copiedValue === tag.value ? (
                  <Check className="w-3 h-3 text-green-600 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-20 min-h-0 overflow-y-auto overscroll-contain touch-pan-y rounded-md border border-border/40">
          <div className="space-y-1 p-0.5">
            {filterTags(tags, search).map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => copyToClipboard(tag.value)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted text-left group"
              >
                <span className="text-muted-foreground group-hover:text-foreground truncate">{tag.name}</span>
                {copiedValue === tag.value ? (
                  <Check className="w-3 h-3 text-green-600 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const jobUrl = job?.url || job?.view_url;

  const quickLinks = [
    { name: 'Unsubscribe', value: '{{unsubscribeLink}}' },
    { name: 'Email Recruiter', value: 'mailto:{{senderEmail}}' },
    { name: 'Recruiter LinkedIn', value: '{{senderLinkedinUrl}}' },
    ...(campaignJobId ? [{ name: 'Apply to Job', value: '{{jobUrl}}' }] : []),
  ];

  const categorySections: ReactNode = (
    <div className="space-y-4 pr-1">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-3.5 h-3.5 text-sky-blue" />
          <span className="text-xs font-medium">Sender</span>
        </div>
        {renderTagList(SENDER_TAGS, senderSearch, setSenderSearch, 'Search sender…')}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-3.5 h-3.5 text-sky-blue" />
          <span className="text-xs font-medium">Candidate</span>
        </div>
        {renderTagList(CANDIDATE_TAGS, candidateSearch, setCandidateSearch, 'Search candidate…')}
      </div>

      {campaignJobId && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-sky-blue" />
            <span className="text-xs font-medium">Job</span>
          </div>
          {renderTagList(JOB_TAGS, jobSearch, setJobSearch, 'Search job…')}

          {job && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[10px] font-medium text-muted-foreground mb-2">Actual values (this job)</div>
              <div className="space-y-1.5">
                {job.title && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(job.title)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs bg-muted/50 hover:bg-muted text-left group"
                  >
                    <span className="truncate">{job.title}</span>
                    {copiedValue === job.title ? <Check className="w-3 h-3 text-green-600 shrink-0" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />}
                  </button>
                )}
                {jobUrl && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(jobUrl)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs bg-muted/50 hover:bg-muted text-left group"
                  >
                    <span className="truncate flex items-center gap-1">
                      <Link2 className="w-3 h-3 shrink-0" />
                      Apply URL
                    </span>
                    {copiedValue === jobUrl ? <Check className="w-3 h-3 text-green-600 shrink-0" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col min-h-0">
      <div className="text-xs font-medium text-muted-foreground mb-2">Merge Tags</div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Click to copy. For buttons: add a link in the editor, then paste or pick from the link list.
      </p>

      <div className="mb-4 shrink-0">
        <div className="text-[10px] font-medium text-muted-foreground mb-2">Quick links for buttons</div>
        <div className="space-y-1.5">
          {quickLinks.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => copyToClipboard(item.value)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs bg-sky-blue/10 hover:bg-sky-blue/20 text-left group border border-sky-blue/20"
            >
              <span className="truncate">{item.name}</span>
              {copiedValue === item.value ? (
                <Check className="w-3 h-3 text-green-600 shrink-0" />
              ) : (
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">
          Click a button in the editor, then the link icon in the toolbar. Paste the link or choose from the link picker.
        </p>
      </div>

      {inPopover ? (
        categorySections
      ) : (
        <div className="min-h-0 max-h-[50vh] flex-1 overflow-y-auto overscroll-contain pr-2 -mr-1">{categorySections}</div>
      )}
    </div>
  );
};
