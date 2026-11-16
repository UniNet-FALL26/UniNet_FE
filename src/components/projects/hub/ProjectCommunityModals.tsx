import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { projectHubService } from '@/services/project-hub.service';
import type { HubMember, HubPerson, HubPosition, HubProject, HubRequest } from '@/types/project-hub';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { Field, FormSection, lines, messageOf, technologies, validDate } from './ProjectHubFields';

const position = (): HubPosition => ({ id: `position-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, name: '', quantity: 1, technologies: [], skills: [], jobDescription: '', requirements: [], benefits: [] });
type SavedProps = { project: HubProject; onSaved: (value: HubProject) => void; onClose: () => void };
export function RecruitmentModal({ project, onSaved, onClose }: SavedProps) {
  const existing = project.recruitment;
  const [description, setDescription] = useState(existing?.description ?? '');
  const [positions, setPositions] = useState<HubPosition[]>(existing?.positions.length ? existing.positions : [position()]);
  const [raw, setRaw] = useState<Record<string, Partial<Record<'technologies' | 'skills' | 'requirements' | 'benefits', string>>>>({});
  const [deadline, setDeadline] = useState(existing?.deadline?.slice(0, 10) ?? '');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  function patch(index: number, value: Partial<HubPosition>) { setPositions(old => old.map((item, i) => i === index ? { ...item, ...value } : item)); }
  function listText(item: HubPosition, key: 'technologies' | 'skills' | 'requirements' | 'benefits') { return raw[item.id]?.[key] ?? item[key].join(key === 'technologies' || key === 'skills' ? ', ' : '\n'); }
  function changeList(index: number, key: 'technologies' | 'skills' | 'requirements' | 'benefits', value: string) {
    const item = positions[index];
    setRaw(old => ({ ...old, [item.id]: { ...old[item.id], [key]: value } }));
    patch(index, { [key]: key === 'technologies' || key === 'skills' ? technologies(value) : lines(value) });
  }
  async function save(status: 0 | 1 | 2) {
    setError('');
    if (positions.some(item => !item.name.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) { setError('Mỗi vị trí cần có tên và số lượng tuyển từ 1 đến 100.'); return; }
    if (!validDate(deadline)) { setError('Hạn tuyển cần có dạng YYYY-MM-DD.'); return; }
    const end = deadline ? new Date(`${deadline}T23:59:59+07:00`).toISOString() : null;
    if (status === 1 && end && Date.parse(end) <= Date.now()) { setError('Hạn tuyển phải nằm trong tương lai.'); return; }
    setBusy(true);
    try { const saved = await projectHubService.saveRecruitment(project.id, { description: description.trim() || null, positions: positions.map(item => ({ ...item, name: item.name.trim() })), deadline: end, status }); onSaved(saved); onClose(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  return <HubModal title={project.mode === 'community' ? 'Quản lý tuyển thành viên' : 'Mở dự án cộng đồng'} subtitle="Tạo các vị trí rõ ràng để tìm những người đồng hành phù hợp." onClose={busy ? () => undefined : onClose} footer={<><HubAction title="Hủy" onPress={onClose} disabled={busy} />{existing && <HubAction title="Đóng tuyển" onPress={() => void save(2)} disabled={busy} />}<HubAction title="Lưu nháp" onPress={() => void save(0)} disabled={busy} /><HubAction title="Đăng tuyển" variant="primary" onPress={() => void save(1)} busy={busy} disabled={project.status === 2} /></>}>
    <View style={styles.notice}><HubIcon name="people" /><Text style={[ui.muted, { flex: 1 }]}>Đăng tuyển sẽ mở dự án cộng đồng và cho phép người dùng khác tìm thấy thông tin tuyển thành viên.</Text></View>
    <Field label="Giới thiệu tuyển thành viên" value={description} onChange={setDescription} multiline maxLength={4000} />
    <Field label="Hạn tuyển" value={deadline} onChange={setDeadline} placeholder="YYYY-MM-DD" hint="Để trống nếu chưa xác định hạn tuyển." />
    {positions.map((item, i) => <FormSection key={item.id} title={`Vị trí ${i + 1}`} icon="person">
      <View style={styles.row}><View style={{ flex: 1 }}><Field label={`Tên vị trí ${i + 1} *`} value={item.name} onChange={name => patch(i, { name })} maxLength={150} placeholder="Ví dụ: Backend Developer" /></View><View style={{ width: 100 }}><Field label="Số lượng *" value={String(item.quantity || '')} onChange={quantity => patch(i, { quantity: Number(quantity) })} maxLength={3} /></View></View>
      <Field label={`Mô tả công việc — vị trí ${i + 1}`} value={item.jobDescription} onChange={jobDescription => patch(i, { jobDescription })} multiline />
      <Field label={`Công nghệ — vị trí ${i + 1}`} value={listText(item, 'technologies')} onChange={value => changeList(i, 'technologies', value)} placeholder="ASP.NET Core, PostgreSQL…" />
      <Field label={`Kỹ năng — vị trí ${i + 1}`} value={listText(item, 'skills')} onChange={value => changeList(i, 'skills', value)} placeholder="REST API, Git…" />
      <Field label={`Yêu cầu bổ sung — vị trí ${i + 1}`} value={listText(item, 'requirements')} onChange={value => changeList(i, 'requirements', value)} multiline hint="Mỗi yêu cầu trên một dòng." />
      <Field label={`Quyền lợi — vị trí ${i + 1}`} value={listText(item, 'benefits')} onChange={value => changeList(i, 'benefits', value)} multiline hint="Mỗi quyền lợi trên một dòng." />
      {positions.length > 1 && <HubAction title={`Gỡ vị trí ${i + 1}`} icon="trash" variant="danger" onPress={() => setPositions(old => old.filter((_, index) => index !== i))} />}
    </FormSection>)}
    <View style={{ marginVertical: 20 }}><HubAction title="Thêm vị trí tuyển" icon="plus" disabled={positions.length >= 20} onPress={() => setPositions(old => [...old, position()])} /></View>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}

export function InviteMemberModal({ project, onClose, onInvited }: { project: HubProject; onClose: () => void; onInvited: () => void }) {
  const [query, setQuery] = useState(''), [people, setPeople] = useState<HubPerson[]>([]), [person, setPerson] = useState<HubPerson | null>(null);
  const [positionId, setPositionId] = useState(project.recruitment?.positions[0]?.id ?? ''), [role, setRole] = useState(''), [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length < 2) { setPeople([]); setSearching(false); return () => controller.abort(); }
    setSearching(true);
    const timer = setTimeout(() => { projectHubService.people(query.trim(), controller.signal).then(result => { if (!controller.signal.aborted) setPeople(result.items.filter(item => item.id !== project.creator.id && !project.members.some(member => member.userId === item.id && member.status === 0))); }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setSearching(false); }); }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, project.creator.id, project.members]);
  async function invite() {
    if (!person) { setError('Chọn người bạn muốn mời.'); return; }
    if (!positionId && !role.trim()) { setError('Nhập vai trò hoặc chọn vị trí muốn mời.'); return; }
    setBusy(true); setError('');
    try { await projectHubService.sendRequest(project.id, { requestType: 1, invitedUserId: person.id, positionId: positionId || undefined, role: role.trim() || undefined, message: message.trim() || undefined }); onInvited(); onClose(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  }
  return <HubModal wide={false} title="Mời thành viên" subtitle={`Tìm người đồng hành cho ${project.title}.`} onClose={busy ? () => undefined : onClose} footer={<><HubAction title="Hủy" disabled={busy} onPress={onClose} /><HubAction title="Gửi lời mời" icon="invite" variant="primary" busy={busy} onPress={() => void invite()} /></>}>
    <Field label="Tìm kiếm người dùng" value={query} onChange={text => { setQuery(text); setPerson(null); }} placeholder="Nhập ít nhất 2 ký tự trong tên…" />
    {searching && <ActivityIndicator color={c.primary} />}
    <View style={{ gap: 8, marginBottom: 20 }}>{people.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: person?.id === item.id }} onPress={() => setPerson(item)} style={[styles.person, person?.id === item.id && { borderColor: c.primary, backgroundColor: c.blueWash }]}><PersonAvatar person={item} /><Text style={{ color: c.ink, flex: 1, fontWeight: '500' }}>{item.fullName}</Text>{person?.id === item.id && <HubIcon name="check" />}</Pressable>)}{!searching && query.trim().length >= 2 && !people.length && <Text style={ui.muted}>Không có người dùng phù hợp để mời.</Text>}</View>
    <PositionChoices project={project} selected={positionId} onSelect={setPositionId} />
    {!project.recruitment?.positions.length && <Field label="Vai trò được mời *" value={role} onChange={setRole} maxLength={150} />}
    <Field label="Lời nhắn" value={message} onChange={setMessage} multiline maxLength={2000} placeholder="Chia sẻ đôi điều về dự án và vai trò bạn muốn mời…" />
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubModal>;
}
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
export function ProjectRequestsModal({ project, onClose, onChanged }: { project: HubProject; onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<HubRequest[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState('');
  const [tab, setTab] = useState<0 | 1>(0);
  useEffect(() => { const controller = new AbortController(); projectHubService.requests(project.id, controller.signal).then(result => { if (!controller.signal.aborted) setItems(result.items); }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [project.id]);
  async function decide(item: HubRequest, decision: 'accept' | 'reject' | 'cancel') {
    setBusy(item.id); setError('');
    try { const saved = await projectHubService.decide(item.id, decision); setItems(old => old.map(row => row.id === saved.id ? saved : row)); onChanged(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(''); }
  }
  const visible = items.filter(item => item.requestType === tab);
  return <HubModal title="Quản lý yêu cầu tham gia" subtitle={project.title} onClose={busy ? () => undefined : onClose} footer={<HubAction title="Đóng" onPress={onClose} disabled={!!busy} />}>
    <View style={[styles.row, { marginBottom: 24 }]}>{([{ value: 0, label: 'Đơn ứng tuyển' }, { value: 1, label: 'Lời mời đã gửi' }] as const).map(item => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: tab === item.value }} onPress={() => setTab(item.value)} style={[styles.tab, tab === item.value && { backgroundColor: c.blueWash, borderColor: c.primary }]}><Text style={{ color: tab === item.value ? c.primary : c.textSecondary, fontWeight: '600' }}>{item.label} ({items.filter(row => row.requestType === item.value).length})</Text></Pressable>)}</View>
    {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 16 }]}>{error}</Text>}
    {loading ? <ActivityIndicator color={c.primary} /> : !visible.length ? <View style={styles.empty}><HubIcon name="people" size={34} /><Text style={ui.muted}>{tab === 0 ? 'Chưa có đơn ứng tuyển.' : 'Bạn chưa gửi lời mời nào.'}</Text></View> : <View style={{ gap: 12 }}>{visible.map(item => <View key={item.id} style={styles.request}>
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
export function PersonAvatar({ person, size = 40 }: { person: Pick<HubPerson, 'fullName' | 'avatarUrl'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.avatarUrl]);
  return person.avatarUrl && !failed ? <Image source={{ uri: person.avatarUrl }} accessibilityLabel={person.fullName} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: size / 2 }} /> : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.blueWash, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.primary, fontWeight: '600' }}>{person.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase()}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, notice: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.blueWash, padding: 16, borderRadius: 10, marginBottom: 24 }, person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.line, padding: 11, borderRadius: 10 }, position: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderWidth: 1, borderColor: c.line, borderRadius: 10 }, tab: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 9, borderWidth: 1, borderColor: c.line }, empty: { alignItems: 'center', gap: 15, paddingVertical: 42 }, request: { gap: 13, padding: 18, borderWidth: 1, borderColor: c.line, borderRadius: 12 }, name: { color: c.ink, fontSize: 15, fontWeight: '600' }, requestStatus: { color: c.textSecondary, fontSize: 12, backgroundColor: c.canvas, padding: 8, borderRadius: 8 } });
