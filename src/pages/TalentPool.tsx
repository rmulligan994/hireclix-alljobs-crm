import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddCandidateDialog } from '@/components/candidates/AddCandidateDialog';
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
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);

  const snapshotMetrics = [
    { label: 'Total Candidates', value: 1247, icon: Users },
    { label: 'New This Week', value: 23, icon: CalendarPlus },
    { label: 'In Active Pipelines', value: 89, icon: GitBranch },
  ];

  const candidates = [
    {
      id: '1',
      name: 'Sarah Johnson',
      title: 'Senior Frontend Developer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      skills: ['React', 'TypeScript', 'Node.js'],
      pipelineAssociations: [
        { id: '1', name: 'Senior Frontend Dev - Q1', stage: 'Qualified' },
        { id: '2', name: 'Backend Engineer - Remote', stage: 'Contacted' },
      ],
      lastContact: '2 days ago',
    },
    {
      id: '2',
      name: 'Maria Garcia',
      title: 'Product Manager',
      company: 'Innovation Labs',
      location: 'New York, NY',
      skills: ['Agile', 'Product Strategy', 'Analytics'],
      pipelineAssociations: [
        { id: '3', name: 'Product Manager - NYC', stage: 'Engaged' },
      ],
      lastContact: '1 week ago',
    },
    {
      id: '3',
      name: 'David Chen',
      title: 'Data Scientist',
      company: 'AI Solutions',
      location: 'Austin, TX',
      skills: ['Python', 'ML', 'Statistics'],
      pipelineAssociations: [
        { id: '4', name: 'Data Scientist - ML Team', stage: 'Submitted' },
        { id: '1', name: 'Senior Frontend Dev - Q1', stage: 'Sourced' },
        { id: '2', name: 'Backend Engineer - Remote', stage: 'Engaged' },
      ],
      lastContact: '3 days ago',
    },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Sourced': return 'bg-muted/50 text-muted-foreground border-muted';
      case 'Contacted': return 'bg-deep-sea/20 text-sky-blue border-deep-sea';
      case 'Engaged': return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
      case 'Qualified': return 'bg-sunrise/20 text-sunrise border-sunrise';
      case 'Submitted': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'Hired': return 'bg-green-600/30 text-green-300 border-green-600';
      default: return 'bg-muted text-muted-foreground border-border';
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
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setAddCandidateOpen(true)}
                >
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
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {candidate.pipelineAssociations.map((pipeline) => (
                          <Badge 
                            key={`${pipeline.id}-${pipeline.name}`}
                            className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStageColor(pipeline.stage)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pipelines/${pipeline.id}`);
                            }}
                          >
                            {pipeline.name.length > 15 ? `${pipeline.name.slice(0, 15)}...` : pipeline.name}: {pipeline.stage}
                          </Badge>
                        ))}
                      </div>
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

      <AddCandidateDialog 
        open={addCandidateOpen}
        onOpenChange={setAddCandidateOpen}
      />
    </div>
  );
};

export default TalentPool;