import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '@/services/api';

export async function pickProfileImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
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
  const result = await apiRequest<{ url: string }>('/profile/images', { method: 'POST', body, signal });
  if (!result.url || !/^https?:\/\//i.test(result.url)) throw new Error('Chưa nhận được ảnh tải lên. Vui lòng thử lại.');
  return result.url;
}

function validateImage(size: number | undefined, type: string) {
  if (size !== undefined && (size <= 0 || size > 5 * 1024 * 1024)) throw new Error('Vui lòng chọn ảnh có dung lượng tối đa 5 MB.');
  if (type && !['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
}
