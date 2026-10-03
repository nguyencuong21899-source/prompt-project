import { createHash, createSign, randomUUID } from 'node:crypto';

export const repo = process.env.GITHUB_REPOSITORY || 'nguyencuong21899-source/prompt-project';
export function validateProposal(input, departments, categories) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Dữ liệu không hợp lệ.');
  const clean = (value, max) => {
    if (typeof value !== 'string') throw Error('Thiếu trường bắt buộc.');
    const result = value.trim();
    if (!result || result.length > max) throw Error('Nội dung trống hoặc quá dài.');
    return result;
  };
  const title = clean(input.title, 100);
  const description = clean(input.description, 240);
  const content = clean(input.content, 20000);
  const departmentId = clean(input.departmentId, 60);
  const categoryId = clean(input.categoryId, 60);
  if (!departments.some(x => x.id === departmentId)) throw Error('Thông tin phân loại không hợp lệ.');
  if (!categories.some(x => x.id === categoryId)) throw Error('Danh mục không hợp lệ.');
  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (tags.length > 12 || tags.some(t => typeof t !== 'string' || t.length > 40)) throw Error('Từ khóa không hợp lệ.');
  const uniqueTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
  const names = [...new Set([...content.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]{0,40})\}\}/g)].map(m => m[1]))];
  if (names.length > 20) throw Error('Quá nhiều biến trong prompt.');
  return { title, description, content, departmentId, categoryId, tags: uniqueTags,
    variables: names.map(name => ({ name, label: name.replaceAll('_', ' '), required: true })),
    author: 'Nhân viên đề xuất', updatedAt: new Date().toISOString().slice(0,10), schemaVersion: 1 };
}

const b64url = value => Buffer.from(value).toString('base64url');
let appToken = null;
let appTokenExpiry = 0;
export async function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (appToken && Date.now() < appTokenExpiry) return appToken;
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_INSTALLATION_ID;
  const pem = process.env.GITHUB_APP_PRIVATE_KEY?.replaceAll('\\n','\n');
  if (!appId || !installationId || !pem) throw Object.assign(Error('Máy chủ chưa được cấu hình để lưu prompt.'), { status: 503 });
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload = b64url(JSON.stringify({iat:now-60,exp:now+540,iss:appId}));
  const unsigned = header+'.'+payload;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(pem,'base64url');
  const jwt = unsigned+'.'+signature;
  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`,{method:'POST',headers:{Authorization:'Bearer '+jwt,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
  if (!response.ok) throw Error('Máy chủ chưa kết nối được nơi lưu prompt: '+response.status);
  const data = await response.json(); appToken = data.token; appTokenExpiry = Date.parse(data.expires_at)-120000; return appToken;
}
export async function github(path, options={}) {
  const token = await githubToken();
  const response = await fetch('https://api.github.com/repos/'+repo+path,{signal:AbortSignal.timeout(25000),...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
  const text = await response.text(); let data;try{data=JSON.parse(text);}catch{data={message:text};}
  if(!response.ok) {
    console.error('Storage request failed:', response.status, data.message || 'Unknown error');
    throw Object.assign(Error(`Máy chủ chưa xử lý được yêu cầu (${response.status}). Vui lòng thử lại hoặc báo người quản trị.`), {status:response.status});
  }
  return data;
}
const promptPath = id => 'data/prompts/'+id+'.json';
const validId = id => /^[a-zA-Z0-9_-]{1,64}$/.test(id);
const decodeFile = file => JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
const taxonomyKinds = {departments:'Phòng ban',categories:'Danh mục'};
const taxonomyError = (message,status=400) => Object.assign(Error(message),{status});
const taxonomyPath = kind => {
  if(!Object.hasOwn(taxonomyKinds,kind))throw taxonomyError('Danh sách không hợp lệ.');
  return 'data/'+kind+'.json';
};
export async function loadManagedTaxonomy(kind) {
  const file=await github('/contents/'+taxonomyPath(kind)+'?ref=main');
  const items=decodeFile(file);
  if(!Array.isArray(items)||items.some(item=>!item||typeof item.id!=='string'||typeof item.name!=='string'))throw Error('Danh sách trên máy chủ không hợp lệ.');
  return {items,sha:file.sha};
}
export async function loadCurrentTaxonomy() {
  const [departments,categories]=await Promise.all([loadManagedTaxonomy('departments'),loadManagedTaxonomy('categories')]);
  return {departments:departments.items,categories:categories.items};
}
export async function changeManagedTaxonomy(kind,operation,input,id=null) {
  const path=taxonomyPath(kind), label=taxonomyKinds[kind];
  if(!input||typeof input.sha!=='string'||!input.sha)throw taxonomyError('Thiếu phiên bản danh sách.');
  const current=await loadManagedTaxonomy(kind);
  if(current.sha!==input.sha)throw taxonomyError('Danh sách đã thay đổi. Hãy tải lại trước khi sửa.',409);
  const items=current.items.map(item=>({...item}));
  if(operation==='add'||operation==='rename'){
    if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>60)throw taxonomyError('Tên '+label.toLowerCase()+' phải dài 1–60 ký tự.');
    const name=input.name.trim();
    if(items.some(item=>item.id!==id&&item.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi')))throw taxonomyError(label+' đã tồn tại.');
    if(operation==='add'){
      const base=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
        .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40).replace(/-$/,'')||'muc';
      let next=base,n=2;
      while(items.some(item=>item.id===next))next=base+'-'+n++;
      items.push({id:next,name});id=next;
    }else{
      const item=items.find(item=>item.id===id);
      if(!item)throw taxonomyError(label+' không tồn tại.',404);
      item.name=name;
    }
  }else if(operation==='delete'){
    if(items.length<=1)throw taxonomyError('Cần giữ ít nhất một '+label.toLowerCase()+'.');
    const index=items.findIndex(item=>item.id===id);
    if(index<0)throw taxonomyError(label+' không tồn tại.',404);
    const prompts=await listManagedPrompts();
    const key=kind==='departments'?'departmentId':'categoryId';
    if(prompts.some(item=>item.prompt[key]===id))throw taxonomyError(label+' đang được prompt sử dụng. Hãy chuyển các prompt trước khi xóa.',409);
    items.splice(index,1);
  }else throw taxonomyError('Thao tác không hợp lệ.');
  if(items.length>100)throw taxonomyError('Danh sách đã đạt giới hạn 100 mục.');
  const body={message:'taxonomy: '+operation+' '+kind+' '+id,content:Buffer.from(JSON.stringify(items,null,2)+'\n').toString('base64'),sha:current.sha,branch:'main'};
  const saved=await github('/contents/'+path,{method:'PUT',body:JSON.stringify(body)});
  return {items,sha:saved.content.sha,commit:saved.commit.sha};
}
export async function listManagedPrompts() {
  const files = await github('/contents/data/prompts?ref=main');
  if (!Array.isArray(files)) throw Error('Không đọc được danh sách prompt trên máy chủ.');
  const entries=files.filter(file => file.type === 'file' && file.name.endsWith('.json'));
  const results=new Array(entries.length);let cursor=0;
  // Bound outgoing requests as the library grows instead of bursting once per prompt.
  await Promise.all(Array.from({length:Math.min(6,entries.length)},async()=>{
    while(cursor<entries.length){
    const index=cursor++,file=entries[index];
    const id = file.name.slice(0,-5);
    if (!validId(id)) throw Error('ID prompt trên máy chủ không hợp lệ.');
    const source = await github('/contents/'+promptPath(id)+'?ref=main');
    const prompt = decodeFile(source);
    if (prompt.id !== id) throw Error('ID prompt không khớp tên file.');
    results[index]={prompt,sha:source.sha};
    }
  }));
  return results;
}
export async function saveManagedPrompt(input, departments, categories, id = null) {
  const clean = validateProposal(input, departments, categories);
  let sha;
  let author = 'Prompt CNC';
  if (id === null) {
    const items = await listManagedPrompts();
    const nextId = Math.max(400,...items.map(item => /^\d+$/.test(item.prompt.id) ? Number(item.prompt.id) : 0)) + 1;
    id = String(nextId);
  } else {
    if (!validId(id) || input.sha === undefined || typeof input.sha !== 'string') throw Object.assign(Error('Thiếu phiên bản prompt.'),{status:400});
    const current = await github('/contents/'+promptPath(id)+'?ref=main');
    if (current.sha !== input.sha) throw Object.assign(Error('Prompt đã thay đổi. Hãy tải lại trước khi sửa.'),{status:409});
    sha = current.sha;
    const previous = decodeFile(current);
    author = previous.author || author;
    clean.variables = clean.variables.map(variable => ({...variable,
      label:previous.variables?.find(item => item.name === variable.name)?.label || variable.label}));
  }
  const prompt = {id,...clean,author};
  const body = {message:(sha?'prompt: update ':'prompt: add ')+id+' '+prompt.title,
    content:Buffer.from(JSON.stringify(prompt,null,2)+'\n').toString('base64'),branch:'main'};
  if (sha) body.sha = sha;
  const saved = await github('/contents/'+promptPath(id),{method:'PUT',body:JSON.stringify(body)});
  return {prompt,sha:saved.content.sha,commit:saved.commit.sha};
}
export async function deleteManagedPrompt(id, sha) {
  if (!validId(id) || typeof sha !== 'string' || !sha) throw Object.assign(Error('Thiếu phiên bản prompt.'),{status:400});
  const current = await github('/contents/'+promptPath(id)+'?ref=main');
  if (current.sha !== sha) throw Object.assign(Error('Prompt đã thay đổi. Hãy tải lại trước khi xóa.'),{status:409});
  const result = await github('/contents/'+promptPath(id),{method:'DELETE',body:JSON.stringify({message:'prompt: delete '+id,sha,branch:'main'})});
  return {ok:true,commit:result.commit.sha};
}
export async function createProposal(data) {
  const main = await github('/git/ref/heads/main');
  const id = randomUUID();
  const branch = 'proposal/'+id;
  const prompt = { id, ...data };
  await github('/git/refs',{method:'POST',body:JSON.stringify({ref:'refs/heads/'+branch,sha:main.object.sha})});
  const path = 'data/prompts/'+id+'.json';
  await github('/contents/'+path,{method:'PUT',body:JSON.stringify({message:'prompt: propose '+data.title,content:Buffer.from(JSON.stringify(prompt,null,2)+'\n').toString('base64'),branch})});
  const pr=await github('/pulls',{method:'POST',body:JSON.stringify({title:'Prompt: '+data.title,head:branch,base:'main',body:'Đề xuất từ extension Prompt CNC. Chỉ xuất bản sau khi người quản trị duyệt.\n\nDanh mục: '+data.categoryId})});
  return {number:pr.number,url:pr.html_url};
}
export const hash = value => createHash('sha256').update(value).digest('hex');
