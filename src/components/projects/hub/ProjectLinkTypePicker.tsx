import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getProjectLinkType, projectLinkTypes } from '@/utils/project-links';
import { HubIcon, hubColors as c } from './ProjectHubUI';
import { ProjectLinkIcon } from './ProjectLinkIcon';

export function ProjectLinkTypePicker({ value, onChange, index, disabled }: { value: string; onChange: (label: string) => void; index: number; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Loại liên kết ${index}`} aria-expanded={open} disabled={disabled} accessibilityState={{ disabled }} onPress={() => setOpen(!open)} style={[styles.trigger, open && styles.active, disabled && { opacity: 0.5 }]}>
      {!!value && <ProjectLinkIcon label={value} size={19} />}<Text style={[styles.text, !value && { color: c.textSecondary }]}>{value ? getProjectLinkType(value).label : 'Chọn loại liên kết'}</Text><HubIcon name="chevron" size={16} color="#617292" />
    </Pressable>
    {open && <View role="radiogroup" accessibilityLabel={`Chọn loại liên kết ${index}`} style={styles.menu}>{projectLinkTypes.map(type => {
      const selected = !!value && getProjectLinkType(value).id === type.id;
      return <Pressable key={type.id} role="radio" accessibilityLabel={type.label} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} disabled={disabled} onPress={() => { onChange(type.label); setOpen(false); }} style={({ pressed }) => [styles.option, (selected || pressed) && styles.selected]}>
        <ProjectLinkIcon label={type.label} /><Text style={styles.text}>{type.label}</Text>{selected && <HubIcon name="check" size={17} />}
      </Pressable>;
    })}</View>}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 0, gap: 6 },
  trigger: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: '#D1DBF2', backgroundColor: '#FFFFFF', borderRadius: 9 },
  active: { borderColor: '#7296FF' },
  text: { color: c.ink, fontSize: 13, flex: 1, minWidth: 0 },
  menu: { padding: 5, borderWidth: 1, borderColor: '#D7E0F4', borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: '0 5px 14px rgba(34, 57, 107, 0.12)' },
  option: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8 },
  selected: { backgroundColor: '#E8F0FF' },
});
