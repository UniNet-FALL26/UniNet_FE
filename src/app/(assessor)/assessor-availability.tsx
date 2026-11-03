import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { assessorService, type AvailabilitySlot } from '@/services/assessor.service';
import { AssessorState, assessorDate, assessorStyles as s } from '@/components/assessor/assessor-ui';
import { AvailabilityDateTimePicker } from '@/components/assessor/AvailabilityDateTimePicker';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

export default function AssessorAvailabilityScreen() {
  const { account } = useAuthStore(); const narrow = useWindowDimensions().width < 700;
  const [range, setRange] = useState(() => ({ from: new Date(), to: new Date(Date.now() + 30 * 86400000) }));
  const [loaded, setLoaded] = useState<{ owner: string; rows: AvailabilitySlot[] } | null>(null), [error, setError] = useState(''), [actionError, setActionError] = useState(''), [notice, setNotice] = useState(''), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [deleting, setDeleting] = useState<string | null>(null); const running = useRef(false); const identity = useRef(account?.id); identity.current = account?.id;
  useFocusEffect(useCallback(() => {
    if (!account) return; const owner = account.id; const controller = new AbortController(); setError('');
    assessorService.availability(range.from.toISOString(), range.to.toISOString(), controller.signal).then(rows => { if (!controller.signal.aborted) setLoaded({ owner, rows }); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được lịch.'); });
    return () => controller.abort();
  }, [account?.id, range, attempt]));
  const mutate = async (operation: () => Promise<unknown>, message: string) => {
    if (running.current) return; const owner = account?.id; running.current = true; setBusy(true); setActionError(''); setNotice('');
    try { await operation(); if (identity.current === owner) { setNotice(message); setDeleting(null); setAttempt(v => v + 1); } }
    catch (e) { if (identity.current === owner) { setActionError(e instanceof Error ? e.message : 'Chưa cập nhật được lịch.'); if (e instanceof ApiError && e.status === 409) { setLoaded(null); setAttempt(v => v + 1); } } }
    finally { running.current = false; if (identity.current === owner) setBusy(false); }
  };
  const save = () => {
    const from = start ? new Date(start) : null, to = end ? new Date(end) : null;
    if (!from || !to || from <= new Date() || to <= from || to.getTime() - from.getTime() > 31 * 86400000 || to.getTime() > Date.now() + 365 * 86400000) { setActionError('Chọn ngày giờ hợp lệ trong 365 ngày tới, kết thúc sau bắt đầu, khoảng rảnh tối đa 31 ngày.'); return; }
    void mutate(async () => { if (editingId) await assessorService.updateAvailability(editingId, from.toISOString(), to.toISOString()); else await assessorService.saveAvailability(from.toISOString(), to.toISOString()); if (identity.current === account?.id) { setStart(''); setEnd(''); setEditingId(null); } }, 'Đã lưu khung giờ làm việc.');
  };
  const rows = loaded?.owner === account?.id ? loaded?.rows : null;
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={[s.secondaryButton, { alignSelf: 'flex-start' }]}><Text style={s.link}>← Danh sách thẩm định</Text></Pressable>
    <View style={s.headingCopy}><Text style={s.eyebrow}>LỊCH CHUYÊN GIA</Text><Text role="heading" aria-level={1} style={s.title}>Lịch làm việc</Text><Text style={s.muted}>Đăng ký khung giờ rảnh trong 365 ngày tới để nhận lịch thẩm định phù hợp.</Text></View>
    <View style={s.card}><Text style={s.sectionTitle}>{editingId ? 'Chỉnh sửa khung giờ' : 'Thêm khung giờ'}</Text><Text style={s.muted}>Chọn ngày và giờ bắt đầu, kết thúc theo múi giờ của bạn.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}><AvailabilityDateTimePicker label="Bắt đầu khung giờ" value={start} onChange={setStart} disabled={busy} minimumDate={new Date()} maximumDate={new Date(Date.now() + 365 * 86400000)} /><AvailabilityDateTimePicker label="Kết thúc khung giờ" value={end} onChange={setEnd} disabled={busy} minimumDate={start ? new Date(start) : new Date()} maximumDate={new Date(Math.min(Date.now() + 365 * 86400000, start ? new Date(start).getTime() + 31 * 86400000 : Infinity))} /></View>{!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}{!!notice && <Text accessibilityRole="alert" style={s.link}>{notice}</Text>}<Button title={busy ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm khung giờ'} disabled={busy || !start || !end} onPress={save} /></View>
    {editingId && <Button title="Hủy chỉnh sửa" variant="outline" disabled={busy} onPress={() => { setEditingId(null); setStart(''); setEnd(''); }} />}
    <View style={s.actions}><Button title="30 ngày trước" variant="outline" disabled={busy} onPress={() => { setLoaded(null); setRange(r => ({ from: new Date(r.from.getTime() - 30 * 86400000), to: new Date(r.to.getTime() - 30 * 86400000) })); }} /><Text style={s.muted}>{assessorDate(range.from.toISOString())} — {assessorDate(range.to.toISOString())}</Text><Button title="30 ngày tiếp" variant="outline" disabled={busy} onPress={() => { setLoaded(null); setRange(r => ({ from: new Date(r.from.getTime() + 30 * 86400000), to: new Date(r.to.getTime() + 30 * 86400000) })); }} /></View>
    <View style={s.card}><Text style={s.sectionTitle}>Khung giờ đã đăng ký</Text>{error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !rows ? <AssessorState loading /> : !rows.length ? <AssessorState empty="Chưa có khung giờ rảnh" /> : rows.map(slot => <View key={slot.id} style={[s.divider, s.heading]}><View style={{ flex: 1, gap: 6 }}><Text style={s.body}>{assessorDate(slot.startAt)}</Text><Text style={s.muted}>đến {assessorDate(slot.endAt)}</Text></View><Pressable accessibilityRole="button" disabled={busy} onPress={() => { setEditingId(slot.id); setStart(slot.startAt); setEnd(slot.endAt); setActionError(''); }} style={s.secondaryButton}><Text style={s.link}>Chỉnh sửa</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => { if (deleting === slot.id) void mutate(() => assessorService.deleteAvailability(slot.id), 'Đã xóa khung giờ.'); else setDeleting(slot.id); }} style={s.secondaryButton}><Text style={s.link}>{deleting === slot.id ? 'Xác nhận xóa' : 'Xóa khung giờ'}</Text></Pressable></View>)}</View>
  </ScrollView></View>;
}
