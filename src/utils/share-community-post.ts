import { createURL } from 'expo-linking';
import { Platform, Share } from 'react-native';
import { reportApiFailure } from '@/services/api';
import { toast } from '@/store/toast.store';

export async function shareCommunityPost(id: string, title = 'UniNet') {
  const url = createURL(`/post/${encodeURIComponent(id)}`);
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Đã sao chép liên kết.'); }
    } else await Share.share({ title, message: url, url });
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) reportApiFailure(error, 'Chưa chia sẻ được liên kết.');
  }
}
