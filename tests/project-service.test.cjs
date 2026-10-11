const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function offlineService(request = async () => { throw new Error('API unavailable'); }, apiUrl = 'https://uninet-be.onrender.com') {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/project.service.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    URLSearchParams,
    require(name) {
      if (name === '@/constants/config') return { API_URL: apiUrl };
      assert.equal(name, '@/services/api');
      return { apiRequest: request };
    },
  });
  return exports.projectService;
}

test('project listing propagates API failures without mock fallback', async () => {
  await assert.rejects(offlineService().listProjects(), /API unavailable/);
});

test('project listing sends pagination and optional filters and preserves API data', async () => {
  const response = { page: 2, pageSize: 10, totalItems: 11, totalPages: 2, projects: [{ id: 'real-id', recruitmentStatus: 0, skills: [{ skillName: 'ASP.NET Core' }] }] };
  const controller = new AbortController();
  const service = offlineService(async (url, options) => {
    const query = new URL(url, 'https://example.com').searchParams;
    assert.equal(query.get('page'), '2');
    assert.equal(query.get('pageSize'), '10');
    assert.equal(query.get('keyword'), 'learning');
    assert.equal(query.get('field'), 'Education Technology');
    assert.deepEqual(query.getAll('skillnames'), ['ASP.NET Core', 'Git']);
    assert.equal(query.get('recruitmentStatus'), '0');
    assert.equal(options.method, 'GET');
    assert.equal(options.signal, controller.signal);
    return response;
  });
  assert.equal(await service.listProjects({ page: 2, keyword: ' learning ', field: 'Education Technology', skillnames: ['ASP.NET Core', 'Git'], recruitmentStatus: 0 }, controller.signal), response);
});

test('project listing defaults pagination and omits unset filters', async () => {
  const service = offlineService(async (url) => {
    assert.equal(url, '/api/projects?page=1&pageSize=10');
    return { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, projects: [] };
  });
  assert.equal((await service.listProjects()).projects.length, 0);
});

test('project listing rejects malformed responses', async () => {
  await assert.rejects(offlineService(async () => []).listProjects(), /không hợp lệ/);
});

test('project listing does not duplicate configured api prefix', async () => {
  const service = offlineService(async (url) => {
    assert.equal(url, '/projects?page=1&pageSize=10');
    return { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, projects: [] };
  }, 'https://uninet-be.onrender.com/api');
  await service.listProjects();
});

test('my projects uses authenticated API helper and returns all items without requiring skills or creator filtering', async () => {
  const response = {
    page: 2, pageSize: 10, totalItems: 11, totalPages: 2,
    projects: [{ id: 'member-project', creator: { id: 'another-user' }, visibility: 0, status: 1, recruitmentStatus: 0 }],
  };
  const controller = new AbortController();
  const service = offlineService(async (url, options) => {
    assert.equal(url, '/api/projects/me?page=2&pageSize=10');
    assert.equal(options.method, 'GET');
    assert.equal(options.signal, controller.signal);
    return response;
  });
  assert.equal(await service.listMyProjects({ page: 2 }, controller.signal), response);
});

test('my projects supports configured api prefix and default pagination', async () => {
  const service = offlineService(async (url) => {
    assert.equal(url, '/projects/me?page=1&pageSize=10');
    return { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, projects: [] };
  }, 'https://uninet-be.onrender.com/api');
  assert.equal((await service.listMyProjects()).totalItems, 0);
});

test('my projects propagates authentication failures without returning mock data', async () => {
  const error = Object.assign(new Error('Unauthorized'), { status: 401 });
  await assert.rejects(offlineService(async () => { throw error; }).listMyProjects(), (cause) => cause === error);
});

test('my projects rejects malformed responses', async () => {
  await assert.rejects(offlineService(async () => []).listMyProjects(), /không hợp lệ/);
});

function projectDetail(overrides = {}) {
  return {
    id: 'real-project', title: 'EduConnect', visibility: 1, status: 1, recruitmentStatus: 0,
    creator: { id: 'creator', fullName: 'Nguyen Minh Duy', nickname: 'Noobmaster69', avatarUrl: null },
    roleRequirements: [{ id: 'role', roleName: 'Mobile Developer', quantity: 1, requirements: 'API integration' }],
    skills: [{ skillId: 'skill', skillName: 'React Native', iconUrl: null }],
    members: [{ userId: 'member', fullName: 'Le Tan Huy', nickname: 'GauTrangDaDen', role: 'Mobile developer', avatarUrl: null, joinedAt: '2026-10-11T02:03:11.646919+00:00' }],
    isCreator: true, isMember: false, ...overrides,
  };
}

test('project detail uses GET with cancellation and preserves roles, skills, members and permission flags', async () => {
  const response = projectDetail();
  const controller = new AbortController();
  const service = offlineService(async (url, options) => {
    assert.equal(url, '/api/projects/real-project');
    assert.equal(options.method, 'GET');
    assert.equal(options.signal, controller.signal);
    return response;
  });
  assert.equal(await service.getProjectById('real-project', controller.signal), response);
});

test('project detail supports api prefix and preserves member permissions', async () => {
  const response = projectDetail({ isCreator: false, isMember: true });
  const service = offlineService(async (url) => {
    assert.equal(url, '/projects/real-project');
    return response;
  }, 'https://uninet-be.onrender.com/api');
  assert.equal(await service.getProjectById('real-project'), response);
});

test('project detail propagates not found instead of returning another mock project', async () => {
  const error = Object.assign(new Error('Not found'), { status: 404 });
  await assert.rejects(offlineService(async () => { throw error; }).getProjectById('missing'), (cause) => cause === error);
});

test('project detail rejects missing ids, mismatched projects and malformed responses', async () => {
  await assert.rejects(offlineService().getProjectById(''), /mã dự án/);
  await assert.rejects(offlineService(async () => projectDetail()).getProjectById('other-id'), /không hợp lệ/);
  await assert.rejects(offlineService(async () => projectDetail({ members: null })).getProjectById('real-project'), /không hợp lệ/);
});

test('offline project creation uses defaults and preserves explicit statuses', async () => {
  const service = offlineService();
  const payload = { title: 'Test', projectField: 'IT', description: 'Test', technologies: [], memberTarget: 2, roles: [], recruitmentDeadline: '2026-12-01' };
  const defaults = await service.createProject(payload);
  assert.equal(defaults.status, 'Public');
  assert.equal(defaults.recruitmentStatus, 'Open');
  const explicit = await service.createProject({ ...payload, status: 'Private', recruitmentStatus: 'Closed' });
  assert.equal(explicit.status, 'Private');
  assert.equal(explicit.recruitmentStatus, 'Closed');
});

test('offline join request starts Pending', async () => {
  const request = await offlineService().submitJoinRequest({ projectId: 'project-1', role: 'Frontend' });
  assert.equal(request.status, 'Pending');
});

test('offline invitation starts Sent', async () => {
  const invitation = await offlineService().sendInvitation({ projectId: 'project-1', inviteeId: 'student-1', role: 'Frontend' });
  assert.equal(invitation.status, 'Sent');
});
