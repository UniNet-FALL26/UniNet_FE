export type ProfileImageCrop = { x: number; y: number; zoom: number };

const cropMarker = '#uninet-crop=';
const defaultCrop: ProfileImageCrop = { x: 0, y: 0, zoom: 1 };

export function splitProfileImageUrl(uri: string): { source: string; crop: ProfileImageCrop } {
  const markerIndex = uri.lastIndexOf(cropMarker);
  if (markerIndex < 0) return { source: uri, crop: defaultCrop };
  const [x, y, zoom] = uri.slice(markerIndex + cropMarker.length).split(',').map(Number);
  if (![x, y, zoom].every(Number.isFinite) || zoom < 1 || zoom > 3) return { source: uri, crop: defaultCrop };
  return { source: uri.slice(0, markerIndex), crop: { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), zoom } };
}

export function withProfileImageCrop(uri: string, crop: ProfileImageCrop): string {
  const { source } = splitProfileImageUrl(uri);
  if (crop.x === 0 && crop.y === 0 && crop.zoom === 1) return source;
  return `${source}${cropMarker}${crop.x.toFixed(3)},${crop.y.toFixed(3)},${crop.zoom.toFixed(2)}`;
}

export function profileImageContentPosition(uri: string): { left: `${number}%`; top: `${number}%` } {
  const { crop } = splitProfileImageUrl(uri);
  const x = Math.round((0.5 + crop.x * 0.5) * 100);
  const y = Math.round((0.5 + crop.y * 0.5) * 100);
  return { left: `${x}%`, top: `${y}%` };
}

export function profileImageZoom(uri: string): number {
  return splitProfileImageUrl(uri).crop.zoom;
}
