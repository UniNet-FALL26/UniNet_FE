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

test('my projects preserves every skill and its metadata, including null values', async () => {
  const skills = [
    { skillId: '27c99ad0-7d7d-42ff-a447-f8bb1e2f1b6e', skillName: 'ASP.NET Core', category: 'Backend', iconUrl: null, minLevel: null },
    { skillId: '5101ac85-1e80-4feb-8781-48c089c5a3ae', skillName: 'Git', category: 'ToolsAndOther', iconUrl: null, minLevel: null },
    { skillId: '69b6509a-a4f8-46e0-a714-c2a8404b5ac8', skillName: 'React Native', category: 'Frontend', iconUrl: null, minLevel: null },
    { skillId: 'f2373d51-4c55-4241-9bb9-5aa7387cdcef', skillName: 'SonarQube', category: 'ToolsAndOther', iconUrl: 'https://example.com/icon.png', minLevel: 0 },
  ];
  const response = { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, projects: [{ id: 'my-project', skills }] };
  const result = await offlineService(async () => response).listMyProjects();
  assert.deepEqual(result.projects[0].skills, skills);
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

test('creation posts the API contract and preserves the returned project', async () => {
  const payload = { title: 'Test', projectField: 'IT', description: 'Test', memberTarget: 2, roleRequirements: [{ role: 'Dev', quantity: 1, requirements: 'React' }], skillIds: ['skill-id'], visibility: 0, recruitmentDeadline: '2026-12-01T12:00:00.000Z', expectedOutput: '2027-01-01T12:00:00.000Z' };
  for (const apiUrl of ['https://example.com', 'https://example.com/api']) {
    const response = projectDetail();
    const service = offlineService(async (url, options) => {
      assert.equal(url, apiUrl.endsWith('/api') ? '/projects' : '/api/projects');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), payload);
      return response;
    }, apiUrl);
    assert.equal(await service.createProject(payload), response);
  }
  await assert.rejects(offlineService().createProject(payload), /API unavailable/);
  await assert.rejects(offlineService(async () => ({})).createProject(payload), /không hợp lệ/);
});

test('status tabs request the status endpoint with pagination and cancellation', async () => {
  for (const status of [0, 2, 3]) {
    for (const apiUrl of ['https://example.com', 'https://example.com/api']) {
      const response = { page: 2, pageSize: 10, totalItems: 11, totalPages: 2, projects: [{ id: 'status-project', status }] };
      const controller = new AbortController();
      const service = offlineService(async (url, options) => {
        assert.equal(url, `${apiUrl.endsWith('/api') ? '' : '/api'}/projects/status/${status}?page=2&pageSize=10`);
        assert.equal(options.method, 'GET');
        assert.equal(options.signal, controller.signal);
        return response;
      }, apiUrl);
      assert.equal(await service.listProjectsByStatus(status, 2, 10, controller.signal), response);
    }
  }
  await assert.rejects(offlineService().listProjectsByStatus(0), /API unavailable/);
  await assert.rejects(offlineService(async () => []).listProjectsByStatus(3), /không hợp lệ/);
});

test('project management POST requests use real responses and propagate failures', async () => {
  for (const [method, payload, suffix, body] of [
    ['submitJoinRequest', { projectId: 'project/id', role: 'Devops Engineer', message: 'Join' }, '/project%2Fid/join-requests', { role: 'Devops Engineer', message: 'Join' }],
    ['sendInvitation', { projectId: 'project/id', inviteeId: 'user', role: 'Dev', message: 'Invite' }, '/project%2Fid/invitations', { inviteeId: 'user', role: 'Dev', message: 'Invite' }],
  ]) {
    for (const apiUrl of ['https://example.com', 'https://example.com/api']) {
      const response = { id: 'result', status: 0 };
      const service = offlineService(async (url, options) => {
        assert.equal(url, `${apiUrl.endsWith('/api') ? '' : '/api'}/projects${suffix}`);
        assert.equal(options.method, 'POST');
        assert.deepEqual(JSON.parse(options.body), body);
        return response;
      }, apiUrl);
      assert.equal(await service[method](payload), response);
    }
    await assert.rejects(offlineService()[method](payload), /API unavailable/);
    await assert.rejects(offlineService(async () => ({}))[method](payload), /không hợp lệ/);
  }
});

test('member, invitation and join request PATCH actions use encoded ids and no request body', async () => {
  for (const [method, args, suffix] of [
    ['kickMember', ['project/id', 'user/id'], '/project%2Fid/members/user%2Fid/kick'],
    ['leaveProject', ['project/id'], '/project%2Fid/leave'],
    ['cancelInvitation', ['invite/id'], '/invitations/invite%2Fid/cancel'],
    ['acceptInvitation', ['invite/id'], '/invitations/invite%2Fid/accept'],
    ['rejectInvitation', ['invite/id'], '/invitations/invite%2Fid/reject'],
    ['acceptJoinRequest', ['request/id'], '/join-requests/request%2Fid/accept'],
    ['rejectJoinRequest', ['request/id'], '/join-requests/request%2Fid/reject'],
    ['cancelJoinRequest', ['request/id'], '/join-requests/request%2Fid/cancel'],
  ]) {
    for (const apiUrl of ['https://example.com', 'https://example.com/api']) {
      const response = { id: 'result', status: 1 };
      const service = offlineService(async (url, options) => {
        assert.equal(url, `${apiUrl.endsWith('/api') ? '' : '/api'}/projects${suffix}`);
        assert.equal(options.method, 'PATCH');
        assert.equal(options.body, undefined);
        return response;
      }, apiUrl);
      assert.equal(await service[method](...args), response);
    }
    await assert.rejects(offlineService()[method](...args), /API unavailable/);
    await assert.rejects(offlineService(async () => ({ id: 'x', status: 'Pending' }))[method](...args), /không hợp lệ/);
    assert.throws(() => offlineService()[method](''), /định danh/);
  }
});

function recommendedMember() {
  return { userId: 'student-real', fullName: 'Nguyen Phuoc Thinh', avatarUrl: null, matchScore: 66.66666666666667, matchedSkills: ['.NET', 'React'], missingSkills: ['Figma'], skillMatch: 66.66666666666667, diversityScore: 100, collaborationCount: 0, finalScore: 73.33333333333334 };
}

test('recommended members calls correct GET endpoint and preserves score and skill data', async () => {
  const response = [recommendedMember()];
  const controller = new AbortController();
  const service = offlineService(async (url, options) => {
    assert.equal(url, '/api/projects/project-real/recommended-members');
    assert.equal(options.method, 'GET');
    assert.equal(options.signal, controller.signal);
    return response;
  });
  assert.equal(await service.fetchRecommendations('project-real', controller.signal), response);
});

test('recommended members handles configured api prefix, encoded ids and empty suggestions', async () => {
  const service = offlineService(async (url) => {
    assert.equal(url, '/projects/project%2Freal/recommended-members');
    return [];
  }, 'https://uninet-be.onrender.com/api');
  assert.equal((await service.fetchRecommendations('project/real')).length, 0);
});

test('recommended members propagates failures without mock candidates', async () => {
  await assert.rejects(offlineService().fetchRecommendations('project-real'), /API unavailable/);
});

test('recommended members rejects invalid payloads and missing project ids', async () => {
  await assert.rejects(offlineService().fetchRecommendations(''), /mã dự án/);
  for (const payload of [{}, [null], [{ ...recommendedMember(), finalScore: '73' }], [{ ...recommendedMember(), matchedSkills: null }]]) {
    await assert.rejects(offlineService(async () => payload).fetchRecommendations('project-real'), /không hợp lệ/);
  }
});

test('update project uses PUT with exactly the supplied fields and preserves pending response', async () => {
  const payload = { title: 'CampusHome', projectField: 'Edtech', description: 'Housing', recruitmentDeadline: '2026-10-19T12:00:00.000Z', expectedOutput: '2026-12-19T12:00:00.000Z' };
  const response = projectDetail({ status: 0 });
  for (const apiUrl of ['https://example.com', 'https://example.com/api']) {
    const service = offlineService(async (url, options) => {
      assert.equal(url, `${apiUrl.endsWith('/api') ? '' : '/api'}/projects/real-project`);
      assert.equal(options.method, 'PUT');
      assert.deepEqual(JSON.parse(options.body), payload);
      return response;
    }, apiUrl);
    assert.equal(await service.updateProject('real-project', payload), response);
  }
  await assert.rejects(offlineService().updateProject('real-project', payload), /API unavailable/);
  await assert.rejects(offlineService(async () => ({})).updateProject('real-project', payload), /không hợp lệ/);
});
test('delete project accepts empty 204 response, uses encoded id and propagates errors', async () => {
  for (const apiUrl of ['https://example.com', 'https://example.com/api']) {
    const service = offlineService(async (url, options) => {
      assert.equal(url, `${apiUrl.endsWith('/api') ? '' : '/api'}/projects/project%2Fid`);
      assert.equal(options.method, 'DELETE');
      assert.equal(options.body, undefined);
      return undefined;
    }, apiUrl);
    assert.equal(await service.deleteProject('project/id'), undefined);
  }
  await assert.rejects(offlineService().deleteProject('project'), /API unavailable/);
});
