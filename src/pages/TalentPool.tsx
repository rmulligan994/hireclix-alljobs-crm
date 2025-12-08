import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, Download, Upload, Plus, Mail, Phone, MapPin, Users, CalendarPlus, GitBranch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TalentPool = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Snapshot metrics
  const snapshotMetrics = [
    { label: 'Total Candidates', value: 1247, icon: Users },
    { label: 'New This Week', value: 23, icon: CalendarPlus },
    { label: 'In Active Pipelines', value: 89, icon: GitBranch },
  ];

  const candidates = [
    {
      id: '1',
      name: 'Alex Johnson',
      title: 'Senior Frontend Developer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      skills: ['React', 'TypeScript', 'Node.js'],
      pipelines: ['Senior Dev Hiring', 'Frontend Team'],
      stage: 'Engaged',
      lastContact: '2 days ago',
    },
    {
      id: '2',
      name: 'Maria Garcia',
      title: 'Product Manager',
      company: 'Innovation Labs',
      location: 'New York, NY',
      skills: ['Agile', 'Product Strategy', 'Analytics'],
      pipelines: ['PM Leadership'],
      stage: 'Qualified',
      lastContact: '1 week ago',
    },
    {
      id: '3',
      name: 'David Chen',
      title: 'Data Scientist',
      company: 'AI Solutions',
      location: 'Austin, TX',
      skills: ['Python', 'ML', 'Statistics'],
      pipelines: ['Data Team', 'ML Engineers', 'Q1 Hires'],
      stage: 'Contacted',
      lastContact: '3 days ago',
    },
  ];

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
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                  Candidates
                </h1>
                <p className="font-body text-muted-foreground">
                  Search, filter, and manage your candidate database
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              </div>
            </div>
          </div>

          {/* Snapshot Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {snapshotMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-sky-blue/10">
                        <Icon className="w-5 h-5 text-sky-blue" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-foreground">{metric.value.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, skills, location, or company..."
                  className="pl-10 border-deep-sea focus:border-sky-blue"
                />
              </div>
              <Button variant="outline" className="border-deep-sea text-deep-sea hover:bg-deep-sea hover:text-white">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
            
            {/* Active Filters */}
            <div className="flex items-center space-x-2 mt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              <Badge variant="secondary" className="bg-sunrise/10 text-sunrise border-sunrise">
                React
              </Badge>
              <Badge variant="secondary" className="bg-sunrise/10 text-sunrise border-sunrise">
                San Francisco
              </Badge>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Clear all
              </Button>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-deep-sea hover:bg-deep-sea">
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Current Role</TableHead>
                  <TableHead className="text-white">Location</TableHead>
                  <TableHead className="text-white">Skills</TableHead>
                  <TableHead className="text-white">Pipelines</TableHead>
                  <TableHead className="text-white">Stage</TableHead>
                  <TableHead className="text-white">Last Contact</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id} className="hover:bg-sky-blue/5">
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-foreground">{candidate.name}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          <Phone className="w-3 h-3 ml-2 mr-1" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-foreground">{candidate.title}</div>
                        <div className="text-xs text-muted-foreground">{candidate.company}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" />
                        {candidate.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {candidate.pipelines.map((pipeline) => (
                          <Badge key={pipeline} variant="outline" className="text-xs border-sunrise text-sunrise">
                            {pipeline}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-sky-blue/20 text-sky-blue border-sky-blue">
                        {candidate.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{candidate.lastContact}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sky-blue hover:bg-sky-blue/10"
                        onClick={() => navigate(`/talent/${candidate.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

export default TalentPool;
