import { PERSONAL_PREFIX, USAGE_PREFIX, validatePersonal, parsePersonalBackup, uniquePersonalImports } from './library.js';
import { saveBookmarks } from './links.js';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('Cannot open Prompt CNC side panel:', error));

// Serialize writes from the side panel and full tab; no personal data leaves Chrome.
let writes = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!['CNC_PERSONAL_SAVE','CNC_PERSONAL_DELETE','CNC_PERSONAL_IMPORT','CNC_USAGE','CNC_BOOKMARK_SAVE'].includes(message?.type)) return;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  const operation = writes.then(async () => {
    if(message.type==='CNC_PERSONAL_IMPORT'){
      const incoming=parsePersonalBackup(message.text);
      const state=await chrome.storage.local.get(null);
      const existing=Object.entries(state).filter(([key])=>key.startsWith(PERSONAL_PREFIX)).flatMap(([,p])=>{try{return [validatePersonal(p)];}catch{return [];}});
      const unique=uniquePersonalImports(incoming,existing);
      const prompts=unique.prompts.map(prompt=>({...prompt,id:'local-'+crypto.randomUUID(),revision:crypto.randomUUID(),updatedAt:Date.now()}));
      // One storage write: validation/quota failures cannot leave a partial import.
      if(prompts.length)await chrome.storage.local.set(Object.fromEntries(prompts.map(p=>[PERSONAL_PREFIX+p.id,p])));
      return {added:prompts.length,skipped:unique.skipped};
    }
    if(message.type==='CNC_BOOKMARK_SAVE'){
      if(!Array.isArray(message.links)||!message.links.length||message.links.length>500)throw Error('Danh sách liên kết không hợp lệ.');
      if(!await chrome.permissions.contains({permissions:['bookmarks']}))throw Error('Cần cho phép Prompt CNC lưu dấu trang rồi thử lại.');
      if(!chrome.bookmarks)throw Error('Hãy tải lại Prompt CNC trong chrome://extensions để bật chức năng dấu trang.');
      return {bookmarks:await saveBookmarks(chrome.bookmarks,message.links)};
    }
    if (message.type === 'CNC_USAGE') {
      if (typeof message.id !== 'string' || message.id.length > 100) throw Error('Prompt không hợp lệ.');
      const key=USAGE_PREFIX+message.id, state=await chrome.storage.local.get(key);
      const usage={count:(Number(state[key]?.count)||0)+1,lastUsed:Date.now()};
      await chrome.storage.local.set({[key]:usage});return {usage};
    }
    const id=message.id || 'local-'+crypto.randomUUID();
    if (!/^local-[0-9a-f-]{36}$/.test(id)) throw Error('Prompt cá nhân không hợp lệ.');
    const key=PERSONAL_PREFIX+id, state=await chrome.storage.local.get(key), previous=state[key];
    if (message.id && (!previous || previous.revision !== message.revision)) throw Error('Prompt đã thay đổi ở cửa sổ khác. Hãy mở lại trước khi sửa.');
    if (message.type === 'CNC_PERSONAL_DELETE') {
      await chrome.storage.local.remove([key,USAGE_PREFIX+id]);return {id};
    }
    const prompt={...validatePersonal(message.prompt),id,revision:crypto.randomUUID(),updatedAt:Date.now()};
    await chrome.storage.local.set({[key]:prompt});return {prompt};
  });
  writes=operation.catch(()=>{});
  operation.then(data=>respond({ok:true,...data}),error=>respond({ok:false,error:error.message}));
  return true;
});
