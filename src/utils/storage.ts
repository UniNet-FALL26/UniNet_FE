import type { AuthAccount, LoginResponse } from '@/types/auth';
import { sessionPersistence } from '@/utils/session-persistence';
// Keep the rotating pair together. Native uses SecureStore; web is tab-scoped.
export type AuthSession = { accessToken: string; refreshToken?: string; expiresAt?: string; account?: AuthAccount; generation: number };
let session: AuthSession | null = null;
let generation = 0;
const listeners = new Set<(value: AuthSession | null) => void>();
const emit = () => listeners.forEach(listener => listener(session));
let writes = Promise.resolve();
const persist = () => {
  const value = session ? JSON.stringify({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt }) : null;
  // Serialize refresh/logout writes so a stale refresh cannot restore logged-out credentials.
  writes = writes.catch(() => {}).then(() => sessionPersistence.write(value));
  return writes.catch(() => {}); // Storage unavailable: keep this in-memory session usable.
};
let hydration: Promise<void> | undefined;
export const tokenStorage = {
  hydrate() {
    return hydration ??= (async () => {
      const initialGeneration = generation;
      try {
        const raw = await sessionPersistence.read();
        if (!raw || generation !== initialGeneration || session) return;
        const saved = JSON.parse(raw);
        if (typeof saved.accessToken !== 'string' || !saved.accessToken || typeof saved.refreshToken !== 'string' || !saved.refreshToken) {
          await persist(); return;
        }
        session = { accessToken: saved.accessToken, refreshToken: saved.refreshToken, expiresAt: typeof saved.expiresAt === 'string' ? saved.expiresAt : undefined, generation: ++generation };
        // Auth store stays loading until /auth/me validates the restored credentials.
      } catch { /* Unavailable or invalid storage must not prevent login. */ }
    })();
  },
  get: async () => session?.accessToken ?? null,
  getSession: () => session,
  set: async (value: string) => { session = { accessToken: value, generation: ++generation }; emit(); await persist(); },
  setSession: async (value: LoginResponse) => { session = { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: value.expiresAt, account: value.account, generation: ++generation }; emit(); await persist(); },
  replaceSession: async (expected: AuthSession, value: LoginResponse) => {
    if (session !== expected) return false;
    session = { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: value.expiresAt, account: value.account, generation: expected.generation }; emit(); await persist(); return true;
  },
  updateAccount(account: AuthAccount) {
    if (!session || (session.account && session.account.id !== account.id)) return;
    session.account = account; emit();
  },
  clear: async (expected?: AuthSession) => {
    if (expected && session !== expected) return false;
    session = null; generation++; emit(); await persist(); return true;
  },
  subscribe(listener: (value: AuthSession | null) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
