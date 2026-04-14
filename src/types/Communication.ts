export type CommunicationType = 'email' | 'call' | 'meeting' | 'message';
export type CommunicationDirection = 'inbound' | 'outbound';

export interface Communication {
  id: string;
  candidateId: string;
  type: CommunicationType;
  subject?: string;
  content?: string;
  direction?: CommunicationDirection;
  occurredAt: Date;
  createdAt: Date;
  createdBy?: string;
}

export interface CreateCommunicationData {
  candidateId: string;
  type: CommunicationType;
  subject?: string;
  content?: string;
  direction?: CommunicationDirection;
  occurredAt?: Date;
}

export type UpdateCommunicationData = Partial<Omit<CreateCommunicationData, 'candidateId'>>;
