import { EditPhoto, useProfileEditing } from '@/components/profile/ProfileEditContext';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { isSampleLink, profileMedia } from '@/components/profile/profile-media';
import { PortfolioIcon, PortfolioLink } from '../developer-modern/PortfolioPrimitives';
import { LandscapeHeading, tileWidth, sectionStyles as s, type SectionProps } from './LandscapeSections';

export function LandscapeCertificates({ portfolio, theme, width, thumbnail }: SectionProps) {
  const editing = useProfileEditing();
  if (!portfolio.certificates.length && !editing) return null;
  const columns = width >= 900 ? 4 : width >= 600 ? 2 : 1;
  return <View style={s.section}><LandscapeHeading title="Chứng chỉ" eyebrow="CERTIFICATIONS" subtitle="Những chứng chỉ và thành tựu mình đã đạt được." icon="certificate" theme={theme} /><View style={s.grid}>{portfolio.certificates.map((item, index) => <View key={`${item.title}-${index}`} style={[s.card, extra.compactCard, { width: tileWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View>{profileMedia(item.logoUrl) ? <Image source={profileMedia(item.logoUrl)} contentFit="contain" loading={thumbnail ? 'eager' : 'lazy'} accessibilityLabel={item.issuer} style={extra.logo} /> : <PortfolioIcon name="certificate" color={theme.accentStrong} size={30} />}<EditPhoto color={theme.accentStrong} right={-6} bottom={-6} size={24} entry={{ section: 'certificates', item, label: item.title }} /></View>
    <View style={s.shrink}><Text role="heading" aria-level={3} style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text><Text style={[s.caption, { color: theme.muted }]}>{item.issuer}</Text>{!!item.year && <Text style={[s.caption, { color: theme.muted }]}>{item.year}</Text>}{!isSampleLink(item.url) && <PortfolioLink label="Xem chứng chỉ" url={item.url} theme={theme} thumbnail={thumbnail} />}</View>
  </View>)}</View></View>;
}
export function LandscapeArticles({ portfolio, theme, width, thumbnail }: SectionProps) {
  const editing = useProfileEditing();
  if (!portfolio.articles.length && !editing) return null;
  const columns = width >= 900 ? 3 : 1;
  return <View style={s.section}><LandscapeHeading title="Blog & Chia sẻ" eyebrow="LATEST ARTICLES" subtitle="Những bài viết về lập trình, công nghệ và hành trình học tập." icon="article" theme={theme} /><View style={s.grid}>{portfolio.articles.map((item, index) => <View key={`${item.title}-${index}`} style={[s.card, extra.compactCard, { width: tileWidth(width, columns), backgroundColor: theme.surface, borderColor: theme.border }]}>
    {(editing || profileMedia(item.coverUrl)) && <View style={extra.articleImage}><Image source={profileMedia(item.coverUrl)} contentFit="cover" loading={thumbnail ? 'eager' : 'lazy'} accessibilityLabel={`Ảnh bài viết ${item.title}`} style={StyleSheet.absoluteFill} /><EditPhoto color={theme.accentStrong} right={2} bottom={2} size={24} entry={{ section: 'articles', item, label: `bài viết ${item.title}` }} /></View>}
    <View style={s.shrink}><Text role="heading" aria-level={3} style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>{!!item.date && <Text style={[s.caption, { color: theme.muted, marginTop: 6 }]}>{item.date}</Text>}{!isSampleLink(item.url) && <PortfolioLink label="Đọc bài viết" url={item.url} theme={theme} thumbnail={thumbnail} />}</View>
  </View>)}</View></View>;
}
const extra = StyleSheet.create({ compactCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }, logo: { width: 32, height: 32 }, articleImage: { width: 80, height: 76, borderRadius: 6 } });
