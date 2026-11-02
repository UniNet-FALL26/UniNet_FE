import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { assessorService, type AvailabilitySlot } from '@/services/assessor.service';
import { AssessorState, assessorDate, assessorStyles as s } from '@/components/assessor/assessor-ui';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';

function localDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d, h, minute] = match.map(Number); const date = new Date(y, m - 1, d, h, minute);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && date.getHours() === h && date.getMinutes() === minute ? date : null;
}
export default function AssessorAvailabilityScreen() {
  const { account } = useAuthStore(); const narrow = useWindowDimensions().width < 700;
  const [range] = useState(() => ({ from: new Date(), to: new Date(Date.now() + 30 * 86400000) }));
  const [loaded, setLoaded] = useState<{ owner: string; rows: AvailabilitySlot[] } | null>(null), [error, setError] = useState(''), [actionError, setActionError] = useState(''), [notice, setNotice] = useState(''), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [deleting, setDeleting] = useState<string | null>(null); const running = useRef(false); const identity = useRef(account?.id); identity.current = account?.id;
  useFocusEffect(useCallback(() => {
    if (!account) return; const owner = account.id; const controller = new AbortController(); setError('');
    assessorService.availability(range.from.toISOString(), range.to.toISOString(), controller.signal).then(rows => { if (!controller.signal.aborted) setLoaded({ owner, rows }); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được lịch.'); });
    return () => controller.abort();
  }, [account?.id, range, attempt]));
  const mutate = async (operation: () => Promise<unknown>, message: string) => {
    if (running.current) return; const owner = account?.id; running.current = true; setBusy(true); setActionError(''); setNotice('');
    try { await operation(); if (identity.current === owner) { setNotice(message); setDeleting(null); setAttempt(v => v + 1); } }
    catch (e) { if (identity.current === owner) setActionError(e instanceof Error ? e.message : 'Chưa cập nhật được lịch.'); }
    finally { running.current = false; if (identity.current === owner) setBusy(false); }
  };
  const save = () => {
    const from = localDate(start), to = localDate(end);
    if (!from || !to || from <= new Date() || to <= from || from < range.from || to > range.to) { setActionError('Nhập ngày giờ hợp lệ trong 30 ngày tới, kết thúc sau bắt đầu. Định dạng: YYYY-MM-DD HH:mm.'); return; }
    void mutate(async () => { await assessorService.saveAvailability(from.toISOString(), to.toISOString()); if (identity.current === account?.id) { setStart(''); setEnd(''); } }, 'Đã thêm khung giờ làm việc.');
  };
  const rows = loaded?.owner === account?.id ? loaded?.rows : null;
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={[s.secondaryButton, { alignSelf: 'flex-start' }]}><Text style={s.link}>← Danh sách thẩm định</Text></Pressable>
    <View style={s.headingCopy}><Text style={s.eyebrow}>LỊCH CHUYÊN GIA</Text><Text role="heading" aria-level={1} style={s.title}>Lịch làm việc</Text><Text style={s.muted}>Đăng ký khung giờ rảnh trong 30 ngày tới để nhận lịch thẩm định phù hợp.</Text></View>
    <View style={s.card}><Text style={s.sectionTitle}>Thêm khung giờ</Text><Text style={s.muted}>Nhập theo giờ địa phương, ví dụ 2026-11-02 09:00.</Text><Text style={s.label}>Bắt đầu (YYYY-MM-DD HH:mm)</Text><TextInput accessibilityLabel="Bắt đầu khung giờ" placeholder="YYYY-MM-DD HH:mm" value={start} onChangeText={setStart} editable={!busy} style={s.input} maxLength={16} /><Text style={s.label}>Kết thúc (YYYY-MM-DD HH:mm)</Text><TextInput accessibilityLabel="Kết thúc khung giờ" placeholder="YYYY-MM-DD HH:mm" value={end} onChangeText={setEnd} editable={!busy} style={s.input} maxLength={16} />{!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}{!!notice && <Text accessibilityRole="alert" style={s.link}>{notice}</Text>}<Button title={busy ? 'Đang lưu…' : 'Thêm khung giờ'} disabled={busy || !start || !end} onPress={save} /></View>
    <View style={s.card}><Text style={s.sectionTitle}>Khung giờ đã đăng ký</Text>{error ? <AssessorState error={error} retry={() => setAttempt(v => v + 1)} /> : !rows ? <AssessorState loading /> : !rows.length ? <AssessorState empty="Chưa có khung giờ rảnh" /> : rows.map(slot => <View key={slot.id} style={[s.divider, s.heading]}><View style={{ flex: 1, gap: 6 }}><Text style={s.body}>{assessorDate(slot.startAt)}</Text><Text style={s.muted}>đến {assessorDate(slot.endAt)}</Text></View><Pressable accessibilityRole="button" disabled={busy} onPress={() => { if (deleting === slot.id) void mutate(() => assessorService.deleteAvailability(slot.id), 'Đã xóa khung giờ.'); else setDeleting(slot.id); }} style={s.secondaryButton}><Text style={s.link}>{deleting === slot.id ? 'Xác nhận xóa' : 'Xóa khung giờ'}</Text></Pressable></View>)}</View>
  </ScrollView></View>;
}
