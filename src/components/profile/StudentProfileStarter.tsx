import { useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      <View style={[s.cover, { height: compact ? 164 : 240 }]}>
        {profile.coverUrl && failedCover !== profile.coverUrl
          ? <><Image source={profileMedia(profile.coverUrl)} contentFit="cover" blurRadius={24} style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" /><Image source={profileMedia(profile.coverUrl)} contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel="Ảnh bìa của bạn" onError={() => setFailedCover(profile.coverUrl)} /></>
          : <Image source={require('../../../assets/images/student-starter-cover.png')} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Ảnh bìa mặc định UniNet" />}
        {onChangePhoto && <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh bìa" disabled={changingPhoto} onPress={() => onChangePhoto('coverUrl')} style={[s.camera, s.coverCamera, changingPhoto && s.disabled]}><SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={16} tintColor={colors.textPrimary} /><Text style={s.cameraLabel}>Thay đổi ảnh bìa</Text></Pressable>}
      </View>
      <View style={[s.identity, { paddingHorizontal: compact ? 22 : 32 }]}>
        <View style={s.avatar}>
          <View style={s.avatarClip}>{profile.avatarUrl && failedAvatar !== profile.avatarUrl
            ? <Image source={profileMedia(profile.avatarUrl)} contentFit="cover" style={s.avatarImage} accessibilityLabel={`Ảnh đại diện ${profile.fullName}`} onError={() => setFailedAvatar(profile.avatarUrl)} />
            : <View style={s.initials} accessibilityLabel="Ảnh đại diện bằng chữ viết tắt"><Text style={s.initialsText}>{initials}</Text></View>}</View>
          {onChangePhoto && <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh đại diện" disabled={changingPhoto} onPress={() => onChangePhoto('avatarUrl')} hitSlop={8} style={[s.camera, s.avatarCamera, changingPhoto && s.disabled]}><SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={15} tintColor={colors.textPrimary} /></Pressable>}
        </View>
        <View style={s.identityCopy}>
          <Text role="heading" aria-level={1} style={[s.name, { fontSize: compact ? 24 : 30, lineHeight: compact ? 32 : 38 }]}>{profile.fullName}</Text>
          <Text style={s.nickname}>{profile.nickname ? `@${profile.nickname}` : 'Một dấu ấn mới trên UniNet'}</Text>
        </View>
      </View>
    </View>
    {onChooseTemplate && <>
      <View style={[s.invitation, !compact && s.wideInvitation]} testID="starter-introduction">
        <View pointerEvents="none" style={s.invitationWave} />
        <View style={[s.intro, !compact && s.desktopIntroCopy]}>
          <Text style={s.eyebrow}>BẮT ĐẦU CÂU CHUYỆN CỦA BẠN</Text>
          <Text role="heading" aria-level={2} style={[s.title, !compact && s.wideTitle]}>Một hồ sơ nhỏ.{'\n'}<Text style={s.titleAccent}>Nhiều cơ hội mới.</Text></Text>
          <Text style={s.description}>Những gì bạn đã học, đã làm và đang theo đuổi đều xứng đáng được nhìn thấy.{'\n'}Chọn một mẫu hồ sơ để kể câu chuyện của bạn theo cách riêng.</Text>
          <View style={s.valueRow}>
            <View style={[s.values, !compact && s.wideValues]}>
              {([
                { title: 'Được nhìn thấy', description: 'Bởi nhà tuyển dụng, đối tác và cộng đồng', icon: { ios: 'person.2.fill', android: 'groups', web: 'groups' }, color: '#1674FF', background: '#E3EEFF' },
                { title: 'Tạo dấu ấn cá nhân', description: 'Thể hiện kỹ năng, kinh nghiệm và phong cách của riêng bạn', icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }, color: '#9254EF', background: '#EEE5FF' },
                { title: 'Mở ra cơ hội mới', description: 'Kết nối với những dự án, cơ hội phù hợp', icon: { ios: 'paperplane.fill', android: 'rocket_launch', web: 'rocket_launch' }, color: '#279F94', background: '#DFF5EF' },
              ] as const).map(value => <View key={value.title} style={s.value}><View style={[s.valueIcon, { backgroundColor: value.background }]}><SymbolView name={value.icon} size={19} tintColor={value.color} /></View><View style={s.valueCopy}><Text style={s.valueTitle}>{value.title}</Text><Text style={s.valueDescription}>{value.description}</Text></View></View>)}
            </View>
            {compact && <Image source={require('../../../assets/images/student-starter-intro.png')} contentFit="contain" style={s.mobileIntroArt} accessible={false} importantForAccessibility="no-hide-descendants" />}
          </View>
        </View>
        {!compact && <Image source={require('../../../assets/images/student-starter-intro.png')} contentFit="contain" style={s.desktopIntroArt} accessible={false} importantForAccessibility="no-hide-descendants" />}
      </View>
      <View style={[s.benefits, !compact && s.wideBenefits]}>
        <View testID="starter-strengths" style={[s.benefit, s.strengthCard]}>
          <View style={[s.icon, s.strengthIcon]}><SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={25} tintColor="#9254EF" /></View>
          <View style={s.benefitCopy}><Text style={[s.eyebrow, s.purpleEyebrow]}>THỂ HIỆN THẾ MẠNH</Text><Text style={s.benefitTitle}>Giới thiệu kỹ năng, kinh nghiệm</Text><Text style={s.benefitText}>Cho mọi người biết bạn giỏi gì, đã học gì và đang theo đuổi những điều gì. Tạo hồ sơ nổi bật với các mẫu chuyên nghiệp.</Text></View>
          <Image source={require('../../../assets/images/student-starter-strengths.png')} contentFit="contain" style={[s.benefitArt, compact && s.compactBenefitArt]} accessible={false} importantForAccessibility="no-hide-descendants" />
        </View>
        <View testID="starter-projects" style={[s.benefit, s.projectCard]}>
          <View style={s.icon}><SymbolView name={{ ios: 'folder', android: 'folder_open', web: 'folder_open' }} size={25} tintColor={colors.primary} /></View>
          <View style={s.benefitCopy}><Text style={s.eyebrow}>KỂ CHUYỆN QUA DỰ ÁN</Text><Text style={s.benefitTitle}>Đưa bài tập, ý tưởng và sản phẩm của bạn</Text><Text style={s.benefitText}>Lưu lại những dự án, sản phẩm bạn tự hào vào cùng một nơi. Biến hành trình học tập và làm việc thành câu chuyện truyền cảm hứng.</Text></View>
          <Image source={require('../../../assets/images/student-starter-projects.png')} contentFit="contain" style={[s.benefitArt, compact && s.compactBenefitArt]} accessible={false} importantForAccessibility="no-hide-descendants" />
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Khám phá mẫu hồ sơ chuyên nghiệp" onPress={onChooseTemplate} style={({ pressed }) => [s.discovery, pressed && s.disabled]}>
        <View style={s.previewArt} accessible={false} importantForAccessibility="no-hide-descendants"><ResumeArtwork /></View>
        <View style={s.discoveryCopy}><Text style={s.discoveryEyebrow}>NÂNG CẤP HỒ SƠ</Text><Text style={s.discoveryTitle}>Khám phá các mẫu hồ sơ chuyên nghiệp</Text><Text style={s.discoveryDescription}>Nhiều phong cách, màu sắc và bố cục để tạo dấu ấn riêng của bạn.</Text><View style={s.discoveryAction}><Text style={s.discoveryActionLabel}>Xem mẫu hồ sơ →</Text></View></View>
      </Pressable>
    </>}
  </View>;
}

function ResumeArtwork() {
  return <View style={s.artScene}><View style={s.artOrbit} /><View style={s.paper}><View style={s.paperAvatar}><SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={27} tintColor="#77A4F9" /></View><View style={s.paperLine} /><View style={[s.paperLine, { width: '75%' }]} /><View style={[s.paperLine, { width: '50%' }]} /></View><View style={s.pen} /><Text style={s.artSpark}>✦</Text></View>;
}

const s = StyleSheet.create({
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 12 }, compactContent: { paddingHorizontal: 16 },
  identityCard: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }, cover: { backgroundColor: '#DCEAFF', overflow: 'hidden', borderRadius: 14 },
  identity: { paddingBottom: 12 }, avatar: { width: 96, height: 96, borderRadius: 48, marginTop: -48, borderWidth: 4, borderColor: colors.surface, backgroundColor: colors.surface }, avatarClip: { flex: 1, borderRadius: 44, overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, initials: { flex: 1, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, initialsText: { color: colors.primaryDark, fontSize: 30, fontWeight: '700' },
  camera: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, coverCamera: { position: 'absolute', bottom: 12, right: 12, width: 'auto', minHeight: 44, height: 44, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 6 }, cameraLabel: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' }, avatarCamera: { position: 'absolute', bottom: -6, right: -8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(170,190,220,0.45)' }, disabled: { opacity: 0.55 },
  identityCopy: { marginTop: 10, gap: 3 }, name: { color: colors.navy, fontWeight: '800' }, nickname: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  invitation: { borderRadius: 20, backgroundColor: '#F0F7FF', padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E5EFFF' }, wideInvitation: { padding: 32, minHeight: 310 }, invitationWave: { position: 'absolute', right: -100, bottom: -170, width: 580, height: 320, borderRadius: 290, backgroundColor: '#E4F0FF', transform: [{ rotate: '-18deg' }] }, intro: { minWidth: 0, gap: 12, zIndex: 1 }, eyebrow: { color: '#4B78C4', fontSize: 9, lineHeight: 14, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.navy, fontSize: 25, lineHeight: 29, fontWeight: '800', letterSpacing: -0.6 }, titleAccent: { color: '#1674FF' }, description: { color: '#61708B', fontSize: 12, lineHeight: 19, maxWidth: 560 },
  desktopIntroCopy: { width: '65%' }, wideTitle: { fontSize: 32, lineHeight: 39 }, valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }, values: { flex: 1, gap: 14 }, wideValues: { flexDirection: 'row', gap: 14 }, value: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start', minWidth: 0 }, valueIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' }, valueCopy: { flex: 1, minWidth: 0, gap: 3 }, valueTitle: { color: colors.navy, fontSize: 11, fontWeight: '800', lineHeight: 16 }, valueDescription: { color: '#61708B', fontSize: 11, lineHeight: 17 }, mobileIntroArt: { width: '40%', maxWidth: 170, height: 190 }, desktopIntroArt: { position: 'absolute', right: 4, top: 4, bottom: 4, width: '35%' }, benefitArt: { width: 90, height: 112 }, compactBenefitArt: { width: 64, height: 90 },
  benefits: { gap: 10 }, wideBenefits: { flexDirection: 'row' }, benefit: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#E8EFFF', borderRadius: 16, overflow: 'hidden' }, strengthCard: { backgroundColor: '#FAF7FF', borderColor: '#F0E8FF' }, projectCard: { backgroundColor: '#F2F8FF' }, benefitCopy: { flex: 1, minWidth: 0, gap: 3 }, icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E1EEFF', alignItems: 'center', justifyContent: 'center' }, strengthIcon: { backgroundColor: '#F0E8FF' }, purpleEyebrow: { color: '#8A62CD' }, benefitTitle: { color: colors.navy, fontSize: 12, fontWeight: '800', lineHeight: 17 }, benefitText: { color: '#61708B', fontSize: 11, lineHeight: 18 },
  artScene: { width: 112, height: 148, justifyContent: 'center', alignItems: 'center' }, paper: { width: 83, height: 112, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, gap: 7, transform: [{ rotate: '9deg' }], boxShadow: '0px 8px 20px #9FC1FF55' }, paperAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E1ECFF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, paperLine: { height: 5, width: '100%', borderRadius: 3, backgroundColor: '#D6E4FF' }, artOrbit: { position: 'absolute', width: 130, height: 45, borderRadius: 70, borderWidth: 1.5, borderColor: '#7A83FF', transform: [{ rotate: '-30deg' }], bottom: 16 }, pen: { position: 'absolute', width: 10, height: 65, borderRadius: 5, backgroundColor: '#368BFF', borderWidth: 2, borderColor: '#9BC8FF', transform: [{ rotate: '40deg' }], right: 12, bottom: 28 }, artSpark: { position: 'absolute', right: 0, top: 10, color: '#1674FF', fontSize: 25 },
  discovery: { minHeight: 128, flexDirection: 'row', alignItems: 'center', backgroundColor: '#173B7C', borderRadius: 14, overflow: 'hidden', padding: 16, gap: 12 }, previewArt: { width: 86, height: 104, transform: [{ scale: 0.8 }, { rotate: '-12deg' }], marginLeft: -8 }, discoveryCopy: { flex: 1, minWidth: 0, gap: 5 }, discoveryEyebrow: { color: '#B7CCF4', fontSize: 8, letterSpacing: 1.5, fontWeight: '700' }, discoveryTitle: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontWeight: '700' }, discoveryDescription: { color: '#D4E2FC', fontSize: 10, lineHeight: 15 }, discoveryAction: { backgroundColor: '#FFFFFF', borderRadius: 7, minHeight: 36, paddingHorizontal: 12, alignSelf: 'flex-end', justifyContent: 'center', marginTop: 4 }, discoveryActionLabel: { color: '#173B7C', fontSize: 10, fontWeight: '700' },
});
