import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProposal } from '../server/lib.js';
const departments=[{id:'general'}],categories=[{id:'writing'}];
const valid={title:'Tiêu đề',description:'Mô tả',content:'Xin chào {{ten}}. {{ten}}',departmentId:'general',categoryId:'writing',tags:[' chào ','chào']};
test('extracts unique variables and tags',()=>{const result=validateProposal(valid,departments,categories);assert.deepEqual(result.variables,[{name:'ten',label:'ten',required:true}]);assert.deepEqual(result.tags,['chào']);});
test('rejects invalid internal classification',()=>assert.throws(()=>validateProposal({...valid,departmentId:'secret'},departments,categories),/Thông tin phân loại/));
test('rejects oversized content',()=>assert.throws(()=>validateProposal({...valid,content:'x'.repeat(20001)},departments,categories),/dài/));
