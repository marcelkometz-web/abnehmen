import test from 'node:test';import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/abnehmen-ai/handler.mjs';
const diary='11111111-1111-4111-8111-111111111111';
function setup({authorized=true,quota=true,key='dummy-secret-not-real',upstreamStatus=200}={}) {
  const events=[];let payload;
  function query(table){let op='read';const q={select(){return q;},order(){return q;},range(){return q;},limit(){return q;},eq(){return q;},delete(){op='delete';return q;},insert(v){events.push({table,op:'insert',value:v});return q;},upsert(v){events.push({table,op:'upsert',value:v});return q;},maybeSingle(){return Promise.resolve(result());},then(ok,bad){return Promise.resolve(result()).then(ok,bad);}};
    function result(){if(table==='ab_profile')return {data:{height_cm:170}};if(table==='ab_ai_tips')return {data:null};if(table==='ab_progress_photos')return {data:null,count:2};if(table==='ab_weights')return {data:[{id:'PRIVATE_ID',user_id:'PRIVATE_USER_ID',recorded_on:'2020-01-01',weight_kg:80,note:'test'}]};return {data:[]};}return q;}
  const factory=(_url,k)=>{events.push({client:k});return {auth:{getUser:async()=>({data:{user:{id:'actor'}}})},from:query,rpc:async(name)=>{events.push({rpc:name});return {data:name==='ab_current_diary'?(authorized?diary:null):name==='ab_ai_server_key'?key:name==='ab_ai_reserve'?quota:null};}};};
  const handler=createHandler({createClient:factory,env:{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server'},fetchImpl:async(_url,options)=>{events.push({provider:true});payload=JSON.parse(options.body);return new Response(upstreamStatus===200?JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Gern. Ein ausgewogener Start.',tip:'Plane eine Portion Gemüse ein.',memory:'Keine zusätzlichen Angaben.'})}]}]}):'PRIVATE_UPSTREAM_ERROR',{status:upstreamStatus,headers:{'content-type':'application/json'}});}});
  const request=(body,auth=true,origin='https://marcelkometz-web.github.io')=>new Request('https://test.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer dummy'}:{})},body:JSON.stringify(body)});
  return {handler,events,request,get payload(){return payload;}};
}
test('unauthenticated and unapproved users cannot reach keys or AI',async()=>{
  const x=setup({authorized:false});assert.equal((await x.handler(x.request({action:'chat',message:'Hallo'},false))).status,401);assert.equal((await x.handler(x.request({action:'chat',message:'Hallo'}))).status,403);assert.ok(!x.events.some(e=>e.rpc==='ab_ai_server_key'||e.provider||e.client==='server'));
  assert.equal((await x.handler(x.request({action:'chat',message:'Hallo'},true,'https://outside.invalid'))).status,403);
});
test('authorized calls minimize context, never send images or IDs, and never expose the key',async()=>{
  const x=setup();const response=await x.handler(x.request({action:'chat',message:'Was passt heute?',diary:'ATTACKER_DIARY'}));const text=await response.text();assert.equal(response.status,200);assert.ok(!text.includes('dummy-secret'));assert.equal(x.payload.store,false);assert.equal(x.payload.model,'gpt-6-luna');assert.ok(!JSON.stringify(x.payload).includes('PRIVATE_ID'));assert.ok(!JSON.stringify(x.payload).includes('PRIVATE_USER_ID'));assert.ok(!JSON.stringify(x.payload).includes('input_image'));assert.ok(x.events.some(e=>e.table==='ab_ai_messages'&&e.value.every(m=>m.user_id===diary)));
});
test('missing keys, quota limits, and upstream failures remain controlled',async()=>{
  for(const [options,status] of [[{key:null},409],[{quota:false},429],[{upstreamStatus:500},502]]){const x=setup(options);const r=await x.handler(x.request({action:'tips'}));assert.equal(r.status,status);assert.ok(!(await r.text()).includes('PRIVATE_UPSTREAM_ERROR'));if(status!==502)assert.ok(!x.events.some(e=>e.provider));}
});
