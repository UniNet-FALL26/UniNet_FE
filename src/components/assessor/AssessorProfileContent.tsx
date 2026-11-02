import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { AssessorProfile } from '@/services/assessor-profile.service';
import type { AssessorProfileTab } from '@/constants/assessor-profile-tabs';
import type { AssessorProfileSection } from '@/constants/assessor-profile-sections';
import { AssessorProfileCards } from './AssessorProfileCards';
import { AssessorProfilePosts } from './AssessorProfilePosts';

const sections: Record<Exclude<AssessorProfileTab, 'posts'>, AssessorProfileSection[]> = { bio: ['bio', 'contact'], work: ['work'], education: ['education'], links: ['links'] };
export function AssessorProfileContent({ profile, active, accountEmail, joinedAt, onEdit }: { profile: AssessorProfile; active: AssessorProfileTab; accountEmail?: string; joinedAt?: string; onEdit: (section: AssessorProfileSection) => void }) {
  const [width, setWidth] = useState(0); const desktop = useWindowDimensions().width >= 1200; const columns = width >= 760;
  return <View testID="assessor-profile-content" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[s.content, desktop && s.desktop, active === 'posts' && columns && s.columns]}>
    {active === 'posts' ? <>
      <View testID="assessor-profile-summary-column" style={[s.summary, columns && s.sidebar]}><AssessorProfileCards profile={profile} accountEmail={accountEmail} joinedAt={joinedAt} summary embedded sections={['bio', 'work', 'contact', 'links']} onEdit={onEdit} /></View>
      <View testID="assessor-profile-feed-column" style={s.feed}><AssessorProfilePosts key={profile.id} profile={profile} /></View>
    </> : <AssessorProfileCards profile={profile} accountEmail={accountEmail} embedded sections={sections[active]} onEdit={onEdit} />}
  </View>;
}
const s = StyleSheet.create({
  content: { marginHorizontal: 20, gap: 16 }, desktop: { marginHorizontal: 0 }, columns: { flexDirection: 'row', alignItems: 'flex-start' },
  summary: { width: '100%' }, sidebar: { width: 260, flexShrink: 0 }, feed: { flex: 1, minWidth: 0, width: '100%' },
});
