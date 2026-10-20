export type TaskReportStatus = 0 | 1 | 2 | 3 | 4;
export type TaskReportReviewDecision = 0 | 1;

export interface TaskEvidence {
  fileUrl: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  format: string;
}

export interface ImageUploadResponse {
  imageUrl: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  format: string;
}

export interface TaskReportReview {
  id: string;
  reviewerId: string;
  reviewerFullName: string;
  decision: TaskReportReviewDecision;
  feedback: string | null;
  reviewedAt: string;
}

export interface TaskReport {
  id: string;
  projectTaskId: string;
  submittedById: string;
  submittedByFullName: string;
  reportGroupId: string;
  parentReportId: string | null;
  version: number;
  content: string;
  status: TaskReportStatus;
  submittedAt: string | null;
  updatedAt: string;
  evidence: TaskEvidence[];
  reviews: TaskReportReview[];
}

export interface TaskReportListResponse {
  projectTaskId: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  reports: TaskReport[];
}

export interface SubmitTaskReportRequest {
  content: string;
  evidence: TaskEvidence[];
}

export function toTaskEvidence(image: ImageUploadResponse): TaskEvidence {
  return {
    fileUrl: image.imageUrl,
    publicId: image.publicId,
    resourceType: image.resourceType,
    fileName: image.fileName,
    format: image.format,
  };
}

export const TASK_REPORT_STATUS_LABEL: Record<TaskReportStatus, string> = {
  0: 'Đã nộp',
  1: 'Đã duyệt',
  2: 'Yêu cầu chỉnh sửa',
  3: 'Bản nháp',
  4: 'Đã rút',
};
