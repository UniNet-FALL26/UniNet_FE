type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type State = { available: boolean; installed: boolean; ios: boolean; canPrompt: boolean; busy: boolean; error: string | null };
const initial: State = { available: false, installed: false, ios: false, canPrompt: false, busy: false, error: null };
let state = initial;
let deferred: InstallEvent | null = null;
let users = 0;
let stop: (() => void) | undefined;
let workerStarted = false;
const listeners = new Set<() => void>();
function update(next: Partial<State>) { state = { ...state, ...next }; listeners.forEach(listener => listener()); }

export const pwaInstall = {
  getSnapshot: () => state,
  getServerSnapshot: () => initial,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  start() {
    if (typeof window === 'undefined') return () => {};
    if (users++ === 0) {
      const media = window.matchMedia('(display-mode: standalone)');
      const iosNavigator = navigator as Navigator & { standalone?: boolean };
      let confirmedInstalled = false;
      const syncDisplay = () => update({ installed: confirmedInstalled || media.matches || iosNavigator.standalone === true });
      update({ available: window.isSecureContext, ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 });
      syncDisplay();
      const beforeInstall = (event: Event) => {
        if (!window.isSecureContext || state.installed) return;
        event.preventDefault(); deferred = event as InstallEvent; update({ canPrompt: true, error: null });
      };
      const installed = () => { confirmedInstalled = true; deferred = null; update({ installed: true, canPrompt: false, busy: false, error: null }); };
      window.addEventListener('beforeinstallprompt', beforeInstall);
      window.addEventListener('appinstalled', installed);
      media.addEventListener('change', syncDisplay);
      if (window.isSecureContext && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production' && !workerStarted) {
        workerStarted = true;
        void navigator.serviceWorker.register('/pwa-sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => { workerStarted = false; });
      }
      stop = () => {
        window.removeEventListener('beforeinstallprompt', beforeInstall);
        window.removeEventListener('appinstalled', installed);
        media.removeEventListener('change', syncDisplay);
      };
    }
    let disposed = false;
    return () => { if (disposed) return; disposed = true; if (--users === 0) { stop?.(); stop = undefined; } };
  },
  async requestInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferred || state.installed || state.busy) return 'unavailable';
    const event = deferred; deferred = null; update({ canPrompt: false, busy: true, error: null });
    try {
      await event.prompt();
      return (await event.userChoice).outcome;
    } catch {
      update({ error: 'Chưa mở được cửa sổ cài đặt. Bạn có thể cài UniNet từ menu trình duyệt.' });
      return 'unavailable';
    } finally { update({ busy: false }); }
  },
};
