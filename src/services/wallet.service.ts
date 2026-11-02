import { apiRequest } from '@/services/api';
export interface WalletWithdrawal { id: string; amount: string; bankName: string; bankAccountNumber: string; bankAccountHolder: string; state: number; createdAt: string; reviewReason: string | null; bankReference: string | null }
export interface WalletData { requestKey: string; balance: { balance: string; reserved: string; available: string }; entries: { id: string; amount: string; reason: string; createdAt: string }[]; withdrawals: WalletWithdrawal[] }
export interface WithdrawalInput { requestKey: string; amount: string; bankName: string; bankAccountNumber: string; bankAccountHolder: string }
export const walletService = {
  get: (signal?: AbortSignal) => apiRequest<WalletData>('/wallet', { signal }),
  request: (input: WithdrawalInput) => apiRequest<WalletWithdrawal>('/wallet/withdrawals', { method: 'POST', body: JSON.stringify(input), feedback: false }),
  cancel: (id: string) => apiRequest<WalletWithdrawal>(`/wallet/withdrawals/${encodeURIComponent(id)}/cancel`, { method: 'POST', feedback: false }),
};
