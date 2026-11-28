type Credential = { credential?: string };
type Identity = {
  initialize: (options: { client_id: string; callback: (response: Credential) => void; auto_select: boolean }) => void;
  renderButton: (element: HTMLElement, options: { type: string; theme: string; size: string; text: string; shape: string; locale: string; width: number; click_listener: () => void }) => void;
};
declare global { interface Window { google?: { accounts?: { id?: Identity } } } }

let loading: Promise<Identity> | undefined;
let initialized = false;
let receiveCredential: ((token: string) => void) | undefined;

export function loadGoogleIdentity(): Promise<Identity> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google login requires a browser.'));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<Identity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=vi';
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(failed, 15000);
    function failed() {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error('Không tải được đăng nhập Google. Vui lòng kiểm tra kết nối và thử lại.'));
    }
    script.onerror = failed;
    script.onload = () => {
      window.clearTimeout(timer);
      const identity = window.google?.accounts?.id;
      if (identity) resolve(identity); else failed();
    };
    document.head.appendChild(script);
  }).catch(cause => { loading = undefined; throw cause; });
  return loading;
}

export async function renderGoogleButton(element: HTMLElement, onCredential: (token: string) => void, onClick: () => void, signup = false) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) throw new Error('Đăng nhập Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.');
  const identity = await loadGoogleIdentity();
  if (!initialized) {
    identity.initialize({ client_id: clientId, auto_select: false, callback: response => receiveCredential?.(response.credential ?? '') });
    initialized = true;
  }
  receiveCredential = onCredential;
  identity.renderButton(element, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular',
    text: signup ? 'signup_with' : 'signin_with', locale: 'vi', width: Math.max(200, Math.min(400, element.clientWidth || 320)), click_listener: onClick });
  return () => { if (receiveCredential === onCredential) receiveCredential = undefined; element.replaceChildren(); };
}
