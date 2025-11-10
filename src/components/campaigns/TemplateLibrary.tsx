import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, TrendingUp, Calendar, Mail, Users, Briefcase, Plus } from 'lucide-react';

interface TemplateLibraryProps {
  onSelectTemplate: (template: any) => void;
}

const templates = [
  {
    id: 1,
    name: 'Initial Outreach - Frontend Developer',
    category: 'nurture',
    description: 'Personalized introduction for frontend developers',
    subject: 'Exciting Frontend Opportunity at {{companyName}}',
    preheader: 'We\'d love to connect about your career goals',
    body: 'Hi {{firstName}},\n\nI came across your profile and was impressed by your experience with {{skills}}. We have an exciting opportunity for a Frontend Developer role that I think would be a great fit for your background.\n\nWould you be open to a brief conversation this week?\n\nBest regards,',
    metrics: { openRate: 62, responseRate: 18 },
    popular: true,
  },
  {
    id: 2,
    name: 'Event Invitation - Tech Meetup',
    category: 'event',
    description: 'Invitation to company tech events',
    subject: 'You\'re invited: {{eventName}} on {{eventDate}}',
    preheader: 'Join us for networking and insights',
    body: 'Hi {{firstName}},\n\nWe\'re hosting a tech meetup focused on {{topic}} and would love for you to join us!\n\nDate: {{eventDate}}\nLocation: {{eventLocation}}\n\nThis is a great opportunity to connect with industry leaders and learn about the latest trends.\n\nRSVP by clicking below.',
    metrics: { openRate: 58, responseRate: 24 },
    popular: true,
  },
  {
    id: 3,
    name: 'Follow-up - After First Touch',
    category: 'nurture',
    description: 'Gentle follow-up 3-5 days after initial contact',
    subject: 'Following up: {{originalSubject}}',
    preheader: 'Just checking if you saw my previous email',
    body: 'Hi {{firstName}},\n\nI wanted to follow up on my previous email about the {{jobTitle}} opportunity. I understand you\'re likely busy, but I believe this could be a great match for your experience in {{skills}}.\n\nWould you have 15 minutes this week for a quick call?\n\nLooking forward to connecting,',
    metrics: { openRate: 45, responseRate: 12 },
    popular: false,
  },
  {
    id: 4,
    name: 'Job Alert - New Position',
    category: 'job_alert',
    description: 'Automated alert for matching job openings',
    subject: 'New {{jobTitle}} position matching your profile',
    preheader: 'This role aligns with your skills and interests',
    body: 'Hi {{firstName}},\n\nA new {{jobTitle}} position just opened up, and based on your skills in {{skills}}, I thought you\'d be interested.\n\nKey highlights:\n• {{responsibility1}}\n• {{responsibility2}}\n• {{benefit1}}\n\nInterested in learning more?',
    metrics: { openRate: 71, responseRate: 28 },
    popular: true,
  },
  {
    id: 5,
    name: 'Re-engagement - Passive Candidates',
    category: 'reengagement',
    description: 'Reconnect with candidates after 6+ months',
    subject: 'Quick check-in: How have you been?',
    preheader: 'It\'s been a while - let\'s catch up',
    body: 'Hi {{firstName}},\n\nIt\'s been a while since we last connected! I wanted to reach out and see how things are going with you at {{currentCompany}}.\n\nIf you\'re open to it, I\'d love to catch up and share some exciting opportunities we have that might align with your career goals.\n\nNo pressure - just checking in!',
    metrics: { openRate: 52, responseRate: 15 },
    popular: false,
  },
  {
    id: 6,
    name: 'Quarterly Newsletter',
    category: 'newsletter',
    description: 'Regular updates about company and industry',
    subject: 'Q{{quarter}} Tech Insights & Company Updates',
    preheader: 'Your quarterly dose of tech trends and opportunities',
    body: 'Hi {{firstName}},\n\nWelcome to our quarterly newsletter! Here\'s what we have for you this quarter:\n\n📊 Industry Trends: {{trend}}\n💼 New Opportunities: {{openPositions}} new roles\n🎯 Success Stories: {{story}}\n\nStay connected with us for more updates!',
    metrics: { openRate: 48, responseRate: 8 },
    popular: false,
  },
];

export const TemplateLibrary = ({ onSelectTemplate }: TemplateLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search templates..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="nurture">Nurture</TabsTrigger>
          <TabsTrigger value="event">Events</TabsTrigger>
          <TabsTrigger value="job_alert">Jobs</TabsTrigger>
          <TabsTrigger value="reengagement">Re-engage</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Create Blank Template Card */}
            <Card className="border-dashed border-2 border-sky-blue/30 hover:border-sky-blue/60 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="bg-sky-blue/10 p-3 rounded-lg">
                      <Plus className="w-6 h-6 text-sky-blue" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Start from Scratch</CardTitle>
                      <CardDescription>Create a custom email template</CardDescription>
                    </div>
                  </div>
                  <Button 
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={() => onSelectTemplate(null)}
                  >
                    Create
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Template Cards */}
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:border-sky-blue/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.popular && (
                          <Badge className="bg-sunrise/20 text-sunrise border-sunrise">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        <Badge variant="secondary">{template.category}</Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => onSelectTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview */}
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="font-semibold text-sm text-foreground">
                        Subject: {template.subject}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.preheader}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {template.body}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-sky-blue" />
                        <div>
                          <div className="text-xs text-muted-foreground">Open Rate</div>
                          <div className="font-semibold text-foreground">{template.metrics.openRate}%</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-sunrise" />
                        <div>
                          <div className="text-xs text-muted-foreground">Response Rate</div>
                          <div className="font-semibold text-foreground">{template.metrics.responseRate}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
