export function ProjectMediaPlayer({ uri, name, onError }: { uri: string; name: string; onError: () => void }) {
  return <video src={uri} aria-label={name} controls autoPlay playsInline preload="metadata" onError={onError}
    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
}
