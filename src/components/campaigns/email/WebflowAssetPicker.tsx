import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiBase } from '@/lib/api';

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error(
      'The server returned a web page instead of API data. If this app runs under a path (e.g. /crm), set NEXT_PUBLIC_BASE_URL to that path and redeploy.',
    );
  }
  if (!trimmed) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid response (${res.status}). Expected JSON from /api/webflow/assets.`);
  }
}

/** Minimal asset shape compatible with EmailComposer block image updates. */
export type WebflowAsset = {
  id: string;
  url: string;
  name: string;
  dimensions?: { width: number; height: number };
};

interface WebflowAssetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: WebflowAsset) => void;
  siteId?: string;
}

export function WebflowAssetPicker({ open, onOpenChange, onSelect }: WebflowAssetPickerProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Image');
  const [remoteAssets, setRemoteAssets] = useState<WebflowAsset[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRemoteAssets(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoadError('Sign in required');
          setRemoteAssets([]);
          return;
        }
        const apiRoot = getApiBase();
        const res = await fetch(`${apiRoot}/api/webflow/assets?limit=100`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = (await parseJsonResponse(res)) as {
          assets?: WebflowAsset[];
          error?: string;
          hint?: string;
          detail?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error === 'Webflow not configured' ? (data.hint ?? data.error) : data.detail || data.error || 'Failed to load');
          setRemoteAssets([]);
          return;
        }
        setRemoteAssets(data.assets ?? []);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load assets');
          setRemoteAssets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleApplyUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Enter an image URL');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error('URL must start with http:// or https://');
      return;
    }
    onSelect({ id: `url-${Date.now()}`, url: trimmed, name: name.trim() || 'Image' });
    setUrl('');
    setName('Image');
    onOpenChange(false);
  };

  const pickRemote = (a: WebflowAsset) => {
    onSelect(a);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose image</DialogTitle>
          <DialogDescription>
            Pick from your Webflow site assets (requires token with assets:read in Settings → Career Site), or paste a public
            image URL.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 flex-1 min-h-0 flex flex-col">
          <div className="text-xs font-medium text-muted-foreground">From Webflow</div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assets…
            </div>
          )}
          {!loading && loadError && (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">{loadError}</p>
          )}
          {!loading && remoteAssets && remoteAssets.length > 0 && (
            <ScrollArea className="h-[min(240px,40vh)] border rounded-md">
              <ul className="p-1 space-y-0.5">
                {remoteAssets.map(a => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted',
                        'transition-colors',
                      )}
                      onClick={() => pickRemote(a)}
                    >
                      <div className="h-10 w-10 shrink-0 rounded border bg-muted/50 overflow-hidden flex items-center justify-center">
                        <img src={a.url} alt="" className="max-h-full max-w-full object-cover" loading="lazy" />
                      </div>
                      <span className="truncate flex-1 min-w-0">{a.name}</span>
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
          {!loading && remoteAssets && remoteAssets.length === 0 && !loadError && (
            <p className="text-xs text-muted-foreground py-2">No image assets returned from Webflow.</p>
          )}

          <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Or paste URL</div>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Alt / label" />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyUrl} disabled={!url.trim()}>
            Use URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
