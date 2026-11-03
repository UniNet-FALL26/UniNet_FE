import { Pressable, Text, TextInput, View } from 'react-native';
import type { AssessmentInput, AssessmentRubric } from '@/services/assessor.service';
import { assessorStyles as s } from './assessor-ui';
import { colors } from '@/constants/colors';

export function emptyAssessment(rubric: AssessmentRubric): AssessmentInput {
  return { rubricVersion: rubric.version, scores: rubric.criteria.map(c => ({ code: c.code, score: null, reason: '', evidence: null })), conditions: rubric.conditions.map(c => ({ code: c.code, passed: null, reason: '' })) };
}
export function assessmentError(rubric: AssessmentRubric, value: AssessmentInput): string {
  if (value.rubricVersion !== rubric.version || value.scores.length !== rubric.criteria.length || value.conditions.length !== rubric.conditions.length) return 'Rubric đã thay đổi. Vui lòng tải lại hồ sơ.';
  for (const c of rubric.criteria) {
    const matches = value.scores.filter(s => s.code === c.code), row = matches[0];
    if (matches.length !== 1 || !row.reason.trim() || row.reason.trim().length > 4000) return `Bổ sung lý do đánh giá cho ${c.name} (tối đa 4.000 ký tự).`;
    if (row.score !== null && (!Number.isFinite(row.score) || row.score < 0 || row.score > 100 || Math.abs(row.score * 100 - Math.round(row.score * 100)) > 0.000001)) return `Điểm ${c.name} phải từ 0–100, tối đa 2 số thập phân.`;
    if (row.score !== null && !row.evidence?.trim()) return `Bổ sung minh chứng cho ${c.name}.`;
  }
  for (const c of rubric.conditions) {
    const matches = value.conditions.filter(s => s.code === c.code);
    if (matches.length !== 1 || !matches[0].reason.trim() || matches[0].reason.trim().length > 4000) return `Bổ sung lý do cho điều kiện: ${c.description}.`;
  }
  return '';
}
// API scores stay on the published 0–100 scale; the UI selects 0–10.
export function scoreFromTen(score: number): number {
  if (!Number.isInteger(score) || score < 0 || score > 10) throw new Error('Điểm phải là số nguyên từ 0 đến 10.');
  return score * 10;
}
export function assessmentPreview(rubric: AssessmentRubric, value: AssessmentInput) {
  const complete = rubric.criteria.every(c => {
    const score = value.scores.find(row => row.code === c.code)?.score;
    return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
  }) && rubric.conditions.every(c => typeof value.conditions.find(row => row.code === c.code)?.passed === 'boolean');
  if (!complete) return { total: null, outcome: 4 };
  const total = rubric.criteria.reduce((sum, c) => sum + Math.round(value.scores.find(row => row.code === c.code)!.score! * 100) * c.weight, 0) / 10000;
  return { total, outcome: total >= rubric.passingScore && rubric.conditions.every(c => value.conditions.find(row => row.code === c.code)?.passed === true) ? 1 : 2 };
}
const displayPoints = (score: number) => score.toLocaleString('vi-VN', { maximumFractionDigits: 4 });

export function AssessmentForm({ rubric, value, onChange, disabled = false }: { rubric: AssessmentRubric; value: AssessmentInput; onChange?: (value: AssessmentInput) => void; disabled?: boolean }) {
  const preview = assessmentPreview(rubric, value);
  return <View style={{ gap: 18 }}>
    <Text style={s.sectionTitle}>Đánh giá theo tiêu chí</Text>
    <Text style={s.muted}>{rubric.code} · Phiên bản {rubric.version} · Điểm đạt {rubric.passingScore}/100. Chọn điểm 0–10 cho từng tiêu chí. Chọn “Chưa đủ minh chứng” khi chưa thể chấm; không dùng điểm 0 thay thế.</Text>
    <View style={[s.input, { gap: 8, backgroundColor: colors.primaryLight }]}>
      <Text style={s.label}>{disabled ? 'Tổng điểm theo trọng số' : 'Tổng điểm dự kiến'}: {preview.total === null ? 'Chưa đủ minh chứng' : displayPoints(preview.total) + '/100'}</Text>
      <Text style={s.body}>Kết quả{disabled ? '' : ' dự kiến'}: {preview.outcome === 4 ? 'Chưa đủ minh chứng' : preview.outcome === 1 ? 'Đạt yêu cầu' : 'Không đạt'}</Text>
      <Text style={s.muted}>Đã chấm {rubric.criteria.filter(c => value.scores.some(row => row.code === c.code && row.score !== null)).length}/{rubric.criteria.length} tiêu chí. Điểm quy đổi = điểm chọn ÷ 10 × trọng số. Tổng điểm là tổng các điểm quy đổi.</Text>
      <Text style={s.muted}>Ví dụ: 8/10 ở tiêu chí trọng số 10% đóng góp 8 điểm trong tổng 100. Để đạt, cần đủ điểm và tất cả điều kiện bắt buộc đều đạt.{disabled ? '' : ' Kết quả chính thức do hệ thống tính khi gửi.'}</Text>
    </View>
    {rubric.criteria.map((c, index) => {
      const row = value.scores.find(r => r.code === c.code); if (!row) return null;
      const change = (patch: Partial<typeof row>) => onChange?.({ ...value, scores: value.scores.map(r => r.code === c.code ? { ...r, ...patch } : r) });
      return <View key={c.code} style={s.detailCriterion}><Text style={s.label}>{index + 1}. {c.name} · Trọng số {c.weight}%</Text>
        <ScoreInput name={c.name} score={row.score} disabled={disabled || !onChange} onChange={score => change({ score })} />
        <Text style={s.muted}>Điểm quy đổi: {row.score === null ? 'Chưa đủ minh chứng' : displayPoints(row.score * c.weight / 100) + ' / ' + c.weight + ' điểm'}</Text>
        <Text style={s.label}>Lý do đánh giá *</Text>
        <TextInput accessibilityLabel={`Lý do ${c.name}`} placeholder="Lý do đánh giá (bắt buộc)" multiline maxLength={4000} value={row.reason} editable={!disabled && !!onChange} onChangeText={reason => change({ reason })} style={s.input} />
        <Text style={s.label}>Minh chứng{row.score === null ? ' (nếu có)' : ' *'}</Text>
        <TextInput accessibilityLabel={`Minh chứng ${c.name}`} placeholder="Tài liệu, đường dẫn hoặc vị trí minh chứng" multiline maxLength={4000} value={row.evidence ?? ''} editable={!disabled && !!onChange} onChangeText={evidence => change({ evidence })} style={s.input} />
      </View>;
    })}
    <Text style={s.sectionTitle}>Điều kiện bắt buộc</Text><Text style={s.muted}>Các điều kiện không cộng điểm. Một điều kiện không đạt khiến kết quả không đạt; chưa đủ cơ sở thì kết quả là chưa đủ minh chứng.</Text>
    {rubric.conditions.map(c => {
      const row = value.conditions.find(r => r.code === c.code); if (!row) return null;
      const change = (patch: Partial<typeof row>) => onChange?.({ ...value, conditions: value.conditions.map(r => r.code === c.code ? { ...r, ...patch } : r) });
      return <View key={c.code} style={s.detailCriterion}><Text style={s.label}>{c.description}</Text><View style={s.actions}>{[{ label: 'Đạt', passed: true }, { label: 'Không đạt', passed: false }, { label: 'Chưa đủ cơ sở', passed: null }].map(option => <Pressable key={option.label} accessibilityRole="radio" accessibilityState={{ checked: row.passed === option.passed }} disabled={disabled || !onChange} onPress={() => change({ passed: option.passed })} style={[s.secondaryButton, row.passed === option.passed && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}><Text style={s.link}>{option.label}</Text></Pressable>)}</View><TextInput accessibilityLabel={`Lý do ${c.description}`} placeholder="Lý do kết luận (bắt buộc)" multiline maxLength={4000} value={row.reason} editable={!disabled && !!onChange} onChangeText={reason => change({ reason })} style={s.input} /></View>;
    })}
  </View>;
}

function ScoreInput({ name, score, disabled, onChange }: { name: string; score: number | null; disabled: boolean; onChange: (score: number | null) => void }) {
  if (disabled) return <Text style={s.body}>Điểm: {score === null ? 'Chưa đủ minh chứng' : displayPoints(score / 10) + '/10'}</Text>;
  return <View style={{ gap: 8 }}>
    <Text style={s.label}>Điểm {name}: {score === null ? 'Chưa đủ minh chứng' : displayPoints(score / 10) + '/10'}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={'Điểm ' + name + ' (0–10)'} style={s.actions}>
      {Array.from({ length: 11 }, (_, point) => <Pressable key={point} accessibilityRole="radio" accessibilityLabel={name + ': ' + point + '/10'} accessibilityState={{ checked: score === point * 10 }} onPress={() => onChange(scoreFromTen(point))} style={[s.secondaryButton, { minWidth: 44, paddingHorizontal: 10 }, score === point * 10 && { borderColor: colors.primary, backgroundColor: colors.primary }]}><Text style={[s.link, score === point * 10 && { color: colors.surface }]}>{point}</Text></Pressable>)}
      <Pressable accessibilityRole="radio" accessibilityLabel={name + ': Chưa đủ minh chứng'} accessibilityState={{ checked: score === null }} onPress={() => onChange(null)} style={[s.secondaryButton, score === null && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}><Text style={s.link}>Chưa đủ minh chứng</Text></Pressable>
    </View>
  </View>;
}
