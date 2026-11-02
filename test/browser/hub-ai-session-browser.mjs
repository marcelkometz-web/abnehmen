import assert from 'node:assert/strict';
import {launch,fixture,ORIGIN} from './browser-helper.mjs';
const AUTH='sb-wwybkswpyoyowciumxda-auth-token',actor='11111111-1111-4111-8111-111111111111';
const browser=await launch();
try{
 for(const scenario of ['logout-pending','new-session-pending','new-session-before-save','refresh-stays-open']){
  let resume,arrived;const seen=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>resume=resolve),requests=[];
  const x=await fixture(browser,{init:()=>{
   const auth='sb-wwybkswpyoyowciumxda-auth-token',actor='11111111-1111-4111-8111-111111111111';window.__setAuditSession=(id='main')=>{const exp=Math.floor(Date.now()/1000)+3600;localStorage.setItem(auth,JSON.stringify({user:{id:actor},access_token:'h.'+btoa(JSON.stringify({sub:actor,session_id:id,exp}))+'.signature',expires_at:exp}));localStorage.setItem(auth+':activity',String(Date.now()));};window.__setAuditSession();
  },route:async(route,url,req)=>{
   if(!url.hostname.endsWith('.supabase.co'))return false;requests.push({path:url.pathname,authorization:req.headers().authorization});
   let data;if(url.pathname==='/auth/v1/user')data={id:actor,email:'synthetic@example.invalid'};
   else if(url.pathname==='/rest/v1/rpc/ab_current_diary')data='synthetic-diary';
   else if(url.pathname==='/rest/v1/rg_members')data=[{role:'owner',family_id:'synthetic-family'}];
   else if(url.pathname==='/rest/v1/rg_families')data=[{owner_id:actor}];
   else if(url.pathname==='/auth/v1/token'){arrived();if(scenario.endsWith('pending'))await gate;data={access_token:'synthetic-temporary-session',user:{id:actor}};}
   else if(url.pathname==='/auth/v1/logout'){await route.fulfill({status:204});return true;}
   else if(url.pathname==='/rest/v1/rpc/ab_shared_ai_status')data={provider:'openai',configured:true,shared:true};
   else if(url.pathname==='/rest/v1/rpc/rg_ai_provider_status')data={configured:true};
   else if(url.pathname==='/rest/v1/rpc/rg_hub_set_ai_key')data={ok:true};
   else throw Error('Unexpected request '+url.pathname);
   await route.fulfill({status:200,json:data});return true;
  }});
  try{
   await x.page.goto(ORIGIN+'/abnehmen/zuhause/');await x.page.locator('[data-open-hub-ai]').click();await x.page.locator('#hub-ai-dialog [name=password]').fill('synthetic-password');await x.page.getByRole('button',{name:'KI-Zugänge entsperren',exact:true}).click();await seen;
   if(scenario==='logout-pending'){await x.page.evaluate(auth=>localStorage.removeItem(auth),AUTH);resume();}
   if(scenario==='new-session-pending'){await x.page.evaluate(()=>window.__setAuditSession('new-main'));resume();}
   if(scenario==='new-session-before-save'){
    const key=x.page.locator('#hub-ai-dialog [name=openai]');await key.waitFor();await key.fill('synthetic-key-never-sent');await key.evaluate(input=>{window.__setAuditSession('new-main');input.closest('form').requestSubmit();});
   }
   if(scenario==='refresh-stays-open'){
    await x.page.locator('#hub-ai-dialog [name=openai]').waitFor();await x.page.evaluate(auth=>{window.__setAuditSession('main');window.dispatchEvent(new StorageEvent('storage',{key:auth,newValue:localStorage.getItem(auth)}));},AUTH);assert.equal(await x.page.locator('#hub-ai-dialog').evaluate(el=>el.open),true);assert.equal(requests.some(r=>r.path==='/auth/v1/logout'),false);await x.page.locator('#hub-ai-dialog').getByRole('button',{name:'Schließen',exact:true}).click();
   }
   await x.page.waitForFunction(()=>!document.querySelector('#hub-ai-dialog')?.open);
   await x.page.waitForTimeout(50);
   assert.equal(requests.filter(r=>r.path==='/auth/v1/logout').length,1,scenario+' revokes exactly the temporary session');assert.equal(requests.find(r=>r.path==='/auth/v1/logout').authorization,'Bearer synthetic-temporary-session');assert.equal(requests.some(r=>r.path==='/rest/v1/rpc/rg_hub_set_ai_key'),false);
   assert.deepEqual(await x.page.evaluate(()=>window.__audit.errors),[]);assert.deepEqual(await x.page.evaluate(()=>window.__audit.rejections),[]);console.log('PASS',scenario);
  }finally{await x.close();}
 }
}finally{await browser.close();}
