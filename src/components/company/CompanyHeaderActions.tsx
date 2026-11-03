import { useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { CompanyIcon } from './company-ui';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { colors } from '@/constants/colors';
import { apiRequest } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

export function CompanyHeaderActions() {
  const { account } = useAuthStore();
  const pathname = usePathname();
  const [avatar, setAvatar] = useState<{ accountId: string; url: string | null } | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const currentAvatar = account?.profile?.avatarUrl !== undefined ? account.profile.avatarUrl : avatar?.accountId === account?.id ? avatar?.url : null;
  const avatarUrl = currentAvatar !== failedAvatar ? currentAvatar : null;
  const active = pathname === '/profile' || pathname === '/verification';

  useEffect(() => {
    if (!account?.id) return;
    const accountId = account.id;
    const controller = new AbortController();
    apiRequest<{ profile: { avatarUrl: string | null } | null }>('/profile/me', { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          setAvatar({ accountId, url: data.profile?.avatarUrl || null });
          setFailedAvatar(null);
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [account?.id, pathname]);

  return <View accessibilityRole="tablist" accessibilityLabel="Tài khoản và thông báo" style={s.actions}>
    <NotificationBell />
    <Pressable accessibilityRole="tab" accessibilityLabel="Hồ sơ" accessibilityState={{ selected: active }} aria-selected={active} onPress={() => router.navigate('/(company)/profile')} style={({ hovered, pressed }) => [s.profile, (active || hovered) && s.highlight, pressed && s.pressed]}>
      {avatarUrl ? <Image accessibilityLabel="Ảnh đại diện của bạn" source={{ uri: avatarUrl }} onError={() => setFailedAvatar(avatarUrl)} style={s.avatar} /> : <View testID="company-profile-avatar-fallback" style={[s.avatar, s.fallback]}><CompanyIcon name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} size={28} color={colors.textSecondary} /></View>}
      <CompanyIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} color={colors.textSecondary} />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E7EDF6', flexShrink: 0 },
  profile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 10, marginLeft: 4, minWidth: 50, minHeight: 50, borderRadius: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#DEEEFF', backgroundColor: colors.primaryLight },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  highlight: { backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.7 },
});
