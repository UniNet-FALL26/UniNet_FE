const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name] || new Proxy({}, { get: (_, key) => key }), module, module.exports);
  return module.exports;
}

const screens = [
  ['src/app/profile/editor.tsx', 'default'],
  ['src/app/profile/preview.tsx', 'default'],
  ['src/app/profile/templates.tsx', 'default'],
  ['src/app/profile/view/[id].tsx', 'default'],
  ['src/app/wallet.tsx', 'default'],
  ['src/components/settings/SettingsPanel.tsx', 'SettingsPanel'],
  ['src/components/ui/ComingSoon.tsx', 'ComingSoon'],
];

for (const os of ['ios', 'android']) for (const top of [0, 24]) {
  test(`${os}, inset ${top}: all personal screens respect the shell's safe area boundary`, () => {
    const safeArea = { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top, bottom: 24, left: 0, right: 0 }) };
    const hook = load('src/hooks/useScreenSafeAreaEdges.ts', { 'react-native-safe-area-context': safeArea });
    const imports = {
      react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {}, useCallback: fn => fn, useRef: value => ({ current: value }) },
      'react/jsx-runtime': require('react/jsx-runtime'),
      'react-native': {
        ...Object.fromEntries(['ActivityIndicator', 'Image', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name])),
        StyleSheet: { create: value => value }, Platform: { OS: os }, useWindowDimensions: () => ({ width: 390, height: 844 }),
      },
      'react-native-safe-area-context': safeArea,
      '@/hooks/useScreenSafeAreaEdges': hook,
      'expo-router': { useFocusEffect() {}, useLocalSearchParams: () => ({}), useNavigation: () => ({}), router: {} },
      'expo-router/react-navigation': { usePreventRemove() {} },
      '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'viewer', role: 2, email: 'viewer@example.com', profile: {} }, isAuthenticated: true, isLoading: false }) },
      '@/constants/roles': { ACCOUNT_ROLE: { STUDENT: 0, PARTNER: 1, ASSESSOR: 2 } },
      '@/constants/colors': { colors: {} },
      '@/data/profile-templates': { getProfileTemplate: () => ({ id: 'template', themes: [] }), getProfileTheme: () => ({}), profileTemplates: [] },
      '@/utils/profile-preview': { resolveProfilePreview: () => ({ data: {} }) },
      '@/hooks/useAuth': { useAuth: () => ({}) },
      '@/hooks/useStudentVerification': { useStudentVerification: () => ({}) },
    };
    for (const [file, name] of screens) {
      const Screen = load(file, imports)[name];
      const screen = Screen({ title: 'CV' });
      assert.equal(screen.type, 'SafeAreaView', file);
      assert.deepEqual(screen.props.edges, top ? ['top'] : [], file);
      if (name === 'SettingsPanel') assert.deepEqual(Screen({ embedded: true }).props.edges, [], 'embedded settings never add window insets');
    }
  });
}
