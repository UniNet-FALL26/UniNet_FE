export enum ExternalDraftStatus { Processing, Ready, Failed, Confirmed, Expired }
export type DraftData = {
  title: string | null; description: string | null; projectField: string | null;
  startDate: string | null; endDate: string | null; repositoryUrl: string | null; demoUrl: string | null;
  submitterRole: string | null; submitterContribution: string | null; submitterIsLeader: boolean | null;
  leaderName: string | null; skillIds: string[]; evidenceFileIds: string[]; features: string[];
  members: { name: string; role: string | null }[];
};
export type DraftFile = { fileId: string; fileName: string; url: string; format: string; resourceType: string; sizeBytes: number };
export type DocumentCitation = { fileId: string; segmentNumber: number; quote: string };
export type SourcedText = { value: string; sources: DocumentCitation[] };
export type DraftExtraction = {
  schemaVersion: number; model: string; extractedAt: string;
  information: Partial<Record<'title' | 'description' | 'projectField' | 'startDate' | 'endDate' | 'repositoryUrl' | 'demoUrl', SourcedText | null>> & {
    features: SourcedText[]; skills: { name: SourcedText; skillId: string | null; catalogName: string | null }[];
    members: { name: SourcedText; role: SourcedText | null }[];
  };
  documents: { fileId: string; fileName: string; format: string; sha256: string; segments: { number: number; text: string; pageNumber: number | null; paragraphNumber: number | null; lineNumber: number | null }[] }[];
  warnings: { fileId: string; code: string }[];
};
export type DraftResponse = {
  draftId: string; status: ExternalDraftStatus; version: number; createdAt: string; updatedAt: string; expiresAt: string;
  errorCode: string | null; confirmedProjectId: string | null; data: DraftData; extraction: DraftExtraction | null;
  missingFields: string[]; files: DraftFile[];
};
export type ConfirmDraftResponse = { draftId: string; projectId: string; version: number; origin: number; status: number };
