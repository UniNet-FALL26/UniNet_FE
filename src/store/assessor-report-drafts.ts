export type AssessorReportDraft = { summary: string; findings: string; recommendations: string; outcome: number; assessment?: import('@/services/assessor.service').AssessmentInput };
const drafts = new Map<string, AssessorReportDraft>();
export const emptyAssessorDraft = (): AssessorReportDraft => ({ summary: '', findings: '', recommendations: '', outcome: 1 });
export const assessorReportDrafts = {
  get: (key: string): AssessorReportDraft => drafts.get(key) ?? emptyAssessorDraft(),
  set: (key: string, value: AssessorReportDraft) => { drafts.set(key, { ...value }); },
  remove: (key: string) => { drafts.delete(key); },
  clear: () => drafts.clear(),
};
