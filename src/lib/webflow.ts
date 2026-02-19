/**
 * Webflow Content Delivery API client for read-only CMS access.
 * Uses api-cdn.webflow.com for CDN-cached, high-performance delivery of published content.
 * @see https://developers.webflow.com/data/docs/working-with-the-cms/content-delivery
 * @see https://developers.webflow.com/data/reference/cms/collection-items/live-items/list-items-live
 */

const WEBFLOW_CDN_BASE = 'https://api-cdn.webflow.com/v2';

export interface WebflowLiveItem {
  id: string;
  cmsLocaleId?: string;
  lastPublished: string;
  lastUpdated: string;
  createdOn: string;
  isArchived?: boolean;
  isDraft?: boolean;
  fieldData: Record<string, unknown>;
}

export interface WebflowListItemsResponse {
  items: WebflowLiveItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ListLiveItemsOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'lastPublished' | 'name' | 'slug';
  sortOrder?: 'asc' | 'desc';
}

const WEBFLOW_MAX_LIMIT = 100;

/**
 * Fetches a single page of live items. Webflow API returns max 100 per request,
 * so we batch requests to support larger page sizes (e.g. 500).
 */
export async function fetchWebflowLiveItemsPage(
  collectionId: string,
  apiToken: string,
  options: { page?: number; limit?: number } & ListLiveItemsOptions = {}
): Promise<{ items: WebflowLiveItem[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 500), 500);
  const startOffset = (page - 1) * limit;

  const allItems: WebflowLiveItem[] = [];
  let total = 0;
  let offset = startOffset;
  let remaining = limit;

  while (remaining > 0) {
    const batchLimit = Math.min(remaining, WEBFLOW_MAX_LIMIT);
    const params = new URLSearchParams();
    params.set('limit', String(batchLimit));
    params.set('offset', String(offset));
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);

    const url = `${WEBFLOW_CDN_BASE}/collections/${collectionId}/items/live?${params}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `Career site API error ${res.status}: ${errBody || res.statusText}`
      );
    }

    const data = (await res.json()) as WebflowListItemsResponse;
    total = data.pagination.total;
    allItems.push(...data.items);

    if (data.items.length < batchLimit || allItems.length >= limit) break;
    offset += batchLimit;
    remaining = limit - allItems.length;
  }

  return { items: allItems, total };
}
