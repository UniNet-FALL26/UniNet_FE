import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { assessorService, type AvailabilitySlot } from '@/services/assessor.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { calendarDays, loadCalendarAvailability, sameCalendarDay, slotsOnDay } from '@/utils/assessor-calendar';
import { Button } from '@/components/ui/Button';
import { AssessorState, assessorDate } from './assessor-ui';
import { AvailabilityEditorDialog } from './AvailabilityEditorDialog';
import { WorkMonthCalendar } from './WorkMonthCalendar';
import { workScheduleStyles as s } from './work-schedule.styles';

export function WorkScheduleScreen() {
  const { account } = useAuthStore();
  const width = useWindowDimensions().width, narrow = width < 700, stacked = width < 760;
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date(new Date().setHours(0, 0, 0, 0)));
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; rows: AvailabilitySlot[] } | null>(null);
  const [error, setError] = useState(''), [actionError, setActionError] = useState(''), [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false), [editingId, setEditingId] = useState<string | null>(null);
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [deleting, setDeleting] = useState<string | null>(null);
  const running = useRef(false), identity = useRef(account?.id);
  useEffect(() => { identity.current = account?.id; return () => { identity.current = undefined; }; }, [account?.id]);
  const range = useMemo(() => {
    const days = calendarDays(month), last = days[days.length - 1];
    return { from: days[0], to: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1) };
  }, [month]);
  const key = `${account?.id}:${range.from.toISOString()}:${attempt}`;
  useFocusEffect(useCallback(() => {
    if (!account) return;
    const controller = new AbortController(); setError('');
    loadCalendarAvailability(assessorService.availability, range.from, range.to, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setLoaded({ key, rows }); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được lịch.'); });
    return () => controller.abort();
  }, [account, range, key]));
  const rows = loaded?.key === key ? loaded.rows : null;
  const dayRows = slotsOnDay(rows || [], selected);
  const buttonStyle = { ...s.button, ...(narrow ? s.mobileButton : {}) };
  const selectDay = (day: Date) => {
    setSelected(day); setNow(new Date()); setEditorOpen(false); setEditingId(null); setDeleting(null); setActionError(''); setNotice('');
    if (day.getMonth() !== month.getMonth() || day.getFullYear() !== month.getFullYear()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  const mutate = async (operation: () => Promise<unknown>, message: string) => {
    if (running.current) return;
    const owner = account?.id; running.current = true; setBusy(true); setActionError(''); setNotice('');
    try { await operation(); if (identity.current === owner) { setNotice(message); setDeleting(null); setAttempt(value => value + 1); } }
    catch (cause) { if (identity.current === owner) { setActionError(cause instanceof Error ? cause.message : 'Chưa cập nhật được lịch.'); if (cause instanceof ApiError && cause.status === 409) setAttempt(value => value + 1); } }
    finally { running.current = false; if (identity.current === owner) setBusy(false); }
  };
  const openEditor = (slot?: AvailabilitySlot) => {
    const current = new Date();
    setNow(current); setEditingId(slot?.id || null); setActionError(''); setNotice(''); setDeleting(null);
    const from = new Date(selected);
    from.setHours(sameCalendarDay(selected, current) ? Math.min(current.getHours() + 1, 23) : 9, 0, 0, 0);
    setStart(slot?.startAt || from.toISOString());
    setEnd(slot?.endAt || new Date(from.getTime() + 3600000).toISOString());
    setEditorOpen(true);
  };
  const save = () => {
    const from = new Date(start), to = new Date(end);
    if (!start || !end || !Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
      setActionError('Vui lòng chọn đầy đủ giờ bắt đầu và giờ kết thúc.'); return;
    }
    if (to <= from) { setActionError('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
    if (from <= new Date()) { setActionError('Thời gian bắt đầu phải ở trong tương lai.'); return; }
    if (to.getTime() - from.getTime() > 31 * 86400000) { setActionError('Khung giờ không được dài quá 31 ngày.'); return; }
    if (to.getTime() > Date.now() + 365 * 86400000) { setActionError('Chỉ được đăng ký khung giờ trong 365 ngày tới.'); return; }
    void mutate(async () => {
      if (editingId) await assessorService.updateAvailability(editingId, from.toISOString(), to.toISOString());
      else await assessorService.saveAvailability(from.toISOString(), to.toISOString());
      if (identity.current === account?.id) {
        setEditorOpen(false); setEditingId(null);
        const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        setSelected(day);
        if (day.getMonth() !== month.getMonth() || day.getFullYear() !== month.getFullYear()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
      }
    }, 'Đã lưu khung giờ làm việc.');
  };
  const nextDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + 1);
  const canAdd = nextDay > now && selected.getTime() < now.getTime() + 365 * 86400000;
  const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return <View style={s.page}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, narrow && s.mobileContent]}>
    <View style={s.heading}>
      <View style={s.headingIcon}><SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={24} tintColor={colors.primary} /></View>
      <View style={s.headingCopy}><Text role="heading" aria-level={1} style={s.title}>Lịch làm việc của tôi</Text><Text style={s.muted}>Chọn ngày để xem và quản lý khung giờ nhận thẩm định.</Text></View>
      <Button title="Hôm nay" variant="outline" disabled={busy} style={buttonStyle} textStyle={s.buttonText} onPress={() => { const today = new Date(); today.setHours(0, 0, 0, 0); selectDay(today); }} />
    </View>
    <View style={[s.calendarLayout, stacked && s.stackedLayout]}>
      <View style={stacked ? s.calendarFullWidth : s.calendarColumn}><WorkMonthCalendar month={month} selected={selected} today={now} rows={rows || []} disabled={busy} onSelect={selectDay} onMonthChange={direction => selectDay(new Date(month.getFullYear(), month.getMonth() + direction, 1))} /></View>
      <View role="region" accessibilityLabel="Khung giờ trong ngày" style={[s.card, s.dayPanel]}>
        <View style={s.heading}><SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} size={19} tintColor={colors.primary} /><View style={s.headingCopy}><Text role="heading" aria-level={2} style={s.sectionTitle}>Lịch làm việc ngày {selected.toLocaleDateString('vi-VN')}</Text><Text style={s.small}>{rows && !error ? `${dayRows.length} khung giờ đã đăng ký` : 'Giờ hiển thị theo thiết bị của bạn'}</Text></View></View>
        {!!notice && <Text accessibilityRole="alert" style={s.link}>{notice}</Text>}
        {!!actionError && !editorOpen && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
        {error ? <AssessorState error={error} retry={() => setAttempt(value => value + 1)} /> : !rows ? <AssessorState loading /> : <>
          {!dayRows.length ? <View style={s.dayEmpty}><SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={25} tintColor={colors.textMuted} /><Text style={s.muted}>Chưa có khung giờ đăng ký trong ngày này.</Text></View> : dayRows.map(slot => {
            const crossDay = !sameCalendarDay(new Date(slot.startAt), new Date(slot.endAt));
            return <View key={slot.id} style={s.slotRow}>
              <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={17} tintColor={colors.textSecondary} />
              <View style={s.slotCopy}><Text style={s.date}>{time(slot.startAt)} – {time(slot.endAt)}</Text>{crossDay && <Text style={s.small}>{assessorDate(slot.startAt)} — {assessorDate(slot.endAt)}</Text>}</View>
              <View style={s.slotActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh sửa khung giờ ${time(slot.startAt)}`} disabled={busy} onPress={() => openEditor(slot)} style={({ pressed, hovered }) => [s.iconButton, (pressed || hovered) && s.editHover]}><SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={17} tintColor={colors.primary} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Xóa khung giờ ${time(slot.startAt)}`} disabled={busy} onPress={() => { setDeleting(slot.id); setActionError(''); setEditorOpen(false); setEditingId(null); }} style={({ pressed, hovered }) => [s.iconButton, (pressed || hovered) && s.deleteHover]}><SymbolView name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} size={17} tintColor={colors.error} /></Pressable>
              </View>
              {deleting === slot.id && <View style={s.deleteConfirmation}><Text style={s.muted}>Xóa khung giờ này?</Text><View style={s.actions}><Button title="Giữ lại" variant="outline" disabled={busy} style={buttonStyle} textStyle={s.buttonText} onPress={() => setDeleting(null)} /><Button title="Xác nhận xóa" variant="outline" loading={busy} style={buttonStyle} textStyle={{ ...s.buttonText, color: colors.error }} onPress={() => void mutate(() => assessorService.deleteAvailability(slot.id), 'Đã xóa khung giờ.')} /></View></View>}
            </View>;
          })}
          <Button title="Thêm khung giờ cho ngày này" variant="outline" disabled={busy || !canAdd} onPress={() => openEditor()} style={{ ...buttonStyle, width: '100%' }} textStyle={{ ...s.buttonText, color: colors.primary }} leadingIcon={<SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={17} tintColor={colors.primary} />} />
          {!canAdd && <Text style={s.small}>Chỉ đăng ký khung giờ trong 365 ngày tới.</Text>}
        </>}
      </View>
    </View>
  </ScrollView>
    {editorOpen && <AvailabilityEditorDialog editing={!!editingId} start={start} end={end} day={selected} busy={busy} error={actionError} onStartChange={value => { setStart(value); setActionError(''); }} onEndChange={value => { setEnd(value); setActionError(''); }} onSave={save} onClose={() => { setEditorOpen(false); setEditingId(null); setActionError(''); }} />}
  </View>;
}
