import { useState } from 'react';
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
export function AssessmentForm({ rubric, value, onChange, disabled = false }: { rubric: AssessmentRubric; value: AssessmentInput; onChange?: (value: AssessmentInput) => void; disabled?: boolean }) {
  return <View style={{ gap: 18 }}>
    <Text style={s.sectionTitle}>Đánh giá theo tiêu chí</Text>
    <Text style={s.muted}>{rubric.code} · Phiên bản {rubric.version} · Điểm đạt {rubric.passingScore}/100. Để trống điểm khi chưa đủ minh chứng.</Text>
    {rubric.criteria.map(c => {
      const row = value.scores.find(r => r.code === c.code); if (!row) return null;
      const change = (patch: Partial<typeof row>) => onChange?.({ ...value, scores: value.scores.map(r => r.code === c.code ? { ...r, ...patch } : r) });
      return <View key={c.code} style={[s.divider, { gap: 10 }]}><Text style={s.label}>{c.name} · Trọng số {c.weight}%</Text>
        <ScoreInput name={c.name} score={row.score} disabled={disabled || !onChange} onChange={score => change({ score })} />
        <TextInput accessibilityLabel={`Lý do ${c.name}`} placeholder="Lý do đánh giá (bắt buộc)" multiline maxLength={4000} value={row.reason} editable={!disabled && !!onChange} onChangeText={reason => change({ reason })} style={s.input} />
        <TextInput accessibilityLabel={`Minh chứng ${c.name}`} placeholder="Tài liệu, đường dẫn hoặc vị trí minh chứng" multiline maxLength={4000} value={row.evidence ?? ''} editable={!disabled && !!onChange} onChangeText={evidence => change({ evidence })} style={s.input} />
      </View>;
    })}
    <Text style={s.sectionTitle}>Điều kiện bắt buộc</Text>
    {rubric.conditions.map(c => {
      const row = value.conditions.find(r => r.code === c.code); if (!row) return null;
      const change = (patch: Partial<typeof row>) => onChange?.({ ...value, conditions: value.conditions.map(r => r.code === c.code ? { ...r, ...patch } : r) });
      return <View key={c.code} style={[s.divider, { gap: 10 }]}><Text style={s.label}>{c.description}</Text><View style={s.actions}>{[{ label: 'Đạt', passed: true }, { label: 'Không đạt', passed: false }, { label: 'Chưa đủ cơ sở', passed: null }].map(option => <Pressable key={option.label} accessibilityRole="radio" accessibilityState={{ checked: row.passed === option.passed }} disabled={disabled || !onChange} onPress={() => change({ passed: option.passed })} style={[s.secondaryButton, row.passed === option.passed && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}><Text style={s.link}>{option.label}</Text></Pressable>)}</View><TextInput accessibilityLabel={`Lý do ${c.description}`} placeholder="Lý do kết luận (bắt buộc)" multiline maxLength={4000} value={row.reason} editable={!disabled && !!onChange} onChangeText={reason => change({ reason })} style={s.input} /></View>;
    })}
  </View>;
}

function ScoreInput({ name, score, disabled, onChange }: { name: string; score: number | null; disabled: boolean; onChange: (score: number | null) => void }) {
  const [text, setText] = useState(score === null ? '' : String(score));
  return <TextInput accessibilityLabel={`Điểm ${name}`} placeholder="Chưa đủ minh chứng" keyboardType="decimal-pad" value={text} editable={!disabled} onChangeText={value => { if (!/^\d{0,3}([.,]\d{0,2})?$/.test(value)) return; setText(value); onChange(value === '' ? null : Number(value.replace(',', '.'))); }} style={s.input} />;
}
