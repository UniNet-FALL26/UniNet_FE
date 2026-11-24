import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { API_URL } from '@/constants/config';
import { apiRequest, ApiError } from '@/services/api';
import { useGitHubRevalidation } from './useGitHubRevalidation';
import { validatePublished, type PublishedContribution } from '@/utils/published-contribution';

export function usePublishedContribution(projectId: string, accountId?: string) {
  const [value, setValue] = useState<PublishedContribution | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const refresh = useGitHubRevalidation(`public-contribution:${accountId ?? 'guest'}:${projectId}`, projectId, async signal => {
    setLoading(true);
    try {
      const result = validatePublished(await apiRequest<PublishedContribution>(`${API_URL.endsWith('/api') ? '' : '/api'}/projects/${encodeURIComponent(projectId)}/contribution/v2/results/public`, { signal, feedback: false, cache: 'no-store' }), projectId);
      if (!signal.aborted) { setValue(result); setError(''); }
      return true;
    } catch (cause) {
      if (!signal.aborted) { setValue(null); setError(cause instanceof ApiError && [401, 403].includes(cause.status ?? 0) ? 'Bạn cần quyền xem dự án để xem điểm đã công bố.' : 'Không thể tải điểm đã công bố.'); }
      throw cause;
    } finally { if (!signal.aborted) setLoading(false); }
  });
  // Lightweight read of frozen publication metadata only, while this Members tab is mounted.
  // Foreground/focus refresh is also supplied by the shared coalescing/abort lifecycle.
  useEffect(() => {
    const timer = setInterval(() => {
      if (Platform.OS === 'web' ? document.visibilityState === 'visible' && document.hasFocus() : AppState.currentState === 'active') void refresh.check();
    }, 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  const timeout = refresh.state === 'timeout';
  return { value: timeout ? null : value, loading: timeout ? false : loading, error: timeout ? 'Không thể xác nhận điểm đã công bố. Vui lòng thử lại.' : error, retry: refresh.check };
}
