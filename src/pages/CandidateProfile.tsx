import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Tag,
  FileText,
  StickyNote,
  Clock,
  Plus,
  RefreshCw,
  X,
  Eye,
  Download,
  Upload,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Send,
} from 'lucide-react';

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Mock candidate data
  const candidate = {
    id: id || '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    source: 'LinkedIn',
    addedDate: '1/14/2024',
    updatedDate: '1/16/2024',
  };

  const aiSummary = [
    'Senior Frontend Developer with 5+ years React/TypeScript experience',
    'Strong technical skills, excellent communication, available immediately',
    'Seeking remote role at $120-140k range',
  ];

  const currentTags = ['React', 'TypeScript', 'Remote', 'Senior', 'Available'];
  const suggestedTags = ['Node.js', 'Python', 'Java', 'Mid-level', 'Junior', 'On-site', 'Hybrid', 'Interviewing', 'Considering', 'Security Clearance'];

  const resumeVersions = [
    { id: '1', name: 'Resume v1', isLatest: true },
    { id: '2', name: 'Resume v2', isLatest: false },
  ];

  const recruiterNotes = [
    {
      id: '1',
      date: 'Jan 15, 2024, 05:30 AM',
      content: 'Strong technical background in React and TypeScript. Excellent communication skills during initial screening.',
    },
    {
      id: '2',
      date: 'Jan 16, 2024, 09:20 AM',
      content: 'Available to start in 2 weeks. Looking for remote-first opportunities. Salary expectations: $120-140k.',
    },
  ];

  const communicationHistory = [
    {
      id: '1',
      type: 'Email',
      date: 'Jan 16, 2024, 09:00 AM',
      description: 'Sent technical assessment and next steps',
      outcome: 'Acknowledged, assessment in progress',
    },
    {
      id: '2',
      type: 'Phone Call',
      date: 'Jan 15, 2024, 05:30 AM',
      description: '30-minute screening call',
      outcome: 'Strong fit, proceeding to technical round',
    },
    {
      id: '3',
      type: 'Outreach',
      date: 'Jan 14, 2024, 04:00 AM',
      description: 'Initial LinkedIn outreach message sent',
      outcome: 'Responded positively',
    },
  ];

  const getCommIcon = (type: string) => {
    switch (type) {
      case 'Email': return <Mail className="w-4 h-4" />;
      case 'Phone Call': return <PhoneCall className="w-4 h-4" />;
      case 'Outreach': return <Send className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCommBadgeStyle = (type: string) => {
    switch (type) {
      case 'Email': return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
      case 'Phone Call': return 'bg-sunrise/20 text-sunrise border-sunrise';
      case 'Outreach': return 'bg-deep-sea/50 text-sky-blue border-deep-sea';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Back Button & Page Title */}
          <div className="flex items-start gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/talent')}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Candidate Profile
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage candidate information
              </p>
            </div>
          </div>

          {/* Candidate Header Card */}
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                      {candidate.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-sky-blue mb-2">
                      {candidate.name}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {candidate.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {candidate.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Source: {candidate.source}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Added: {candidate.addedDate}</p>
                  <p>Updated: {candidate.updatedDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content - 2 Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Wider */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI-Generated Summary */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-blue">
                      <Sparkles className="w-5 h-5" />
                      AI-Generated Summary
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">AI Powered</span>
                      <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiSummary.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground">
                        <span className="w-2 h-2 rounded-full bg-sky-blue mt-2 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Tags & Skills */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-blue">
                      <Tag className="w-5 h-5" />
                      Tags & Skills
                    </CardTitle>
                    <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Current Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map((tag) => (
                        <Badge key={tag} className="bg-sky-blue/20 text-sky-blue border-sky-blue px-3 py-1">
                          {tag}
                          <button className="ml-2 hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Suggested Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="border-border text-muted-foreground hover:border-sky-blue hover:text-sky-blue cursor-pointer px-3 py-1"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resume Versions */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-blue">
                      <FileText className="w-5 h-5" />
                      Resume Versions
                      <Badge variant="secondary" className="ml-2">{resumeVersions.length}</Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resumeVersions.map((resume) => (
                    <div 
                      key={resume.id} 
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-sky-blue/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{resume.name}</span>
                        {resume.isLatest && (
                          <Badge variant="secondary" className="text-xs">Latest</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                      <Upload className="w-4 h-4 mr-1" />
                      Upload New Version
                    </Button>
                    <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open in New Tab
                    </Button>
                  </div>

                  <div className="mt-4 p-8 border border-dashed border-border rounded-lg text-center">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Resume preview would appear here</p>
                    <p className="text-sm text-muted-foreground">Integration with PDF viewer coming soon</p>
                  </div>
                </CardContent>
              </Card>

              {/* Communication History - Mobile Only (shows below on smaller screens) */}
              <Card className="bg-card border-border lg:hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-blue">
                      <Clock className="w-5 h-5" />
                      Communication History
                    </CardTitle>
                    <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Log Communication
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {communicationHistory.map((comm, idx) => (
                      <div key={comm.id} className="relative pl-8 pb-4">
                        {idx < communicationHistory.length - 1 && (
                          <div className="absolute left-3 top-6 w-0.5 h-full bg-border" />
                        )}
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          {getCommIcon(comm.type)}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getCommBadgeStyle(comm.type)}>{comm.type}</Badge>
                          <span className="text-xs text-muted-foreground">{comm.date}</span>
                        </div>
                        <p className="text-foreground text-sm">{comm.description}</p>
                        <p className="text-sm text-muted-foreground italic">Outcome: {comm.outcome}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Narrower */}
            <div className="space-y-6">
              {/* Recruiter Notes */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-blue">
                      <StickyNote className="w-5 h-5" />
                      Recruiter Notes
                    </CardTitle>
                    <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Note
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recruiterNotes.map((note) => (
                      <div key={note.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <FileText className="w-3 h-3" />
                          {note.date}
                        </div>
                        <p className="text-foreground text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Communication History - Desktop */}
              <Card className="bg-card border-border hidden lg:block">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-blue">
                      <Clock className="w-5 h-5" />
                      Communication History
                    </CardTitle>
                    <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Log Communication
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {communicationHistory.map((comm, idx) => (
                      <div key={comm.id} className="relative pl-8 pb-4">
                        {idx < communicationHistory.length - 1 && (
                          <div className="absolute left-3 top-6 w-0.5 h-full bg-border" />
                        )}
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          {getCommIcon(comm.type)}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getCommBadgeStyle(comm.type)}>{comm.type}</Badge>
                          <span className="text-xs text-muted-foreground">{comm.date}</span>
                        </div>
                        <p className="text-foreground text-sm">{comm.description}</p>
                        <p className="text-sm text-muted-foreground italic">Outcome: {comm.outcome}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <AICopilot
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export default CandidateProfile;