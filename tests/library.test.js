import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePersonal, sortPrompts, createPersonalBackup, parsePersonalBackup, uniquePersonalImports } from '../extension/library.js';

test('personal backup round-trips Vietnamese text without device IDs or credentials',()=>{
  const p={title:'Thư mời',description:'Mời họp',content:'Dòng một\n{{tên}} — tiếng Việt',categoryId:'Cá nhân',id:'local-old',revision:'old',password:'secret'};
  const text=JSON.stringify(createPersonalBackup([p]));
  assert.deepEqual(parsePersonalBackup(text),[validatePersonal(p)]);
  assert.equal(text.includes('secret'),false);assert.equal(text.includes('local-old'),false);
});
test('personal imports reject corrupt, foreign, oversized or partly invalid backups',()=>{
  assert.throws(()=>parsePersonalBackup('{'));
  assert.throws(()=>parsePersonalBackup(JSON.stringify({app:'other',prompts:[]})));
  assert.throws(()=>parsePersonalBackup('x'.repeat(5*1024*1024+1)));
  const valid={title:'A',description:'',content:'Nội dung',categoryId:'Chung'};
  const backup=createPersonalBackup([valid]);backup.prompts.push({...valid,content:''});
  assert.throws(()=>parsePersonalBackup(JSON.stringify(backup)),/thứ 2/);
});
test('personal imports skip exact duplicates while preserving same-title different drafts',()=>{
  const p={title:'A',description:'',content:'Bản gốc',categoryId:'Chung'};
  const result=uniquePersonalImports([p,{...p,content:'Bản khác'},p],[p]);
  assert.equal(result.skipped,2);assert.equal(result.prompts.length,1);
  assert.equal(result.prompts[0].content,'Bản khác');assert.equal(p.content,'Bản gốc');
});

test('personal prompts keep Vietnamese content and validate before storing',()=>{
  const input={title:' Thư mời ',description:'',content:'Viết thư mời\n{{khach_hang}}',categoryId:''};
  const saved=validatePersonal(input);
  assert.equal(saved.categoryId,'Chung');assert.equal(saved.content,input.content);
  assert.throws(()=>validatePersonal({...input,content:' '}));
  assert.throws(()=>validatePersonal({...input,title:'x'.repeat(101)}));
});
test('recent and frequent sorting use successful local usage without mutating the library',()=>{
  const prompts=[{id:'a',title:'A'},{id:'b',title:'B'},{id:'c',title:'C'}];
  const usage={a:{count:5,lastUsed:10},b:{count:2,lastUsed:20}};
  assert.deepEqual(sortPrompts(prompts,'recent',usage).map(p=>p.id),['b','a','c']);
  assert.deepEqual(sortPrompts(prompts,'frequent',usage).map(p=>p.id),['a','b','c']);
  assert.deepEqual(prompts.map(p=>p.id),['a','b','c']);
});
