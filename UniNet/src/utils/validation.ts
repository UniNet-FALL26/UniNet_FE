export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
export const passwordRules = (value: string) => ({
  length: value.length >= 8,
  letter: /\p{L}/u.test(value),
  number: /\d/.test(value),
});
