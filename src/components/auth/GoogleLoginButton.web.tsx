import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { renderGoogleButton } from '@/services/google-identity';
import { GoogleMark } from './GoogleMark';
import type { GoogleLoginButtonProps } from './GoogleLoginButton.types';

export function GoogleLoginButton({ disabled, signup, onSignIn }: GoogleLoginButtonProps) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ disabled, onSignIn });
  useEffect(() => { current.current = { disabled, onSignIn }; }, [disabled, onSignIn]);
  const pending = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;
    if (host.current) void renderGoogleButton(host.current, token => {
      if (!active || current.current.disabled || pending.current) return;
      pending.current = true;
      void current.current.onSignIn(async () => token).finally(() => { pending.current = false; });
    }, () => {}, signup).then(cleanup => {
      if (!active) cleanup(); else { dispose = cleanup; setReady(true); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được đăng nhập Google.'); });
    return () => { active = false; dispose?.(); };
  }, [attempt, signup]);
  return <View style={styles.container}>
    <div ref={host} inert={disabled ? true : undefined} aria-busy={!ready && !error} style={{ display: error ? 'none' : 'flex', justifyContent: 'center', width: '100%', minHeight: error ? 0 : 44, opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? 'none' : 'auto' }} />
    {!ready && !error && <ActivityIndicator color={colors.primary} accessibilityLabel="Đang tải đăng nhập Google" />}
    {!!error && <>
      <Button title="Thử lại đăng nhập Google" leadingIcon={<GoogleMark />} variant="outline" disabled={disabled} onPress={() => { setReady(false); setError(null); setAttempt(value => value + 1); }} />
      <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
    </>}
  </View>;
}
const styles = StyleSheet.create({ container: { gap: 8, alignItems: 'stretch' }, error: { color: colors.error, fontSize: 13, lineHeight: 20, textAlign: 'center' } });
