import { useRef } from 'react';
import { View } from 'react-native';
import type { DeveloperModernTemplateProps } from '../developer-modern/DeveloperModernTemplate';
import { getLandscapeTheme } from './DeveloperLandscapeThemes';
import { LandscapeHero, LandscapeStatistics } from './LandscapeHero';
import { LandscapeProjects, LandscapeSkills, LandscapeJourney } from './LandscapeSections';
import { LandscapeArticles, LandscapeCertificates } from './LandscapeExtras';
import { LandscapeFooter } from './LandscapeFooter';
import type { PortraitMode } from './ProfilePortrait';
import { useProfileEditing } from '@/components/profile/ProfileEditContext';

export type DeveloperLandscapeTemplateProps = DeveloperModernTemplateProps & { portraitMode?: PortraitMode; showTemplateFooter?: boolean };
const defaultOrder = ['skills', 'journey', 'certificates', 'articles', 'other-projects'];
export function DeveloperLandscapeTemplate(props: DeveloperLandscapeTemplateProps) {
  const editing = useProfileEditing();
  const { data, width, thumbnail, onSectionLayout } = props;
  const theme = getLandscapeTheme(props.theme.id);
  const contentY = useRef(0);
  const sectionY = useRef<Record<string, number>>({});
  const padding = width < 768 ? 18 : 40;
  const contentWidth = Math.max(0, width - padding * 2);
  const appearance = data.portfolio.appearance.profile;
  const visible = (id: string) => !!editing || !appearance.hiddenSections.includes(id);
  const remaining = data.portfolio.projects.filter(project => !project.featured);
  const shared = { portfolio: data.portfolio, theme, width: contentWidth, thumbnail };
  const sections: Record<string, React.ReactNode> = {
    skills: editing || data.portfolio.skills.length ? <LandscapeSkills {...shared} mobile={width < 768} /> : null,
    journey: editing || data.portfolio.education.length + data.portfolio.experience.length ? <LandscapeJourney {...shared} /> : null,
    certificates: editing || data.portfolio.certificates.length ? <LandscapeCertificates {...shared} /> : null,
    articles: editing || data.portfolio.articles.length ? <LandscapeArticles {...shared} /> : null,
    'other-projects': visible('projects') && (editing || remaining.length) ? <LandscapeProjects projects={remaining} title="Dự án bản thân" {...shared} /> : null,
  };
  const requestedOrder = editing ? defaultOrder : appearance.sectionOrder ?? [];
  const order = [...new Set([...requestedOrder, ...defaultOrder])].filter(id => sections[id] && visible(id));
  const pair = contentWidth >= 900 && order.indexOf('journey') === order.indexOf('skills') + 1 && order.includes('skills');
  const landscapeProps = { ...props, theme };
  const report = (id: string, y: number) => { sectionY.current[id] = y; onSectionLayout?.(id, contentY.current + y); };
  return <View testID="developer-landscape" style={{ width, backgroundColor: theme.page }}>
    <View onLayout={() => onSectionLayout?.('hero', 0)}><LandscapeHero {...landscapeProps} /></View>
    <LandscapeStatistics {...landscapeProps} />
    <View onLayout={event => { contentY.current = event.nativeEvent.layout.y; Object.entries(sectionY.current).forEach(([id, y]) => onSectionLayout?.(id, contentY.current + y)); }} style={{ paddingHorizontal: padding, paddingTop: 8 }}>
      {order.map(id => {
        if (pair && id === 'journey') return null;
        if (pair && id === 'skills') {
          const pairWidth = (contentWidth - 32) / 2;
          return <View key="skills-journey" onLayout={event => { report('skills', event.nativeEvent.layout.y); report('journey', event.nativeEvent.layout.y); }} style={{ flexDirection: 'row', gap: 32 }}><View style={{ width: pairWidth }}><LandscapeSkills {...shared} width={pairWidth} /></View><View style={{ width: pairWidth }}><LandscapeJourney {...shared} width={pairWidth} /></View></View>;
        }
        return <View key={id} onLayout={event => report(id, event.nativeEvent.layout.y)}>{sections[id]}</View>;
      })}
    </View>
    <LandscapeFooter {...landscapeProps} />
  </View>;
}
