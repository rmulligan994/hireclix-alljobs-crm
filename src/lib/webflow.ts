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

/**
 * Fetches all live (published) items from a Webflow collection.
 * Handles pagination to retrieve all items.
 */
export async function fetchWebflowLiveItems(
  collectionId: string,
  apiToken: string,
  options: ListLiveItemsOptions = {}
): Promise<WebflowLiveItem[]> {
  const allItems: WebflowLiveItem[] = [];
  let offset = options.offset ?? 0;
  const limit = Math.min(options.limit ?? 100, 100);

  while (true) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
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
    allItems.push(...data.items);

    const { total } = data.pagination;
    if (offset + data.items.length >= total) break;
    offset += limit;
  }

  return allItems;
}
