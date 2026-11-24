import { useEffect } from 'react';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

export function ProjectMediaPlayer({ uri, name, onError }: { uri: string; name: string; onError: () => void }) {
  const player = useVideoPlayer(uri, instance => { instance.play(); });
  const status = useEvent(player, 'statusChange');
  useEffect(() => { if (status?.status === 'error') onError(); }, [status?.status, onError]);
  return <VideoView accessibilityLabel={name} player={player} contentFit="contain" nativeControls
    fullscreenOptions={{ enable: true }} style={StyleSheet.absoluteFill} />;
}
