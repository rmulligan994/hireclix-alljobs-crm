"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, ExternalLink, MapPin, Building2, Loader2 } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import type { StandardJob } from '@/config/webflowJobMapping';

const Jobs = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const { data: jobs, isLoading, error } = useJobs();

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-sky-blue" />
              Jobs
            </h1>
            <p className="font-body text-muted-foreground">
              Open positions from your HireClix career site (read-only)
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border">
            {isLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-destructive font-medium mb-2">
                  {error instanceof Error ? error.message : 'Failed to load jobs'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Configure in Settings → Career Site (collection ID and API token)
                </p>
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No open jobs found. Add jobs to your career site CMS collection and publish them.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-deep-sea hover:bg-deep-sea">
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>

      <AICopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
};

function JobRow({ job }: { job: StandardJob }) {
  return (
    <TableRow className="cursor-default">
      <TableCell>
        <div className="font-medium text-foreground">{job.title}</div>
        {job.description && (
          <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {job.description}
          </div>
        )}
      </TableCell>
      <TableCell>
        {job.department ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            {job.department}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {job.location ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {job.location}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">
          {job.type ?? '—'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-blue hover:underline"
          >
            View <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default Jobs;
