import { useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { profileMedia } from './profile-media';
import type { PortfolioIdentity } from '@/types/portfolio';

export function StudentProfileStarter({ profile, width, onChooseTemplate, onChangePhoto, changingPhoto = false }: { profile: PortfolioIdentity; width: number; onChooseTemplate?: () => void; onChangePhoto?: (target: 'avatarUrl' | 'coverUrl') => void; changingPhoto?: boolean }) {
  const compact = width < 700;
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const initials = profile.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase() || 'U';
  return <View testID="student-profile-starter" style={[s.content, compact && s.compactContent]}>
    <View style={s.identityCard}>
      <View style={[s.cover, { height: compact ? 154 : 206 }]}>
        {profile.coverUrl && failedCover !== profile.coverUrl
          ? <><Image source={profileMedia(profile.coverUrl)} contentFit="cover" blurRadius={24} style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" /><Image source={profileMedia(profile.coverUrl)} contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel="Ảnh bìa của bạn" onError={() => setFailedCover(profile.coverUrl)} /></>
          : <View style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants"><View style={s.coverCircle} /><View style={s.coverRing} /><Text style={s.coverBrand}>UNINET / DẤU ẤN CỦA BẠN</Text></View>}
        {onChangePhoto && <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh bìa" disabled={changingPhoto} onPress={() => onChangePhoto('coverUrl')} style={[s.camera, s.coverCamera, changingPhoto && s.disabled]}><SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={20} tintColor={colors.textPrimary} /></Pressable>}
      </View>
      <View style={[s.identity, { paddingHorizontal: compact ? 22 : 32 }]}>
        <View style={s.avatar}>
          <View style={s.avatarClip}>{profile.avatarUrl && failedAvatar !== profile.avatarUrl
            ? <Image source={profileMedia(profile.avatarUrl)} contentFit="cover" style={s.avatarImage} accessibilityLabel={`Ảnh đại diện ${profile.fullName}`} onError={() => setFailedAvatar(profile.avatarUrl)} />
            : <View style={s.initials} accessibilityLabel="Ảnh đại diện bằng chữ viết tắt"><Text style={s.initialsText}>{initials}</Text></View>}</View>
          {onChangePhoto && <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh đại diện" disabled={changingPhoto} onPress={() => onChangePhoto('avatarUrl')} style={[s.camera, s.avatarCamera, changingPhoto && s.disabled]}><SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={18} tintColor={colors.textPrimary} /></Pressable>}
        </View>
        <View style={s.identityCopy}>
          <Text role="heading" aria-level={1} style={[s.name, { fontSize: compact ? 24 : 30, lineHeight: compact ? 32 : 38 }]}>{profile.fullName}</Text>
          <Text style={s.nickname}>{profile.nickname ? `@${profile.nickname}` : 'Một dấu ấn mới trên UniNet'}</Text>
        </View>
      </View>
    </View>
    {onChooseTemplate && <View style={[s.invitation, { padding: compact ? 22 : 32 }]}>
      <View style={s.intro}><Text style={s.eyebrow}>BẮT ĐẦU CÂU CHUYỆN CỦA BẠN</Text><Text role="heading" aria-level={2} style={[s.title, { fontSize: compact ? 25 : 32, lineHeight: compact ? 34 : 42 }]}>Một hồ sơ nhỏ.{compact ? '\n' : ' '}Nhiều cơ hội mới.</Text><Text style={s.description}>Những gì bạn đã học, đã làm và đang theo đuổi đều xứng đáng được nhìn thấy. Chọn một mẫu hồ sơ để kể câu chuyện của bạn theo cách riêng.</Text></View>
      <View style={[s.benefits, { flexDirection: compact ? 'column' : 'row' }]}>
        <View style={s.benefit}><View style={s.icon}><SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={21} tintColor={colors.primary} /></View><Text style={s.benefitTitle}>Thể hiện thế mạnh</Text><Text style={s.benefitText}>Giới thiệu kỹ năng, kinh nghiệm và những điều bạn đang học.</Text></View>
        <View style={s.benefit}><View style={s.icon}><SymbolView name={{ ios: 'folder', android: 'folder_open', web: 'folder_open' }} size={21} tintColor={colors.primary} /></View><Text style={s.benefitTitle}>Kể chuyện qua dự án</Text><Text style={s.benefitText}>Đưa bài tập, ý tưởng và sản phẩm bạn tự hào vào cùng một nơi.</Text></View>
        <View style={s.benefit}><View style={s.icon}><SymbolView name={{ ios: 'person.2', android: 'groups', web: 'groups' }} size={21} tintColor={colors.primary} /></View><Text style={s.benefitTitle}>Mở thêm kết nối</Text><Text style={s.benefitText}>Giúp cộng đồng hiểu bạn hơn và tìm thấy những đồng đội phù hợp.</Text></View>
      </View>
      <View style={[s.action, compact && { alignItems: 'stretch' }]}><Button title="Chọn mẫu hồ sơ" onPress={onChooseTemplate} leadingIcon={<SymbolView name={{ ios: 'rectangle.grid.2x2', android: 'dashboard', web: 'dashboard' }} size={19} tintColor={colors.surface} />} /><Text style={s.actionHint}>Bắt đầu với một mẫu bạn thích, rồi thêm nội dung theo cách của bạn.</Text></View>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, gap: 22 }, compactContent: { paddingHorizontal: 16, gap: 18 },
  identityCard: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, cover: { backgroundColor: '#E2EDFC', overflow: 'hidden' },
  coverCircle: { position: 'absolute', right: -35, top: -150, width: 370, height: 370, borderRadius: 185, backgroundColor: '#C9DCF7' }, coverRing: { position: 'absolute', right: 160, top: 55, width: 250, height: 250, borderRadius: 125, borderWidth: 1, borderColor: '#AAC6EE' }, coverBrand: { position: 'absolute', left: 26, top: 26, color: colors.primaryDark, fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  identity: { paddingBottom: 28 }, avatar: { width: 102, height: 102, borderRadius: 51, marginTop: -51, borderWidth: 5, borderColor: colors.surface, backgroundColor: colors.surface }, avatarClip: { flex: 1, borderRadius: 46, overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, initials: { flex: 1, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, initialsText: { color: colors.primaryDark, fontSize: 30, fontWeight: '700' },
  camera: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, coverCamera: { position: 'absolute', bottom: 12, right: 12 }, avatarCamera: { position: 'absolute', bottom: -6, right: -6 }, disabled: { opacity: 0.5 },
  identityCopy: { marginTop: 14, gap: 5 }, name: { color: colors.navy, fontWeight: '800' }, nickname: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  invitation: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 26 }, intro: { maxWidth: 720, gap: 12 }, eyebrow: { color: colors.primaryDark, fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 1.5 }, title: { color: colors.navy, fontWeight: '800' }, description: { color: colors.textSecondary, fontSize: 15, lineHeight: 24 },
  benefits: { gap: 24 }, benefit: { flex: 1, minWidth: 0, gap: 8 }, icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }, benefitTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 22 }, benefitText: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 },
  action: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24, gap: 10, alignItems: 'flex-start' }, actionHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
});
