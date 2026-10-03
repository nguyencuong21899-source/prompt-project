import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { chromium } from 'playwright';
import { linkGroupName } from '../extension/links.js';

// Isolated Chromium profile. Only the Gemini-shaped HTML fixture is served here;
// these tests never use an employee's browser, AI account or live conversations.
const fixtureRoot = await mkdtemp(join(tmpdir(), 'prompt-hub-test-'));
const extension = join(fixtureRoot, 'extension');
await cp(resolve('extension'), extension, { recursive: true });
const manifest = JSON.parse(await readFile(join(extension, 'manifest.json')));
// Read permission is only for assertions; the shipped extension only writes clipboard.
manifest.permissions.push('clipboardRead');
// Pregrant only in this disposable profile; shipped bookmark access is optional.
manifest.permissions.push('bookmarks');
delete manifest.optional_permissions;
// The published API URL is fixed; grant it in this isolated test profile.
manifest.host_permissions.push('https://prompt-hub-api-yktt.onrender.com/*');
await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
let context;
let passed = 0;
const check = async (name, run) => { await run(); console.log('PASS ' + name); passed++; };
try {
context = await chromium.launchPersistentContext(join(fixtureRoot, 'profile'), {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  await check('toolbar action opens a persistent side panel', async () => {
    assert.equal(manifest.action.default_popup, undefined);
    assert.equal(manifest.side_panel.default_path, 'popup.html');
    const behavior = await worker.evaluate(async () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const current = await chrome.sidePanel.getPanelBehavior();
        if (current.openPanelOnActionClick) return current;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return chrome.sidePanel.getPanelBehavior();
    });
    assert.equal(behavior.openPanelOnActionClick, true);
  });
  const baseCatalog = JSON.parse(await readFile('data/catalog.json'));
  const companyLinkCount=baseCatalog.links.filter(link=>linkGroupName(link.group)==='Phần mềm công ty').length;
  const aiLinkCount=baseCatalog.links.filter(link=>linkGroupName(link.group)==='Phần mềm AI').length;
  let remoteCatalog = baseCatalog;
  let offline = false;
  await context.route('https://raw.githubusercontent.com/**', route => offline
    ? route.abort() : route.fulfill({ json: remoteCatalog }));
  await context.route('https://gemini.google.com/**', route => route.fulfill({
    contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="vi"><body><form role="search"><textarea placeholder="Tìm kiếm"></textarea></form><div class="ql-editor textarea new-input-ui" contenteditable="true" role="textbox" aria-label="Nhập câu lệnh cho Gemini" style="width:600px;min-height:100px;border:1px solid gray"></div><button id="send">Gửi</button><script>window.sent=0;document.querySelector("#send").onclick=()=>window.sent++;</script></body></html>'
  }));
  const popup = await context.newPage();
  const errors = [];
  popup.on('pageerror', e => errors.push(e.message));
  const waitForStored=async(key,property,expected)=>{
    for(let attempt=0;attempt<40;attempt++){
      const state=await worker.evaluate(key=>chrome.storage.local.get(key),key);
      if(state[key]?.[property]===expected)return;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw Error('Local storage did not persist '+key+'.'+property);
  };
  const openPopup = async () => {
    await worker.evaluate(()=>chrome.storage.local.remove('preferences'));
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForFunction(()=>document.body.dataset.ready==='true');
    await popup.locator('.card').first().waitFor();
    await popup.waitForFunction(() => !document.getElementById('refresh-button').disabled);
  };
  await check('extension loads and synchronizes catalog', async () => {
    await openPopup();
    assert.equal(manifest.name,'Prompt CNC');
    assert.equal(await popup.locator('.topbar #search').count(),1);
    assert.equal(await popup.locator('.main-navigation #links-tab').count(),1);
    assert.equal(await popup.locator('#prompt-scopes #links-tab').count(),0);
    assert.match(await popup.locator('#open-optimizer').textContent(),/Tối ưu prompt/);
    assert.equal(await popup.locator('.toolbar-actions').first().evaluate(node=>node.firstElementChild.id),'open-optimizer');
    assert.equal(await popup.locator('#department').count(),0);
    assert.equal(await popup.locator('.card').count(), baseCatalog.prompts.length);
    assert.match(await popup.locator('#sync-label').innerText(), /^Đã đồng bộ/);
    assert.equal(await popup.locator('.toast').count(),0,'Automatic startup sync must not cover the prompt list');
    await popup.locator('.card-title').first().click();
    assert.equal(await popup.locator('#library-view').isVisible(), true);
    assert.equal(await popup.locator('#detail-view').count(), 0);
  });
  await check('links open and save actual bookmarks without duplicates',async()=>{
    await popup.locator('#links-tab').click();
    assert.equal(await popup.locator('#prompt-scopes').isVisible(),false);
    assert.equal(await popup.locator('#company-links').getAttribute('aria-pressed'),'true');
    assert.equal(await popup.locator('#category').inputValue(),'Phần mềm công ty');
    assert.equal(await popup.locator('.link-card').count(),companyLinkCount);
    await popup.locator('#ai-links').click();
    assert.equal(await popup.locator('#ai-links').getAttribute('aria-pressed'),'true');
    await waitForStored('preferences','category','Phần mềm AI');
    await popup.reload();await popup.waitForFunction(()=>document.body.dataset.ready==='true');
    assert.equal(await popup.locator('#category').inputValue(),'Phần mềm công ty');
    await popup.locator('#ai-links').click();
    assert.equal(await popup.locator('.link-card').count(),aiLinkCount);
    const geminiMatches=baseCatalog.links.filter(link=>linkGroupName(link.group)==='Phần mềm AI'&&[link.title,link.description,link.url].join(' ').toLowerCase().includes('gemini')).length;
    await popup.locator('#search').fill('Gemini');assert.equal(await popup.locator('.link-card').count(),geminiMatches);
    const created=context.waitForEvent('page');await popup.getByRole('link',{name:'Gemini',exact:true}).click();
    const page=await created;await page.waitForURL('https://gemini.google.com/app');await page.close();await popup.bringToFront();
    await popup.getByRole('button',{name:'Lưu dấu trang Gemini',exact:true}).click();
    await popup.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('Đã đưa 1 liên kết'));
    await popup.getByRole('button',{name:'Lưu dấu trang Gemini',exact:true}).click();
    await popup.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('đã có trên thanh dấu trang'));
    await popup.locator('#search').fill('');await popup.locator('#bookmark-all').click();
    await popup.waitForFunction(count=>document.querySelector('.toast')?.textContent.includes('Đã đưa '+count+' liên kết'),aiLinkCount-1);
    const folder=await worker.evaluate(()=>chrome.bookmarks.search({title:'Công cụ CNC'}));assert.equal(folder.length,0);
    const tree=await worker.evaluate(()=>chrome.bookmarks.getTree());const bar=tree[0].children.find(node=>node.folderType==='bookmarks-bar'||node.id==='1');assert.equal(bar.children.filter(node=>node.url).length,aiLinkCount);
    await mkdir('dist',{recursive:true});
    for(const width of [300,390]){
      await popup.setViewportSize({width,height:850});assert.equal(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const layout=await popup.evaluate(()=>({listTop:document.querySelector('#prompt-list').getBoundingClientRect().top,cardHeight:document.querySelector('.link-card').getBoundingClientRect().height}));
      assert.ok(layout.listTop<240,'Links controls must leave space for the list');
      assert.ok(layout.cardHeight<165,'Link cards must stay compact');
      await popup.screenshot({path:`dist/links-${width}.png`});
    }
    await popup.locator('#prompt-main').click();await popup.locator('#all-prompts').click();assert.equal(await popup.locator('.list-header').isVisible(),false);
    await popup.evaluate(()=>document.querySelector('.toast')?.remove());
  });
  await check('bookmark permission failures give actionable messages without writing bookmarks',async()=>{
    await popup.locator('#links-tab').click();
    await popup.locator('#ai-links').click();
    await popup.evaluate(()=>{window.bookmarkRequest=chrome.permissions.request;chrome.permissions.request=()=>Promise.resolve(false);});
    await popup.getByRole('button',{name:'Lưu dấu trang Gemini',exact:true}).click();await popup.getByText('Chưa cấp quyền lưu dấu trang. Bạn vẫn có thể mở liên kết.',{exact:true}).waitFor();
    await popup.evaluate(()=>{chrome.permissions.request=()=>Promise.reject(Error('This function must be called during a user gesture'));});
    await popup.getByRole('button',{name:'Lưu dấu trang Gemini',exact:true}).click();await popup.getByText('Chrome chưa nhận thao tác cấp quyền. Đóng bảng, mở lại và bấm Lưu dấu trang một lần nữa.',{exact:true}).waitFor();
    await popup.evaluate(()=>{chrome.permissions.request=window.bookmarkRequest;delete window.bookmarkRequest;});
    const results=await popup.evaluate(()=>Promise.all([1,2].map(()=>chrome.runtime.sendMessage({type:'CNC_BOOKMARK_SAVE',links:[{title:'Concurrent tool',url:'https://example.com/concurrent',group:'Test'}]}))));
    assert.equal(results.every(result=>result.ok),true);assert.equal(results.reduce((sum,result)=>sum+result.bookmarks.added,0),1);
    const bookmarks=await worker.evaluate(()=>chrome.bookmarks.search({url:'https://example.com/concurrent'}));assert.equal(bookmarks.length,1);
    await worker.evaluate(async()=>{const folder=await chrome.bookmarks.create({title:'Công cụ CNC'});await chrome.bookmarks.create({parentId:folder.id,title:'Old tool',url:'https://example.com/old-folder'});});
    const migration=await popup.evaluate(()=>chrome.runtime.sendMessage({type:'CNC_BOOKMARK_SAVE',links:[{title:'Old tool',url:'https://example.com/old-folder',group:'Test'}]}));assert.equal(migration.bookmarks.moved,1);
    const migrated=await worker.evaluate(()=>chrome.bookmarks.search({url:'https://example.com/old-folder'}));assert.equal(migrated.length,1);
    const barTree=await worker.evaluate(()=>chrome.bookmarks.getTree());const bar=barTree[0].children.find(node=>node.folderType==='bookmarks-bar'||node.id==='1');assert.equal(migrated[0].parentId,bar.id);
    await popup.locator('#prompt-main').click();await popup.locator('#all-prompts').click();await popup.evaluate(()=>document.querySelector('.toast')?.remove());
  });
  await check('one click copies the exact full prompt to the real clipboard', async () => {
    await popup.bringToFront();
    await popup.getByRole('button', { name: `Sao chép ${baseCatalog.prompts[0].title}`, exact: true }).click();
    await popup.getByText('Đã sao chép prompt', { exact: true }).waitFor();
    assert.equal(await popup.evaluate(() => navigator.clipboard.readText()), baseCatalog.prompts[0].content);
  });
  await check('clipboard fallback copies when Clipboard API rejects', async () => {
    await popup.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('test')); });
    await popup.getByRole('button', { name: `Sao chép ${baseCatalog.prompts[1].title}`, exact: true }).click();
    await popup.getByText('Đã sao chép prompt', { exact: true }).waitFor();
    assert.equal(await popup.evaluate(() => navigator.clipboard.readText()), baseCatalog.prompts[1].content);
  });
  await check('preview shows the full original prompt, copies it and returns to the library',async()=>{
    const first=baseCatalog.prompts[0],button=popup.getByRole('button',{name:'Xem trước '+first.title,exact:true});
    await button.click();
    assert.equal(await popup.locator('#prompt-preview').isVisible(),true);
    assert.equal(await popup.locator('#preview-content').textContent(),first.content);
    assert.equal(await popup.locator('#preview-title').textContent(),first.title);
    await popup.locator('#copy-preview').click();
    await popup.locator('#preview-feedback').getByText('Đã sao chép prompt',{exact:true}).waitFor();
    assert.equal(await popup.evaluate(()=>navigator.clipboard.readText()),first.content);
    await mkdir('dist',{recursive:true});
    await popup.setViewportSize({width:390,height:650});
    await popup.screenshot({path:'dist/prompt-preview.png'});
    await popup.keyboard.press('Escape');
    assert.equal(await popup.locator('#prompt-preview').isVisible(),false);
    assert.equal(await button.evaluate(node=>node===document.activeElement),true);
    await button.click();
    await popup.locator('#close-preview').click();
    assert.equal(await popup.locator('#prompt-preview').isVisible(),false);
    await popup.setViewportSize({width:300,height:550});
    await popup.getByRole('button',{name:'Xem trước '+baseCatalog.prompts[1].title,exact:true}).click();
    assert.equal(await popup.locator('#preview-content').textContent(),baseCatalog.prompts[1].content);
    assert.equal(await popup.locator('#prompt-preview').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
    const dialog=await popup.locator('#prompt-preview').boundingBox();
    assert.ok(dialog.y>=0&&dialog.y+dialog.height<=550);
    await popup.screenshot({path:'dist/prompt-preview-long.png'});
    await popup.locator('#close-preview').click();
  });
  await check('favorites, filters and AI drafts survive reopening without account sign-in',async()=>{
    const first=baseCatalog.prompts[0];
    await popup.getByRole('button',{name:'Yêu thích '+first.title,exact:true}).click();
    await popup.getByRole('button',{name:'Yêu thích',exact:true}).click();
    assert.equal(await popup.locator('.card').count(),1);
    await popup.locator('#search').fill('#'+first.id);
    await waitForStored('preferences','search','#'+first.id);
    await popup.reload();
    await popup.waitForFunction(()=>document.body.dataset.ready==='true');
    await popup.locator('.card').first().waitFor();
    assert.equal(await popup.locator('#search').inputValue(),'#'+first.id);
    assert.equal(await popup.locator('.card').count(),1);
    await popup.locator('#reset-filters').click();
    await popup.locator('#prompt-main').click();await popup.locator('#all-prompts').click();
    await popup.locator('#open-optimizer').click();
    await popup.locator('#optimizer-input').fill('Bản nháp đang viết');
    await waitForStored('optimizerDraft','input','Bản nháp đang viết');
    await openPopup();
    await popup.locator('#open-optimizer').click();
    assert.equal(await popup.locator('#optimizer-input').inputValue(),'Bản nháp đang viết');
    await popup.locator('#back-optimizer').click();
  });
  await check('library has no horizontal overflow on narrow or wide panels',async()=>{
    await mkdir('dist',{recursive:true});
    for(const width of [300,390,600]){
      await popup.setViewportSize({width,height:850});
      assert.equal(await popup.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
      const bounds=await popup.locator('#prompt-list').boundingBox();
      assert.ok(bounds.y<=200,'Library tools must stay compact');
      assert.ok(bounds.height>=550,'Prompt list must use most of the panel');
      await popup.screenshot({path:`dist/library-${width}.png`});
    }
    await popup.setViewportSize({width:390,height:550});
    assert.ok((await popup.locator('#prompt-list').boundingBox()).height>=300);
    await popup.screenshot({path:'dist/library-short.png'});
    await popup.setViewportSize({width:390,height:850});
    await popup.getByRole('button',{name:'Cài đặt',exact:true}).click();
    await popup.screenshot({path:'dist/settings-new.png'});
    await popup.locator('#settings-view > .subhead .back-button').click();
  });
  await check('settings replaces add button and shows password access', async () => {
    assert.equal(await popup.locator('#add-button').count(), 0);
    await popup.getByRole('button',{name:'Cài đặt',exact:true}).click();
    assert.equal(await popup.locator('#admin-unavailable').isVisible(),false);
    assert.equal(await popup.locator('#unlock-form').isVisible(),true);
    await popup.locator('#settings-view > .subhead .back-button').click();
    assert.equal(await popup.locator('#library-view').isVisible(),true);
  });
  await check('employees optimize, edit and copy a prompt without logging in',async()=>{
    await context.route('https://prompt-hub-api-yktt.onrender.com/api/optimize',async route=>{
      const request=route.request();
      const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
      if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
      assert.equal(JSON.parse(request.postData()).prompt,'viết email mời họp');
      await route.fulfill({json:{optimized:'Viết email mời họp, nêu rõ thời gian và địa điểm.',model:'gemini-3.5-flash-lite'},headers});
    });
    await popup.getByRole('button',{name:'Tối ưu prompt bằng AI'}).click();
    await popup.locator('#optimizer-input').fill('viết email mời họp');
    await popup.getByRole('button',{name:'Tối ưu bằng AI'}).click();
    await popup.locator('#optimizer-result').waitFor({state:'visible'});
    assert.equal(await popup.locator('#optimizer-result').inputValue(),'Viết email mời họp, nêu rõ thời gian và địa điểm.');
    await popup.locator('#optimizer-result').fill('Viết email mời họp trang trọng.');
    await popup.getByRole('button',{name:'Sao chép',exact:true}).click();
    assert.equal(await popup.evaluate(()=>navigator.clipboard.readText()),'Viết email mời họp trang trọng.');
    await popup.locator('#back-optimizer').click();
    assert.equal(await popup.locator('#library-view').isVisible(),true);
  });
  await check('shared password unlocks server prompt and category management', async () => {
    const managed=baseCatalog.prompts.map(prompt=>({prompt,sha:'sha-'+prompt.id}));
    const createdId=String(Math.max(...baseCatalog.prompts.map(prompt=>Number(prompt.id)))+1);
    const taxonomy={categories:{items:structuredClone(baseCatalog.categories),sha:'categories-1'}};
    await context.route(url=>url.href.startsWith('https://prompt-hub-api-yktt.onrender.com/api/admin/'),async route=>{
      const request=route.request(),url=new URL(request.url()),id=url.pathname.split('/').at(-1);
      const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type',
        'Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS'};
      if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
      const respond=(json,status=200)=>route.fulfill({status,json,headers});
      if(request.headers().authorization!=='Bearer test-admin-password'){
        await respond({error:'Mật khẩu quản trị không đúng.'},401);return;
      }
      if(url.pathname.includes('/taxonomy/')){
        const parts=url.pathname.split('/'),kind=parts[4],itemId=parts[5],current=taxonomy[kind];
        if(!current){await respond({error:'Không tìm thấy.'},404);return;}
        if(request.method()==='GET'){await respond(current);return;}
        const body=JSON.parse(request.postData());
        if(body.sha!==current.sha){await respond({error:'Danh sách đã thay đổi.'},409);return;}
        if(request.method()==='POST'){
          current.items.push({id:'thu-nghiem',name:body.name});
        }else if(request.method()==='PUT'){
          current.items.find(item=>item.id===itemId).name=body.name;
        }else if(request.method()==='DELETE'){
          current.items=current.items.filter(item=>item.id!==itemId);
        }
        current.sha=kind+'-'+(Number(current.sha.split('-').at(-1))+1);
        await respond(structuredClone(current),request.method()==='POST'?201:200);return;
      }
      if(request.method()==='GET'){await respond(managed);return;}
      if(request.method()==='DELETE'){
        managed.splice(managed.findIndex(item=>item.prompt.id===id),1);
        await respond({ok:true});return;
      }
      const body=JSON.parse(request.postData());
      if(request.method()==='POST'){
        const prompt={id:createdId,...body,variables:[]};managed.push({prompt,sha:'sha-'+createdId});
        await respond({prompt,sha:'sha-'+createdId},201);return;
      }
      const item=managed.find(entry=>entry.prompt.id===id);
      item.prompt={...item.prompt,...body};item.sha='sha-updated';
      await respond(item);
    });
    await openPopup();
    assert.equal(await popup.evaluate(()=>chrome.permissions.contains({origins:['https://prompt-hub-api-yktt.onrender.com/*']})),true);
    await popup.getByRole('button',{name:'Cài đặt',exact:true}).click();
    await popup.locator('#admin-password').fill('wrong');
    await popup.getByRole('button',{name:'Mở quản lý prompt'}).click();
    await popup.waitForFunction(()=>!['','Đang kiểm tra mật khẩu...'].includes(document.querySelector('#admin-status').textContent));
    assert.match(await popup.locator('#admin-status').innerText(),/Mật khẩu quản trị không đúng/);
    await popup.locator('#admin-password').fill('test-admin-password');
    await popup.getByRole('button',{name:'Mở quản lý prompt'}).click();
    await popup.locator('#manage-list .manage-row').first().waitFor();
    assert.equal(await popup.locator('#manage-list .manage-row').count(),baseCatalog.prompts.length);
    assert.equal(await popup.locator('#manage-departments').count(),0);
    assert.doesNotMatch(await popup.locator('#settings-view').innerText(),/GitHub|Phòng ban/i);
    await popup.getByRole('button',{name:'Quản lý danh mục'}).click();
    await popup.getByRole('heading',{name:'Quản lý Danh mục'}).waitFor();
    await popup.locator('#taxonomy-name').fill('Thử nghiệm');
    await popup.getByRole('button',{name:'Thêm mục'}).click();
    await popup.getByRole('button',{name:'Sửa Thử nghiệm'}).waitFor();
    await popup.getByRole('button',{name:'Sửa Thử nghiệm'}).click();
    await popup.locator('#taxonomy-name').fill('Thử nghiệm mới');
    await popup.getByRole('button',{name:'Lưu tên'}).click();
    await popup.getByRole('button',{name:'Sửa Thử nghiệm mới'}).waitFor();
    popup.once('dialog',dialog=>dialog.accept());
    await popup.getByRole('button',{name:'Xóa Thử nghiệm mới'}).click();
    await popup.getByRole('button',{name:'Sửa Thử nghiệm mới'}).waitFor({state:'detached'});
    assert.equal(await popup.locator('#category option[value="thu-nghiem"]').count(),0);
    await popup.locator('#taxonomy-name').fill('Thử nghiệm');
    await popup.getByRole('button',{name:'Thêm mục'}).click();
    await popup.getByRole('button',{name:'Sửa Thử nghiệm'}).waitFor();
    assert.equal(await popup.locator('#category option[value="thu-nghiem"]').count(),1);
    await popup.locator('#back-taxonomy').click();
    await popup.getByRole('button',{name:'Thêm prompt'}).click();
    for(const [name,value] of Object.entries({title:'Prompt thử',description:'Mô tả thử',content:'Nội dung thử'}))
      await popup.locator(`#editor-form [name="${name}"]`).fill(value);
    assert.equal(await popup.locator('#admin-department').inputValue(),baseCatalog.departments[0].id);
    await popup.getByRole('button',{name:'Lưu lên máy chủ'}).click();
    await popup.waitForFunction(count=>document.querySelectorAll('#manage-list .manage-row').length===count,baseCatalog.prompts.length+1);
    assert.equal(managed.find(item=>item.prompt.id===createdId).prompt.title,'Prompt thử');
    await popup.locator('#manage-list .manage-row').last().getByRole('button',{name:'Sửa'}).click();
    await popup.locator('#editor-form [name="title"]').fill('Prompt đã sửa');
    await popup.getByRole('button',{name:'Lưu lên máy chủ'}).click();
    await popup.getByText(`Prompt đã sửa  #${createdId}`).waitFor();
    popup.once('dialog',dialog=>dialog.accept());
    await popup.locator('#manage-list .manage-row').last().getByRole('button',{name:'Xóa'}).click();
    await popup.waitForFunction(count=>document.querySelectorAll('#manage-list .manage-row').length===count,baseCatalog.prompts.length);
    assert.equal(managed.some(item=>item.prompt.id===createdId),false);
    await popup.locator('#settings-view > .subhead .back-button').click();
    await popup.getByRole('button',{name:'Cài đặt',exact:true}).click();
    assert.equal(await popup.locator('#unlock-form').isVisible(),true);
    await popup.locator('#settings-view > .subhead .back-button').click();
  });
  await check('refresh preserves filters', async () => {
    await popup.locator('#category').selectOption('image');
    await popup.locator('#refresh-button').click();
    await popup.waitForFunction(() => !document.getElementById('refresh-button').disabled);
    assert.equal(await popup.locator('#category').inputValue(), 'image');
    assert.equal(await popup.locator('.card').count(), 0);
  });
  await check('an open panel refreshes changed server data when it regains focus',async()=>{
    // Let the simulated publication catch up with the category saved above.
    remoteCatalog={...baseCatalog,categories:[...baseCatalog.categories,{id:'thu-nghiem',name:'Thử nghiệm'}]};
    await popup.locator('#refresh-button').click();
    await popup.waitForFunction(()=>document.querySelector('#sync-label').dataset.state==='ready');
    remoteCatalog={...baseCatalog,categories:baseCatalog.categories.map(item=>item.id==='image'?{...item,name:'Hình ảnh mới'}:item)};
    await popup.evaluate(()=>{const current=Date.now;Date.now=()=>current()+61000;window.dispatchEvent(new Event('focus'));});
    await popup.waitForFunction(()=>document.querySelector('#category option[value="image"]')?.textContent==='Hình ảnh mới');
    assert.equal(await popup.locator('#category').inputValue(),'image');
    remoteCatalog=baseCatalog;
    await popup.locator('#refresh-button').click();
    await popup.waitForFunction(name=>document.querySelector('#category option[value="image"]')?.textContent===name,baseCatalog.categories.find(item=>item.id==='image').name);
  });
  await check('malformed remote data retains the working catalog', async () => {
    remoteCatalog = { ...baseCatalog, prompts: [{ id: 'broken' }] };
    await openPopup();
    assert.equal(await popup.locator('.card').count(), baseCatalog.prompts.length);
    assert.match(await popup.locator('#status').innerText(), /dữ liệu đã lưu/);
    remoteCatalog = baseCatalog;
  });
  await check('corrupt cache and offline network still show usable sample prompts', async () => {
    await popup.evaluate(() => chrome.storage.local.set({ catalog: { prompts: [null] } }));
    offline = true;
    await openPopup();
    assert.equal(await popup.locator('.card').count(), 3);
    assert.match(await popup.locator('#status').innerText(), /dữ liệu mẫu/);
    offline = false;
    await openPopup();
  });
  const chat = await context.newPage();
  await chat.goto('https://gemini.google.com/app');
  const editor = chat.getByRole('textbox', { name: 'Nhập câu lệnh cho Gemini' });
  await check('real content script inserts into a Gemini-shaped editor and preserves draft', async () => {
    await editor.fill('Bản nháp đang viết');
    const response = await worker.evaluate(async content => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return chrome.tabs.sendMessage(tab.id, { type: 'PROMPT_HUB_INSERT', content });
    }, 'Dòng một\nDòng hai');
    assert.equal(response.ok, true);
    // Native rich editors may represent the paragraph separator with extra newlines.
    assert.match(await editor.innerText(), /^Bản nháp đang viết\n+Dòng một\nDòng hai$/);
    assert.equal(await chat.locator('textarea').inputValue(), '');
    assert.equal(await chat.evaluate(() => window.sent), 0);
  });
  await check('lightning button reaches the active AI tab through Chrome messaging', async () => {
    await openPopup();
    await chat.bringToFront();
    // Click inside an unfocused popup document: tabs.query must still target the chat.
    await popup.getByRole('button', { name: `Chèn ${baseCatalog.prompts[0].title} vào ô chat`, exact: true }).evaluate(button => button.click());
    await chat.waitForFunction(text => document.querySelector('.ql-editor').innerText.includes(text), baseCatalog.prompts[0].content);
    assert.equal(await chat.evaluate(() => window.sent), 0);
    assert.equal(await popup.locator('#library-view').isVisible(), true);
  });
  await check('preview inserts the full prompt into the active chat without sending it',async()=>{
    await popup.getByRole('button',{name:'Xem trước '+baseCatalog.prompts[1].title,exact:true}).evaluate(button=>button.click());
    await popup.locator('#insert-preview').evaluate(button=>button.click());
    await chat.waitForFunction(text=>document.querySelector('.ql-editor').innerText.includes(text),baseCatalog.prompts[1].content);
    assert.equal(await chat.evaluate(()=>window.sent),0);
    await popup.locator('#close-preview').evaluate(button=>button.click());
  });
  await check('browser insertion reports failure when an editor rejects changes', async () => {
    const page = await context.newPage();
    await page.setContent('<textarea style="width:400px;height:80px"></textarea>');
    await page.addScriptTag({ path: resolve('extension/injection.js') });
    await page.evaluate(() => document.querySelector('textarea').addEventListener('input', event => { event.target.value = ''; }));
    const response = await page.evaluate(() => globalThis.insertPromptIntoPage('Prompt thử'));
    assert.equal(response.ok, false);
    await page.close();
  });
  await check('textarea receives multiline text and an input event while preserving the draft', async () => {
    const page = await context.newPage();
    await page.setContent('<textarea style="width:400px;height:80px">Bản nháp</textarea>');
    await page.addScriptTag({ path: resolve('extension/injection.js') });
    const response = await page.evaluate(() => {
      document.querySelector('textarea').addEventListener('input', event => { window.received = event.target.value; });
      return globalThis.insertPromptIntoPage('Dòng một\nDòng hai');
    });
    assert.equal(response.ok, true);
    assert.equal(await page.evaluate(() => window.received), 'Bản nháp\n\nDòng một\nDòng hai');
    await page.close();
  });
  await check('rich editor fallback inserts when execCommand claims success without changing text', async () => {
    const page = await context.newPage();
    await page.setContent('<div class="ql-editor" contenteditable="true" style="width:400px;min-height:80px">Bản nháp</div>');
    await page.addScriptTag({ path: resolve('extension/injection.js') });
    const response = await page.evaluate(() => {
      document.execCommand = () => true;
      return globalThis.insertPromptIntoPage('Nội dung mới\nDòng tiếp theo');
    });
    assert.equal(response.ok, true);
    assert.equal(await page.locator('.ql-editor').innerText(), 'Bản nháp\n\nNội dung mới\nDòng tiếp theo');
    await page.close();
  });
  await check('rich editor fallback does not duplicate insertion when execCommand returns false', async () => {
    const page = await context.newPage();
    await page.setContent('<div class="ProseMirror" contenteditable="true" style="width:400px;min-height:80px"></div>');
    await page.addScriptTag({ path: resolve('extension/injection.js') });
    const response = await page.evaluate(() => {
      const exec = document.execCommand.bind(document);
      document.execCommand = (...args) => { exec(...args); return false; };
      return globalThis.insertPromptIntoPage('Một lần');
    });
    assert.equal(response.ok, true);
    assert.equal(await page.locator('.ProseMirror').innerText(), 'Một lần');
    await page.close();
  });
  await check('full tab opens from the panel, selects the AI tab and inserts there',async()=>{
    await openPopup();await chat.bringToFront();
    const created=context.waitForEvent('page');
    await popup.locator('#open-tab').evaluate(button=>button.click());
    const full=await created;full.on('pageerror',e=>errors.push(e.message));
    await full.waitForFunction(()=>document.body.dataset.ready==='true');
    assert.equal(await full.locator('body').getAttribute('data-layout'),'tab');
    assert.ok(await full.locator('#chat-target').inputValue());
    assert.equal(await full.locator('#open-tab').isVisible(),false);
    await full.setViewportSize({width:1280,height:850});
    await full.screenshot({path:'dist/full-tab-company.png'});
    await editor.fill('Nháp từ tab AI');
    await full.getByRole('button',{name:'Chèn '+baseCatalog.prompts[0].title+' vào ô chat',exact:true}).click();
    await chat.waitForFunction(text=>document.querySelector('.ql-editor').innerText.includes(text),baseCatalog.prompts[0].content);
    assert.match(await editor.innerText(),/^Nháp từ tab AI/);assert.equal(await chat.evaluate(()=>window.sent),0);
    await check('personal CRUD works offline without server writes and updates both views',async()=>{
      const outgoing=[];const observe=request=>{if(request.method()!=='GET')outgoing.push(request);};context.on('request',observe);
      await full.bringToFront();await full.locator('#personal-prompts').click();
      offline=true;
      for(const title of ['Cá nhân A','Cá nhân B']){
        await full.locator('#new-personal').click();
        await full.locator('#personal-form [name=title]').fill(title);
        await full.locator('#personal-form [name=categoryId]').fill('Email riêng');
        await full.locator('#personal-form [name=content]').fill('NỘI DUNG RIÊNG '+title);
        await full.getByRole('button',{name:'Lưu trên máy',exact:true}).click();
        await full.getByRole('button',{name:'Xem trước '+title,exact:true}).waitFor();
      }
      await popup.locator('#personal-prompts').click();
      await popup.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).waitFor();
      assert.equal(await full.locator('.card').count(),2);
      await waitForStored('preferences','source','personal');
      await full.reload();await full.waitForFunction(()=>document.body.dataset.ready==='true');
      assert.equal(await full.locator('.card').count(),2);
      await full.getByRole('button',{name:'Xem trước Cá nhân A',exact:true}).click();
      await full.locator('#edit-personal-preview').click();
      await full.locator('#personal-form [name=title]').fill('Cá nhân A đã sửa');
      await full.getByRole('button',{name:'Lưu trên máy',exact:true}).click();
      await popup.getByRole('button',{name:'Xem trước Cá nhân A đã sửa',exact:true}).waitFor();
      const stored=await full.evaluate(()=>chrome.storage.local.get(null));
      const personal=Object.values(stored).find(p=>p?.title==='Cá nhân A đã sửa');
      const stale=await full.evaluate(p=>chrome.runtime.sendMessage({type:'CNC_PERSONAL_SAVE',id:p.id,revision:'old-version',prompt:p}),personal);
      assert.equal(stale.ok,false);
      assert.equal(outgoing.length,0,'Personal prompts must not issue any server requests');
      context.off('request',observe);offline=false;
      await full.screenshot({path:'dist/full-tab-personal.png'});
      await check('personal backup downloads and imports atomically without overwriting or duplicates',async()=>{
        const downloadEvent=full.waitForEvent('download');await full.locator('#export-personal').click();
        const download=await downloadEvent;
        const text=await readFile(await download.path(),'utf8');
        const backup=JSON.parse(text);assert.equal(backup.prompts.length,2);assert.equal(backup.app,'Prompt CNC');
        assert.equal(backup.prompts.some(p=>p.id||p.revision),false);
        await full.locator('#personal-import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
        await full.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('bỏ qua 2'));
        assert.equal(await full.locator('.card').count(),2);
        const bad={...backup,prompts:[backup.prompts[0],{...backup.prompts[0],title:'',content:''}]};
        await full.locator('#personal-import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
        await full.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('thứ 2'));
        assert.equal(await full.locator('.card').count(),2);
        await full.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).click();
        full.once('dialog',dialog=>dialog.accept());await full.locator('#delete-personal-preview').click();
        await full.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).waitFor({state:'detached'});
        await full.locator('#personal-import-file').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(text)});
        await full.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('Đã nhập 1'));
        await popup.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).waitFor();
        assert.equal(await full.locator('.card').count(),2);
        const bounds=await full.evaluate(()=>({notice:document.querySelector('.toast').getBoundingClientRect().toJSON(),list:document.querySelector('#prompt-list').getBoundingClientRect().toJSON(),position:getComputedStyle(document.querySelector('.toast')).position}));
        assert.ok(bounds.notice.top>=bounds.list.bottom,'Feedback must stay below the list');
        assert.notEqual(bounds.position,'fixed');
        await full.screenshot({path:'dist/personal-backup.png'});
      });
      await check('local usage records successful actions and sorts by recency or frequency',async()=>{
        const copyA=full.getByRole('button',{name:'Sao chép Cá nhân A đã sửa',exact:true});
        await copyA.click();await copyA.click();
        await waitForStored('usage:'+personal.id,'count',2);
        const secondId=await full.locator('.card').filter({has:full.locator('.card-title',{hasText:'Cá nhân B'})}).getAttribute('data-prompt-id');
        await full.getByRole('button',{name:'Sao chép Cá nhân B',exact:true}).click();
        await waitForStored('usage:'+secondId,'count',1);
        await full.locator('#sort-order').selectOption('recent');
        assert.equal(await full.locator('.card-title').first().innerText(),'Cá nhân B');
        await full.locator('#sort-order').selectOption('frequent');
        assert.equal(await full.locator('.card-title').first().innerText(),'Cá nhân A đã sửa');
        const burst=await full.evaluate(id=>Promise.all(Array.from({length:8},()=>chrome.runtime.sendMessage({type:'CNC_USAGE',id}))),personal.id);
        assert.equal(burst.every(r=>r.ok),true);assert.equal(burst.at(-1).usage.count,10);
        await waitForStored('preferences','sort','frequent');
        await full.reload();await full.waitForFunction(()=>document.body.dataset.ready==='true');
        assert.equal(await full.locator('#sort-order').inputValue(),'frequent');
        assert.equal(await full.locator('.card-title').first().innerText(),'Cá nhân A đã sửa');
      });
      await full.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).click();
      full.once('dialog',dialog=>dialog.accept());await full.locator('#delete-personal-preview').click();
      await full.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).waitFor({state:'detached'});
      await popup.getByRole('button',{name:'Xem trước Cá nhân B',exact:true}).waitFor({state:'detached'});
      assert.equal(await full.locator('.card').count(),1);
      await full.locator('#all-prompts').click();
      assert.equal(await full.locator('.card').count(),baseCatalog.prompts.length);
    });
    await chat.close();await full.bringToFront();await full.locator('#refresh-targets').click();
    assert.equal(await full.locator('#chat-target').inputValue(),'');
    await full.getByRole('button',{name:'Chèn '+baseCatalog.prompts[0].title+' vào ô chat',exact:true}).click();
    await full.getByText('Hãy chọn tab AI nhận prompt ở phía trên thư viện.',{exact:true}).waitFor();
    await full.close();
  });
  await check('password-protected links manager creates, edits and deletes shared links',async()=>{
    const links={items:structuredClone(baseCatalog.links),sha:'v1'};
    await context.route('https://prompt-hub-api-yktt.onrender.com/api/admin/links**',async route=>{
      const req=route.request(),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS'};
      if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
      if(req.headers().authorization!=='Bearer test-admin-password'){await route.fulfill({status:401,json:{error:'Mật khẩu không đúng'},headers});return;}
      if(req.method()!=='GET'){
        const body=JSON.parse(req.postData()),id=new URL(req.url()).pathname.split('/').at(-1);
        assert.equal(body.sha,links.sha);
        if(req.method()==='POST')links.items.push({id:'test-tool',title:body.title,url:body.url,group:body.group,description:body.description});
        else if(req.method()==='PUT')Object.assign(links.items.find(item=>item.id===id),{title:body.title,url:body.url,group:body.group,description:body.description});
        else links.items=links.items.filter(item=>item.id!==id);
        links.sha+='a';
      }
      await route.fulfill({json:structuredClone(links),headers});
    });
    await openPopup();await popup.locator('#settings-button').click();await popup.locator('#admin-password').fill('test-admin-password');await popup.getByRole('button',{name:'Mở quản lý prompt',exact:true}).click();await popup.locator('#manage-view').waitFor({state:'visible'});
    await popup.locator('#manage-links').click();await popup.locator('#link-form').waitFor({state:'visible'});
    for(const [key,value] of Object.entries({title:'Công cụ thử',url:'https://example.com/tool',group:'Nội bộ',description:'Mô tả thử'}))await popup.locator(`#link-form [name="${key}"]`).fill(value);
    await popup.getByRole('button',{name:'Lưu liên kết',exact:true}).click();await popup.getByRole('button',{name:'Sửa liên kết Công cụ thử',exact:true}).waitFor();
    await popup.getByRole('button',{name:'Sửa liên kết Công cụ thử',exact:true}).click();await popup.locator('#link-form [name="title"]').fill('Công cụ mới');await popup.getByRole('button',{name:'Lưu liên kết',exact:true}).click();await popup.getByRole('button',{name:'Xóa liên kết Công cụ mới',exact:true}).waitFor();
    await popup.screenshot({path:'dist/manage-links.png'});
    await popup.locator('#back-links').click();await popup.locator('#settings-view > .subhead .back-button').click();await popup.locator('#links-tab').click();await popup.locator('#company-links').click();assert.equal(await popup.getByRole('link',{name:'Công cụ mới',exact:true}).count(),1);assert.equal(await popup.locator('.link-group-title').textContent(),'Phần mềm công ty'+(companyLinkCount+1));
    await popup.locator('#settings-button').click();await popup.locator('#admin-password').fill('test-admin-password');await popup.getByRole('button',{name:'Mở quản lý prompt',exact:true}).click();await popup.locator('#manage-view').waitFor({state:'visible'});await popup.locator('#manage-links').click();await popup.locator('#link-form').waitFor({state:'visible'});
    popup.once('dialog',dialog=>dialog.accept());await popup.getByRole('button',{name:'Xóa liên kết Công cụ mới',exact:true}).click();await popup.getByRole('button',{name:'Xóa liên kết Công cụ mới',exact:true}).waitFor({state:'detached'});assert.equal(links.items.length,baseCatalog.links.length);
    await popup.locator('#back-links').click();await popup.locator('#settings-view > .subhead .back-button').click();await popup.locator('#prompt-main').click();await popup.locator('#all-prompts').click();
  });
  assert.deepEqual(errors, []);
  await mkdir('dist', { recursive: true });
  await popup.screenshot({ path: 'dist/insertion-test.png' });
  console.log(`${passed} browser checks passed (real extension APIs; simulated AI page).`);
} finally {
  await context?.close();
  if (dirname(resolve(fixtureRoot)) !== resolve(tmpdir()) || !basename(fixtureRoot).startsWith('prompt-hub-test-')) throw Error('Unexpected test cleanup path');
  await rm(fixtureRoot, { recursive: true, force: true });
}
