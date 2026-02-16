export interface CandidateResume {
  id: string;
  candidateId: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
  mimeType: string;
  version: number;
  isPrimary: boolean;
  uploadedAt: Date;
  uploadedBy?: string;
}

export interface UploadResumeData {
  file: File;
  candidateId: string;
}
