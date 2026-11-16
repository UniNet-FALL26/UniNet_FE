import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { projectHubService } from '@/services/project-hub.service';
import type { HubRequest } from '@/types/project-hub';
import { HubAction, HubModal, hubColors as c, ui } from './ProjectHubUI';

export function ProjectInboxModal({ onClose, onChanged }: { onClose: () => void; onChanged: (projectId?: string) => void }) {
  const { account } = useAuthStore();
  const [items, setItems] = useState<HubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    projectHubService.myRequests(abort.signal).then(data => { if (!abort.signal.aborted) setItems(data.items); })
      .catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được lời mời.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [attempt]);
  async function decide(item: HubRequest, decision: 'accept' | 'reject' | 'cancel') {
    setBusy(item.id); setError('');
    try {
      const updated = await projectHubService.decide(item.id, decision);
      setItems(previous => previous.map(value => value.id === updated.id ? updated : value));
      onChanged(decision === 'accept' ? item.projectId : undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa xử lý được yêu cầu.'); }
    finally { setBusy(null); }
  }
  return <HubModal title="Lời mời & ứng tuyển" subtitle="Theo dõi các yêu cầu tham gia dự án của bạn." onClose={() => { if (!busy) onClose(); }} wide={false}>
    {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 16 }]}>{error}</Text>}
    {loading ? <ActivityIndicator accessibilityLabel="Đang tải lời mời" color={c.primary} /> : !items.length ? <View style={s.empty}><Text style={ui.heading}>Chưa có lời mời hoặc đơn ứng tuyển</Text><Text style={ui.muted}>Lời mời tham gia và các đơn bạn gửi sẽ xuất hiện tại đây.</Text>{error && <HubAction title="Thử lại" onPress={() => setAttempt(value => value + 1)} />}</View> : <View style={{ gap: 14 }}>{items.map(item => <View key={item.id} style={s.item}>
      <Text style={s.kind}>{item.requestType === 1 ? item.userId === account?.profile?.id ? 'LỜI MỜI THAM GIA' : 'LỜI MỜI BẠN ĐÃ GỬI' : 'ĐƠN ỨNG TUYỂN CỦA BẠN'}</Text><Text style={ui.heading}>{item.projectTitle}</Text><Text style={ui.muted}>Vai trò: {item.role}</Text>{item.requestType === 1 && item.userId !== account?.profile?.id && <Text style={ui.muted}>Gửi đến: {item.fullName}</Text>}{item.message && <Text style={ui.muted}>{item.message}</Text>}
      <View style={s.footer}><Text style={[s.status, item.status === 1 && { color: c.success }]}>{['Đang chờ phản hồi', 'Đã chấp nhận', 'Đã từ chối', 'Đã hủy', 'Đã hết hạn'][item.status] ?? 'Đã xử lý'}</Text>{item.status === 0 && <View style={s.actions}>{item.requestType === 1 && item.userId === account?.profile?.id ? <><HubAction title="Từ chối" disabled={!!busy} onPress={() => void decide(item, 'reject')} /><HubAction title="Chấp nhận" variant="primary" busy={busy === item.id} disabled={!!busy} onPress={() => void decide(item, 'accept')} /></> : <HubAction title={item.requestType === 1 ? 'Hủy lời mời' : 'Hủy ứng tuyển'} variant="danger" busy={busy === item.id} disabled={!!busy} onPress={() => void decide(item, 'cancel')} />}</View>}</View>
    </View>)}</View>}
  </HubModal>;
}
const s = StyleSheet.create({ item: { borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 18, gap: 9 }, kind: { color: c.primary, fontSize: 10, fontWeight: '600', letterSpacing: 1 }, footer: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }, status: { color: c.textSecondary, fontSize: 12 }, actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, empty: { paddingVertical: 28, gap: 12 } });
