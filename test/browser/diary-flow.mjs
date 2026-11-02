import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {launch,fixture,ORIGIN,geometry} from './browser-helper.mjs';
const uid='11111111-1111-4111-8111-111111111111';
const engine=process.env.AUDIT_ENGINE||'chromium';
const results=[];
const reportDir=process.env.AUDIT_REPORT_DIR||fileURLToPath(new URL('../../../reports/',import.meta.url));
await mkdir(reportDir,{recursive:true});
const browser=await launch(engine);
const state={revision:1,weights:[],training:[],cycles:[],prefs:{birth_year:1986,activity_level:'active'},loseTraining:true};
let releaseAI,releaseProfile,releaseCycle;
const f=await fixture(browser,{init:()=>{
 const key='sb-wwybkswpyoyowciumxda-auth-token',uid='11111111-1111-4111-8111-111111111111';
 const encode=value=>btoa(JSON.stringify(value)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');
 const jwt=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,session_id:'22222222-2222-4222-8222-222222222222'})+'.synthetic';
 localStorage.setItem(key,JSON.stringify({access_token:jwt,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid,email:'audit@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}}));
 localStorage.setItem(key+':activity',String(Date.now()));localStorage.setItem(key+':shared-v1','1');
},route:async(route,url,req)=>{
 if(process.env.TEST_BASELINE&&url.origin===ORIGIN&&url.pathname==='/abnehmen/app.js'){await route.fulfill({contentType:'text/javascript',body:await readFile(process.env.DIARY_BASELINE_BUNDLE||'/tmp/app-audit-20261102/diary-baseline.js')});return true;}
 if(!url.hostname.endsWith('.supabase.co'))return false;
 const send=async(json,status=200)=>{await route.fulfill({status,json});return true;};
 if(url.pathname.endsWith('/recipes-daily'))return send({recipes:[]});
 if(url.pathname.endsWith('/abnehmen-ai')){await new Promise(resolve=>releaseAI=resolve);return send({reply:'Synthetische Antwort ohne Anbieteraufruf.'});}
 if(url.pathname.includes('/auth/v1/')){
  if(url.pathname.endsWith('/logout')){await route.fulfill({status:204});return true;}
  return send({id:uid,email:'audit@example.invalid',app_metadata:{},user_metadata:{}});
 }
 if(url.pathname.includes('/rpc/')){
  const rpc=url.pathname.split('/').at(-1);
  if(rpc==='ab_current_diary')return send(uid);
  if(rpc==='ab_shared_ai_status')return send({configured:false,shared:true,provider:'openai',model:'synthetic'});
  if(rpc==='ab_save_checkin_checked'){
   const data=req.postDataJSON();if(data.p_expected_revision!==state.revision)return send({code:'40001',message:'Stale'},409);
   state.weights=state.weights.filter(r=>r.recorded_on!==data.p_recorded_on);state.weights.push({id:'33333333-3333-4333-8333-333333333333',recorded_on:data.p_recorded_on,weight_kg:data.p_weight,note:data.p_note});state.revision++;
   return send({revision:state.revision,saved_at:new Date().toISOString(),photo_count:0});
  }
  return send(null);
 }
 const table=url.pathname.split('/').at(-1),object=(req.headers().accept||'').includes('object+json');
 if(table==='ab_training_sessions'&&req.method()==='POST'){
  const row=req.postDataJSON();if(state.training.some(r=>r.id===row.id))return send({code:'23505',message:'Duplicate'},409);
  const record={id:row.id||crypto.randomUUID(),...row};state.training.push(record);state.revision++;
  if(state.loseTraining){state.loseTraining=false;await route.abort('failed');return true;}
  return send(record,201);
 }
 if(table==='ab_training_sessions'&&req.method()==='DELETE'){
  const id=url.searchParams.get('id')?.slice(3);state.training=state.training.filter(r=>r.id!==id);state.revision++;return send({id});
 }
 if(table==='ab_cycle_entries'&&req.method()==='POST'){const row={id:crypto.randomUUID(),...req.postDataJSON()};state.cycles.push(row);state.revision++;await new Promise(resolve=>releaseCycle=resolve);return send(null,201);}
 if(table==='ab_preferences'&&req.method()==='PATCH'){Object.assign(state.prefs,req.postDataJSON());state.revision++;await new Promise(resolve=>releaseProfile=resolve);return send(state.prefs);}
 const tables={ab_access:[{enabled:true,diary_user_id:uid}],ab_diary_state:[{revision:state.revision,last_saved_at:'2026-11-01T12:00:00Z'}],ab_profile:[{user_id:uid,height_cm:170}],ab_weights:state.weights,ab_measurements:[],ab_progress_photos:[],ab_training_sessions:state.training,ab_cycle_entries:state.cycles,ab_preferences:[{user_id:uid,...state.prefs}],ab_ai_messages:[],ab_ai_tips:[],ab_exercise_logs:[]};
 if(table in tables){let rows=tables[table];if(url.searchParams.has('id'))rows=rows.filter(r=>r.id===url.searchParams.get('id').slice(3));return send(object?rows[0]||null:rows);}
 return send([]);
}});
const {page}=f;page.setDefaultTimeout(10000);
const go=async(name)=>{await page.locator('#open-menu').click();await page.locator('#menu-choices [data-destination="'+name+'"]').click();};
try{
 await page.goto(ORIGIN+'/abnehmen/');await page.locator('#dashboard').waitFor({state:'visible'});await page.waitForTimeout(300);
 const today=await page.locator('#checkin-form [name=recorded_on]').inputValue();
 await page.locator('#checkin-form [name=weight_kg]').fill('83,5');await page.locator('#checkin-form [name=note]').fill('Noch nicht gespeichert');
 await page.locator('#checkin-form [name=photo_front]').setInputFiles({name:'synthetisch.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64')});
 await go('calendar');await page.locator('#calendar-grid [data-date="'+today+'"]').click();await page.getByRole('button',{name:'Diesen Check-in bearbeiten'}).click();
 assert.equal(await page.locator('#checkin-form [name=weight_kg]').inputValue(),'83,5');
 assert.equal(await page.locator('#checkin-form [name=note]').inputValue(),'Noch nicht gespeichert');
 assert.equal(await page.locator('#checkin-form [name=photo_front]').evaluate(el=>el.files[0]?.name),'synthetisch.png');
 results.push('Current calendar day and edit action retain weight/note/photo draft');
 await go('calendar');const another=await page.locator('#calendar-grid button').first().getAttribute('data-date');
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#calendar-grid [data-date="'+another+'"]').click();await go('checkin');assert.equal(await page.locator('#checkin-form [name=weight_kg]').inputValue(),'83,5');
 results.push('Different calendar day cancellation retains draft');
 await page.locator('#open-assistant-page').click();await page.locator('#ai-form textarea').fill('Erste Nachricht');await page.locator('#ai-form [type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#ai-form [type=submit]').disabled);
 await page.locator('#ai-form textarea').fill('Zweite Nachricht noch als Entwurf');while(!releaseAI)await page.waitForTimeout(20);releaseAI();
 await page.waitForFunction(()=>!document.querySelector('#ai-form [type=submit]').disabled);
 assert.equal(await page.locator('#ai-form textarea').inputValue(),'Zweite Nachricht noch als Entwurf');
 results.push('Delayed AI response retains newly typed message');
 releaseAI=null;await page.locator('#ai-form textarea').fill('Nachricht vor Appwechsel');await page.locator('#ai-form [type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#ai-form [type=submit]').disabled);
 while(!releaseAI)await page.waitForTimeout(20);
 await page.evaluate(()=>{window.unserZuhauseHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
 releaseAI();await page.waitForTimeout(100);
 await page.evaluate(()=>{window.unserZuhauseHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await page.locator('#dashboard').waitFor({state:'visible'});await page.waitForTimeout(200);
 await page.locator('#open-assistant-page').click();
 assert.equal(await page.locator('#ai-form [type=submit]').isDisabled(),false);
 assert.equal(await page.locator('#ai-form textarea').inputValue(),'Nachricht vor Appwechsel');
 results.push('App switch during pending AI response retains draft and restores enabled send button');
 await page.locator('#close-ai').click();
 await go('training');await page.locator('#training-form [name=minutes]').fill('30');await page.locator('#training-form [name=kind]').selectOption('bands');
 await page.locator('#training-form [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#training-form [type=submit]').disabled);
 assert.equal(state.training.length,1);assert.equal(await page.locator('#training-form [name=minutes]').inputValue(),'30');
 await page.locator('#training-form [name=minutes]').fill('45');await page.locator('#training-form [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#training-form [type=submit]').disabled);
 assert.equal(state.training.length,1);assert.equal(state.training[0].minutes,30);assert.match(await page.locator('#message').innerText(),/bereits mit anderen Angaben/);
 await page.locator('#training-form [name=minutes]').fill('30');await page.locator('#training-form [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#training-form [type=submit]').disabled);
 assert.equal(state.training.length,1);assert.equal(await page.locator('#training-form [name=minutes]').inputValue(),'');
 results.push('Lost training response/retry/change conflict leaves exactly one 30 minute workout');
 await go('profile');await page.locator('#profile-form [name=birth_year]').fill('1986');await page.locator('#profile-form [type=submit]').click();
 while(!releaseProfile)await page.waitForTimeout(20);
 await page.locator('#profile-form [name=birth_year]').fill('1987');releaseProfile();await page.waitForFunction(()=>!document.querySelector('#profile-form [type=submit]').disabled);
 assert.equal(await page.locator('#profile-form [name=birth_year]').inputValue(),'1987');assert.equal(state.prefs.birth_year,1986);
 await page.locator('#cycle-form [name=note]').fill('Gesendete Notiz');await page.locator('#cycle-form [type=submit]').click();while(!releaseCycle)await page.waitForTimeout(20);
 await page.locator('#cycle-form [name=note]').fill('Danach ergänzter Entwurf');releaseCycle();await page.waitForFunction(()=>!document.querySelector('#cycle-form [type=submit]').disabled);
 assert.equal(await page.locator('#cycle-form [name=note]').inputValue(),'Danach ergänzter Entwurf');assert.equal(state.cycles[0].note,'Gesendete Notiz');
 results.push('Late profile and cycle save confirmations retain subsequently changed inputs');
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){
  await page.setViewportSize(viewport);
  for(const name of ['checkin','progress','weekly','calendar','gallery','training','exercise','nutrition','profile','backup']){
   await go(name);await page.waitForTimeout(50);const g=await geometry(page);
   assert.ok(g.bodyWidth<=viewport.width+1,name+' body overflow '+g.bodyWidth);assert.ok(g.mainHeight>120,name+' main too short');assert.equal(g.audit.errors.length,0);assert.equal(g.audit.rejections.length,0);
  }
  results.push('Ten private pages accessible at '+viewport.width+'x'+viewport.height);
 }
 await page.setViewportSize({width:390,height:844});await go('checkin');await page.screenshot({path:path.join(reportDir,'diary-audit-'+engine+'-2026-11-02.png')});
 await page.locator('#logout').click();await page.locator('#login-panel').waitFor({state:'visible'});assert.equal(await page.locator('#checkin-form [name=weight_kg]').inputValue(),'');assert.equal(await page.locator('#ai-form textarea').inputValue(),'');assert.equal(await page.locator('#training-history').innerText(),'');
 results.push('Logout clears diary values, private training history and chat draft');
 assert.deepEqual(f.missing,[]);assert.deepEqual(f.pageErrors,[]);
 console.log(JSON.stringify({engine,results,missing:f.missing,pageErrors:f.pageErrors},null,2));
 await writeFile(path.join(reportDir,'diary-browser-'+engine+'-2026-11-02.json'),JSON.stringify({engine,results,missing:f.missing,pageErrors:f.pageErrors},null,2));
}finally{await f.close();await browser.close();}
