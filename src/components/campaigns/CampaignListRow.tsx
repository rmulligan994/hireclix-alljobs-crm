"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Play,
  Pause,
  Trash2,
  Send,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  UserPlus,
  Archive,
  ArchiveRestore,
  MoreVertical,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Campaign, CampaignFolder } from '@/types/Campaign';
import type { CampaignStats } from '@/hooks/useCampaignStats';
import { CampaignScheduledQueue } from '@/components/campaigns/CampaignScheduledQueue';
import { cn } from '@/lib/utils';

export type ListDensity = 'comfortable' | 'compact';

interface CampaignListRowProps {
  campaign: Campaign;
  stats: CampaignStats | undefined;
  scopeTab: 'my' | 'org' | 'archived';
  currentUserId: string;
  folders: CampaignFolder[] | undefined;
  density: ListDensity;
  sendingCampaignId: string | null;
  duplicatingCampaignId: string | null;
  expandedQueueCampaignId: string | null;
  onExpandQueue: (id: string | null) => void;
  onView: (c: Campaign) => void;
  onDuplicate: (c: Campaign) => void;
  onLaunch: (id: string) => void;
  /** When a scheduled campaign has pending recipients, queue them for `campaigns.scheduled_at` instead of sending now. */
  onRequeuePendingForScheduledTime?: (id: string) => void | Promise<void>;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onAddRecipients: (id: string) => void;
  onMoveToFolder: (campaignId: string, folderId: string | null) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  getStatusBadgeClass: (status: string) => string;
}

export function CampaignListRow({
  campaign,
  stats,
  scopeTab,
  currentUserId,
  folders,
  density,
  sendingCampaignId,
  duplicatingCampaignId,
  expandedQueueCampaignId,
  onExpandQueue,
  onView,
  onDuplicate,
  onLaunch,
  onRequeuePendingForScheduledTime,
  onPause,
  onResume,
  onAddRecipients,
  onMoveToFolder,
  onArchive,
  onUnarchive,
  onDelete,
  getStatusBadgeClass,
}: CampaignListRowProps) {
  const [sendNowDialogOpen, setSendNowDialogOpen] = useState(false);
  const isOwner = campaign.user_id === currentUserId;
  const compact = density === 'compact';
  const s = stats;
  const pending = s?.pending ?? 0;
  const hasQueue =
    (s?.scheduled ?? 0) > 0 && campaign.status === 'scheduled' && isOwner;
  const actionBtn = compact ? 'h-8 text-xs' : 'h-9 text-sm';
  const ico = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const icoMr = 'mr-1.5';

  return (
    <Card
      className={cn(
        'hover:border-sky-blue/50 transition-colors py-0 gap-0 overflow-hidden',
        compact && 'shadow-sm'
      )}
    >
      <CardContent
        className={cn('p-0', compact ? 'px-4 py-3' : 'px-5 py-4')}
      >
        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center sm:justify-between',
            compact
              ? 'gap-1.5 sm:gap-3'
              : 'gap-2.5 sm:gap-4'
          )}
        >
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'font-semibold text-foreground leading-snug break-words w-full',
                compact ? 'text-base' : 'text-lg'
              )}
            >
              {campaign.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge
                className={cn(
                  'shrink-0',
                  !compact && 'text-sm px-2.5 py-0.5',
                  getStatusBadgeClass(campaign.status)
                )}
              >
                {campaign.status}
              </Badge>
              <Badge
                variant="secondary"
                className={cn('shrink-0 font-normal', compact ? 'text-xs' : 'text-sm px-2.5 py-0.5')}
              >
                {campaign.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(campaign.created_at), compact ? 'MMM d, yyyy' : 'PPP')}
              {campaign.scheduled_at && (
                <> · Sched {format(new Date(campaign.scheduled_at), compact ? 'MMM d p' : 'PPP p')}</>
              )}
            </p>
            {/* Inline mini stats */}
            {s && (
              <div
                className={cn(
                  'flex flex-wrap text-muted-foreground tabular-nums',
                  'gap-x-4 gap-y-1 text-sm',
                  compact ? 'mt-1.5' : 'mt-2'
                )}
              >
                <span>
                  Recipients: <span className="text-foreground font-medium">{s.recipients}</span>
                </span>
                <span>
                  Sent: <span className="text-foreground font-medium">{s.sent}</span>
                </span>
                <span>
                  Pending: <span className="text-foreground font-medium">{pending}</span>
                </span>
                <span>
                  Open rate: <span className="text-sky-blue font-medium">{s.openRate}%</span>
                </span>
                <span>
                  Click rate: <span className="text-sunrise font-medium">{s.clickRate}%</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 shrink-0">
            {isOwner && campaign.status === 'active' && pending > 0 && (
              <Button
                variant="outline"
                size="sm"
                className={cn('border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white', actionBtn)}
                onClick={() => onLaunch(campaign.id)}
                disabled={sendingCampaignId === campaign.id}
              >
                {sendingCampaignId === campaign.id ? (
                  <Loader2 className={cn(ico, icoMr, 'animate-spin')} />
                ) : (
                  <Send className={cn(ico, icoMr)} />
                )}
                {sendingCampaignId === campaign.id ? '…' : `Send ${pending}`}
              </Button>
            )}
            {isOwner && campaign.status === 'active' && pending === 0 && (
              <Button
                variant="outline"
                size="sm"
                className={cn('border-sunrise text-sunrise', actionBtn)}
                onClick={() => onPause(campaign.id)}
              >
                <Pause className={cn(ico, 'mr-1')} />
                Pause
              </Button>
            )}
            {isOwner && campaign.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                className={cn('border-sky-blue text-sky-blue', actionBtn)}
                onClick={() => onLaunch(campaign.id)}
                disabled={sendingCampaignId === campaign.id}
              >
                {sendingCampaignId === campaign.id ? (
                  <Loader2 className={cn(ico, icoMr, 'animate-spin')} />
                ) : (
                  <Send className={cn(ico, icoMr)} />
                )}
                Launch
              </Button>
            )}
            {isOwner && campaign.status === 'scheduled' && pending > 0 && (
              <AlertDialog open={sendNowDialogOpen} onOpenChange={setSendNowDialogOpen}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white', actionBtn)}
                  onClick={() => setSendNowDialogOpen(true)}
                  disabled={sendingCampaignId === campaign.id}
                >
                  {sendingCampaignId === campaign.id ? (
                    <Loader2 className={cn(ico, icoMr, 'animate-spin')} />
                  ) : (
                    <Send className={cn(ico, icoMr)} />
                  )}
                  {sendingCampaignId === campaign.id ? '…' : `Send now (${pending})`}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send first email now?</AlertDialogTitle>
                    <AlertDialogDescription className="text-left space-y-2">
                      <span className="block">
                        {pending} recipient{pending === 1 ? ' is' : 's are'} still <strong>pending</strong> and not in the
                        scheduled send queue. Sending now delivers the first email <strong>immediately</strong>, not on your
                        next queued run.
                      </span>
                      {campaign.scheduled_at && (
                        <span className="block text-muted-foreground">
                          This campaign is otherwise set for {format(new Date(campaign.scheduled_at), 'PPP p')}.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {onRequeuePendingForScheduledTime &&
                      campaign.scheduled_at &&
                      new Date(campaign.scheduled_at).getTime() > Date.now() && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setSendNowDialogOpen(false);
                            void onRequeuePendingForScheduledTime(campaign.id);
                          }}
                        >
                          Add to queue for scheduled time
                        </Button>
                      )}
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-sky-blue hover:bg-sky-blue/90"
                      onClick={() => {
                        setSendNowDialogOpen(false);
                        onLaunch(campaign.id);
                      }}
                    >
                      Send now
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isOwner && campaign.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                className={cn('border-sky-blue text-sky-blue', actionBtn)}
                onClick={() => onResume(campaign.id)}
              >
                <Play className={cn(ico, 'mr-1')} />
                Resume
              </Button>
            )}
            <Button variant="ghost" size="sm" className={actionBtn} onClick={() => onView(campaign)}>
              <Eye className={cn(ico, 'mr-1')} />
              View
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={actionBtn}>
                  <MoreVertical className={ico} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {['draft', 'paused', 'completed'].includes(campaign.status) && (
                  <DropdownMenuItem
                    onClick={() => onDuplicate(campaign)}
                    disabled={duplicatingCampaignId === campaign.id}
                    className="cursor-pointer"
                  >
                    {duplicatingCampaignId === campaign.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Duplicate
                  </DropdownMenuItem>
                )}
                {isOwner && (campaign.status === 'active' || campaign.status === 'scheduled') && (
                  <DropdownMenuItem
                    onClick={() => onAddRecipients(campaign.id)}
                    className="cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add recipients
                  </DropdownMenuItem>
                )}
                {isOwner && (scopeTab === 'my' || (scopeTab === 'org' && isOwner)) && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Folder className="w-4 h-4 mr-2" />
                      Move to folder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        onClick={() => onMoveToFolder(campaign.id, null)}
                        className="cursor-pointer"
                      >
                        No folder
                      </DropdownMenuItem>
                      {folders?.map((f) => (
                        <DropdownMenuItem
                          key={f.id}
                          onClick={() => onMoveToFolder(campaign.id, f.id)}
                          className="cursor-pointer"
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          {f.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuSeparator />
                {isOwner && scopeTab !== 'archived' && (
                  <DropdownMenuItem onClick={() => onArchive(campaign.id)} className="cursor-pointer">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                {isOwner && scopeTab === 'archived' && (
                  <DropdownMenuItem onClick={() => onUnarchive(campaign.id)} className="cursor-pointer">
                    <ArchiveRestore className="w-4 h-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {isOwner && (campaign.status === 'draft' || campaign.status === 'paused') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn(actionBtn, 'text-destructive')}>
                    <Trash2 className={ico} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{campaign.name}&quot;? This action cannot
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete(campaign.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {hasQueue && isOwner && (
          <div className={cn('mt-2', !compact && 'mt-3')}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-sunrise hover:text-sunrise px-1',
                compact ? 'h-7 text-xs' : 'h-8 text-sm'
              )}
              onClick={() => onExpandQueue(expandedQueueCampaignId === campaign.id ? null : campaign.id)}
            >
              {expandedQueueCampaignId === campaign.id ? (
                <ChevronUp className={cn(ico, 'mr-1')} />
              ) : (
                <ChevronDown className={cn(ico, 'mr-1')} />
              )}
              {expandedQueueCampaignId === campaign.id ? 'Hide queue' : 'View queue'}
            </Button>
            <CampaignScheduledQueue
              campaignId={campaign.id}
              scheduledAt={campaign.scheduled_at ?? null}
              isExpanded={expandedQueueCampaignId === campaign.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
