import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Text, View } from 'react-native';
export function PdfViewer({ url, onError, onReady }: { url: string; onError: () => void; onReady: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return <View style={{ gap: 12 }}><iframe title="PDF hợp đồng" src={url} onLoad={() => setLoaded(true)} onError={onError} referrerPolicy="no-referrer" style={{ width: '100%', height: 520, border: 0 }} /><Text>Nếu PDF không hiển thị, tải lại PDF hoặc dùng trình duyệt hỗ trợ PDF. Chỉ xác nhận khi bạn mở và đọc được hợp đồng.</Text><Button title="Tôi đã mở và đọc được PDF" disabled={!loaded} onPress={onReady} /></View>;
}
