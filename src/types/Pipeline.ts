export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface PipelineWithCandidates extends Pipeline {
  candidateCount: number;
  candidates: {
    candidateId: string;
    stage: string;
    addedAt: Date;
  }[];
}

export interface CreatePipelineData {
  name: string;
  description?: string;
  stages?: PipelineStage[];
}

export interface UpdatePipelineData extends Partial<CreatePipelineData> {
  status?: 'active' | 'archived';
}

export interface PipelineCandidate {
  id: string;
  pipelineId: string;
  candidateId: string;
  stage: string;
  addedAt: Date;
  updatedAt: Date;
}
