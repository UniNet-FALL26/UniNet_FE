import { uploadReportFile } from '@/services/report-file.service';
import { taskReportService } from '@/services/task-report.service';
import { toTaskEvidence, type TaskEvidence, type TaskReport } from '@/types/task-report';
import { parseReportContent, serializeReportContent } from '@/utils/report-content';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EvidenceList } from './EvidenceList';

type Props = {
  projectId: string; taskId: string; accessToken: string;
  initialReport?: TaskReport | null;
  onSaved: (report: TaskReport) => void; onCancel: () => void;
};

type PendingEvidenceFile = {
  id: string;
  uri: string;
  originalName: string;
  customName: string;
  extension: string;
  mimeType?: string | null;
  file?: File | null;
};

function splitFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  // Do not treat a leading dot (e.g. .env) as a file extension.
  if (dotIndex > 0) {
    return { customName: fileName.slice(0, dotIndex), extension: fileName.slice(dotIndex) };
  }
  return { customName: fileName, extension: '' };
}

export function ReportForm({ projectId, taskId, accessToken, initialReport, onSaved, onCancel }: Props) {
  const initialContent = parseReportContent(initialReport?.content);
  const [title, setTitle] = useState(initialContent.title);
  const [content, setContent] = useState(initialContent.body);
  const isRevision = initialReport?.status === 2;
  const [evidence, setEvidence] = useState<TaskEvidence[]>(initialReport?.evidence ?? []);
  const [pendingFiles, setPendingFiles] = useState<PendingEvidenceFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function chooseEvidence() {
    setError('');
    try {
      const selection = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
      if (selection.canceled) return;

      const selected = selection.assets.map((asset, index) => {
        const { customName, extension } = splitFileName(asset.name);
        return {
          id: `${Date.now()}-${index}-${asset.name}`,
          uri: asset.uri,
          originalName: asset.name,
          customName,
          extension,
          mimeType: asset.mimeType,
          file: asset.file,
        } as PendingEvidenceFile;
      });
      setPendingFiles(current => [...current, ...selected]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể chọn file minh chứng.');
    }
  }

  async function uploadPendingFiles() {
    if (pendingFiles.some(file => !file.customName.trim())) {
      setError('Vui lòng nhập tên cho tất cả file minh chứng đã chọn.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      // Upload in selection order. Only remove files from the pending list after
      // successful upload, so a failed upload can be retried by the user.
      for (const item of pendingFiles) {
        const uploadName = `${item.customName.trim()}${item.extension}`;
        const uploaded = await uploadReportFile({
          uri: item.uri,
          name: uploadName,
          mimeType: item.mimeType,
          file: item.file,
        }, accessToken);
        setEvidence(current => [...current, toTaskEvidence(uploaded)]);
        setPendingFiles(current => current.filter(file => file.id !== item.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải minh chứng lên.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const trimmedTitle = title.trim();
    const trimmedBody = content.trim();
    if (!trimmedTitle) { setError('Vui lòng nhập tên báo cáo.'); return; }
    if (!trimmedBody) { setError('Vui lòng nhập nội dung báo cáo.'); return; }
    const storedContent = serializeReportContent(trimmedTitle, trimmedBody);
    if (storedContent.length > 5000) {
      setError('Tên và nội dung báo cáo sau khi gộp không được vượt quá 5000 ký tự.');
      return;
    }
    if (pendingFiles.length > 0) {
      setError('Vui lòng tải lên hoặc xóa các file minh chứng đang chờ trước khi lưu.');
      return;
    }
    setBusy(true); setError('');
    try {
      const body = { content: storedContent, evidence };
      const saved = isRevision && initialReport
        ? await taskReportService.revise(projectId, taskId, initialReport.id, accessToken, body)
        : initialReport
          ? await taskReportService.updateDraft(projectId, taskId, initialReport.id, accessToken, body)
          : await taskReportService.createDraft(projectId, taskId, accessToken, body);
      onSaved(saved);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu báo cáo.'); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isRevision ? 'Chỉnh sửa báo cáo theo yêu cầu' : initialReport ? 'Chỉnh sửa bản nháp' : 'Tạo báo cáo nháp'}</Text>
      <Text style={styles.label}>Tên báo cáo</Text>
      <TextInput value={title} onChangeText={setTitle} maxLength={5000} editable={!busy} placeholder="Nhập tên báo cáo" style={styles.titleInput} />
      <Text style={styles.label}>Nội dung báo cáo</Text>
      <TextInput value={content} onChangeText={setContent} multiline maxLength={5000} editable={!busy}
        placeholder="Mô tả kết quả thực hiện, cách kiểm thử và những vấn đề còn lại..." style={styles.input} textAlignVertical="top" />
      <Text style={styles.counter}>{serializeReportContent(title, content).length}/5000 ký tự đã lưu</Text>

      <View style={styles.sectionHead}>
        <Text style={styles.label}>Minh chứng</Text>
        <Text style={styles.muted}>Ảnh, tài liệu hoặc video</Text>
      </View>
      <EvidenceList items={evidence} onRemove={index => setEvidence(current => current.filter((_, i) => i !== index))} />

      {pendingFiles.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>File đã chọn — đổi tên trước khi upload</Text>
          {pendingFiles.map(item => (
            <View key={item.id} style={styles.pendingCard}>
              <Text style={styles.originalName} numberOfLines={1}>Tên gốc: {item.originalName}</Text>
              <Text style={styles.label}>Tên file mới</Text>
              <View style={styles.renameRow}>
                <TextInput
                  value={item.customName}
                  onChangeText={value => setPendingFiles(current => current.map(file =>
                    file.id === item.id ? { ...file, customName: value } : file
                  ))}
                  editable={!busy}
                  placeholder="Nhập tên file"
                  style={styles.renameInput}
                  accessibilityLabel={`Tên mới của ${item.originalName}`}
                  autoCapitalize="none"
                />
                {item.extension ? <Text style={styles.extension}>{item.extension}</Text> : null}
              </View>
              <Pressable
                onPress={() => setPendingFiles(current => current.filter(file => file.id !== item.id))}
                disabled={busy}
                style={styles.removePending}
              >
                <Text style={styles.removePendingText}>Xóa khỏi danh sách chờ</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={uploadPendingFiles} disabled={busy} style={[styles.primary, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Upload {pendingFiles.length} file đã chọn</Text>}
          </Pressable>
        </View>
      )}

      <Pressable onPress={chooseEvidence} disabled={busy} style={[styles.secondaryButton, busy && styles.disabled]}>
        {busy ? <ActivityIndicator /> : <Text style={styles.secondaryText}>+ Chọn file minh chứng</Text>}
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} disabled={busy} style={styles.cancel}><Text style={styles.cancelText}>Hủy</Text></Pressable>
        <Pressable onPress={saveDraft} disabled={busy || pendingFiles.length > 0} style={[styles.primary, (busy || pendingFiles.length > 0) && styles.disabled]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isRevision ? 'Gửi lại báo cáo' : 'Lưu bản nháp'}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, borderWidth: 1, borderColor: '#E1E6ED', borderRadius: 14, padding: 16, backgroundColor: '#FFFFFF' },
  title: { color: '#172033', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  label: { color: '#273449', fontWeight: '600' },
  titleInput: { minHeight: 44, borderWidth: 1, borderColor: '#D3DAE4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#172033' },
  input: { minHeight: 150, borderWidth: 1, borderColor: '#D3DAE4', borderRadius: 10, padding: 12, color: '#172033' },
  counter: { color: '#687386', fontSize: 12, textAlign: 'right', marginTop: -5 },
  sectionHead: { gap: 3, marginTop: 4 }, muted: { color: '#687386', fontSize: 12 },
  secondaryButton: { borderWidth: 1, borderColor: '#B8C5D6', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryText: { color: '#234B83', fontWeight: '600' },
  pendingSection: { gap: 10, borderWidth: 1, borderColor: '#D3DAE4', borderRadius: 12, padding: 12, backgroundColor: '#F8FAFC' },
  pendingTitle: { color: '#172033', fontWeight: '700' },
  pendingCard: { gap: 7, borderWidth: 1, borderColor: '#E1E6ED', borderRadius: 10, padding: 10, backgroundColor: '#FFFFFF' },
  originalName: { color: '#687386', fontSize: 12 },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  renameInput: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#D3DAE4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, color: '#172033', backgroundColor: '#FFFFFF' },
  extension: { color: '#344054', fontWeight: '600' },
  removePending: { alignSelf: 'flex-start', paddingVertical: 4 },
  removePendingText: { color: '#B42318', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancel: { paddingHorizontal: 14, paddingVertical: 11 }, cancelText: { color: '#344054', fontWeight: '600' },
  primary: { backgroundColor: '#2459A9', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, minWidth: 130, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.6 }, error: { color: '#B42318', fontSize: 13 },
});
