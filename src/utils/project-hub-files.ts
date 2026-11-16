import * as DocumentPicker from 'expo-document-picker';
import { uploadReportFile } from '@/services/report-file.service';
import type { HubFile } from '@/types/project-hub';

export async function pickProjectAsset(kind: 'logo' | 'media' | 'document'): Promise<HubFile | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: kind === 'logo' ? ['image/png', 'image/jpeg'] : kind === 'media' ? ['image/*', 'video/*'] : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    multiple: false, copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const file = picked.assets[0];
  const limit = kind === 'logo' ? 5 : 20;
  if (file.size == null || file.size > limit * 1024 * 1024) throw new Error(`Vui lòng chọn tệp có dung lượng tối đa ${limit} MB.`);
  if (kind === 'logo' && !['image/png', 'image/jpeg'].includes(file.mimeType ?? '')) throw new Error('Ảnh dự án cần có định dạng PNG hoặc JPG.');
  const result = await uploadReportFile(file, '');
  return { url: result.imageUrl, name: file.name, type: kind === 'document' ? 'document' : file.mimeType?.startsWith('video/') ? 'video' : 'image' };
}
