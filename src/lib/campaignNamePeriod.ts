import { format } from 'date-fns';

/** Appends " · {Month} {Year}" to the name when missing, for list/search clarity. */
export function ensureCampaignNameWithPeriod(name: string): string {
  const t = name.trim() || 'Untitled';
  const period = format(new Date(), 'MMMM yyyy');
  if (t.includes(period)) return t;
  return `${t} · ${period}`;
}
