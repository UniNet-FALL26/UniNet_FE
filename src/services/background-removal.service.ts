import type { ImagePickerAsset } from 'expo-image-picker';
import { apiRequest } from './api';
import { imageBody } from '@/utils/image-picker';

export type BackgroundRemovalPreview = { sessionId: string; previewUrl: string; hasTransparentBackground: boolean; expiresAt: string };
type BackgroundRemovalUpload = { imageUrl: string; publicId: string; hasTransparentBackground: boolean };
type Result<T> = { success: boolean; data: T };

// Gemini runs on the backend. Processing only creates a temporary preview;
// callers must confirm to upload it, or release the session when discarded.
export const backgroundRemovalService = {
  async process(asset: ImagePickerAsset, signal?: AbortSignal): Promise<BackgroundRemovalPreview> {
    const body = await imageBody(asset, signal);
    const result = await apiRequest<Result<BackgroundRemovalPreview>>('/ai-images/remove-background', { method: 'POST', body, signal });
    const preview = result?.data;
    if (result?.success !== true || typeof preview?.sessionId !== 'string' || !preview.sessionId.trim()
      || typeof preview.previewUrl !== 'string' || !/^data:image\/png;base64,\S+$/.test(preview.previewUrl)
      || preview.hasTransparentBackground !== true)
      throw new Error('Chưa nhận được ảnh tách nền hợp lệ. Vui lòng thử lại.');
    return preview;
  },
  async confirm(sessionId: string, signal?: AbortSignal): Promise<string> {
    const result = await apiRequest<Result<BackgroundRemovalUpload>>('/ai-images/confirm', { method: 'POST', body: JSON.stringify({ sessionId }), signal });
    const url = result?.data?.imageUrl;
    if (result?.success !== true || typeof url !== 'string' || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+/.test(url)
      || result.data.hasTransparentBackground !== true)
      throw new Error('Chưa nhận được ảnh Cloudinary hợp lệ. Vui lòng thử lại.');
    return url;
  },
  async release(sessionId: string, signal?: AbortSignal): Promise<void> {
    await apiRequest(`/ai-images/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', signal });
  },
};
