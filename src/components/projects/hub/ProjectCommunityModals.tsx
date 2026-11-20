import { PersonAvatar } from './PersonAvatar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import { canInviteProjectFriends } from '@/utils/project-invitations';
import type { HubMember, HubPosition, HubProject, HubRequest } from '@/types/project-hub';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { Field, lines, messageOf, technologies } from './ProjectHubFields';
import { RecruitmentDeadlineModal, RecruitmentCompetenciesModal, formatRecruitmentDeadline } from './ProjectRecruitmentPickers';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { findTechnology } from '@/utils/project-technologies';
import { TechnologyLogo } from './ProjectTechnologyChips';
import { ProjectRecruitmentOverview } from './ProjectRecruitmentOverview';

const position = (): HubPosition => ({ id: `position-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, name: '', quantity: 1, technologies: [], skills: [], jobDescription: '', requirements: [], benefits: [] });
type SavedProps = { project: HubProject; onSaved: (value: HubProject) => void; onClose: () => void };
export function RecruitmentModal({ project, onSaved, onClose }: SavedProps) {
  const [editing, setEditing] = useState(!project.recruitment);
  return editing ? <RecruitmentEditor project={project} onSaved={onSaved} onClose={() => project.recruitment ? setEditing(false) : onClose()} />
    : <ProjectRecruitmentOverview project={project} onSaved={onSaved} onClose={onClose} onEdit={() => setEditing(true)} />;
}
function RecruitmentEditor({ project, onSaved, onClose }: SavedProps) {
  const existing = project.recruitment;
  const [positions, setPositions] = useState<HubPosition[]>(existing?.positions.length ? existing.positions : [position()]);
  const [raw, setRaw] = useState<Record<string, Partial<Record<'competencies' | 'requirements', string>>>>({});
  const [deadline, setDeadline] = useState(existing?.deadline ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [picker, setPicker] = useState<'deadline' | number | null>(null);
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    skillService.getSkills(controller.signal).then(items => { if (!controller.signal.aborted) setCatalog(items); }).catch(() => {});
    return () => controller.abort();
  }, []);
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
  async function save() {
    setError('');
    if (positions.some(item => !item.name.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) { setError('Mỗi vị trí cần có tên và số lượng tuyển từ 1 đến 100.'); return; }
    const end = deadline || null;
    if (end && Date.parse(end) <= Date.now()) { setError('Hạn tuyển phải nằm trong tương lai.'); return; }
    setBusy(true);
    try { const saved = await projectHubService.saveRecruitment(project.id, { description: description.trim() || null, positions: positions.map(item => ({ ...item, name: item.name.trim() })), deadline: end, status: 1 }); onSaved(saved); onClose(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  return <><HubModal compact wide={false} icon="people" title={existing ? 'Chỉnh sửa tuyển thành viên' : 'Đăng tuyển thành viên'} subtitle="Thiết lập vị trí và yêu cầu để tìm thành viên phù hợp." onClose={busy ? () => undefined : onClose} footer={<><HubAction compact title="Hủy" onPress={onClose} disabled={busy} /><HubAction compact title={existing?.status === 1 ? 'Lưu thay đổi' : 'Đăng tuyển'} variant="primary" onPress={() => void save()} busy={busy} disabled={project.status === 2} /></>}>
    <Field compact label="Giới thiệu ngắn" value={description} onChange={setDescription} multiline maxLength={5000} placeholder="Giới thiệu ngắn về dự án, mục tiêu tuyển và thành viên bạn đang tìm kiếm…" hint="Tóm tắt trong vài câu để ứng viên hiểu bài đăng tuyển của bạn." />
    <View style={ui.field}><Text style={ui.label}>Hạn tuyển</Text><HubAction compact title={formatRecruitmentDeadline(deadline)} icon="calendar" disabled={busy} onPress={() => setPicker('deadline')} />
      <Text style={[ui.muted, { marginTop: 6 }]}>Giờ Việt Nam (UTC+7). Để trống nếu chưa xác định hạn tuyển.</Text></View>
    {positions.map((item, i) => <View key={item.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 14, marginTop: 12, backgroundColor: '#F8FAFF' }}>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}><Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>Vị trí {i + 1}</Text>{positions.length > 1 && <HubAction compact title={`Gỡ vị trí ${i + 1}`} icon="trash" variant="quiet" disabled={busy} onPress={() => setPositions(old => old.filter((_, index) => index !== i))} />}</View>
      <View style={styles.row}><View style={{ flex: 1, minWidth: 0 }}><Field compact label={`Tên vị trí ${i + 1} *`} value={item.name} onChange={name => patch(i, { name })} maxLength={150} placeholder="Ví dụ: Backend Developer" /></View><View style={{ width: 78 }}><Field compact label="Số lượng *" value={String(item.quantity || '')} onChange={quantity => patch(i, { quantity: Number(quantity) })} maxLength={3} /></View></View>
      <View style={ui.field}><Text style={ui.label}>Kỹ năng & công nghệ — vị trí {i + 1}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Chọn kỹ năng & công nghệ — vị trí ${i + 1}`} disabled={busy} onPress={() => setPicker(i)} style={[ui.input, { minHeight: 38, justifyContent: 'center', padding: 6 }]}>
          {listText(item, 'competencies') ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {technologies(listText(item, 'competencies')).map(name => <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.primary, backgroundColor: c.blueWash, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, maxWidth: '100%' }}>
              <TechnologyLogo name={name} iconUrl={findTechnology(catalog, name)?.iconUrl} size={14} /><Text style={{ color: c.ink, fontSize: 11, lineHeight: 16, flexShrink: 1 }}>{name}</Text>
            </View>)}
          </View> : <Text style={{ color: c.textMuted, fontSize: 13 }}>Chọn kỹ năng và công nghệ…</Text>}
        </Pressable></View>
      <Field compact label={`Yêu cầu bổ sung — vị trí ${i + 1}`} value={listText(item, 'requirements')} onChange={value => changeList(i, 'requirements', value)} multiline hint="Mỗi yêu cầu trên một dòng." />
    </View>)}
    <View style={{ marginTop: 16 }}><HubAction compact title="Thêm vị trí tuyển" icon="plus" disabled={busy || positions.length >= 20} onPress={() => setPositions(old => [...old, position()])} /></View>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>
    {picker === 'deadline' && <RecruitmentDeadlineModal value={deadline} onClose={() => setPicker(null)} onConfirm={value => { setDeadline(value); setPicker(null); }} />}
    {typeof picker === 'number' && positions[picker] && <RecruitmentCompetenciesModal value={technologies(listText(positions[picker], 'competencies'))} onClose={() => setPicker(null)} onConfirm={values => { changeList(picker, 'competencies', values.join(', ')); setPicker(null); }} />}
  </>;
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
  return <HubModal compact wide={false} maxWidth={520} icon="invite" title="Ứng tuyển vào dự án" subtitle={project.title} onClose={busy ? () => undefined : onClose} footer={<><HubAction compact title="Hủy" disabled={busy} onPress={onClose} /><HubAction compact title="Gửi ứng tuyển" variant="primary" busy={busy} onPress={() => void apply()} /></>}>
    <View style={applyStyles.body}>
      <PositionChoices project={project} selected={positionId} onSelect={setPositionId} />
      <View style={applyStyles.message}><Field compact label="Lời nhắn ứng tuyển" value={message} onChange={setMessage} multiline maxLength={2000} placeholder="Chia sẻ kinh nghiệm và lý do bạn muốn tham gia…" /><View style={applyStyles.messageFoot}><Text style={applyStyles.hint}>Một lời giới thiệu ngắn giúp nhóm hiểu bạn hơn.</Text><Text style={applyStyles.counter}>{message.length}/2000</Text></View></View>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    </View>
  </HubModal>;
}
function PositionChoices({ project, selected, onSelect }: { project: HubProject; selected: string; onSelect: (value: string) => void }) {
  return project.recruitment?.positions.length ? <View style={applyStyles.positions}><View style={applyStyles.sectionHead}><Text style={applyStyles.label}>Vị trí ứng tuyển</Text><Text style={applyStyles.hint}>Chọn một vị trí phù hợp với bạn</Text></View><View accessibilityRole="radiogroup" accessibilityLabel="Vị trí ứng tuyển" style={applyStyles.options}>{project.recruitment.positions.map(item => {
    const checked = selected === item.id;
    return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked }} aria-checked={checked} onPress={() => onSelect(item.id)} style={({ pressed }) => [applyStyles.option, checked && applyStyles.selected, pressed && { opacity: 0.8 }]}>
      <View style={[applyStyles.emblem, checked && applyStyles.selectedEmblem]}><HubIcon name="person" size={18} color={checked ? c.primary : '#8190AA'} /></View>
      <View style={applyStyles.optionContent}><Text style={applyStyles.name}>{item.name}</Text><Text style={applyStyles.hint}>Tuyển {item.quantity} thành viên</Text>{!!item.jobDescription && <Text style={applyStyles.hint}>{item.jobDescription}</Text>}</View>
      <View style={[applyStyles.radio, checked && applyStyles.radioSelected]}>{checked && <View style={applyStyles.radioDot} />}</View>
    </Pressable>;
  })}</View></View> : null;
}
const applyStyles = StyleSheet.create({
  body: { gap: 22, paddingVertical: 2 }, positions: { gap: 12 }, sectionHead: { gap: 4 },
  label: { color: c.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' }, hint: { color: c.textSecondary, fontSize: 11, lineHeight: 17 },
  options: { gap: 9 }, option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: '#E1E7F2', borderRadius: 12, backgroundColor: '#FFFFFF' },
  selected: { borderColor: '#8BAFFF', backgroundColor: '#F0F5FF' }, emblem: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F5F9', alignItems: 'center', justifyContent: 'center' }, selectedEmblem: { backgroundColor: '#DFEAFF' },
  optionContent: { flex: 1, minWidth: 0, gap: 3 }, name: { color: c.ink, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CDD6E6', alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: c.primary }, radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  message: { gap: 0 }, messageFoot: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, counter: { color: '#8190AA', fontSize: 10, lineHeight: 17, fontVariant: ['tabular-nums'] },
});
export function ProjectRequestsModal({ project, onClose, onChanged, onInvite, onRecruit }: { project: HubProject; onClose: () => void; onChanged: () => void; onInvite: () => void; onRecruit?: () => void }) {
  const compact = useWindowDimensions().width < 800;
  const actionStyle = requestStyles.action;
  const [items, setItems] = useState<HubRequest[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => { const controller = new AbortController(); projectHubService.requests(project.id, controller.signal).then(result => { if (!controller.signal.aborted) setItems(result.items); }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [project.id]);
  async function decide(item: HubRequest, decision: 'accept' | 'reject' | 'cancel') {
    setBusy(item.id); setError('');
    try { const saved = await projectHubService.decide(item.id, decision); setItems(old => old.map(row => row.id === saved.id ? saved : row)); onChanged(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(''); }
  }
  return <HubModal compact wide={false} maxWidth={560} icon="invite" title="Lời mời" subtitle="Danh sách người xin tham gia và người được mời vào dự án." onClose={busy ? () => undefined : onClose} footer={<HubAction compact title="Đóng" style={actionStyle} onPress={onClose} disabled={!!busy} />}>
    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap' }]}><Text style={requestStyles.muted}>{items.length} yêu cầu & lời mời</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><HubAction compact title="Mời" icon={compact ? undefined : 'invite'} style={actionStyle} disabled={!!busy || !canInviteProjectFriends(project)} onPress={onInvite} />{onRecruit && <HubAction compact title="Tuyển" icon={compact ? undefined : 'people'} style={actionStyle} variant="primary" disabled={!!busy} onPress={onRecruit} />}</View></View>
    {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 16 }]}>{error}</Text>}
    {loading ? <ActivityIndicator color={c.primary} /> : !items.length ? <View style={styles.empty}><HubIcon name="people" size={34} /><Text style={ui.muted}>Chưa có yêu cầu tham gia hoặc lời mời.</Text></View> : <View style={{ gap: 10 }}>{items.map(item => <View key={item.id} testID={`project-request-${item.id}`} style={requestStyles.card}>
      <View style={requestStyles.heading}><PersonAvatar person={item} size={34} /><View style={requestStyles.identity}><Text style={requestStyles.name}>{item.fullName}</Text><View style={requestStyles.details}><Text style={requestStyles.type}>{item.requestType === 0 ? 'Xin tham gia' : 'Được mời'}</Text>{!!item.role && <Text style={requestStyles.muted}>· {item.role}</Text>}</View></View><Text style={[requestStyles.status, item.status === 0 && requestStyles.pending, item.status === 1 && requestStyles.accepted]}>{['Đang chờ', 'Đã chấp nhận', 'Đã từ chối', 'Đã hủy', 'Hết hạn'][item.status]}</Text></View>
      {!!item.message && <View style={requestStyles.message}><Text style={requestStyles.messageText}>{item.message}</Text></View>}
      {item.status === 0 && <View style={requestStyles.actions}>{item.requestType === 0 ? <><HubAction compact style={actionStyle} title="Từ chối" disabled={!!busy} onPress={() => void decide(item, 'reject')} /><HubAction compact style={actionStyle} title="Chấp nhận" variant="primary" busy={busy === item.id} disabled={!!busy && busy !== item.id} onPress={() => void decide(item, 'accept')} /></> : <HubAction compact style={actionStyle} title="Hủy lời mời" disabled={!!busy} busy={busy === item.id} onPress={() => void decide(item, 'cancel')} />}</View>}
    </View>)}</View>}
  </HubModal>;
}
const requestStyles = StyleSheet.create({
  action: { minHeight: 30, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  card: { gap: 11, padding: 13, borderWidth: 1, borderColor: '#E2E8F4', borderRadius: 12, backgroundColor: '#FFFFFF' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: c.ink, fontSize: 13, fontWeight: '600', lineHeight: 19 }, details: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  type: { color: c.primary, fontSize: 11, lineHeight: 17 }, muted: { color: c.textSecondary, fontSize: 11, lineHeight: 17 },
  status: { flexShrink: 0, color: '#68778E', fontSize: 10, lineHeight: 16, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F1F4F9', borderRadius: 20 },
  pending: { color: '#92631A', backgroundColor: '#FFF5DF' }, accepted: { color: '#208056', backgroundColor: '#EAF7F0' },
  message: { backgroundColor: '#F7F9FD', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9 }, messageText: { color: '#52617E', fontSize: 12, lineHeight: 19 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 7 },
});
export function MemberRoleModal({ project, member, onSaved, onClose }: SavedProps & { member: HubMember }) {
  const [role, setRole] = useState(member.role), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmKick, setConfirmKick] = useState(false);
  async function save(kick = false) { if (!kick && !role.trim()) { setError('Nhập vai trò của thành viên.'); return; } setBusy(true); setError(''); try { onSaved(await projectHubService.updateMember(project.id, member.userId, kick ? { status: 1 } : { role: role.trim() })); onClose(); } catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); } }
  return <HubModal wide={false} title="Quản lý thành viên" subtitle={member.fullName} onClose={busy ? () => undefined : onClose} footer={<><HubAction title="Hủy" disabled={busy} onPress={onClose} /><HubAction title="Lưu thay đổi" variant="primary" busy={busy} onPress={() => void save()} /></>}><Field label="Vai trò trong dự án" value={role} onChange={setRole} maxLength={150} />{member.userId !== project.creator.id && <View style={{ gap: 10 }}><Text style={ui.muted}>{confirmKick ? 'Xác nhận kết thúc tư cách thành viên? Lịch sử tham gia vẫn được giữ.' : 'Có thể kết thúc tư cách thành viên khi họ không còn tham gia dự án.'}</Text><HubAction title={confirmKick ? 'Xác nhận loại khỏi dự án' : 'Loại khỏi dự án'} variant="danger" disabled={busy} onPress={() => confirmKick ? void save(true) : setConfirmKick(true)} /></View>}{!!error && <Text accessibilityRole="alert" style={[ui.error, { marginTop: 16 }]}>{error}</Text>}</HubModal>;
}
export { PersonAvatar } from './PersonAvatar';
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, notice: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.blueWash, padding: 16, borderRadius: 10, marginBottom: 24 }, person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.line, padding: 11, borderRadius: 10 }, position: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderWidth: 1, borderColor: c.line, borderRadius: 10 }, empty: { alignItems: 'center', gap: 15, paddingVertical: 42 }, request: { gap: 13, padding: 18, borderWidth: 1, borderColor: c.line, borderRadius: 12 }, name: { color: c.ink, fontSize: 15, fontWeight: '600' }, requestStatus: { color: c.textSecondary, fontSize: 12, backgroundColor: c.canvas, padding: 8, borderRadius: 8 } });
