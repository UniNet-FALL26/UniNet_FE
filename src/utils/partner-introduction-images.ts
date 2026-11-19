import type { ImagePickerAsset } from 'expo-image-picker';

export type PartnerImageSelection = { uri: string; asset?: ImagePickerAsset };

export async function resolvePartnerImages(images: PartnerImageSelection[], upload: (asset: ImagePickerAsset, signal: AbortSignal) => Promise<string>, cache: Map<ImagePickerAsset, string>, signal: AbortSignal): Promise<string[]> {
  const urls: string[] = [];
  const checkAborted = () => { if (signal.aborted) throw new Error('Đã hủy tải ảnh.'); };
  for (const image of images) {
    checkAborted();
    if (!image.asset) { urls.push(image.uri); continue; }
    let url = cache.get(image.asset);
    if (!url) {
      url = await upload(image.asset, signal);
      checkAborted();
      cache.set(image.asset, url);
    }
    urls.push(url);
  }
  checkAborted();
  return urls;
}
