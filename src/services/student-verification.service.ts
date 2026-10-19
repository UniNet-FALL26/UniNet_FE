import { Platform } from 'react-native';
import { File as NativeFile } from 'expo-file-system';
import { apiRequest } from '@/services/api';
import { validateStudentVerification, validateVerificationDocument } from '@/utils/student-verification';
import type { StudentVerification, StudentVerificationDraft, VerificationDocument } from '@/types/student-verification';

export const studentVerificationService = {
  get: async (signal?: AbortSignal) => parseVerification(await apiRequest<unknown>('/student/verification/me', { signal })),
  async submit(draft: StudentVerificationDraft, document: VerificationDocument, signal?: AbortSignal) {
    const error = Object.values(validateStudentVerification(draft))[0] || validateVerificationDocument(document);
    if (error) throw new Error(error);
    const body = new FormData();
    body.append('fullName', draft.fullName.trim()); body.append('schoolName', draft.schoolName.trim()); body.append('studentCode', draft.studentCode.trim());
    if (Platform.OS === 'web') {
      if (!document.file) throw new Error('Vui lòng chọn lại giấy tờ xác minh.');
      const invalid = validateVerificationDocument({ name: document.file.name, mimeType: document.file.type, size: document.file.size });
      if (invalid) throw new Error(invalid);
      body.append('document', document.file, document.name);
    } else {
      const file = new NativeFile(document.uri);
      const invalid = validateVerificationDocument({ name: document.name, mimeType: file.type || document.mimeType, size: file.size });
      if (invalid) throw new Error(invalid);
      body.append('document', file);
    }
    return parseVerification(await apiRequest<unknown>('/student/verification', { method: 'POST', body, signal }));
  },
};

function parseVerification(value: unknown): StudentVerification {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const nullableFields = ['id', 'fullName', 'schoolName', 'studentCode', 'submittedAt', 'reviewedAt', 'rejectReason', 'documentName'];
    if (typeof row.isVerified === 'boolean' && [null, 0, 1, 2, 3].includes(row.status as number | null) && nullableFields.every(key => row[key] === null || typeof row[key] === 'string')) return row as StudentVerification;
  }
  throw new Error('Chưa nhận được trạng thái xác minh hợp lệ. Vui lòng thử lại.');
}
