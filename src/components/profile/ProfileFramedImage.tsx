import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { splitProfileImageUrl } from '@/utils/profile-image-crop';

export function ProfileFramedImage({ uri, accessibilityLabel }: { uri: string; accessibilityLabel: string }) {
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const { source, crop } = splitProfileImageUrl(uri);
  const scale = imageSize.width && imageSize.height && frame.width && frame.height
    ? Math.max(frame.width / imageSize.width, frame.height / imageSize.height) * crop.zoom
    : 0;
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;
  const left = (frame.width - width) / 2 + crop.x * (frame.width - width) / 2;
  const top = (frame.height - height) / 2 + crop.y * (frame.height - height) / 2;

  return <View onLayout={event => setFrame({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} style={s.frame}>
    <Image source={{ uri: source }} contentFit="fill" accessibilityLabel={accessibilityLabel} onLoad={event => {
      const { width: naturalWidth, height: naturalHeight } = event.source;
      if (naturalWidth && naturalHeight) setImageSize(current => current.width === naturalWidth && current.height === naturalHeight ? current : { width: naturalWidth, height: naturalHeight });
    }} style={{ position: 'absolute', width, height, left, top }} />
  </View>;
}

const s = StyleSheet.create({ frame: { ...StyleSheet.absoluteFill, overflow: 'hidden' } });
