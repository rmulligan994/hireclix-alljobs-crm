"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderPlus, Plus } from 'lucide-react';
import { useCampaignFolders, useCreateCampaignFolder } from '@/hooks/useCampaignFolders';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CampaignFolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  isMyCampaigns?: boolean;
  campaigns?: Array<{ folder_id?: string | null }>;
}

export const CampaignFolderSidebar = ({
  selectedFolderId,
  onSelectFolder,
  isMyCampaigns = true,
  campaigns = [],
}: CampaignFolderSidebarProps) => {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { data: folders, isLoading } = useCampaignFolders();
  const createFolder = useCreateCampaignFolder();
  const { toast } = useToast();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder.mutateAsync(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
      toast({ title: 'Folder created' });
    } catch {
      toast({ title: 'Failed to create folder', variant: 'destructive' });
    }
  };

  if (!isMyCampaigns) return null;

  return (
    <div className="w-48 shrink-0 space-y-2">
      <Label className="text-xs text-muted-foreground">Folders</Label>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between',
            selectedFolderId === null
              ? 'bg-sky-blue/20 text-sky-blue font-medium'
              : 'hover:bg-muted text-muted-foreground'
          )}
        >
          All
          <span className="text-xs text-muted-foreground tabular-nums">{campaigns.length}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectFolder('uncategorized')}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between',
            selectedFolderId === 'uncategorized'
              ? 'bg-sky-blue/20 text-sky-blue font-medium'
              : 'hover:bg-muted text-muted-foreground'
          )}
        >
          Uncategorized
          <span className="text-xs text-muted-foreground tabular-nums">
            {campaigns.filter((c) => !c.folder_id).length}
          </span>
        </button>
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
        ) : (
          folders?.map((folder) => {
            const count = campaigns.filter((c) => c.folder_id === folder.id).length;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2',
                  selectedFolderId === folder.id
                    ? 'bg-sky-blue/20 text-sky-blue font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FolderPlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}</span>
              </button>
            );
          })
        )}
        {showNewFolder ? (
          <div className="px-2 py-2 space-y-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
                Create
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewFolder(true)}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New folder
          </button>
        )}
      </div>
    </div>
  );
};
