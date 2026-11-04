import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ExternalProjectLayout, externalStyles as s } from './ExternalProjectLayout';
import { externalProjectDraftService } from '@/services/external-project-draft.service';
import { uploadReportFile } from '@/services/report-file.service';
import { externalDraftShortcuts, type SavedExternalDraft } from '@/store/external-project-drafts';
import { useAuthStore } from '@/store/auth.store';
import { tokenStorage } from '@/utils/storage';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { isFileId } from '@/utils/external-project-draft';
import { toast } from '@/store/toast.store';
import { ApiError } from '@/services/api';

type Upload = { key: string; asset: DocumentPicker.DocumentPickerAsset; state: 'pending' | 'uploading' | 'done' | 'error'; fileId?: string; error?: string };
const mimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
export function ExternalProjectUploadScreen() {
  const { account } = useAuthStore();
  return <UploadScreen key={account?.id || 'signed-out'} />;
}
function UploadScreen() {
  const { account } = useAuthStore();
  const [files, setFiles] = useState<Upload[]>([]), [saved, setSaved] = useState<SavedExternalDraft[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const lock = useRef(false), mounted = useRef(false), sequence = useRef(0), createdDraft = useRef<string | null>(null);
  useFocusEffect(useCallback(() => {
    mounted.current = true; setSaved([]);
    if (account?.role === ACCOUNT_ROLE.STUDENT) void externalDraftShortcuts.list(account.id).then(items => { if (mounted.current) setSaved(items); });
    return () => { mounted.current = false; };
  }, [account?.id, account?.role]));
  const openDraft = (draftId: string) => router.push({ pathname: '/group/external-draft/[draftId]', params: { draftId } } as never);
  async function choose() {
    if (lock.current) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes, multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      if (files.length + result.assets.length > 10) { setError('Chỉ chọn tối đa 10 tài liệu.'); return; }
      if (result.assets.some(file => !/\.(pdf|docx|txt)$/i.test(file.name) || typeof file.size !== 'number' || file.size <= 0 || file.size > 10 * 1024 * 1024)) { setError('Chọn PDF, DOCX hoặc TXT có dung lượng từ 1 byte đến 10 MB mỗi tài liệu.'); return; }
      createdDraft.current = null;
      setFiles(previous => [...previous, ...result.assets.map(asset => ({ key: String(++sequence.current), asset, state: 'pending' as const }))]); setError(null);
    } catch { setError('Không thể mở tài liệu. Vui lòng chọn lại.'); }
  }
  const patch = (key: string, values: Partial<Upload>) => setFiles(previous => previous.map(file => file.key === key ? { ...file, ...values } : file));
  async function upload(file: Upload) {
    if (file.state === 'done' && isFileId(file.fileId)) return file.fileId;
    patch(file.key, { state: 'uploading', error: undefined });
    try {
      const result = await uploadReportFile(file.asset, tokenStorage.getSession()?.accessToken || '');
      if (!isFileId(result.fileId)) throw new Error('Không nhận được mã tệp. Vui lòng tải lại tài liệu.');
      patch(file.key, { state: 'done', fileId: result.fileId }); return result.fileId;
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Tải tài liệu thất bại.'; patch(file.key, { state: 'error', error: message }); throw new Error(message); }
  }
  async function proceed(onlyFile?: Upload) {
    if (lock.current || !files.length || files.length > 10 || account?.role !== ACCOUNT_ROLE.STUDENT) return;
    const owner = account.id; lock.current = true; setBusy(true); setError(null);
    let creating = false;
    try {
      const ids: string[] = [];
      for (const file of onlyFile ? [onlyFile] : files) {
        if (tokenStorage.getSession()?.account?.id !== owner) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại màn hình.');
        ids.push(await upload(file));
      }
      if (onlyFile || !mounted.current || tokenStorage.getSession()?.account?.id !== owner) return;
      if (createdDraft.current) { openDraft(createdDraft.current); return; }
      creating = true;
      const draft = await externalProjectDraftService.create(ids);
      if (tokenStorage.getSession()?.account?.id !== owner) return;
      createdDraft.current = draft.draftId;
      try { await externalDraftShortcuts.add(owner, { draftId: draft.draftId, createdAt: draft.createdAt }); }
      catch { setStorageWarning(true); toast.error('Không lưu được lối tắt trên thiết bị. Giữ đường dẫn bản nháp để tiếp tục sau.'); }
      if (mounted.current) openDraft(draft.draftId);
    } catch (cause) {
      if (mounted.current) {
        const api = cause instanceof ApiError ? cause : null;
        const message = api?.code === 'INVALID_FILE_IDS' ? 'Tài liệu không hợp lệ hoặc không thuộc tài khoản hiện tại. Hãy kiểm tra và tải lại tài liệu.'
          : api?.code === 'DOCUMENT_REQUIRED' ? 'Cần ít nhất một tài liệu PDF có văn bản, DOCX hoặc TXT để đọc thông tin dự án.'
          : cause instanceof Error ? cause.message : 'Không thể tạo bản nháp.';
        setError(message + (creating && (!api?.status || api.status >= 500) ? ' Chưa xác định được yêu cầu tạo bản nháp đã được tiếp nhận hay chưa. Kiểm tra kết nối trước khi chủ động tạo lại.' : ''));
      }
    }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <ExternalProjectLayout step={1} onBack={() => { if (!busy) router.back(); }}>
    {!!saved.length && <View style={s.card}><Text style={s.heading}>Tiếp tục bản nháp</Text><Text style={s.small}>Chỉ hiển thị bản nháp đã lưu trên thiết bị này, theo tài khoản hiện tại. Bản nháp chưa xác nhận có hạn lưu 7 ngày.</Text>{saved.map(item => <Button key={item.draftId} variant="outline" disabled={busy} title={`Tiếp tục bản nháp · ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`} onPress={() => openDraft(item.draftId)} />)}</View>}
    <View style={s.card}><Text style={s.heading}>Tải tài liệu mô tả dự án</Text><Text style={s.body}>Hệ thống sẽ điền trước thông tin để bạn kiểm tra và bổ sung.</Text><Text style={s.small}>Chọn 1–10 tài liệu PDF có văn bản, DOCX hoặc TXT UTF-8; tối đa 10 MB/tài liệu. PDF scan và ảnh chụp chưa có OCR; một số tài liệu có thể không đọc được.</Text><Button title="Chọn tài liệu" variant="outline" onPress={() => void choose()} disabled={busy || files.length >= 10} />
      {files.map(file => <View key={file.key} style={s.file}><Text style={s.body}>{file.asset.name}</Text><Text style={s.small}>{((file.asset.size || 0) / 1024 / 1024).toFixed(2)} MB · {{ pending: 'Chưa tải', uploading: 'Đang tải', done: 'Đã tải', error: 'Lỗi' }[file.state]}</Text>{file.error && <Text style={s.error}>{file.error}</Text>}<View style={s.row}>{file.state === 'error' && <Button title="Tải lại" variant="outline" disabled={busy} onPress={() => void proceed(file)} />}<Pressable accessibilityRole="button" disabled={busy} onPress={() => { setFiles(previous => previous.filter(item => item.key !== file.key)); createdDraft.current = null; }}><Text style={s.link}>Loại khỏi danh sách</Text></Pressable></View></View>)}
    </View>
    {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{storageWarning && <Text style={s.error}>Thiết bị không lưu được lối tắt bản nháp. Giữ đường dẫn màn hình xem lại để tiếp tục.</Text>}
    <View style={s.row}><Button title="Quay lại" variant="outline" disabled={busy} onPress={() => router.back()} /><Button title="Tiếp tục" loading={busy} disabled={!files.length || files.length > 10} onPress={() => void proceed()} style={s.grow} /></View>
  </ExternalProjectLayout>;
}
