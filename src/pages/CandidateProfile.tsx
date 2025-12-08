import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Calendar,
  MessageSquare,
  FileText,
  TrendingUp,
  Plus,
  Send,
} from 'lucide-react';

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Mock candidate data - in real app, fetch based on id
  const candidate = {
    id: id || '1',
    name: 'Alex Johnson',
    title: 'Senior Frontend Developer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    email: 'alex.johnson@email.com',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/alexjohnson',
    website: 'alexjohnson.dev',
    skills: [
      { name: 'React', level: 95 },
      { name: 'TypeScript', level: 90 },
      { name: 'Node.js', level: 85 },
      { name: 'GraphQL', level: 80 },
      { name: 'AWS', level: 75 },
      { name: 'Docker', level: 70 },
    ],
    stage: 'Engaged',
    source: 'LinkedIn',
    lastContact: '2 days ago',
    joinedDate: 'Jan 15, 2024',
    experience: '8 years',
    education: 'BS Computer Science, Stanford University',
  };

  const timeline = [
    {
      id: '1',
      type: 'email',
      title: 'Email sent: Senior Frontend Role',
      description: 'Campaign: Tech Talent Nurture Q1',
      date: '2 days ago',
      status: 'opened',
    },
    {
      id: '2',
      type: 'note',
      title: 'Note added',
      description: 'Interested in remote opportunities, prefers React-heavy roles',
      date: '1 week ago',
      status: 'completed',
    },
    {
      id: '3',
      type: 'call',
      title: 'Phone call',
      description: 'Initial screening - 30 min discussion about career goals',
      date: '2 weeks ago',
      status: 'completed',
    },
    {
      id: '4',
      type: 'email',
      title: 'Email received',
      description: 'Response to outreach - expressed interest',
      date: '3 weeks ago',
      status: 'completed',
    },
    {
      id: '5',
      type: 'sourced',
      title: 'Candidate sourced',
      description: 'Added from LinkedIn Recruiter search',
      date: '1 month ago',
      status: 'completed',
    },
  ];

  const notes = [
    {
      id: '1',
      author: 'Sarah Chen',
      content: 'Very strong React skills. Looking for leadership opportunities. Mentioned interest in fintech sector.',
      date: '1 week ago',
    },
    {
      id: '2',
      author: 'Mike Rodriguez',
      content: 'Had great conversation about their work on scaling React applications. Open to relocation for the right opportunity.',
      date: '2 weeks ago',
    },
  ];

  const aiRecommendations = [
    {
      id: '1',
      type: 'job_match',
      title: 'High Match: Senior Frontend Engineer',
      description: 'Engineering Team Lead role at FinTech startup - 95% match based on skills and preferences',
      action: 'View Job',
    },
    {
      id: '2',
      type: 'outreach',
      title: 'Best Time to Contact',
      description: 'Historical data shows highest response rate on Tuesday afternoons',
      action: 'Schedule',
    },
    {
      id: '3',
      type: 'similar',
      title: 'Similar Candidates',
      description: '12 candidates with similar skill profiles currently in pipeline',
      action: 'View',
    },
  ];

  const handleAddNote = () => {
    if (newNote.trim()) {
      // Add note logic here
      setNewNote('');
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
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/talent')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Talent Pool
          </Button>

          {/* Candidate Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-sky-blue text-white text-2xl">
                      {candidate.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                      {candidate.name}
                    </h1>
                    <p className="text-xl text-muted-foreground mb-4">
                      {candidate.title} at {candidate.company}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2 text-sky-blue" />
                        {candidate.email}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2 text-sky-blue" />
                        {candidate.phone}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 text-sky-blue" />
                        {candidate.location}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Linkedin className="w-4 h-4 mr-2 text-sky-blue" />
                        {candidate.linkedin}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className="bg-sky-blue/20 text-sky-blue border-sky-blue">
                        {candidate.stage}
                      </Badge>
                      <Badge variant="secondary">
                        Source: {candidate.source}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Last contact: {candidate.lastContact}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Send className="w-4 h-4 mr-2" />
                    Quick Action
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Engagement Timeline</TabsTrigger>
              <TabsTrigger value="skills">Skills & Experience</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="text-foreground font-medium">{candidate.experience}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Education</p>
                      <p className="text-foreground font-medium">{candidate.education}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Joined Pipeline</p>
                      <p className="text-foreground font-medium">{candidate.joinedDate}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiRecommendations.map((rec) => (
                      <div key={rec.id} className="flex items-start justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </div>
                        <Button size="sm" variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                          {rec.action}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="flex items-start space-x-4">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            event.type === 'email' ? 'bg-sky-blue/20' :
                            event.type === 'note' ? 'bg-sunrise/20' :
                            event.type === 'call' ? 'bg-deep-sea/20' : 'bg-muted'
                          }`}>
                            {event.type === 'email' && <Mail className="w-5 h-5 text-sky-blue" />}
                            {event.type === 'note' && <FileText className="w-5 h-5 text-sunrise" />}
                            {event.type === 'call' && <Phone className="w-5 h-5 text-deep-sea" />}
                            {event.type === 'sourced' && <TrendingUp className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          {index < timeline.length - 1 && (
                            <div className="absolute left-5 top-10 w-0.5 h-12 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-foreground">{event.title}</h4>
                            <span className="text-sm text-muted-foreground">{event.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          {event.status === 'opened' && (
                            <Badge className="mt-2 bg-sky-blue/20 text-sky-blue border-sky-blue">
                              Opened
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {candidate.skills.map((skill) => (
                      <div key={skill.name}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">{skill.name}</span>
                          <span className="text-sm text-muted-foreground">{skill.level}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-blue to-deep-sea rounded-full transition-all"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-4 bg-sky-blue/5 border border-sky-blue/20 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Skill Highlights</h4>
                    <p className="text-sm text-muted-foreground">
                      Top strengths in modern frontend technologies with strong expertise in React ecosystem.
                      Growing backend capabilities with Node.js and cloud infrastructure knowledge.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-6">
                    <Textarea
                      placeholder="Add a note about this candidate..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px] border-deep-sea focus:border-sky-blue"
                    />
                    <Button
                      onClick={handleAddNote}
                      className="bg-gradient-primary hover:opacity-90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4 text-sky-blue" />
                            <span className="font-medium text-foreground">{note.author}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{note.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
