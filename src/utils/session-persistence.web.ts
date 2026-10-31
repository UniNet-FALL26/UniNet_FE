// Tab-scoped credentials survive provider redirects/reloads without retaining
// refresh tokens indefinitely. A cross-tab persistent session needs backend cookies.
export const sessionPersistence = {
  async read() {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem('uninet.session.v1');
  },
  async write(value: string | null) {
    if (typeof window === 'undefined') return;
    if (value === null) window.sessionStorage.removeItem('uninet.session.v1');
    else window.sessionStorage.setItem('uninet.session.v1', value);
  },
};
