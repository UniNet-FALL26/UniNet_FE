import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth.store';
import { portfolioService } from '@/services/portfolio.service';
import { communityService, type PostResponse } from '@/services/community.service';
import { pickProfileImage, uploadProfileImage } from '@/utils/profile-image-picker';

export function CommunityComposer({ onCreated }: { onCreated: (post: PostResponse) => void }) {
  const { account } = useAuthStore();
  const { width } = useWindowDimensions();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const input = useRef<TextInput>(null);
  useEffect(() => {
    const request = new AbortController();
    setAvatar(null);
    if (account?.id) portfolioService.getMine(request.signal).then(data => {
      if (!request.signal.aborted && data.isOwner) setAvatar(data.profile.avatarUrl || null);
    }).catch(() => {});
    return () => { request.abort(); controller.current?.abort(); };
  }, [account?.id]);
  function close() { if (!busy) { setOpen(false); setError(''); } }
  function start() { setNotice(''); setError(''); setOpen(true); }
  async function attach() {
    setError('');
    try {
      const asset = await pickProfileImage();
      if (!asset) return;
      setBusy(true);
      controller.current = new AbortController();
      setMediaUrl(await uploadProfileImage(asset, controller.current.signal));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tải được ảnh. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (busy || !description.trim()) return;
    setBusy(true); setError('');
    controller.current = new AbortController();
    try {
      const post = await communityService.createPost({ description: description.trim(), mediaUrls: mediaUrl ? [mediaUrl] : [] }, controller.current.signal);
      onCreated(post); setDescription(''); setMediaUrl(null); setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa đăng được bài. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  const actions = [
    { label: 'Ảnh/Video', icon: { ios: 'photo.fill', android: 'image', web: 'image' }, tint: '#14B87A', onPress: start },
    { label: 'Tài liệu', icon: { ios: 'doc.text.fill', android: 'description', web: 'description' }, tint: '#2589FF', onPress: () => router.push('/(tabs)/documents') },
    { label: 'Khảo sát', icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }, tint: '#FF9819', onPress: () => setNotice('Tính năng tạo khảo sát sẽ sớm có mặt.') },
    { label: 'Sự kiện', icon: { ios: 'calendar', android: 'event', web: 'event' }, tint: '#9C60FF', onPress: () => router.push('/(tabs)/events') },
  ] as const;
  return <View testID="community-composer" style={[s.card, Platform.OS === 'web' && width >= 1024 && s.desktopCard]}>
    <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ cá nhân" onPress={() => router.navigate('/(tabs)/profile')} style={s.avatar}>
        {avatar ? <Image accessibilityLabel="Ảnh đại diện của bạn" source={{ uri: avatar }} onError={() => setAvatar(null)} style={s.avatarImage} /> : <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={22} tintColor={colors.primary} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Tạo bài viết mới" onPress={start} style={({ pressed }) => [s.prompt, pressed && s.pressed]}>
        <Text numberOfLines={1} style={s.placeholder}>Bạn đang nghĩ gì? Chia sẻ với cộng đồng UniNet...</Text>
      </Pressable>
    </View>
    <View style={s.actions}>{actions.map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={({ pressed }) => [s.action, pressed && s.pressed]}>
      <SymbolView name={action.icon} size={width < 380 ? 17 : 20} tintColor={action.tint} /><Text style={[s.label, width < 380 && s.smallLabel]}>{action.label}</Text>
    </Pressable>)}</View>
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} onShow={() => input.current?.focus()}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View accessibilityViewIsModal style={s.dialog}>
          <View style={s.dialogHeader}><Text role="heading" aria-level={2} style={s.title}>Tạo bài viết</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng trình soạn bài" disabled={busy} onPress={close} style={s.close}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={22} tintColor={colors.navy} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.dialogContent}>
            <TextInput ref={input} accessibilityLabel="Nội dung bài viết" multiline placeholder="Bạn muốn chia sẻ điều gì với cộng đồng?" value={description} onChangeText={setDescription} editable={!busy} style={s.input} placeholderTextColor={colors.textMuted} />
            {mediaUrl && <View style={s.preview}><Image source={{ uri: mediaUrl }} resizeMode="contain" style={s.previewImage} /><Button title="Xóa ảnh" variant="outline" onPress={() => setMediaUrl(null)} disabled={busy} /></View>}
            <Button title="Thêm ảnh" variant="outline" onPress={() => { void attach(); }} disabled={busy} />
            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Button title="Đăng bài" onPress={() => { void publish(); }} disabled={!description.trim()} loading={busy} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  // Outer header/container spacing is 14px; this makes the desktop gap 11px instead of 22px.
  desktopCard: { marginTop: -3 },
  card: { width: '100%', maxWidth: 768, alignSelf: 'center', marginTop: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EFF9', borderRadius: 16, boxShadow: '0 3px 16px rgba(41, 101, 171, 0.05)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: 40, height: 40 },
  prompt: { flex: 1, minHeight: 40, borderRadius: 22, backgroundColor: '#F0F6FF', paddingHorizontal: 16, justifyContent: 'center' }, placeholder: { color: '#91A4BF', fontSize: 13 },
  actions: { flexDirection: 'row', marginTop: 4 }, action: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9 }, label: { fontSize: 12, fontWeight: '600', color: '#657D9F' }, smallLabel: { fontSize: 10 }, pressed: { opacity: 0.65 }, notice: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 35, 72, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 18 }, dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' }, dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, title: { color: colors.navy, fontSize: 21, fontWeight: '800' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, dialogContent: { padding: 20, gap: 12 }, input: { minHeight: 150, fontSize: 16, lineHeight: 24, color: colors.navy, textAlignVertical: 'top' }, error: { fontSize: 13, color: colors.error }, preview: { gap: 8 }, previewImage: { width: '100%', height: 180 },
});
