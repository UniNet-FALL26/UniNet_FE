import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import type { HubPerson } from '@/types/project-hub';
import { hubColors as c } from './ProjectHubUI';

export function PersonAvatar({ person, size = 40 }: { person: Pick<HubPerson, 'fullName' | 'avatarUrl'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.avatarUrl]);
  return person.avatarUrl && !failed ? <Image source={{ uri: person.avatarUrl }} accessibilityLabel={person.fullName} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: size / 2 }} /> : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.blueWash, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.primary, fontWeight: '600' }}>{person.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase()}</Text></View>;
}
