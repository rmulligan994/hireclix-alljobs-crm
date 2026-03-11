const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

export type LeadUsageStatus = "red" | "yellow" | "green";

export function getLeadUsageStatus(lastActivityAt: Date | null): LeadUsageStatus {
  if (!lastActivityAt) return "green";
  const now = Date.now();
  const elapsed = now - lastActivityAt.getTime();
  if (elapsed < TWO_WEEKS_MS) return "red";
  if (elapsed < TWO_MONTHS_MS) return "yellow";
  return "green";
}

export function getLeadUsageTooltip(status: LeadUsageStatus): string {
  switch (status) {
    case "red":
      return "Recent activity: added to database, emailed, or called within 2 weeks";
    case "yellow":
      return "Last contact was 2 weeks–2 months ago";
    case "green":
      return "No contact in over 2 months — unused lead";
  }
}
