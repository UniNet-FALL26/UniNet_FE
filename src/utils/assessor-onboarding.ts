import type { OnboardingStep, ProfileInput } from '@/types/assessor-onboarding';

export function onboardingLink(url: string): { step: OnboardingStep; token: string } | null {
  const match = url.match(/\/assessor-onboarding\/(profile|contract|activate)(?:\.html)?(?:[?#]|$)/);
  if (!match) return null;
  const token = new URLSearchParams(url.split('#')[1] || '').get('token') || '';
  return { step: match[1] as OnboardingStep, token: /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '' };
}
let pending: ReturnType<typeof onboardingLink> = null;
export function captureOnboardingLink(url: string) { pending = onboardingLink(url); return pending; }
export function consumeOnboardingLink(step: OnboardingStep) { const value = pending?.step === step ? pending.token : ''; pending = null; return value; }
export function validateProfile(input: ProfileInput): Partial<Record<keyof ProfileInput, string>> {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};
  for (const [key, max] of [['fullName', 255], ['bankName', 150], ['bankAccountHolder', 255]] as const)
    if (!input[key].trim() || input[key].trim().length > max) errors[key] = `Bắt buộc, tối đa ${max} ký tự.`;
  if (!/^\d{12}$/.test(input.citizenId)) errors.citizenId = 'CCCD phải gồm đúng 12 chữ số.';
  if (!/^[0-9]{10}(-?[0-9]{3})?$/.test(input.taxCode)) errors.taxCode = 'Mã số thuế gồm 10 hoặc 13 số, có thể có dấu - trước 3 số cuối.';
  if (!/^[A-Za-z0-9]{1,34}$/.test(input.bankAccountNumber)) errors.bankAccountNumber = 'Tài khoản gồm 1–34 chữ hoặc số, không có khoảng trắng.';
  return errors;
}
export const validOtp = (code: string) => /^\d{6}$/.test(code);
export const validPassword = (password: string) => password.length >= 8 && password.length <= 1024 && /\p{L}/u.test(password) && /[0-9]/.test(password);
