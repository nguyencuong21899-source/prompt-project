export const PERSONAL_PREFIX = 'personal:';
export const USAGE_PREFIX = 'usage:';
export const BACKUP_LIMIT = 5 * 1024 * 1024;
export function createPersonalBackup(prompts) {
  return {app:'Prompt CNC',kind:'personal-prompts',schemaVersion:1,exportedAt:new Date().toISOString(),prompts:prompts.map(validatePersonal)};
}
export function parsePersonalBackup(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>BACKUP_LIMIT)throw Error('File vượt quá 5 MB.');
  let backup;try{backup=JSON.parse(text);}catch{throw Error('File không phải JSON hợp lệ.');}
  if(backup?.app!=='Prompt CNC'||backup.kind!=='personal-prompts'||backup.schemaVersion!==1||!Array.isArray(backup.prompts)||backup.prompts.length>500)throw Error('Chọn file sao lưu Prompt CNC, tối đa 500 prompt.');
  return backup.prompts.map((prompt,index)=>{try{return validatePersonal(prompt);}catch{throw Error('Prompt thứ '+(index+1)+' trong file không hợp lệ. Chưa nhập dữ liệu.');}});
}
export function uniquePersonalImports(incoming,existing) {
  const key=prompt=>JSON.stringify(validatePersonal(prompt));
  const seen=new Set(existing.map(key)),added=[];
  for(const prompt of incoming){const signature=key(prompt);if(!seen.has(signature)){seen.add(signature);added.push(validatePersonal(prompt));}}
  return {prompts:added,skipped:incoming.length-added.length};
}
export function validatePersonal(input) {
  const clean = (key, max, required = true) => {
    if (typeof input?.[key] !== 'string' || input[key].length > max || (required && !input[key].trim())) throw Error('Nội dung prompt cá nhân không hợp lệ.');
    return input[key].trim();
  };
  return {title:clean('title',100), description:clean('description',240,false), content:clean('content',20000), categoryId:clean('categoryId',60,false)||'Chung', tags:[]};
}
export function sortPrompts(prompts, mode, usage = {}) {
  const items = [...prompts];
  const title = (a,b) => a.title.localeCompare(b.title,'vi',{numeric:true}) || a.id.localeCompare(b.id);
  if (mode === 'recent') items.sort((a,b) => (usage[b.id]?.lastUsed||0)-(usage[a.id]?.lastUsed||0)||title(a,b));
  if (mode === 'frequent') items.sort((a,b) => (usage[b.id]?.count||0)-(usage[a.id]?.count||0)||(usage[b.id]?.lastUsed||0)-(usage[a.id]?.lastUsed||0)||title(a,b));
  if (mode === 'title') items.sort(title);
  return items;
}
