import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCatalog } from '../extension/sync-state.js';
const old={id:'405',title:'Ancien',content:'Old'};
const changed={...old,title:'Nouveau'};
const base={departments:[{id:'general',name:'Chung'}],categories:[],prompts:[old]};
test('stale published data cannot roll back a saved prompt and unrelated updates arrive',()=>{
 const pending={prompts:{405:changed},taxonomy:{},since:1};
 const remote={...base,prompts:[old,{id:'406',title:'New'}]};
 const result=reconcileCatalog(remote,pending);
 assert.deepEqual(result.catalog.prompts,[changed,remote.prompts[1]]);
 assert.ok(result.pending);
 assert.equal(reconcileCatalog({...base,prompts:[changed]},pending).pending,null);
});
test('pending deletion and taxonomy rename survive until the published catalog catches up',()=>{
 const departments=[{id:'general',name:'KHTH'}];
 const pending={prompts:{405:null},taxonomy:{departments},since:1};
 const result=reconcileCatalog(base,pending);
 assert.deepEqual(result.catalog.prompts,[]);
 assert.deepEqual(result.catalog.departments,departments);
 assert.ok(result.pending);
 const fresh=reconcileCatalog({...base,departments,prompts:[]},pending);
 assert.equal(fresh.pending,null);
 assert.deepEqual(base.prompts,[old]);
});
