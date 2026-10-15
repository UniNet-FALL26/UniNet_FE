import type { ImagePickerAsset } from 'expo-image-picker';
import { apiRequest } from './api';
import { imageBody } from '@/utils/image-picker';

export type PortraitPreview = { sessionId: string; previewUrl: string; hasTransparentBackground: boolean; expiresAt: string };
type PortraitUpload = { imageUrl: string; publicId: string; hasTransparentBackground: boolean };
type Result<T> = { success: boolean; data: T };
export const portraitService = {
  async process(asset: ImagePickerAsset, signal: AbortSignal): Promise<PortraitPreview> {
    const body = await imageBody(asset, signal);
    const result = await apiRequest<Result<PortraitPreview>>('/ai-images/remove-background', { method: 'POST', body, signal });
    if (!result.success || !result.data?.sessionId || !/^data:image\/png;base64,/.test(result.data.previewUrl) || !result.data.hasTransparentBackground)
      throw new Error('Chưa nhận được ảnh tách nền hợp lệ. Vui lòng thử lại.');
    return result.data;
  },
  async confirm(sessionId: string, signal: AbortSignal): Promise<string> {
    const result = await apiRequest<Result<PortraitUpload>>('/ai-images/confirm', { method: 'POST', body: JSON.stringify({ sessionId }), signal });
    const url = result.data?.imageUrl;
    if (!result.success || !url || !/^https:\/\/res\.cloudinary\.com\//.test(url) || !result.data.hasTransparentBackground)
      throw new Error('Chưa nhận được ảnh Cloudinary hợp lệ. Vui lòng thử lại.');
    return url;
  },
  async release(sessionId: string): Promise<void> {
    await apiRequest(`/ai-images/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  },
};
