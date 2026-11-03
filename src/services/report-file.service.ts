import { API_URL } from '@/constants/config';
import type { ImageUploadResponse } from '@/types/task-report';
import { Platform } from 'react-native';
import { apiErrorMessage } from '@/utils/api-feedback';
import { ApiError } from '@/services/api';
import { toast } from '@/store/toast.store';

export async function uploadReportFile(
  file: { uri: string; name: string; mimeType?: string | null; file?: File | null },
  accessToken: string,
): Promise<ImageUploadResponse> {
  const base = (API_URL ?? '').replace(/\/$/, '');
  if (!base) throw new Error('Dịch vụ tải tệp hiện chưa khả dụng. Vui lòng thử lại sau.');
  // API_URL có thể đã kết thúc bằng /api, giống quy ước trong workspaceService.
  const apiPrefix = base.endsWith('/api') ? '' : '/api';

  const form = new FormData();

  if (Platform.OS === 'web') {
    // On web, FormData must receive a real File/Blob, not React Native's
    // { uri, name, type } descriptor. DocumentPicker exposes `file` on web.
    let browserFile = file.file ?? null;

    if (!browserFile) {
      const assetResponse = await fetch(file.uri);
      if (!assetResponse.ok) {
        throw new Error(`Không thể đọc tệp đã chọn: ${file.name}.`);
      }
      const blob = await assetResponse.blob();
      browserFile = new File([blob], file.name, {
        type: file.mimeType || blob.type || 'application/octet-stream',
      });
    }

    form.append('file', browserFile, file.name);
  } else {
    // React Native native platforms require the { uri, name, type } shape.
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    } as unknown as Blob);
  }

  let response: Response;
  try {
    response = await fetch(`${base}${apiPrefix}/images`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        // Do not set Content-Type manually; fetch adds the multipart boundary.
      },
      body: form,
    });
  } catch {
    const message = 'Không tải được tệp minh chứng. Vui lòng kiểm tra kết nối và thử lại.';
    toast.error(message);
    throw new ApiError(message);
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = apiErrorMessage('/files', response.status, body);
    toast.error(message);
    throw new ApiError(message, response.status);
  }

  const result = (await response.json()) as ImageUploadResponse;
  if (!result.imageUrl || !result.publicId || !result.resourceType || !result.fileName || !result.format) {
    const message = 'Không nhận được tệp tải lên hợp lệ. Vui lòng thử lại.';
    toast.error(message);
    throw new ApiError(message, 502);
  }
  return result;
}
