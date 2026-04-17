/**
 * Webflow Data API v2 — site assets (Designer-uploaded files).
 * @see https://developers.webflow.com/data/reference/assets/assets/list
 */

const WEBFLOW_DATA_API = 'https://api.webflow.com/v2';

export interface NormalizedWebflowAsset {
  id: string;
  url: string;
  name: string;
  dimensions?: { width: number; height: number };
}

type WebflowAssetRow = {
  id: string;
  displayName?: string | null;
  /** v2 Data API variants */
  hostedUrl?: string | null;
  hostUrl?: string | null;
  absoluteUrl?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
};

type ListAssetsResponse = {
  assets?: WebflowAssetRow[];
  pagination?: { total?: number; limit?: number; offset?: number };
};

export async function fetchWebflowSiteAssetsPage(
  siteId: string,
  apiToken: string,
  opts?: { offset?: number; limit?: number },
): Promise<{ assets: NormalizedWebflowAsset[]; total: number }> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 100));
  const offset = Math.max(0, opts?.offset ?? 0);
  const url = `${WEBFLOW_DATA_API}/sites/${encodeURIComponent(siteId)}/assets?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Webflow ${res.status}: ${text.slice(0, 500)}`);
  }
  let data: ListAssetsResponse;
  try {
    data = JSON.parse(text) as ListAssetsResponse;
  } catch {
    throw new Error('Invalid JSON from Webflow assets API');
  }
  const raw = data.assets ?? [];
  const assets: NormalizedWebflowAsset[] = [];
  for (const a of raw) {
    const urlStr = a.hostedUrl || a.hostUrl || a.absoluteUrl || a.url || '';
    if (!urlStr) continue;
    assets.push({
      id: a.id,
      name: (a.displayName?.trim() || 'Image').slice(0, 200),
      url: urlStr,
      dimensions:
        a.width != null && a.height != null && a.width > 0 && a.height > 0
          ? { width: a.width, height: a.height }
          : undefined,
    });
  }
  const total = data.pagination?.total ?? assets.length;
  return { assets, total };
}
