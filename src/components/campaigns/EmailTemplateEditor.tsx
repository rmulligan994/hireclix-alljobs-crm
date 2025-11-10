import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Code, Smartphone, Monitor, Type, Image, Link, Sparkles } from 'lucide-react';

interface EmailTemplateEditorProps {
  template?: any;
  onSave?: (template: any) => void;
}

export const EmailTemplateEditor = ({ template, onSave }: EmailTemplateEditorProps) => {
  const [subject, setSubject] = useState(template?.subject || '');
  const [preheader, setPreheader] = useState(template?.preheader || '');
  const [body, setBody] = useState(template?.body || '');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const insertVariable = (variable: string) => {
    setBody(body + `{{${variable}}}`);
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="space-y-6 overflow-y-auto pr-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Email Content</span>
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assist
              </Button>
            </CardTitle>
            <CardDescription>Compose your email content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preheader">Preheader Text</Label>
              <Input
                id="preheader"
                placeholder="Preview text that appears after subject..."
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
              />
            </div>

            <Tabs defaultValue="compose" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compose">
                  <Type className="w-4 h-4 mr-2" />
                  Compose
                </TabsTrigger>
                <TabsTrigger value="html">
                  <Code className="w-4 h-4 mr-2" />
                  HTML
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="compose" className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    className="min-h-[300px] font-mono text-sm"
                    placeholder="Write your email content here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Personalization Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {['firstName', 'lastName', 'company', 'role', 'location'].map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Call to Action</Label>
                  <div className="flex space-x-2">
                    <Input placeholder="Button text" defaultValue="Schedule a Call" />
                    <Input placeholder="Button URL" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="html">
                <Textarea
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Edit HTML code directly..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Email Signature</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Signature</SelectItem>
                  <SelectItem value="recruiter1">Sarah Johnson - Sr. Recruiter</SelectItem>
                  <SelectItem value="recruiter2">Mike Chen - Tech Recruiter</SelectItem>
                  <SelectItem value="custom">Custom Signature</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input defaultValue="Project Beacon Talent Team" />
            </div>
            <div className="space-y-2">
              <Label>Reply-To Email</Label>
              <Input defaultValue="talent@projectbeacon.com" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card className="sticky top-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`border rounded-lg overflow-hidden ${viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''}`}>
              {/* Email Preview */}
              <div className="bg-neutral-light-gray p-4">
                <div className="bg-white rounded-lg shadow-sm">
                  {/* Email Header */}
                  <div className="border-b p-4">
                    <div className="text-xs text-muted-foreground mb-1">Subject:</div>
                    <div className="font-semibold text-foreground">{subject || 'Your Subject Line'}</div>
                    {preheader && (
                      <>
                        <div className="text-xs text-muted-foreground mt-2 mb-1">Preheader:</div>
                        <div className="text-sm text-muted-foreground">{preheader}</div>
                      </>
                    )}
                  </div>

                  {/* Email Body */}
                  <div className="p-6">
                    <div className="prose prose-sm max-w-none">
                      {body ? (
                        <div className="whitespace-pre-wrap">{body}</div>
                      ) : (
                        <div className="text-muted-foreground italic">
                          Your email content will appear here...
                        </div>
                      )}
                    </div>

                    {/* CTA Button Preview */}
                    <div className="mt-6">
                      <Button className="bg-sky-blue hover:bg-deep-sea">
                        Schedule a Call
                      </Button>
                    </div>

                    {/* Signature Preview */}
                    <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
                      <div className="font-semibold text-foreground">Best regards,</div>
                      <div className="mt-2">Sarah Johnson</div>
                      <div>Senior Technical Recruiter</div>
                      <div>Project Beacon</div>
                    </div>
                  </div>

                  {/* Email Footer */}
                  <div className="bg-muted p-4 text-xs text-center text-muted-foreground">
                    <div>You're receiving this email because you're in our talent network.</div>
                    <div className="mt-1">
                      <a href="#" className="text-sky-blue hover:underline">Unsubscribe</a>
                      {' | '}
                      <a href="#" className="text-sky-blue hover:underline">Update Preferences</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Send Test
              </Button>
              <Button className="flex-1 bg-gradient-primary hover:opacity-90" onClick={() => onSave?.({ subject, preheader, body })}>
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
