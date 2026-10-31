// Contains routing identifiers only, never credentials or payment status.
export const paymentContextStore = {
  async read() { return typeof window === 'undefined' ? null : window.localStorage.getItem('uninet.payment-return.v1'); },
  async write(value: string) { if (typeof window !== 'undefined') window.localStorage.setItem('uninet.payment-return.v1', value); },
};
