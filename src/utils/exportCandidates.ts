/**
 * Export candidates to CSV format.
 * Supports custom column selection and proper escaping for CSV.
 */

export interface ExportableCandidate {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
  source?: string;
  tags?: string[];
  skills?: string[];
  linkedinUrl?: string;
  createdAt?: Date;
}

const DEFAULT_COLUMNS: (keyof ExportableCandidate)[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'title',
  'location',
  'source',
  'tags',
  'linkedinUrl',
  'createdAt',
];

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getColumnValue(candidate: ExportableCandidate, column: keyof ExportableCandidate): string {
  const value = candidate[column];
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
}

function getColumnHeader(column: keyof ExportableCandidate): string {
  const headers: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    title: 'Title',
    location: 'Location',
    source: 'Source',
    tags: 'Tags',
    skills: 'Skills',
    linkedinUrl: 'LinkedIn URL',
    createdAt: 'Date Added',
    id: 'ID',
  };
  return headers[column] ?? column;
}

/**
 * Export candidates to CSV and trigger download.
 * @param candidates - Array of candidates to export
 * @param columns - Optional array of column keys. Defaults to standard candidate fields.
 * @param filename - Optional filename for the download
 */
export function exportCandidatesToCsv(
  candidates: ExportableCandidate[],
  columns?: (keyof ExportableCandidate)[],
  filename?: string
): void {
  const cols = columns ?? DEFAULT_COLUMNS;
  const headerRow = cols.map((c) => escapeCsvValue(getColumnHeader(c))).join(',');

  const dataRows = candidates.map((candidate) => {
    return cols
      .map((col) => {
        let value = getColumnValue(candidate, col);
        if (col === 'tags' && !value && candidate.skills?.length) {
          value = candidate.skills.join('; ');
        }
        return escapeCsvValue(value);
      })
      .join(',');
  });

  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `candidates-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
