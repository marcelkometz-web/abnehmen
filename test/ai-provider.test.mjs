import test from 'node:test';
import assert from 'node:assert/strict';
import {requestAdvice,MODELS}from '../supabase/functions/abnehmen-ai/provider.mjs';
const answer={reply:'Bleib bei regelmäßigen Mahlzeiten.',tip:'Plane Erholung ein.',memory:''};
test('both provider transports send text-only structured requests and keep keys out of URLs/content',async()=>{
 for(const provider of Object.keys(MODELS)){
  const key='dummy-provider-key-not-a-real-credential',requests=[];
  const result=await requestAdvice({provider,key,system:'Trusted instructions',input:{analysis:{bmi:28},message:'Testfrage'},fetchImpl:async(url,options)=>{
   requests.push({url,options});
   return new Response(JSON.stringify(provider==='gemini'?{candidates:[{content:{parts:[{thought:true,text:'internal must be ignored'},{text:JSON.stringify(answer)}]}}]}:{output:[{content:[{type:'output_text',text:JSON.stringify(answer)}]}]}));
  }});
  assert.deepEqual(result,{ok:true,answer});assert.equal(requests.length,1);
  const {url,options}=requests[0],payload=JSON.parse(options.body);
  assert.ok(!url.includes(key));assert.ok(!options.body.includes(key));assert.ok(!options.body.includes('input_image'));
  if(provider==='openai'){assert.equal(options.headers.Authorization,'Bearer '+key);assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);}
  else{assert.equal(options.headers['x-goog-api-key'],key);assert.equal(payload.generationConfig.responseMimeType,'application/json');assert.equal(payload.generationConfig.responseJsonSchema.additionalProperties,false);assert.match(url,/gemini-3\.1-flash-lite:generateContent$/);}
 }
});
test('upstream failures do not expose bodies, retry or switch the provider',async()=>{
 for(const status of [401,403,429,500]){let calls=0;const result=await requestAdvice({provider:'gemini',key:'dummy',system:'',input:{},fetchImpl:async()=>{calls++;return new Response('PRIVATE ERROR WITH KEY',{status});}});assert.deepEqual(result,{ok:false,status});assert.equal(calls,1);}
});
test('unknown providers and malformed responses cannot produce advice',async()=>{
 let calls=0;await assert.rejects(requestAdvice({provider:'untrusted',key:'dummy',system:'',input:{},fetchImpl:async()=>{calls++;}}));assert.equal(calls,0);
 await assert.rejects(requestAdvice({provider:'gemini',key:'dummy',system:'',input:{},fetchImpl:async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'not json'}]}}]}))}));
});
