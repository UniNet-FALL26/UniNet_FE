import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import type { ProjectDetail, ProjectRecommendation } from "@/types/project";

type Props = {
  member: ProjectRecommendation;
  roles: ProjectDetail["roleRequirements"];
  invited: boolean;
  onInvite: (member: ProjectRecommendation, role: string) => Promise<void>;
};

export function RecommendedMemberCard({ member, roles, invited, onInvite }: Props) {
  const [role, setRole] = useState(roles[0]?.roleName ?? "");
  const [sending, setSending] = useState(false);
  const selectedRole = roles.some((item) => item.roleName === role) ? role : roles[0]?.roleName ?? "";
  const invite = async () => {
    if (sending || invited || !selectedRole) return;
    setSending(true);
    try { await onInvite(member, selectedRole); }
    finally { setSending(false); }
  };
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.avatar} /> : (
          <View style={styles.avatar}><Text style={styles.name}>{member.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</Text></View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{member.fullName}</Text>
          <Text style={styles.score}>Điểm tổng hợp: {member.finalScore.toFixed(1)}%</Text>
        </View>
      </View>
      <Text style={styles.text}>Kỹ năng phù hợp: {member.matchedSkills.join(", ") || "Chưa có"}</Text>
      <Text style={styles.text}>Kỹ năng còn thiếu: {member.missingSkills.join(", ") || "Không có"}</Text>
      <Text style={styles.text}>Điểm phù hợp: {member.matchScore.toFixed(1)}% · Khớp kỹ năng: {member.skillMatch.toFixed(1)}%</Text>
      <Text style={styles.text}>Độ đa dạng: {member.diversityScore.toFixed(1)} · Số lần cộng tác: {member.collaborationCount}</Text>
      {!invited && <>
        <Text style={styles.text}>Chọn vai trò mời tham gia:</Text>
        <View style={styles.roles}>{roles.map((item) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedRole === item.roleName }} key={item.id} onPress={() => setRole(item.roleName)} style={[styles.chip, selectedRole === item.roleName && styles.selected]}>
            <Text style={styles.text}>{item.roleName}</Text>
          </Pressable>
        ))}</View>
        {roles.length === 0 && <Text style={styles.text}>Dự án chưa có vai trò để mời tham gia.</Text>}
      </>}
      <Button title={invited ? "Đã gửi lời mời" : "Mời tham gia"} loading={sending} disabled={invited || !selectedRole} onPress={invite} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 4 },
  name: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  score: { color: colors.primary, fontWeight: "700" },
  text: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
});
