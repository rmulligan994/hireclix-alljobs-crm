import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, Trash2, Mail, Clock, Edit, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { BeefreeEmailEditor } from './BeefreeEmailEditor';

interface SequenceBuilderProps {
  template?: any;
  onContinue?: () => void;
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
}

export const SequenceBuilder = ({ template, onContinue }: SequenceBuilderProps) => {
  const [steps, setSteps] = useState<EmailStep[]>([
    {
      id: '1',
      order: 1,
      delay: 0,
      delayUnit: 'days',
      subject: 'Initial Outreach',
      beeJson: template?.bee_json || null,
      htmlContent: template?.html_content || null,
      expanded: true,
    },
    {
      id: '2',
      order: 2,
      delay: 3,
      delayUnit: 'days',
      subject: 'Follow-up Email',
      beeJson: null,
      htmlContent: null,
      expanded: false,
    },
  ]);

  const [editingStep, setEditingStep] = useState<string | null>(null);

  const addStep = () => {
    const newStep: EmailStep = {
      id: String(steps.length + 1),
      order: steps.length + 1,
      delay: 7,
      delayUnit: 'days',
      subject: `Email ${steps.length + 1}`,
      beeJson: null,
      htmlContent: null,
      expanded: false,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const toggleStep = (id: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, expanded: !step.expanded } : step
    ));
  };

  const duplicateStep = (id: string) => {
    const stepToDuplicate = steps.find(s => s.id === id);
    if (stepToDuplicate) {
      const newStep = {
        ...stepToDuplicate,
        id: String(steps.length + 1),
        order: steps.length + 1,
        subject: `${stepToDuplicate.subject} (Copy)`,
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

  const editingStepData = editingStep ? steps.find(s => s.id === editingStep) : null;

  return (
    <>
      {/* Full screen editor modal */}
      <Dialog open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0">
          <BeefreeEmailEditor
            initialTemplate={editingStepData?.beeJson}
            onSave={handleEditorSave}
            onCancel={() => setEditingStep(null)}
          />
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Sequence</CardTitle>
                <CardDescription>Build a multi-step email campaign</CardDescription>
              </div>
              <Button onClick={addStep} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Email
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id}>
                {/* Delay Indicator */}
                {index > 0 && (
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
                            s.id === step.id ? { ...s, delay: parseInt(e.target.value) } : s
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
                )}

                {/* Email Step Card */}
                <Card className="border-sky-blue/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="bg-sky-blue/10 p-2 rounded">
                          <Mail className="w-5 h-5 text-sky-blue" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Email {step.order}</Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStep(step.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateStep(step.id)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {steps.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 className="w-4 h-4 text-sunrise" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStep(step.id)}
                        >
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Open Rate Goal</Label>
                            <Input type="number" placeholder="60" />
                          </div>
                          <div className="space-y-2">
                            <Label>Response Rate Goal</Label>
                            <Input type="number" placeholder="15" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>A/B Test</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="No A/B testing" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No A/B testing</SelectItem>
                              <SelectItem value="subject">Test Subject Lines</SelectItem>
                              <SelectItem value="content">Test Email Content</SelectItem>
                              <SelectItem value="time">Test Send Times</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            ))}

            <div className="pt-4 border-t">
              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={onContinue}
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
