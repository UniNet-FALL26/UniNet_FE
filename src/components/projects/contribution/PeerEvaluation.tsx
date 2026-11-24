import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { PeerCohort, PeerRating } from '@/types/contribution';
import { ownRatings, peerLabel, validPeer } from '@/utils/contribution';
import { hubColors as c, HubAction } from '../hub/ProjectHubUI';
import { contributionStyles as s } from './styles';
export function PeerEvaluation({ cohort, self, name, busy, submit }: { cohort: PeerCohort; self: string; name: (id: string) => string; busy: boolean; submit: (target: string, score: number, comment: string | null, revision: number | null) => Promise<boolean> }) {
  const mine = ownRatings(cohort, self), targets = cohort.participantIds.filter(id => id !== self);
  return <View style={{ gap: 16 }}><Text style={s.heading}>{peerLabel(cohort.status)}</Text><Text style={s.copy}>Toàn đợt: {cohort.submittedCount}/{cohort.requiredCount} đánh giá. {cohort.status === 3 ? 'Đánh giá đã được chốt.' : `Bạn đã gửi ${mine.length}/${targets.length}.`}</Text>
    <Text style={s.small}>Đánh giá bằng tài khoản của bạn. Bạn không thể tự đánh giá chính mình.</Text>
    {!cohort.participantIds.includes(self) ? <Text style={s.copy}>Bạn không thuộc danh sách thành viên của vòng đánh giá này.</Text> : targets.map(target => {
      const rating = mine.find(x => x.evaluateeId === target);
      return <RatingForm key={`${target}:${rating?.revision ?? 'new'}`} target={target} self={self} label={name(target)} rating={rating} closed={cohort.status === 3} busy={busy} submit={submit} />;
    })}
  </View>;
}
function RatingForm({ target, self, label, rating, closed, busy, submit }: { target: string; self: string; label: string; rating?: PeerRating; closed: boolean; busy: boolean; submit: (target: string, score: number, comment: string | null, revision: number | null) => Promise<boolean> }) {
  const [score, setScore] = useState<number | null>(rating?.score ?? null), [comment, setComment] = useState(rating?.comment ?? '');
  const changed = score !== (rating?.score ?? null) || comment.trim() !== (rating?.comment ?? '');
  if (closed && !rating) return <View style={s.item}><Text style={s.heading}>{label}</Text><Text style={s.copy}>Đánh giá đã đóng. Nội dung cá nhân không được cung cấp trong phiên đọc này.</Text></View>;
  return <View style={s.item} testID="peer-rating-form"><Text style={s.heading}>{label}</Text>
    <View style={s.row}>{[1, 2, 3, 4, 5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n}/5 cho ${label}`} accessibilityState={{ selected: score === n, disabled: closed || busy }} disabled={closed || busy} onPress={() => setScore(n)} style={[s.field, { minWidth: 44, minHeight: 44, alignItems: 'center', backgroundColor: score === n ? c.primaryLight : c.surface }]}><Text style={s.heading}>{n}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel={`Nhận xét cho ${label}`} placeholder="Nhận xét (không bắt buộc)" placeholderTextColor={c.textMuted} multiline maxLength={2000} editable={!closed && !busy} value={comment} onChangeText={setComment} style={[s.field, { minHeight: 80 }]} />
    {closed ? <Text style={s.small}>Đợt đánh giá đã đóng. Không thể chỉnh sửa.</Text> : <HubAction title={rating ? `Lưu thay đổi cho ${label}` : `Gửi đánh giá cho ${label}`} disabled={busy || !changed || score === null || !validPeer(self, target, score, closed)} onPress={() => { if (score !== null) void submit(target, score, comment.trim() || null, rating?.revision ?? null); }} />}
  </View>;
}
