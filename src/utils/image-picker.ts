import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return result.canceled ? null : result.assets[0];
}

export async function imageBody(asset: ImagePicker.ImagePickerAsset, signal?: AbortSignal): Promise<FormData> {
  const body = new FormData();
  if (Platform.OS === 'web') {
    const file = asset.file || await (await fetch(asset.uri, { signal })).blob();
    validateImage(file.size, file.type);
    body.append('file', file, asset.fileName || 'image');
  } else {
    const type = asset.mimeType || 'image/jpeg';
    validateImage(asset.fileSize, type);
    const file = new File(asset.uri);
    validateImage(file.size, file.type || type);
    body.append('file', file);
  }
  return body;
}

function validateImage(size: number | undefined, type: string) {
  if (size !== undefined && (size <= 0 || size > 5 * 1024 * 1024)) throw new Error('Vui lòng chọn ảnh có dung lượng tối đa 5 MB.');
  if (type && !['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
}
