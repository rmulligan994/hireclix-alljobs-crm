export interface Note {
  id: string;
  candidateId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateNoteData {
  candidateId: string;
  content: string;
}

export interface UpdateNoteData {
  content: string;
}
