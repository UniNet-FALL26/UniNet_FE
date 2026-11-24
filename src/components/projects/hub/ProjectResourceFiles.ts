import { Platform } from 'react-native';
import type { HubFile } from '@/types/project-hub';
import { openProjectUrl, safeUrl } from './ProjectHubFields';

export function fileSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function uploadDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  const iso = new Date(Date.parse(value) + 7 * 60 * 60 * 1000).toISOString();
  return `${iso.slice(0, 10).split('-').reverse().join('/')}, ${iso.slice(11, 16)}`;
}

export async function downloadProjectFile(file: HubFile) {
  if (!safeUrl(file.url)) throw new Error('Đường dẫn tài liệu không hợp lệ.');
  if (Platform.OS !== 'web') { openProjectUrl(file.url); return; }
  const response = await fetch(file.url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Không thể tải xuống tài liệu. Vui lòng thử lại.');
  const blob = await response.blob(), url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = file.name; link.rel = 'noopener';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
