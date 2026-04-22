import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { hhmm24ToParts, partsToHhmm24 } from '@/lib/time12h';

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export interface TimePicker12hProps {
  /** 24h `HH:mm` e.g. `16:15` */
  value: string;
  onValueChange: (hhmm: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  /** Visually hidden label for screen readers */
  'aria-label'?: string;
}

/**
 * 12-hour time control (hour + minute + AM/PM). Submits/reads `HH:mm` in 24h for the rest of the app.
 */
export function TimePicker12h({ value, onValueChange, id, className, disabled, 'aria-label': ariaLabel }: TimePicker12hProps) {
  const { hour12, minute, isAm } = useMemo(() => hhmm24ToParts(value), [value]);
  /** While typing minutes, allow partial input (e.g. `1` before `15`) without forcing `00` on empty. */
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);

  const update = (next: { hour12?: number; minute?: number; isAm?: boolean }) => {
    onValueChange(
      partsToHhmm24(
        next.hour12 ?? hour12,
        next.minute ?? minute,
        next.isAm ?? isAm,
      ),
    );
  };

  const commitMinuteFromString = (raw: string) => {
    if (raw === '') {
      update({ minute: 0 });
      return;
    }
    const n = Math.min(59, Math.max(0, parseInt(raw, 10) || 0));
    update({ minute: n });
  };

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      id={id}
      role="group"
      aria-label={ariaLabel ?? 'Time'}
    >
      <Select
        value={String(hour12)}
        disabled={disabled}
        onValueChange={(v) => update({ hour12: parseInt(v, 10) })}
      >
        <SelectTrigger className="w-[72px] h-9" aria-label="Hour">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS_12.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-sm" aria-hidden>
        :
      </span>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        disabled={disabled}
        className="w-12 h-9 text-center font-mono tabular-nums px-1"
        aria-label="Minute"
        value={minuteDraft !== null ? minuteDraft : String(minute).padStart(2, '0')}
        onFocus={() => {
          setMinuteDraft(String(minute).padStart(2, '0'));
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
          setMinuteDraft(raw);
          if (raw.length === 2) {
            commitMinuteFromString(raw);
            setMinuteDraft(null);
          }
        }}
        onBlur={() => {
          if (minuteDraft === null) return;
          const raw = minuteDraft;
          setMinuteDraft(null);
          commitMinuteFromString(raw);
        }}
      />
      <Select
        value={isAm ? 'am' : 'pm'}
        disabled={disabled}
        onValueChange={(v) => update({ isAm: v === 'am' })}
      >
        <SelectTrigger className="w-[80px] h-9" aria-label="AM or PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="am">AM</SelectItem>
          <SelectItem value="pm">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TimePicker12hWithLabel({ label, ...props }: TimePicker12hProps & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <Label className="text-sm text-muted-foreground shrink-0">{label}</Label>
      <TimePicker12h {...props} />
    </div>
  );
}
