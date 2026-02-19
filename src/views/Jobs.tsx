"use client";

import { useState, useMemo, useEffect } from 'react';
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
import { Briefcase, ExternalLink, MapPin, Building2, RefreshCw, Search, ChevronLeft, ChevronRight, CloudDownload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useJobsSyncLogs, useTriggerJobsSync } from '@/hooks/useJobsSync';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
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
  const [syncJustTriggered, setSyncJustTriggered] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isFetching } = useJobs(page, debouncedSearch || undefined);
  const { data: syncLogs } = useJobsSyncLogs(syncJustTriggered ? 3000 : undefined);
  const triggerSync = useTriggerJobsSync();
  const { toast } = useToast();
  const jobs = data?.jobs ?? [];
  const pagination = data?.pagination;
  const lastSync = syncLogs?.[0];

  useEffect(() => {
    if (!syncJustTriggered) return;
    const t = setTimeout(() => setSyncJustTriggered(false), 30000);
    return () => clearTimeout(t);
  }, [syncJustTriggered]);

  const handleSyncNow = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => {
        setSyncJustTriggered(true);
        toast({ title: 'Sync started', description: 'Jobs are syncing in the background. Status will update shortly.' });
      },
      onError: (err) => {
        toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
      },
    });
  };

  const displayJobs = jobs;

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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              {latestUpdated && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {formatLastUpdated(latestUpdated)}
                </p>
              )}
              {lastSync && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {lastSync.status === 'running' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {lastSync.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {lastSync.status === 'failed' && (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  Last sync: {formatLastUpdated(lastSync.completed_at ?? lastSync.started_at)}
                  {lastSync.status === 'success' && ` (${lastSync.jobs_upserted} jobs)`}
                  {lastSync.status === 'failed' && lastSync.error_message && (
                    <span className="text-destructive" title={lastSync.error_message}>
                      — Failed
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by job title or req ID"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              {pagination && pagination.total > 0 && (
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={triggerSync.isPending}
                >
                <CloudDownload
                  className={`w-4 h-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`}
                />
                  {triggerSync.isPending ? 'Syncing...' : 'Sync now'}
                </Button>
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
            </div>
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
                {debouncedSearch ? (
                  <>
                    <p className="text-muted-foreground mb-2 font-medium">
                      No jobs match your search.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try a different search term or clear the search to see all jobs.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-2">
                      No open jobs found. Jobs sync from your career site every 15 minutes.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Configure in Settings → Career Site, then use &quot;Sync now&quot; or wait for the next sync.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
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
                    {displayJobs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          {debouncedSearch
                            ? 'No jobs match your search. Try a different term.'
                            : 'No jobs on this page.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayJobs.map((job) => (
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
