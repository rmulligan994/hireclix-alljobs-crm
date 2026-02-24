// Pipeline stage types and templates

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
}

export interface PipelineTemplateStage {
  name: string;
  order: number;
  color?: string;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  stages: PipelineTemplateStage[];
}

export const defaultTemplates: PipelineTemplate[] = [
  {
    id: 'recruiter',
    name: 'Recruiter',
    description: 'Standard recruitment workflow with Not A Fit',
    stages: [
      { name: 'New', order: 0, color: '#54A3DA' },
      { name: 'Contacted', order: 1, color: '#0B3555' },
      { name: 'Screened', order: 2, color: '#FAA21B' },
      { name: 'Submitted', order: 3, color: '#22C55E' },
      { name: 'Not A Fit', order: 4, color: '#EF4444' },
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Traditional recruitment workflow',
    stages: [
      { name: 'Sourced', order: 0 },
      { name: 'Contacted', order: 1 },
      { name: 'Screening', order: 2 },
      { name: 'Interview', order: 3 },
      { name: 'Offer', order: 4 },
      { name: 'Hired', order: 5 },
    ],
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'For engineering and technical roles',
    stages: [
      { name: 'Sourced', order: 0 },
      { name: 'Phone Screen', order: 1 },
      { name: 'Technical Assessment', order: 2 },
      { name: 'Onsite', order: 3 },
      { name: 'Offer', order: 4 },
      { name: 'Hired', order: 5 },
    ],
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'For senior leadership positions',
    stages: [
      { name: 'Sourced', order: 0 },
      { name: 'Initial Contact', order: 1 },
      { name: 'First Interview', order: 2 },
      { name: 'Panel Interview', order: 3 },
      { name: 'Reference Check', order: 4 },
      { name: 'Offer', order: 5 },
      { name: 'Hired', order: 6 },
    ],
  },
];

export interface PipelineCandidate {
  id: string;
  name: string;
  title: string;
  company: string;
  stageId: string;
  movedAt: string;
  stageHistory: { stageId: string; stageName: string; movedAt: string }[];
}

export interface Pipeline {
  id: string;
  title: string;
  status: 'active' | 'archived';
  stages: PipelineStage[];
  candidates: PipelineCandidate[];
  createdAt: string;
}

// Generate unique ID
export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Convert template to stages with IDs
export const templateToStages = (template: PipelineTemplate): PipelineStage[] => {
  return template.stages.map((stage, index) => ({
    id: generateId(),
    name: stage.name,
    order: index,
    color: stage.color,
  }));
};

// Mock pipeline data with custom stages
export const mockPipelinesWithStages: Pipeline[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer - Q1 2024',
    status: 'active',
    stages: [
      { id: 's1-1', name: 'Sourced', order: 0 },
      { id: 's1-2', name: 'Contacted', order: 1 },
      { id: 's1-3', name: 'Technical Screen', order: 2 },
      { id: 's1-4', name: 'Onsite', order: 3 },
      { id: 's1-5', name: 'Offer', order: 4 },
      { id: 's1-6', name: 'Hired', order: 5 },
    ],
    candidates: [
      { id: 'c1', name: 'Sarah Johnson', title: 'Senior Developer', company: 'Tech Corp', stageId: 's1-3', movedAt: '2024-02-10', stageHistory: [] },
      { id: 'c2', name: 'Mike Chen', title: 'Full Stack Dev', company: 'StartupXYZ', stageId: 's1-2', movedAt: '2024-02-08', stageHistory: [] },
      { id: 'c3', name: 'Emily Davis', title: 'Frontend Lead', company: 'Innovation Labs', stageId: 's1-1', movedAt: '2024-02-12', stageHistory: [] },
      { id: 'c4', name: 'Alex Kim', title: 'React Developer', company: 'Digital Agency', stageId: 's1-1', movedAt: '2024-02-11', stageHistory: [] },
      { id: 'c5', name: 'Jordan Lee', title: 'Software Engineer', company: 'BigTech Inc', stageId: 's1-4', movedAt: '2024-02-09', stageHistory: [] },
      { id: 'c6', name: 'Taylor Swift', title: 'UI Engineer', company: 'Design Co', stageId: 's1-5', movedAt: '2024-02-07', stageHistory: [] },
    ],
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    title: 'Backend Engineer - Remote',
    status: 'active',
    stages: [
      { id: 's2-1', name: 'Sourced', order: 0 },
      { id: 's2-2', name: 'Phone Screen', order: 1 },
      { id: 's2-3', name: 'Take-Home', order: 2 },
      { id: 's2-4', name: 'Final Interview', order: 3 },
      { id: 's2-5', name: 'Hired', order: 4 },
    ],
    candidates: [
      { id: 'c7', name: 'Chris Brown', title: 'Backend Dev', company: 'API Masters', stageId: 's2-1', movedAt: '2024-02-10', stageHistory: [] },
      { id: 'c8', name: 'Morgan White', title: 'Node.js Dev', company: 'Server Co', stageId: 's2-2', movedAt: '2024-02-09', stageHistory: [] },
    ],
    createdAt: '2024-01-15',
  },
];
