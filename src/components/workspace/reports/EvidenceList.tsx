import type { TaskEvidence } from '@/types/task-report';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = { items: TaskEvidence[]; onRemove?: (index: number) => void };

function getEvidenceUrl(fileUrl: string) {
  const value = (fileUrl ?? '').trim();
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

function getFileKind(item: TaskEvidence): 'image' | 'pdf' | 'office' | 'video' | 'other' {
  const fileName = (item.fileName ?? '').toLowerCase();
  const format = (item.format ?? '').toLowerCase();
  const resourceType = (item.resourceType ?? '').toLowerCase();
  const url = (item.fileUrl ?? '').toLowerCase().split('?')[0];
  const ext = `${fileName} ${format} ${url}`;

  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\s|$)/.test(ext) || format.startsWith('image/')) return 'image';
  if (/\.pdf(\s|$)/.test(ext) || format.includes('pdf')) return 'pdf';
  if (/\.(docx?|xlsx?|pptx?)(\s|$)/.test(ext) || /word|spreadsheet|presentation|officedocument/.test(format)) return 'office';
  if (resourceType === 'video' || /\.(mp4|webm|mov|m4v)(\s|$)/.test(ext) || format.startsWith('video/')) return 'video';
  return 'other';
}

function getGoogleViewerUrl(url: string) {
  // Google Viewer requires a publicly reachable URL. This is used for document preview,
  // while the original URL remains available through the separate download action.
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
}

export function EvidenceList({ items, onRemove }: Props) {
  const [preview, setPreview] = useState<{ url: string; name: string; kind: ReturnType<typeof getFileKind> } | null>(null);

  const openEvidence = async (item: TaskEvidence) => {
    const url = getEvidenceUrl(item.fileUrl ?? '');
    if (!url) {
      Alert.alert('Không thể mở file', 'File minh chứng chưa có đường dẫn hợp lệ.');
      return;
    }

    const kind = getFileKind(item);
    const name = item.fileName || 'File minh chứng';
    if (kind === 'image') {
      setPreview({ url, name, kind });
      return;
    }

    try {
      const viewUrl = kind === 'pdf' || kind === 'office' ? getGoogleViewerUrl(url) : url;
      await Linking.openURL(viewUrl);
    } catch {
      Alert.alert(
        'Không thể mở file',
        'Không mở được file. Hãy kiểm tra đường dẫn và quyền truy cập của file minh chứng.',
      );
    }
  };

  const downloadEvidence = async (item: TaskEvidence) => {
    const url = getEvidenceUrl(item.fileUrl ?? '');
    if (!url) {
      Alert.alert('Không thể tải file', 'File minh chứng chưa có đường dẫn hợp lệ.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Không thể tải file', 'Không mở được đường dẫn tải file minh chứng.');
    }
  };

  if (!items.length) return <Text style={styles.muted}>Chưa có minh chứng.</Text>;

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${item.fileUrl}-${index}`} style={styles.item}>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>{item.fileName || item.fileUrl || 'File minh chứng'}</Text>
            <Text style={styles.meta}>{item.format || item.resourceType || 'Tệp đính kèm'}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem file ${item.fileName || 'minh chứng'}`}
                onPress={() => void openEvidence(item)}
                style={styles.viewButton}
              >
                <Text style={styles.viewText}>Xem file</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Tải file ${item.fileName || 'minh chứng'}`}
                onPress={() => void downloadEvidence(item)}
                style={styles.downloadButton}
              >
                <Text style={styles.downloadText}>Tải xuống</Text>
              </Pressable>
            </View>
          </View>
          {onRemove ? (
            <Pressable accessibilityRole="button" onPress={() => onRemove(index)} style={styles.remove}>
              <Text style={styles.removeText}>Gỡ</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.previewPanel}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={2}>{preview?.name ?? 'Xem minh chứng'}</Text>
              <Pressable onPress={() => setPreview(null)} accessibilityRole="button" style={styles.closeButton}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.imageContainer} maximumZoomScale={4}>
              {preview?.kind === 'image' ? (
                <Image source={{ uri: preview.url }} resizeMode="contain" style={styles.previewImage} />
              ) : null}
            </ScrollView>
            <Text style={styles.previewHint}>
              Nếu ảnh không hiển thị, hãy kiểm tra URL công khai và quyền truy cập file.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 10, padding: 10 },
  fileInfo: { flex: 1 },
  fileName: { color: '#172033', fontWeight: '600' },
  meta: { color: '#687386', fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  viewButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7, backgroundColor: '#EAF2FF' },
  viewText: { color: '#175CD3', fontWeight: '600', fontSize: 13 },
  downloadButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7, backgroundColor: '#F2F4F7' },
  downloadText: { color: '#344054', fontWeight: '600', fontSize: 13 },
  remove: { paddingHorizontal: 10, paddingVertical: 6 },
  removeText: { color: '#B42318', fontWeight: '600' },
  muted: { color: '#687386' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.7)' },
  previewPanel: { width: '100%', maxWidth: 1000, height: '85%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  previewTitle: { flex: 1, color: '#172033', fontWeight: '600' },
  closeButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, backgroundColor: '#F2F4F7' },
  closeText: { color: '#344054', fontWeight: '600' },
  imageContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  previewImage: { width: '100%', height: 600 },
  previewHint: { padding: 10, color: '#667085', fontSize: 12 },
});
