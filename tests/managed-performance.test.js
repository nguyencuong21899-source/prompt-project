import test from 'node:test';
import assert from 'node:assert/strict';
import { listManagedPrompts } from '../server/lib.js';
test('large prompt libraries load in order with at most six GitHub requests in flight',async()=>{
 const previousFetch=globalThis.fetch,previousToken=process.env.GITHUB_TOKEN;
 process.env.GITHUB_TOKEN='test-only';
 let active=0,maximum=0;
 const files=Array.from({length:15},(_,i)=>({type:'file',name:`${401+i}.json`}));
 globalThis.fetch=async url=>{
  if(url.endsWith('/contents/data/prompts?ref=main'))return Response.json(files);
  const id=url.match(/\/([0-9]+)\.json/)[1];
  active++;maximum=Math.max(maximum,active);
  await new Promise(resolve=>setTimeout(resolve,5));active--;
  return Response.json({sha:'sha-'+id,content:Buffer.from(JSON.stringify({id,title:id})).toString('base64')});
 };
 try{const results=await listManagedPrompts();assert.equal(results.length,15);assert.ok(maximum<=6);assert.deepEqual(results.map(item=>item.prompt.id),files.map(file=>file.name.slice(0,-5)));}
 finally{globalThis.fetch=previousFetch;if(previousToken===undefined)delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=previousToken;}
});
