import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { validateProposal, createProposal, listManagedPrompts, saveManagedPrompt, deleteManagedPrompt, loadCurrentTaxonomy, loadManagedTaxonomy, changeManagedTaxonomy, github, hash } from './lib.js';
import { readJsonBody } from './request.js';
import { optimizePrompt } from './optimizer.js';
import { loadLinks, changeLinks } from './links.js';

const port = Number(process.env.PORT ?? 8787);
const adminPassword = process.env.ADMIN_PASSWORD;
const appVersion=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const bucket = new Map();
const dailyOptimizer = {day:'',count:0};
function send(res,status,data,headers={}){const body=typeof data==='string'?data:JSON.stringify(data);res.writeHead(status,{'Content-Type':typeof data==='string'?'text/html; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(body);}
function auth(req){if(!adminPassword)return false;const given=req.headers.authorization?.replace(/^Bearer /,'')||'';const expected=Buffer.from(hash(adminPassword));const actual=Buffer.from(hash(given));return timingSafeEqual(expected,actual);}
function limit(req,scope,max){const key=scope+':'+(req.socket.remoteAddress||'unknown');const now=Date.now();const record=bucket.get(key)||{count:0,until:now+3600000};if(now>record.until){record.count=0;record.until=now+3600000;}record.count++;bucket.set(key,record);return record.count<=max;}
function cors(req,res){const origin=req.headers.origin||'';if(/^chrome-extension:\/\/[a-p]{32}$/.test(origin)||/^moz-extension:\/\/[0-9a-f-]+$/.test(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');}}
const adminHtml=await readFile(new URL('admin.html',import.meta.url),'utf8');
export const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Prompt-CNC-Version',appVersion);
  cors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const url=new URL(req.url,'http://localhost');
  try{
    if(url.pathname==='/health'&&req.method==='GET'){
      const githubReady=!!(process.env.GITHUB_TOKEN || (process.env.GITHUB_APP_ID && process.env.GITHUB_INSTALLATION_ID && process.env.GITHUB_APP_PRIVATE_KEY));
      send(res,200,{ok:true,configured:!!adminPassword && githubReady});return;
    }
    if(url.pathname==='/api/optimize'&&req.method==='POST'){
      if(!/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin||'')&&!/^moz-extension:\/\/[0-9a-f-]+$/.test(req.headers.origin||'')){
        send(res,403,{error:'Chỉ extension Prompt CNC mới có thể gọi chức năng này.'});return;
      }
      const day=new Date().toISOString().slice(0,10);
      if(dailyOptimizer.day!==day){dailyOptimizer.day=day;dailyOptimizer.count=0;}
      if(dailyOptimizer.count>=300||!limit(req,'optimize',120)){
        send(res,429,{error:'Đã đạt giới hạn tối ưu prompt. Vui lòng thử lại sau.'});return;
      }
      const result=await optimizePrompt(await readJsonBody(req));
      dailyOptimizer.count++;send(res,200,result);return;
    }
    if(url.pathname==='/admin'&&req.method==='GET'){send(res,200,adminHtml,{'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",'X-Content-Type-Options':'nosniff'});return;}
    if(url.pathname==='/api/proposals'&&req.method==='POST'){
      if(process.env.ENABLE_PROPOSALS!=='true'){send(res,404,{error:'Gửi đề xuất đã tắt.'});return;}
      if(!limit(req,'proposal',10)){send(res,429,{error:'Đã gửi quá nhiều đề xuất. Vui lòng thử lại sau.'});return;}
      const {departments,categories}=await loadCurrentTaxonomy();
      const proposal=validateProposal(await readJsonBody(req),departments,categories);
      const result=await createProposal(proposal);send(res,201,result);return;
    }
    if(url.pathname.startsWith('/api/admin/')){
      if(!auth(req)){
        if(!limit(req,'admin-auth',30)){send(res,429,{error:'Quá nhiều lần truy cập. Vui lòng thử lại sau.'});return;}
        send(res,401,{error:'Mật khẩu quản trị không đúng.'});return;
      }
      const links=url.pathname.match(/^\/api\/admin\/links(?:\/([a-zA-Z0-9_-]{1,64}))?$/);
      if(links){
        if(req.method==='GET'&&!links[1]){send(res,200,await loadLinks());return;}
        if((req.method==='POST'&&!links[1])||(['PUT','DELETE'].includes(req.method)&&links[1])){
          send(res,200,await changeLinks(req.method,await readJsonBody(req),links[1]));return;
        }
      }
      if(url.pathname==='/api/admin/prompts'&&req.method==='GET'){
        send(res,200,await listManagedPrompts());return;
      }
      if(url.pathname==='/api/admin/prompts'&&req.method==='POST'){
        const {departments,categories}=await loadCurrentTaxonomy();
        send(res,201,await saveManagedPrompt(await readJsonBody(req),departments,categories));return;
      }
      const managed=url.pathname.match(/^\/api\/admin\/prompts\/([a-zA-Z0-9_-]{1,64})$/);
      if(managed&&req.method==='PUT'){
        const {departments,categories}=await loadCurrentTaxonomy();
        send(res,200,await saveManagedPrompt(await readJsonBody(req),departments,categories,managed[1]));return;
      }
      if(managed&&req.method==='DELETE'){
        const payload=await readJsonBody(req);
        send(res,200,await deleteManagedPrompt(managed[1],payload?.sha));return;
      }
      const taxonomy=url.pathname.match(/^\/api\/admin\/taxonomy\/(departments|categories)(?:\/([a-zA-Z0-9_-]{1,64}))?$/);
      if(taxonomy){
        const [,kind,id]=taxonomy;
        if(!id&&req.method==='GET'){send(res,200,await loadManagedTaxonomy(kind));return;}
        if(!id&&req.method==='POST'){send(res,201,await changeManagedTaxonomy(kind,'add',await readJsonBody(req)));return;}
        if(id&&req.method==='PUT'){send(res,200,await changeManagedTaxonomy(kind,'rename',await readJsonBody(req),id));return;}
        if(id&&req.method==='DELETE'){send(res,200,await changeManagedTaxonomy(kind,'delete',await readJsonBody(req),id));return;}
      }
      if(url.pathname==='/api/admin/proposals'&&req.method==='GET'){
        const prs=await github('/pulls?state=open&per_page=100');
        send(res,200,prs.filter(p=>p.head.ref.startsWith('proposal/')).map(p=>({number:p.number,title:p.title,url:p.html_url,createdAt:p.created_at,headSha:p.head.sha,branch:p.head.ref})));return;
      }
      const match=url.pathname.match(/^\/api\/admin\/proposals\/(\d+)\/(approve|reject)$/);
      if(match&&req.method==='POST'){
        const number=Number(match[1]);const action=match[2];const payload=await readJsonBody(req);
        if(!payload || typeof payload.headSha!=='string'){
          send(res,400,{error:'Thiếu phiên bản đề xuất. Vui lòng tải lại.'});return;
        }
        const pr=await github('/pulls/'+number);
        if(!pr.head.ref.startsWith('proposal/')||pr.state!=='open'){send(res,400,{error:'Đề xuất không hợp lệ.'});return;}
        if(pr.head.sha!==payload.headSha){send(res,409,{error:'Đề xuất đã thay đổi. Vui lòng tải lại trước khi duyệt.'});return;}
        if(action==='approve'){
          const files=await github('/pulls/'+number+'/files?per_page=100');
          const id=pr.head.ref.slice('proposal/'.length);
          if(!/^[0-9a-f-]{36}$/.test(id)||files.length!==1||files[0].filename!=='data/prompts/'+id+'.json'||files[0].status!=='added'){
            send(res,400,{error:'Đề xuất chứa thay đổi ngoài file prompt mới.'});return;
          }
          const encoded=await github('/contents/data/prompts/'+id+'.json?ref='+encodeURIComponent(pr.head.sha));
          const prompt=JSON.parse(Buffer.from(encoded.content,'base64').toString('utf8'));
          if(prompt.id!==id)throw Error('ID prompt không khớp.');
          const {departments,categories}=await loadCurrentTaxonomy();
          validateProposal(prompt,departments,categories);
          const merged=await github('/pulls/'+number+'/merge',{method:'PUT',body:JSON.stringify({sha:payload.headSha,merge_method:'squash',commit_title:pr.title})});
          if(!merged.merged)throw Error('Máy chủ chưa xác nhận xuất bản.');send(res,200,{ok:true,sha:merged.sha});return;
        }
        const reason=typeof payload.reason==='string'?payload.reason.trim().slice(0,500):'';
        if(!reason){send(res,400,{error:'Cần nhập lý do từ chối.'});return;}
        await github('/issues/'+number+'/comments',{method:'POST',body:JSON.stringify({body:'Từ chối: '+reason})});
        await github('/pulls/'+number,{method:'PATCH',body:JSON.stringify({state:'closed'})});send(res,200,{ok:true});return;
      }
    }
    send(res,404,{error:'Không tìm thấy.'});
  }catch(error){const message=error.message||'Lỗi máy chủ';console.error(message);send(res,error.status||(/Dữ liệu|Thiếu|Nội dung|Thông tin phân loại|Danh mục|Từ khóa|Quá nhiều biến/.test(message)?400:502),{error:message});}
});
server.listen(port,()=>console.log('Prompt CNC API listening on '+server.address().port));
