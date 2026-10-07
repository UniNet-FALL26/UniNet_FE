import type { AuthAccount, LoginResponse } from '@/types/auth';
// Keep the rotating pair together; never persist credentials in plaintext.
export type AuthSession = { accessToken: string; refreshToken?: string; expiresAt?: string; account?: AuthAccount; generation: number };
let session: AuthSession | null = null;
let generation = 0;
const listeners = new Set<(value: AuthSession | null) => void>();
const emit = () => listeners.forEach(listener => listener(session));
export const tokenStorage = {
  get: async () => session?.accessToken ?? null,
  getSession: () => session,
  set: async (value: string) => { session = { accessToken: value, generation: ++generation }; emit(); },
  setSession: async (value: LoginResponse) => { session = { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: value.expiresAt, account: value.account, generation: ++generation }; emit(); },
  replaceSession: async (expected: AuthSession, value: LoginResponse) => {
    if (session !== expected) return false;
    session = { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: value.expiresAt, account: value.account, generation: expected.generation }; emit(); return true;
  },
  updateAccount(account: AuthAccount) {
    if (!session || (session.account && session.account.id !== account.id)) return;
    session.account = account; emit();
  },
  clear: async (expected?: AuthSession) => {
    if (expected && session !== expected) return false;
    session = null; generation++; emit(); return true;
  },
  subscribe(listener: (value: AuthSession | null) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
