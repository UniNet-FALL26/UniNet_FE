import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { HubFile, HubProject } from '@/types/project-hub';
import { Field, messageOf, safeUrl } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, HubPanel, hubColors as c, ui } from './ProjectHubUI';
import { ProjectDocumentMenu } from './ProjectDocumentMenu';
import { PersonAvatar } from './ProjectCommunityModals';
import { downloadProjectFile, fileSize, uploadDate } from './ProjectResourceFiles';
import { ProjectMediaPlayer } from './ProjectMediaPlayer';

export function ProjectMediaPanel({ project, busy, error, onAdd, onUpdate }: {
  project: HubProject; busy: boolean; error: string; onAdd: () => void; onUpdate: (media: HubFile[]) => Promise<void>;
}) {
  const { width, height } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const [preview, setPreview] = useState<HubFile | null>(null), [info, setInfo] = useState<HubFile | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'rename' | 'delete'; index: number } | null>(null);
  const [name, setName] = useState(''), [actionError, setActionError] = useState(''), [previewError, setPreviewError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const locked = useRef(false);
  const disabled = busy || downloading;
  const files = project.details.media;
  const original = dialog ? files[dialog.index] : null;
  const dot = original?.name.lastIndexOf('.') ?? -1, extension = dot > 0 ? original!.name.slice(dot) : '';
  const itemWidth = gridWidth ? (width >= 768 ? (gridWidth - 12) / 2 : gridWidth) : undefined;
  function openPreview(file: HubFile) {
    if (!safeUrl(file.url)) { setActionError('Đường dẫn tệp không hợp lệ.'); return; }
    setPreviewError(''); setPreview(file);
  }
  async function action(kind: 'info' | 'preview' | 'download' | 'rename' | 'delete', index: number) {
    const file = files[index];
    if (!file || disabled) return;
    setActionError('');
    if (kind === 'info') { setInfo(file); return; }
    if (kind === 'preview') { openPreview(file); return; }
    if (kind === 'download') {
      setDownloading(true);
      try { await downloadProjectFile(file); } catch { setActionError('Không thể tải xuống tệp. Vui lòng thử lại.'); }
      finally { setDownloading(false); }
      return;
    }
    if (!project.isOwner) return;
    const split = file.name.lastIndexOf('.');
    setName(split > 0 ? file.name.slice(0, split) : file.name);
    setDialog({ kind, index });
  }
  function closeDialog() { if (!locked.current) { setDialog(null); setActionError(''); } }
  async function save() {
    if (!dialog || !original || !project.isOwner || disabled || locked.current) return;
    setActionError('');
    const trimmed = name.trim();
    if (dialog.kind === 'rename' && (!trimmed || trimmed.length + extension.length > 255 || /[\\/\u0000-\u001f]/.test(trimmed))) {
      setActionError('Nhập tên tệp hợp lệ, tối đa 255 ký tự và không chứa dấu / hoặc \\.'); return;
    }
    locked.current = true;
    try {
      await onUpdate(dialog.kind === 'delete' ? files.filter((_, index) => index !== dialog.index) : files.map((file, index) => index === dialog.index ? { ...file, name: trimmed + extension } : file));
      setDialog(null);
    } catch (cause) { setActionError(messageOf(cause)); }
    finally { locked.current = false; }
  }
  return <HubPanel compact title="Hình ảnh & Video demo" icon="image" action={(project.isOwner || project.isMember) && <Pressable accessibilityRole="button" accessibilityLabel="Tải lên hình ảnh hoặc video" accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onAdd} style={({ pressed }) => [s.iconButton, pressed && { backgroundColor: c.blueWash }, disabled && { opacity: 0.5 }]}>
    {busy ? <ActivityIndicator size="small" color={c.primary} /> : <HubIcon name="upload" size={21} />}
  </Pressable>}>
    {!files.length ? <View style={s.empty}><HubIcon name="image" size={38} /><Text style={ui.muted}>Chưa có hình ảnh hoặc video demo.</Text></View> : <View role="list" accessibilityLabel="Hình ảnh và video dự án" onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={s.grid}>
      {files.map((file, index) => <View key={`${file.url}-${index}`} role="listitem" style={[s.item, { width: itemWidth }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Xem trước ${file.name}`} onPress={() => openPreview(file)} style={s.thumbnail}>
          {file.type === 'image' && safeUrl(file.url) ? <Image accessibilityLabel={file.name} source={{ uri: file.url }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : <View style={s.videoPlaceholder}><HubIcon name="play" size={38} /><Text style={ui.muted}>Video demo</Text></View>}
        </Pressable>
        <View style={s.label}><Text numberOfLines={2} style={s.fileName}>{file.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Xem lớn ${file.name}`} onPress={() => openPreview(file)} style={s.iconButton}><HubIcon name="external" size={19} /></Pressable>
          <ProjectDocumentMenu name={file.name} owner={project.isOwner} disabled={disabled} deleteLabel="Xóa tệp" onAction={kind => void action(kind, index)} />
        </View>
      </View>)}
    </View>}
    {!!(error || (actionError && !dialog)) && <Text role="alert" style={ui.error}>{error || actionError}</Text>}
    {preview && <HubModal compact title="Xem hình ảnh và video" subtitle={preview.name} maxWidth={1000} icon={preview.type === 'video' ? 'play' : 'image'} onClose={() => setPreview(null)}>
      <View style={[s.preview, { height: Math.max(120, Math.min(560, height * 0.6)) }]}>
        {preview.type === 'image' ? <Image accessibilityLabel={preview.name} source={{ uri: preview.url }} resizeMode="contain" style={StyleSheet.absoluteFill} onError={() => setPreviewError('Không thể mở ảnh. Vui lòng thử lại.')} /> : <ProjectMediaPlayer key={preview.url} uri={preview.url} name={preview.name} onError={() => setPreviewError('Không thể phát video. Vui lòng thử lại.')} />}
      </View>
      {!!previewError && <Text role="alert" style={ui.error}>{previewError}</Text>}
    </HubModal>}
    {info && <HubModal compact wide={false} maxWidth={420} title="Thông tin tệp" icon="info" onClose={() => setInfo(null)} contentContainerStyle={{ gap: 14 }}>
      <View style={s.infoField}><Text style={ui.muted}>Tên tệp</Text><Text style={s.infoValue}>{info.name}</Text></View>
      <View style={s.infoField}><Text style={ui.muted}>Loại tệp</Text><Text style={s.infoValue}>{info.type === 'video' ? 'Video' : 'Hình ảnh'}</Text></View>
      <View style={s.infoField}><Text style={ui.muted}>Kích thước</Text><Text style={s.infoValue}>{fileSize(info.sizeBytes)}</Text></View>
      <View style={s.infoField}><Text style={ui.muted}>Người tải lên</Text><View style={s.person}>{info.uploadedBy && <PersonAvatar person={info.uploadedBy} size={28} />}<Text style={[s.infoValue, { flex: 1 }]}>{info.uploadedBy?.fullName || '—'}</Text></View></View>
      <View style={s.infoField}><Text style={ui.muted}>Ngày tải lên</Text><Text style={s.infoValue}>{uploadDate(info.uploadedAt)}</Text></View>
    </HubModal>}
    {dialog && <HubModal compact wide={false} maxWidth={420} title={dialog.kind === 'rename' ? 'Đổi tên tệp' : 'Xóa tệp?'} icon={dialog.kind === 'rename' ? 'edit' : 'trash'} onClose={closeDialog} footer={<><HubAction compact title="Hủy" disabled={busy} onPress={closeDialog} /><HubAction compact title={dialog.kind === 'rename' ? 'Lưu thay đổi' : 'Xóa tệp'} variant={dialog.kind === 'rename' ? 'primary' : 'danger'} busy={busy} onPress={() => void save()} /></>}>
      {dialog.kind === 'rename' ? <Field compact label="Tên tệp" value={name} onChange={setName} maxLength={255 - extension.length} hint={extension ? `Định dạng tệp được giữ nguyên: ${extension}` : undefined} /> : <Text style={ui.muted}>Xóa “{original?.name}” khỏi dự án?</Text>}
      {!!actionError && <Text role="alert" style={ui.error}>{actionError}</Text>}
    </HubModal>}
  </HubPanel>;
}

const s = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, minWidth: 0 },
  item: { borderWidth: 1, borderColor: c.line, borderRadius: 9, overflow: 'hidden', minWidth: 0 },
  thumbnail: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.canvas },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.blueWash },
  label: { flexDirection: 'row', paddingLeft: 12, paddingRight: 4, paddingVertical: 4, gap: 2, alignItems: 'center' },
  fileName: { flex: 1, minWidth: 0, color: c.ink, fontSize: 12, lineHeight: 19 },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 12 },
  preview: { width: '100%', backgroundColor: '#142033', overflow: 'hidden', borderRadius: 8 },
  infoField: { gap: 6 }, person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoValue: { fontSize: 13, lineHeight: 20, color: c.ink, ...(Platform.OS === 'web' ? { overflowWrap: 'anywhere' as const } : {}) },
});
