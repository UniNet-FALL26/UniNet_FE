import { API_URL } from '@/constants/config';
import type { ImageUploadResponse } from '@/types/task-report';
import { Platform } from 'react-native';

export async function uploadReportFile(
  file: { uri: string; name: string; mimeType?: string | null; file?: File | null },
  accessToken: string,
): Promise<ImageUploadResponse> {
  const base = (API_URL ?? '').replace(/\/$/, '');
  if (!base) throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL.');
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
    throw new Error(`Upload thất bại với tệp ${file.name}. Hãy kiểm tra kết nối.`);
  }

  if (!response.ok) {
    let message = `Upload thất bại (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') message = body.message;
    } catch { /* ignore empty response */ }
    throw new Error(message);
  }

  const result = (await response.json()) as ImageUploadResponse;
  if (!result.imageUrl || !result.publicId || !result.resourceType || !result.fileName || !result.format) {
    throw new Error('API upload không trả về đủ thông tin file hợp lệ.');
  }
  return result;
}
