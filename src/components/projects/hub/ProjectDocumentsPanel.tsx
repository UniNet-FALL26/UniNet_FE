import { fileSize, uploadDate, downloadProjectFile } from './ProjectResourceFiles';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { HubFile, HubProject } from '@/types/project-hub';
import { Field, messageOf, openProjectUrl } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';
import { ProjectDocumentMenu } from './ProjectDocumentMenu';
import { PersonAvatar } from './ProjectCommunityModals';

function fileFormat(name: string) {
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  if (['doc', 'docx'].includes(extension)) return { label: 'Word', letter: 'W', color: '#1769E0', wash: '#EAF3FF' };
  if (extension === 'pdf') return { label: 'PDF', letter: 'PDF', color: '#E33B48', wash: '#FFEDF0' };
  if (['xls', 'xlsx', 'csv'].includes(extension)) return { label: 'Excel', letter: 'X', color: '#16985B', wash: '#E6F7EE' };
  if (['ppt', 'pptx'].includes(extension)) return { label: 'PowerPoint', letter: 'P', color: '#EC712A', wash: '#FFF0E6' };
  return { label: extension.toUpperCase() || 'Tệp', letter: extension.slice(0, 3).toUpperCase() || 'FILE', color: c.textSecondary, wash: '#EFF2F7' };
}
function Checkbox({ label, checked, disabled, onPress }: { label: string; checked: boolean | 'mixed'; disabled: boolean; onPress: () => void }) {
  return <Pressable role="checkbox" aria-checked={checked} accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={s.checkboxHit}>
    <View style={[s.checkbox, checked !== false && { backgroundColor: c.primary, borderColor: c.primary }]}>{checked !== false && <Text style={s.checkMark}>{checked === 'mixed' ? '−' : '✓'}</Text>}</View>
  </Pressable>;
}

export function ProjectDocumentsPanel({ project, busy, error, onAdd, onUpdate }: {
  project: HubProject; busy: boolean; error: string; onAdd: () => void; onUpdate: (documents: HubFile[]) => Promise<void>;
}) {
  const files = project.details.documents;
  const [page, setPage] = useState(1), [tableWidth, setTableWidth] = useState(0);
  const { width } = useWindowDimensions();
  const compact = (tableWidth || width - 34) < 850;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<{ kind: 'rename' | 'delete'; indices: number[] } | null>(null);
  const [infoFile, setInfoFile] = useState<HubFile | null>(null);
  const [name, setName] = useState(''), [actionError, setActionError] = useState(''), [downloading, setDownloading] = useState(false);
  const locked = useRef(false);
  const disabled = busy || downloading;
  const pageCount = Math.max(1, Math.ceil(files.length / 10)), current = Math.min(page, pageCount), start = (current - 1) * 10;
  const rows = files.slice(start, start + 10), pageIndices = rows.map((_, index) => start + index);
  const checked = pageIndices.length > 0 && pageIndices.every(index => selected.has(index));
  const mixed = !checked && pageIndices.some(index => selected.has(index));
  const originalName = dialog?.kind === 'rename' ? files[dialog.indices[0]]?.name ?? '' : '';
  const dot = originalName.lastIndexOf('.'), extension = dot > 0 ? originalName.slice(dot) : '';
  const close = () => { if (!locked.current) { setDialog(null); setActionError(''); } };
  async function save() {
    if (!dialog || locked.current || busy || !project.isOwner) return;
    setActionError('');
    const trimmed = name.trim();
    if (dialog.kind === 'rename' && (!trimmed || trimmed.length + extension.length > 255 || /[\\/\u0000-\u001f]/.test(trimmed))) {
      setActionError('Nhập tên tài liệu hợp lệ, tối đa 255 ký tự và không chứa dấu / hoặc \\.'); return;
    }
    locked.current = true;
    try {
      const targets = new Set(dialog.indices);
      await onUpdate(dialog.kind === 'delete' ? files.filter((_, index) => !targets.has(index)) : files.map((file, index) => targets.has(index) ? { ...file, name: trimmed + extension } : file));
      setDialog(null); setSelected(new Set());
    } catch (cause) { setActionError(messageOf(cause)); }
    finally { locked.current = false; }
  }
  async function action(kind: 'info' | 'preview' | 'download' | 'rename' | 'delete', index: number) {
    const file = files[index]; if (!file || disabled) return;
    setActionError('');
    if (kind === 'info') { setInfoFile(file); return; }
    if (kind === 'preview') { openProjectUrl(file.url); return; }
    if (kind === 'download') {
      setDownloading(true);
      try { await downloadProjectFile(file); } catch { setActionError('Không thể tải xuống tài liệu. Bạn có thể mở tệp bằng “Xem trước”.'); }
      finally { setDownloading(false); }
      return;
    }
    if (!project.isOwner) return;
    if (kind === 'rename') { const split = file.name.lastIndexOf('.'); setName(split > 0 ? file.name.slice(0, split) : file.name); }
    setDialog({ kind, indices: [index] });
  }
  return <View role="region" accessibilityLabel="Tài liệu dự án" onLayout={event => setTableWidth(event.nativeEvent.layout.width - 34)} style={s.panel}>
    <View style={s.header}>
      <View style={s.heading}><HubIcon name="document" size={21} /><Text accessibilityRole="header" aria-level={2} style={[s.title, { flex: 1 }]}>Tài liệu dự án</Text>
        {(project.isOwner || project.isMember) && <Pressable accessibilityRole="button" accessibilityLabel="Tải lên tài liệu" accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onAdd} style={({ pressed }) => [s.uploadButton, pressed && { backgroundColor: c.blueWash }, disabled && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator size="small" color={c.primary} /> : <HubIcon name="upload" size={21} />}
        </Pressable>}
      </View>
    </View>
    {!compact && project.isOwner && selected.size > 0 && <View style={s.selection}><Text style={s.subtitle}>Đã chọn {selected.size} tài liệu</Text><HubAction compact title="Xóa đã chọn" icon="trash" variant="danger" disabled={disabled} onPress={() => { setActionError(''); setDialog({ kind: 'delete', indices: [...selected] }); }} /></View>}
    {!files.length ? <View style={s.empty}><HubIcon name="document" size={32} /><Text style={s.subtitle}>Chưa có tài liệu được chia sẻ.</Text></View> : compact ? <View role="list" accessibilityLabel="Tài liệu dự án" style={s.mobileList}>
      {rows.map((file, index) => {
        const fileIndex = start + index, format = fileFormat(file.name);
        return <View key={`${file.url}-${fileIndex}`} role="listitem" style={s.mobileFile}>
          <View style={s.mobileFileTop}>
            <View style={[s.fileIcon, s.mobileFileIcon, { backgroundColor: format.color }]}><Text style={s.fileLetter}>{format.letter}</Text></View>
            <Pressable accessibilityRole="link" accessibilityLabel={`Mở ${file.name}`} onPress={() => openProjectUrl(file.url)} style={s.mobileFileLink}><Text style={[s.fileName, s.mobileFileName]}>{file.name}</Text></Pressable>
            <ProjectDocumentMenu name={file.name} owner={project.isOwner} disabled={disabled} onAction={kind => void action(kind, fileIndex)} />
          </View>
        </View>;
      })}
    </View> : <View role="table" accessibilityLabel="Tài liệu dự án" style={s.table}>
          <View role="row" style={[s.row, s.tableHeader]}>
            {project.isOwner && <View role="columnheader" style={s.checkCell}><Checkbox label="Chọn tất cả tài liệu trang này" checked={checked || (mixed ? 'mixed' : false)} disabled={disabled} onPress={() => setSelected(previous => { const next = new Set(previous); pageIndices.forEach(index => checked ? next.delete(index) : next.add(index)); return next; })} /></View>}
            {(['Tên tài liệu', 'Loại', 'Kích thước', 'Người tải lên', 'Ngày tải lên', 'Thao tác'] as const).map((label, index) => <View key={label} role="columnheader" accessibilityLabel={label} style={[s.cell, [s.fileCell, s.typeCell, s.sizeCell, s.personCell, s.dateCell, s.actionCell][index]]}><Text style={s.columnTitle}>{label}</Text></View>)}
          </View>
          {rows.map((file, index) => {
            const fileIndex = start + index, format = fileFormat(file.name);
            return <View key={`${file.url}-${fileIndex}`} role="row" style={[s.row, selected.has(fileIndex) && { backgroundColor: '#F5F8FF' }]}>
              {project.isOwner && <View role="cell" style={s.checkCell}><Checkbox label={`Chọn ${file.name}`} checked={selected.has(fileIndex)} disabled={disabled} onPress={() => setSelected(previous => { const next = new Set(previous); if (next.has(fileIndex)) next.delete(fileIndex); else next.add(fileIndex); return next; })} /></View>}
              <View role="cell" style={[s.cell, s.fileCell]}><View style={[s.fileIcon, { backgroundColor: format.color }]}><Text style={s.fileLetter}>{format.letter}</Text></View><Pressable accessibilityRole="link" accessibilityLabel={`Mở ${file.name}`} onPress={() => openProjectUrl(file.url)} style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={s.fileName}>{file.name}</Text></Pressable></View>
              <View role="cell" style={[s.cell, s.typeCell]}><View style={[s.badge, { backgroundColor: format.wash }]}><Text style={[s.badgeText, { color: format.color }]}>{format.label}</Text></View></View>
              <View role="cell" style={[s.cell, s.sizeCell]}><Text style={s.metadata}>{fileSize(file.sizeBytes)}</Text></View>
              <View role="cell" style={[s.cell, s.personCell]}>{file.uploadedBy ? <View style={s.uploader}><PersonAvatar person={file.uploadedBy} size={22} /><Text numberOfLines={1} style={[s.metadata, { flex: 1 }]}>{file.uploadedBy.fullName}</Text></View> : <Text style={s.metadata}>—</Text>}</View>
              <View role="cell" style={[s.cell, s.dateCell]}><Text style={s.metadata}>{uploadDate(file.uploadedAt)}</Text></View>
              <View role="cell" style={[s.cell, s.actionCell]}><ProjectDocumentMenu name={file.name} owner={project.isOwner} disabled={disabled} onAction={kind => void action(kind, fileIndex)} /></View>
            </View>;
          })}
    </View>}
    {!!(error || (actionError && !dialog)) && <Text role="alert" style={ui.error}>{error || actionError}</Text>}
    <View style={[s.footer, compact && s.mobileFooter]}><Text style={s.subtitle}>{files.length ? `Hiển thị ${start + 1} – ${Math.min(start + 10, files.length)} của ${files.length} tài liệu` : '0 tài liệu'}</Text>
      <View style={[s.pagination, compact && s.mobilePagination]}><Text style={s.subtitle}>10 / trang</Text><Pressable accessibilityRole="button" accessibilityLabel="Trang tài liệu trước" accessibilityState={{ disabled: current <= 1 }} disabled={current <= 1} onPress={() => setPage(current - 1)} style={[s.pageButton, compact && s.mobilePageButton, current <= 1 && { opacity: 0.4 }]}><HubIcon name="back" size={15} /></Pressable><Text style={s.pageNumber}>{current} / {pageCount}</Text><Pressable accessibilityRole="button" accessibilityLabel="Trang tài liệu sau" accessibilityState={{ disabled: current >= pageCount }} disabled={current >= pageCount} onPress={() => setPage(current + 1)} style={[s.pageButton, compact && s.mobilePageButton, current >= pageCount && { opacity: 0.4 }]}><HubIcon name="next" size={15} /></Pressable></View>
    </View>
    {infoFile && <HubModal compact wide={false} maxWidth={420} icon="info" title="Thông tin tài liệu" contentContainerStyle={{ gap: 14 }} onClose={() => setInfoFile(null)} footer={<HubAction compact title="Đóng" onPress={() => setInfoFile(null)} />}>
      <View style={s.infoField}><Text style={s.subtitle}>Tên tài liệu</Text><Text style={[s.infoValue, s.mobileFileName]}>{infoFile.name}</Text></View>
      <View style={s.infoField}><Text style={s.subtitle}>Loại tài liệu</Text><Text style={s.infoValue}>{fileFormat(infoFile.name).label}</Text></View>
      <View style={s.infoField}><Text style={s.subtitle}>Kích thước</Text><Text style={s.infoValue}>{fileSize(infoFile.sizeBytes)}</Text></View>
      <View style={s.infoField}><Text style={s.subtitle}>Người tải lên</Text><View style={s.uploader}>{infoFile.uploadedBy && <PersonAvatar person={infoFile.uploadedBy} size={28} />}<Text style={s.infoValue}>{infoFile.uploadedBy?.fullName || '—'}</Text></View></View>
      <View style={s.infoField}><Text style={s.subtitle}>Ngày tải lên</Text><Text style={s.infoValue}>{uploadDate(infoFile.uploadedAt)}</Text></View>
    </HubModal>}
    {dialog && <HubModal compact wide={false} maxWidth={420} icon={dialog.kind === 'rename' ? 'edit' : 'trash'} title={dialog.kind === 'rename' ? 'Đổi tên tài liệu' : 'Xóa tài liệu?'} onClose={close} footer={<><HubAction compact title="Hủy" disabled={busy} onPress={close} /><HubAction compact title={dialog.kind === 'rename' ? 'Lưu thay đổi' : 'Xóa tài liệu'} variant={dialog.kind === 'rename' ? 'primary' : 'danger'} busy={busy} onPress={() => void save()} /></>}>
      {dialog.kind === 'rename' ? <Field compact label="Tên tài liệu" value={name} onChange={setName} maxLength={255 - extension.length} hint={extension ? `Định dạng tệp được giữ nguyên: ${extension}` : undefined} /> : <Text style={ui.muted}>Xóa {dialog.indices.length === 1 ? `“${files[dialog.indices[0]]?.name}”` : `${dialog.indices.length} tài liệu đã chọn`} khỏi dự án?</Text>}
      {!!actionError && <Text role="alert" style={ui.error}>{actionError}</Text>}
    </HubModal>}
  </View>;
}

const s = StyleSheet.create({
  panel: { padding: 16, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.surface, gap: 18, minWidth: 0 },
  table: { width: '100%', minWidth: 0 },
  mobileList: { minWidth: 0 },
  mobileFile: { borderBottomWidth: 1, borderColor: c.line, paddingVertical: 12, minWidth: 0 },
  mobileFileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mobileFileIcon: { width: 28, height: 36, marginTop: 4 },
  mobileFileLink: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  mobileFileName: { fontSize: 13, lineHeight: 20, ...(Platform.OS === 'web' ? { overflowWrap: 'anywhere' as const } : {}) },
  infoField: { gap: 6 }, infoValue: { fontSize: 13, lineHeight: 20, color: c.ink, flexShrink: 1 },
  mobilePageButton: { width: 44, height: 44 }, mobilePagination: { justifyContent: 'space-between' },
  mobileFooter: { flexDirection: 'column', alignItems: 'stretch' },
  header: { gap: 4 },
  uploadButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  heading: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }, title: { fontSize: 15, fontWeight: '700', color: c.ink }, subtitle: { fontSize: 11, lineHeight: 17, color: c.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderBottomWidth: 1, borderColor: '#EAF0FA', minHeight: 48 }, tableHeader: { minHeight: 38, backgroundColor: '#F0F5FD', borderRadius: 7 },
  cell: { paddingHorizontal: 8, justifyContent: 'center' }, checkCell: { width: 44 }, fileCell: { flex: 1, minWidth: 230, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'flex-start' }, typeCell: { width: 104 }, sizeCell: { width: 85 }, personCell: { width: 125 }, dateCell: { width: 130 }, actionCell: { width: 70, alignItems: 'center' },
  columnTitle: { fontSize: 11, fontWeight: '600', color: '#3F5170' }, fileIcon: { width: 20, height: 25, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }, fileLetter: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' }, fileName: { fontSize: 12, fontWeight: '500', color: c.ink },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }, badgeText: { fontSize: 10, fontWeight: '500' }, metadata: { fontSize: 11, color: c.ink }, uploader: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  checkboxHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: '#B4C1D5', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }, checkMark: { fontSize: 10, color: '#FFFFFF', lineHeight: 12 },
  selection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }, empty: { paddingVertical: 36, gap: 12, alignItems: 'center' }, footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }, pagination: { flexDirection: 'row', gap: 8, alignItems: 'center' }, pageButton: { width: 28, height: 28, borderWidth: 1, borderColor: c.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, pageNumber: { fontSize: 11, color: c.primary, paddingHorizontal: 7, paddingVertical: 5, borderWidth: 1, borderColor: '#AEC8FF', borderRadius: 6 },
});
