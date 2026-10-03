import { randomUUID } from 'node:crypto';
import { github } from './lib.js';
import { validateLink, validLinks } from '../extension/links.js';
const path='/contents/data/links.json';
export async function loadLinks(){
  const file=await github(path+'?ref=main');
  const items=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
  if(!validLinks(items))throw Error('Danh sách liên kết trên máy chủ không hợp lệ.');
  return {items,sha:file.sha};
}
export async function changeLinks(method,input,id){
  const current=await loadLinks();
  if(!input?.sha||input.sha!==current.sha)throw Object.assign(Error('Danh sách đã thay đổi. Hãy tải lại trước khi sửa.'),{status:409});
  const items=current.items.map(item=>({...item}));
  const index=items.findIndex(item=>item.id===id);
  if(id&&index<0)throw Object.assign(Error('Liên kết không tồn tại.'),{status:404});
  if(method==='DELETE')items.splice(index,1);
  else {
    let clean;try{clean=validateLink(input);}catch(error){error.status=400;throw error;}
    if(id)items[index]={id,...clean};else items.push({id:randomUUID(),...clean});
  }
  if(items.length>500)throw Object.assign(Error('Tối đa 500 liên kết.'),{status:400});
  const result=await github(path,{method:'PUT',body:JSON.stringify({message:'links: '+method.toLowerCase()+' '+(id||input.title),sha:current.sha,branch:'main',content:Buffer.from(JSON.stringify(items,null,2)+'\n').toString('base64')})});
  return {items,sha:result.content.sha,commit:result.commit.sha};
}
