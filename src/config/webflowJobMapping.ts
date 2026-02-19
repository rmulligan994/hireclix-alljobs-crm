/**
 * Standard job field names used across the Jobs tab.
 * Webflow CMS collections use custom field names per client - this mapping
 * normalizes them to a consistent schema for display.
 */

export const STANDARD_JOB_FIELDS = [
  'title',
  'department',
  'location',
  'type',
  'description',
  'url',
  'postedDate',
] as const;

export type StandardJobField = (typeof STANDARD_JOB_FIELDS)[number];

export interface StandardJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string | null;
  url: string | null;
  postedDate: string | null;
  /** Raw fieldData for any unmapped fields (read-only display) */
  _raw?: Record<string, unknown>;
}

/** Default mapping: common Webflow field slugs → standard names */
export const DEFAULT_FIELD_MAPPING: Record<StandardJobField, string> = {
  title: 'name',
  department: 'department',
  location: 'location',
  type: 'job-type',
  description: 'description',
  url: 'url',
  postedDate: 'posted-date',
};

export type WebflowFieldMapping = Partial<Record<StandardJobField, string>>;

/**
 * Maps a raw Webflow CMS item to our standard job format.
 * @param item - Raw item from Webflow API (id, fieldData, etc.)
 * @param customMapping - Optional override mapping (Webflow field name → standard field)
 */
export function mapWebflowItemToStandardJob(
  item: {
    id: string;
    fieldData?: Record<string, unknown>;
    lastPublished?: string;
    lastUpdated?: string;
  },
  customMapping?: WebflowFieldMapping | null
): StandardJob {
  const fieldData = item.fieldData ?? {};
  const mapping = { ...DEFAULT_FIELD_MAPPING, ...customMapping };

  const getValue = (standardField: StandardJobField): string | null => {
    const webflowField = mapping[standardField];
    if (!webflowField) return null;
    const val = fieldData[webflowField];
    if (val == null) return null;
    if (typeof val === 'object' && val !== null && 'url' in val) {
      return (val as { url?: string }).url ?? null;
    }
    return String(val);
  };

  return {
    id: item.id,
    title: getValue('title') ?? (fieldData.name as string) ?? 'Untitled',
    department: getValue('department'),
    location: getValue('location'),
    type: getValue('type'),
    description: getValue('description'),
    url: getValue('url'),
    postedDate: getValue('postedDate'),
    _raw: fieldData,
  };
}
