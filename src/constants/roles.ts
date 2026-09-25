export const ACCOUNT_ROLE = { STUDENT: 0, PARTNER: 1, ADMIN: 2 } as const;
export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];
