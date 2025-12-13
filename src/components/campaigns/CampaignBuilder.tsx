import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SequenceBuilder } from './SequenceBuilder';
import { TemplateLibrary } from './TemplateLibrary';
import { BeefreeEmailEditor } from './BeefreeEmailEditor';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { EmailTemplate } from '@/services/emailTemplateService';
import { Json } from '@/integrations/supabase/types';

interface CampaignBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CampaignBuilder = ({ open, onOpenChange }: CampaignBuilderProps) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'template' | 'editor' | 'sequence' | 'audience' | 'review'>('details');
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateBeeJson, setTemplateBeeJson] = useState<Record<string, unknown> | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  
  const { createTemplate } = useEmailTemplates();

  const handleTemplateSelect = (template: EmailTemplate | null) => {
    setSelectedTemplate(template);
    if (template?.bee_json && typeof template.bee_json === 'object' && !Array.isArray(template.bee_json)) {
      setTemplateBeeJson(template.bee_json as Record<string, unknown>);
    } else {
      setTemplateBeeJson(null);
    }
    setCurrentStep('editor');
  };

  const handleEditorSave = (beeJson: Record<string, unknown>, html: string) => {
    setTemplateBeeJson(beeJson);
    setTemplateHtml(html);
    
    if (!selectedTemplate) {
      createTemplate({
        name: campaignName || 'Untitled Template',
        category: campaignType || 'custom',
        bee_json: beeJson as Json,
        html_content: html,
      });
    }
    
    setCurrentStep('sequence');
  };

  const handleEditorCancel = () => {
    setCurrentStep('template');
  };

  const handleClose = () => {
    setCurrentStep('details');
    setCampaignName('');
    setCampaignType('');
    setSelectedTemplate(null);
    setTemplateBeeJson(null);
    setTemplateHtml(null);
    onOpenChange(false);
  };

  if (currentStep === 'editor') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0">
          <BeefreeEmailEditor
            initialTemplate={templateBeeJson}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-heading">
                {currentStep === 'details' && 'Create New Campaign'}
                {currentStep === 'template' && 'Choose Email Template'}
                {currentStep === 'sequence' && 'Build Email Sequence'}
                {currentStep === 'audience' && 'Select Audience'}
                {currentStep === 'review' && 'Review & Launch'}
              </DialogTitle>
              <DialogDescription>
                {currentStep === 'details' && 'Set up your campaign details and objectives'}
                {currentStep === 'template' && 'Select an existing template or create from scratch'}
                {currentStep === 'sequence' && 'Create your email sequence and timing'}
                {currentStep === 'audience' && 'Define who will receive this campaign'}
                {currentStep === 'review' && 'Review your campaign before launching'}
              </DialogDescription>
            </div>
            {currentStep !== 'details' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const steps = ['details', 'template', 'sequence', 'audience', 'review'];
                  const currentIndex = steps.indexOf(currentStep);
                  setCurrentStep(steps[currentIndex - 1] as typeof currentStep);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            {['Details', 'Template', 'Sequence', 'Audience', 'Review'].map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`h-2 flex-1 rounded ${
                  ['details', 'template', 'sequence', 'audience', 'review'].indexOf(currentStep) >= index
                    ? 'bg-sky-blue'
                    : 'bg-muted'
                }`} />
                {index < 4 && <div className="w-2" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-6">
          {currentStep === 'details' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Q1 Frontend Developer Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-type">Campaign Type</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger id="campaign-type">
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurture">Nurture Campaign</SelectItem>
                    <SelectItem value="event">Event Invitation</SelectItem>
                    <SelectItem value="job_alert">Job Alert</SelectItem>
                    <SelectItem value="reengagement">Re-engagement</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-goal">Campaign Goal</Label>
                <Input id="campaign-goal" placeholder="What do you want to achieve?" />
              </div>

              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={() => setCurrentStep('template')}
                disabled={!campaignName || !campaignType}
              >
                Continue to Templates
              </Button>
            </div>
          )}

          {currentStep === 'template' && (
            <TemplateLibrary onSelectTemplate={handleTemplateSelect} />
          )}

          {currentStep === 'sequence' && (
            <SequenceBuilder template={selectedTemplate} onContinue={() => setCurrentStep('audience')} />
          )}

          {currentStep === 'audience' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                  <CardDescription>Define who should receive this campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Audience Segment</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select audience segment" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Candidates</SelectItem>
                        <SelectItem value="active">Active Pipeline</SelectItem>
                        <SelectItem value="passive">Passive Candidates</SelectItem>
                        <SelectItem value="frontend">Frontend Developers</SelectItem>
                        <SelectItem value="backend">Backend Developers</SelectItem>
                        <SelectItem value="custom">Custom Segment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-semibold text-foreground">Estimated Recipients</div>
                      <div className="text-sm text-muted-foreground">Based on current filters</div>
                    </div>
                    <div className="text-3xl font-bold text-sky-blue">247</div>
                  </div>

                  <Button className="w-full bg-gradient-primary hover:opacity-90" onClick={() => setCurrentStep('review')}>
                    Continue to Review
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Summary</CardTitle>
                  <CardDescription>Review your campaign before launching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Campaign Name</div>
                      <div className="font-semibold text-foreground">{campaignName || 'Untitled Campaign'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Type</div>
                      <Badge variant="secondary">{campaignType}</Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Recipients</div>
                      <div className="font-semibold text-foreground">247 candidates</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Emails in Sequence</div>
                      <div className="font-semibold text-foreground">3 emails</div>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <Button variant="outline" className="flex-1"><Save className="w-4 h-4 mr-2" />Save as Draft</Button>
                    <Button className="flex-1 bg-gradient-primary hover:opacity-90"><Send className="w-4 h-4 mr-2" />Launch Campaign</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
