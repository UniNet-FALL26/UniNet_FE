import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';

type Destination = '/(auth)/welcome' | '/(auth)/login' | '/(auth)/register';
type MotionContext = { active: boolean; moving: boolean; reduced: boolean; navigate: (path: Destination) => void };
const Context = createContext<MotionContext | null>(null);

export function DesktopAuthTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const active = width >= 900 && ['/welcome', '/login', '/register'].includes(pathname);
  const progress = useRef(new Animated.Value(pathname === '/welcome' ? 0 : 1)).current;
  const [reduced, setReduced] = useState(true);
  const [moving, setMoving] = useState(false);
  const busy = useRef(false);
  const target = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancel = () => { timers.current.forEach(clearTimeout); timers.current = []; progress.stopAnimation(); busy.current = false; };
  useEffect(() => {
    if (Platform.OS === 'web') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduced(media.matches);
      update(); media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!active || (busy.current && pathname !== target.current)) { cancel(); setMoving(false); }
    if (!busy.current) progress.setValue(pathname === '/welcome' ? 0 : 1);
  }, [active, pathname, progress]);
  useEffect(() => () => cancel(), [progress]);

  const navigate = (path: Destination) => {
    if (busy.current) return;
    busy.current = true; setMoving(true);
    target.current = path.replace('/(auth)', '');
    Animated.timing(progress, { toValue: path === '/(auth)/welcome' ? 0 : 1, duration: reduced ? 0 : 680, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
    if (reduced) { router.replace(path); busy.current = false; setMoving(false); }
    else {
      timers.current.push(setTimeout(() => router.replace(path), 150));
      timers.current.push(setTimeout(() => { busy.current = false; setMoving(false); timers.current = []; }, 760));
    }
  };
  return <Context.Provider value={{ active, moving, reduced, navigate }}>
    <View style={s.shell}>
      {active && <><Animated.View testID="auth-campus-scene" pointerEvents="none" style={[s.scene, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.3] }) }] }]}>
        <Image source={require('@/assets/images/welcome-campus-reference.png')} contentFit="cover" contentPosition="right center" style={s.image} accessible={false} importantForAccessibility="no-hide-descendants" />
      </Animated.View>
      <Animated.View testID="auth-login-panel" pointerEvents="none" style={[s.loginPanel, { opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0, 1] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [width * 0.35, 0] }) }] }]}>
        <Image source={require('@/assets/images/login-content-panel-notched.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" />
      </Animated.View></>}
      {children}
    </View>
  </Context.Provider>;
}

export function useDesktopAuthPageMotion(page: 'welcome' | 'login') {
  const context = useContext(Context);
  const { width } = useWindowDimensions();
  const enabled = context?.active ?? false;
  const opacity = useRef(new Animated.Value(context?.moving ? 0 : 1)).current;
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: context?.reduced ? 0 : 480, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, enabled, context?.reduced]);
  const navigate = (path: Destination) => {
    if (!enabled || !context) { router.replace(path); return; }
    if (context.moving) return;
    Animated.timing(opacity, { toValue: 0, duration: context.reduced ? 0 : 140, useNativeDriver: true }).start();
    context.navigate(path);
  };
  return { enabled, moving: context?.moving ?? false, navigate, style: enabled ? { opacity, transform: [{ translateX: opacity.interpolate({ inputRange: [0, 1], outputRange: [page === 'login' ? width * 0.3 : -width * 0.12, 0] }) }] } : undefined };
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#F7FBFF', overflow: 'hidden' },
  scene: { position: 'absolute', left: '30%', top: 0, bottom: 0, width: '70%', overflow: 'hidden' },
  image: { position: 'absolute', right: 0, top: 0, height: '100%', width: '166.667%' },
  loginPanel: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '50%' },
});
