import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { HubIcon, type HubIconName } from './hub/ProjectHubUI';

export { verificationDate } from '@/utils/verification-date';

export const hubColors = {
  ...colors,
  ink: '#111A36',
  canvas: '#F8FAFE',
  line: '#E2E8F3',
  blueWash: '#EAF1FF',
  primary: '#1252FF',
  success: '#198046',
  successBg: '#E6F7EC',
  warningBg: '#FFF6E3',
  warningText: '#8A4F0E',
  dangerBg: '#FFF2F2',
  dangerText: '#D64A4A',
};

export function DossierCard({
  title,
  children,
  icon,
  badge,
  action,
  style,
}: {
  title: string;
  children: ReactNode;
  icon?: HubIconName;
  badge?: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[ds.card, style]}>
      <View style={ds.cardHeaderRow}>
        {icon && (
          <View style={ds.cardEmblem}>
            <HubIcon name={icon} size={18} color="#1252FF" />
          </View>
        )}
        <Text accessibilityRole="header" style={ds.cardTitle}>
          {title}
        </Text>
        {badge}
        {action && <View style={ds.cardAction}>{action}</View>}
      </View>
      {children}
    </View>
  );
}

export function DossierLayout({
  title,
  children,
  projectId,
}: {
  title: string;
  children: ReactNode;
  projectId?: string;
}) {
  return (
    <SafeAreaView style={ds.safe}>
      <DetailNavigation title={title} projectId={projectId} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ds.content}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const ds = StyleSheet.create({
  safe: { flex: 1, backgroundColor: hubColors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F3',
  },
  back: { minWidth: 52, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: '#1252FF' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111A36' },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    boxShadow: '0 4px 18px rgba(17, 26, 54, 0.04)',
  },
  kicker: {
    color: '#1252FF',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: '#111A36',
    letterSpacing: -0.3,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#52617E',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 14,
    boxShadow: '0 2px 10px rgba(17, 26, 54, 0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: '#F0F3F8',
    paddingBottom: 12,
  },
  cardEmblem: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAction: {
    marginLeft: 'auto',
  },
  cardTitle: {
    color: '#111A36',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    flex: 1,
  },
  heading: {
    color: '#111A36',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  body: {
    color: '#14233B',
    fontSize: 14,
    lineHeight: 22,
  },
  small: {
    color: '#52617E',
    fontSize: 13,
    lineHeight: 20,
  },
  notice: {
    backgroundColor: '#EAF1FF',
    borderLeftWidth: 3,
    borderColor: '#1252FF',
    padding: 14,
    borderRadius: 10,
    color: '#111A36',
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    color: '#D64A4A',
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FAD7D7',
    padding: 14,
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  stepDone: {
    backgroundColor: '#E6F7EC',
    color: '#198046',
  },
  resultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#EAF1FF',
    color: '#1252FF',
    fontWeight: '700',
    fontSize: 13,
  },
  resultSuccess: {
    backgroundColor: '#E6F7EC',
    color: '#198046',
  },
  resultFailed: {
    backgroundColor: '#FFF2F2',
    color: '#D64A4A',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: '#F0F4FA',
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF3FA',
    textAlign: 'center',
    lineHeight: 30,
    color: '#1252FF',
    fontWeight: '700',
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#111A36',
  },
  divider: {
    borderTopWidth: 1,
    borderColor: '#F0F3F8',
    paddingTop: 12,
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCD6E8',
    borderRadius: 9,
    padding: 13,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#14233B',
    backgroundColor: '#FFFFFF',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0F4FA',
  },
  pillActive: { backgroundColor: '#EAF1FF' },
  pillSuccess: { backgroundColor: '#E6F7EC' },
  pillDanger: { backgroundColor: '#FFF2F2' },
  pillMuted: { backgroundColor: '#F0F4FA' },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  textActive: { color: '#1252FF' },
  textSuccess: { color: '#198046' },
  textDanger: { color: '#D64A4A' },
  textMuted: { color: '#64748B' },
  stepsList: { gap: 2 },
  metaRow: {
    borderTopWidth: 1,
    borderColor: '#F0F3F8',
    paddingTop: 10,
  },
  scheduleBox: {
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  meetingBox: {
    gap: 4,
  },
  transactionItem: {
    borderTopWidth: 1,
    borderColor: '#F0F3F8',
    paddingTop: 12,
    gap: 6,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111A36',
  },
  pagePill: {
    backgroundColor: '#F0F4FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pagePillText: {
    fontSize: 13,
    color: '#52617E',
    fontWeight: '600',
  },
  actionBottom: {
    gap: 10,
  },
  meetingTimeBox: {
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  waitingBanner: {
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FBE2B5',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  reportSectionBox: {
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: '#E2E8F3',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  reportBlueBox: {
    backgroundColor: '#F5F8FF',
    borderWidth: 1,
    borderColor: '#CFDDFE',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  reportGreenBox: {
    backgroundColor: '#F0FAF3',
    borderWidth: 1,
    borderColor: '#C6EBD1',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
});
