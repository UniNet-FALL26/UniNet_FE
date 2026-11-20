import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { messagingService } from '@/services/messaging.service';
import type { ChatAttachment } from '@/types/messaging';

export type ChatAttachmentResource = { uri: string; dispose: () => void };

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'application/pdf': 'pdf', 'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error('Đã hủy tải file.');
    error.name = 'AbortError';
    throw error;
  }
}

export async function loadChatAttachment(file: ChatAttachment, signal?: AbortSignal): Promise<ChatAttachmentResource> {
  checkAbort(signal);
  if (Platform.OS === 'web') {
    const blob = await messagingService.attachmentBlob(file, signal);
    checkAbort(signal);
    const uri = URL.createObjectURL(blob);
    return { uri, dispose: () => URL.revokeObjectURL(uri) };
  }
  const { File, Paths } = await import('expo-file-system');
  // Native Blob may not implement arrayBuffer; read the response bytes directly.
  const bytes = await messagingService.attachmentBytes(file, signal);
  checkAbort(signal);
  const extension = Object.hasOwn(extensions, file.mimeType) ? extensions[file.mimeType] : /\.([a-z0-9]{1,10})$/i.exec(file.fileName)?.[1].toLowerCase() || 'bin';
  const saved = new File(Paths.cache, `chat-${randomUUID()}.${extension}`);
  const dispose = () => { try { if (saved.exists) saved.delete(); } catch { /* The OS may already have evicted this cache file. */ } };
  try {
    saved.write(bytes);
    checkAbort(signal);
    return { uri: saved.uri, dispose };
  } catch (cause) {
    dispose();
    throw cause;
  }
}
