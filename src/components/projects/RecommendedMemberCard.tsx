import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { SymbolView } from 'expo-symbols';
import type { ProjectDetail, ProjectRecommendation } from "@/types/project";

type Props = {
  member: ProjectRecommendation;
  roles: ProjectDetail["roleRequirements"];
  invited: boolean;
  onInvite: (member: ProjectRecommendation, role: string) => Promise<void>;
};

export function RecommendedMemberCard({ member, roles, invited, onInvite }: Props) {
  const wide = useWindowDimensions().width >= 700;
  const [role, setRole] = useState(roles[0]?.roleName ?? "");
  const [sending, setSending] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const selectedRole = roles.some((item) => item.roleName === role) ? role : roles[0]?.roleName ?? "";
  const invite = async () => {
    if (sending || invited || !selectedRole) return;
    setSending(true);
    try { await onInvite(member, selectedRole); }
    finally { setSending(false); }
  };
  return (
    <View testID={`recommended-member-${member.userId}`} style={styles.card}>
      <View style={styles.header}>
        {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.avatar} /> : (
          <View style={styles.avatar}><Text style={styles.initials}>{member.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</Text></View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{member.fullName}</Text>
          <Text style={styles.text}>{member.matchedSkills.length} kỹ năng phù hợp với dự án</Text>
        </View>
        {wide && <View style={styles.score}><View style={styles.scoreTop}><Text style={styles.scoreLabel}>Điểm gợi ý</Text><Text style={styles.scoreValue}>{member.finalScore.toFixed(0)}%</Text></View><View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${Math.max(0, Math.min(100, member.finalScore))}%` }]} /></View></View>}
      </View>
      {!wide && <View style={styles.mobileScore}><Text style={styles.scoreLabel}>Điểm gợi ý</Text><View style={styles.mobileScoreTrack}><View style={[styles.scoreFill, { width: `${Math.max(0, Math.min(100, member.finalScore))}%` }]} /></View><Text style={styles.scoreValue}>{member.finalScore.toFixed(0)}%</Text></View>}
      <View style={[styles.skillColumns, wide && styles.skillColumnsWide]}>
      <View style={styles.skillSection}><Text style={styles.label}>Kỹ năng phù hợp</Text><View style={styles.roles}>{member.matchedSkills.length ? member.matchedSkills.map((skill, index) => <View key={`${skill}-${index}`} style={styles.skill}><Text style={styles.skillText}>{skill}</Text></View>) : <Text style={styles.text}>Chưa có kỹ năng trùng với dự án.</Text>}</View></View>
      <View style={styles.skillSection}><Text style={styles.label}>Kỹ năng cần bổ sung <Text style={styles.count}>({member.missingSkills.length})</Text></Text><View style={styles.roles}>{(showMissing ? member.missingSkills : member.missingSkills.slice(0, 5)).map((skill, index) => <View key={`${skill}-${index}`} style={styles.missingSkill}><Text style={styles.text}>{skill}</Text></View>)}{!member.missingSkills.length && <Text style={styles.text}>Đã đáp ứng các kỹ năng của dự án.</Text>}{member.missingSkills.length > 5 && <Pressable accessibilityRole="button" accessibilityLabel={showMissing ? 'Thu gọn kỹ năng' : `Xem thêm ${member.missingSkills.length - 5} kỹ năng`} aria-expanded={showMissing} onPress={() => setShowMissing(value => !value)} style={styles.more}><Text style={styles.link}>{showMissing ? 'Thu gọn' : `+${member.missingSkills.length - 5} kỹ năng`}</Text></Pressable>}</View></View>
      </View>
      <View style={styles.detailBar}><Text style={styles.detailHint}>{member.collaborationCount > 0 ? `${member.collaborationCount} lần cộng tác trước đây` : 'Chưa từng cộng tác với bạn'}</Text><Pressable accessibilityRole="button" accessibilityLabel={showDetails ? 'Ẩn chi tiết gợi ý' : 'Chi tiết gợi ý'} aria-expanded={showDetails} onPress={() => setShowDetails(value => !value)} style={styles.detailsToggle}><Text style={styles.link}>Chi tiết gợi ý</Text><SymbolView name={showDetails ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={14} tintColor={colors.primary} /></Pressable></View>
      {showDetails && <View style={styles.details}>{[['Điểm tổng hợp', `${member.finalScore.toFixed(1)}%`], ['Điểm phù hợp', `${member.matchScore.toFixed(1)}%`], ['Khớp kỹ năng', `${member.skillMatch.toFixed(1)}%`], ['Độ đa dạng', member.diversityScore.toFixed(1)]].map(([label, value]) => <View key={label} style={styles.detailRow}><Text style={styles.text}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>)}</View>}
      <View style={styles.actions}>
        {!invited && <View style={styles.rolePicker}><Text style={styles.label}>Mời vào vai trò</Text><View style={styles.roles}>{roles.map(item => <Pressable accessibilityRole="button" accessibilityLabel={item.roleName} aria-pressed={selectedRole === item.roleName} accessibilityState={{ selected: selectedRole === item.roleName }} disabled={sending} key={item.id} onPress={() => setRole(item.roleName)} style={[styles.chip, selectedRole === item.roleName && styles.selected]}><Text style={[styles.text, selectedRole === item.roleName && styles.selectedText]}>{item.roleName}</Text></Pressable>)}</View>{!roles.length && <Text style={styles.text}>Dự án chưa có vai trò để mời tham gia.</Text>}</View>}
        {invited && <View style={styles.invited}><SymbolView name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }} size={17} tintColor={colors.success} /><Text style={styles.invitedText}>Đã gửi lời mời</Text></View>}
        {!invited && <Button title="Mời tham gia" loading={sending} disabled={!selectedRole} onPress={invite} style={styles.inviteButton} textStyle={styles.inviteText} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 22, gap: 22, overflow: 'hidden', boxShadow: '0px 4px 18px rgba(16,40,75,0.035)' },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }, initials: { color: colors.primaryDark, fontSize: 18, fontWeight: '600' },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: "600" },
  score: { width: 140, gap: 10 }, scoreTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, scoreValue: { color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '600' }, scoreLabel: { fontSize: 11, color: colors.textSecondary }, scoreTrack: { height: 5, borderRadius: 3, backgroundColor: colors.primaryLight, overflow: 'hidden' }, scoreFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary }, mobileScore: { flexDirection: 'row', alignItems: 'center', gap: 12 }, mobileScoreTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  skillColumns: { gap: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }, skillColumnsWide: { flexDirection: 'row', gap: 32 },
  text: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, minHeight: 30, justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedText: { color: colors.surface }, label: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textPrimary }, count: { color: colors.textMuted, fontWeight: '400' }, skillSection: { flex: 1, minWidth: 0, gap: 10 }, skill: { maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, backgroundColor: colors.primaryLight }, skillText: { fontSize: 12, lineHeight: 18, color: colors.primaryDark }, missingSkill: { maxWidth: '100%', paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 7 }, more: { justifyContent: 'center', paddingHorizontal: 6, minHeight: 28 }, link: { fontSize: 12, color: colors.primary }, detailBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, detailHint: { fontSize: 11, lineHeight: 18, color: colors.textMuted }, detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 28 }, details: { padding: 12, backgroundColor: colors.background, borderRadius: 8, gap: 8 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, detailValue: { fontSize: 12, color: colors.navy },
  actions: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, padding: 20, marginHorizontal: -22, marginBottom: -22, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }, rolePicker: { flex: 1, minWidth: 160, gap: 8 }, inviteButton: { minHeight: 40, paddingHorizontal: 20, borderRadius: 9 }, inviteText: { fontSize: 12, fontWeight: '600' }, invited: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 30 }, invitedText: { fontSize: 12, color: colors.success },
});
