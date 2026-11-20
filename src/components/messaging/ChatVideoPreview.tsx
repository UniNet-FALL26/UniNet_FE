import { useEffect } from 'react';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

export type ChatVideoPreviewProps = { uri: string; label: string; compact?: boolean; headers?: Record<string, string>; onError?: () => void };

export function ChatVideoPreview({ uri, label, compact = false, headers, onError }: ChatVideoPreviewProps) {
  const player = useVideoPlayer({ uri, headers }, instance => { instance.muted = compact; });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false });
  const metadata = useEvent(player, 'sourceLoad');
  const status = useEvent(player, 'statusChange');
  const size = metadata?.availableVideoTracks[0]?.size;
  const ratio = size && size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9;
  const duration = Math.floor(metadata?.duration || 0);
  useEffect(() => {
    if (metadata && metadata.duration > 0) player.currentTime = Math.min(0.05, metadata.duration / 2);
  }, [metadata, player]);
  useEffect(() => { if (status?.status === 'error') onError?.(); }, [status?.status, onError]);
  return <View style={[s.frame, compact ? s.compact : { width: '100%', aspectRatio: ratio }]}>
    <VideoView accessibilityLabel={label} player={player} contentFit={compact ? 'cover' : 'contain'} style={StyleSheet.absoluteFill} nativeControls={isPlaying} fullscreenOptions={{ enable: true }} />
    {!isPlaying && <Pressable accessibilityRole="button" accessibilityLabel={`Phát video ${label}`} onPress={() => player.play()} style={s.play}><SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={compact ? 20 : 28} tintColor="#FFFFFF" /></Pressable>}
    {!isPlaying && duration > 0 && <Text style={s.duration}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</Text>}
  </View>;
}
const s = StyleSheet.create({
  frame: { backgroundColor: '#142033', borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  compact: { width: '100%', height: '100%' },
  play: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(12,24,42,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  duration: { position: 'absolute', bottom: 5, left: 5, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(12,24,42,0.65)', color: '#FFFFFF', fontSize: 10, lineHeight: 14 },
});
