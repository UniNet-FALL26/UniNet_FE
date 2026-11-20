import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { HubAction, HubIcon, HubModal } from '@/components/projects/hub/ProjectHubUI';
import { messagingService } from '@/services/messaging.service';
import { downloadChatAttachment } from '@/utils/download-chat-attachment';
import { documentPresentation, formatChatFileSize } from '@/utils/chat-files';
import type { ChatAttachment as Attachment, ChatConversation } from '@/types/messaging';
import { ChatAttachment } from './ChatAttachment';
import { ChatImageViewer } from './ChatImageViewer';
import { ChatDocumentIcon } from './ChatDocumentIcon';
import { ChatMediaThumbnail } from './ChatMediaThumbnail';

const sections = [
  { id: 'images', title: 'Ảnh', type: 0, icon: 'image' },
  { id: 'videos', title: 'Video', type: 1, icon: 'play' },
  { id: 'documents', title: 'Tài liệu', type: 2, icon: 'document' },
] as const;
type Filter = 'all' | typeof sections[number]['id'];

export function SharedChatFiles({ conversation, onClose }: { conversation: ChatConversation; onClose: () => void }) {
  const [files, setFiles] = useState<Attachment[]>([]), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true), [more, setMore] = useState(false), [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all'), [selected, setSelected] = useState<string[]>([]), [preview, setPreview] = useState<Attachment | null>(null);
  const [downloading, setDownloading] = useState(false); const downloadLock = useRef(false);
  const { width } = useWindowDimensions(); const compact = width < 680;
  useEffect(() => {
    const controller = new AbortController();
    messagingService.files(conversation.id, page, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setFiles(old => page === 1 ? result : [...old, ...result.filter(file => !old.some(existing => existing.id === file.id))]); setMore(result.length === 30);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chưa tải được file.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [conversation.id, page, attempt]);
  const groups = { images: files.filter(file => file.fileType === 0), videos: files.filter(file => file.fileType === 1), documents: files.filter(file => file.fileType === 2) };
  const scope = filter === 'all' ? files : groups[filter];
  const allSelected = scope.length > 0 && scope.every(file => selected.includes(file.id));
  const toggle = (id: string) => setSelected(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]);
  async function download(items: Attachment[]) {
    if (downloadLock.current || !items.length) return;
    downloadLock.current = true; setDownloading(true); setError('');
    try { for (const file of items) await downloadChatAttachment(file); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải xuống được file. Vui lòng thử lại.'); }
    finally { downloadLock.current = false; setDownloading(false); }
  }
  const checkbox = (checked: boolean, label: string, onPress: () => void) => <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onPress} disabled={downloading} style={s.checkbox}><SymbolView name={checked ? { ios: 'checkmark.square.fill', android: 'check_box', web: 'check_box' } : { ios: 'square', android: 'check_box_outline_blank', web: 'check_box_outline_blank' }} size={18} tintColor={checked ? '#1769FF' : '#9AA8BE'} /></Pressable>;
  if (preview?.fileType === 0) return <ChatImageViewer file={preview} onClose={() => setPreview(null)} />;
  if (preview) return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={640} title={preview.fileName} onClose={() => setPreview(null)}><View style={s.preview}><ChatAttachment file={preview} /></View></HubModal>;
  return <HubModal appearance="chat" dismissControl="back" compact wide={false} maxWidth={960} title="Ảnh, video và tài liệu" icon="image" onClose={() => { if (!downloadLock.current) onClose(); }} contentContainerStyle={s.modalBody}>
    <View style={[s.layout, compact && s.compactLayout]}>
      <View accessibilityRole="tablist" accessibilityLabel="Loại file đã chia sẻ" style={[s.sidebar, compact && s.compactSidebar]}>
        {[{ id: 'all' as const, title: 'Tất cả', icon: 'layers' as const, count: files.length }, ...sections.map(section => ({ ...section, count: groups[section.id].length }))].map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.title} aria-selected={filter === tab.id} accessibilityState={{ selected: filter === tab.id }} onPress={() => setFilter(tab.id)} style={[s.tab, compact && s.compactTab, filter === tab.id && s.activeTab]}><HubIcon name={tab.icon} size={17} color={filter === tab.id ? '#1769FF' : '#6B7E9A'} /><Text style={[s.tabLabel, filter === tab.id && s.activeText]}>{tab.title}</Text><Text style={[s.count, filter === tab.id && s.activeText]}>{tab.count}</Text></Pressable>)}
      </View>
      <View style={s.main}>
        <View style={s.toolbar}><View style={s.selection}>{checkbox(allSelected, 'Chọn tất cả file đã tải trong mục này', () => setSelected(old => allSelected ? old.filter(id => !scope.some(file => file.id === id)) : [...new Set([...old, ...scope.map(file => file.id)])]))}<Text style={s.selectionText}>Đã chọn {selected.length}</Text></View><HubAction compact title="Tải xuống" icon="save" disabled={!selected.length || downloading} busy={downloading} onPress={() => { void download(files.filter(file => selected.includes(file.id))); }} style={s.downloadButton} /></View>
        {sections.filter(section => (!loading || files.length > 0) && (filter === 'all' || filter === section.id)).map(section => {
          const items = groups[section.id], limit = section.type === 0 ? 6 : section.type === 1 ? 4 : 3;
          const visible = filter === 'all' ? items.slice(0, limit) : items;
          const columns = compact ? (width < 420 ? 2 : 3) : section.type === 0 ? 6 : 4;
          return <View key={section.id} style={s.section}>
            <View style={s.sectionHead}><HubIcon name={section.icon} size={18} /><Text accessibilityRole="header" aria-level={3} style={s.sectionTitle}>{section.title} ({items.length})</Text>{filter === 'all' && items.length > limit && <Pressable accessibilityRole="button" accessibilityLabel={`Xem tất cả ${section.title.toLowerCase()}`} onPress={() => setFilter(section.id)} style={s.viewAll}><Text style={s.viewAllText}>Xem tất cả</Text><HubIcon name="next" size={12} /></Pressable>}</View>
            {!items.length ? <Text style={s.empty}>Chưa có {section.title.toLowerCase()} trong các mục đã tải.</Text> : section.type === 2 ? <View style={s.documents}>{visible.map(file => <View key={file.id} style={[s.document, selected.includes(file.id) && s.selectedDocument]}>
              {checkbox(selected.includes(file.id), `Chọn ${file.fileName}`, () => toggle(file.id))}
              <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${file.fileName}`} onPress={() => setPreview(file)} style={s.documentOpen}><ChatDocumentIcon name={file.fileName} mimeType={file.mimeType} size={26} /><View style={s.documentCopy}><Text style={s.fileName} numberOfLines={1}>{file.fileName}</Text><Text style={s.fileMeta}>{documentPresentation(file.fileName, file.mimeType).label} · {formatChatFileSize(file.fileSize)}</Text></View></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Tải ${file.fileName}`} disabled={downloading} onPress={() => { void download([file]); }} style={s.downloadIcon}><HubIcon name="save" size={18} /></Pressable>
            </View>)}</View> : <View style={s.grid}>{visible.map((file, index) => {
              const overflow = filter === 'all' && index === limit - 1 && items.length > limit;
              return <View key={file.id} style={{ width: `${100 / columns}%`, padding: 4 }}><View style={[s.tile, { aspectRatio: section.type === 0 ? 1.1 : 1.6 }, selected.includes(file.id) && s.selectedTile]}>
                <Pressable accessibilityRole="button" accessibilityLabel={overflow ? `Xem tất cả ${section.title.toLowerCase()}` : `Xem ${file.fileName}`} onPress={() => overflow ? setFilter(section.id) : setPreview(file)} style={s.thumbnail}><ChatMediaThumbnail key={`${file.id}:${file.fileUrl}`} file={file} />{overflow && <View style={s.overflow}><Text style={s.overflowText}>+{items.length - limit + 1}</Text></View>}</Pressable>
                {!overflow && <View style={s.tileCheckbox}>{checkbox(selected.includes(file.id), `Chọn ${file.fileName}`, () => toggle(file.id))}</View>}
              </View></View>;
            })}</View>}
          </View>;
        })}
        {loading && <ActivityIndicator accessibilityLabel="Đang tải file đã chia sẻ" color="#1769FF" style={s.loading} />}
        {!!error && <View style={s.errorBox}><Text role="alert" style={s.error}>{error}</Text>{!downloading && <HubAction compact title="Thử lại" onPress={() => { setError(''); setLoading(true); setAttempt(value => value + 1); }} />}</View>}
        {more && !loading && !error && <HubAction compact title="Tải thêm file" onPress={() => { setLoading(true); setPage(value => value + 1); }} />}
        {!loading && files.length > 0 && <Text style={s.loadedCount}>Đã tải {files.length} mục{more ? ' · Còn file khác trong cuộc trò chuyện' : ''}</Text>}
      </View>
    </View>
  </HubModal>;
}
const s = StyleSheet.create({
  modalBody: { padding: 0 }, layout: { flexDirection: 'row', minHeight: 440 }, compactLayout: { flexDirection: 'column', minHeight: 0 },
  sidebar: { width: 144, padding: 10, gap: 6, backgroundColor: '#F7F9FD', borderRightWidth: 1, borderColor: '#E8EDF5' },
  compactSidebar: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', borderRightWidth: 0, borderBottomWidth: 1, padding: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36, paddingHorizontal: 9, borderRadius: 8 }, compactTab: { flexGrow: 1, flexBasis: '40%' },
  activeTab: { backgroundColor: '#E8F0FF' }, tabLabel: { flex: 1, fontSize: 12, color: '#435A7A', fontWeight: '500' }, count: { fontSize: 11, color: '#8190A6' }, activeText: { color: '#1769FF' },
  main: { flex: 1, minWidth: 0, padding: 16, gap: 18 }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#EDF1F7' },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 3 }, selectionText: { fontSize: 12, color: '#435A7A' }, checkbox: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  downloadButton: { minHeight: 30, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#F1F5FB', borderColor: '#E8EDF5' },
  section: { gap: 8 }, sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7 }, sectionTitle: { fontSize: 13, fontWeight: '700', color: '#203653', flex: 1 }, viewAll: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 }, viewAllText: { fontSize: 11, color: '#1769FF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 }, tile: { borderRadius: 9, overflow: 'hidden', backgroundColor: '#EDF2F8', borderWidth: 2, borderColor: 'transparent' }, selectedTile: { borderColor: '#1769FF' }, thumbnail: { flex: 1 },
  tileCheckbox: { position: 'absolute', top: 3, left: 3, backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 6 }, overflow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(19,33,53,0.62)', alignItems: 'center', justifyContent: 'center' }, overflowText: { fontSize: 23, color: '#FFFFFF', fontWeight: '600' },
  documents: { borderWidth: 1, borderColor: '#E7EDF6', borderRadius: 10, overflow: 'hidden' }, document: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderBottomWidth: 1, borderColor: '#EDF1F7' }, selectedDocument: { backgroundColor: '#F0F6FF' },
  documentOpen: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, documentCopy: { flex: 1, minWidth: 0, gap: 3 }, fileName: { fontSize: 12, lineHeight: 17, color: '#203653', fontWeight: '500' }, fileMeta: { fontSize: 10, color: '#8190A6' }, downloadIcon: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 14, color: '#8B98AD', fontSize: 12 }, loading: { margin: 12 }, errorBox: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#FFF4F4' }, error: { color: '#B8324D', fontSize: 12 }, loadedCount: { color: '#8190A6', fontSize: 10, textAlign: 'center' }, preview: { alignItems: 'center' },
});
