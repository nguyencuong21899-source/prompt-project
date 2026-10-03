import './injection.js';
import { validCatalog } from './catalog.js';
import { icon } from './icons.js';
import { reconcileCatalog } from './sync-state.js';
import { PERSONAL_PREFIX, USAGE_PREFIX, sortPrompts, validatePersonal, createPersonalBackup, parsePersonalBackup, BACKUP_LIMIT } from './library.js';
import { validateLink, requestBookmarkPermission, bookmarkErrorMessage, DEFAULT_LINK_GROUPS, linkGroupName, groupLinks } from './links.js';

const RAW_CATALOG = 'https://raw.githubusercontent.com/nguyencuong21899-source/prompt-project/main/data/catalog.json';
// Public API address only. Never put a GitHub token or admin password here.
const ADMIN_API_URL = 'https://prompt-hub-api-yktt.onrender.com';
const sampleCatalog = {schemaVersion:1,departments:[{id:'general',name:'Chung'}],categories:[{id:'image',name:'Hình ảnh'},{id:'presentation',name:'Thuyết trình'}],prompts:[
  {id:'401',title:'Tạo Slide TRA',description:'Tạo slide từ nội dung đính kèm và giữ nguyên thông tin.',content:'Tạo slide từ file nội dung mà tôi đính kèm, giữ nguyên nội dung.',departmentId:'general',categoryId:'presentation',tags:['slide','thuyết trình','tài liệu'],variables:[]},
  {id:'402',title:'Avatar LinkedIn (Nữ)',description:'Ảnh profile nữ chuyên gia thanh lịch.',content:'Tạo ảnh chân dung LinkedIn chuyên nghiệp cho {{doi_tuong}}. Phong cách chuyên gia thanh lịch, ánh sáng tự nhiên, nền đơn sắc.',departmentId:'general',categoryId:'image',tags:['linkedin','avatar'],variables:[{name:'doi_tuong',label:'Mô tả người trong ảnh',required:true}]},
  {id:'403',title:'Chân dung diễn giả',description:'Ảnh chụp diễn giả trên sân khấu chuyên nghiệp.',content:'Tạo ảnh chân dung {{doi_tuong}} đang thuyết trình trên sân khấu hội nghị chuyên nghiệp. Ánh sáng sân khấu tự nhiên.',departmentId:'general',categoryId:'image',tags:['diễn giả'],variables:[{name:'doi_tuong',label:'Mô tả diễn giả',required:true}]}
]};
const $ = id => document.getElementById(id);
const views = ['library-view','settings-view','optimizer-view','personal-view'];
const tabMode = new URLSearchParams(location.search).get('mode')==='tab';
let source = 'company';
let promptSource = 'company';
let managedLinks=null,editingLink=null,linksSaving=false,bookmarkBusy=false;
let visibleLinks=[];
let personalPrompts = [];
let usage = {};
let personalEditing = null;
let personalDirty = false;
let targetId = Number(new URLSearchParams(location.search).get('target')) || null;
const aiPatterns = chrome.runtime.getManifest().content_scripts.flatMap(script=>script.matches);
let catalog = sampleCatalog;
let serverUrl = '';
let apiPermissionGranted = false;
let adminPassword = '';
let managedPrompts = [];
let editing = null;
let editorDirty = false;
let taxonomyKind = '';
let managedTaxonomy = null;
let editingTaxonomyId = null;
let lastSync = 0;
let pendingChanges = null;
let favorites = new Set();
let favoritesOnly = false;
let searchIndex = new Map();
let preferenceTimer;
let draftTimer;
let inserting = false;
let syncing = false;
let previewPrompt = null;
let syncState = {state:'offline',text:'Dữ liệu mẫu'};
const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const el = (tag,cls,text) => { const node=document.createElement(tag); if(cls)node.className=cls; if(text!==undefined)node.textContent=text; return node; };
function show(view){ for(const id of views)$(id).hidden=id!==view; document.querySelector('#'+view+' h1')?.setAttribute('tabindex','-1');document.querySelector('#'+view+' h1')?.focus(); }
function toast(message){if($('prompt-preview').open){$('preview-feedback').textContent=message;return;}document.querySelector('.toast')?.remove();const t=el('span','toast',message);t.setAttribute('role','status');t.title=message;document.querySelector('footer').prepend(t);setTimeout(()=>t.remove(),7000);}
function busy(button,value){button.disabled=value;button.setAttribute('aria-busy',String(value));}
function persistPreferences(){clearTimeout(preferenceTimer);preferenceTimer=setTimeout(()=>chrome.storage.local.set({preferences:{search:$('search').value,category:$('category').value,favoritesOnly,source,promptSource,sort:$('sort-order').value}}).catch(()=>{}),150);}
function persistDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>chrome.storage.local.set({optimizerDraft:{input:$('optimizer-input').value,result:$('optimizer-result').value}}).catch(()=>{}),200);}
function updateCount(){$('optimizer-count').textContent=$('optimizer-input').value.length.toLocaleString('vi-VN')+' / 6.000';}
function paintSyncLabel(){const personal=source==='personal';$('sync-label').dataset.state=personal?'ready':syncState.state;$('sync-label').textContent=personal?'Lưu trên máy này':syncState.text;$('sync-label').title=personal?'Thư viện cá nhân không đồng bộ lên máy chủ':lastSync?'Lần kiểm tra thư viện công ty: '+new Date(lastSync).toLocaleString('vi-VN'):syncState.text;}
function syncLabel(state,text){syncState={state,text};paintSyncLabel();}
function markPending(){pendingChanges.since ||= Date.now();chrome.storage.local.set({catalog,pendingChanges}).catch(()=>{});syncLabel('pending','Đã lưu · chờ xuất bản thư viện');}
function options(select, values, all=false){const selected=select.value;select.replaceChildren();if(all){const o=new Option('Tất cả danh mục','');select.add(o);}for(const item of values)select.add(new Option(item.name,item.id));if([...select.options].some(o=>o.value===selected))select.value=selected;}
function nameOf(items,id){return items.find(x=>x.id===id)?.name||id;}
const isPersonal = p => p?.id?.startsWith('local-');
const categoryName = p => isPersonal(p)?p.categoryId:nameOf(catalog.categories,p.categoryId);
const libraryPrompts = () => source==='personal'?personalPrompts:catalog.prompts;
function render(){
  $('admin-department').value=editing?.prompt.departmentId||catalog.departments[0]?.id||'general';
  options($('admin-category'),catalog.categories);
  if(source==='links'){
    options($('category'),groupLinks(catalog.links||[],true).map(group=>({id:group.name,name:group.name})),true);
    $('category').options[0].textContent='Tất cả nhóm';
    filterList();return;
  }
  searchIndex=new Map(libraryPrompts().map(p=>[p.id,fold([p.id,p.title,p.description,p.content,...(p.tags||[]),categoryName(p)].join(' '))]));
  options($('category'),source==='personal'?[...new Set(personalPrompts.map(p=>p.categoryId))].sort().map(name=>({id:name,name})):catalog.categories,true);
  filterList();
}
function filterList(){
  const links=source==='links';
  $('library-view').dataset.section=links?'links':'prompts';
  $('library-view').dataset.simpleLinkGroups=String(groupLinks(catalog.links||[],true).every(group=>DEFAULT_LINK_GROUPS.includes(group.name)));
  $('prompt-main').setAttribute('aria-pressed',String(!links));
  $('prompt-scopes').hidden=links;
  document.querySelector('.library-toolbar').dataset.section=links?'links':'prompts';
  $('link-type-tabs').hidden=!links;
  $('links-tab').setAttribute('aria-pressed',String(links));
  $('bookmark-all').hidden=!links;
  $('open-optimizer').hidden=links;
  $('chat-target-row').hidden=!tabMode||links;
  $('personal-transfer').hidden=source!=='personal';
  $('export-personal').disabled=!personalPrompts.length;
  $('search').placeholder=links?'Tìm công cụ hoặc đường dẫn…':'Tìm tên, nội dung hoặc #ID...';
  $('search').setAttribute('aria-label',links?'Tìm liên kết':'Tìm prompt');
  if(links){renderLinks();return;}
  $('status').hidden=source==='personal';paintSyncLabel();
  const q=fold($('search').value.trim());const category=$('category').value;
  const hits=sortPrompts(libraryPrompts().filter(p=>(!favoritesOnly||favorites.has(p.id))&&(!category||p.categoryId===category)&&(!q||searchIndex.get(p.id)?.includes(q.replace(/^#/,'')))),$('sort-order').value,usage);
  $('result-count').textContent=`${hits.length} prompt`+(q||category?` / ${libraryPrompts().length}`:'');
  $('reset-filters').hidden=!(q||category);
  $('all-prompts').setAttribute('aria-pressed',String(source==='company'));$('personal-prompts').setAttribute('aria-pressed',String(source==='personal'));$('favorite-prompts').setAttribute('aria-pressed',String(favoritesOnly));$('new-personal').hidden=source!=='personal';
  $('list-header').hidden=!q&&!category&&source!=='personal';
  const list=$('prompt-list');list.replaceChildren();
  if(!hits.length){const empty=el('div','empty');empty.append(icon(favoritesOnly?'star':'search'),el('strong','',favoritesOnly?'Chưa có prompt yêu thích':source==='personal'&&!q&&!category?'Thư viện của riêng bạn':'Không tìm thấy prompt'),el('span','',favoritesOnly?'Bấm ngôi sao trên thẻ để lưu prompt thường dùng.':source==='personal'&&!q&&!category?'Bấm Thêm để lưu prompt trên máy, không cần mật khẩu.':'Thử từ khóa khác hoặc xóa bộ lọc.'));list.append(empty);return;}
  const fragment=document.createDocumentFragment();
  for(const p of hits){
    const card=el('article','card'),top=el('div','card-top'),title=el('strong','card-title',p.title),id=el('span','id',isPersonal(p)?'Cá nhân':'#'+p.id),desc=el('p','card-desc',p.description),bottom=el('div','card-bottom'),actions=el('div','card-actions');
    card.dataset.promptId=p.id;
    desc.hidden=!p.description;
    top.append(title,id);
    const favorite=el('button','round');favorite.append(icon('star'));favorite.title='Lưu vào yêu thích';favorite.setAttribute('aria-label','Yêu thích '+p.title);favorite.setAttribute('aria-pressed',String(favorites.has(p.id)));favorite.addEventListener('click',()=>{if(favorites.has(p.id))favorites.delete(p.id);else favorites.add(p.id);chrome.storage.local.set({favorites:[...favorites]}).catch(()=>{});filterList();});
    const copy=el('button','round');copy.append(icon('copy'));copy.title='Sao chép ngay';copy.setAttribute('aria-label','Sao chép '+p.title);copy.addEventListener('click',()=>copyText(p.content,p));
    const use=el('button','round insert-action');use.append(icon('bolt'));use.title='Chèn ngay vào ô chat';use.setAttribute('aria-label','Chèn '+p.title+' vào ô chat');use.addEventListener('click',()=>insertPrompt(p.content,p));
    const category=el('span','category-chip',categoryName(p));
    const preview=el('button','preview-action','Xem trước');preview.prepend(icon('eye'));preview.type='button';preview.setAttribute('aria-label','Xem trước '+p.title);preview.addEventListener('click',()=>openPreview(p));
    actions.append(favorite,copy,use);bottom.append(preview,actions);card.append(top,category,desc,bottom);
    if(usage[p.id]?.count){const stats=el('small','usage-hint',`Đã dùng ${usage[p.id].count} lần · ${new Date(usage[p.id].lastUsed).toLocaleDateString('vi-VN')}`);stats.title='Số lần sao chép hoặc chèn thành công trên máy này';card.append(stats);}
    fragment.append(card);
  }
  list.append(fragment);
}
function openPreview(prompt){
  previewPrompt=prompt;
  $('preview-title').textContent=prompt.title;
  $('preview-description').textContent=prompt.description;
  $('preview-category').textContent=categoryName(prompt);
  $('preview-id').textContent=isPersonal(prompt)?'Cá nhân':'#'+prompt.id;
  $('personal-preview-actions').hidden=!isPersonal(prompt);
  $('preview-content').textContent=prompt.content;
  $('preview-feedback').textContent='';
  $('prompt-preview').showModal();
  document.querySelector('.preview-scroll').scrollTop=0;
}
async function recordUse(prompt){if(!prompt)return;try{const result=await chrome.runtime.sendMessage({type:'CNC_USAGE',id:prompt.id});if(result.ok)usage[prompt.id]=result.usage;}catch(error){console.error('Usage save failed',error);}}
async function copyText(content,prompt=null){
  try{await navigator.clipboard.writeText(content);await recordUse(prompt);toast('Đã sao chép prompt');}
  catch{
    const previous=document.activeElement;const field=el('textarea','clipboard-fallback');field.value=content;($('prompt-preview').open?$('prompt-preview'):document.body).append(field);field.select();
    try{if(!document.execCommand('copy'))throw Error();await recordUse(prompt);toast('Đã sao chép prompt');}
    catch{toast('Không thể sao chép. Hãy thử lại trong bảng Prompt CNC.');}
    finally{field.remove();previous?.focus();}
  }
}
async function insertPrompt(content,prompt=null){
  if(inserting)return;
  if(!content.trim()){toast('Hãy nhập nội dung prompt trước khi chèn.');return;}
  inserting=true;
  const buttons=[...document.querySelectorAll('.insert-action,#insert-optimized')];buttons.forEach(button=>busy(button,true));
  try{
    const tab=tabMode?(targetId?await chrome.tabs.get(targetId).catch(()=>null):null):(await chrome.tabs.query({active:true,currentWindow:true}))[0];
    if(tabMode&&!tab){toast('Hãy chọn tab AI nhận prompt ở phía trên thư viện.');return;}
    if(tabMode&&!(await chrome.tabs.query({url:aiPatterns,currentWindow:true})).some(item=>item.id===tab.id)){toast('Tab đã chọn không còn là trang chat AI. Hãy chọn lại tab.');return;}
    if(!tab?.id){toast('Không tìm thấy tab đang mở.');return;}
    let outcome;
    try{outcome=await chrome.tabs.sendMessage(tab.id,{type:'PROMPT_HUB_INSERT',content});}catch{}
    if(!outcome){
      if(tabMode){const origin=new URL(tab.url).origin+'/*';if(!await chrome.permissions.contains({origins:[origin]})&&!await chrome.permissions.request({origins:[origin]})){toast('Cần cho phép truy cập tab AI để chèn prompt.');return;}}
      const results=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:globalThis.insertPromptIntoPage,args:[content]});
      outcome=results[0]?.result;
    }
    if(!outcome?.ok){toast(outcome?.reason||'Không tìm thấy ô nhập chat.');return;}
    await recordUse(prompt);toast('Đã chèn prompt vào ô chat');
    if(tabMode)await chrome.tabs.update(tab.id,{active:true});
  }catch(error){console.error('Insert prompt failed:',error);toast('Chưa chèn được. Tải lại trang AI và kiểm tra quyền truy cập.');}
  finally{inserting=false;buttons.forEach(button=>busy(button,false));}
}
async function syncCatalog(quiet=false){
  if(syncing)return;syncing=true;busy($('refresh-button'),true);syncLabel('loading','Đang kiểm tra thư viện...');
  try{
    const response=await fetch(RAW_CATALOG+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const next=await response.json();if(!validCatalog(next))throw Error('Dữ liệu không hợp lệ');
    const reconciled=reconcileCatalog(next,pendingChanges);
    if(!validCatalog(reconciled.catalog))throw Error('Thư viện đang xuất bản');
    const changed=JSON.stringify(catalog)!==JSON.stringify(reconciled.catalog);
    catalog=reconciled.catalog;pendingChanges=reconciled.pending;lastSync=Date.now();if(changed)render();
    await chrome.storage.local.set({catalog,lastSync,pendingChanges});
    $('status').textContent='';
    syncLabel(pendingChanges?'pending':'ready',pendingChanges?'Đã lưu · chờ xuất bản thư viện':'Đã đồng bộ · '+new Date(lastSync).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}));
    if(!quiet)toast(pendingChanges?'Máy chủ đang đồng bộ thư viện. Vui lòng chờ một chút.':changed?'Đã cập nhật thư viện mới.':'Thư viện đã được kiểm tra.');
  }catch{syncLabel('offline','Chưa kết nối · dùng bản đã lưu');$('status').textContent=lastSync?'Chưa tải được thư viện mới. Đang dùng dữ liệu đã lưu; bấm Làm mới để thử lại.':'Đang dùng dữ liệu mẫu. Chưa kết nối được máy chủ.';}
  finally{syncing=false;busy($('refresh-button'),false);}
}
function maybeSyncCatalog(){if(Date.now()-lastSync>=45000)syncCatalog(true);}
function adminStatus(message){$('admin-status').textContent=message;$('admin-status').dataset.tone=/^Đã/.test(message)?'success':/^(Đang|$)/.test(message)?'info':'error';}
function settings(){
  if(!canLeaveEditor())return;
  show('settings-view');
  $('admin-unavailable').hidden=!!serverUrl;
  $('unlock-form').hidden=!serverUrl||!!adminPassword;
  $('manage-view').hidden=!adminPassword;
  $('editor-form').hidden=true;
  $('taxonomy-view').hidden=true;
  $('links-manager').hidden=true;
  adminStatus('');
}
async function ensureApiPermission(){
  const parsed=new URL(serverUrl);
  if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&parsed.hostname==='localhost'))throw Error('Địa chỉ API phải dùng HTTPS.');
  if(apiPermissionGranted)return;
  const origin=parsed.protocol+'//'+parsed.hostname+'/*';
  if(!await chrome.permissions.request({origins:[origin]}))throw Error('Cần cho phép kết nối tới máy chủ Prompt CNC.');
  apiPermissionGranted=true;
}
async function optimize(event){
  event.preventDefault();
  const prompt=$('optimizer-input').value.trim(),button=$('optimize-button');
  if(button.disabled)return;
  busy(button,true);$('optimizer-input').disabled=true;$('optimizer-status').dataset.tone='info';$('optimizer-status').textContent='Gemini đang tối ưu… Có thể mất vài giây khi máy chủ vừa khởi động.';
  try{
    await ensureApiPermission();
    const response=await fetch(serverUrl+'/api/optimize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),signal:AbortSignal.timeout(65000)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Không tối ưu được prompt.');
    $('optimizer-result').value=result.optimized;
    $('optimizer-result-wrap').hidden=false;$('optimizer-status').dataset.tone='success';$('optimizer-status').textContent='Đã tối ưu. Bạn có thể sửa kết quả trước khi sử dụng.';persistDraft();
    $('optimizer-result-wrap').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){$('optimizer-status').dataset.tone='error';$('optimizer-status').textContent=error.name==='TimeoutError'?'Gemini phản hồi quá lâu. Vui lòng thử lại.':error.message||'Không kết nối được Gemini.';}
  finally{busy(button,false);$('optimizer-input').disabled=false;}
}
async function adminRequest(path,method='GET',body, password=adminPassword){
  const response=await fetch(serverUrl+path,{method,headers:{Authorization:'Bearer '+password,'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(120000)});
  const data=await response.json();
  if(!response.ok)throw Object.assign(Error(data.error||'Yêu cầu thất bại.'),{status:response.status});
  return data;
}
function renderManaged(){
  const list=$('manage-list');list.replaceChildren();
  const q=fold($('manage-search').value.trim());
  const items=managedPrompts.filter(item=>fold(item.prompt.title+' '+item.prompt.id).includes(q));
  if(!items.length){list.append(el('p','empty',q?'Không tìm thấy prompt.':'Chưa có prompt.'));return;}
  for(const item of items){
    const row=el('div','manage-row'),name=el('strong','',item.prompt.title+'  #'+item.prompt.id),actions=el('div','manage-actions');
    const edit=el('button','secondary','Sửa'),remove=el('button','danger','Xóa');
    edit.type=remove.type='button';edit.addEventListener('click',()=>editPrompt(item));remove.addEventListener('click',()=>removePrompt(item));
    actions.append(edit,remove);row.append(name,actions);list.append(row);
  }
}
async function reloadManaged(){
  if($('reload-managed').disabled)return;busy($('reload-managed'),true);
  adminStatus('Đang tải danh sách mới nhất...');
  try{managedPrompts=await adminRequest('/api/admin/prompts');renderManaged();adminStatus('Đã cập nhật danh sách.');}
  catch(error){if(error.status===401)lock();adminStatus(error.message||'Không tải được danh sách.');}
  finally{busy($('reload-managed'),false);}
}
async function unlock(event){
  event.preventDefault();const password=$('admin-password').value;
  const button=event.currentTarget.querySelector('button[type=submit]');if(button.disabled)return;busy(button,true);
  adminStatus('Đang kiểm tra mật khẩu...');
  try{
    await ensureApiPermission();
    const items=await adminRequest('/api/admin/prompts','GET',undefined,password);
    adminPassword=password;$('admin-password').value='';managedPrompts=items;renderManaged();
    $('unlock-form').hidden=true;$('manage-view').hidden=false;adminStatus('');
  }catch(error){adminStatus(error.message||'Không mở được quản lý prompt.');}
  finally{busy(button,false);}
}
function editPrompt(item=null){
  editorDirty=false;
  editing=item;
  const form=$('editor-form');form.reset();
  form.elements.departmentId.value=item?.prompt.departmentId||catalog.departments[0]?.id||'general';
  if(item){
    const prompt=item.prompt;
    for(const key of ['title','description','content'])form.elements[key].value=prompt[key];
    form.elements.departmentId.value=prompt.departmentId;
    form.elements.categoryId.value=prompt.categoryId;
    form.elements.tags.value=(prompt.tags||[]).join(', ');
  }
  $('editor-title').textContent=item?'Sửa prompt #'+item.prompt.id:'Thêm prompt';
  $('manage-view').hidden=true;form.hidden=false;adminStatus('');
  form.elements.title.focus();
}
function canLeaveEditor(){if(linksSaving)return false;if(!$('links-manager').hidden&&linkDirty()&&!confirm('Bỏ thay đổi liên kết chưa lưu?'))return false;return $('editor-form').hidden||!editorDirty||confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi và quay lại?');}
function finishEdit(){editing=null;editorDirty=false;$('editor-form').hidden=true;$('manage-view').hidden=false;}
function finishTaxonomy(){taxonomyKind='';managedTaxonomy=null;editingTaxonomyId=null;$('taxonomy-view').hidden=true;$('manage-view').hidden=false;adminStatus('');}
function resetTaxonomyForm(){editingTaxonomyId=null;$('taxonomy-form').reset();$('taxonomy-save').textContent='Thêm mục';$('taxonomy-cancel').hidden=true;}
function renderTaxonomy(){
  const list=$('taxonomy-list');list.replaceChildren();
  for(const item of managedTaxonomy.items){
    const row=el('div','manage-row'),name=el('strong','',item.name),actions=el('div','manage-actions');
    const used=managedPrompts.filter(entry=>entry.prompt.categoryId===item.id).length;
    const edit=el('button','secondary','Sửa'),remove=el('button','danger','Xóa');
    edit.type=remove.type='button';
    edit.setAttribute('aria-label','Sửa '+item.name);remove.setAttribute('aria-label','Xóa '+item.name);
    edit.addEventListener('click',()=>{editingTaxonomyId=item.id;$('taxonomy-name').value=item.name;$('taxonomy-save').textContent='Lưu tên';$('taxonomy-cancel').hidden=false;$('taxonomy-name').focus();});
    remove.disabled=used>0||managedTaxonomy.items.length<=1;
    remove.title=used?`Đang được ${used} prompt sử dụng`:managedTaxonomy.items.length<=1?'Cần giữ ít nhất một mục':'';
    remove.addEventListener('click',()=>removeTaxonomy(item));
    const label=el('div','taxonomy-name');label.append(name,el('small','taxonomy-usage',used?`${used} prompt đang dùng`:''));
    actions.append(edit,remove);row.append(label,actions);list.append(row);
  }
}
async function openTaxonomy(){
  adminStatus('Đang tải danh sách mới nhất...');
  try{
    const result=await adminRequest('/api/admin/taxonomy/categories');
    taxonomyKind='categories';managedTaxonomy=result;resetTaxonomyForm();
    $('taxonomy-title').textContent='Quản lý Danh mục';
    $('taxonomy-name-label').firstChild.textContent='Tên danh mục ';
    $('manage-view').hidden=true;$('taxonomy-view').hidden=false;renderTaxonomy();adminStatus('');
  }catch(error){if(error.status===401)lock();adminStatus(error.message||'Không tải được danh sách.');}
}
function updateLocalTaxonomy(){
  catalog={...catalog,[taxonomyKind]:managedTaxonomy.items};render();
  pendingChanges ||= {prompts:{},taxonomy:{}};
  pendingChanges.taxonomy[taxonomyKind]=managedTaxonomy.items;markPending();
}
async function saveTaxonomy(event){
  event.preventDefault();
  const name=$('taxonomy-name').value.trim(),id=editingTaxonomyId,kind=taxonomyKind;
  const button=$('taxonomy-save');button.disabled=true;adminStatus('Đang lưu lên máy chủ...');
  try{
    managedTaxonomy=await adminRequest('/api/admin/taxonomy/'+kind+(id?'/'+id:''),id?'PUT':'POST',{name,sha:managedTaxonomy.sha});
    updateLocalTaxonomy();renderTaxonomy();resetTaxonomyForm();
    adminStatus('Đã lưu trên máy chủ. Danh mục sẽ cập nhật cho mọi người sau khi đồng bộ.');
  }catch(error){if(error.status===401)lock();adminStatus(error.message||'Không lưu được danh sách.');}
  finally{button.disabled=false;}
}
async function removeTaxonomy(item){
  if(!confirm('Xóa danh mục “'+item.name+'” trên máy chủ?'))return;
  adminStatus('Đang xóa trên máy chủ...');
  try{
    managedTaxonomy=await adminRequest('/api/admin/taxonomy/'+taxonomyKind+'/'+item.id,'DELETE',{sha:managedTaxonomy.sha});
    updateLocalTaxonomy();renderTaxonomy();resetTaxonomyForm();
    adminStatus('Đã xóa trên máy chủ. Danh mục sẽ cập nhật cho mọi người sau khi đồng bộ.');
  }catch(error){if(error.status===401)lock();adminStatus(error.message||'Không xóa được mục.');}
}
function updateLocalCatalog(prompt,removed=false){
  catalog={...catalog,prompts:catalog.prompts.filter(item=>item.id!==prompt.id)};
  if(!removed)catalog.prompts.push(prompt);
  catalog.prompts.sort((a,b)=>a.id.localeCompare(b.id,'en'));
  pendingChanges ||= {prompts:{},taxonomy:{}};
  pendingChanges.prompts[prompt.id]=removed?null:prompt;
  render();markPending();
}
async function savePrompt(event){
  event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
  const payload={title:String(fields.get('title')).trim(),description:String(fields.get('description')).trim(),content:String(fields.get('content')).trim(),
    departmentId:String(fields.get('departmentId')),categoryId:String(fields.get('categoryId')),
    tags:String(fields.get('tags')||'').split(',').map(tag=>tag.trim()).filter(Boolean)};
  const button=form.querySelector('button[type=submit]');button.disabled=true;adminStatus('Đang lưu lên máy chủ...');
  try{
    const path='/api/admin/prompts'+(editing?'/'+editing.prompt.id:'');
    if(editing)payload.sha=editing.sha;
    const result=await adminRequest(path,editing?'PUT':'POST',payload);
    updateLocalCatalog(result.prompt);
    managedPrompts=managedPrompts.filter(item=>item.prompt.id!==result.prompt.id);managedPrompts.push(result);$('manage-search').value='';renderManaged();finishEdit();
    adminStatus('Đã lưu trên máy chủ. Thư viện của mọi người sẽ cập nhật sau khi đồng bộ.');
  }catch(error){if(error.status===401)lock();adminStatus(error.message||'Không lưu được prompt.');}
  finally{button.disabled=false;}
}
async function removePrompt(item){
  if(!confirm('Xóa prompt #'+item.prompt.id+' “'+item.prompt.title+'” trên máy chủ?'))return;
  adminStatus('Đang xóa trên máy chủ...');
  try{
    await adminRequest('/api/admin/prompts/'+item.prompt.id,'DELETE',{sha:item.sha});
    updateLocalCatalog(item.prompt,true);
    managedPrompts=managedPrompts.filter(entry=>entry.prompt.id!==item.prompt.id);renderManaged();
    adminStatus('Đã xóa trên máy chủ. Thư viện của mọi người sẽ cập nhật sau khi đồng bộ.');
  }catch(error){if(error.status===401)lock();adminStatus(error.message||'Không xóa được prompt.');}
}
function lock(){adminPassword='';managedPrompts=[];editing=null;taxonomyKind='';managedTaxonomy=null;editingTaxonomyId=null;managedLinks=null;editingLink=null;$('links-manager').hidden=true;$('editor-form').hidden=true;$('taxonomy-view').hidden=true;$('manage-view').hidden=true;$('unlock-form').hidden=!serverUrl;adminStatus('Đã khóa quản lý prompt.');}
function switchSource(next){source=next;if(next!=='links')promptSource=next;favoritesOnly=false;$('search').value='';$('category').value='';render();if(next==='links')chooseLinkGroup('Phần mềm công ty');persistPreferences();}
function chooseLinkGroup(name){$('category').value=name;$('search').value='';favoritesOnly=false;filterList();$('prompt-list').scrollTop=0;persistPreferences();}
function renderLinks(){
  paintSyncLabel();$('status').hidden=false;
  $('all-prompts').setAttribute('aria-pressed','false');$('personal-prompts').setAttribute('aria-pressed','false');
  $('favorite-prompts').setAttribute('aria-pressed',String(favoritesOnly));$('new-personal').hidden=true;
  const q=fold($('search').value.trim()),group=$('category').value;
  $('company-links').setAttribute('aria-pressed',String(group==='Phần mềm công ty'));
  $('ai-links').setAttribute('aria-pressed',String(group==='Phần mềm AI'));
  visibleLinks=(catalog.links||[]).filter(link=>(!favoritesOnly||favorites.has('link:'+link.id))&&(!group||linkGroupName(link.group)===group)&&(!q||fold([link.title,link.description,linkGroupName(link.group),link.url].join(' ')).includes(q)));
  const mode=$('sort-order').value;
  if(mode==='title')visibleLinks.sort((a,b)=>a.title.localeCompare(b.title,'vi'));
  else if(mode==='recent'||mode==='frequent')visibleLinks.sort((a,b)=>{const x=usage['link:'+a.id]||{},y=usage['link:'+b.id]||{};return mode==='recent'?(y.lastUsed||0)-(x.lastUsed||0):(y.count||0)-(x.count||0);});
  $('result-count').textContent=visibleLinks.length+' liên kết';$('reset-filters').hidden=!q&&DEFAULT_LINK_GROUPS.includes(group);$('list-header').hidden=false;
  $('bookmark-all').disabled=bookmarkBusy||!visibleLinks.length;
  const list=$('prompt-list');list.replaceChildren();
  if(!visibleLinks.length){const empty=el('div','empty');empty.append(el('strong','',q||favoritesOnly?'Không tìm thấy liên kết':group==='Phần mềm AI'?'Chưa có liên kết AI':'Chưa có liên kết '+(group==='Phần mềm công ty'?'phần mềm công ty':group||'công ty')),el('span','',q||favoritesOnly?'Thử từ khóa khác hoặc bỏ bộ lọc yêu thích.':'Mở Cài đặt → Quản lý liên kết để thêm công cụ vào danh mục này.'));list.append(empty);return;}
  for(const section of groupLinks(visibleLinks,!q&&!group&&!favoritesOnly)){
    const container=el('section','link-section'),heading=el('h2','link-group-title',section.name),grid=el('div','link-group-grid');
    heading.append(el('span','link-group-count',String(section.items.length)));container.append(heading,grid);list.append(container);
    heading.hidden=DEFAULT_LINK_GROUPS.includes(group);
    if(!section.items.length)grid.append(el('p','link-group-empty','Chưa có liên kết. Thêm công cụ trong Cài đặt → Quản lý liên kết.'));
    for(const link of section.items){
    const card=el('article','card link-card'),top=el('div','link-top'),badge=el('span','link-avatar',link.title.slice(0,1).toLocaleUpperCase('vi')),name=el('a','card-title',link.title);
    name.href=link.url;name.target='_blank';name.rel='noopener noreferrer';name.addEventListener('click',()=>recordUse({id:'link:'+link.id}));
    top.append(badge,name);card.append(top,el('p','card-desc',link.description||new URL(link.url).hostname));
    const bottom=el('div','card-bottom'),open=el('a','preview-action','Mở công cụ ↗');open.href=link.url;open.target='_blank';open.rel='noopener noreferrer';open.title=link.url;open.addEventListener('click',()=>recordUse({id:'link:'+link.id}));
    const actions=el('div','card-actions'),favorite=el('button','round');favorite.append(icon('star'));favorite.setAttribute('aria-label','Yêu thích '+link.title);favorite.setAttribute('aria-pressed',String(favorites.has('link:'+link.id)));
    favorite.addEventListener('click',()=>{const key='link:'+link.id;if(favorites.has(key))favorites.delete(key);else favorites.add(key);chrome.storage.local.set({favorites:[...favorites]}).catch(()=>{});filterList();});
    const save=el('button','link-button','Lưu dấu trang');save.title='Hiện trực tiếp trên thanh dấu trang Chrome';save.setAttribute('aria-label','Lưu dấu trang '+link.title);save.disabled=bookmarkBusy;save.addEventListener('click',()=>bookmarkLinks([link]));actions.append(favorite,save);bottom.append(open,actions);card.append(bottom);grid.append(card);
    }
  }
}
async function bookmarkLinks(links){
  if(bookmarkBusy||!links.length)return;
  try{
    // Request optional access directly from the user's click, before other awaits.
    const permission=requestBookmarkPermission(chrome);
    bookmarkBusy=true;filterList();
    if(!await permission){toast('Chưa cấp quyền lưu dấu trang. Bạn vẫn có thể mở liên kết.');return;}
    const response=await chrome.runtime.sendMessage({type:'CNC_BOOKMARK_SAVE',links});
    if(!response?.ok)throw Error(response?.error||'Không kết nối được chức năng dấu trang. Hãy tải lại extension.');
    const result=response.bookmarks;
    toast(result.added||result.moved?`Đã đưa ${result.added+result.moved} liên kết lên thanh dấu trang.`:'Các liên kết này đã có trên thanh dấu trang.');
  }catch(error){console.error('Bookmark save failed:',error.message);toast(bookmarkErrorMessage(error));}
  finally{bookmarkBusy=false;filterList();}
}
function linkDirty(){return [...new FormData($('link-form')).values()].some(value=>String(value).trim());}
function resetLinkForm(){editingLink=null;$('link-form').reset();$('cancel-link').hidden=true;}
function renderManagedLinks(){
  $('link-groups').replaceChildren(...[...new Set([...DEFAULT_LINK_GROUPS,...managedLinks.items.map(link=>linkGroupName(link.group))])].map(name=>new Option(name,name)));
  const list=$('managed-links-list');list.replaceChildren();
  for(const link of managedLinks.items){const row=el('div','manage-row'),label=el('div','taxonomy-name');label.append(el('strong','',link.title),el('small','taxonomy-usage',link.group+' · '+link.url));
    const actions=el('div','manage-actions'),edit=el('button','secondary','Sửa'),remove=el('button','danger','Xóa');edit.type=remove.type='button';edit.disabled=remove.disabled=linksSaving;
    edit.setAttribute('aria-label','Sửa liên kết '+link.title);remove.setAttribute('aria-label','Xóa liên kết '+link.title);
    edit.addEventListener('click',()=>{editingLink=link;for(const key of ['title','url','group','description'])$('link-form').elements[key].value=key==='group'?linkGroupName(link.group):link[key]||'';$('cancel-link').hidden=false;$('link-form').elements.title.focus();});
    remove.addEventListener('click',()=>deleteLink(link));actions.append(edit,remove);row.append(label,actions);list.append(row);
  }
}
async function openLinksManager(){
  adminStatus('Đang tải liên kết…');
  try{managedLinks=await adminRequest('/api/admin/links');resetLinkForm();renderManagedLinks();$('manage-view').hidden=true;$('links-manager').hidden=false;adminStatus('');}
  catch(error){if(error.status===401)lock();adminStatus(error.message);}
}
function applyLinks(result){
  managedLinks=result;catalog={...catalog,links:result.items};
  pendingChanges ||= {prompts:{},taxonomy:{}};pendingChanges.taxonomy.links=result.items;markPending();render();renderManagedLinks();
}
async function saveLink(event){
  event.preventDefault();if(linksSaving)return;
  let payload;try{payload=validateLink(Object.fromEntries(new FormData(event.currentTarget)));}catch(error){adminStatus(error.message);return;}
  linksSaving=true;const button=event.currentTarget.querySelector('[type=submit]');busy(button,true);renderManagedLinks();adminStatus('Đang lưu liên kết…');
  try{const result=await adminRequest('/api/admin/links'+(editingLink?'/'+editingLink.id:''),editingLink?'PUT':'POST',{...payload,sha:managedLinks.sha});applyLinks(result);resetLinkForm();adminStatus('Đã lưu liên kết trên máy chủ.');}
  catch(error){if(error.status===401)lock();adminStatus(error.message);}
  finally{linksSaving=false;busy(button,false);if(managedLinks)renderManagedLinks();}
}
async function deleteLink(link){
  if(linksSaving||!confirm('Xóa liên kết “'+link.title+'” cho cả công ty?'))return;
  linksSaving=true;renderManagedLinks();adminStatus('Đang xóa liên kết…');
  try{applyLinks(await adminRequest('/api/admin/links/'+link.id,'DELETE',{sha:managedLinks.sha}));if(editingLink?.id===link.id)resetLinkForm();adminStatus('Đã xóa liên kết trên máy chủ.');}
  catch(error){if(error.status===401)lock();adminStatus(error.message);}
  finally{linksSaving=false;if(managedLinks)renderManagedLinks();}
}
function readLocalLibrary(state){
  personalPrompts=Object.entries(state).filter(([key,p])=>key.startsWith(PERSONAL_PREFIX)&&p?.id&&typeof p.revision==='string').flatMap(([,p])=>{try{validatePersonal(p);return [p];}catch{return [];}});
  usage=Object.fromEntries(Object.entries(state).filter(([key,p])=>key.startsWith(USAGE_PREFIX)&&Number.isFinite(p?.count)&&Number.isFinite(p?.lastUsed)).map(([key,p])=>[key.slice(USAGE_PREFIX.length),p]));
}
function editPersonal(prompt=null){
  personalEditing=prompt;personalDirty=false;
  const form=$('personal-form');form.reset();
  if(prompt)for(const key of ['title','description','content','categoryId'])form.elements[key].value=prompt[key]||'';
  $('personal-title').textContent=prompt?'Sửa prompt cá nhân':'Thêm prompt cá nhân';$('personal-status').textContent='';
  $('personal-categories').replaceChildren(...[...new Set([...catalog.categories.map(c=>c.name),...personalPrompts.map(p=>p.categoryId)])].map(name=>new Option(name,name)));
  show('personal-view');form.elements.title.focus();
}
async function exportPersonal(){
  try{
    const state=await chrome.storage.local.get(null);
    const prompts=Object.entries(state).filter(([key])=>key.startsWith(PERSONAL_PREFIX)).map(([,p])=>validatePersonal(p));
    if(!prompts.length){toast('Chưa có prompt cá nhân để xuất.');return;}
    const text=JSON.stringify(createPersonalBackup(prompts),null,2);
    // Keep exported files within the importer's supported limits.
    parsePersonalBackup(text);
    const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
    const link=el('a');link.href=url;link.download='prompt-cnc-ca-nhan-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    toast('Đã tạo file sao lưu '+prompts.length+' prompt.');
  }catch(error){toast(error.message||'Không xuất được file sao lưu.');}
}
async function importPersonal(event){
  const input=event.currentTarget,file=input.files?.[0];input.value='';if(!file)return;
  const button=$('import-personal');busy(button,true);busy($('export-personal'),true);
  try{
    if(file.size>BACKUP_LIMIT)throw Error('File vượt quá 5 MB.');
    const text=await file.text();parsePersonalBackup(text);
    const result=await chrome.runtime.sendMessage({type:'CNC_PERSONAL_IMPORT',text});
    if(!result.ok)throw Error(result.error);
    readLocalLibrary(await chrome.storage.local.get(null));render();
    toast('Đã nhập '+result.added+' prompt'+(result.skipped?' · bỏ qua '+result.skipped+' bản trùng':'')+'.');
  }catch(error){toast(error.message||'Không nhập được file. Dữ liệu hiện có vẫn được giữ.');}
  finally{busy(button,false);busy($('export-personal'),false);$('export-personal').disabled=!personalPrompts.length;}
}
async function savePersonal(event){
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]');if(button.disabled)return;busy(button,true);
  try{
    const prompt=validatePersonal(Object.fromEntries(new FormData(form)));
    const result=await chrome.runtime.sendMessage({type:'CNC_PERSONAL_SAVE',prompt,id:personalEditing?.id,revision:personalEditing?.revision});
    if(!result.ok)throw Error(result.error);
    personalPrompts=personalPrompts.filter(p=>p.id!==result.prompt.id);personalPrompts.push(result.prompt);personalEditing=null;personalDirty=false;
    switchSource('personal');show('library-view');toast('Đã lưu prompt trên máy này.');
  }catch(error){$('personal-status').textContent=error.message||'Không lưu được prompt. Hãy thử lại.';}
  finally{busy(button,false);}
}
async function deletePersonal(){
  const prompt=previewPrompt;if(!prompt||!confirm('Xóa prompt cá nhân “'+prompt.title+'” trên máy này?'))return;
  busy($('delete-personal-preview'),true);
  try{
    const result=await chrome.runtime.sendMessage({type:'CNC_PERSONAL_DELETE',id:prompt.id,revision:prompt.revision});
    if(!result.ok)throw Error(result.error);
    personalPrompts=personalPrompts.filter(p=>p.id!==prompt.id);$('prompt-preview').close();render();toast('Đã xóa prompt cá nhân.');
  }catch(error){toast(error.message||'Không xóa được prompt.');}
  finally{busy($('delete-personal-preview'),false);}
}
async function refreshTargets(){
  if(!tabMode)return;
  const select=$('chat-target'),tabs=await chrome.tabs.query({url:aiPatterns,currentWindow:true});
  select.replaceChildren(new Option(tabs.length?'Chọn tab AI':'Hãy mở một trang chat AI',''));
  for(const tab of tabs)select.add(new Option(tab.title||new URL(tab.url).hostname,String(tab.id)));
  if(targetId&&!tabs.some(tab=>tab.id===targetId))targetId=null;
  if(!targetId&&tabs.length===1)targetId=tabs[0].id;
  select.value=targetId?String(targetId):'';
}
async function openFullTab(){
  const [active]=await chrome.tabs.query({active:true,currentWindow:true});
  const candidates=await chrome.tabs.query({url:aiPatterns,currentWindow:true});
  const target=candidates.find(tab=>tab.id===active?.id);
  const url=new URL(location.href);url.search='';url.searchParams.set('mode','tab');if(target)url.searchParams.set('target',String(target.id));
  await chrome.tabs.create({url:url.href});
}
async function init(){
  // Restore saved fields after Chrome finishes restoring form values on reload.
  if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
  for(const node of document.querySelectorAll('[data-icon]'))node.prepend(icon(node.dataset.icon));
  for(const node of document.querySelectorAll('.back-button'))node.replaceChildren(icon('arrow'));
  $('app-version').textContent='v'+chrome.runtime.getManifest().version;
  document.body.dataset.layout=tabMode?'tab':'panel';$('open-tab').hidden=tabMode;$('chat-target-row').hidden=!tabMode;
  $('open-tab').addEventListener('click',()=>openFullTab().catch(()=>toast('Không mở được tab. Hãy thử lại.')));
  $('refresh-targets').addEventListener('click',()=>refreshTargets().catch(()=>toast('Không đọc được danh sách tab AI.')));
  $('chat-target').addEventListener('change',()=>{targetId=Number($('chat-target').value)||null;});
  await refreshTargets();
  $('close-preview').addEventListener('click',()=>$('prompt-preview').close());
  $('prompt-preview').addEventListener('close',()=>{previewPrompt=null;});
  $('copy-preview').addEventListener('click',()=>{if(previewPrompt)copyText(previewPrompt.content,previewPrompt);});
  $('insert-preview').addEventListener('click',()=>{if(previewPrompt)insertPrompt(previewPrompt.content,previewPrompt);});
  $('edit-personal-preview').addEventListener('click',()=>{const prompt=previewPrompt;$('prompt-preview').close();editPersonal(prompt);});
  $('delete-personal-preview').addEventListener('click',deletePersonal);
  $('new-personal').addEventListener('click',()=>editPersonal());
  $('export-personal').addEventListener('click',exportPersonal);
  $('import-personal').addEventListener('click',()=>$('personal-import-file').click());
  $('personal-import-file').addEventListener('change',importPersonal);
  $('personal-form').addEventListener('submit',savePersonal);$('personal-form').addEventListener('input',()=>{personalDirty=true;});
  $('back-personal').addEventListener('click',()=>{if(!personalDirty||confirm('Bỏ thay đổi chưa lưu và quay lại?')){personalEditing=null;personalDirty=false;show('library-view');}});
  let state={};try{state=await chrome.storage.local.get(null);}catch{toast('Không đọc được dữ liệu đã lưu. Đang tải lại thư viện.');}
  readLocalLibrary(state);
  if(validCatalog(state.catalog)){catalog=state.catalog;lastSync=Number(state.lastSync)||0;}
  pendingChanges=state.pendingChanges?.prompts&&state.pendingChanges?.taxonomy?state.pendingChanges:null;
  favorites=new Set(Array.isArray(state.favorites)?state.favorites.filter(id=>typeof id==='string'):[]);
  const preferences=state.preferences||{};favoritesOnly=preferences.favoritesOnly===true;
  source=['personal','links'].includes(preferences.source)?preferences.source:'company';
  promptSource=preferences.promptSource==='personal'||source==='personal'?'personal':'company';
  if(['default','recent','frequent','title'].includes(preferences.sort))$('sort-order').value=preferences.sort;
  $('search').value=typeof preferences.search==='string'?preferences.search:'';
  const draft=state.optimizerDraft||{};
  $('optimizer-input').value=typeof draft.input==='string'?draft.input.slice(0,6000):'';
  $('optimizer-result').value=typeof draft.result==='string'?draft.result.slice(0,12000):'';
  $('optimizer-result-wrap').hidden=!$('optimizer-result').value;updateCount();
  serverUrl=ADMIN_API_URL || (typeof state.serverUrl==='string'?state.serverUrl:'');
  if(serverUrl){
    try{const url=new URL(serverUrl);apiPermissionGranted=await chrome.permissions.contains({origins:[url.protocol+'//'+url.hostname+'/*']});}catch{}
  }
  render();
  if(source==='links')$('category').value='Phần mềm công ty';else if([...$('category').options].some(option=>option.value===preferences.category))$('category').value=preferences.category;filterList();syncCatalog(true);
  for(const id of ['search','category','sort-order'])$(id).addEventListener(id==='search'?'input':'change',()=>{filterList();persistPreferences();});
  $('reset-filters').addEventListener('click',()=>{for(const id of ['search','category'])$(id).value='';if(source==='links')$('category').value='Phần mềm công ty';filterList();persistPreferences();$('search').focus();});
  $('all-prompts').addEventListener('click',()=>switchSource('company'));
  $('personal-prompts').addEventListener('click',()=>switchSource('personal'));
  $('links-tab').addEventListener('click',()=>switchSource('links'));
  $('prompt-main').addEventListener('click',()=>switchSource(promptSource));
  $('company-links').addEventListener('click',()=>chooseLinkGroup('Phần mềm công ty'));
  $('ai-links').addEventListener('click',()=>chooseLinkGroup('Phần mềm AI'));
  $('bookmark-all').addEventListener('click',()=>bookmarkLinks(visibleLinks));
  $('manage-links').addEventListener('click',openLinksManager);
  $('link-form').addEventListener('submit',saveLink);
  $('cancel-link').addEventListener('click',resetLinkForm);
  $('back-links').addEventListener('click',()=>{if(linksSaving)return;if(linkDirty()&&!confirm('Bỏ thay đổi liên kết chưa lưu?'))return;$('links-manager').hidden=true;$('manage-view').hidden=false;resetLinkForm();adminStatus('');});
  $('favorite-prompts').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;filterList();persistPreferences();});
  $('manage-search').addEventListener('input',renderManaged);
  $('refresh-button').addEventListener('click',()=>syncCatalog());$('settings-button').addEventListener('click',settings);
  window.addEventListener('focus',()=>{maybeSyncCatalog();refreshTargets().catch(()=>{});});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    let personalChanged=false,usageChanged=false;
    for(const [key,change] of Object.entries(changes)){
      if(key.startsWith(PERSONAL_PREFIX)){const id=key.slice(PERSONAL_PREFIX.length);personalPrompts=personalPrompts.filter(p=>p.id!==id);if(change.newValue)personalPrompts.push(change.newValue);personalChanged=true;}
      if(key.startsWith(USAGE_PREFIX)){const id=key.slice(USAGE_PREFIX.length);if(change.newValue)usage[id]=change.newValue;else delete usage[id];usageChanged=true;}
    }
    if(changes.catalog&&validCatalog(changes.catalog.newValue)){catalog=changes.catalog.newValue;render();}
    if(changes.favorites){favorites=new Set(changes.favorites.newValue||[]);if(!$('prompt-preview').open)filterList();}
    if(personalChanged)render();
    else if(usageChanged&&!$('prompt-preview').open&&['recent','frequent'].includes($('sort-order').value))filterList();
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')maybeSyncCatalog();});
  setInterval(()=>{if(document.visibilityState==='visible')maybeSyncCatalog();},60000);
  $('open-optimizer').addEventListener('click',()=>{show('optimizer-view');$('optimizer-status').textContent='';});
  $('back-optimizer').addEventListener('click',()=>show('library-view'));
  $('optimizer-form').addEventListener('submit',optimize);
  $('optimizer-input').addEventListener('input',()=>{$('optimizer-result-wrap').hidden=true;$('optimizer-result').value='';updateCount();persistDraft();});
  $('optimizer-result').addEventListener('input',persistDraft);
  $('copy-optimized').addEventListener('click',()=>copyText($('optimizer-result').value));
  $('insert-optimized').addEventListener('click',()=>insertPrompt($('optimizer-result').value));
  document.querySelector('#settings-view > .subhead .back-button').addEventListener('click',()=>{if(canLeaveEditor()){lock();show('library-view');}});
  $('unlock-form').addEventListener('submit',unlock);$('lock-button').addEventListener('click',lock);
  $('new-prompt').addEventListener('click',()=>editPrompt());$('reload-managed').addEventListener('click',reloadManaged);$('cancel-edit').addEventListener('click',()=>{if(canLeaveEditor())finishEdit();});
  $('editor-form').addEventListener('input',()=>{editorDirty=true;});
  $('manage-categories').addEventListener('click',openTaxonomy);
  $('back-taxonomy').addEventListener('click',finishTaxonomy);
  $('taxonomy-cancel').addEventListener('click',resetTaxonomyForm);
  $('taxonomy-form').addEventListener('submit',saveTaxonomy);
  $('editor-form').addEventListener('submit',savePrompt);
  document.body.dataset.ready='true';
}
init().catch(error=>{console.error(error);toast('Không mở được thư viện. Hãy tải lại extension.');});

