export interface TalentPool {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface TalentPoolWithCandidates extends TalentPool {
  candidateCount: number;
  candidates: {
    candidateId: string;
    addedAt: Date;
  }[];
}

export interface CreateTalentPoolData {
  name: string;
  description?: string;
}

export type UpdateTalentPoolData = Partial<CreateTalentPoolData>;

export interface TalentPoolCandidate {
  id: string;
  talentPoolId: string;
  candidateId: string;
  addedAt: Date;
}
