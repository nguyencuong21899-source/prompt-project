export function validateLink(input) {
  const clean=(key,max,required=true)=>{
    const value=typeof input?.[key]==='string'?input[key].trim():'';
    if((required&&!value)||value.length>max)throw Error('Thông tin liên kết trống hoặc quá dài.');
    return value;
  };
  const title=clean('title',100),description=clean('description',240,false),group=clean('group',60),raw=clean('url',2048);
  let url;try{url=new URL(raw);}catch{throw Error('Hãy nhập đường dẫn đầy đủ, bắt đầu bằng https:// hoặc http://.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Liên kết chỉ được dùng HTTP/HTTPS và không chứa tài khoản, mật khẩu.');
  return {title,description,group,url:url.href};
}
export function validLinks(items) {
  if(!Array.isArray(items)||items.length>500)return false;
  const ids=new Set();
  return items.every(item=>{try{validateLink(item);if(!/^[a-zA-Z0-9_-]{1,64}$/.test(item.id)||ids.has(item.id))return false;ids.add(item.id);return true;}catch{return false;}});
}
export const DEFAULT_LINK_GROUPS=['Phần mềm AI','Phần mềm công ty'];
export function linkGroupName(group){
  if(['AI','Phần mềm AI'].includes(group))return DEFAULT_LINK_GROUPS[0];
  if(['Nội bộ','Phần mềm nội bộ','Phần mềm công ty'].includes(group))return DEFAULT_LINK_GROUPS[1];
  return group;
}
export function groupLinks(links,includeEmpty=false){
  const groups=new Map(includeEmpty?DEFAULT_LINK_GROUPS.map(name=>[name,[]]):[]);
  for(const link of links){const name=linkGroupName(link.group);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(link);}
  const rank=name=>{const index=DEFAULT_LINK_GROUPS.indexOf(name);return index<0?2:index;};
  return [...groups].sort(([a],[b])=>rank(a)-rank(b)||a.localeCompare(b,'vi')).map(([name,items])=>({name,items}));
}
export function requestBookmarkPermission(chromeApi) {
  const manifest=chromeApi.runtime.getManifest();
  if(![...(manifest.permissions||[]),...(manifest.optional_permissions||[])].includes('bookmarks')){
    throw Error('Chrome chưa nhận quyền dấu trang của bản mới. Vào chrome://extensions, bấm Tải lại Prompt CNC rồi mở lại bảng.');
  }
  // Keep this synchronous up to request(): Chrome requires the original click.
  return chromeApi.permissions.request({permissions:['bookmarks']});
}
export function bookmarkErrorMessage(error) {
  const message=String(error?.message||'');
  if(message.includes('Chrome chưa nhận'))return message;
  if(/context invalidated|extension context|not listed.*optional|not declared/i.test(message))return 'Chrome chưa nhận bản cập nhật. Vào chrome://extensions, bấm Tải lại Prompt CNC rồi thử lại.';
  if(/user gesture|user activation/i.test(message))return 'Chrome chưa nhận thao tác cấp quyền. Đóng bảng, mở lại và bấm Lưu dấu trang một lần nữa.';
  if(/managed|policy|not allowed|cannot modify/i.test(message))return 'Chrome đang hạn chế sửa dấu trang. Hãy kiểm tra chính sách trình duyệt với quản trị viên.';
  return message||'Không lưu được dấu trang. Hãy tải lại extension và thử lại.';
}
export async function saveBookmarks(api,links) {
  const tree=await api.getTree(),nodes=[];
  const walk=items=>{for(const node of items){nodes.push(node);walk(node.children||[]);}};walk(tree);
  const roots=tree.flatMap(node=>node.children||[]);
  const bar=roots.find(node=>node.folderType==='bookmarks-bar'&&!node.unmodifiable)||roots.find(node=>node.id==='1'&&!node.url&&!node.unmodifiable);
  if(!bar)throw Error('Chrome không có thanh dấu trang có thể chỉnh sửa. Hãy kiểm tra chính sách trình duyệt.');
  let added=0,moved=0,skipped=0,index=0;
  for(const link of links){const clean=validateLink(link);
    const matches=nodes.filter(node=>{try{return node.url&&new URL(node.url).href===clean.url;}catch{return false;}});
    if(matches.some(node=>node.parentId===bar.id)){skipped++;continue;}
    const existing=matches.find(node=>!node.unmodifiable);
    if(existing){await api.move(existing.id,{parentId:bar.id,index:index++});existing.parentId=bar.id;moved++;}
    else {const created=await api.create({parentId:bar.id,index:index++,title:clean.title,url:clean.url});nodes.push(created);added++;}
  }
  return {added,moved,skipped};
}
