import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View, useWindowDimensions } from 'react-native';
import { releaseProjectImage, selectProjectImage, uploadProjectImage, type ProjectImageAsset } from '@/utils/project-hub-files';
import { FullProjectImage } from './FullProjectImage';
import { HubAction, HubModal, ui } from './ProjectHubUI';
import { messageOf } from './ProjectHubFields';

export function ProjectImagePreviewModal({ initialFile, onConfirm, onClose }: { initialFile: ProjectImageAsset; onConfirm: (url: string) => Promise<void>; onClose: () => void }) {
  const [file, setFile] = useState(initialFile);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [picking, setPicking] = useState(false), [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const locked = useRef(false);
  const { width, height } = useWindowDimensions();
  useEffect(() => () => releaseProjectImage(file), [file]);
  const close = () => { if (!locked.current) onClose(); };
  async function chooseAgain() {
    if (locked.current) return;
    locked.current = true; setPicking(true); setError('');
    try {
      const selected = await selectProjectImage();
      if (selected) { setFile(selected); setUploadedUrl(null); setImageFailed(false); setImageReady(false); }
    } catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setPicking(false); }
  }
  async function confirm() {
    if (locked.current || imageFailed || !imageReady) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const url = uploadedUrl ?? await uploadProjectImage(file);
      setUploadedUrl(url);
      await onConfirm(url);
      onClose();
    } catch (cause) { setError(messageOf(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <HubModal compact wide={false} title="Xem trước ảnh dự án" subtitle="Ảnh chỉ được tải lên và lưu khi bạn xác nhận." onClose={close}
    footer={<><HubAction compact title="Chọn lại ảnh" icon="image" onPress={() => void chooseAgain()} busy={picking} disabled={busy} /><HubAction compact title="Hủy" onPress={close} disabled={busy || picking} /><HubAction compact title="Xác nhận" variant="primary" onPress={() => void confirm()} busy={busy} disabled={picking || imageFailed || !imageReady} testID="project-image-confirm" /></>}>
    <View style={{ height: Math.max(140, Math.min(width < 600 ? 260 : 360, height * 0.42)), borderRadius: 10, overflow: 'hidden' }}>
      <FullProjectImage key={file.uri} source={{ uri: file.uri }} label="Ảnh dự án đang chọn" onLoad={() => setImageReady(true)} onError={() => { setImageFailed(true); setError('Không thể đọc ảnh. Vui lòng chọn ảnh khác.'); }} />
      {!imageReady && !imageFailed && <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Đang đọc ảnh xem trước" /></View>}
    </View>
    <Text numberOfLines={1} style={[ui.muted, { fontSize: 12, marginTop: 10 }]}>{file.name}</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.error, { marginTop: 10 }]}>{error}</Text>}
  </HubModal>;
}
