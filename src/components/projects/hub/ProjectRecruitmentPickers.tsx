import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { technologyKey } from '@/utils/project-technologies';
import { Field, validDate } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { ProjectTimelineDateModal } from './ProjectTimelineDateModal';
import { TechnologyLogo } from './ProjectTechnologyChips';

const vietnamDateTime = (value: string) => new Date(Date.parse(value) + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
export function formatRecruitmentDeadline(value: string) {
  if (!value) return 'Chọn ngày và giờ';
  const [date, time] = vietnamDateTime(value).split('T');
  return `${date.split('-').reverse().join('/')} · ${time}`;
}

export function RecruitmentDeadlineModal({ value, onClose, onConfirm }: { value: string; onClose: () => void; onConfirm: (value: string) => void }) {
  const initial = value ? vietnamDateTime(value) : '';
  const [hour, setHour] = useState(initial ? initial.slice(11, 13) : '23');
  const [minute, setMinute] = useState(initial ? initial.slice(14, 16) : '59');
  const [error, setError] = useState('');
  function confirm(date: string) {
    if (!date) { onConfirm(''); return; }
    if (!validDate(date) || !/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute) || Number(hour) > 23 || Number(minute) > 59) {
      setError('Vui lòng chọn ngày hợp lệ, giờ từ 00–23 và phút từ 00–59.'); return;
    }
    onConfirm(new Date(`${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+07:00`).toISOString());
  }
  return <ProjectTimelineDateModal title="Chọn hạn tuyển" value={initial.slice(0, 10)} busy={false} error={error} onClose={onClose} onConfirm={confirm}>
    <View style={s.timeRow}><View style={{ flex: 1 }}><Field compact label="Giờ (00–23)" value={hour} onChange={setHour} maxLength={2} /></View>
      <View style={{ flex: 1 }}><Field compact label="Phút (00–59)" value={minute} onChange={setMinute} maxLength={2} /></View></View>
    <Text style={s.hint}>Giờ Việt Nam (UTC+7). Để trống ngày nếu chưa xác định hạn tuyển.</Text>
  </ProjectTimelineDateModal>;
}

export function RecruitmentCompetenciesModal({ value, onClose, onConfirm }: { value: string[]; onClose: () => void; onConfirm: (value: string[]) => void }) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    skillService.getSkills(controller.signal).then(items => { if (!controller.signal.aborted) setCatalog(items); })
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được danh sách kỹ năng và công nghệ.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const keys = new Set(selected.map(technologyKey));
  const options = [...new Map([...catalog, ...selected.filter(name => !catalog.some(item => technologyKey(item.name) === technologyKey(name)))
    .map(name => ({ id: `historical-${name}`, name, iconUrl: null, category: '' }))].map(item => [technologyKey(item.name), item])).values()]
    .filter(item => technologyKey(item.name).includes(technologyKey(query)));
  return <HubModal title="Chọn kỹ năng & công nghệ" icon="layers" compact wide={false} onClose={onClose}
    footer={<><HubAction compact title="Hủy" onPress={onClose} /><HubAction compact title="Xác nhận" variant="primary" onPress={() => onConfirm(selected)} /></>}>
    <View style={s.search}><HubIcon name="search" size={17} /><TextInput accessibilityLabel="Tìm kỹ năng hoặc công nghệ" placeholder="Tìm kỹ năng hoặc công nghệ…" value={query} onChangeText={setQuery} style={s.searchInput} /></View>
    <Text style={s.hint}>Đã chọn {selected.length}. Chọn nhiều mục phù hợp với vị trí tuyển.</Text>
    {loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải danh sách" /> : error ? <View style={{ gap: 8 }}><Text role="alert" style={ui.error}>{error}</Text><HubAction compact title="Tải lại danh sách" onPress={() => setAttempt(n => n + 1)} /></View> : <View style={s.options}>
      {options.map(item => {
        const checked = keys.has(technologyKey(item.name)), disabled = !checked && selected.length >= 40;
        return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled}
          onPress={() => setSelected(old => checked ? old.filter(name => technologyKey(name) !== technologyKey(item.name)) : [...old, item.name])}
          style={[s.option, checked && { borderColor: c.primary, backgroundColor: c.blueWash }, disabled && { opacity: 0.5 }]}>
          <TechnologyLogo name={item.name} iconUrl={item.iconUrl} /><Text style={s.optionText}>{item.name}</Text>
        </Pressable>;
      })}
      {!options.length && <Text style={s.hint}>Không tìm thấy kỹ năng hoặc công nghệ phù hợp.</Text>}
    </View>}
  </HubModal>;
}

const s = StyleSheet.create({
  timeRow: { flexDirection: 'row', gap: 12 }, hint: { color: c.textSecondary, fontSize: 12, lineHeight: 18 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: c.ink, fontSize: 13 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, maxWidth: '100%' },
  optionText: { color: c.ink, fontSize: 12, flexShrink: 1 },
});
