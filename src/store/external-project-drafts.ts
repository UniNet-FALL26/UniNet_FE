import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { isFileId } from '@/utils/external-project-draft';

export type SavedExternalDraft = { draftId: string; createdAt: string };
const key = (owner: string) => `uninet.external-drafts.${owner.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
let writes: Promise<unknown> = Promise.resolve();
async function read(owner: string): Promise<SavedExternalDraft[]> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(key(owner)) : await SecureStore.getItemAsync(key(owner));
    const entries: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries.filter((entry): entry is SavedExternalDraft => !!entry && isFileId(entry.draftId) && typeof entry.createdAt === 'string') : [];
  } catch { return []; }
}
function mutate(owner: string, change: (entries: SavedExternalDraft[]) => SavedExternalDraft[]) {
  const result = writes.catch(() => {}).then(async () => {
    const value = JSON.stringify(change(await read(owner)));
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key(owner), value);
    else await SecureStore.setItemAsync(key(owner), value);
  });
  writes = result;
  return result;
}
export const externalDraftShortcuts = {
  list: read,
  add: (owner: string, draft: SavedExternalDraft) => mutate(owner, entries => [draft, ...entries.filter(item => item.draftId !== draft.draftId)]),
  remove: (owner: string, id: string) => mutate(owner, entries => entries.filter(item => item.draftId !== id)),
};
