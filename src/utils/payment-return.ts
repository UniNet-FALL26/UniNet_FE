import { paymentContextStore } from '@/utils/payment-context-store';

export type PaymentReturnContext = { verificationId: string; transactionId: string; accountId: string; projectId?: string; savedAt: number };
export async function rememberPayment(context: Omit<PaymentReturnContext, 'savedAt'>) {
  try { await paymentContextStore.write(JSON.stringify({ ...context, savedAt: Date.now() })); }
  catch { /* Explicit verificationId in the backend return URL remains the fallback. */ }
}
export async function recalledPayment(accountId: string): Promise<PaymentReturnContext | null> {
  try {
    const raw = await paymentContextStore.read();
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.accountId !== accountId || typeof value.verificationId !== 'string' || !value.verificationId ||
      typeof value.transactionId !== 'string' || !value.transactionId || !Number.isFinite(value.savedAt) ||
      value.savedAt > Date.now() || Date.now() - value.savedAt > 24 * 60 * 60 * 1000) return null;
    return { ...value, projectId: typeof value.projectId === 'string' ? value.projectId : undefined };
  } catch { return null; }
}
export function paymentAppUrl(verificationId: string) {
  return `uninet:///payment/result?verificationId=${encodeURIComponent(verificationId)}`;
}
