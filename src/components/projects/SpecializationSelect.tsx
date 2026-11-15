import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { specializationService, type Specialization } from '@/services/specialization.service';
import { externalStyles as s } from './ExternalProjectLayout';
import { ProjectSelectModal } from './ProjectSelectModal';

export function SpecializationSelect({ value, onChange, disabled = false, error, compact = false }: {
  value: string; onChange: (id: string) => void; disabled?: boolean; error?: string; compact?: boolean;
}) {
  const [items, setItems] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    specializationService.getSpecializations(controller.signal)
      .then(data => { if (!controller.signal.aborted) setItems(data.filter(item => item.isActive)); })
      .catch(() => { if (!controller.signal.aborted) setLoadError('Không thể tải danh mục chuyên ngành. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const selected = items.find(item => item.id === value);
  const buttonStyle = compact ? { minHeight: 40, paddingHorizontal: 12 } : undefined;
  const buttonTextStyle = compact ? { fontSize: 14 } : undefined;
  return <View style={{ gap: 8 }}>
    <Text style={s.body}>Chuyên ngành dự án *</Text>
    <Button title={loading ? 'Đang tải chuyên ngành…' : selected?.name || 'Chọn chuyên ngành dự án ▾'} style={buttonStyle} textStyle={buttonTextStyle} variant="outline" disabled={disabled || loading || !!loadError || !items.length} onPress={() => setOpen(previous => !previous)} />
    <ProjectSelectModal title="Chọn chuyên ngành dự án" visible={open && !disabled && !loading && !loadError} value={value} options={items.map(item => ({ value: item.id, label: item.name }))} onSelect={onChange} onClose={() => setOpen(false)} />
    {!!loadError && <Text style={s.error}>{loadError}</Text>}
    {!loading && !loadError && !items.length && <Text style={s.error}>Chưa có chuyên ngành đang hoạt động.</Text>}
    {!loading && (loadError || !items.length) && <Button title="Tải lại chuyên ngành" style={buttonStyle} textStyle={buttonTextStyle} variant="outline" disabled={disabled} onPress={() => { setLoading(true); setLoadError(null); setRevision(previous => previous + 1); }} />}
    {!!error && <Text style={s.error}>{error}</Text>}
  </View>;
}
