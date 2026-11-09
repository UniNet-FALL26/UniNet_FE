import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExternalProjectLayout, externalStyles as s } from './ExternalProjectLayout';
import { ProjectInformationFields } from './ProjectInformationFields';
import { useExternalProjectDraft } from '@/hooks/useExternalProjectDraft';
import { useAuthStore } from '@/store/auth.store';
import { skillService, type SkillCatalogItem } from '@/services/skill.service';
import { draftFieldLabels, validateDraft } from '@/utils/external-project-draft';
import { verificationDate } from '@/utils/verification-date';
import { toast } from '@/store/toast.store';
import type { DocumentCitation, DraftData, SourcedText } from '@/types/external-project-draft';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { openEvidence } from '@/components/assessor/AssignmentDetailContent';

const statusLabels = ['Đang đọc tài liệu', 'Hồ sơ sẵn sàng kiểm tra', 'Không trích xuất được tài liệu', 'Đã thêm dự án', 'Bản nháp đã hết hạn'];
export function ExternalProjectDraftReviewScreen() {
  const { account } = useAuthStore();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  return <DraftReviewScreen key={`${account?.id || 'signed-out'}:${draftId}`} />;
}
function DraftReviewScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const { account } = useAuthStore();
  const state = useExternalProjectDraft(draftId || '', account?.role === ACCOUNT_ROLE.STUDENT ? account.id : undefined);
  const { draft, form } = state;
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]), [catalogLoading, setCatalogLoading] = useState(true), [catalogError, setCatalogError] = useState<string | null>(null), [catalogRevision, setCatalogRevision] = useState(0);
  const [rights, setRights] = useState(false), [errors, setErrors] = useState<Record<string, string>>({});
  const [source, setSource] = useState<{ label: string; citations: DocumentCitation[] } | null>(null);
  const [dismissedSkills, setDismissedSkills] = useState<number[]>([]);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (account?.role !== ACCOUNT_ROLE.STUDENT) return;
    const controller = new AbortController(); setCatalogLoading(true); setCatalogError(null);
    skillService.getSkills(controller.signal).then(data => { if (!controller.signal.aborted) setCatalog(data); }).catch(cause => { if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : 'Không tải được kỹ năng.'); }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [catalogRevision, account?.id, account?.role]);
  const editable = !!draft && [1, 2].includes(draft.status) && !state.busy && !state.conflict && !state.expired;
  const change = <K extends keyof DraftData>(key: K, value: DraftData[K]) => { if (form) state.edit({ ...form, [key]: value }); setErrors(previous => ({ ...previous, [key]: '' })); };
  const liveErrors = form && draft ? validateDraft(form, draft.files, catalog.map(skill => skill.id), true) : {};
  const field = (key: 'startDate' | 'endDate' | 'submitterRole' | 'submitterContribution' | 'leaderName' | 'repositoryUrl' | 'demoUrl', label: string, maxLength: number, multiline = false) => <Input appearance="project" label={label} value={form?.[key] || ''} onChangeText={value => change(key, value)} maxLength={maxLength} multiline={multiline} style={multiline ? { minHeight: 100, textAlignVertical: 'top' } : undefined} editable={editable} error={errors[key]} />;
  const list = () => router.dismissTo('/(tabs)/groups' as never);
  const newDraft = () => router.push('/group/import' as never);
  async function save(confirm: boolean) {
    if (!form || !draft || !editable) return;
    const validation = validateDraft(form, draft.files, catalog.map(skill => skill.id), confirm);
    setErrors(validation);
    if (Object.keys(validation).length || (confirm && !rights)) { scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    if (confirm) {
      const projectId = await state.confirm(rights);
      if (projectId) { toast.success('Đã thêm dự án thành công.'); router.replace({ pathname: '/group/[id]', params: { id: projectId } } as never); }
    } else await state.save();
  }
  const sourceLink = (label: string, value: SourcedText | null | undefined) => value?.sources.length ? <Pressable accessibilityRole="button" onPress={() => setSource({ label, citations: value.sources })}><Text style={s.link}>Xem nguồn · {label}</Text></Pressable> : null;
  const info = draft?.extraction?.information;
  return <ExternalProjectLayout step={2} scrollRef={scroll} onBack={list}>
    <View style={s.notice}><Text style={s.heading}>{draft ? statusLabels[draft.status] : state.loading ? 'Đang tải bản nháp…' : 'Chưa tải được bản nháp'}</Text>
      {draft?.status === 0 && <Text style={s.body}>Hệ thống đang xử lý. Bạn có thể quay lại sau. Quá trình có thể mất vài phút; hồ sơ chưa được tạo thành dự án.</Text>}
      {draft?.status === 1 && <Text style={s.body}>Kiểm tra và bổ sung thông tin trước khi xác nhận. Nội dung trích xuất là gợi ý, cần được bạn đối chiếu.</Text>}
      {draft?.status === 2 && <><Text style={s.body}>Bạn có thể tự bổ sung thông tin rồi lưu bản nháp, hoặc chọn tài liệu khác để tạo bản nháp mới.</Text><Button title="Chọn tài liệu khác" variant="outline" onPress={newDraft} /></>}
      {draft?.status === 4 && <Button title="Tạo bản nháp mới" onPress={newDraft} />}
      {draft?.status === 3 && draft.confirmedProjectId && <Button title="Xem dự án" onPress={() => router.replace({ pathname: '/group/[id]', params: { id: draft.confirmedProjectId! } } as never)} />}
      {draft && <Text style={s.small}>Hạn lưu bản nháp: {verificationDate(draft.expiresAt)} (giờ Việt Nam)</Text>}
      <Button title={state.error ? 'Tải lại trạng thái' : 'Làm mới trạng thái'} variant="outline" disabled={state.loading || state.busy} onPress={state.refresh} />
    </View>
    {state.error && <Text accessibilityRole="alert" style={s.error}>{state.error}</Text>}
    {state.expired && <Button title="Tạo bản nháp mới" onPress={newDraft} />}
    {state.conflict && <View style={s.card}><Text style={s.heading}>Kiểm tra bản nháp trên hệ thống</Text><Text style={s.body}>Nội dung đang sửa vẫn được giữ lại. Bạn cần xem phiên bản mới trước khi lưu tiếp.</Text>{state.serverCopy && <><Text style={s.small}>Phiên bản {state.serverCopy.version} · {statusLabels[state.serverCopy.status]}</Text><View style={{ gap: 10 }}>{Object.entries(draftFieldLabels).filter(([key]) => !['skillIds', 'evidenceFileIds'].includes(key)).map(([key, label]) => <Text key={key} style={s.body}>{label}: {key === 'submitterIsLeader' ? state.serverCopy!.data.submitterIsLeader === null ? 'Chưa chọn' : state.serverCopy!.data.submitterIsLeader ? 'Có' : 'Không' : String(state.serverCopy!.data[key as keyof DraftData] || 'Chưa cập nhật')}</Text>)}<Text style={s.body}>Kỹ năng: {state.serverCopy.data.skillIds.map(id => catalog.find(skill => skill.id === id)?.name || 'Kỹ năng chưa có trong danh mục').join(', ')}</Text><Text style={s.body}>Minh chứng: {state.serverCopy.data.evidenceFileIds.map(id => state.serverCopy!.files.find(file => file.fileId === id)?.fileName || 'Tài liệu').join(', ')}</Text>{state.serverCopy.data.features.map((feature, index) => <Text key={index} style={s.body}>Chức năng: {feature}</Text>)}{state.serverCopy.data.members.map((member, index) => <Text key={index} style={s.body}>Thành viên: {member.name} · {member.role}</Text>)}</View><Button title="Dùng dữ liệu trên hệ thống" variant="outline" onPress={state.useServerCopy} />{[1, 2].includes(state.serverCopy.status) && <Button title="Đã kiểm tra — giữ nội dung đang sửa" onPress={state.keepLocalCopy} />}</>}</View>}
    {!!draft?.extraction?.warnings.length && <View style={s.notice}><Text style={s.body}>Một số tài liệu có cảnh báo trích xuất. Hãy đối chiếu tài liệu gốc và tự bổ sung phần còn thiếu.</Text></View>}
    {draft && form && [1, 2].includes(draft.status) && <>
      {(draft.missingFields.length > 0 || Object.values(errors).some(Boolean)) && <View style={s.notice}><Text style={s.body}>Thông tin cần bổ sung</Text>{draft.missingFields.filter(key => !!liveErrors[key]).map(key => <Text key={key} style={s.error}>• {draftFieldLabels[key] || 'Thông tin hồ sơ'}</Text>)}{Object.entries(errors).filter(([, value]) => !!value).map(([key, message]) => <Text key={key} style={s.error}>{draftFieldLabels[key] || key}: {message}</Text>)}</View>}
      <View style={s.card}><Text style={s.heading}>01. Thông tin dự án</Text><ProjectInformationFields title={form.title || ''} projectField={form.projectField || ''} description={form.description || ''} skillIds={form.skillIds} onTitle={value => change('title', value)} onField={value => change('projectField', value)} onDescription={value => change('description', value)} onSkills={value => change('skillIds', value)} catalog={catalog} loading={catalogLoading} catalogError={catalogError} reloadCatalog={() => setCatalogRevision(value => value + 1)} errors={errors} disabled={!editable} external />
        {info && Object.entries({ title: info.title, description: info.description, projectField: info.projectField }).map(([key, value]) => <View key={key}>{sourceLink(draftFieldLabels[key], value)}</View>)}
        <Button title="Làm mới danh mục kỹ năng" variant="outline" disabled={state.busy || catalogLoading} onPress={() => setCatalogRevision(value => value + 1)} />
        {info?.skills.filter(skill => !!skill.skillId).map((skill, index) => <View key={index}>{sourceLink(skill.name.value, skill.name)}</View>)}
        {info?.skills.map((skill, index) => !skill.skillId && !dismissedSkills.includes(index) ? <View key={index} style={s.file}><Text style={s.body}>{skill.name.value} · Chưa khớp danh mục</Text><Text style={s.small}>Chọn kỹ năng tương ứng trong danh mục ở trên hoặc bỏ gợi ý.</Text>{sourceLink(skill.name.value, skill.name)}<Button title="Bỏ gợi ý" variant="outline" disabled={!editable} onPress={() => setDismissedSkills(previous => [...previous, index])} /></View> : null)}
        {field('repositoryUrl', 'Mã nguồn (HTTP/HTTPS)', 2048)}{sourceLink('Mã nguồn', info?.repositoryUrl)}{field('demoUrl', 'Demo (HTTP/HTTPS)', 2048)}{sourceLink('Demo', info?.demoUrl)}
        <Text style={s.body}>Chức năng chính ({form.features.length}/40)</Text>{form.features.map((feature, index) => <View key={index} style={s.file}><Input appearance="project" label={`Chức năng ${index + 1}`} value={feature} onChangeText={value => change('features', form.features.map((item, i) => i === index ? value : item))} maxLength={1000} multiline editable={editable} />{sourceLink(`Chức năng ${index + 1}`, info?.features.find(item => item.value === feature))}<Button title="Bỏ chức năng" variant="outline" disabled={!editable} onPress={() => change('features', form.features.filter((_, i) => i !== index))} /></View>)}<Button title="Thêm chức năng" variant="outline" disabled={!editable || form.features.length >= 40} onPress={() => change('features', [...form.features, ''])} />
      </View>
      <View style={s.card}><Text style={s.heading}>02. Thời gian và đóng góp</Text><Text style={s.small}>Giữ đúng độ chính xác của tài liệu: ví dụ 2024, 2024-06 hoặc 2024-06-15. Không nhập thời gian ở tương lai.</Text>{field('startDate', 'Thời gian bắt đầu *', 10)}{sourceLink('Thời gian bắt đầu', info?.startDate)}{field('endDate', 'Thời gian kết thúc *', 10)}{sourceLink('Thời gian kết thúc', info?.endDate)}{field('submitterRole', 'Vai trò của bạn *', 255)}{field('submitterContribution', 'Đóng góp của bạn *', 4000, true)}
        <Text style={s.body}>Bạn có phải trưởng nhóm? *</Text><View style={s.row}>{[{ value: true, label: 'Có' }, { value: false, label: 'Không' }].map(option => <Pressable key={option.label} accessibilityRole="radio" accessibilityState={{ checked: form.submitterIsLeader === option.value, disabled: !editable }} disabled={!editable} onPress={() => change('submitterIsLeader', option.value)} style={[s.option, form.submitterIsLeader === option.value && s.selected]}><Text style={s.body}>{option.label}</Text></Pressable>)}</View>{errors.submitterIsLeader && <Text style={s.error}>{errors.submitterIsLeader}</Text>}{form.submitterIsLeader === false && field('leaderName', 'Họ tên trưởng nhóm *', 255)}
      </View>
      <View style={s.card}><Text style={s.heading}>03. Thành viên được khai báo</Text><Text style={s.small}>Không bắt buộc. Đây là thông tin tự khai báo; không tạo tài khoản, lời mời hoặc thành viên nhóm trên UniNet.</Text>{form.members.map((member, index) => <View key={index} style={s.file}><Input appearance="project" label={`Họ tên thành viên ${index + 1}`} value={member.name} onChangeText={value => change('members', form.members.map((item, i) => i === index ? { ...item, name: value } : item))} maxLength={255} editable={editable} /><Input appearance="project" label="Vai trò" value={member.role || ''} onChangeText={value => change('members', form.members.map((item, i) => i === index ? { ...item, role: value } : item))} maxLength={255} editable={editable} />{sourceLink(`Thành viên ${index + 1}`, info?.members.find(item => item.name.value === member.name)?.name)}{sourceLink('Vai trò', info?.members.find(item => item.name.value === member.name && item.role?.value === member.role)?.role)}<Button title="Bỏ thành viên" variant="outline" disabled={!editable} onPress={() => change('members', form.members.filter((_, i) => i !== index))} /></View>)}<Button title="Thêm thành viên khai báo" variant="outline" disabled={!editable || form.members.length >= 30} onPress={() => change('members', [...form.members, { name: '', role: null }])} /></View>
      <View style={s.card}><Text style={s.heading}>04. Minh chứng *</Text><Text style={s.small}>Chọn ít nhất một file thuộc bản nháp để đưa vào dự án. Muốn thay hoặc thêm file nguồn, hãy tạo bản nháp mới.</Text>{draft.files.map(file => <View key={file.fileId} style={s.file}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.evidenceFileIds.includes(file.fileId), disabled: !editable }} disabled={!editable} onPress={() => change('evidenceFileIds', form.evidenceFileIds.includes(file.fileId) ? form.evidenceFileIds.filter(id => id !== file.fileId) : [...form.evidenceFileIds, file.fileId])}><Text style={s.body}>{form.evidenceFileIds.includes(file.fileId) ? '☑' : '☐'} {file.fileName}</Text><Text style={s.small}>{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</Text></Pressable><Button title="Mở tài liệu" variant="outline" onPress={() => void openEvidence(file.url, message => toast.error(message))} /></View>)}{errors.evidenceFileIds && <Text style={s.error}>{errors.evidenceFileIds}</Text>}</View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rights, disabled: !editable }} disabled={!editable} onPress={() => setRights(value => !value)} style={s.notice}><Text style={s.body}>{rights ? '☑' : '☐'} Tôi có quyền chia sẻ dự án và các tài liệu này để thẩm định.</Text></Pressable>
      <Text style={s.small}>Dự án được thêm ở chế độ riêng tư. Xác nhận sẽ tạo dự án hoàn thành để đăng ký thẩm định.</Text>
      <View style={s.row}><Button title="Lưu bản nháp" variant="outline" loading={state.busy} disabled={!editable || catalogLoading || !!catalogError} onPress={() => void save(false)} /><Button title="Xác nhận thêm dự án" loading={state.busy} disabled={!editable || draft.status !== 1 || !rights || catalogLoading || !!catalogError || Object.keys(liveErrors).length > 0} onPress={() => void save(true)} style={s.grow} /></View>
      {Object.keys(liveErrors).length > 0 && <Text style={s.small}>Cần bổ sung: {Object.keys(liveErrors).map(key => draftFieldLabels[key] || key).join(', ')}.</Text>}
    </>}
    <Button title="Quay lại danh sách" variant="outline" disabled={state.busy} onPress={list} />
    <Modal visible={!!source} transparent animationType="fade" onRequestClose={() => setSource(null)}><View style={s.modalOverlay}><View style={s.modalCard}><Text style={s.heading}>Nguồn trích xuất · {source?.label}</Text><Text style={s.small}>Nguồn phản ánh kết quả trích xuất ban đầu; không chứng nhận nội dung đã chỉnh sửa.</Text><ScrollView contentContainerStyle={{ gap: 16 }}>{source?.citations.map((citation, index) => {
      const document = draft?.extraction?.documents.find(doc => doc.fileId === citation.fileId), segment = document?.segments.find(item => item.number === citation.segmentNumber);
      const location = segment?.pageNumber != null ? `Trang ${segment.pageNumber}` : segment?.paragraphNumber != null ? `Đoạn ${segment.paragraphNumber}` : segment?.lineNumber != null ? `Dòng ${segment.lineNumber}` : `Đoạn trích ${citation.segmentNumber}`;
      return <View key={index} style={s.file}><Text style={s.body}>{document?.fileName || 'Tài liệu nguồn'} · {location}</Text><Text selectable style={s.body}>{citation.quote}</Text></View>;
    })}</ScrollView><Button title="Đóng" onPress={() => setSource(null)} /></View></View></Modal>
  </ExternalProjectLayout>;
}
