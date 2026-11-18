import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { HubProject } from '@/types/project-hub';
import { HubAction, HubIcon, hubColors as c, ui, type HubIconName } from './ProjectHubUI';
import { projectToday } from './ProjectDateField';
import { ProjectTimelineDateModal, formatTimelineDate } from './ProjectTimelineDateModal';
import { messageOf, validDate } from './ProjectHubFields';
import { projectHubService } from '@/services/project-hub.service';

export function ProjectSettingsPanel({ project, onManage, onSaved }: { project: HubProject; onManage: (action: 'complete' | 'delete' | 'leave') => void; onSaved: (value: HubProject) => void }) {
  const canComplete = project.isOwner && project.status !== 2 && project.status !== 3;
  return <View role="tabpanel" aria-label="Cài đặt dự án" style={styles.settings}>
    {project.isOwner && <ProjectTimelineSettings project={project} onSaved={onSaved} />}
    <SettingsSection title="Quản lý dự án" subtitle="Các thao tác quản lý dự án." icon="layers">
      <View style={styles.management}>
        {canComplete && <View style={[styles.managementItem, styles.completion]}>
          <View style={[styles.actionIcon, { backgroundColor: '#E5EDFF' }]}><HubIcon name="flag" size={20} /></View>
          <View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: c.primary }]}>Hoàn thành dự án</Text><Text style={styles.subtitle}>Đánh dấu dự án đã hoàn thành.</Text></View>
          <HubAction compact title="Hoàn thành" onPress={() => onManage('complete')} style={styles.smallAction} />
        </View>}
        <View style={[styles.managementItem, styles.deletion]}>
          <View style={[styles.actionIcon, { backgroundColor: '#FFE6EB' }]}><HubIcon name={project.isOwner ? 'trash' : 'back'} size={20} color={c.error} /></View>
          <View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: c.error }]}>{project.isOwner ? 'Xóa dự án' : 'Rời dự án'}</Text><Text style={styles.subtitle}>{project.isOwner ? 'Xóa vĩnh viễn dự án này.' : 'Kết thúc tham gia dự án này.'}</Text></View>
          <HubAction compact title={project.isOwner ? 'Xóa dự án' : 'Rời dự án'} variant="danger" onPress={() => onManage(project.isOwner ? 'delete' : 'leave')} style={styles.smallAction} />
        </View>
      </View>
    </SettingsSection>
  </View>;
}

function SettingsSection({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: HubIconName; children: ReactNode }) {
  return <View role="region" accessibilityLabel={title} style={styles.section}>
    <View style={styles.sectionHead}><View style={styles.sectionIcon}><HubIcon name={icon} size={19} /></View><View style={{ flex: 1, gap: 4 }}>
      <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>
    </View></View>
    {children}
  </View>;
}

function ProjectTimelineSettings({ project, onSaved }: { project: HubProject; onSaved: (value: HubProject) => void }) {
  const { width } = useWindowDimensions();
  type DateField = 'startDate' | 'actualEndDate';
  const [editing, setEditing] = useState<DateField | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const timeline = { startDate: project.details.startDate ?? '', actualEndDate: project.details.actualEndDate ?? '' };
  const fields: { key: DateField; label: string; title: string }[] = [
    { key: 'startDate', label: 'Ngày bắt đầu', title: 'Cập nhật ngày bắt đầu' },
    { key: 'actualEndDate', label: 'Ngày kết thúc', title: 'Cập nhật ngày kết thúc' },
  ];
  const close = () => { if (!lock.current) { setEditing(null); setError(''); } };
  async function save(value: string) {
    if (lock.current || !editing) return;
    setError(''); setSaved(false);
    const nextTimeline = { ...timeline, [editing]: value };
    const { startDate: start, actualEndDate: actual } = nextTimeline;
    if (![start, actual].every(validDate)) { setError('Vui lòng chọn ngày hợp lệ.'); return; }
    if (start && actual && actual < start) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return; }
    if (actual && actual > projectToday()) { setError('Ngày kết thúc không được ở tương lai.'); return; }
    lock.current = true; setBusy(true);
    try {
      onSaved(await projectHubService.update(project.id, { timeline: { startDate: start || null, actualEndDate: actual || null } }));
      setSaved(true); setEditing(null);
    } catch (cause) { setError(messageOf(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SettingsSection title="Thời gian dự án" subtitle="Thiết lập ngày bắt đầu và ngày kết thúc dự án." icon="calendar">
    <View style={[styles.dateFields, width < 1200 && styles.stacked]}>
      {fields.map(field => {
        const disabled = busy;
        return <View key={field.key} style={styles.dateField}>
          <Text style={styles.dateLabel}>{field.label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={field.title} accessibilityState={{ disabled }} disabled={disabled}
            onPress={() => { setError(''); setSaved(false); setEditing(field.key); }}
            style={({ pressed }) => [styles.control, disabled && styles.locked, pressed && styles.pressed]}>
            <HubIcon name="calendar" size={16} color={c.ink} />
            <Text style={[styles.controlText, !timeline[field.key] && { color: c.textSecondary }]}>
              {timeline[field.key] ? formatTimelineDate(timeline[field.key]) : field.key === 'startDate' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
            </Text>
          </Pressable>
        </View>;
      })}
    </View>
    {saved && <Text role="status" style={ui.muted}>Đã lưu thời gian dự án.</Text>}
    {editing && <ProjectTimelineDateModal key={`${project.id}-${editing}`} title={fields.find(field => field.key === editing)!.title}
      value={timeline[editing]} min={editing !== 'startDate' ? timeline.startDate || undefined : undefined}
      max={editing === 'actualEndDate' ? projectToday() : timeline.actualEndDate || undefined}
      busy={busy} error={error} onClose={close} onConfirm={value => void save(value)} />}
  </SettingsSection>;
}

const styles = StyleSheet.create({
  settings: { gap: 16 },
  section: { backgroundColor: c.surface, borderWidth: 1, borderColor: '#E7ECF7', borderRadius: 12, padding: 18, gap: 16, boxShadow: '0 2px 8px rgba(33, 62, 115, 0.03)' },
  sectionHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  sectionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.blueWash, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: c.ink }, subtitle: { fontSize: 11, lineHeight: 17, color: c.textSecondary },
  dateFields: { flexDirection: 'row', gap: 18 }, stacked: { flexDirection: 'column', gap: 14 },
  dateField: { flex: 1, minWidth: 0, gap: 6 }, dateLabel: { fontSize: 12, fontWeight: '500', color: c.ink },
  control: { minHeight: 36, borderWidth: 1, borderColor: '#D6DFF0', borderRadius: 7, backgroundColor: c.surface, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', gap: 9, alignItems: 'center' },
  controlText: { flex: 1, fontSize: 12, lineHeight: 18, color: c.ink }, locked: { backgroundColor: '#FAFBFE' }, pressed: { backgroundColor: c.blueWash },
  management: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  managementItem: { flex: 1, flexBasis: 300, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, borderRadius: 9 },
  completion: { backgroundColor: '#F1F5FF' }, deletion: { backgroundColor: '#FFF3F5' },
  actionIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 135, gap: 3 }, actionTitle: { fontSize: 12, fontWeight: '600' },
  smallAction: { minHeight: 30, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
});
