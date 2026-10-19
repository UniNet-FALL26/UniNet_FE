export type StudentVerification = {
  id: string | null;
  status: 0 | 1 | 2 | 3 | null;
  isVerified: boolean;
  fullName: string | null;
  schoolName: string | null;
  studentCode: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  documentName: string | null;
};
export type StudentVerificationDraft = { fullName: string; schoolName: string; studentCode: string };
export type VerificationDocument = { name: string; mimeType: string; size: number; uri: string; file?: File };
