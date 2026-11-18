import { PersonAvatar } from './PersonAvatar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { canInviteProjectFriends } from '@/utils/project-invitations';
import type { HubMember, HubPosition, HubProject, HubRequest } from '@/types/project-hub';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { Field, lines, messageOf, technologies, validDate } from './ProjectHubFields';

const position = (): HubPosition => ({ id: `position-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, name: '', quantity: 1, technologies: [], skills: [], jobDescription: '', requirements: [], benefits: [] });
type SavedProps = { project: HubProject; onSaved: (value: HubProject) => void; onClose: () => void };
export function RecruitmentModal({ project, onSaved, onClose }: SavedProps) {
  const existing = project.recruitment;
  const [positions, setPositions] = useState<HubPosition[]>(existing?.positions.length ? existing.positions : [position()]);
  const [raw, setRaw] = useState<Record<string, Partial<Record<'competencies' | 'requirements', string>>>>({});
  const [deadline, setDeadline] = useState(existing?.deadline?.slice(0, 10) ?? '');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  function patch(index: number, value: Partial<HubPosition>) { setPositions(old => old.map((item, i) => i === index ? { ...item, ...value } : item)); }
  function listText(item: HubPosition, key: 'competencies' | 'requirements') { return raw[item.id]?.[key] ?? (key === 'competencies' ? [...new Set([...item.technologies, ...item.skills])].join(', ') : item.requirements.join('\n')); }
  function changeList(index: number, key: 'competencies' | 'requirements', value: string) {
    const item = positions[index];
    setRaw(old => ({ ...old, [item.id]: { ...old[item.id], [key]: value } }));
    if (key === 'requirements') { patch(index, { requirements: lines(value) }); return; }
    const values = technologies(value);
    const skillNames = new Set(item.skills.map(skill => skill.toLocaleLowerCase()));
    const technologyNames = new Set(item.technologies.map(technology => technology.toLocaleLowerCase()));
    patch(index, { technologies: values.filter(value => !skillNames.has(value.toLocaleLowerCase()) || technologyNames.has(value.toLocaleLowerCase())), skills: values.filter(value => skillNames.has(value.toLocaleLowerCase())) });
  }
  async function save(status: 0 | 1 | 2) {
    setError('');
    if (positions.some(item => !item.name.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) { setError('Mỗi vị trí cần có tên và số lượng tuyển từ 1 đến 100.'); return; }
    if (!validDate(deadline)) { setError('Hạn tuyển cần có dạng YYYY-MM-DD.'); return; }
    const end = deadline ? new Date(`${deadline}T23:59:59+07:00`).toISOString() : null;
    if (status === 1 && end && Date.parse(end) <= Date.now()) { setError('Hạn tuyển phải nằm trong tương lai.'); return; }
    setBusy(true);
    try { const saved = await projectHubService.saveRecruitment(project.id, { description: existing?.description ?? null, positions: positions.map(item => ({ ...item, name: item.name.trim() })), deadline: end, status }); onSaved(saved); onClose(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  return <HubModal compact wide={false} icon="people" title={existing ? 'Quản lý tuyển thành viên' : 'Đăng tuyển thành viên'} subtitle="Thiết lập vị trí và yêu cầu để tìm thành viên phù hợp." onClose={busy ? () => undefined : onClose} footer={<><HubAction compact title="Hủy" onPress={onClose} disabled={busy} />{existing && <HubAction compact title="Đóng tuyển" onPress={() => void save(2)} disabled={busy} />}<HubAction compact title="Lưu nháp" onPress={() => void save(0)} disabled={busy} /><HubAction compact title="Đăng tuyển" variant="primary" onPress={() => void save(1)} busy={busy} disabled={project.status === 2} /></>}>
    <Field compact label="Hạn tuyển" value={deadline} onChange={setDeadline} placeholder="YYYY-MM-DD" hint="Để trống nếu chưa xác định hạn tuyển." />
    {positions.map((item, i) => <View key={item.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 14, marginTop: 12, backgroundColor: '#F8FAFF' }}>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}><Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>Vị trí {i + 1}</Text>{positions.length > 1 && <HubAction compact title={`Gỡ vị trí ${i + 1}`} icon="trash" variant="quiet" disabled={busy} onPress={() => setPositions(old => old.filter((_, index) => index !== i))} />}</View>
      <View style={styles.row}><View style={{ flex: 1, minWidth: 0 }}><Field compact label={`Tên vị trí ${i + 1} *`} value={item.name} onChange={name => patch(i, { name })} maxLength={150} placeholder="Ví dụ: Backend Developer" /></View><View style={{ width: 78 }}><Field compact label="Số lượng *" value={String(item.quantity || '')} onChange={quantity => patch(i, { quantity: Number(quantity) })} maxLength={3} /></View></View>
      <Field compact label={`Kỹ năng & công nghệ — vị trí ${i + 1}`} value={listText(item, 'competencies')} onChange={value => changeList(i, 'competencies', value)} placeholder="ASP.NET Core, PostgreSQL, REST API, Git…" />
      <Field compact label={`Yêu cầu bổ sung — vị trí ${i + 1}`} value={listText(item, 'requirements')} onChange={value => changeList(i, 'requirements', value)} multiline hint="Mỗi yêu cầu trên một dòng." />
    </View>)}
    <View style={{ marginTop: 16 }}><HubAction compact title="Thêm vị trí tuyển" icon="plus" disabled={busy || positions.length >= 20} onPress={() => setPositions(old => [...old, position()])} /></View>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}

export { ProjectFriendInviteModal as InviteMemberModal } from './ProjectFriendInviteModal';
export function ApplyProjectModal({ project, onClose, onApplied }: { project: HubProject; onClose: () => void; onApplied: () => void }) {
  const [positionId, setPositionId] = useState(project.recruitment?.positions[0]?.id ?? ''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function apply() {
    if (!positionId) { setError('Chọn vị trí muốn ứng tuyển.'); return; }
    setBusy(true); setError('');
    try { await projectHubService.sendRequest(project.id, { requestType: 0, positionId, message: message.trim() || undefined }); onApplied(); onClose(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  return <HubModal wide={false} title="Ứng tuyển vào dự án" subtitle={project.title} onClose={busy ? () => undefined : onClose} footer={<><HubAction title="Hủy" disabled={busy} onPress={onClose} /><HubAction title="Gửi ứng tuyển" variant="primary" busy={busy} onPress={() => void apply()} /></>}>
    <PositionChoices project={project} selected={positionId} onSelect={setPositionId} /><Field label="Lời nhắn ứng tuyển" value={message} onChange={setMessage} multiline maxLength={2000} placeholder="Giới thiệu kinh nghiệm và lý do bạn muốn tham gia…" />{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
function PositionChoices({ project, selected, onSelect }: { project: HubProject; selected: string; onSelect: (value: string) => void }) {
  return project.recruitment?.positions.length ? <View style={ui.field}><Text style={ui.label}>Vị trí</Text><View style={{ gap: 9 }}>{project.recruitment.positions.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }} onPress={() => onSelect(item.id)} style={[styles.position, selected === item.id && { borderColor: c.primary, backgroundColor: c.blueWash }]}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: c.ink, fontWeight: '600' }}>{item.name}</Text><Text style={ui.muted}>Tuyển {item.quantity} thành viên</Text>{!!item.jobDescription && <Text style={ui.muted}>{item.jobDescription}</Text>}</View><HubIcon name={selected === item.id ? 'check' : 'person'} /></Pressable>)}</View></View> : null;
}
export function ProjectRequestsModal({ project, onClose, onChanged, onInvite, onRecruit }: { project: HubProject; onClose: () => void; onChanged: () => void; onInvite: () => void; onRecruit?: () => void }) {
  const compact = useWindowDimensions().width < 800;
  const actionStyle = compact ? { minHeight: 30, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 } : undefined;
  const [items, setItems] = useState<HubRequest[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => { const controller = new AbortController(); projectHubService.requests(project.id, controller.signal).then(result => { if (!controller.signal.aborted) setItems(result.items); }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [project.id]);
  async function decide(item: HubRequest, decision: 'accept' | 'reject' | 'cancel') {
    setBusy(item.id); setError('');
    try { const saved = await projectHubService.decide(item.id, decision); setItems(old => old.map(row => row.id === saved.id ? saved : row)); onChanged(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(''); }
  }
  return <HubModal compact wide={false} icon="invite" title="Lời mời" subtitle="Danh sách người xin tham gia và người được mời vào dự án." onClose={busy ? () => undefined : onClose} footer={<HubAction compact title="Đóng" onPress={onClose} disabled={!!busy} />}>
    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }]}><Text style={ui.muted}>{items.length} yêu cầu & lời mời</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}><HubAction compact title="Mời" icon={compact ? undefined : 'invite'} style={actionStyle} variant="primary" disabled={!!busy || !canInviteProjectFriends(project)} onPress={onInvite} />{onRecruit && <HubAction compact title="Tuyển" icon={compact ? undefined : 'people'} style={actionStyle} variant="primary" disabled={!!busy} onPress={onRecruit} />}</View></View>
    {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 16 }]}>{error}</Text>}
    {loading ? <ActivityIndicator color={c.primary} /> : !items.length ? <View style={styles.empty}><HubIcon name="people" size={34} /><Text style={ui.muted}>Chưa có yêu cầu tham gia hoặc lời mời.</Text></View> : <View style={{ gap: 12 }}>{items.map(item => <View key={item.id} testID={`project-request-${item.id}`} style={styles.request}>
      <View style={[styles.row, { gap: 6 }]}><HubIcon name={item.requestType === 0 ? 'person' : 'invite'} size={15} /><Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{item.requestType === 0 ? 'Xin tham gia' : 'Được mời'}</Text></View>
      <View style={styles.row}><PersonAvatar person={{ fullName: item.fullName, avatarUrl: item.avatarUrl }} /><View style={{ flex: 1 }}><Text style={styles.name}>{item.fullName}</Text><Text style={ui.muted}>{item.role}</Text></View><Text style={styles.requestStatus}>{['Đang chờ', 'Đã chấp nhận', 'Đã từ chối', 'Đã hủy', 'Hết hạn'][item.status]}</Text></View>
      {!!item.message && <Text style={[ui.muted, { paddingLeft: 52 }]}>{item.message}</Text>}
      {item.status === 0 && <View style={[styles.row, { justifyContent: 'flex-end', flexWrap: 'wrap' }]}>{item.requestType === 0 ? <><HubAction title="Từ chối" disabled={!!busy} onPress={() => void decide(item, 'reject')} /><HubAction title="Chấp nhận" variant="primary" busy={busy === item.id} disabled={!!busy && busy !== item.id} onPress={() => void decide(item, 'accept')} /></> : <HubAction title="Hủy lời mời" disabled={!!busy} busy={busy === item.id} onPress={() => void decide(item, 'cancel')} />}</View>}
    </View>)}</View>}
  </HubModal>;
}
export function MemberRoleModal({ project, member, onSaved, onClose }: SavedProps & { member: HubMember }) {
  const [role, setRole] = useState(member.role), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmKick, setConfirmKick] = useState(false);
  async function save(kick = false) { if (!kick && !role.trim()) { setError('Nhập vai trò của thành viên.'); return; } setBusy(true); setError(''); try { onSaved(await projectHubService.updateMember(project.id, member.userId, kick ? { status: 1 } : { role: role.trim() })); onClose(); } catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); } }
  return <HubModal wide={false} title="Quản lý thành viên" subtitle={member.fullName} onClose={busy ? () => undefined : onClose} footer={<><HubAction title="Hủy" disabled={busy} onPress={onClose} /><HubAction title="Lưu thay đổi" variant="primary" busy={busy} onPress={() => void save()} /></>}><Field label="Vai trò trong dự án" value={role} onChange={setRole} maxLength={150} />{member.userId !== project.creator.id && <View style={{ gap: 10 }}><Text style={ui.muted}>{confirmKick ? 'Xác nhận kết thúc tư cách thành viên? Lịch sử tham gia vẫn được giữ.' : 'Có thể kết thúc tư cách thành viên khi họ không còn tham gia dự án.'}</Text><HubAction title={confirmKick ? 'Xác nhận loại khỏi dự án' : 'Loại khỏi dự án'} variant="danger" disabled={busy} onPress={() => confirmKick ? void save(true) : setConfirmKick(true)} /></View>}{!!error && <Text accessibilityRole="alert" style={[ui.error, { marginTop: 16 }]}>{error}</Text>}</HubModal>;
}
export { PersonAvatar } from './PersonAvatar';
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, notice: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.blueWash, padding: 16, borderRadius: 10, marginBottom: 24 }, person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.line, padding: 11, borderRadius: 10 }, position: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderWidth: 1, borderColor: c.line, borderRadius: 10 }, empty: { alignItems: 'center', gap: 15, paddingVertical: 42 }, request: { gap: 13, padding: 18, borderWidth: 1, borderColor: c.line, borderRadius: 12 }, name: { color: c.ink, fontSize: 15, fontWeight: '600' }, requestStatus: { color: c.textSecondary, fontSize: 12, backgroundColor: c.canvas, padding: 8, borderRadius: 8 } });
