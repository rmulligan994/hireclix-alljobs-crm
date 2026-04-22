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
  /** Set for campaign sends; used to show subject-only in the comm log. */
  campaignRecipientId?: string | null;
  /** Set for sends that went through Mailgun; used to show subject-only in the comm log. */
  externalMessageId?: string | null;
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
