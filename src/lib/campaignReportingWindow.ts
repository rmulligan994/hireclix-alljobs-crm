/**
 * Resolves the reporting time range for campaign summary metrics and Mailgun.
 * - No active from/to: month-to-date (1st of current month 00:00 local → now).
 * - Both set: that inclusive calendar range (local start/end of day).
 * - Only from: from 00:00 local through now.
 * - Only to: 1st of that month 00:00 local through that day 23:59:59.999.
 */

export type CampaignReportingWindow = {
  start: Date;
  end: Date;
  /** User-visible label, e.g. "This month to date" or a date range */
  label: string;
  /** True when the window is the default MTD (list filters or stats preset) */
  isMtdDefault: boolean;
};

export type StatsPeriodPreset = "7d" | "30d" | "mtd";

function formatDateShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function getCampaignReportingWindow(
  activeTimeFrom: string,
  activeTimeTo: string,
  now: Date = new Date()
): CampaignReportingWindow {
  const fromTrim = activeTimeFrom?.trim() ?? "";
  const toTrim = activeTimeTo?.trim() ?? "";
  const hasFrom = Boolean(fromTrim);
  const hasTo = Boolean(toTrim);

  if (!hasFrom && !hasTo) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = now;
    return {
      start,
      end,
      label: `This month to date · ${formatDateShort(start)} – ${formatDateShort(end)}`,
      isMtdDefault: true,
    };
  }

  if (hasFrom && hasTo) {
    const start = new Date(`${fromTrim}T00:00:00`);
    const end = new Date(`${toTrim}T23:59:59.999`);
    return {
      start,
      end,
      label: `${formatDateShort(start)} – ${formatDateShort(end)}`,
      isMtdDefault: false,
    };
  }

  if (hasFrom && !hasTo) {
    const start = new Date(`${fromTrim}T00:00:00`);
    return {
      start,
      end: now,
      label: `${formatDateShort(start)} – ${formatDateShort(now)}`,
      isMtdDefault: false,
    };
  }

  // to only
  const toDate = new Date(`${toTrim}T00:00:00`);
  const start = new Date(toDate.getFullYear(), toDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(`${toTrim}T23:59:59.999`);
  return {
    start,
    end,
    label: `${formatDateShort(start)} – ${formatDateShort(end)}`,
    isMtdDefault: false,
  };
}

/** ISO strings for Supabase .gte / .lte on timestamptz */
export function toIsoRange(w: CampaignReportingWindow): { startIso: string; endIso: string } {
  return { startIso: w.start.toISOString(), endIso: w.end.toISOString() };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Preset windows for the statistics / Mailgun strip (independent of list “active time” filters).
 * Mailgun retention is limited (often ~30d for day resolution); 7d / 30d / MTD stay within typical limits.
 */
export function getStatsPeriodWindow(
  preset: StatsPeriodPreset,
  now: Date = new Date()
): CampaignReportingWindow {
  const end = now;

  if (preset === "mtd") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return {
      start,
      end,
      label: `Month to date · ${formatDateShort(start)} – ${formatDateShort(end)}`,
      isMtdDefault: true,
    };
  }

  if (preset === "7d") {
    const start = new Date(end.getTime() - 7 * DAY_MS);
    return {
      start,
      end,
      label: `Last 7 days · ${formatDateShort(start)} – ${formatDateShort(end)}`,
      isMtdDefault: false,
    };
  }

  // 30d
  const start = new Date(end.getTime() - 30 * DAY_MS);
  return {
    start,
    end,
    label: `Last 30 days · ${formatDateShort(start)} – ${formatDateShort(end)}`,
    isMtdDefault: false,
  };
}
