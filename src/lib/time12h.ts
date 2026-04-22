/** Parse `HH:mm` (24h) to 12h clock parts. */
export function hhmm24ToParts(hhmm: string): { hour12: number; minute: number; isAm: boolean } {
  const s = (hhmm || '09:00').trim();
  const match = s.match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) {
    return { hour12: 9, minute: 0, isAm: true };
  }
  let h = parseInt(match[1], 10);
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10) || 0));
  if (Number.isNaN(h) || h < 0) h = 0;
  h = h % 24;
  const isAm = h < 12;
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute, isAm };
}

/** Build `HH:mm` (24h) for API / metadata. */
export function partsToHhmm24(hour12: number, minute: number, isAm: boolean): string {
  const h = Math.min(12, Math.max(1, hour12)) || 12;
  const m = Math.min(59, Math.max(0, minute));
  let h24: number;
  if (isAm) {
    h24 = h === 12 ? 0 : h;
  } else {
    h24 = h === 12 ? 12 : h + 12;
  }
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** e.g. `16:15` → `4:15 PM` */
export function formatHhmmAs12h(hhmm: string): string {
  const { hour12, minute, isAm } = hhmm24ToParts(hhmm);
  const suf = isAm ? 'AM' : 'PM';
  return `${hour12}:${String(minute).padStart(2, '0')} ${suf}`;
}
