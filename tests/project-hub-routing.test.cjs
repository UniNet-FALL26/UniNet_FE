const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderRoute(file, params = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (name === 'expo-router') return { Redirect: 'Redirect', useLocalSearchParams: () => params };
      if (name === '@/components/projects/hub/ProjectHubDetailScreen') return { ProjectHubDetailScreen: 'ProjectHubDetailScreen' };
      throw new Error(`Unexpected route dependency: ${name}`);
    },
  });
  return JSON.parse(JSON.stringify(exports.default()));
}

test('legacy project/recruitment/workspace overview links open the profile project tab', () => {
  for (const route of [
    'src/app/(tabs)/projects.tsx',
    'src/app/(tabs)/groups.tsx',
    'src/app/(tabs)/workspace.tsx',
    'src/app/group/recommendations.tsx',
    'src/app/group/external-draft/[draftId].tsx',
  ]) {
    const page = renderRoute(route);
    assert.equal(page.type, 'Redirect');
    assert.deepEqual(page.props.href, { pathname: '/profile/projects' });
  }
});

test('legacy creation/import links open the fresh project creation dialog', () => {
  for (const route of ['src/app/group/create.tsx', 'src/app/group/import.tsx']) {
    assert.deepEqual(renderRoute(route).props.href, {
      pathname: '/profile/projects', params: { new: '1' },
    });
  }
});

test('workspace deep links preserve the project identity without restoring retired task UI', () => {
  for (const projectId of ['existing-project', ['existing-project', 'ignored']]) {
    assert.deepEqual(renderRoute('src/app/workspace/[projectId].tsx', { projectId }).props.href, {
      pathname: '/group/[id]', params: { id: 'existing-project' },
    });
  }
  assert.deepEqual(renderRoute('src/app/workspace/[projectId].tsx').props.href, {
    pathname: '/profile/projects',
  });
});

test('existing portfolio and notification detail links mount the new project screen', () => {
  assert.equal(renderRoute('src/app/group/[id].tsx').type, 'ProjectHubDetailScreen');
});
