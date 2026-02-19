"use client";

import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Briefcase, ExternalLink, MapPin, Building2, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import type { StandardJob } from '@/config/webflowJobMapping';

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const Jobs = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isFetching } = useJobs(page);
  const jobs = data?.jobs ?? [];
  const pagination = data?.pagination;

  const filteredJobs = useMemo(() => {
    if (!jobs.length) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => {
      const titleMatch = job.title?.toLowerCase().includes(q);
      const reqIdMatch = job.reqId?.toLowerCase().includes(q);
      return titleMatch || reqIdMatch;
    });
  }, [jobs, searchQuery]);

  const latestUpdated = useMemo(() => {
    if (!jobs?.length) return null;
    const dates = jobs
      .map((j) => j.lastUpdated)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates)).toISOString();
  }, [jobs]);

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
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Briefcase className="w-8 h-8 text-sky-blue" />
                Jobs
              </h1>
              <p className="font-body text-muted-foreground">
                Open positions from your HireClix career site (read-only)
              </p>
            </div>
            {latestUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {formatLastUpdated(latestUpdated)}
              </p>
            )}
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
            ) : data && pagination?.total === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No open jobs found. Add jobs to your career site CMS collection and publish them.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by job title or req ID (current page)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
                    />
                    {isFetching ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
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
                    {filteredJobs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No jobs match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJobs.map((job) => (
                        <JobRow key={job.id} job={job} />
                      ))
                    )}
                  </TableBody>
                </Table>
                {pagination && pagination.totalPages > 1 && (
                  <div className="p-4 border-t border-border flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={pagination.page <= 1 || isFetching}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={pagination.page >= pagination.totalPages || isFetching}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <AICopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
};

function JobRow({ job }: { job: StandardJob }) {
  const viewHref = job.viewUrl || job.url;

  return (
    <TableRow className="cursor-default">
      <TableCell>
        <div className="font-medium text-foreground">{job.title}</div>
        {job.reqId && (
          <div className="text-xs text-muted-foreground mt-0.5">Req #{job.reqId}</div>
        )}
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
        <span className="text-muted-foreground">{job.type ?? '—'}</span>
      </TableCell>
      <TableCell className="text-right">
        {viewHref ? (
          <a
            href={viewHref}
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
