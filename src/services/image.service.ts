import type { ImagePickerAsset } from 'expo-image-picker';
import { apiRequest } from './api';
import { imageBody } from '@/utils/image-picker';

export type ImageUploadResult = { imageUrl: string; publicId: string; format: 'png' | 'jpg' | 'webp' };

export const imageService = {
  async upload(asset: ImagePickerAsset, signal?: AbortSignal): Promise<ImageUploadResult> {
    const body = await imageBody(asset, signal);
    const result = await apiRequest<ImageUploadResult>('/images', { method: 'POST', body, signal });
    if (!result?.imageUrl || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(result.imageUrl)
      || !result.publicId || !['png', 'jpg', 'webp'].includes(result.format)
      || !result.imageUrl.endsWith(`/${result.publicId}.${result.format}`))
      throw new Error('Chưa nhận được ảnh tải lên hợp lệ. Vui lòng thử lại.');
    return result;
  },
};
