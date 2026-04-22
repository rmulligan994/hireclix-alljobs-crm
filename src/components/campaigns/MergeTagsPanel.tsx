"use client";

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, Building2, Briefcase, Check, Copy, Link2, Megaphone, Shield } from 'lucide-react';
import { useJobById } from '@/hooks/useJobs';
import { MERGE_TAG_CATALOG, type MergeTagCategory } from '@/lib/email/merge-tags-catalog';

interface MergeTag {
  name: string;
  value: string;
}

function filterTags(tags: MergeTag[], query: string): MergeTag[] {
  if (!query.trim()) return tags;
  const q = query.toLowerCase();
  return tags.filter((t) => t.name.toLowerCase().includes(q) || t.value.toLowerCase().includes(q));
}

function catalogTagsForCategories(categories: MergeTagCategory[]): MergeTag[] {
  return MERGE_TAG_CATALOG.filter((t) => categories.includes(t.category)).map((t) => ({
    name: t.label,
    value: `{{${t.key}}}`,
  }));
}

const CATEGORY_ICON: Record<MergeTagCategory, typeof User> = {
  Sender: User,
  Candidate: Building2,
  Job: Briefcase,
  Campaign: Megaphone,
  System: Shield,
};

interface MergeTagsPanelProps {
  campaignJobId?: string | null;
  /** `popover`: one outer scroll (parent); shorter tag lists without nested ScrollArea clipping */
  variant?: 'default' | 'popover';
}

export const MergeTagsPanel = ({ campaignJobId, variant = 'default' }: MergeTagsPanelProps) => {
  const inPopover = variant === 'popover';
  const [senderSearch, setSenderSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [systemSearch, setSystemSearch] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const { data: job } = useJobById(campaignJobId ?? null);

  const senderTags = useMemo(() => catalogTagsForCategories(['Sender']), []);
  const candidateTags = useMemo(() => catalogTagsForCategories(['Candidate']), []);
  const campaignTags = useMemo(() => catalogTagsForCategories(['Campaign']), []);
  const jobTags = useMemo(() => catalogTagsForCategories(['Job']), []);
  const systemTags = useMemo(() => catalogTagsForCategories(['System']), []);

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

  const renderCategorySection = (
    category: MergeTagCategory,
    title: string,
    tags: MergeTag[],
    search: string,
    setSearch: (v: string) => void,
    placeholder: string
  ) => {
    const Icon = CATEGORY_ICON[category];
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-3.5 h-3.5 text-sky-blue" />
          <span className="text-xs font-medium">{title}</span>
        </div>
        {renderTagList(tags, search, setSearch, placeholder)}
      </div>
    );
  };

  const jobUrl = job?.url || job?.view_url;

  const quickLinks = [
    { name: 'Unsubscribe', value: '{{unsubscribeLink}}' },
    { name: 'Email Recruiter', value: 'mailto:{{senderEmail}}' },
    { name: 'Recruiter LinkedIn', value: '{{senderLinkedinUrl}}' },
    ...(campaignJobId ? [{ name: 'Apply to Job', value: '{{jobUrl}}' }] : []),
  ];

  const categorySections: ReactNode = (
    <div className="space-y-4 pr-1">
      {renderCategorySection('Sender', 'Sender', senderTags, senderSearch, setSenderSearch, 'Search sender…')}
      {renderCategorySection('Candidate', 'Candidate', candidateTags, candidateSearch, setCandidateSearch, 'Search candidate…')}
      {renderCategorySection('Campaign', 'Campaign', campaignTags, campaignSearch, setCampaignSearch, 'Search campaign…')}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-3.5 h-3.5 text-sky-blue" />
          <span className="text-xs font-medium">Job</span>
        </div>
        {renderTagList(jobTags, jobSearch, setJobSearch, 'Search job…')}

        {campaignJobId && job && (
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

      {renderCategorySection('System', 'System', systemTags, systemSearch, setSystemSearch, 'Search system…')}
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
