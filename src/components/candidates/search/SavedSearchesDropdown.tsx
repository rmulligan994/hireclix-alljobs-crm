import { useState } from 'react';
import { Bookmark, ChevronDown, Pencil, Trash2, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CandidateFilters } from '@/lib/candidateSearch';
import type { AdvancedSearchFields } from './AdvancedSearchPanel';
import type { SortOption } from './SortDropdown';

export interface SavedSearch {
  id: string;
  name: string;
  filters: CandidateFilters;
  searchQuery: string;
  advancedFields?: AdvancedSearchFields;
  sortOption?: SortOption;
  createdAt: Date;
}

interface SavedSearchesDropdownProps {
  savedSearches: SavedSearch[];
  recentSearches: string[];
  onSelect: (search: SavedSearch) => void;
  onApplyRecentSearch: (query: string) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  hasActiveFilters: boolean;
}

export const SavedSearchesDropdown = ({
  savedSearches,
  recentSearches,
  onSelect,
  onApplyRecentSearch,
  onSave,
  onDelete,
  onRename,
  hasActiveFilters,
}: SavedSearchesDropdownProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);

  const handleSave = () => {
    if (searchName.trim()) {
      onSave(searchName.trim());
      setSearchName('');
      setSaveDialogOpen(false);
    }
  };

  const handleRename = () => {
    if (editingSearch && searchName.trim()) {
      onRename(editingSearch.id, searchName.trim());
      setSearchName('');
      setEditingSearch(null);
      setRenameDialogOpen(false);
    }
  };

  const openRenameDialog = (search: SavedSearch) => {
    setEditingSearch(search);
    setSearchName(search.name);
    setRenameDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-border text-foreground">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved Searches
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover border-border max-h-[320px] overflow-y-auto">
          {recentSearches.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {recentSearches.slice(0, 5).map((query, idx) => (
                <DropdownMenuItem
                  key={idx}
                  className="cursor-pointer truncate"
                  onClick={() => onApplyRecentSearch(query)}
                >
                  <span className="truncate" title={query}>{query}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          {savedSearches.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                Saved
              </div>
              {savedSearches.map(search => (
                <DropdownMenuItem
                  key={search.id}
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => onSelect(search)}
                >
                  <span className="truncate">{search.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={e => {
                        e.stopPropagation();
                        openRenameDialog(search);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(search.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {savedSearches.length === 0 && recentSearches.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No saved searches yet
            </div>
          )}
          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-sky-blue cursor-pointer"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Current Search
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give your search a name to quickly access it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="e.g., Senior React Engineers in SF"
              className="mt-2"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-sky-blue hover:bg-sky-blue/90 text-white">
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingSearch(null);
          setRenameDialogOpen(open);
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Rename Search</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-search">Search Name</Label>
            <Input
              id="rename-search"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="mt-2"
              onKeyDown={e => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} className="bg-sky-blue hover:bg-sky-blue/90 text-white">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
