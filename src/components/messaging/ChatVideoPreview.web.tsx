import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ChatVideoPreviewProps } from './ChatVideoPreview';

export function ChatVideoPreview({ uri, label, compact = false, onError }: ChatVideoPreviewProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false), [ratio, setRatio] = useState(16 / 9), [duration, setDuration] = useState(0);
  return <View style={[s.frame, compact ? s.compact : { width: '100%', aspectRatio: ratio }]}>
    <video ref={video} src={uri} aria-label={label} preload="metadata" playsInline muted={compact} controls={playing}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: compact ? 'cover' : 'contain', borderRadius: 10 }}
      onLoadedMetadata={event => {
        const element = event.currentTarget;
        if (element.videoWidth > 0 && element.videoHeight > 0) setRatio(element.videoWidth / element.videoHeight);
        if (Number.isFinite(element.duration)) {
          setDuration(Math.floor(element.duration));
          // Decode a real frame for the paused preview without autoplaying.
          if (element.duration > 0 && element.currentTime === 0) element.currentTime = Math.min(0.05, element.duration / 2);
        }
      }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={onError} />
    {!playing && <Pressable accessibilityRole="button" accessibilityLabel={`Phát video ${label}`} onPress={() => { void video.current?.play().catch(() => onError?.()); }} style={s.play}><SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} size={compact ? 20 : 28} tintColor="#FFFFFF" /></Pressable>}
    {!playing && duration > 0 && <Text style={s.duration}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</Text>}
  </View>;
}
const s = StyleSheet.create({
  frame: { backgroundColor: '#142033', borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  compact: { width: '100%', height: '100%' },
  play: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(12,24,42,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  duration: { position: 'absolute', bottom: 5, left: 5, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(12,24,42,0.65)', color: '#FFFFFF', fontSize: 10, lineHeight: 14 },
});
