import { imageService } from '@/services/image.service';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickProfileImage(_cropFor?: 'avatarUrl' | 'coverUrl'): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
  return result.canceled ? null : result.assets[0];
}

export async function uploadProfileImage(asset: ImagePicker.ImagePickerAsset, signal: AbortSignal): Promise<string> {
  return (await imageService.upload(asset, signal)).imageUrl;
}
