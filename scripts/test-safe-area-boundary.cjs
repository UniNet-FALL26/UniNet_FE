const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function load(file, imports) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name], loaded, loaded.exports);
  return loaded.exports;
}
for (const top of [0, 24, 48]) {
  test(`screen safe area avoids native padding after the shell consumes the top inset (${top})`, () => {
    const { useScreenSafeAreaEdges } = load('src/hooks/useScreenSafeAreaEdges.ts', {
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top, bottom: 24, left: 0, right: 0 }) },
    });
    assert.deepEqual(useScreenSafeAreaEdges(), top ? ['top'] : []);
    const { ModulePage } = load('src/components/ui/ModulePage.tsx', {
      '@/hooks/useScreenSafeAreaEdges': { useScreenSafeAreaEdges },
      'react/jsx-runtime': require('react/jsx-runtime'),
      'react-native': { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', ScrollView: 'ScrollView' },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      'expo-symbols': { SymbolView: 'SymbolView' },
      '@/constants/colors': { colors: {} },
    });
    const screen = ModulePage({ title: 'Screen', description: '', sections: [] });
    assert.equal(React.isValidElement(screen), true);
    assert.deepEqual(screen.props.edges, top ? ['top'] : []);
  });
}
