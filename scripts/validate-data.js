import { readdir, readFile } from 'node:fs/promises';
import { validateProposal } from '../server/lib.js';
import { validLinks } from '../extension/links.js';
const json=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const departments=await json('../data/departments.json');const categories=await json('../data/categories.json');
if(!validLinks(await json('../data/links.json')))throw Error('Danh sách liên kết không hợp lệ');
const unique=(items,label)=>{const ids=items.map(x=>x.id);if(new Set(ids).size!==ids.length)throw Error(label+' trùng ID');};
unique(departments,'Phòng ban');unique(categories,'Danh mục');
const files=(await readdir(new URL('../data/prompts/',import.meta.url))).filter(x=>x.endsWith('.json'));
const ids=[];for(const file of files){const prompt=await json('../data/prompts/'+file);if(prompt.id+'.json'!==file)throw Error('ID không khớp tên file: '+file);ids.push(prompt.id);validateProposal(prompt,departments,categories);const names=new Set(prompt.variables?.map(x=>x.name));const referenced=new Set([...prompt.content.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]{0,40})\}\}/g)].map(x=>x[1]));for(const variable of referenced)if(!names.has(variable))throw Error('Thiếu biến '+variable+' trong '+file);for(const variable of names)if(!referenced.has(variable))throw Error('Biến không dùng '+variable+' trong '+file);}
unique(ids.map(id=>({id})),'Prompt');console.log('Validated '+files.length+' prompts');
