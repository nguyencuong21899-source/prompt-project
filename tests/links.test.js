import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLink,validLinks,saveBookmarks,requestBookmarkPermission,bookmarkErrorMessage,groupLinks} from '../extension/links.js';
import {loadLinks,changeLinks} from '../server/links.js';
test('links validate web addresses and reject executable URLs and embedded secrets',()=>{
  const input={title:' Công cụ ',url:'https://example.com',group:'AI',description:''};
  assert.equal(validateLink(input).url,'https://example.com/');
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///C:/test','https://user:pass@example.com','wrong'])assert.throws(()=>validateLink({...input,url}));
  assert.equal(validLinks([{id:'a',...input},{id:'a',...input}]),false);
  assert.equal(validLinks([{id:'a',...input}]),true);
});
test('bookmark saves go directly to the bar and skip normalized duplicates',async()=>{
  const created=[];const api={getTree:async()=>[{id:'0',children:[{id:'1',children:[{id:'old',parentId:'1',url:'https://example.com/'}]}]}],create:async input=>{const node={id:String(created.length+2),...input};created.push(node);return node;}};
  const link=(url)=>({title:'Tool',group:'AI',url});
  assert.deepEqual(await saveBookmarks(api,[link('https://example.com'),link('https://other.com'),link('https://other.com/')]),{added:1,moved:0,skipped:2});
  assert.equal(created.length,1);assert.equal(created[0].parentId,'1');assert.equal(created[0].index,0);
});
test('saved folder bookmarks move to the real bar without creating duplicates',async()=>{
  const moved=[];const api={getTree:async()=>[{id:'0',children:[{id:'account-bar',folderType:'bookmarks-bar'},{id:'2',children:[{id:'folder',title:'Công cụ CNC',children:[{id:'gemini',parentId:'folder',url:'https://gemini.google.com/app'}]}]}]}],move:async(id,destination)=>moved.push({id,...destination}),create:async()=>{throw Error('Should move existing bookmark');}};
  assert.deepEqual(await saveBookmarks(api,[{title:'Gemini',group:'AI',url:'https://gemini.google.com/app'}]),{added:0,moved:1,skipped:0});
  assert.deepEqual(moved,[{id:'gemini',parentId:'account-bar',index:0}]);
  await assert.rejects(saveBookmarks({getTree:async()=>[{id:'0',children:[{id:'1',unmodifiable:'managed'}]}]},[{title:'Tool',group:'AI',url:'https://example.com'}]),/chính sách/);
});
test('links remain sorted inside named sections and retain custom categories',()=>{
  const sections=groupLinks([{title:'Internal',group:'Nội bộ'},{title:'Docs',group:'Tài liệu'},{title:'AI',group:'AI'}],true);
  assert.deepEqual(sections.map(group=>group.name),['Phần mềm AI','Phần mềm công ty','Tài liệu']);
  assert.equal(sections[1].items[0].title,'Internal');assert.equal(groupLinks([],true).length,2);
});
test('bookmark permission requests preserve the click and explain outdated installed manifests',async()=>{
  const calls=[];
  const api={runtime:{getManifest:()=>({optional_permissions:['bookmarks']})},permissions:{request:value=>{calls.push(value);return Promise.resolve(true);}}};
  const pending=requestBookmarkPermission(api);
  assert.deepEqual(calls,[{permissions:['bookmarks']}]);assert.equal(await pending,true);
  api.runtime.getManifest=()=>({permissions:['storage'],version:'0.7.2'});
  assert.throws(()=>requestBookmarkPermission(api),/chrome:\/\/extensions/);assert.equal(calls.length,1);
  api.runtime.getManifest=()=>({optional_permissions:['bookmarks']});api.permissions.request=()=>Promise.resolve(false);
  assert.equal(await requestBookmarkPermission(api),false);
  api.permissions.request=()=>Promise.reject(Error('This function must be called during a user gesture'));
  await assert.rejects(requestBookmarkPermission(api),/user gesture/);
  assert.match(bookmarkErrorMessage(Error('This function must be called during a user gesture')),/mở lại/);
  assert.match(bookmarkErrorMessage(Error('Extension context invalidated')),/Tải lại/);
});
test('managed links add, edit, delete with conflict protection and storage commits',async()=>{
  const original=globalThis.fetch,token=process.env.GITHUB_TOKEN;process.env.GITHUB_TOKEN='test';
  let items=[],sha='v1',writes=0;
  globalThis.fetch=async(_url,options={})=>{
    if(options.method==='PUT'){const body=JSON.parse(options.body);assert.equal(body.sha,sha);items=JSON.parse(Buffer.from(body.content,'base64'));sha='v'+(++writes+1);return Response.json({content:{sha},commit:{sha:'commit'}});}
    return Response.json({sha,content:Buffer.from(JSON.stringify(items)).toString('base64')});
  };
  try{
    let result=await changeLinks('POST',{sha,title:'AI',group:'AI',url:'https://example.com'});const id=result.items[0].id;
    await assert.rejects(changeLinks('PUT',{sha:'stale',title:'Changed',group:'AI',url:'https://example.com'},id),error=>error.status===409);
    result=await changeLinks('PUT',{sha,title:'Changed',group:'Tools',url:'https://example.com/new'},id);assert.equal(result.items[0].title,'Changed');
    result=await changeLinks('DELETE',{sha},id);assert.deepEqual(result.items,[]);assert.equal(writes,3);assert.deepEqual((await loadLinks()).items,[]);
  }finally{globalThis.fetch=original;if(token===undefined)delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=token;}
});
