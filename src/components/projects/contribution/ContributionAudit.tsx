import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { contributionService as api } from '@/services/contribution.service';
import type { Exclusion, RunAudit, ScoredActivity, SnapshotMember } from '@/types/contribution';
import { auditActionLabel } from '@/utils/contribution-presentation';
import { categoryLabel, contributionError, reasonLabel } from '@/utils/contribution';
import { HubAction } from '../hub/ProjectHubUI';
import { contributionStyles as s } from './styles';
type Row = SnapshotMember | ScoredActivity | Exclusion | RunAudit;
export function ContributionAudit({ projectId, resourceId, kind }: { projectId: string; resourceId: string; kind: 'memberships' | 'activities' | 'exclusions' | 'audit' }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [loaded, setLoaded] = useState<{ key: string; value: { items: Row[]; total: number } | null; error: string } | null>(null);
  const key = [projectId, resourceId, kind, page, attempt].join(":" );
  useEffect(() => {
    const ctrl = new AbortController();
    void api[kind](projectId, resourceId, page, ctrl.signal).then(value => { if (!ctrl.signal.aborted) setLoaded({ key, value, error: '' }); }).catch(cause => { if (!ctrl.signal.aborted) setLoaded({ key, value: null, error: contributionError(cause) }); });
    return () => ctrl.abort();
  }, [projectId, resourceId, kind, page, attempt, key]);
  const data = loaded?.key === key ? loaded.value : null, error = loaded?.key === key ? loaded.error : '';
  return <View style={{ gap: 12 }}><Text style={s.small}>Thông tin phục vụ kiểm tra kết quả, chỉ dành cho chủ dự án.</Text>
    {error ? <><Text style={s.error}>{error}</Text><HubAction title="Thử lại chi tiết" onPress={() => setAttempt(x => x + 1)} /></> : !data ? <ActivityIndicator accessibilityLabel="Đang tải chi tiết" /> : <>
      {!data.items.length && <Text style={s.copy}>Không có mục nào trong phạm vi này.</Text>}
      {data.items.map((x, index) => <View key={index} style={s.item}>{'category' in x && <Text style={s.heading}>{categoryLabel(x.category)}</Text>}
        {'reason' in x && <Text style={s.copy}>{reasonLabel(x.reason)}</Text>}
        {'action' in x && <Text style={s.copy}>{auditActionLabel(x.action)} · {new Date(x.at).toLocaleString('vi-VN')}{x.feedback ? `\n${x.feedback}` : ''}</Text>}
        {'activityAt' in x && <Text style={s.small}>{new Date(x.activityAt).toLocaleString('vi-VN')}</Text>}
        {'validationStatus' in x && <Text style={s.small}>Trạng thái dữ liệu: {x.validationStatus === 'Valid' ? 'Đã xác minh' : 'Cần kiểm tra'}</Text>}
      </View>)}
      <View style={s.row}><HubAction title="Trang trước" disabled={page <= 1} onPress={() => setPage(p => p - 1)} /><Text style={s.copy}>Trang {page}</Text><HubAction title="Trang tiếp" disabled={page * 20 >= data.total} onPress={() => setPage(p => p + 1)} /></View>
    </>}
  </View>;
}
