import { CompanyIcon } from '@/components/company/company-ui';
import { Text, View } from 'react-native';

function platformForUrl(value: string): 'facebook' | 'tiktok' | 'github' | 'linkedin' | 'instagram' | 'youtube' | 'website' {
  let hostname = '';
  try { hostname = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase(); } catch { }
  if (hostname === 'fb.com' || hostname.endsWith('.facebook.com') || hostname === 'facebook.com') return 'facebook';
  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'tiktok';
  if (hostname === 'github.com' || hostname.endsWith('.github.com')) return 'github';
  if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) return 'linkedin';
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'instagram';
  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') return 'youtube';
  return 'website';
}

export function WebsiteBrandIcon({ url, size = 16 }: { url: string; size?: number }) {
  const platform = platformForUrl(url);
  const tile = { width: size, height: size, borderRadius: size * 0.28, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (platform === 'facebook') return <View style={[tile, { backgroundColor: '#1877F2' }]}><Text style={{ color: '#FFFFFF', fontSize: size * 0.82, lineHeight: size, fontWeight: '900' }}>f</Text></View>;
  if (platform === 'tiktok') return <View style={[tile, { backgroundColor: '#111827' }]}><Text style={{ color: '#FFFFFF', fontSize: size * 0.62, lineHeight: size, fontWeight: '800' }}>♪</Text></View>;
  if (platform === 'github') return <View style={[tile, { borderRadius: size / 2, backgroundColor: '#24292F' }]}><Text style={{ color: '#FFFFFF', fontSize: size * 0.38, lineHeight: size, fontWeight: '900' }}>{'<>'}</Text></View>;
  if (platform === 'linkedin') return <View style={[tile, { backgroundColor: '#0A66C2' }]}><Text style={{ color: '#FFFFFF', fontSize: size * 0.48, lineHeight: size, fontWeight: '900' }}>in</Text></View>;
  if (platform === 'instagram') return <CompanyIcon name={{ ios: 'camera', android: 'camera_alt', web: 'camera_alt' }} size={size} color="#D62976" />;
  if (platform === 'youtube') return <CompanyIcon name={{ ios: 'play.rectangle.fill', android: 'smart_display', web: 'smart_display' }} size={size} color="#FF0033" />;
  return <CompanyIcon name={{ ios: 'globe', android: 'language', web: 'language' }} size={size} color="#64748B" />;
}