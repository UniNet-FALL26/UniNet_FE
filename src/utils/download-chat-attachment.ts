import { Platform } from 'react-native';
import type { ChatAttachment } from '@/types/messaging';
import { loadChatAttachment } from '@/utils/load-chat-attachment';

export async function downloadChatAttachment(file: ChatAttachment) {
  const resource = await loadChatAttachment(file);
  if (Platform.OS === 'web') {
    try {
      const link = document.createElement('a'); link.href = resource.uri; link.download = file.fileName; link.click();
    } finally { setTimeout(resource.dispose, 60000); }
    return;
  }
  try {
    const sharing = await import('expo-sharing');
    await sharing.shareAsync(resource.uri, { mimeType: file.mimeType, dialogTitle: file.fileName });
    // Keep shared cache files available for the receiving app, as before.
  } catch (cause) {
    resource.dispose();
    throw cause;
  }
}
