import { useCallback, useRef, useState, type ReactNode } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DetailNavigation } from '@/components/navigation/DetailNavigation';
import { projectHubService } from '@/services/project-hub.service';
import { formatProjectUpdatedAt } from '@/utils/project-updated-at';
import { projectDisplayMembers } from '@/utils/project-members';
import { useAuthStore } from '@/store/auth.store';
import type { HubFile, HubMember, HubProject } from '@/types/project-hub';
import { HubAction, HubIcon, HubModal, HubPanel, HubStatus, ProjectCover, hubColors as c, ui, type HubIconName } from './ProjectHubUI';
import { BulletList, messageOf, openProjectUrl } from './ProjectHubFields';
import { ProjectOverviewModal } from './ProjectOverviewModal';
import { ProjectOverviewHelp } from './ProjectOverviewHelp';
import { overviewGuides, type OverviewGuideId } from '@/utils/project-overview-content';
import { ProjectReceivedInvitation } from './ProjectReceivedInvitation';
import { ProjectSettingsPanel } from './ProjectSettingsPanel';
import { ProjectSummaryModal } from './ProjectSummaryModal';
import { ProjectLinksModal } from './ProjectLinksModal';
import { ProjectLinkIcon } from './ProjectLinkIcon';
import { ProjectVerificationCard } from './ProjectVerificationCard';
import { pickProjectAsset, releaseProjectImage, selectProjectImage, type ProjectImageAsset } from '@/utils/project-hub-files';
import { PersonalReviewModal } from './PersonalReviewModal';
import { ProjectPencilButton } from './ProjectPencilButton';
import { ProjectTechnologiesCard } from './ProjectTechnologiesCard';
import { ProjectImagePreviewModal } from './ProjectImagePreviewModal';
import { ApplyProjectModal, InviteMemberModal, MemberRoleModal, PersonAvatar, ProjectRequestsModal, RecruitmentModal } from './ProjectCommunityModals';

type Tab = 'overview' | 'members' | 'documents' | 'media' | 'settings';
type ModalKind = 'links' | 'summary' | 'overview' | 'community' | 'invite' | 'requests' | 'review' | 'apply' | 'complete' | 'delete' | 'leave' | null;
const date = (value: string | null) => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('vi-VN') : 'Chưa cập nhật';
const overviewTabs: { id: Tab; label: string; icon: HubIconName }[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'folder' }, { id: 'members', label: 'Thành viên', icon: 'people' },
  { id: 'documents', label: 'Tài liệu', icon: 'document' }, { id: 'media', label: 'Hình ảnh & Video demo', icon: 'image' }, { id: 'settings', label: 'Cài đặt', icon: 'settings' },
];
export function ProjectHubDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { account } = useAuthStore();
  const [project, setProject] = useState<HubProject | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0), [tab, setTab] = useState<Tab>('overview'), [modal, setModal] = useState<ModalKind>(null);
  const [member, setMember] = useState<HubMember | null>(null), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [mutationError, setMutationError] = useState('');
  const [imageFile, setImageFile] = useState<ProjectImageAsset | null>(null), [pickingImage, setPickingImage] = useState(false), [imageError, setImageError] = useState('');
  const imageRequest = useRef(0), pickerLocked = useRef(false), resourceLocked = useRef(false);
  const [addingResource, setAddingResource] = useState<'documents' | 'media' | null>(null);
  const [resourceError, setResourceError] = useState<{ kind: 'documents' | 'media'; message: string } | null>(null);
  const { width } = useWindowDimensions(); const compact = width < 800; const columns = width >= 1050;
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setProject(null); setError(''); setTab('overview'); setImageFile(null); setImageError(''); setPickingImage(false); pickerLocked.current = false; setResourceError(null); setAddingResource(null); resourceLocked.current = false;
    if (!projectId) { setLoading(false); setError('Không tìm thấy mã dự án.'); return () => controller.abort(); }
    projectHubService.get(projectId, controller.signal).then(value => { if (!controller.signal.aborted) setProject(value); }).catch(cause => { if (!controller.signal.aborted) setError(messageOf(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); imageRequest.current++; };
  }, [projectId, account?.id, attempt]));
  const closeModal = useCallback(() => { setModal(null); setMutationError(''); }, []);
  const closeMember = useCallback(() => setMember(null), []);
  const saved = useCallback((value: HubProject) => { setProject(value); setNotice(''); }, []);
  const refresh = useCallback(() => { if (projectId) void projectHubService.get(projectId).then(setProject).catch(cause => setError(messageOf(cause))); }, [projectId]);
  function show(value: ModalKind) { setMutationError(''); setModal(value); }
  async function chooseCover() {
    if (!project?.isOwner || pickerLocked.current) return;
    const request = imageRequest.current; pickerLocked.current = true;
    setPickingImage(true); setImageError('');
    try { const file = await selectProjectImage(); if (file) { if (request === imageRequest.current) setImageFile(file); else releaseProjectImage(file); } }
    catch (cause) { if (request === imageRequest.current) setImageError(messageOf(cause)); }
    finally { if (request === imageRequest.current) { pickerLocked.current = false; setPickingImage(false); } }
  }
  async function addResource(kind: 'documents' | 'media') {
    if (!project?.isOwner || resourceLocked.current) return;
    const request = imageRequest.current;
    resourceLocked.current = true; setAddingResource(kind); setResourceError(null);
    try {
      const file = await pickProjectAsset(kind === 'documents' ? 'document' : 'media');
      if (file && request === imageRequest.current) {
        setProject(await projectHubService.update(project.id, { details: { ...project.details, [kind]: [...project.details[kind], file] } }));
      }
    } catch (cause) { if (request === imageRequest.current) setResourceError({ kind, message: messageOf(cause) }); }
    finally { if (request === imageRequest.current) { resourceLocked.current = false; setAddingResource(null); } }
  }
  async function confirm() {
    if (!project) return; setBusy(true); setMutationError('');
    try {
      if (modal === 'delete') { await projectHubService.remove(project.id); router.replace('/profile/projects' as never); return; }
      if (modal === 'complete') { saved(await projectHubService.complete(project.id)); closeModal(); return; }
      if (modal === 'leave' && account?.profile?.id) { saved(await projectHubService.updateMember(project.id, account.profile.id, { status: 2 })); closeModal(); }
    } catch (cause) { setMutationError(messageOf(cause)); } finally { setBusy(false); }
  }
  if (loading) return <View style={styles.state}><ActivityIndicator color={c.primary} accessibilityLabel="Đang tải dự án" /><Text style={styles.muted}>Đang tải thông tin dự án…</Text></View>;
  if (error || !project) return <View style={styles.state}><HubIcon name="folder" size={38} /><Text accessibilityRole="alert" style={ui.error}>{error || 'Dự án không còn khả dụng.'}</Text><HubAction compact title="Thử lại" onPress={() => setAttempt(value => value + 1)} /><HubAction compact title="Về dự án của tôi" variant="quiet" onPress={() => router.replace('/profile/projects' as never)} /></View>;
  const displayMembers = projectDisplayMembers(project, account?.profile?.id);
  const activeMembers = displayMembers.filter(item => item.status === 0);
  const canOpenCommunity = project.isOwner && project.status !== 2 && project.status !== 3;
  const tabs = overviewTabs.filter(item => (item.id !== 'settings' || project.isOwner || project.isMember));
  const canApply = !project.isOwner && !project.isMember && (project.status === 0 || project.status === 1) && project.recruitment?.status === 1 && (!project.recruitment.deadline || Date.parse(project.recruitment.deadline) > Date.now());
  const showHeaderActions = canOpenCommunity || (canApply);
  const actions = showHeaderActions ? <View style={styles.toolbarActions}>
      {canOpenCommunity && <HubAction compact title={project.recruitment ? 'Quản lý tuyển thành viên' : 'Đăng tuyển thành viên'} icon="people" variant="primary" onPress={() => show('community')} />}
      {canApply && <HubAction compact title="Ứng tuyển tham gia" icon="people" variant="primary" onPress={() => show('apply')} />}
    </View> : null;
  return <View style={styles.screen}><DetailNavigation title={project.title} crumbs={[{ label: 'Hồ sơ', href: '/(tabs)/profile' }, { label: 'Dự án', href: '/profile/projects' }, { label: project.title }]} fallback="/profile/projects" /><ScrollView contentContainerStyle={[styles.page, compact && styles.compactPage]} showsVerticalScrollIndicator={false}>
    <ProjectReceivedInvitation project={project} onChanged={refresh} />
    <View testID="project-detail-hero" style={[styles.hero, compact && styles.heroCompact]}>
      <View style={[styles.heroCover, compact && { width: '100%' }]}>
        <ProjectCover url={project.logoUrl} title={project.title} height={compact ? 170 : 160} style={{ borderRadius: 10 }} />
        {project.isOwner && <Pressable accessibilityRole="button" accessibilityLabel="Đổi ảnh dự án" disabled={pickingImage} onPress={() => void chooseCover()} hitSlop={6} style={styles.camera}>{pickingImage ? <ActivityIndicator size="small" color={c.primary} /> : <HubIcon name="camera" size={16} color={c.primary} />}</Pressable>}
        {!!imageError && <Text accessibilityRole="alert" style={[ui.error, { marginTop: 8 }]}>{imageError}</Text>}
      </View>
      <View style={styles.heroContent}><View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}><View style={[styles.titleRow, { flex: 1, minWidth: 0 }]}><View style={styles.editableTitle}><Text accessibilityRole="header" style={[styles.title, compact && { fontSize: 22 }]}>{project.title}</Text>{project.isOwner && <ProjectPencilButton label="Chỉnh sửa dự án" onPress={() => show('summary')} />}</View></View>{width >= 1300 && actions}</View>
        <Text accessibilityLabel="Mô tả ngắn dự án" numberOfLines={2} style={styles.description}>{project.description.replace(/\s+/g, ' ').trim()}</Text>
      </View>
    </View>
    {width < 1300 && actions && <View style={styles.toolbar}>{actions}</View>}
    {!!notice && <View role="status" accessibilityLiveRegion="polite" style={styles.notice}><Text style={{ color: c.primary, fontSize: 13, flex: 1 }}>{notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={() => setNotice('')} style={ui.iconButton}><HubIcon name="close" size={17} /></Pressable></View>}
    <ScrollView testID="project-detail-tabs" horizontal style={{ marginTop: 20 }} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" aria-selected={tab === item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}><HubIcon name={item.icon} color={tab === item.id ? c.primary : c.textSecondary} size={17} /><Text style={{ color: tab === item.id ? c.primary : c.ink, fontSize: 13, fontWeight: tab === item.id ? '600' : '500' }}>{item.label}{item.id === 'members' ? ` (${activeMembers.length})` : ''}</Text></Pressable>)}</ScrollView>
    <View style={[styles.content, !columns && { flexDirection: 'column' }]}><View style={{ flex: 1, minWidth: 0, gap: 14 }}>
      {tab === 'settings' && (project.isOwner || project.isMember) && <ProjectSettingsPanel project={project} onManage={show} />}
      {tab === 'overview' && <ProjectOverview project={project} editingDisabled={addingResource !== null} onEdit={() => show('overview')} onReview={() => show('review')} />}
      {tab === 'documents' && <ResourcesPanel project={project} kind="documents" onAdd={() => void addResource('documents')} busy={addingResource !== null} error={resourceError?.kind === 'documents' ? resourceError.message : ''} />}
      {tab === 'media' && <ResourcesPanel project={project} kind="media" onAdd={() => void addResource('media')} busy={addingResource !== null} error={resourceError?.kind === 'media' ? resourceError.message : ''} />}
      {tab === 'members' && <HubPanel compact title={`Thành viên dự án (${activeMembers.length})`} icon="people" action={project.isOwner && <HubAction compact title="Lời mời" icon="invite" onPress={() => show('requests')} />}>
        {displayMembers.map(item => <View key={item.id} testID="project-member-row" style={styles.member}><PersonAvatar person={item} size={32} /><View style={{ flex: 1 }}><Text style={styles.name}>{item.fullName}{item.userId === account?.profile?.id || (project.isOwner && item.userId === project.creator.id) ? ' (Bạn)' : ''}</Text><Text style={styles.muted}>{item.role}{item.status === 1 ? ' · Đã kết thúc tham gia' : item.status === 2 ? ' · Đã rời dự án' : ''}</Text></View>{project.isOwner && item.userId !== project.creator.id && item.status === 0 && <HubAction compact title="Quản lý" variant="quiet" onPress={() => setMember(item)} />}</View>)}
      </HubPanel>}
    </View><View style={[styles.sidebar, !columns && { width: '100%' }]}>
      <HubPanel compact title="Thông tin dự án" icon="info"><InfoRow icon="person" label="Chủ dự án"><View style={styles.creator}><PersonAvatar person={project.creator} size={22} /><Text style={[styles.infoValue, { flexShrink: 1 }]}>{project.creator.fullName}</Text></View></InfoRow><InfoRow icon="calendar" label="Ngày bắt đầu"><Text style={styles.infoValue}>{date(project.details.startDate)}</Text></InfoRow><InfoRow icon="calendar" label={project.status === 2 ? 'Ngày hoàn thành' : 'Dự kiến kết thúc'}><Text style={styles.infoValue}>{date(project.details.endDate)}</Text></InfoRow><InfoRow icon="people" label="Thành viên"><Text style={styles.infoValue}>{activeMembers.length} thành viên</Text></InfoRow><InfoRow icon="clock" label="Cập nhật gần đây"><Text testID="project-last-updated" style={styles.infoValue}>{formatProjectUpdatedAt(project.updatedAt)}</Text></InfoRow><InfoRow icon="info" label="Trạng thái"><HubStatus compact status={project.status} /></InfoRow></HubPanel>
      <ProjectTechnologiesCard key={project.id} project={project} canEdit={project.isOwner} onSaved={saved} />
      <HubPanel compact title="Liên kết" icon="link" style={{ paddingRight: project.isOwner ? 42 : 16 }}>{project.isOwner && <ProjectPencilButton corner label="Chỉnh sửa liên kết dự án" disabled={addingResource !== null} onPress={() => show('links')} />}{project.details.links.length ? project.details.links.map((link, i) => <Pressable key={i} accessibilityRole="link" onPress={() => openProjectUrl(link.url)} style={styles.link}><ProjectLinkIcon label={link.label} size={19} /><Text numberOfLines={1} style={[styles.infoValue, { flex: 1 }]}>{link.label}</Text><HubIcon name="external" size={16} color={c.textSecondary} /></Pressable>) : <Text style={styles.muted}>Chưa có liên kết dự án.</Text>}</HubPanel>
      <ProjectVerificationCard project={project} />
    </View></View>

  </ScrollView>
    {imageFile && <ProjectImagePreviewModal initialFile={imageFile} onClose={() => setImageFile(null)} onConfirm={async logoUrl => { setProject(await projectHubService.update(project.id, { logoUrl })); setNotice(''); }} />}
    {modal === 'overview' && <ProjectOverviewModal project={project} onSaved={saved} onClose={closeModal} />}
    {modal === 'summary' && <ProjectSummaryModal project={project} onSaved={saved} onClose={closeModal} />}
    {modal === 'links' && project.isOwner && <ProjectLinksModal project={project} onSaved={saved} onClose={closeModal} />}
    {modal === 'community' && <RecruitmentModal project={project} onSaved={saved} onClose={closeModal} />}
    {modal === 'invite' && <InviteMemberModal project={project} onClose={() => show('requests')} onInvited={() => setNotice('Đã gửi lời mời tham gia dự án.')} />}
    {modal === 'apply' && <ApplyProjectModal project={project} onClose={closeModal} onApplied={() => setNotice('Đã gửi đơn ứng tuyển. Chủ dự án sẽ xem xét yêu cầu của bạn.')} />}
    {modal === 'requests' && <ProjectRequestsModal project={project} onClose={closeModal} onChanged={refresh} onInvite={() => show('invite')} />}
    {modal === 'review' && <PersonalReviewModal project={project} onSaved={saved} onClose={closeModal} />}
    {member && <MemberRoleModal project={project} member={member} onSaved={saved} onClose={closeMember} />}
    {(modal === 'complete' || modal === 'delete' || modal === 'leave') && <HubModal wide={false} title={modal === 'delete' ? 'Xóa dự án?' : modal === 'leave' ? 'Rời dự án?' : 'Hoàn thành dự án?'} onClose={busy ? () => undefined : closeModal} footer={<><HubAction compact title="Hủy" onPress={closeModal} disabled={busy} /><HubAction compact title={modal === 'delete' ? 'Xóa dự án' : modal === 'leave' ? 'Xác nhận rời dự án' : 'Xác nhận hoàn thành'} variant={modal === 'complete' ? 'primary' : 'danger'} busy={busy} onPress={() => void confirm()} /></>}><Text style={styles.description}>{modal === 'delete' ? `Bạn đang xóa “${project.title}”. Dự án có lịch sử nghiệp vụ liên quan có thể không được phép xóa.` : modal === 'leave' ? 'Bạn sẽ không còn là thành viên hoạt động của dự án. Lịch sử tham gia vẫn được giữ.' : 'Dự án sẽ chuyển sang trạng thái hoàn thành và đóng tuyển thành viên.'}</Text>{!!mutationError && <Text accessibilityRole="alert" style={ui.error}>{mutationError}</Text>}</HubModal>}
  </View>;
}

function ProjectOverview({ project, onReview, onEdit, editingDisabled }: { project: HubProject; onReview: () => void; onEdit: () => void; editingDisabled: boolean }) {
  const { details } = project; const results = details.results;
  const canReview = project.isOwner || project.isMember;
  return <View style={{ gap: 14 }}>
    <HubPanel compact style={{ gap: 0 }}>
      {project.isOwner && <ProjectPencilButton label="Chỉnh sửa nội dung dự án" onPress={onEdit} disabled={editingDisabled} corner />}
      <OverviewSection section="introduction" icon="book" reserveAction={project.isOwner}><Text style={styles.description}>{details.description?.trim() || overviewGuides.introduction.empty}</Text></OverviewSection>
      <OverviewSection section="problemSolution" icon="target"><View style={styles.tiles}><View style={[styles.tile, { backgroundColor: '#FFF2F2' }]}><View style={styles.tileHeading}><HubIcon name="target" color="#D64A4A" /><Text style={[styles.tileTitle, { color: '#BA3030' }]}>Vấn đề</Text></View><Text style={styles.description}>{results.problem?.trim() || 'Hãy nêu ai đang gặp khó khăn, trong hoàn cảnh nào và vấn đề đó ảnh hưởng đến họ ra sao.'}</Text></View><View style={[styles.tile, { backgroundColor: '#ECF8EF' }]}><View style={styles.tileHeading}><HubIcon name="bulb" color="#188C42" /><Text style={[styles.tileTitle, { color: '#188C42' }]}>Giải pháp</Text></View><Text style={styles.description}>{results.solution?.trim() || 'Hãy giải thích cách dự án xử lý khó khăn đó và lợi ích khác biệt mang lại cho người dùng.'}</Text></View></View></OverviewSection>
      <OverviewSection section="objectives" icon="flag"><BulletList values={results.objectives ?? []} empty={overviewGuides.objectives.empty} /></OverviewSection>
      <OverviewSection section="features" icon="layers"><BulletList values={details.features} check empty={overviewGuides.features.empty} /></OverviewSection>
      <OverviewSection section={project.status === 2 ? 'achievements' : 'results'} icon="trophy" last>
        {project.status === 2 ? <BulletList values={results.achievements ?? []} empty={overviewGuides.achievements.empty} /> : <View style={styles.tiles}>{[
          { icon: 'target' as const, title: 'Sản phẩm', value: results.expectedProduct, empty: 'Hãy nêu sản phẩm hoặc phiên bản dự kiến bàn giao để người xem hình dung đầu ra cụ thể.' },
          { icon: 'trophy' as const, title: 'Giá trị', value: results.expectedValue, empty: 'Hãy mô tả lợi ích cho người dùng và cách đánh giá giá trị mà dự án mang lại.' },
          { icon: 'people' as const, title: 'Phát triển', value: results.expectedGrowth, empty: 'Hãy thêm bước phát triển tiếp theo sau phiên bản đầu dựa trên nhu cầu hoặc phản hồi thực tế.' },
        ].map(item => <View key={item.title} style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name={item.icon} /><Text style={styles.tileTitle}>{item.title}</Text></View><Text style={styles.description}>{item.value?.trim() || item.empty}</Text></View>)}</View>}
      </OverviewSection>
    </HubPanel>
    {canReview && <HubPanel compact title="Tổng kết cá nhân" icon="book">
      <ProjectPencilButton label="Chỉnh sửa tổng kết cá nhân" onPress={onReview} corner />
      <View style={styles.tiles}>
        <View style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name="warning" color={c.warning} /><Text style={styles.tileTitle}>Khó khăn của tôi</Text></View><Text style={styles.description}>{project.myReview?.challenges || 'Chưa có tổng kết cá nhân.'}</Text></View>
        <View style={[styles.tile, styles.resultTile]}><View style={styles.tileHeading}><HubIcon name="book" /><Text style={styles.tileTitle}>Bài học kinh nghiệm</Text></View><Text style={styles.description}>{project.myReview?.lessonsLearned || 'Ghi lại những điều bạn học được từ dự án.'}</Text></View>
      </View>
    </HubPanel>}
  </View>;
}
function OverviewSection({ section, icon, children, last, reserveAction }: { section: OverviewGuideId; icon: HubIconName; children: ReactNode; last?: boolean; reserveAction?: boolean }) {
  return <View style={[styles.overviewSection, !last && { borderBottomWidth: 1, borderColor: c.line }]}><View style={[styles.sectionHeading, reserveAction && { paddingRight: 30 }]}><HubIcon name={icon} size={20} /><Text accessibilityRole="header" aria-level={2} style={[ui.heading, { fontSize: 15, flexShrink: 1 }]}>{overviewGuides[section].title}</Text><ProjectOverviewHelp section={section} /></View><View style={{ paddingLeft: 28 }}>{children}</View></View>;
}
function InfoRow({ label, icon, children }: { label: string; icon: HubIconName; children: ReactNode }) { return <View style={styles.infoRow}><HubIcon name={icon} size={17} color={c.textSecondary} /><Text style={styles.infoLabel}>{label}</Text><View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View></View>; }
function ResourcesPanel({ project, kind, onAdd, busy, error }: { project: HubProject; kind: 'documents' | 'media'; onAdd: () => void; busy: boolean; error: string }) {
  const files = project.details[kind]; const media = kind === 'media';
  return <HubPanel compact title={media ? 'Hình ảnh & Video demo' : 'Tài liệu dự án'} icon={media ? 'image' : 'document'}>
    {!files.length ? <View style={styles.resourceEmpty}><HubIcon name={media ? 'image' : 'document'} size={38} /><Text style={styles.muted}>{media ? 'Chưa có hình ảnh hoặc video demo.' : 'Chưa có tài liệu được chia sẻ.'}</Text></View> : <View style={media ? styles.mediaGrid : { gap: 10 }}>{files.map((file, i) => <Resource key={`${file.url}-${i}`} file={file} media={media} />)}</View>}
    {project.isOwner && <View style={{ alignSelf: 'flex-start' }}><HubAction compact title={media ? 'Thêm hình ảnh / video' : 'Thêm tài liệu'} icon="plus" busy={busy} onPress={onAdd} /></View>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </HubPanel>;
}
function Resource({ file, media }: { file: HubFile; media: boolean }) { return <Pressable accessibilityRole="link" accessibilityLabel={`Mở ${file.name}`} onPress={() => openProjectUrl(file.url)} style={media ? styles.media : styles.document}>{media ? <>{file.type === 'image' ? <Image source={{ uri: file.url }} style={styles.mediaImage} resizeMode="cover" /> : <View style={[styles.mediaImage, { backgroundColor: c.blueWash, justifyContent: 'center', alignItems: 'center' }]}><HubIcon name="play" size={38} /></View>}<View style={styles.mediaLabel}><Text numberOfLines={2} style={[styles.infoValue, { flex: 1 }]}>{file.name}</Text><HubIcon name="external" size={15} /></View></> : <><HubIcon name="document" size={20} /><Text style={[styles.infoValue, { flex: 1 }]}>{file.name}</Text><HubIcon name="external" size={17} /></>}</Pressable>; }
const styles = StyleSheet.create({
  editableTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  screen: { flex: 1, backgroundColor: c.canvas }, page: { width: '100%', maxWidth: 1380, alignSelf: 'center', padding: 24, paddingBottom: 40 }, compactPage: { padding: 14, paddingBottom: 28 },
  camera: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  state: { flex: 1, minHeight: 280, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: c.canvas }, muted: { fontSize: 12, lineHeight: 19, color: c.textSecondary },
  hero: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, heroCompact: { flexDirection: 'column', gap: 14 }, heroCover: { width: 280, borderRadius: 10 }, heroContent: { flex: 1, minWidth: 0, gap: 10, paddingTop: 2 }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }, title: { fontSize: 24, fontWeight: '700', color: c.ink, flexShrink: 1 }, mode: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', gap: 5, backgroundColor: c.blueWash, alignItems: 'center' }, description: { color: c.ink, fontSize: 13, lineHeight: 21 },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 12 }, toolbarActions: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', alignItems: 'center' }, notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.blueWash, paddingLeft: 12, borderRadius: 8, marginBottom: 10 },
  tabs: { minWidth: '100%', borderBottomWidth: 1, borderColor: c.line, marginBottom: 16 }, tab: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: c.primary }, content: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, sidebar: { width: 300, gap: 14 },
  overviewSection: { paddingVertical: 13, gap: 9 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tile: { flex: 1, minWidth: 140, padding: 12, gap: 6, borderRadius: 9 }, resultTile: { minWidth: 140, backgroundColor: '#F3F6FC' }, tileHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, tileTitle: { color: c.primary, fontSize: 13, fontWeight: '600', flexShrink: 1 }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, borderBottomWidth: 1, borderColor: '#F0F3F8' }, infoLabel: { color: c.ink, fontSize: 11, width: 88 }, infoValue: { color: c.ink, fontSize: 12, lineHeight: 19 }, creator: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }, link: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 36, borderBottomWidth: 1, borderColor: '#F0F3F8' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line }, name: { color: c.ink, fontSize: 13, fontWeight: '600' }, resourceEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 13 }, document: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: 8 }, mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, media: { flexGrow: 1, flexBasis: 200, maxWidth: 400, borderRadius: 9, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }, mediaImage: { width: '100%', height: 140 }, mediaLabel: { flexDirection: 'row', padding: 10, gap: 8, alignItems: 'center' },
});
