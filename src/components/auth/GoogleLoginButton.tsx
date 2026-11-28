import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { getGoogleIdToken } from '@/services/google-native';
import { GoogleMark } from './GoogleMark';
import type { GoogleLoginButtonProps } from './GoogleLoginButton.types';

export function GoogleLoginButton({ disabled, signup, onSignIn }: GoogleLoginButtonProps) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function signIn() {
    if (disabled || pending.current) return;
    pending.current = true; setBusy(true);
    try { await onSignIn(getGoogleIdToken); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Button title={signup ? 'Đăng ký với Google' : 'Đăng nhập với Google'} leadingIcon={<GoogleMark />} variant="outline" onPress={() => { void signIn(); }} loading={busy} disabled={disabled} />;
}
