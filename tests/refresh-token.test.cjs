const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const login=(prefix='old')=>({accessToken:prefix+'-access',refreshToken:prefix+'-refresh',expiresAt:'2026-10-04T12:30:00Z',account:{id:prefix==='other'?'other':'owner',email:'test@example.com',role:0,profileComplete:true,profile:null},requiresProfileCompletion:false});
function setup(fetch){
 const cache=new Map();function load(name){if(name==='react')return {useSyncExternalStore:(_,get)=>get()};if(name==='@/constants/config')return {API_URL:'https://api.example.test/api'};if(cache.has(name))return cache.get(name);const exports={};cache.set(name,exports);const source=fs.readFileSync(path.join(__dirname,'../src/'+name.replace('@/','')+'.ts'),'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:load,fetch,Headers,Response,AbortController,FormData});return exports;}
 return {storage:load('@/utils/storage').tokenStorage,api:load('@/services/api'),auth:load('@/services/auth.service').authService,...load('@/store/auth.store')};
}
test('expired access refreshes both tokens and retries same body/headers once; auth state stays synchronized',async()=>{
 const calls=[];const env=setup(async(url,options)=>{calls.push({url,options});if(url.endsWith('/auth/refresh'))return Response.json(login('new'));return new Headers(options.headers).get('Authorization')==='Bearer new-access'?Response.json({ok:true}):new Response(null,{status:401});});
 await env.authStore.setAuth(login());const result=await env.api.apiRequest('/profile/portfolio/me',{method:'PUT',body:'{"title":"keep"}',headers:new Headers({'X-Test':'keep'})});
 assert.equal(result.ok,true);assert.equal(calls.length,3);assert.equal(JSON.parse(calls[1].options.body).refreshToken,'old-refresh');assert.equal(new Headers(calls[1].options.headers).get('Authorization'),null);assert.equal(calls[2].options.body,calls[0].options.body);assert.equal(calls[2].options.headers.get('X-Test'),'keep');assert.equal((await env.storage.getSession()).refreshToken,'new-refresh');assert.equal(env.useAuthStore().accessToken,'new-access');
});
test('parallel 401s share one rotating refresh and delayed 401 reuses the updated token',async()=>{
 let refreshes=0;let delayed;const delayedResponse=new Promise(resolve=>delayed=resolve);const env=setup(async(url,options)=>{if(url.endsWith('/auth/refresh')){refreshes++;return Response.json(login('new'));}if(new Headers(options.headers).get('Authorization')==='Bearer new-access')return Response.json({ok:true});if(url.endsWith('/delayed'))return delayedResponse;return new Response(null,{status:401});});
 await env.authStore.setAuth(login());const late=env.api.apiRequest('/delayed');await Promise.all([env.api.apiRequest('/one'),env.api.apiRequest('/two'),env.api.apiRequest('/three')]);delayed(new Response(null,{status:401}));await late;assert.equal(refreshes,1);
});
test('rejected refresh clears original session and retry does not loop',async()=>{
 let refreshes=0;const env=setup(async url=>{if(url.endsWith('/auth/refresh'))refreshes++;return new Response(null,{status:401});});await env.authStore.setAuth(login());await assert.rejects(env.api.apiRequest('/protected'),e=>e.status===401);assert.equal(refreshes,1);assert.equal(await env.storage.get(),null);assert.equal(env.useAuthStore().isAuthenticated,false);assert.equal(env.useAuthStore().account,null);
});
test('temporary refresh network/server failure preserves session for retry',async()=>{
 for(const failure of ['network','server']){const env=setup(async url=>{if(url.endsWith('/auth/refresh')){if(failure==='network')throw new TypeError('offline');return new Response(null,{status:503});}return new Response(null,{status:401});});await env.authStore.setAuth(login());await assert.rejects(env.api.apiRequest('/protected'));assert.equal(await env.storage.get(),'old-access');assert.equal(env.useAuthStore().isAuthenticated,true);}
});
test('login/registration failure and forbidden responses never trigger refresh or clear a valid session',async()=>{
 let refreshes=0;const env=setup(async url=>{if(url.endsWith('/auth/refresh'))refreshes++;return new Response(null,{status:url.includes('/auth/')?401:403});});await env.authStore.setAuth(login());await assert.rejects(env.auth.login({email:'test@example.com',password:'wrong'}));await assert.rejects(env.api.apiRequest('/auth/register/student',{method:'POST',body:'{}'}));await assert.rejects(env.api.apiRequest('/forbidden'));assert.equal(refreshes,0);assert.equal(await env.storage.get(),'old-access');
});
test('logout/new login during refresh cannot revive old session or replay a write as another account',async()=>{
 for(const action of ['logout','login']){let complete;let started;const start=new Promise(resolve=>started=resolve);const pending=new Promise(resolve=>complete=resolve);let resourceCalls=0;const env=setup(async url=>{if(url.endsWith('/auth/refresh')){started();return pending;}resourceCalls++;return new Response(null,{status:401});});await env.authStore.setAuth(login());const request=env.api.apiRequest('/write',{method:'PUT',body:'{}'});const failure=assert.rejects(request);await start;if(action==='logout')await env.authStore.clearAuth();else await env.authStore.setAuth(login('other'));complete(Response.json(login('new')));await failure;assert.equal(resourceCalls,1);assert.equal(await env.storage.get(),action==='logout'?null:'other-access');}
});
test('manual refresh works and restoreSession uses the rotated token instead of stale captured access',async()=>{
 const env=setup(async(url,options)=>{if(url.endsWith('/auth/refresh'))return Response.json(login('new'));if(url.endsWith('/auth/me'))return new Headers(options.headers).get('Authorization')==='Bearer new-access'?Response.json(login().account):new Response(null,{status:401});return Response.json({});});await env.authStore.setAuth(login());await env.authStore.restoreSession();assert.equal(env.useAuthStore().accessToken,'new-access');assert.equal((await env.auth.refreshToken()).refreshToken,'new-refresh');
});
test('second 401 after refresh expires session after one retry',async()=>{
 let protectedCalls=0;let refreshes=0;const env=setup(async url=>{if(url.endsWith('/auth/refresh')){refreshes++;return Response.json(login('new'));}protectedCalls++;return new Response(null,{status:401});});await env.authStore.setAuth(login());await assert.rejects(env.api.apiRequest('/protected'));assert.equal(refreshes,1);assert.equal(protectedCalls,2);assert.equal(await env.storage.get(),null);
});
test('local clear and consecutive login updates cannot overwrite a newer session',async()=>{
 const env=setup(async()=>Response.json({}));await env.authStore.setAuth(login());await Promise.all([env.authStore.clearAuth(),env.authStore.setAuth(login('other'))]);assert.equal(env.useAuthStore().accessToken,'other-access');assert.equal(await env.storage.get(),'other-access');
 await Promise.all([env.authStore.setAuth(login()),env.authStore.setAuth(login('other'))]);assert.equal(env.useAuthStore().account.id,'other');
});
test('restoring offline session preserves it, but rejected/inactive account clears it',async()=>{
 for(const status of [503,403,404]){const env=setup(async()=>new Response(null,{status}));await env.authStore.setAuth(login());await env.authStore.restoreSession();assert.equal(env.useAuthStore().isAuthenticated,status===503);assert.equal(await env.storage.get(),status===503?'old-access':null);}
});
test('refresh requested with an older snapshot reuses tokens already rotated within that session',async()=>{
 let refreshes=0;const env=setup(async()=>{refreshes++;return Response.json(login('new'));});await env.authStore.setAuth(login());const snapshot=await env.storage.getSession();await env.auth.refreshToken();const reused=await env.api.refreshSession(snapshot);assert.equal(reused.accessToken,'new-access');assert.equal(refreshes,1);
});
test('unrelated bearer and anonymous 401 do not refresh; missing refresh token expires authenticated legacy session',async()=>{
 let refreshes=0;const env=setup(async url=>{if(url.endsWith('/auth/refresh'))refreshes++;return new Response(null,{status:401});});await assert.rejects(env.api.apiRequest('/public'));await env.authStore.setAuth(login());await assert.rejects(env.api.apiRequest('/custom',{headers:{Authorization:'Bearer unrelated'}}));assert.equal(await env.storage.get(),'old-access');await env.storage.set('legacy-access');await assert.rejects(env.api.apiRequest('/legacy'));assert.equal(await env.storage.get(),null);assert.equal(refreshes,0);
});
test('refresh response cannot change account identity; malformed response does not store invalid tokens',async()=>{
 for(const result of [login('other'),{accessToken:'new-access'}]){const env=setup(async url=>url.endsWith('/auth/refresh')?Response.json(result):new Response(null,{status:401}));await env.authStore.setAuth(login());await assert.rejects(env.api.apiRequest('/protected'));assert.equal(await env.storage.get(),result.account?null: 'old-access');}
});
test('late account response during restore cannot overwrite a new login',async()=>{
 let complete;const pending=new Promise(resolve=>complete=resolve);const env=setup(async()=>pending);await env.authStore.setAuth(login());const restoring=env.authStore.restoreSession();await env.authStore.setAuth(login('other'));complete(Response.json(login().account));await restoring;assert.equal(env.useAuthStore().account.id,'other');assert.equal(env.useAuthStore().accessToken,'other-access');
});
test('updated profile identity stays synchronized in cached session during an offline restore',async()=>{
 const env=setup(async()=>new Response(null,{status:503}));await env.authStore.setAuth(login());const snapshot=await env.storage.getSession();env.authStore.updateAccount({...login().account,profileComplete:false});assert.equal(await env.storage.getSession(),snapshot);await env.authStore.restoreSession();assert.equal(env.useAuthStore().account.profileComplete,false);assert.equal((await env.storage.getSession()).account.profileComplete,false);
});

test('pending join request error is localized while preserving API status', async () => {
  const env = setup(async () => Response.json({ message: 'You already have a pending request' }, { status: 409 }));
  await assert.rejects(env.api.apiRequest('/api/projects/project-id/join-requests', { method: 'POST' }), error => error.message === 'Bạn đang có một yêu cầu tham gia chưa được xử lí' && error.status === 409);
});

test('project errors use code, retain metadata and translate parameterized limits', async () => {
  for (const [code, message, expected] of [
    ['INVALID_TITLE', 'Changed backend wording', 'Tên dự án phải có từ 1 đến 255 ký tự.'],
    ['PROJECT_LIMIT_REACHED', 'You can lead a maximum of 5 ongoing projects simultaneously.', 'Bạn chỉ có thể đồng thời làm trưởng nhóm tối đa 5 dự án đang diễn ra.'],
    ['INVALID_ROLE_REQUIREMENTS_TOTAL', 'Total recruitment quantity must equal 4 (memberTarget - 1 = 5 - 1).', 'Tổng số lượng tuyển phải bằng 4 (số thành viên dự kiến trừ đi người tạo dự án).'],
  ]) {
    const env = setup(async () => Response.json({ code, message }, { status: 409 }));
    await assert.rejects(env.api.apiRequest('/projects', { method: 'POST' }), error => error.message === expected && error.code === code && error.status === 409);
  }
});

test('shared project error codes follow route, method and permission cause', async () => {
  for (const [route, method, code, message, expected] of [
    ['/api/projects/id', 'PUT', 'INVALID_PROJECT_STATE', '', 'Chỉ có thể cập nhật dự án đang chờ duyệt, đã bị từ chối hoặc đang hoạt động và còn tuyển thành viên.'],
    ['/projects/id/moderation', 'POST', 'INVALID_PROJECT_STATE', '', 'Chỉ có thể gửi duyệt dự án đang chờ duyệt hoặc đã bị từ chối.'],
    ['/projects/id/join-requests', 'POST', 'INVALID_PROJECT_STATE', '', 'Dự án phải công khai và đang hoạt động để thực hiện thao tác này.'],
    ['/projects/invitations/id/accept', 'PATCH', 'FORBIDDEN', 'Only the invitee can accept or decline this invitation.', 'Chỉ người được mời mới có thể chấp nhận hoặc từ chối lời mời này.'],
    ['/projects/id/invitations', 'POST', 'FORBIDDEN', 'Only active student accounts can perform this action.', 'Chỉ tài khoản sinh viên đang hoạt động mới có thể thực hiện thao tác này. Vui lòng kiểm tra tài khoản của bạn và người được mời hoặc người gửi yêu cầu.'],
    ['/api/moderator/projects/id/approve', 'POST', 'PROFILE_NOT_FOUND', '', 'Không tìm thấy hồ sơ người kiểm duyệt.'],
    ['/projects/my/invitations?status=9', 'GET', 'INVALID_STATUS', '', 'Trạng thái lời mời không hợp lệ.'],
  ]) {
    const env = setup(async () => Response.json({ code, message }, { status: 403 }));
    await assert.rejects(env.api.apiRequest(route, { method }), error => error.message === expected);
  }
});

test('project fallback is Vietnamese and other APIs and successful moderation content stay intact', async () => {
  const env = setup(async () => Response.json({ code: 'UNKNOWN', message: 'Internal failure' }, { status: 500 }));
  await assert.rejects(env.api.apiRequest('/projects/id'), /Không thể thực hiện thao tác với dự án/);
  await assert.rejects(env.api.apiRequest('/profile/me'), /Internal failure/);
  const success = setup(async () => Response.json({ status: 'Error', violationReason: 'Dynamic AI reason' }));
  assert.equal((await success.api.apiRequest('/projects/id/moderation')).violationReason, 'Dynamic AI reason');
});
 test('multipart upload retains browser boundary and body across token refresh', async () => {
 const calls=[]; const env=setup(async (url,options)=>{calls.push({url,options});if(url.endsWith('/auth/refresh'))return Response.json(login('new'));return options.headers.get('Authorization')==='Bearer new-access'?Response.json({url:'https://api.example.test/photo.png'}):new Response(null,{status:401});});
 await env.authStore.setAuth(login()); const body=new FormData();body.append('file',new Blob(['image'],{type:'image/png'}),'photo.png');
 await env.api.apiRequest('/profile/images',{method:'POST',body});
 for(const call of [calls[0],calls[2]]){assert.equal(call.options.body,body);assert.equal(call.options.headers.has('Content-Type'),false);}
 });
