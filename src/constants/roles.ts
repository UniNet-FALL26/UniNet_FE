export const ACCOUNT_ROLE = { STUDENT: 0, PARTNER: 1, ASSESSOR: 2, VERIFIER: 3, MODERATOR: 4, ACCOUNTANT: 5, ADMIN: 6 } as const;
export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];
