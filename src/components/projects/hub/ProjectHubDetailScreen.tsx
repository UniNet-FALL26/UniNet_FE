import { useCallback, useState, type ReactNode } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { projectHubService } from '@/services/project-hub.service';
import { useAuthStore } from '@/store/auth.store';
import type { HubFile, HubMember, HubProject } from '@/types/project-hub';
import { HubAction, HubIcon, HubModal, HubPanel, HubStatus, HubTags, ProjectCover, hubColors as c, ui, type HubIconName } from './ProjectHubUI';
import { BulletList, messageOf, openProjectUrl } from './ProjectHubFields';
import { EditProjectModal } from './EditProjectModal';
import { ApplyProjectModal, InviteMemberModal, MemberRoleModal, PersonalReviewModal, PersonAvatar, ProjectRequestsModal, RecruitmentModal } from './ProjectCommunityModals';

type Tab = 'overview' | 'members' | 'documents' | 'media';
type ModalKind = 'edit' | 'community' | 'invite' | 'requests' | 'review' | 'apply' | 'complete' | 'delete' | 'leave' | null;
const date = (value: string | null) => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('vi-VN') : 'Chưa cập nhật';
const overviewTabs: { id: Tab; label: string; icon: HubIconName }[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'folder' }, { id: 'members', label: 'Thành viên', icon: 'people' },
  { id: 'documents', label: 'Tài liệu', icon: 'document' }, { id: 'media', label: 'Hình ảnh & Video demo', icon: 'image' },
];
export function ProjectHubDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { account } = useAuthStore();
  const [project, setProject] = useState<HubProject | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0), [tab, setTab] = useState<Tab>('overview'), [modal, setModal] = useState<ModalKind>(null);
  const [member, setMember] = useState<HubMember | null>(null), [more, setMore] = useState(false), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [mutationError, setMutationError] = useState('');
  const { width } = useWindowDimensions(); const compact = width < 800; const columns = width >= 1050;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setProject(null); setError(''); setTab('overview');
    if (!projectId) { setLoading(false); setError('Không tìm thấy mã dự án.'); return () => controller.abort(); }
    projectHubService.get(projectId, controller.signal).then(value => { if (!controller.signal.aborted) setProject(value); }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, account?.id, attempt]));
  const closeModal = useCallback(() => { setModal(null); setMutationError(''); }, []);
  const closeMember = useCallback(() => setMember(null), []);
  const saved = useCallback((value: HubProject) => { setProject(value); setNotice('Đã lưu thay đổi.'); }, []);
  const refresh = useCallback(() => { if (projectId) void projectHubService.get(projectId).then(setProject).catch(cause => setError(messageOf(cause))); }, [projectId]);
  function show(value: ModalKind) { setMore(false); setMutationError(''); setModal(value); }
  async function share() {
    if (!project) return;
    try {
      if (Platform.OS === 'web') { const url = `${window.location.origin}/group/${encodeURIComponent(project.id)}`; await navigator.clipboard.writeText(url); setNotice('Đã sao chép liên kết dự án.'); }
      else await Share.share({ title: project.title, message: `${project.title}\n${project.description}` });
    } catch { setNotice('Chưa thể chia sẻ liên kết. Bạn có thể sao chép địa chỉ trên trình duyệt.'); }
  }
  async function confirm() {
    if (!project) return; setBusy(true); setMutationError('');
    try {
      if (modal === 'delete') { await projectHubService.remove(project.id); router.replace('/profile/projects' as never); return; }
      if (modal === 'complete') { saved(await projectHubService.complete(project.id)); closeModal(); return; }
      if (modal === 'leave' && account?.profile?.id) { saved(await projectHubService.updateMember(project.id, account.profile.id, { status: 2 })); closeModal(); }
    } catch (cause) { setMutationError(messageOf(cause)); } finally { setBusy(false); }
  }
  if (loading) return <View style={styles.state}><ActivityIndicator color={c.primary} accessibilityLabel="Đang tải dự án" /><Text style={ui.muted}>Đang tải thông tin dự án…</Text></View>;
  if (error || !project) return <View style={styles.state}><HubIcon name="folder" size={38} /><Text accessibilityRole="alert" style={ui.error}>{error || 'Dự án không còn khả dụng.'}</Text><HubAction title="Thử lại" onPress={() => setAttempt(value => value + 1)} /><HubAction title="Về dự án của tôi" variant="quiet" onPress={() => router.replace('/profile/projects' as never)} /></View>;
  const community = project.mode === 'community'; const activeMembers = project.members.filter(item => item.status === 0);
  const canOpenCommunity = project.isOwner && project.origin === 0 && project.status !== 2 && project.status !== 3;
  const tabs = overviewTabs.filter(item => item.id !== 'members' || community);
  const actions = <View style={styles.toolbarActions}>
      {project.isOwner && community && project.status !== 2 && <HubAction title="Mời thành viên" icon="invite" variant="primary" onPress={() => show('invite')} />}
      {project.isOwner && <HubAction title="Chỉnh sửa" icon="edit" onPress={() => show('edit')} />}
      {canOpenCommunity && !community && <HubAction title="Mở dự án cộng đồng" icon="people" variant="primary" onPress={() => show('community')} />}
      {!project.isOwner && !project.isMember && project.recruitment?.status === 1 && <HubAction title="Ứng tuyển tham gia" icon="people" variant="primary" onPress={() => show('apply')} />}
      <HubAction title="Chia sẻ" icon="share" variant="quiet" onPress={() => void share()} />
      {(project.isOwner || project.isMember) && <Pressable accessibilityLabel="Thao tác dự án" accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore(value => !value)} style={[ui.iconButton, { borderWidth: 1, borderColor: c.line, backgroundColor: '#FFFFFF' }]}><HubIcon name="more" color={c.textSecondary} /></Pressable>}
    </View>;
  return <View style={styles.screen}><DetailNavigation title={project.title} crumbs={[{ label: 'Hồ sơ', href: '/(tabs)/profile' }, { label: 'Dự án', href: '/profile/projects' }, { label: project.title }]} fallback="/profile/projects" /><ScrollView contentContainerStyle={[styles.page, compact && styles.compactPage]} showsVerticalScrollIndicator={false}>
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <ProjectCover url={project.logoUrl} title={project.title} height={190} style={[styles.heroCover, compact && { width: '100%', height: 210 }]} />
      <View style={styles.heroContent}><View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}><View style={[styles.titleRow, { flex: 1, minWidth: 0 }]}><Text accessibilityRole="header" style={[styles.title, compact && { fontSize: 26 }]}>{project.title}</Text><View style={[styles.mode, community && { backgroundColor: c.primary }]}><HubIcon name={community ? 'people' : 'person'} size={16} color={community ? '#FFFFFF' : c.primary} /><Text style={{ color: community ? '#FFFFFF' : c.primary, fontWeight: '600', fontSize: 12 }}>{community ? 'Dự án cộng đồng' : 'Dự án cá nhân'}</Text></View></View>{width >= 1300 && actions}</View>
        <Text style={styles.description}>{project.description}</Text><HubTags values={project.technologies} />
        <View style={styles.dates}><View style={styles.date}><HubIcon name="calendar" size={17} color={c.textSecondary} /><Text style={styles.dateText}>Bắt đầu: {date(project.details.startDate)}</Text></View><View style={styles.date}><HubIcon name="calendar" size={17} color={c.textSecondary} /><Text style={styles.dateText}>{project.status === 2 ? 'Hoàn thành' : 'Dự kiến kết thúc'}: {date(project.details.endDate)}</Text></View><HubStatus status={project.status} /></View>
      </View>
    </View>
    {width < 1300 && <View style={styles.toolbar}>{actions}</View>}
    {more && <View style={styles.moreMenu}>{project.isOwner && community && <HubAction title="Quản lý tuyển thành viên" icon="people" variant="quiet" onPress={() => show('community')} />}{project.isOwner && community && <HubAction title="Quản lý đơn và lời mời" icon="document" variant="quiet" onPress={() => show('requests')} />}{(project.isOwner || project.isMember) && <HubAction title="Tổng kết cá nhân" icon="book" variant="quiet" onPress={() => show('review')} />}{project.isOwner && project.status !== 2 && project.status !== 3 && <HubAction title="Hoàn thành dự án" icon="check" variant="quiet" onPress={() => show('complete')} />}{project.isOwner ? <HubAction title="Xóa dự án" icon="trash" variant="danger" onPress={() => show('delete')} /> : <HubAction title="Rời dự án" variant="danger" onPress={() => show('leave')} />}</View>}
    {!!notice && <View role="status" accessibilityLiveRegion="polite" style={styles.notice}><Text style={{ color: c.primary, fontSize: 13, flex: 1 }}>{notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={() => setNotice('')} style={ui.iconButton}><HubIcon name="close" size={17} /></Pressable></View>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}><HubIcon name={item.icon} color={tab === item.id ? c.primary : c.textSecondary} size={19} /><Text style={{ color: tab === item.id ? c.primary : c.ink, fontSize: 14, fontWeight: tab === item.id ? '600' : '500' }}>{item.label}{item.id === 'members' ? ` (${activeMembers.length})` : ''}</Text></Pressable>)}</ScrollView>
    <View style={[styles.content, !columns && { flexDirection: 'column' }]}><View style={{ flex: 1, minWidth: 0, gap: 20 }}>
      {tab === 'overview' && <ProjectOverview project={project} onReview={() => show('review')} />}
      {tab === 'documents' && <ResourcesPanel project={project} kind="documents" onEdit={() => show('edit')} />}
      {tab === 'media' && <ResourcesPanel project={project} kind="media" onEdit={() => show('edit')} />}
      {tab === 'members' && <HubPanel title={`Thành viên dự án (${activeMembers.length})`} icon="people">
        {project.isOwner && <View style={[styles.toolbarActions, { marginBottom: 7 }]}><HubAction title="Mời thành viên" icon="invite" variant="primary" disabled={project.status === 2} onPress={() => show('invite')} /><HubAction title="Đơn ứng tuyển & lời mời" icon="document" onPress={() => show('requests')} /></View>}
        {!project.members.length ? <Text style={ui.muted}>Dự án chưa có thành viên khác.</Text> : project.members.map(item => <View key={item.id} style={styles.member}><PersonAvatar person={item} /><View style={{ flex: 1 }}><Text style={styles.name}>{item.fullName}</Text><Text style={ui.muted}>{item.role}{item.status === 1 ? ' · Đã kết thúc tham gia' : item.status === 2 ? ' · Đã rời dự án' : ''}</Text></View>{project.isOwner && item.userId !== project.creator.id && item.status === 0 && <HubAction title="Quản lý" variant="quiet" onPress={() => setMember(item)} />}</View>)}
      </HubPanel>}
    </View><View style={[styles.sidebar, !columns && { width: '100%' }]}>
      <HubPanel title="Thông tin dự án" icon="info"><InfoRow icon="person" label="Chủ dự án"><View style={styles.creator}><PersonAvatar person={project.creator} size={25} /><Text style={[styles.infoValue, { flexShrink: 1 }]}>{project.creator.fullName}</Text></View></InfoRow><InfoRow icon={community ? 'people' : 'person'} label="Loại dự án"><Text style={[styles.infoValue, { color: c.primary }]}>{community ? 'Dự án cộng đồng' : 'Dự án cá nhân'}</Text></InfoRow><InfoRow icon="external" label="Nguồn dự án"><Text style={styles.infoValue}>{project.origin === 1 ? 'Bên ngoài UniNet' : 'Trên UniNet'}</Text></InfoRow><InfoRow icon="calendar" label="Ngày bắt đầu"><Text style={styles.infoValue}>{date(project.details.startDate)}</Text></InfoRow><InfoRow icon="calendar" label={project.status === 2 ? 'Ngày hoàn thành' : 'Dự kiến kết thúc'}><Text style={styles.infoValue}>{date(project.details.endDate)}</Text></InfoRow>{community && <InfoRow icon="people" label="Thành viên"><Text style={styles.infoValue}>{activeMembers.length} thành viên</Text></InfoRow>}<InfoRow icon="info" label="Trạng thái"><HubStatus status={project.status} /></InfoRow></HubPanel>
      <HubPanel title="Công nghệ sử dụng" icon="layers">{project.technologies.length ? <HubTags values={project.technologies} /> : <Text style={ui.muted}>Chưa bổ sung công nghệ.</Text>}</HubPanel>
      <HubPanel title="Liên kết" icon="link">{project.details.links.length ? project.details.links.map((link, i) => <Pressable key={i} accessibilityRole="link" onPress={() => openProjectUrl(link.url)} style={styles.link}><HubIcon name="link" size={19} color={c.ink} /><Text numberOfLines={1} style={[styles.infoValue, { flex: 1 }]}>{link.label}</Text><HubIcon name="external" size={16} color={c.textSecondary} /></Pressable>) : <Text style={ui.muted}>Chưa có liên kết dự án.</Text>}</HubPanel>
      {community && project.recruitment && <HubPanel title="Tuyển thành viên" icon="people"><Text style={ui.muted}>{project.recruitment.status === 1 ? 'Đang mở tuyển thành viên' : project.recruitment.status === 2 ? 'Đã đóng tuyển thành viên' : 'Bản nháp tuyển thành viên'}</Text>{!!project.recruitment.description && <Text style={ui.muted}>{project.recruitment.description}</Text>}{project.recruitment.positions.map(item => <View key={item.id} style={styles.positionRow}><Text style={styles.infoValue}>{item.name}</Text><Text style={ui.muted}>{item.quantity} vị trí</Text></View>)}{project.recruitment.deadline && <Text style={ui.muted}>Hạn tuyển: {date(project.recruitment.deadline)}</Text>}{canOpenCommunity && <HubAction title="Quản lý tuyển dụng" icon="edit" onPress={() => show('community')} />}</HubPanel>}
    </View></View>
  </ScrollView>
    {modal === 'edit' && <EditProjectModal project={project} onSaved={saved} onClose={closeModal} />}
    {modal === 'community' && <RecruitmentModal project={project} onSaved={saved} onClose={closeModal} />}
    {modal === 'invite' && <InviteMemberModal project={project} onClose={closeModal} onInvited={() => setNotice('Đã gửi lời mời tham gia dự án.')} />}
    {modal === 'apply' && <ApplyProjectModal project={project} onClose={closeModal} onApplied={() => setNotice('Đã gửi đơn ứng tuyển. Chủ dự án sẽ xem xét yêu cầu của bạn.')} />}
    {modal === 'requests' && <ProjectRequestsModal project={project} onClose={closeModal} onChanged={refresh} />}
    {modal === 'review' && <PersonalReviewModal project={project} onSaved={saved} onClose={closeModal} />}
    {member && <MemberRoleModal project={project} member={member} onSaved={saved} onClose={closeMember} />}
    {(modal === 'complete' || modal === 'delete' || modal === 'leave') && <HubModal wide={false} title={modal === 'delete' ? 'Xóa dự án?' : modal === 'leave' ? 'Rời dự án?' : 'Hoàn thành dự án?'} onClose={busy ? () => undefined : closeModal} footer={<><HubAction title="Hủy" onPress={closeModal} disabled={busy} /><HubAction title={modal === 'delete' ? 'Xóa dự án' : modal === 'leave' ? 'Xác nhận rời dự án' : 'Xác nhận hoàn thành'} variant={modal === 'complete' ? 'primary' : 'danger'} busy={busy} onPress={() => void confirm()} /></>}><Text style={styles.description}>{modal === 'delete' ? `Bạn đang xóa “${project.title}”. Dự án có lịch sử nghiệp vụ liên quan có thể không được phép xóa.` : modal === 'leave' ? 'Bạn sẽ không còn là thành viên hoạt động của dự án. Lịch sử tham gia vẫn được giữ.' : 'Dự án sẽ chuyển sang trạng thái hoàn thành và đóng tuyển thành viên.'}</Text>{!!mutationError && <Text accessibilityRole="alert" style={ui.error}>{mutationError}</Text>}</HubModal>}
  </View>;
}

function ProjectOverview({ project, onReview }: { project: HubProject; onReview: () => void }) {
  const { details } = project; const results = details.results;
  const canReview = project.isOwner || project.isMember;
  return <HubPanel style={{ gap: 0 }}>
    <OverviewSection title="Giới thiệu dự án" icon="book"><Text style={styles.description}>{details.description || (project.isOwner ? 'Bổ sung phần giới thiệu chi tiết để chia sẻ câu chuyện và định hướng dự án.' : 'Dự án chưa bổ sung phần giới thiệu chi tiết.')}</Text></OverviewSection>
    <OverviewSection title="Vấn đề & Giải pháp" icon="target"><View style={styles.tiles}><View style={[styles.tile, { backgroundColor: '#FFF2F2' }]}><View style={styles.tileHeading}><HubIcon name="target" color="#D64A4A" /><Text style={[styles.tileTitle, { color: '#BA3030' }]}>Vấn đề</Text></View><Text style={styles.description}>{results.problem || 'Chưa bổ sung thông tin.'}</Text></View><View style={[styles.tile, { backgroundColor: '#ECF8EF' }]}><View style={styles.tileHeading}><HubIcon name="bulb" color="#188C42" /><Text style={[styles.tileTitle, { color: '#188C42' }]}>Giải pháp</Text></View><Text style={styles.description}>{results.solution || 'Chưa bổ sung thông tin.'}</Text></View></View></OverviewSection>
    <OverviewSection title="Mục tiêu dự án" icon="flag"><BulletList values={results.objectives ?? []} /></OverviewSection>
    <OverviewSection title="Chức năng chính" icon="layers"><BulletList values={details.features} check /></OverviewSection>
    <OverviewSection title={project.status === 2 ? 'Kết quả & Bài học' : 'Kết quả mong đợi'} icon="trophy" last>
      {project.status === 2 ? <View style={styles.tiles}><View style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name="check" color={c.success} /><Text style={[styles.tileTitle, { color: c.success }]}>Kết quả đạt được</Text></View><BulletList values={results.achievements ?? []} /></View>{canReview && <><View style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name="warning" color={c.warning} /><Text style={styles.tileTitle}>Khó khăn của tôi</Text></View><Text style={styles.description}>{project.myReview?.challenges || 'Chưa có tổng kết cá nhân.'}</Text></View><View style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name="book" /><Text style={styles.tileTitle}>Bài học kinh nghiệm</Text></View><Text style={styles.description}>{project.myReview?.lessonsLearned || 'Ghi lại những điều bạn học được từ dự án.'}</Text></View></>}</View> : <View style={styles.tiles}>{[{ icon: 'target' as const, title: 'Sản phẩm', value: results.expectedProduct }, { icon: 'trophy' as const, title: 'Giá trị', value: results.expectedValue }, { icon: 'people' as const, title: 'Phát triển', value: results.expectedGrowth }].map(item => <View key={item.title} style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name={item.icon} /><Text style={styles.tileTitle}>{item.title}</Text></View><Text style={styles.description}>{item.value || 'Chưa bổ sung thông tin.'}</Text></View>)}</View>}
      {canReview && <View style={{ alignSelf: 'flex-start', marginTop: 15 }}><HubAction title={project.myReview ? 'Chỉnh sửa tổng kết cá nhân' : 'Viết tổng kết cá nhân'} icon="edit" variant="quiet" onPress={onReview} /></View>}
    </OverviewSection>
  </HubPanel>;
}
function OverviewSection({ title, icon, children, last }: { title: string; icon: HubIconName; children: ReactNode; last?: boolean }) {
  return <View style={[styles.overviewSection, !last && { borderBottomWidth: 1, borderColor: c.line }]}><View style={styles.sectionHeading}><HubIcon name={icon} size={23} /><Text accessibilityRole="header" aria-level={2} style={ui.heading}>{title}</Text></View><View style={{ paddingLeft: 33 }}>{children}</View></View>;
}
function InfoRow({ label, icon, children }: { label: string; icon: HubIconName; children: ReactNode }) { return <View style={styles.infoRow}><HubIcon name={icon} size={17} color={c.textSecondary} /><Text style={styles.infoLabel}>{label}</Text><View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View></View>; }
function ResourcesPanel({ project, kind, onEdit }: { project: HubProject; kind: 'documents' | 'media'; onEdit: () => void }) {
  const files = project.details[kind]; const media = kind === 'media';
  return <HubPanel title={media ? 'Hình ảnh & Video demo' : 'Tài liệu dự án'} icon={media ? 'image' : 'document'}>{!files.length ? <View style={styles.resourceEmpty}><HubIcon name={media ? 'image' : 'document'} size={38} /><Text style={ui.muted}>{media ? 'Chưa có hình ảnh hoặc video demo.' : 'Chưa có tài liệu được chia sẻ.'}</Text>{project.isOwner && <HubAction title={media ? 'Thêm hình ảnh / video' : 'Thêm tài liệu'} icon="plus" onPress={onEdit} />}</View> : <View style={media ? styles.mediaGrid : { gap: 10 }}>{files.map((file, i) => <Resource key={`${file.url}-${i}`} file={file} media={media} />)}</View>}</HubPanel>;
}
function Resource({ file, media }: { file: HubFile; media: boolean }) { return <Pressable accessibilityRole="link" accessibilityLabel={`Mở ${file.name}`} onPress={() => openProjectUrl(file.url)} style={media ? styles.media : styles.document}>{media ? <>{file.type === 'image' ? <Image source={{ uri: file.url }} style={styles.mediaImage} resizeMode="cover" /> : <View style={[styles.mediaImage, { backgroundColor: c.blueWash, justifyContent: 'center', alignItems: 'center' }]}><HubIcon name="play" size={38} /></View>}<View style={styles.mediaLabel}><Text numberOfLines={2} style={[styles.infoValue, { flex: 1 }]}>{file.name}</Text><HubIcon name="external" size={15} /></View></> : <><HubIcon name="document" size={24} /><Text style={[styles.infoValue, { flex: 1 }]}>{file.name}</Text><HubIcon name="external" size={17} /></>}</Pressable>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas }, page: { width: '100%', maxWidth: 1480, alignSelf: 'center', padding: 30, paddingBottom: 55 }, compactPage: { padding: 16, paddingBottom: 35 },
  state: { flex: 1, minHeight: 320, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: c.canvas }, breadcrumb: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 24 }, breadcrumbLink: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 30 }, breadcrumbText: { color: c.ink, fontSize: 13 },
  hero: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }, heroCompact: { flexDirection: 'column', gap: 18 }, heroCover: { width: 330, borderRadius: 12 }, heroContent: { flex: 1, minWidth: 0, gap: 14, paddingTop: 3 }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' }, title: { fontSize: 29, fontWeight: '700', color: c.ink, flexShrink: 1 }, mode: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, flexDirection: 'row', gap: 6, backgroundColor: c.blueWash, alignItems: 'center' }, description: { color: c.ink, fontSize: 14, lineHeight: 23 }, dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginTop: 3 }, date: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dateText: { fontSize: 12, color: c.ink },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 18 }, toolbarActions: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', alignItems: 'center' }, moreMenu: { alignSelf: 'flex-end', padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: '#FFFFFF', gap: 5, marginBottom: 15 }, notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.blueWash, paddingLeft: 16, borderRadius: 9, marginBottom: 14 },
  tabs: { minWidth: '100%', borderBottomWidth: 1, borderColor: c.line, marginBottom: 22 }, tab: { minHeight: 53, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 3, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: c.primary }, content: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }, sidebar: { width: 340, gap: 18 },
  overviewSection: { paddingVertical: 20, gap: 12 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, tile: { flex: 1, minWidth: 180, padding: 16, gap: 8, borderRadius: 11 }, resultTile: { minWidth: 170, backgroundColor: '#F3F6FC' }, tileHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 }, tileTitle: { color: c.primary, fontSize: 14, fontWeight: '600', flexShrink: 1 }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderBottomWidth: 1, borderColor: '#F0F3F8' }, infoLabel: { color: c.ink, fontSize: 12, width: 103 }, infoValue: { color: c.ink, fontSize: 13, lineHeight: 20 }, creator: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'flex-end' }, link: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 42, borderBottomWidth: 1, borderColor: '#F0F3F8' }, positionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: c.line }, name: { color: c.ink, fontSize: 15, fontWeight: '600' }, resourceEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, gap: 19 }, document: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 18, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: 10 }, mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, media: { flexGrow: 1, flexBasis: 240, maxWidth: 480, borderRadius: 11, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }, mediaImage: { width: '100%', height: 180 }, mediaLabel: { flexDirection: 'row', padding: 13, gap: 10, alignItems: 'center' },
});
