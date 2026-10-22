// These are the public evidence API enums, not ProjectModerationStatus.
export enum EvidenceModerationStatus { Pending, Processing, Passed, Rejected, NeedsEvidence, Error }
export type EvidenceCheck = {
  projectTaskId: string; taskReportId: string; taskEvidenceId: string | null;
  kind: string; url: string | null; status: number; reason: string;
  provider: string; checkedAt: string; errorCode: string | null; transient: boolean;
};
export type EvidenceModeration = {
  id: string; projectId: string; version: number; status: EvidenceModerationStatus;
  isCurrent: boolean; createdAt: string; completedAt: string | null;
  summary: string | null; lastErrorCode: string | null;
  source: { tasks: { projectTaskId: string; reports: { taskReportId: string; version: number; content: string; evidence: { taskEvidenceId: string; fileName: string | null }[] }[] }[] };
  policy: { version: string | null };
  attempts: { number: number; transient: boolean; errorCode: string | null; results: EvidenceCheck[] }[];
};
export type Verification = {
  projectId?: string; projectTitle?: string; submittedAt?: string; createdAt?: string; updatedAt?: string;
  id: string; status: number; bookingStatus: number; reservedUntil: string | null;
  scheduledStartAt: string | null; scheduledEndAt: string | null;
};
export type VerificationPage = { page: number; pageSize: number; totalPages: number; totalItems: number; verifications: Verification[] };
export type VerificationDetail = {
  project?: { id: string; title: string; status: number; leaderId: string };
  finalResult?: VerificationFinalResult | null;
  cancellationReason?: string | null; cancelledAt?: string | null;
  packageId?: string;
  meetingStartAt?: string | null;
  verification: Verification; meetingEndAt: string | null;
  assignments: { id: string; status: number; assignedAt?: string; assignedToUserId?: string; report?: VerificationReport | null }[];
  payments: { transactionId?: string; amount?: number; status: number; requiresManualReview: boolean }[];
};
export type VerificationReport = {
  id: string; assignmentId: string; summary: string; findings: string | null;
  recommendations: string | null; submittedAt: string;
};
export type VerificationFinalResult = {
  status: number; finalizedAt: string | null; finalizedByUserId: string | null; reports: VerificationReport[];
};
export type VerificationTransaction = {
  id: string; verificationId: string; packageId: string; amountVnd: number; currency: string;
  status: number; checkoutUrl: string | null; paidAt: string | null; expiredAt: string | null;
  createdAt: string; updatedAt: string; reconciliationRequired: boolean; requiresReview: boolean;
};
export type VerificationTransactions = { page: number; totalPages: number; totalItems: number; transactions: VerificationTransaction[] };
export type VerificationPackage = { id: string; name: string; code: string; type: number; role: number; price: number; durationInDays: number | null; isActive: boolean };
export type MeetingSlot = { startAt: string; endAt: string; remainingCapacity: number };
export type MeetingSlots = { timeZoneId: string; slots: MeetingSlot[] };
