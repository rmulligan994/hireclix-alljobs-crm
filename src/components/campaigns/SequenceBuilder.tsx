import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Mail, Clock, Edit, Copy, ChevronDown, ChevronUp, CalendarDays, Send, Calendar as CalendarIcon } from 'lucide-react';
import { BeefreeEmailEditor } from './BeefreeEmailEditor';
import { CampaignEmail, ScheduleRecurrence } from '@/types/Campaign';
import { format, addDays, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type ScheduleType = 'custom' | 'daily' | 'weekly' | 'monthly' | 'specific_dates';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface SequenceMetadata {
  sendImmediately: boolean;
  firstSendDate?: string; // YYYY-MM-DD
  scheduleTime?: string; // "09:00"
  scheduleRecurrence?: ScheduleRecurrence | null;
}

interface SequenceBuilderProps {
  template?: any;
  templateBeeJson?: Record<string, unknown> | null;
  templateHtml?: string | null;
  onContinue?: (steps: Partial<CampaignEmail>[], opts?: { firstSendDate?: string; metadata?: SequenceMetadata }) => void;
  campaignJobId?: string | null;
}

interface EmailStep {
  id: string;
  order: number;
  delay: number;
  delayUnit: 'hours' | 'days' | 'weeks';
  subject: string;
  beeJson: Record<string, unknown> | null;
  htmlContent: string | null;
  expanded: boolean;
  /** For specific_dates mode: exact date for this step */
  scheduledDate?: Date | null;
}

const SCHEDULE_DESCRIPTIONS: Record<ScheduleType, string> = {
  custom: 'Set your own delay between each email (e.g., 3 days, 1 week).',
  daily: 'Each follow-up sends 1 day after the previous, at a set time.',
  weekly: 'Each follow-up sends 1 week after the previous, on a chosen weekday.',
  monthly: 'Each follow-up sends ~1 month after the previous, on a chosen day of month.',
  specific_dates: 'Pick an exact date for each email.',
};

export const SequenceBuilder = ({ template, templateBeeJson, templateHtml, onContinue, campaignJobId }: SequenceBuilderProps) => {
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledFirstDate, setScheduledFirstDate] = useState<Date | undefined>();
  const [scheduledFirstTime, setScheduledFirstTime] = useState('09:00');

  const [scheduleType, setScheduleType] = useState<ScheduleType>('custom');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<number>(1); // Monday
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(15);
  const [endOnDate, setEndOnDate] = useState<Date | undefined>();
  const [firstSendDate, setFirstSendDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [steps, setSteps] = useState<EmailStep[]>([
    {
      id: '1',
      order: 1,
      delay: 0,
      delayUnit: 'days',
      subject: 'Initial Outreach',
      beeJson: templateBeeJson || template?.bee_json || null,
      htmlContent: templateHtml || template?.html_content || null,
      expanded: true,
      scheduledDate: undefined,
    },
  ]);

  const [editingStep, setEditingStep] = useState<string | null>(null);

  // Update first step when template changes
  useEffect(() => {
    if (templateBeeJson || templateHtml) {
      setSteps(prev => prev.map((step, idx) =>
        idx === 0 ? { ...step, beeJson: templateBeeJson || step.beeJson, htmlContent: templateHtml || step.htmlContent } : step
      ));
    }
  }, [templateBeeJson, templateHtml]);

  // When switching to daily/weekly/monthly: single email only (same template repeated at schedule)
  useEffect(() => {
    if (scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'monthly') {
      setSteps(prev => prev.length > 0 ? [{ ...prev[0], order: 1 }] : prev);
    }
  }, [scheduleType]);

  // When switching to specific_dates, set default dates for steps that don't have them
  useEffect(() => {
    if (scheduleType === 'specific_dates' && firstSendDate) {
      setSteps(prev => prev.map((step, idx) => {
        if (idx === 0) return step;
        if (step.scheduledDate) return step;
        const ref = idx === 1 ? firstSendDate : prev[idx - 1].scheduledDate ?? firstSendDate;
        return { ...step, scheduledDate: addDays(ref, 3) };
      }));
    }
  }, [scheduleType, firstSendDate]);

  const addStep = () => {
    const baseDelay = scheduleType === 'daily' ? 1 : scheduleType === 'weekly' ? 7 : scheduleType === 'monthly' ? 30 : 7;
    const newStep: EmailStep = {
      id: String(Date.now()),
      order: steps.length + 1,
      delay: baseDelay,
      delayUnit: 'days',
      subject: `Email ${steps.length + 1}`,
      beeJson: null,
      htmlContent: null,
      expanded: false,
      scheduledDate: scheduleType === 'specific_dates' && firstSendDate
        ? addDays(steps[steps.length - 1]?.scheduledDate ?? firstSendDate, 3)
        : undefined,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id).map((step, idx) => ({ ...step, order: idx + 1 })));
  };

  const toggleStep = (id: string) => {
    setSteps(steps.map(step =>
      step.id === id ? { ...step, expanded: !step.expanded } : step
    ));
  };

  const duplicateStep = (id: string) => {
    const stepToDuplicate = steps.find(s => s.id === id);
    if (stepToDuplicate) {
      const newStep: EmailStep = {
        ...stepToDuplicate,
        id: String(Date.now()),
        order: steps.length + 1,
        subject: `${stepToDuplicate.subject} (Copy)`,
        scheduledDate: stepToDuplicate.scheduledDate ? addDays(stepToDuplicate.scheduledDate, 3) : undefined,
      };
      setSteps([...steps, newStep]);
    }
  };

  const handleEditorSave = (beeJson: Record<string, unknown>, html: string) => {
    if (editingStep) {
      setSteps(steps.map(s =>
        s.id === editingStep ? { ...s, beeJson, htmlContent: html } : s
      ));
      setEditingStep(null);
    }
  };

  const computeDelayForStep = (step: EmailStep, index: number): { delayDays: number; delayHours: number } => {
    if (index === 0) return { delayDays: 0, delayHours: 0 };

    if (scheduleType === 'specific_dates' && firstSendDate) {
      const refDate = index === 1 ? firstSendDate : (steps[index - 1].scheduledDate ?? firstSendDate);
      const stepDate = step.scheduledDate ?? addDays(refDate, 3);
      const ref = startOfDay(refDate);
      const stepD = startOfDay(stepDate);
      const days = differenceInDays(stepD, ref);
      const [h, m] = scheduleTime.split(':').map(Number);
      return { delayDays: Math.max(0, days), delayHours: 0 };
    }

    if (scheduleType === 'daily') {
      return { delayDays: 1, delayHours: 0 };
    }
    if (scheduleType === 'weekly') {
      return { delayDays: 7, delayHours: 0 };
    }
    if (scheduleType === 'monthly') {
      return { delayDays: 30, delayHours: 0 };
    }

    // custom
    const delayDays = step.delayUnit === 'weeks' ? step.delay * 7 :
      step.delayUnit === 'days' ? step.delay : 0;
    const delayHours = step.delayUnit === 'hours' ? step.delay : 0;
    return { delayDays, delayHours };
  };

  const handleContinue = () => {
    if (scheduleType === 'specific_dates') {
      const hasInvalidDates = steps.some((step, i) => {
        if (i === 0) return false;
        const ref = i === 1 ? firstSendDate : steps[i - 1].scheduledDate;
        const stepDate = step.scheduledDate;
        return !stepDate || (ref && stepDate < ref);
      });
      if (hasInvalidDates) return;
    }

    const emailSteps: Partial<CampaignEmail>[] = steps.map((step, index) => {
      const { delayDays, delayHours } = computeDelayForStep(step, index);
      return {
        step_order: step.order,
        delay_days: delayDays,
        delay_hours: delayHours,
        subject: step.subject,
        bee_json: step.beeJson || undefined,
        html_content: step.htmlContent || undefined,
      };
    });

    const baseRecurrence: ScheduleRecurrence | undefined =
      scheduleType === 'daily' ? { type: 'daily', time: scheduleTime } :
      scheduleType === 'weekly' ? { type: 'weekly', dayOfWeek: scheduleDayOfWeek, time: scheduleTime } :
      scheduleType === 'monthly' ? { type: 'monthly', dayOfMonth: scheduleDayOfMonth, time: scheduleTime } :
      scheduleType === 'custom' ? { type: 'custom' } :
      scheduleType === 'specific_dates' ? { type: 'specific_dates' } : undefined;
    const scheduleRecurrence = baseRecurrence && endOnDate
      ? { ...baseRecurrence, endOnDate: endOnDate.toISOString().slice(0, 10) }
      : baseRecurrence;

    const metadata: SequenceMetadata = {
      sendImmediately,
      scheduleRecurrence: scheduleRecurrence ?? null,
    };
    if (!sendImmediately) {
      if (scheduleType === 'specific_dates' && firstSendDate) {
        metadata.firstSendDate = firstSendDate.toISOString().slice(0, 10);
        metadata.scheduleTime = scheduleTime;
      } else if (scheduledFirstDate) {
        metadata.firstSendDate = scheduledFirstDate.toISOString().slice(0, 10);
        metadata.scheduleTime = scheduledFirstTime;
      }
    }

    const opts = {
      firstSendDate: metadata.firstSendDate ?? (scheduleType === 'specific_dates' && firstSendDate ? firstSendDate.toISOString().slice(0, 10) : undefined),
      metadata,
    };

    onContinue?.(emailSteps, opts);
  };

  const canContinue = () => {
    if (!sendImmediately) {
      if (scheduleType === 'specific_dates') {
        if (!firstSendDate) return false;
      } else if (!scheduledFirstDate) {
        return false;
      }
    }
    if (scheduleType === 'specific_dates') {
      if (!firstSendDate) return false;
      return steps.every((step, i) => {
        if (i === 0) return true;
        const ref = i === 1 ? firstSendDate : steps[i - 1].scheduledDate;
        const stepDate = step.scheduledDate;
        return stepDate && (!ref || stepDate >= ref);
      });
    }
    return true;
  };

  const editingStepData = editingStep ? steps.find(s => s.id === editingStep) : null;

  const renderScheduleConnector = (step: EmailStep, index: number) => {
    if (index === 0) return null;

    if (scheduleType === 'specific_dates') {
      const refDate = index === 1 ? firstSendDate : steps[index - 1].scheduledDate;
      const stepDate = step.scheduledDate;
      return (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>Send on</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-[180px] justify-start", !stepDate && "text-muted-foreground")}
                >
                  {stepDate ? format(stepDate, 'PPP') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={stepDate ?? undefined}
                  onSelect={(d) => setSteps(steps.map(s =>
                    s.id === step.id ? { ...s, scheduledDate: d ?? null } : s
                  ))}
                  disabled={(date) => {
                    const d = startOfDay(date);
                    const min = refDate ? startOfDay(refDate) : startOfDay(new Date());
                    return d < min;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      );
    }

    if (scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'monthly') {
      const label = scheduleType === 'daily' ? '1 day later' :
        scheduleType === 'weekly' ? `1 week later (${WEEKDAYS[scheduleDayOfWeek]})` :
          `~1 month later (day ${scheduleDayOfMonth})`;
      return (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{label} at {scheduleTime}</span>
          </div>
        </div>
      );
    }

    // custom
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Wait</span>
          <Input
            type="number"
            className="w-16 h-8"
            value={step.delay}
            onChange={(e) => {
              setSteps(steps.map(s =>
                s.id === step.id ? { ...s, delay: parseInt(e.target.value) || 0 } : s
              ));
            }}
          />
          <Select
            value={step.delayUnit}
            onValueChange={(value: 'hours' | 'days' | 'weeks') => {
              setSteps(steps.map(s =>
                s.id === step.id ? { ...s, delayUnit: value } : s
              ));
            }}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0">
          <BeefreeEmailEditor
            initialTemplate={editingStepData?.beeJson}
            onSave={handleEditorSave}
            onCancel={() => setEditingStep(null)}
            campaignJobId={campaignJobId}
          />
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Email Sequence</CardTitle>
              <CardDescription>
                {(scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'monthly')
                  ? 'One email, sent at your chosen schedule. Set the subject and design below.'
                  : 'Build your emails and choose when each one sends'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* When does the first email send? */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">When does the first email send?</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSendImmediately(true)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors",
                    sendImmediately ? "border-sky-blue bg-sky-blue/10 text-sky-blue" : "border-border hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Send className="w-4 h-4" />
                  Send immediately when I launch
                </button>
                <button
                  type="button"
                  onClick={() => setSendImmediately(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors",
                    !sendImmediately ? "border-sky-blue bg-sky-blue/10 text-sky-blue" : "border-border hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Schedule for later
                </button>
              </div>
              {!sendImmediately && scheduleType !== 'specific_dates' && (
                <div className="flex flex-wrap items-center gap-4 pl-1 pt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("w-[180px] justify-start", !scheduledFirstDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledFirstDate ? format(scheduledFirstDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduledFirstDate}
                        onSelect={(d) => setScheduledFirstDate(d)}
                        disabled={(date) => date < startOfDay(new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">at</Label>
                    <Input
                      type="time"
                      value={scheduledFirstTime}
                      onChange={(e) => setScheduledFirstTime(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              )}
              {!sendImmediately && scheduleType === 'specific_dates' && (
                <p className="text-xs text-muted-foreground pl-1">
                  The first email date below will be used as the scheduled start.
                </p>
              )}
            </div>

            {/* How often do follow-ups go? */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">How often do follow-ups go?</Label>
              <p className="text-xs text-muted-foreground">Choose the cadence between each email in your sequence.</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { value: 'custom' as const, label: 'Custom delays' },
                  { value: 'daily' as const, label: 'Daily' },
                  { value: 'weekly' as const, label: 'Weekly' },
                  { value: 'monthly' as const, label: 'Monthly' },
                  { value: 'specific_dates' as const, label: 'Specific dates' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleType(opt.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                      scheduleType === opt.value
                        ? "border-sky-blue bg-sky-blue/10 text-sky-blue"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{SCHEDULE_DESCRIPTIONS[scheduleType]}</p>

              {/* Options for each schedule type */}
              <div className="flex flex-wrap items-center gap-4 pl-1">
                {scheduleType === 'daily' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">At</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                {scheduleType === 'weekly' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">On</Label>
                      <Select value={String(scheduleDayOfWeek)} onValueChange={(v) => setScheduleDayOfWeek(Number(v))}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((d, i) => (
                            <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">at</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </>
                )}
                {scheduleType === 'monthly' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">On day</Label>
                      <Select value={String(scheduleDayOfMonth)} onValueChange={(v) => setScheduleDayOfMonth(Number(v))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">at</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </>
                )}
                {(scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'monthly') && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">End on</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("w-[180px] justify-start", !endOnDate && "text-muted-foreground")}
                        >
                          {endOnDate ? format(endOnDate, 'PPP') : 'No end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endOnDate ?? undefined}
                          onSelect={(d) => setEndOnDate(d ?? undefined)}
                          disabled={(date) => date < startOfDay(new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                {scheduleType === 'specific_dates' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">First send date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("w-[180px] justify-start", !firstSendDate && "text-muted-foreground")}
                        >
                          {firstSendDate ? format(firstSendDate, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={firstSendDate}
                          onSelect={(d) => d && setFirstSendDate(d)}
                          disabled={(date) => date < startOfDay(new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            {/* Email steps */}
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.id}>
                  {renderScheduleConnector(step, index)}

                  <Card className="border-sky-blue/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="bg-sky-blue/10 p-2 rounded">
                            <Mail className="w-5 h-5 text-sky-blue" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">Email {step.order}</Badge>
                              {scheduleType === 'specific_dates' && index === 0 && firstSendDate && (
                                <Badge variant="secondary" className="text-xs">
                                  {format(firstSendDate, 'PPP')}
                                </Badge>
                              )}
                              {scheduleType === 'specific_dates' && index > 0 && step.scheduledDate && (
                                <Badge variant="secondary" className="text-xs">
                                  {format(step.scheduledDate, 'PPP')}
                                </Badge>
                              )}
                              {step.beeJson ? (
                                <Badge className="bg-sky-blue/20 text-sky-blue border-sky-blue text-xs">Configured</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Draft</Badge>
                              )}
                            </div>
                            <Input
                              className="mt-2 font-semibold border-0 p-0 h-auto focus-visible:ring-0"
                              value={step.subject}
                              onChange={(e) => {
                                setSteps(steps.map(s =>
                                  s.id === step.id ? { ...s, subject: e.target.value } : s
                                ));
                              }}
                              placeholder="Email subject..."
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingStep(step.id)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {(scheduleType === 'custom' || scheduleType === 'specific_dates') && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => duplicateStep(step.id)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                              {steps.length > 1 && (
                                <Button variant="ghost" size="sm" onClick={() => removeStep(step.id)}>
                                  <Trash2 className="w-4 h-4 text-sunrise" />
                                </Button>
                              )}
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => toggleStep(step.id)}>
                            {step.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {step.expanded && (
                      <CardContent className="pt-0 border-t">
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Email Preview</Label>
                            <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                              {step.beeJson ? (
                                <div className="italic">Email designed with visual editor. Click edit to modify.</div>
                              ) : (
                                <div className="italic">No content yet. Click edit to design this email.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                  {index === 0 && (scheduleType === 'custom' || scheduleType === 'specific_dates') && (
                    <div className="flex justify-center py-4">
                      <Button onClick={addStep} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Email
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <Button
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={handleContinue}
                disabled={!canContinue()}
              >
                Continue to Audience Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
