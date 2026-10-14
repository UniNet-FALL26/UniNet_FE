import type { ImagePickerAsset } from 'expo-image-picker';
import { apiRequest } from '@/services/api';
import { imageBody } from '@/utils/image-picker';

export { pickImage as pickProfileImage, imageBody as profileImageBody } from '@/utils/image-picker';

// Existing profile uploads keep their local-storage API; new screens can use imageService.
export async function uploadProfileImage(asset: ImagePickerAsset, signal: AbortSignal): Promise<string> {
  const body = await imageBody(asset, signal);
  const result = await apiRequest<{ url: string }>('/profile/images', { method: 'POST', body, signal });
  if (!result.url || !/^https?:\/\//i.test(result.url)) throw new Error('Chưa nhận được ảnh tải lên. Vui lòng thử lại.');
  return result.url;
}
