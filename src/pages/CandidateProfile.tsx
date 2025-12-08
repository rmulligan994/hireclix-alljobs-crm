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
  PhoneCall,
  Send,
  GitBranch,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

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

  const pipelineAssociations = [
    { id: '1', name: 'Senior Frontend Dev - Q1 2024', stage: 'Qualified', lastUpdated: 'Jan 16, 2024' },
    { id: '2', name: 'Backend Engineer - Remote', stage: 'Contacted', lastUpdated: 'Jan 14, 2024' },
  ];

  const talentPoolAssociations = [
    { id: '1', name: 'Senior Engineers', candidateCount: 156 },
    { id: '2', name: 'Remote-First Candidates', candidateCount: 89 },
    { id: '3', name: 'JavaScript Experts', candidateCount: 234 },
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
      default: return <Mail className="w-4 h-4" />;
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

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Sourced': return 'bg-muted/50 text-muted-foreground';
      case 'Contacted': return 'bg-deep-sea/20 text-sky-blue';
      case 'Engaged': return 'bg-sky-blue/20 text-sky-blue';
      case 'Qualified': return 'bg-sunrise/20 text-sunrise';
      case 'Submitted': return 'bg-green-500/20 text-green-400';
      case 'Hired': return 'bg-green-600/30 text-green-300';
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

          {/* AI-Generated Summary - Full Width */}
          <Card className="mb-6 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <Sparkles className="w-5 h-5" />
                  AI-Generated Summary
                </CardTitle>
                <span className="text-xs text-muted-foreground">AI Powered</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {aiSummary.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-foreground">
                    <span className="w-2 h-2 rounded-full bg-sky-blue mt-2 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pipelines & Talent Pools - Full Width */}
          <Card className="mb-6 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <GitBranch className="w-5 h-5" />
                  Pipelines & Talent Pools
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Pipeline
                  </Button>
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Talent Pool
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Pipelines */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Active Pipelines
                </h4>
                <div className="space-y-2">
                  {pipelineAssociations.map((pipeline) => (
                    <div 
                      key={pipeline.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-sky-blue/50 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium group-hover:text-sky-blue transition-colors">
                            {pipeline.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Last updated: {pipeline.lastUpdated}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStageColor(pipeline.stage)}>
                          {pipeline.stage}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-blue" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Talent Pools */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Talent Pools
                </h4>
                <div className="flex flex-wrap gap-2">
                  {talentPoolAssociations.map((pool) => (
                    <Badge 
                      key={pool.id}
                      variant="outline"
                      className="border-sky-blue text-sky-blue hover:bg-sky-blue/10 cursor-pointer px-3 py-1"
                      onClick={() => navigate(`/talent?pool=${pool.id}`)}
                    >
                      {pool.name}
                      <span className="ml-1 text-xs text-muted-foreground">({pool.candidateCount})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags & Skills - Full Width */}
          <Card className="mb-6 bg-card border-border">
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

          {/* Resume Versions + Recruiter Notes - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Resume Versions */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sky-blue">
                    <FileText className="w-5 h-5" />
                    Resume Versions
                    <Badge variant="secondary" className="ml-1">{resumeVersions.length}</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                    <Upload className="w-4 h-4 mr-1" />
                    Upload New Version
                  </Button>
                  <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in New Tab
                  </Button>
                </div>

                <div className="p-6 border border-dashed border-border rounded-lg text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Resume preview would appear here</p>
                  <p className="text-xs text-muted-foreground">Integration with PDF viewer coming soon</p>
                </div>
              </CardContent>
            </Card>

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
          </div>

          {/* Communication History - Full Width */}
          <Card className="bg-card border-border">
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
                  <div key={comm.id} className="relative pl-8 pb-4 border-b border-border last:border-0 last:pb-0">
                    {idx < communicationHistory.length - 1 && (
                      <div className="absolute left-3 top-6 w-0.5 h-[calc(100%-8px)] bg-border" />
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