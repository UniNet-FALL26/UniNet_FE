const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const path=require('node:path');
const exportsModule={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/utils/display-name.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsModule});
const {getDisplayName}=exportsModule;
test('app display name uses nickname first and keeps full name as fallback',()=>{
 assert.equal(getDisplayName({nickname:'  Quyền  ',fullName:'Trịnh Trọng Quyền',displayName:'Other'}),'Quyền');
 assert.equal(getDisplayName({nickname:' ',displayName:'Public nickname',fullName:'Full name'}),'Public nickname');
 assert.equal(getDisplayName({fullName:'Full name'}),'Full name');assert.equal(getDisplayName(null),'Thành viên UniNet');
});
