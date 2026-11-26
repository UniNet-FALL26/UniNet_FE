const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

class MockApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function load(file, overrides = {}) {
  const imports = {
    react: {
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useEffect() {},
      useCallback: fn => fn,
      useRef: value => ({ current: value }),
    },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': {
      ActivityIndicator: 'ActivityIndicator',
      Platform: { OS: 'web' },
      Pressable: 'Pressable',
      ScrollView: 'ScrollView',
      Text: 'Text',
      View: 'View',
      useWindowDimensions: () => ({ width: 1280, height: 800 }),
      StyleSheet: { create: value => value },
    },
    '@/services/api': { ApiError: MockApiError },
    ...overrides,
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    name => imports[name] || new Proxy({}, { get: (_, key) => key }),
    module,
    module.exports,
  );
  return module.exports;
}

function find(node, predicate) {
  if (!React.isValidElement(node)) return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...React.Children.toArray(node.props.children).flatMap(child => find(child, predicate)),
  ];
}

const se = { id: '15b9b88e-17d0-4d14-876d-fc54d57a4de1', code: 'SOFTWARE_ENGINEERING', name: 'Kỹ thuật phần mềm', isActive: true };
const ai = { id: '22222222-2222-4222-8222-222222222222', code: 'ARTIFICIAL_INTELLIGENCE', name: 'Trí tuệ nhân tạo', isActive: true };
const inactive = { id: '33333333-3333-4333-8333-333333333333', code: 'OLD', name: 'Ngành cũ', isActive: false };

test('specialization helpers handle filtering, preselection, and Save button states', () => {
  const {
    activeSpecializations,
    initialSpecializationId,
    canSaveSpecialization,
    specializationSaveError,
  } = load('src/utils/project-specialization.ts');

  const active = activeSpecializations([se, inactive, ai]);
  assert.deepEqual(active.map(x => x.id), [se.id, ai.id]);

  assert.equal(initialSpecializationId(se, active), se.id);
  assert.equal(initialSpecializationId(inactive, active), '');
  assert.equal(initialSpecializationId(null, active), '');

  assert.equal(canSaveSpecialization({ selectedId: '', current: null, loading: false, hasLoadError: false, busy: false }), false);
  assert.equal(canSaveSpecialization({ selectedId: se.id, current: se, loading: false, hasLoadError: false, busy: false }), false);
  assert.equal(canSaveSpecialization({ selectedId: ai.id, current: se, loading: true, hasLoadError: false, busy: false }), false);
  assert.equal(canSaveSpecialization({ selectedId: ai.id, current: se, loading: false, hasLoadError: true, busy: false }), false);
  assert.equal(canSaveSpecialization({ selectedId: ai.id, current: se, loading: false, hasLoadError: false, busy: true }), false);
  assert.equal(canSaveSpecialization({ selectedId: ai.id, current: se, loading: false, hasLoadError: false, busy: false }), true);
  assert.equal(canSaveSpecialization({ selectedId: se.id, current: null, loading: false, hasLoadError: false, busy: false }), true);

  assert.deepEqual(specializationSaveError(new MockApiError('err', 400, 'SPECIALIZATION_REQUIRED')), {
    message: 'Vui lòng chọn một chuyên ngành đang hoạt động.',
    reloadCurrent: false,
  });
  assert.deepEqual(specializationSaveError(new MockApiError('err', 400, 'INVALID_SPECIALIZATION')), {
    message: 'Vui lòng chọn một chuyên ngành đang hoạt động.',
    reloadCurrent: false,
  });
  assert.deepEqual(specializationSaveError(new MockApiError('err', 403, 'FORBIDDEN')), {
    message: 'Bạn không có quyền cập nhật chuyên ngành cho dự án này.',
    reloadCurrent: false,
  });
  assert.deepEqual(specializationSaveError(new MockApiError('err', 404, 'PROJECT_NOT_FOUND')), {
    message: 'Không tìm thấy dự án.',
    reloadCurrent: false,
  });
  assert.deepEqual(specializationSaveError(new MockApiError('err', 409, 'SPECIALIZATION_LOCKED')), {
    message: 'Dự án đã có yêu cầu thẩm định nên không thể đổi chuyên ngành đã gán. Dự án chưa có chuyên ngành vẫn có thể gán lần đầu.',
    reloadCurrent: false,
  });
  assert.deepEqual(specializationSaveError(new MockApiError('err', 409, 'SPECIALIZATION_CONFLICT')), {
    message: 'Dữ liệu chuyên ngành vừa thay đổi. Đã tải lại chuyên ngành hiện tại để bạn kiểm tra và thử lại.',
    reloadCurrent: true,
  });
});

test('specializationService calls expected GET and PUT endpoints', async () => {
  const calls = [];
  const { specializationService } = load('src/services/specialization.service.ts', {
    '@/constants/config': { API_URL: 'https://example.test/api' },
    '@/services/api': {
      apiRequest: async (url, options) => {
        calls.push({ url, options });
        if (url === '/specializations') return [se, ai];
        if (url === '/projects/proj-1') return { id: 'proj-1', specialization: null };
        if (url === '/admin/projects/proj-1/specialization') return se;
        throw new Error(`Unexpected URL: ${url}`);
      },
    },
  });

  const list = await specializationService.getSpecializations();
  assert.equal(list.length, 2);
  assert.equal(calls.at(-1).url, '/specializations');

  const current = await specializationService.getProjectSpecialization('proj-1');
  assert.equal(current, null);
  assert.equal(calls.at(-1).url, '/projects/proj-1');

  const saved = await specializationService.updateProjectSpecialization('proj-1', se.id);
  assert.deepEqual(saved, se);
  assert.equal(calls.at(-1).url, '/admin/projects/proj-1/specialization');
  assert.equal(calls.at(-1).options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { specializationId: se.id });
});

test('ProjectHubDetailScreen only renders specialization update button when project.isOwner is true', () => {
  const baseProject = {
    id: 'proj-1',
    title: 'UniNet',
    logoUrl: null,
    description: 'Project Hub',
    technologies: [],
    status: 1,
    visibility: 1,
    isOwner: true,
    isMember: true,
    creator: { id: 'u1', fullName: 'Owner', avatarUrl: null },
    details: { description: null, features: [], results: {}, documents: [], media: [], links: [], startDate: null, completedAt: null },
    recruitment: null,
    members: [],
    myReview: null,
    chatRoomId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  for (const isOwner of [true, false]) {
    let stateCalls = 0;
    const initialStates = [
      { ...baseProject, isOwner }, // project
      '', // error
      false, // loading
      0, // attempt
      'overview', // tab
      null, // modal
    ];
    const { ProjectHubDetailScreen } = load('src/components/projects/hub/ProjectHubDetailScreen.tsx', {
      react: {
        useState: fallback => {
          const val = stateCalls < initialStates.length ? initialStates[stateCalls] : fallback;
          stateCalls++;
          return [val, () => {}];
        },
        useCallback: fn => fn,
        useRef: value => ({ current: value }),
      },
      'expo-router': { router: {}, useFocusEffect() {}, useLocalSearchParams: () => ({ id: 'proj-1' }) },
      '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'acc-1', profile: { id: 'u1' } } }) },
      '@/utils/project-members': { projectDisplayMembers: () => [] },
      '@/utils/project-updated-at': { formatProjectUpdatedAt: () => 'Hôm nay' },
      '@/utils/project-overview-content': { overviewGuides: new Proxy({}, { get: () => ({ title: 'T', empty: 'E' }) }) },
    });

    const tree = ProjectHubDetailScreen();
    const triggers = find(tree, node => node.props?.testID === 'project-specialization-trigger');
    assert.equal(triggers.length, isOwner ? 1 : 0);
  }
});

