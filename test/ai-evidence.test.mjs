import test from'node:test';import assert from'node:assert/strict';
import{assistantEvidence,packAssistantContent,readAssistantContent,confirmedAssistantMemory}from'../supabase/functions/abnehmen-ai/domain.mjs';
import{createHandler}from'../supabase/functions/abnehmen-ai/handler.mjs';
const today='2026-11-01',at='2026-11-01T08:00:00.000Z';
test('evidence uses actual past records, marks missing values and never adjusts BMI for the cycle',()=>{
 const e=assistantEvidence({today,revision:4,weights:[{recorded_on:'2026-10-20'},{recorded_on:'2026-11-02'}],height:160,cycles:[{recorded_on:'2026-10-28'}],analysis:{bmi:31.25,latest:{recorded_on:'2026-10-20'}}},at);
 assert.deepEqual(e.sources,[[1,'2026-10-20'],[0,null],[0,null],[1,'2026-10-28']]);assert.equal(e.height,160);assert.equal(e.bmi,31.25);assert.deepEqual(e.missing,['measurements','training']);
 const unknown=assistantEvidence({today,revision:5,analysis:{bmi:32}},at);assert.equal(unknown.bmi,null);assert.equal(unknown.height,null);assert.ok(unknown.missing.includes('height'));
});
test('stored provenance survives reload, old text remains readable and envelopes fit database limits',()=>{
 const basis=assistantEvidence({today,revision:2},at),packed=packAssistantContent('Ein sicherer Tipp.',basis,1500);assert.deepEqual(readAssistantContent(packed),{text:'Ein sicherer Tipp.',evidence:basis});
 assert.deepEqual(readAssistantContent('Ein alter Tipp.'),{text:'Ein alter Tipp.',evidence:null});assert.equal(readAssistantContent('{"kind":"anderes-format","text":"Hallo"}').evidence,null);
 const long=packAssistantContent('"😊'.repeat(2000),basis,1500);assert.ok(long.length<=1500);assert.ok(readAssistantContent(long).evidence);assert.ok(readAssistantContent(long).text.length>0);
 assert.equal(readAssistantContent('{"kind":"ab-evidence-v1","text":"x","basis":{}}').evidence,null);
});
test('memory only includes explicitly stored allowed profile fields',()=>{
 const memory=confirmedAssistantMemory({birth_year:1986,activity_level:'active',inferred_diagnosis:'SECRET_GUESS',privateId:'PRIVATE_ID'});assert.match(memory,/1986/);assert.ok(!memory.includes('SECRET_GUESS'));assert.ok(!memory.includes('PRIVATE_ID'));assert.match(memory,/KI-Vermutungen/);
});
function setup(){
 const state={revision:1,tip:null,commits:[],provider:[],tables:{ab_weights:[{id:'PRIVATE_ID',user_id:'PRIVATE_USER',recorded_on:'2026-10-20',weight_kg:80}],ab_measurements:[],ab_training_sessions:[],ab_cycle_entries:[],ab_ai_messages:[],ab_preferences:{birth_year:1986,activity_level:'active'},ab_profile:{height_cm:160}}};
 function query(table){const q={select(){return q;},eq(){return q;},order(){return q;},range(){return q;},limit(){return q;},maybeSingle(){return Promise.resolve(value());},then(a,b){return Promise.resolve(value()).then(a,b);}};function value(){if(table==='ab_diary_state')return{data:{revision:state.revision}};if(table==='ab_ai_tips')return{data:state.tip};if(table==='ab_progress_photos')return{data:null,count:3};return{data:state.tables[table]||[]};}return q;}
 const sdk=()=>({auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}}})},from:query,rpc:async(name,args)=>{if(name==='ab_current_diary')return{data:'11111111-1111-4111-8111-111111111111'};if(name==='ab_ai_server_key')return{data:'dummy-not-a-real-key'};if(name==='ab_ai_reserve')return{data:true};if(name==='ab_ai_commit'){state.commits.push(args);state.tip={content:args.p_tip,memory:args.p_memory,context_hash:args.p_context_hash};return{data:{tip_saved:true}};}return{data:null};}});
 const handler=createHandler({createClient:sdk,env:{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server'},fetchImpl:async(url,options)=>{state.provider.push(JSON.parse(options.body));return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Bleib bei kontrollierter Bewegung.',tip:'Plane eine Pause ein.',memory:'FREI_ERFUNDENE_DIAGNOSE'})}]}]}),{status:200});}});
 const request=()=>new Request('https://test.invalid',{method:'POST',headers:{Origin:'https://marcelkometz-web.github.io',Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({action:'tips',timezone:'Europe/Berlin'})});return{state,handler,request};
}
test('server persists its own exact provenance and cached tips retain their original basis',async()=>{
 const x=setup(),r=await x.handler(x.request());assert.equal(r.status,200);const first=await r.json();assert.equal(first.evidence.sources[0][0],1);assert.equal(first.evidence.height,160);assert.equal(first.evidence.bmi,31.25);
 const commit=x.state.commits[0],tip=readAssistantContent(commit.p_tip);assert.deepEqual(tip.evidence,first.evidence);assert.ok(commit.p_tip.length<=1500);assert.ok(!commit.p_memory.includes('FREI_ERFUNDENE_DIAGNOSE'));assert.match(commit.p_memory,/1986/);
 const context=JSON.parse(x.state.provider[0].input[1].content);assert.deepEqual(context.evidence,first.evidence);assert.ok(!JSON.stringify(context).includes('PRIVATE_ID'));assert.ok(!JSON.stringify(context).includes('PRIVATE_USER'));
 const cached=await(await x.handler(x.request())).json();assert.equal(cached.cached,true);assert.deepEqual(cached.evidence,first.evidence);assert.equal(x.state.provider.length,1);
});
