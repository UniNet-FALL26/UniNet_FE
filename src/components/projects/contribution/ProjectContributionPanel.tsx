import { useEffect, useState } from 'react';
import { contributionService } from '@/services/contribution.service';
import type { PublishedVersion, OfficialRun } from '@/types/contribution';
import { ActivityIndicator, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import type { HubProject } from '@/types/project-hub';
import { projectDisplayMembers } from '@/utils/project-members';
import { contributionLabel, contributionNext, runLabel, peerLabel, readinessLabel, categoryLabel, reasonLabel, canClosePeer } from '@/utils/contribution';
import { officialContributionLabel } from '@/utils/project-github';
import { HubAction, HubIcon, HubModal } from '../hub/ProjectHubUI';
import { useContribution } from './useContribution';
import { UserDetails } from './UserDetails';
import { userReasonCodes } from '@/utils/contribution-presentation';
import { CombinedAdjustment } from './CombinedAdjustment';
import { PeerEvaluation } from './PeerEvaluation';
import { ContributionAudit } from './ContributionAudit';
import { contributionStyles as s } from './styles';
type Detail = 'combined' | 'adjust' | 'history' | 'git' | 'peer' | 'result' | 'memberships' | 'activities' | 'exclusions' | 'audit' | null;
const confirmations: Record<string, { title: string; copy: string }> = {
  approvePublish: { title: 'Duyệt và công bố Contribution?', copy: 'Xác nhận bạn đã kiểm tra kết quả và các hoạt động không được tính. Phiên bản mới sẽ được công bố; phiên bản trước vẫn được lưu trong lịch sử.' },
  capture: { title: 'Chốt dữ liệu GitHub?', copy: 'Chốt dữ liệu GitHub hiện có để sử dụng cho lần tính điểm này. Dữ liệu đã chốt không thể chỉnh sửa; điểm chưa được công bố.' },
  openPeer: { title: 'Bắt đầu đánh giá thành viên?', copy: 'Danh sách đánh giá gồm tất cả thành viên đang có hiệu lực, kể cả chủ dự án. Mỗi người tự đánh giá những người còn lại bằng tài khoản của mình.' },
  closePeer: { title: 'Kết thúc đánh giá?', copy: 'Chỉ đóng khi đã đủ đánh giá. Điểm và nhận xét sẽ được chốt; sau đó không thể sửa.' },
  createRun: { title: 'Tạo bản nháp Contribution?', copy: 'Tính tổng đóng góp từ dữ liệu GitHub và đánh giá đã chốt. Kết quả chỉ để bạn xem trước, chưa được công bố.' },
  submit: { title: 'Gửi kết quả xét duyệt?', copy: 'Chuyển kết quả hiện tại sang bước xét duyệt. Kiểm tra evidence, exclusions và giới hạn dữ liệu trước khi phê duyệt.' },
  approve: { title: 'Phê duyệt kết quả?', copy: 'Xác nhận đã kiểm tra kết quả và các giới hạn. Phê duyệt chưa công bố điểm cho thành viên.' },
  reject: { title: 'Yêu cầu chỉnh sửa?', copy: 'Ghi rõ lý do để lưu trong lịch sử xét duyệt.' },
  finalize: { title: 'Chốt kết quả Contribution?', copy: 'Kết quả đã chốt không thể chỉnh sửa. Đây là bước xác nhận cuối trước khi công bố; hãy kiểm tra toàn bộ dữ liệu đầu vào.' },
  publish: { title: 'Công bố điểm Contribution?', copy: 'Kết quả sẽ được hiển thị theo quyền dự án. Đánh giá và dữ liệu riêng tư vẫn được bảo vệ.' },
};
export function ProjectContributionPanel({ project, onComplete }: { project: HubProject; onComplete: () => void }) {
  const { account } = useAuthStore();
  if (!account?.profile?.id) return null;
  return <ContributionPanel key={`${project.id}:${account.id}`} project={project} accountId={account.id} self={account.profile.id} onComplete={onComplete} />;
}
function ContributionPanel({ project, accountId, self, onComplete }: { project: HubProject; accountId: string; self: string; onComplete: () => void }) {
  const model = useContribution(project, accountId, self), { data, busy } = model;
  const [detail, setDetail] = useState<Detail>(null), [confirm, setConfirm] = useState<string | null>(null), [feedback, setFeedback] = useState('');
  const { width } = useWindowDimensions();
  const [historyRun, setHistoryRun] = useState<string | null>(null), [historical, setHistorical] = useState<OfficialRun | null>(null), [historyError, setHistoryError] = useState('');
  const members = projectDisplayMembers(project).filter(x => x.status === 0), name = (id: string) => members.find(x => x.userId === id)?.fullName ?? 'Thành viên dự án';
  const manage = !!data?.workflow.canManage && project.isOwner && project.creator.id === self;
  useEffect(() => {
    if (!historyRun || !manage) return;
    const ctrl = new AbortController();
    void contributionService.run(project.id, historyRun, ctrl.signal).then(value => {
      if (!ctrl.signal.aborted && value.projectId === project.id && value.publishedAt) setHistorical(value);
    }).catch(() => { if (!ctrl.signal.aborted) setHistoryError('Không thể đọc phiên bản lịch sử.'); });
    return () => ctrl.abort();
  }, [historyRun, manage, project.id]);
  const shownRun = historyRun ? historical?.id === historyRun ? historical : null : data?.run;
  const allowed = !!data && !model.error && model.ready && !busy;
  const combinedActive = manage && !!data?.adjustment?.id && !['Published', 'Failed'].includes(data.adjustment.state);
  const next = combinedActive && !data?.adjustment?.runId && !canClosePeer(data?.cohort ?? null) ? { kind: 'combined', label: 'Tiếp tục cập nhật GitHub và Peer' } : data ? contributionNext(data, manage, self) : null;
  const cardWidth = width >= 1450 ? '31.8%' : width >= 900 ? '48.5%' : '100%';
  const date = (at: string) => new Date(at).toLocaleString('vi-VN');
  function act(kind: string) {
    if (!allowed) return;
    if (['combined', 'adjust', 'history', 'git', 'peer', 'result'].includes(kind)) { if (kind === 'result') setHistoryRun(null); setDetail(kind as Detail); return; }
    if (kind === 'approvePublish' && detail !== 'result') { setHistoryRun(null); setDetail('result'); return; }
    if (kind === 'complete') { onComplete(); return; }
    if (confirmations[kind]) { setFeedback(''); setConfirm(kind); }
  }
  async function execute() {
    if (!confirm || !allowed || !manage || !data?.workflow.projectCompleted) return;
    if (confirm !== next?.kind && !(['capture', 'openPeer', 'createRun'].includes(confirm) && data.capabilities?.canAdjust) && !(confirm === 'reject' && data.run?.state === 'Review') && !(confirm === 'createRun' && model.pending?.kind === 'createRun')) return;
    if (confirm === 'closePeer' && !canClosePeer(data.cohort)) return;
    if (confirm === 'createRun' && (data.readiness?.gitState !== 'Ready' || !['Ready', 'NotApplicable'].includes(data.peer?.state ?? ''))) return;
    const ok = await model.perform(confirm, { roster: members.map(x => x.userId), feedback });
    setConfirm(null); if (ok) setDetail(null);
  }
  return <View style={s.root} accessibilityLabel="Đóng góp dự án">
    <View style={{ gap: 6 }}><Text accessibilityRole="header" style={s.title}>Đóng góp dự án</Text><Text style={s.sub}>Tổng kết đóng góp của các thành viên</Text>{data && <Text style={s.copy}>{contributionLabel(data)}</Text>}</View>
    {!!model.error && <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{model.error}</Text><HubAction title="Thử lại Contribution" onPress={() => void model.refresh()} /></View>}
    {!!model.mutationError && <Text accessibilityRole="alert" style={s.error}>{model.mutationError}</Text>}
    {!!model.notice && <Text accessibilityLiveRegion="polite" style={s.success}>{model.notice}</Text>}
    {!data && !model.error && <ActivityIndicator accessibilityLabel="Đang tải Contribution" />}
    {data && <>
      {userReasonCodes(data.workflow.blockers).map(code => <Text key={code} style={s.copy}>{reasonLabel(code)}</Text>)}
      <View style={s.cards}>
        <View style={[s.card, { width: cardWidth }]}><HubIcon name="branch" size={24} /><Text style={s.heading}>Dữ liệu GitHub</Text>
          <Text style={s.copy}>{model.sync.filter(x => model.repos.some(r => r.id === x.projectGitRepositoryId) && x.latestJob?.status === 2).length}/{model.repos.length} repository có lần đồng bộ hoàn tất</Text>
          <Text style={s.copy}>{data.snapshot ? 'Đã chốt dữ liệu' : 'Chưa chốt dữ liệu'}{data.readiness ? ` · ${readinessLabel(data.readiness.gitState)}` : ''}</Text>
          {data.snapshot && <Text style={s.small}>Chốt lúc {date(data.snapshot.createdAt)}</Text>}
          {data.snapshot?.restrictedCount ? <Text style={s.error}>Một phần dữ liệu không được phép truy cập.</Text> : null}
          {manage ? <HubAction title="Chi tiết dữ liệu GitHub" variant="quiet" onPress={() => setDetail('git')} /> : <Text style={s.small}>Chủ dự án quản lý dữ liệu và xác minh phạm vi.</Text>}
        </View>
        <View style={[s.card, { width: cardWidth }]}><HubIcon name="people" size={24} /><Text style={s.heading}>Đánh giá thành viên</Text><Text style={s.copy}>{peerLabel(data.cohort?.status)}</Text>
          {data.cohort && <Text style={s.copy}>{data.cohort.submittedCount}/{data.cohort.requiredCount} đánh giá đã gửi</Text>}
          {data.cohort?.participantIds.includes(self) && <Text style={s.small}>{data.cohort.status === 3 ? 'Đánh giá của bạn đã được chốt' : 'Của bạn: ' + data.cohort.ratings.length + '/' + (data.cohort.participantIds.length - 1)}</Text>}
          {data.cohort && <HubAction title="Mở đánh giá thành viên" variant="quiet" onPress={() => setDetail('peer')} />}
        </View>
        <View style={[s.card, { width: cardWidth }]}><HubIcon name="chart" size={24} /><Text style={s.heading}>Kết quả Contribution</Text><Text style={s.copy}>Đóng góp GitHub và đánh giá thành viên</Text>
          <Text style={s.copy}>{manage && data.run ? runLabel(data.run.state) : data.workflow.publishedRunId ? 'Đã công bố' : 'Chưa công bố'}</Text>
          {manage && data.run && data.workflow.publishedRunId && data.run.id !== data.workflow.publishedRunId && <Text style={s.small}>Đang xem bản điều chỉnh. Kết quả đã công bố trước vẫn là hiện hành.</Text>}
          {!manage && !data.published && <Text style={s.small}>Bạn sẽ được xem kết quả cá nhân sau khi công bố.</Text>}
          {data.published && <Text style={s.heading}>Của bạn: {officialContributionLabel(data.published, project.id, self)}</Text>}
          {(manage && data.run || data.published) && <HubAction title={manage ? 'Chi tiết kết quả' : 'Kết quả cá nhân'} variant="quiet" onPress={() => { setHistoryRun(null); setDetail('result'); }} />}
          {manage && data.capabilities?.supported && data.workflow.publishedRunId && <HubAction title="Xem lịch sử điểm" variant="quiet" onPress={() => setDetail('history')} />}
        </View>
      </View>
      <View style={s.next}><Text style={s.heading}>Bước tiếp theo</Text>
        {model.pending ? <><Text style={s.copy}>Chưa xác nhận được yêu cầu trước. Hãy kiểm tra trạng thái trước khi tiếp tục để tránh tạo dữ liệu trùng.</Text>
          <HubAction title="Kiểm tra trạng thái yêu cầu" disabled={busy} onPress={() => void model.refresh()} />
          {model.pending.kind === 'createRun' && <HubAction title="Gửi lại cùng yêu cầu tạo kết quả" disabled={!allowed} onPress={() => act('createRun')} />}
        </> : next && <><Text style={s.copy}>{next.kind === 'wait' || next.kind === 'blocked' ? next.label : 'Chỉ tiếp tục khi bạn chủ động xác nhận. Hệ thống không tự tạo hoặc công bố kết quả.'}</Text>
          {!['wait', 'blocked'].includes(next.kind) && <HubAction title={next.label} variant="primary" disabled={!allowed || (next.kind !== 'complete' && manage && !data.workflow.projectCompleted)} onPress={() => act(next.kind)} />}
        </>}
      </View>
    </>}
    {detail && data && <HubModal title={detail === 'git' ? 'Dữ liệu GitHub đã chốt' : detail === 'peer' ? 'Đánh giá thành viên' : detail === 'result' ? 'Tổng đóng góp' : detail === 'combined' ? 'Cập nhật đóng góp' : detail === 'adjust' ? 'Điều chỉnh đóng góp' : detail === 'history' ? 'Lịch sử điểm' : 'Chi tiết kết quả'} onClose={() => { if (!busy) setDetail(null); }}>
      <View style={{ gap: 16 }}>
        {!!model.mutationError && <Text accessibilityRole="alert" style={s.error}>{model.mutationError}</Text>}
        {detail === 'combined' && manage && <CombinedAdjustment key={`${project.id}:${accountId}`} projectId={project.id} accountId={accountId} repositories={model.repos} sync={model.sync} loadedPeerId={data.cohort?.id} loadedRunId={data.run?.id} onPeer={() => setDetail('peer')} onResult={() => { setHistoryRun(null); setDetail('result'); }} onChanged={() => void model.refresh()} />}
        {detail === 'adjust' && manage && <>
          <Text style={s.heading}>Điều chỉnh Contribution</Text><Text style={s.copy}>Không sửa điểm cũ. Phiên bản mới chỉ thay thế khi được duyệt và công bố.</Text>
          {!data.capabilities?.supported ? <Text style={s.error}>Tính năng điều chỉnh hiện chưa khả dụng. Vui lòng liên hệ quản trị viên.</Text> : <>
            <HubAction title="Cập nhật cả GitHub và Peer" variant="primary" disabled={!allowed || !data.workflow.projectCompleted} onPress={() => setDetail('combined')} />
            {combinedActive && <Text style={s.small}>Đang có lần điều chỉnh liên kết Job/Git/Peer riêng. Tiếp tục lần này trước khi dùng đầu vào khác.</Text>}
            {!combinedActive && <>
            <UserDetails title="Tùy chọn khác"><HubAction title="Tính lại điểm" disabled={!allowed || data.readiness?.gitState !== 'Ready' || !['Ready', 'NotApplicable'].includes(data.peer?.state ?? '')} onPress={() => { setDetail(null); act('createRun'); }} />
            <Text style={s.small}>Nếu dữ liệu không thay đổi, hệ thống giữ nguyên kết quả đã tính.</Text></UserDetails>
            <HubAction title="Chỉ đánh giá lại thành viên" disabled={!allowed || !data.capabilities.canOpenPeerRound} onPress={() => { setDetail(null); act('openPeer'); }} />
            <Text style={s.small}>Mỗi thành viên cần gửi đánh giá mới; đánh giá cũ không được sao chép.</Text>
            <HubAction title="Chỉ cập nhật GitHub" disabled={!allowed || !data.workflow.projectCompleted} onPress={() => { setDetail(null); act('capture'); }} />
            </>}
          </>}
        </>}
        {detail === 'history' && manage && <VersionHistory projectId={project.id} onOpen={id => { setHistoryRun(id); setDetail('result'); }} />}
        {detail === 'git' && manage && <>
          {model.repos.map(r => <View key={r.id} style={s.item}><Text style={s.heading}>{r.repository.fullName}</Text><Text style={s.copy}>{r.repository.isPrivate ? 'Riêng tư' : 'Công khai'} · {r.accessStatus === 1 ? 'Quyền truy cập đã xác minh' : 'Cần kiểm tra quyền truy cập'}</Text></View>)}
          {!data.snapshot ? <Text style={s.copy}>Chưa chốt dữ liệu GitHub. Bạn có thể tiếp tục khi dự án đã hoàn thành.</Text> : <>
<Text style={s.copy}>Dữ liệu tính đến: {date(data.snapshot.observationCutoff)}</Text>
            <UserDetails title="Hoạt động và lưu ý">{data.readiness?.categories.map(x => <View key={x.category} style={s.item}><Text style={s.heading}>{categoryLabel(x.category)} · {readinessLabel(x.status)}</Text><Text style={s.copy}>{x.eligibleActivityCount} hoạt động đủ điều kiện</Text>{x.limitations.map((r, i) => <Text key={i} style={s.small}>{reasonLabel(r)}</Text>)}</View>)}
            {userReasonCodes(data.readiness?.limitations ?? []).map((r, i) => <Text key={i} style={s.small}>{reasonLabel(r)}</Text>)}
            <Text style={s.small}>Dữ liệu chưa đầy đủ không được tự động tính điểm.</Text></UserDetails>
          </>}
        </>}
        {detail === 'peer' && (data.cohort ? <PeerEvaluation cohort={data.cohort} self={self} name={name} busy={busy || !!model.error || !!model.pending} submit={(target, score, comment, revision) => model.perform('peerRating', { target, score, comment, revision })} /> : <Text style={s.copy}>Chưa mở đợt đánh giá. Cần roster hợp lệ và sự xác nhận của chủ dự án.</Text>)}
        {detail === 'result' && <>
          {historyRun && !shownRun && <Text style={s.copy}>{historyError || 'Đang đọc phiên bản lịch sử…'}</Text>}
          {data.published && (!manage || !shownRun) && <><Text style={s.heading}>Tổng đóng góp đã công bố: {officialContributionLabel(data.published, project.id, self)}</Text></>}
          {manage && shownRun && <>
            <Text style={s.heading}>{runLabel(shownRun.state)}</Text>{!shownRun.publishedAt && <Text style={s.small}>Chỉ chủ dự án được xem. Đây chưa phải kết quả đã công bố.</Text>}
            {shownRun.calculation.results.map(r => <View key={r.userId} style={s.item}><Text style={s.heading}>{r.fullName}</Text>{!historyRun && shownRun.id !== data.workflow.publishedRunId && data.publishedRun && <Text style={s.small}>Đang công bố: {data.publishedRun.calculation.results.find(old => old.userId === r.userId)?.contributionPercent?.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) ?? 'Chưa có'}%</Text>}<Text style={s.copy}>Tổng đóng góp: {r.contributionPercent === null ? 'Chưa đủ dữ liệu' : `${r.contributionPercent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`}</Text></View>)}
            {shownRun.calculation.externalContributionPercent !== null && <Text style={s.copy}>Đóng góp ngoài dự án: {shownRun.calculation.externalContributionPercent}%</Text>}
            <UserDetails title="Chi tiết đóng góp"><Text style={s.small}>Điểm thành phần dùng để tính tổng đóng góp, không phải tỷ lệ phần trăm.</Text>{shownRun.calculation.results.map(r => <View key={r.userId} style={s.item}><Text style={s.heading}>{r.fullName}</Text><Text style={s.copy}>Điểm GitHub: {r.gitScore} · Điểm đánh giá: {r.peerScore}</Text></View>)}
            {shownRun.calculation.categories.map(c => <View key={c.category}><Text style={s.heading}>{categoryLabel(c.category)} · {readinessLabel(c.status)}</Text>{userReasonCodes(c.limitations).map((x, i) => <Text key={i} style={s.small}>{reasonLabel(x)}</Text>)}</View>)}
            <View style={s.row}><HubAction title="Hoạt động được tính" onPress={() => setDetail('activities')} /><HubAction title="Hoạt động bị loại" onPress={() => setDetail('exclusions')} /><HubAction title="Lịch sử xét duyệt" onPress={() => setDetail('audit')} /></View></UserDetails>
            {!historyRun && shownRun.state !== 'Published' && data.capabilities?.supported && <HubAction title="Duyệt và công bố" variant="primary" disabled={!allowed} onPress={() => act('approvePublish')} />}
            {!historyRun && shownRun.state !== 'Published' && <HubAction title="Chưa đồng ý với kết quả" disabled={!allowed} onPress={() => setDetail('adjust')} />}
          </>}
        </>}
        {manage && ['memberships', 'activities', 'exclusions', 'audit'].includes(detail) && <ContributionAudit key={`${project.id}:${detail}`} projectId={project.id} resourceId={detail === 'memberships' ? data.snapshot!.snapshotId : (historyRun ?? data.run!.id)} kind={detail as 'memberships' | 'activities' | 'exclusions' | 'audit'} />}
      </View>
    </HubModal>}
    {confirm && data && (confirm === next?.kind || confirm === 'reject' && data.run?.state === 'Review' || ['capture', 'openPeer', 'createRun'].includes(confirm) && data.capabilities?.canAdjust || confirm === 'createRun' && model.pending?.kind === 'createRun') && <HubModal title={confirmations[confirm].title} onClose={() => { if (!busy) setConfirm(null); }} wide={false} footer={<><HubAction title="Hủy" disabled={busy} onPress={() => setConfirm(null)} /><HubAction title="Xác nhận" variant="primary" busy={busy} disabled={!allowed || !!model.pending && !(confirm === 'createRun' && model.pending.kind === 'createRun') || confirm === 'reject' && !feedback.trim()} onPress={() => void execute()} /></>}>
      <Text style={s.copy}>{confirmations[confirm].copy}</Text>
      {confirm === 'openPeer' && <View style={{ marginTop: 12, gap: 8 }}>{members.map(m => <Text key={m.userId} style={s.copy}>{m.fullName}{m.userId === project.creator.id ? ' · Chủ dự án' : ''}</Text>)}</View>}
      {confirm === 'reject' && <TextInput accessibilityLabel="Lý do yêu cầu chỉnh sửa" value={feedback} onChangeText={setFeedback} maxLength={2000} multiline style={[s.field, { marginTop: 16 }]} />}
      {!!model.mutationError && <Text accessibilityRole="alert" style={s.error}>{model.mutationError}</Text>}
    </HubModal>}
  </View>;
}

function VersionHistory({ projectId, onOpen }: { projectId: string; onOpen: (id: string) => void }) {
  const [page, setPage] = useState(1), [loaded, setLoaded] = useState<{ page: number; items: PublishedVersion[]; total: number } | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const ctrl = new AbortController();
    void contributionService.versions(projectId, page, ctrl.signal).then(x => { if (!ctrl.signal.aborted) setLoaded({ page, items: x.items, total: x.total }); }).catch(() => { if (!ctrl.signal.aborted) setError('Không thể đọc lịch sử điểm.'); });
    return () => ctrl.abort();
  }, [projectId, page]);
  return <View style={{ gap: 12 }}><Text style={s.heading}>Lịch sử điểm đã công bố</Text>{!!error && <Text style={s.error}>{error}</Text>}{loaded?.page !== page ? <ActivityIndicator /> : <>
    {loaded.items.map(v => <View key={v.runId} style={s.item}><Text style={s.heading}>Phiên bản {v.version} · {v.isCurrent ? 'Hiện hành' : 'Đã được thay thế'}</Text><Text style={s.copy}>{new Date(v.publishedAt).toLocaleString('vi-VN')}</Text>{!!v.reason && <Text style={s.copy}>{v.reason}</Text>}<HubAction title={`Xem phiên bản ${v.version}`} onPress={() => onOpen(v.runId)} /></View>)}
    <View style={s.row}><HubAction title="Trang trước" disabled={page === 1} onPress={() => setPage(x => x - 1)} /><HubAction title="Trang tiếp" disabled={page * 20 >= loaded.total} onPress={() => setPage(x => x + 1)} /></View>
  </>}</View>;
}
