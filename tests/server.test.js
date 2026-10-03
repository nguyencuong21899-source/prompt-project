import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { readJsonBody } from '../server/request.js';

test('JSON body keeps Vietnamese characters split across network chunks', async () => {
  const payload = { content: 'Tiếng Việt: chân dung diễn giả 🎤' };
  const bytes = Buffer.from(JSON.stringify(payload));
  const split = bytes.indexOf(Buffer.from('ế')) + 1;
  const parsed = await readJsonBody(Readable.from([bytes.subarray(0, split), bytes.subarray(split)]));
  assert.deepEqual(parsed, payload);
});

test('proposal, approval and rejection work through the HTTP API', async () => {
  const previousFetch = globalThis.fetch;
  const state = { proposals: [], comments: [], merged: [], taxonomyRevision: 1,
    taxonomy: {
      departments:{items:[{id:'general',name:'Chung'},{id:'marketing',name:'Marketing'}],sha:'a'.repeat(40)},
      categories:{items:[{id:'image',name:'Hình ảnh'},{id:'presentation',name:'Thuyết trình'}],sha:'b'.repeat(40)}
    }, library: new Map([
    ['401',{sha:'d'.repeat(40),prompt:{id:'401',title:'Bản đầu',description:'Mô tả ban đầu',content:'Nội dung ban đầu',departmentId:'general',categoryId:'image',tags:[],variables:[],author:'Prompt Hub',updatedAt:'2026-09-30',schemaVersion:1}}]
  ]) };
  process.env.PORT = '0';
  process.env.GITHUB_REPOSITORY = 'prompt-hub-tests/example';
  process.env.GITHUB_TOKEN = 'test-token-only';
  process.env.ADMIN_PASSWORD = 'test-admin-password';
  process.env.ENABLE_PROPOSALS = 'true';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  const success = (data, status = 200) => Response.json(data, { status });
  globalThis.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if(url.startsWith('https://generativelanguage.googleapis.com/')){
      state.geminiRequest=JSON.parse(options.body);
      return success({candidates:[{content:{parts:[{text:'Prompt rõ ràng hơn'}]}}]});
    }
    const prefix = 'https://api.github.com/repos/prompt-hub-tests/example';
    if (!url.startsWith(prefix)) return previousFetch(input, options);
    const path = url.slice(prefix.length);
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    const taxonomyPath=/^\/contents\/data\/(departments|categories)\.json(?:\?ref=main)?$/.exec(path);
    if(taxonomyPath){
      const item=state.taxonomy[taxonomyPath[1]];
      if(method==='GET')return success({sha:item.sha,content:Buffer.from(JSON.stringify(item.items)).toString('base64')});
      if(method==='PUT'){
        if(body.sha!==item.sha)return success({message:'Conflict'},409);
        item.items=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
        item.sha=String(++state.taxonomyRevision).padStart(40,'0');
        return success({content:{sha:item.sha},commit:{sha:'c'.repeat(40)}});
      }
    }
    if (path === '/git/ref/heads/main') return success({ object: { sha: 'a'.repeat(40) } });
    if (path === '/git/refs' && method === 'POST') {
      state.branch = body.ref.slice('refs/heads/'.length);
      return success({ ref: body.ref }, 201);
    }
    if (path === '/contents/data/prompts?ref=main' && method === 'GET') return success(
      [...state.library].map(([id,value])=>({name:id+'.json',type:'file',sha:value.sha})));
    if (path.startsWith('/contents/data/prompts/') && method === 'PUT' && body.branch === 'main') {
      const id=path.slice('/contents/data/prompts/'.length,-5);
      const current=state.library.get(id);
      if ((current?.sha||undefined)!==body.sha) return success({message:'Conflict'},409);
      const sha=String(state.library.size+1).repeat(40);
      const prompt=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
      state.library.set(id,{prompt,sha});
      return success({content:{sha},commit:{sha:'e'.repeat(40)}},current?200:201);
    }
    if (path.startsWith('/contents/data/prompts/') && method === 'DELETE') {
      const id=path.slice('/contents/data/prompts/'.length,-5);
      if(state.library.get(id)?.sha!==body.sha)return success({message:'Conflict'},409);
      state.library.delete(id);return success({commit:{sha:'f'.repeat(40)}});
    }
    if (path.startsWith('/contents/data/prompts/') && method === 'PUT') {
      state.file = path.slice('/contents/'.length);
      state.prompt = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      return success({ content: { path: state.file } }, 201);
    }
    if (path === '/pulls' && method === 'POST') {
      const number = state.proposals.length + 1;
      const pr = { number, title: body.title, html_url: `https://github.com/prompt-hub-tests/example/pull/${number}`,
        created_at: new Date().toISOString(), state: 'open',
        head: { ref: body.head, sha: 'b'.repeat(40) }, base: { ref: 'main' },
        prompt: state.prompt, file: state.file };
      state.proposals.push(pr);
      return success(pr, 201);
    }
    if (path === '/pulls?state=open&per_page=100') return success(state.proposals.filter(p => p.state === 'open'));
    const match = /^\/pulls\/(\d+)(\/files\?per_page=100|\/merge)?$/.exec(path);
    if (match) {
      const pr = state.proposals[Number(match[1]) - 1];
      if (!pr) return success({ message: 'Not Found' }, 404);
      if (match[2] === '/files?per_page=100') return success([{ filename: pr.file, status: 'added' }]);
      if (match[2] === '/merge' && method === 'PUT') {
        pr.state = 'closed'; state.merged.push(pr.number);
        return success({ merged: true, sha: 'c'.repeat(40) });
      }
      if (method === 'PATCH') { pr.state = body.state; return success(pr); }
      return success(pr);
    }
    if (path.startsWith('/contents/data/prompts/') && method === 'GET') {
      if(path.endsWith('?ref=main')){
        const id=path.split('?')[0].slice('/contents/data/prompts/'.length,-5);
        const item=state.library.get(id);
        if(!item)return success({message:'Not Found'},404);
        return success({sha:item.sha,content:Buffer.from(JSON.stringify(item.prompt)).toString('base64')});
      }
      const pr = state.proposals.find(p => p.file === path.split('?')[0].slice('/contents/'.length));
      return success({ content: Buffer.from(JSON.stringify(pr.prompt)).toString('base64') });
    }
    if (/^\/issues\/\d+\/comments$/.test(path) && method === 'POST') {
      state.comments.push(body.body); return success({ id: state.comments.length }, 201);
    }
    throw Error(`Unexpected mocked GitHub request: ${method} ${path}`);
  };
  let server;
  try {
    ({ server } = await import('../server/index.js'));
    if (!server.listening) await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const admin = { Authorization: 'Bearer test-admin-password' };
    const proposal = { title: 'Chân dung tiếng Việt', description: 'Mô tả có dấu',
      content: 'Hãy tạo ảnh diễn giả nữ {{nhan_vat}} 🎤', departmentId: 'general', categoryId: 'image', tags: ['hội nghị'] };
    const post = (path, value, headers = {}) => previousFetch(base + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value)
    });

    const health = await (await previousFetch(base + '/health')).json();
    assert.deepEqual(health, { ok: true, configured: true });
    assert.equal((await post('/api/optimize',{prompt:'Viết email mời họp'})).status,403);
    const optimized=await post('/api/optimize',{prompt:'Viết email mời họp'},{Origin:'chrome-extension://'+'a'.repeat(32)});
    assert.equal(optimized.status,200);
    assert.equal((await optimized.json()).optimized,'Prompt rõ ràng hơn');
    assert.equal(state.geminiRequest.contents[0].parts[0].text,'Viết email mời họp');
    assert.equal((await post('/api/optimize',{prompt:'ngắn'},{Origin:'chrome-extension://'+'a'.repeat(32)})).status,400);
    assert.equal((await previousFetch(base+'/api/admin/prompts')).status,401);
    assert.equal((await previousFetch(base+'/api/admin/links')).status,401);
    assert.equal((await post('/api/admin/links',{title:'Unauthorized'})).status,401);
    const initial=await (await previousFetch(base+'/api/admin/prompts',{headers:admin})).json();
    assert.equal(initial[0].prompt.id,'401');
    const managed={title:'Prompt mới',description:'Mô tả mới',content:'Nội dung {{nguoi_dung}}',departmentId:'general',categoryId:'image',tags:['mới']};
    const added=await post('/api/admin/prompts',managed,admin);
    assert.equal(added.status,201);
    const createdPrompt=await added.json();
    assert.equal(createdPrompt.prompt.id,'402');
    assert.equal(createdPrompt.prompt.variables[0].name,'nguoi_dung');
    const put=(path,value)=>previousFetch(base+path,{method:'PUT',headers:{'Content-Type':'application/json',...admin},body:JSON.stringify(value)});
    assert.equal((await put('/api/admin/prompts/402',{...managed,title:'Đã sửa',sha:'old'})).status,409);
    const updated=await put('/api/admin/prompts/402',{...managed,title:'Đã sửa',sha:createdPrompt.sha});
    assert.equal(updated.status,200);
    const updatedPrompt=await updated.json();
    assert.equal(updatedPrompt.prompt.title,'Đã sửa');
    assert.equal(state.library.get('402').prompt.title,'Đã sửa');
    const del=(id,sha)=>previousFetch(base+'/api/admin/prompts/'+id,{method:'DELETE',headers:{'Content-Type':'application/json',...admin},body:JSON.stringify({sha})});
    assert.equal((await del('402','old')).status,409);
    assert.equal((await del('402',updatedPrompt.sha)).status,200);
    assert.equal(state.library.has('402'),false);
    assert.equal((await previousFetch(base+'/api/admin/taxonomy/departments')).status,401);
    const departments=await (await previousFetch(base+'/api/admin/taxonomy/departments',{headers:admin})).json();
    const addedDepartment=await (await post('/api/admin/taxonomy/departments',{name:'Pháp chế',sha:departments.sha},admin)).json();
    assert.equal(addedDepartment.items.at(-1).id,'phap-che');
    assert.equal((await put('/api/admin/taxonomy/departments/phap-che',{name:'Pháp lý',sha:departments.sha})).status,409);
    const renamedDepartment=await (await put('/api/admin/taxonomy/departments/phap-che',{name:'Pháp lý',sha:addedDepartment.sha})).json();
    assert.equal(renamedDepartment.items.at(-1).id,'phap-che');
    assert.equal(renamedDepartment.items.at(-1).name,'Pháp lý');
    assert.equal((await post('/api/admin/taxonomy/departments',{name:'Pháp lý',sha:renamedDepartment.sha},admin)).status,400);
    const deleteTaxonomy=(kind,id,sha)=>previousFetch(base+'/api/admin/taxonomy/'+kind+'/'+id,{method:'DELETE',headers:{'Content-Type':'application/json',...admin},body:JSON.stringify({sha})});
    assert.equal((await deleteTaxonomy('departments','general',renamedDepartment.sha)).status,409);
    assert.equal((await deleteTaxonomy('departments','phap-che',renamedDepartment.sha)).status,200);
    const categories=await (await previousFetch(base+'/api/admin/taxonomy/categories',{headers:admin})).json();
    const addedCategory=await (await post('/api/admin/taxonomy/categories',{name:'Báo cáo',sha:categories.sha},admin)).json();
    assert.equal(addedCategory.items.at(-1).id,'bao-cao');
    const categoryPrompt=await (await post('/api/admin/prompts',{...managed,categoryId:'bao-cao'},admin)).json();
    assert.equal(categoryPrompt.prompt.categoryId,'bao-cao');
    assert.equal((await deleteTaxonomy('categories','bao-cao',addedCategory.sha)).status,409);
    assert.equal((await del(categoryPrompt.prompt.id,categoryPrompt.sha)).status,200);
    assert.equal((await deleteTaxonomy('categories','bao-cao',addedCategory.sha)).status,200);
    const malformed = await previousFetch(base + '/api/proposals', { method: 'POST', body: '{invalid' });
    assert.equal(malformed.status, 400);
    assert.match((await malformed.json()).error, /JSON/);
    const oversized = await previousFetch(base + '/api/proposals', { method: 'POST', body: 'x'.repeat(100_001) });
    assert.equal(oversized.status, 413);
    assert.equal((await post('/api/proposals', { ...proposal, departmentId: 'unknown' })).status, 400);
    const created = await post('/api/proposals', proposal, { Origin: 'chrome-extension://' + 'a'.repeat(32) });
    assert.equal(created.status, 201);
    assert.equal(created.headers.get('access-control-allow-origin'), 'chrome-extension://' + 'a'.repeat(32));
    assert.equal((await created.json()).number, 1);
    assert.equal(state.prompt.content, proposal.content);
    assert.equal(state.prompt.variables[0].name, 'nhan_vat');

    assert.equal((await previousFetch(base + '/api/admin/proposals')).status, 401);
    for (let i = 0; i < 35; i++) {
      const response = await previousFetch(base + '/api/admin/proposals', { headers: admin });
      assert.equal(response.status, 200);
    }
    const listed = await (await previousFetch(base + '/api/admin/proposals', { headers: admin })).json();
    assert.equal(listed.length, 1);
    assert.equal((await post('/api/admin/proposals/1/approve', { headSha: 'stale' }, admin)).status, 409);
    assert.equal((await post('/api/admin/proposals/1/approve', {}, admin)).status, 400);
    const approved = await post('/api/admin/proposals/1/approve', { headSha: listed[0].headSha }, admin);
    assert.equal(approved.status, 200);
    assert.deepEqual(state.merged, [1]);

    assert.equal((await post('/api/proposals', { ...proposal, title: 'Đề xuất thứ hai' })).status, 201);
    const rejected = await post('/api/admin/proposals/2/reject', { headSha: 'b'.repeat(40), reason: 'Cần sửa nội dung' }, admin);
    assert.equal(rejected.status, 200);
    assert.equal(state.proposals[1].state, 'closed');
    assert.deepEqual(state.comments, ['Từ chối: Cần sửa nội dung']);
    for (let i = 0; i < 25; i++) {
      assert.equal((await previousFetch(base + '/api/admin/proposals', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
    }
    assert.equal((await previousFetch(base + '/api/admin/proposals', { headers: { Authorization: 'Bearer wrong' } })).status, 429);
    assert.equal((await previousFetch(base + '/api/admin/proposals', { headers: admin })).status, 200);
    delete process.env.ENABLE_PROPOSALS;
    assert.equal((await post('/api/proposals',proposal)).status,404);
  } finally {
    delete process.env.GEMINI_API_KEY;
    globalThis.fetch = previousFetch;
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
