'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { escapeHtml } from '@/lib/email/email-utils';
import { sanitizeEmailInlineHtml, stripHtmlToPlain } from '@/lib/email/sanitize-email-inline-html';

type Props = {
  /** Stable key so the field resets when switching blocks */
  editorKey: string;
  valuePlain: string;
  valueHtml?: string | null;
  onChange: (plain: string, html: string | null) => void;
  placeholder?: string;
  minHeightClass?: string;
  singleLine?: boolean;
  className?: string;
};

function Toolbar({ onCmd }: { onCmd: (cmd: string, val?: string) => void }) {
  return (
    <div className="flex flex-wrap gap-0.5 items-center border-b border-border/60 bg-muted/30 px-1 py-0.5 rounded-t-md">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => onCmd('bold')} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => onCmd('italic')} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <label className="inline-flex items-center gap-0.5 cursor-pointer px-1" title="Text color">
        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="color"
          className="h-6 w-7 p-0 border-0 bg-transparent cursor-pointer"
          defaultValue="#1a1a2e"
          onMouseDown={(e) => e.preventDefault()}
          onInput={(e) => onCmd('foreColor', (e.target as HTMLInputElement).value)}
        />
      </label>
    </div>
  );
}

/**
 * contentEditable with a small inline toolbar. Output is sanitized before storage and at send time.
 * Bold / italic / color generally survive in major clients when emitted as inline HTML.
 */
export function RichTextInlineEditor({
  editorKey,
  valuePlain,
  valueHtml,
  onChange,
  placeholder,
  minHeightClass = 'min-h-[80px]',
  singleLine,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const wantHtml = valueHtml?.trim();
    const display = wantHtml ? sanitizeEmailInlineHtml(wantHtml) : escapeHtml(valuePlain).replace(/\n/g, '<br/>');
    if (el.innerHTML !== display) {
      el.innerHTML = display || '';
    }
  }, [valuePlain, valueHtml]);

  useEffect(() => {
    syncFromProps();
  }, [editorKey, syncFromProps]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const sanitized = sanitizeEmailInlineHtml(el.innerHTML);
    const plain = stripHtmlToPlain(sanitized);
    const hasRich = /<[a-z][\s\S]*>/i.test(sanitized);
    onChange(plain, hasRich && sanitized.trim() ? sanitized : null);
  }, [onChange]);

  const runCmd = (cmd: string, val?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(cmd, false, val);
    } catch {
      /* noop */
    }
    emit();
  };

  return (
    <div className={cn('rounded-md border border-input overflow-hidden bg-background', className)}>
      <Toolbar onCmd={runCmd} />
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          minHeightClass,
        )}
        onBlur={() => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          emit();
        }}
        onInput={() => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            emit();
          }, 400);
        }}
        onKeyDown={(e) => {
          if (singleLine && e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        data-placeholder={placeholder || ''}
      />
    </div>
  );
}
