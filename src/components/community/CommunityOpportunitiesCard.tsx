import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { opportunitiesService, type OpportunityJob } from '@/services/opportunities.service';

function postingAge(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Mới đăng';
  const hours = Math.max(0, Math.floor((Date.now() - time) / 3600000));
  if (hours < 1) return 'Vừa đăng';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} ngày trước` : new Date(value).toLocaleDateString('vi-VN');
}

export function CommunityOpportunitiesCard() {
  const [jobs, setJobs] = useState<OpportunityJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');
  const saveRequests = useRef(new Map<string, AbortController>());

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError(false); setSaveError(''); setSaving([]);
    opportunitiesService.list({ view: 'all', page: 1, pageSize: 3, sort: 'newest' }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setJobs(result.jobs.slice(0, 3)); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => {
      controller.abort();
      saveRequests.current.forEach(request => request.abort());
      saveRequests.current.clear();
    };
  }, [revision]));

  async function toggleSaved(job: OpportunityJob) {
    if (saveRequests.current.has(job.id)) return;
    const controller = new AbortController();
    saveRequests.current.set(job.id, controller);
    setSaving(current => [...current, job.id]); setSaveError('');
    try {
      await (job.isSaved ? opportunitiesService.unsave : opportunitiesService.save)(job.id, controller.signal);
      if (!controller.signal.aborted) setJobs(current => current.map(item => item.id === job.id ? { ...item, isSaved: !job.isSaved } : item));
    } catch {
      if (!controller.signal.aborted) setSaveError('Chưa cập nhật được tin đã lưu. Vui lòng thử lại.');
    } finally {
      if (saveRequests.current.get(job.id) === controller) saveRequests.current.delete(job.id);
      if (!controller.signal.aborted) setSaving(current => current.filter(id => id !== job.id));
    }
  }

  return <View testID="community-opportunities" style={s.card}>
    <View style={s.header}><Text accessibilityRole="header" style={s.heading}>Cơ hội mới dành cho bạn</Text><Pressable accessibilityRole="link" accessibilityLabel="Xem tất cả cơ hội" onPress={() => router.push('/opportunities')} style={({ pressed }) => [s.allLink, pressed && s.pressed]}><Text style={s.allText}>Xem tất cả</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={14} tintColor={colors.primary} /></Pressable></View>
    {loading ? <View style={s.state}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>Đang tải cơ hội…</Text></View> : error ? <View style={s.state}><Text style={s.stateText}>Chưa tải được cơ hội mới.</Text><Pressable accessibilityRole="button" onPress={() => setRevision(current => current + 1)} style={s.retry}><Text style={s.allText}>Thử lại</Text></Pressable></View> : !jobs.length ? <View style={s.state}><Text style={s.stateText}>Chưa có tin tuyển dụng mới.</Text></View> : jobs.map((job, index) => <View key={job.id} testID={`community-opportunity-${job.id}`} style={[s.job, index > 0 && s.jobDivider]}>
      <Pressable accessibilityRole="link" accessibilityLabel={`Xem cơ hội ${job.title} tại ${job.companyName}`} onPress={() => router.push({ pathname: '/opportunities', params: { jobId: job.id } })} style={({ pressed }) => [s.jobLink, pressed && s.pressed]}>
        <View style={s.logo}>{job.companyAvatarUrl ? <Image source={{ uri: job.companyAvatarUrl }} style={s.logoImage} resizeMode="contain" /> : <Text style={s.initials}>{job.companyName.trim().slice(0, 2).toUpperCase() || 'CT'}</Text>}</View>
        <View style={s.copy}><Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text><Text style={s.company} numberOfLines={1}>{job.companyName}</Text><View style={s.location}><SymbolView name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }} size={12} tintColor={colors.textMuted} /><Text style={s.locationText} numberOfLines={1}>{job.location || 'Chưa cập nhật'} · {['Tại văn phòng', 'Kết hợp', 'Từ xa'][job.workType]}</Text></View></View>
      </Pressable>
      <View style={s.jobAside}><Pressable accessibilityRole="button" accessibilityLabel={`${job.isSaved ? 'Bỏ lưu' : 'Lưu'} cơ hội ${job.title}`} accessibilityState={{ disabled: saving.includes(job.id), busy: saving.includes(job.id) }} disabled={saving.includes(job.id)} onPress={() => void toggleSaved(job)} style={({ pressed }) => [s.save, pressed && s.pressed]}>{saving.includes(job.id) ? <ActivityIndicator size="small" color={colors.primary} /> : <SymbolView name={job.isSaved ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' } : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }} size={18} tintColor={job.isSaved ? colors.primary : colors.textSecondary} />}</Pressable><Text style={s.age} numberOfLines={1}>{postingAge(job.createdAt)}</Text></View>
    </View>)}
    {!!saveError && <Text accessibilityRole="alert" style={s.error}>{saveError}</Text>}
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 }, heading: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.navy },
  allLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }, allText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  job: { flexDirection: 'row', gap: 6, paddingVertical: 12 }, jobDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  jobLink: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, logoImage: { width: '100%', height: '100%' }, initials: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  copy: { flex: 1, minWidth: 0, gap: 4 }, jobTitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textPrimary }, company: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  location: { flexDirection: 'row', alignItems: 'center', gap: 3 }, locationText: { flex: 1, fontSize: 10, lineHeight: 15, color: colors.textSecondary },
  jobAside: { minWidth: 76, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }, save: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, age: { fontSize: 10, lineHeight: 15, color: colors.textMuted, textAlign: 'right' },
  state: { minHeight: 116, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 }, stateText: { fontSize: 12, color: colors.textSecondary }, retry: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 }, error: { color: colors.error, fontSize: 12, lineHeight: 18, paddingBottom: 12 }, pressed: { opacity: 0.7 },
});
