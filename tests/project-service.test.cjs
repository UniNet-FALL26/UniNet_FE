const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function offlineService() {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/project.service.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.equal(name, '@/services/api');
      return { apiRequest: async () => { throw new Error('API unavailable'); } };
    },
  });
  return exports.projectService;
}

test('offline project list uses status codes accepted by project filters', async () => {
  const projects = await offlineService().listProjects();
  assert.ok(projects.length > 0);
  for (const project of projects) {
    assert.equal(project.status, 'Public');
    assert.equal(project.recruitmentStatus, 'Open');
  }
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
