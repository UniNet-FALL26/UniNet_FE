import type { ImagePickerAsset } from 'expo-image-picker';
import { apiRequest } from '@/services/api';
import { imageBody } from '@/utils/image-picker';

export async function pickProfileImage(_cropFor?: 'avatarUrl' | 'coverUrl'): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
  return result.canceled ? null : result.assets[0];
}

export async function uploadProfileImage(asset: ImagePicker.ImagePickerAsset, signal: AbortSignal): Promise<string> {
  const body = new FormData();
  if (Platform.OS === 'web') {
    const file = asset.file || await (await fetch(asset.uri, { signal })).blob();
    validateImage(file.size, file.type);
    body.append('file', file, asset.fileName || 'profile-photo');
  } else {
    const type = asset.mimeType || 'image/jpeg';
    validateImage(asset.fileSize, type);
    body.append('file', { uri: asset.uri, name: asset.fileName || 'profile-photo.jpg', type } as unknown as Blob);
  }
  const result = await apiRequest<{ imageUrl: string }>('/images', { method: 'POST', body, signal });
  if (!result.imageUrl || !/^https:\/\/res\.cloudinary\.com\//i.test(result.imageUrl)) throw new Error('Chưa nhận được ảnh Cloudinary. Vui lòng thử lại.');
  return result.imageUrl;
export { pickImage as pickProfileImage, imageBody as profileImageBody } from '@/utils/image-picker';

// Existing profile uploads keep their local-storage API; new screens can use imageService.
export async function uploadProfileImage(asset: ImagePickerAsset, signal: AbortSignal): Promise<string> {
  const body = await imageBody(asset, signal);
  const result = await apiRequest<{ url: string }>('/profile/images', { method: 'POST', body, signal });
  if (!result.url || !/^https?:\/\//i.test(result.url)) throw new Error('Chưa nhận được ảnh tải lên. Vui lòng thử lại.');
  return result.url;
}
