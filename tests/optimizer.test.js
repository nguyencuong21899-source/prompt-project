import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizePrompt } from '../server/optimizer.js';

test('Gemini rewrites a draft without sending the key or draft to GitHub', async()=>{
  const oldKey=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='test-gemini-key';
  try{
    let request;
    const result=await optimizePrompt({prompt:'viết email mời tham dự họp'},async(url,options)=>{
      request={url,options};
      return Response.json({candidates:[{content:{parts:[{text:'Viết email mời tham dự cuộc họp, nêu thời gian và địa điểm.'}]}}]});
    });
    assert.equal(result.optimized,'Viết email mời tham dự cuộc họp, nêu thời gian và địa điểm.');
    assert.equal(result.model,'gemini-3.5-flash-lite');
    assert.match(request.url,/^https:\/\/generativelanguage\.googleapis\.com\//);
    assert.equal(request.options.headers['x-goog-api-key'],'test-gemini-key');
    assert.equal(JSON.parse(request.options.body).contents[0].parts[0].text,'viết email mời tham dự họp');
    assert.equal(request.options.body.includes('test-gemini-key'),false);
  }finally{if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});

test('optimizer rejects invalid input and reports missing configuration',async()=>{
  const oldKey=process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try{
    await assert.rejects(optimizePrompt({prompt:'ngắn'}),error=>error.status===400);
    await assert.rejects(optimizePrompt({prompt:'Viết một email mời họp'}),error=>error.status===503);
  }finally{if(oldKey!==undefined)process.env.GEMINI_API_KEY=oldKey;}
});

test('optimizer handles Gemini limits and empty candidates',async()=>{
  const oldKey=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='test-gemini-key';
  try{
    await assert.rejects(optimizePrompt({prompt:'Viết một email mời họp'},async()=>Response.json({error:{}},{status:429})),error=>error.status===429);
    await assert.rejects(optimizePrompt({prompt:'Viết một email mời họp'},async()=>Response.json({candidates:[]})),error=>error.status===502);
  }finally{if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
