export type ToastType = 'success' | 'error';
export type ToastMessage = { id: number; type: ToastType; message: string };
let snapshot: { toast: ToastMessage | null; modalHosts: string[] } = { toast: null, modalHosts: [] };
let sequence = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const update = (next: typeof snapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
function dismiss(id?: number) {
  if (id !== undefined && snapshot.toast?.id !== id) return;
  clearTimeout(timer); timer = undefined;
  update({ ...snapshot, toast: null });
}
function show(type: ToastType, message: string) {
  if (!message.trim()) return;
  clearTimeout(timer);
  const id = ++sequence;
  update({ ...snapshot, toast: { id, type, message } });
  timer = setTimeout(() => dismiss(id), 3000);
}
export const toast = { success: (message: string) => show('success', message), error: (message: string) => show('error', message) };
export const toastStore = {
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  dismiss,
  registerModal(id: string) {
    update({ ...snapshot, modalHosts: [...snapshot.modalHosts, id] });
    return () => update({ ...snapshot, modalHosts: snapshot.modalHosts.filter(host => host !== id) });
  },
};
