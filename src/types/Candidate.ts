export interface Candidate {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
  source?: string;
  tags: string[];
  linkedinUrl?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CandidateWithPipelines extends Candidate {
  pipelines: {
    pipelineId: string;
    pipelineName: string;
    stage: string;
    addedAt: Date;
  }[];
  talentPools: {
    poolId: string;
    poolName: string;
    addedAt: Date;
  }[];
}

export interface CandidateListEnriched extends Candidate {
  pipelineAssociations: { id: string; name: string; stage: string }[];
  lastContactAt: Date | null;
  lastActivityAt: Date | null;
}

export interface CreateCandidateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
  source?: string;
  tags?: string[];
  linkedinUrl?: string;
  avatarUrl?: string;
}

export interface UpdateCandidateData extends Partial<CreateCandidateData> {}
