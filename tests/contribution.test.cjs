const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const e={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/contribution.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:e});
const base={workflow:{mode:'OfficialV2',canManage:true,projectCompleted:true,publishedRunId:null,blockers:[]},snapshot:{},readiness:{gitState:'Ready'},cohort:null,peer:null,run:null,capabilities:{supported:true,canAdjust:true,canOpenPeerRound:true}};
test('Active project only offers completion, no capture',()=>assert.equal(e.contributionNext({...base,workflow:{...base.workflow,projectCompleted:false}},true,'a').kind,'complete'));
test('unsupported workflow has no mutation',()=>assert.equal(e.contributionNext({...base,workflow:{...base.workflow,mode:'RequiresOptIn'}},true,'a').kind,'blocked'));
test('no snapshot requires explicit capture',()=>assert.equal(e.contributionNext({...base,snapshot:null},true,'a').kind,'capture'));
test('incomplete evidence cannot open peer or create Run',()=>assert.equal(e.contributionNext({...base,readiness:{gitState:'Incomplete'}},true,'a').kind,'git'));
test('ready Git permits explicit cohort',()=>assert.equal(e.contributionNext(base,true,'a').kind,'openPeer'));
test('member cannot capture or create run',()=>assert.equal(e.contributionNext({...base,snapshot:null},false,'b').kind,'wait'));
test('member own roster gets evaluation action',()=>assert.equal(e.contributionNext({...base,cohort:{status:1,participantIds:['a','b'],ratings:[]}},false,'b').kind,'peer'));
test('closed peer requires Ready mass',()=>assert.equal(e.contributionNext({...base,cohort:{status:3},peer:{state:'InsufficientData'}},true,'a').kind,'peer'));
for(const [state,kind] of [['Draft','approvePublish'],['Review','approvePublish'],['Rejected','approvePublish'],['Approved','approvePublish'],['Finalized','approvePublish'],['Published','adjust']])test(state+' state action',()=>assert.equal(e.contributionNext({...base,run:{state}},true,'a').kind,kind));
test('cohort close depends on status and exact complete count',()=>{assert.equal(e.canClosePeer({status:2,submittedCount:6,requiredCount:6}),true);assert.equal(e.canClosePeer({status:1,submittedCount:5,requiredCount:6}),false)});
test('peer form cannot accept self, fractions, out of range or closed cohort',()=>{assert.equal(e.validPeer('a','a',4,false),false);assert.equal(e.validPeer('a','b',4.5,false),false);assert.equal(e.validPeer('a','b',5,true),false);assert.equal(e.validPeer('a','b',4,false),true)});
test('only own submitted ratings survive even for Creator',()=>assert.equal(e.ownRatings({ratings:[{evaluatorId:'a'},{evaluatorId:'b'}]},'a').length,1));
test('no UI raw enum status',()=>assert.equal(e.runLabel('Approved'),'Đã phê duyệt'));

function load(file,mocks,extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n)},Date,window:extra.window,...extra});return exports;}
test('Official service uses exact routes, body, revision, same request id; never Experimental',async()=>{
 const calls=[];const {contributionService:s}=load('src/services/contribution.service.ts',{'@/constants/config':{API_URL:'http://localhost:5239/api'},'@/services/api':{apiRequest:async(path,options)=>{calls.push({path,options});return{}},ApiError:Error},'@/services/project-github.service':{}});
 await s.createRun('a/b','stable-request','git','peer');await s.createRun('a/b','stable-request','git','peer');await s.approvePublish('a/b','run',7,'old',null);await s.submitPeer('a/b','cohort','target',4,null,3);
 assert.equal(calls[0].path,'/projects/a%2Fb/contribution/v2/runs');assert.deepEqual(JSON.parse(calls[0].options.body),{requestId:'stable-request',gitSnapshotId:'git',peerSnapshotId:'peer'});assert.equal(calls[0].options.body,calls[1].options.body);assert.equal(JSON.parse(calls[2].options.body).expectedRevision,7);assert.equal(calls[3].options.method,'PUT');assert.equal(JSON.parse(calls[3].options.body).expectedRevision,3);assert.ok(calls.every(x=>!x.path.includes('experimental')));
});
test('workflow rejects project mismatch',async()=>{
 const {contributionService:s}=load('src/services/contribution.service.ts',{'@/constants/config':{API_URL:'http://localhost:5239/api'},'@/services/api':{apiRequest:async()=>({contractVersion:'1',projectId:'other',canManage:true,blockers:[]}),ApiError:Error},'@/services/project-github.service':{}});await assert.rejects(()=>s.workflow('this'));
});
test('journal is account/project scoped and stores no ratings; ambiguous capture only clears after new server id',async()=>{
 const map=new Map();const j=load('src/utils/contribution-pending.ts',{'react-native':{Platform:{OS:'web'}},'expo-secure-store':{}},{window:{sessionStorage:{getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}});
 const p={kind:'capture',scope:'account:project',baselineId:null,at:'2026-11-23'};await j.savePending(p.scope,p);assert.equal((await j.readPending(p.scope)).kind,'capture');assert.equal(await j.readPending('other:project'),null);assert.equal(j.pendingResolved(p,{workflow:{latestGitSnapshotId:null}}),false);assert.equal(j.pendingResolved(p,{workflow:{latestGitSnapshotId:'new'}}),true);await j.savePending(p.scope,null);assert.equal(await j.readPending(p.scope),null);
});
test('Run recovery requires matching RequestId; transition uses server revision change',()=>{
 const j=load('src/utils/contribution-pending.ts',{'react-native':{Platform:{OS:'web'}},'expo-secure-store':{}});
 assert.equal(j.pendingResolved({kind:'createRun',requestId:'r1'},{run:{requestId:'r2'}}),false);assert.equal(j.pendingResolved({kind:'createRun',requestId:'r1'},{run:{requestId:'r1'}}),true);assert.equal(j.pendingResolved({kind:'approve',runId:'x',revision:2},{run:{id:'x',revision:2}}),false);assert.equal(j.pendingResolved({kind:'approve',runId:'x',revision:2},{run:{id:'x',revision:3}}),true);
});
test('unknown workflow run state fails closed',()=>assert.equal(e.contributionNext({...base,run:{state:'unexpected'}},true,'a').kind,'blocked'));
test('reported workflow blocker prevents Creator mutations',()=>assert.equal(e.contributionNext({...base,workflow:{...base.workflow,blockers:['AuthorizedRepositoryRequired']}},true,'a').kind,'blocked'));
test('member with Published ignores replacement Draft and cannot approve',()=>assert.equal(e.contributionNext({...base,published:{},workflow:{...base.workflow,publishedRunId:'old'},run:{state:'Draft'}},false,'b').kind,'result'));
test('without version schema a Draft cannot use legacy multi-click fallback',()=>assert.equal(e.contributionNext({...base,capabilities:{supported:false},run:{state:'Draft'}},true,'a').kind,'blocked'));
test('new round is progressed separately from current Published',()=>assert.equal(e.contributionNext({...base,workflow:{...base.workflow,publishedRunId:'old'},run:{state:'Published',calculation:{peerSnapshotId:'peer1',gitEvidenceSnapshotId:'git1'}},snapshot:{snapshotId:'git1'},cohort:{status:1,snapshotId:null,ratings:[]}},true,'a').kind,'peer'));

const adjustment={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/contribution-adjustment.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:adjustment});
const plan={supported:true,executionAvailable:true,id:'attempt',state:'Syncing',gitSnapshotId:null,peerCohortId:null,peerSnapshotId:null,runId:null,repositories:[{jobStatus:'Pending',checkpointsComplete:false}],blockers:[]};
test('old SyncReady and old snapshots never authorize guided capture',()=>assert.equal(adjustment.adjustmentNext(plan,true),'waiting'));
test('all exact receipts required before guided capture',()=>assert.equal(adjustment.adjustmentNext({...plan,state:'SyncCompleted',repositories:[{jobStatus:'Completed',checkpointsComplete:true},{jobStatus:'Running',checkpointsComplete:false}]},true),'waiting'));
test('completed receipts with no new versions can proceed to readiness',()=>assert.equal(adjustment.adjustmentNext({...plan,state:'SyncCompleted',repositories:[{jobStatus:'Completed',checkpointsComplete:true,newVersionCount:0}]},false),'git-snapshot'));
test('partial repository failure blocks new snapshot',()=>assert.equal(adjustment.adjustmentNext({...plan,state:'Failed',blockers:['AUTHORIZATION_REQUIRED']},true),'blocked'));
test('new Peer is gated by owned new snapshot readiness',()=>assert.equal(adjustment.adjustmentNext({...plan,gitSnapshotId:'new-git'},false),'readiness'));
test('closed owned Peer uses guided new input run',()=>assert.equal(adjustment.adjustmentNext({...plan,gitSnapshotId:'new-git',peerCohortId:'new-cohort',peerSnapshotId:'new-peer'},true),'run'));
test('Draft cannot automatically publish',()=>assert.equal(adjustment.adjustmentNext({...plan,runId:'new-draft'},true),'review'));
test('worker off has no start action',()=>assert.equal(adjustment.adjustmentNext({...plan,id:null,executionAvailable:false},true),'disabled'));

test('abandoned captured input remains historical and permits explicit new attempt',()=>assert.equal(adjustment.adjustmentNext({...plan,canRestart:true,state:'Failed',gitSnapshotId:'retained'},true),'restart'));

test('opening Peer cohort is not completed evaluation',()=>assert.equal(adjustment.adjustmentStage({...plan,gitSnapshotId:'git-new',peerCohortId:'open-peer'}),3));
test('only frozen Peer snapshot advances to calculation',()=>assert.equal(adjustment.adjustmentStage({...plan,gitSnapshotId:'git-new',peerCohortId:'closed-peer',peerSnapshotId:'peer-new'}),4));

test('published v1 does not hide close action for owned ready combined Peer',()=>assert.equal(e.contributionNext({...base,workflow:{...base.workflow,publishedRunId:'v1'},adjustment:{id:'attempt',state:'PeerOpen',peerCohortId:'new-cohort',runId:null},cohort:{id:'new-cohort',status:2,submittedCount:6,requiredCount:6,ratings:[]}},true,'a').kind,'closePeer'));

const pub={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/published-contribution.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:pub});
const published={projectId:'p',publishedRunId:'v1',version:1,publishedAt:'2026-11-23T00:00:00Z',members:[{userProfileId:'a',contributionPercent:84.59},{userProfileId:'c',contributionPercent:0}]};
test('public member percent preserves zero',()=>assert.equal(pub.publishedPercent(published,'p','c'),'0%'));
test('missing published participant is never zero',()=>assert.equal(pub.publishedPercent(published,'p','missing'),'Chưa có dữ liệu'));
test('other project cannot reuse displayed percentages',()=>assert.equal(pub.publishedPercent(published,'other','a'),'Chưa có dữ liệu'));
test('public contract rejects project mismatch',()=>assert.throws(()=>pub.validatePublished(published,'other')));
test('public contract rejects duplicate members and invalid values',()=>assert.throws(()=>pub.validatePublished({...published,members:[published.members[0],published.members[0]]},'p')));
test('no publication is explicit empty state',()=>assert.equal(pub.validatePublished({projectId:'p',publishedRunId:null,version:null,publishedAt:null,members:[]},'p').publishedRunId,null));

const presentation={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/contribution-presentation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:presentation});
test('five-step production flow keeps Peer pending until frozen',()=>assert.equal(presentation.adjustmentUserStep({...plan,gitSnapshotId:'frozen',peerCohortId:'open'}),2));
test('frozen Peer enables preview step without publication',()=>assert.equal(presentation.adjustmentUserStep({...plan,gitSnapshotId:'frozen',peerSnapshotId:'peer'}),3));
test('Draft is review step, not completed publication',()=>assert.equal(presentation.adjustmentUserStep({...plan,runId:'draft'}),4));
test('only published record completes production flow',()=>assert.equal(presentation.adjustmentUserStep({...plan,state:'Published'}),5));
test('developer notes are omitted but integrity blockers remain',()=>assert.equal(JSON.stringify(presentation.userReasonCodes(['DiagnosticNotContributionRun','RosterAndHistoryFrozenInDiagnosticArtifactOnly','EvidenceCoverageIncomplete','EvidenceCoverageIncomplete'])),JSON.stringify(['EvidenceCoverageIncomplete'])));
test('project roles have Vietnamese production labels',()=>assert.equal(presentation.projectRoleLabel('Creator'),'Chủ dự án'));
test('audit actions use business labels instead of raw enums',()=>assert.equal(presentation.auditActionLabel('Created'),'Đã tạo bản nháp'));
test('production screens do not render raw serialized audit objects',()=>assert.equal(fs.readFileSync('src/components/projects/contribution/ContributionAudit.tsx','utf8').includes('JSON.stringify(x'),false));
