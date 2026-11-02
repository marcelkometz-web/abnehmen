import assert from'node:assert/strict';
import{launch,fixture,ORIGIN}from'./browser-helper.mjs';
const actor='11111111-1111-4111-8111-111111111111',calls=[],browser=await launch();
const x=await fixture(browser,{init:()=>{const auth='sb-wwybkswpyoyowciumxda-auth-token',id='11111111-1111-4111-8111-111111111111',exp=Math.floor(Date.now()/1000)+3600;localStorage.setItem(auth,JSON.stringify({user:{id},access_token:'h.'+btoa(JSON.stringify({sub:id,session_id:'main',exp}))+'.signature',expires_at:exp}));localStorage.setItem(auth+':activity',String(Date.now()));},route:async(route,url,req)=>{
 if(!url.hostname.endsWith('.supabase.co'))return false;const p=url.pathname;calls.push({path:p,body:req.postDataJSON()});let data;
 if(p==='/auth/v1/user')data={id:actor,email:'synthetic@example.invalid'};
 else if(p==='/rest/v1/rpc/ab_current_diary')data='synthetic-diary';
 else if(p==='/rest/v1/rg_members')data=[{role:'owner',family_id:'synthetic-family'}];
 else if(p==='/rest/v1/rg_families')data=[{owner_id:actor}];
 else if(p==='/auth/v1/token')data={access_token:'synthetic-temporary-session',user:{id:actor}};
 else if(p==='/auth/v1/logout'){await route.fulfill({status:204});return true;}
 else if(p==='/rest/v1/rpc/ab_shared_ai_status')data={provider:'openai',configured:!calls.some(r=>r.path==='/rest/v1/rpc/rg_hub_set_ai_key'),shared:true};
 else if(p==='/rest/v1/rpc/rg_ai_provider_status')data={configured:true};
 else if(p==='/rest/v1/rpc/rg_hub_set_ai_key')data={configured:false,provider:req.postDataJSON().p_provider};
 else throw Error('Unexpected request '+p);await route.fulfill({status:200,json:data});return true;
}});
try{
 await x.page.goto(ORIGIN+'/abnehmen/zuhause/?manage=ai#home');await x.page.locator('#hub-ai-dialog [name=password]').waitFor();assert.equal(new URL(x.page.url()).searchParams.has('manage'),false);assert.equal(calls.some(r=>r.path==='/auth/v1/token'),false);
 await x.page.locator('#hub-ai-dialog [name=password]').fill('synthetic-password');await x.page.getByRole('button',{name:'KI-Zugänge entsperren',exact:true}).click();const remove=x.page.getByRole('button',{name:'Gemeinsamen Schlüssel entfernen',exact:true}).first();await remove.waitFor();
 x.page.once('dialog',dialog=>dialog.dismiss());await remove.click();assert.equal(calls.some(r=>r.path==='/rest/v1/rpc/rg_hub_set_ai_key'),false);
 x.page.once('dialog',dialog=>{assert.match(dialog.message(),/Abnehm-Zugang/);return dialog.accept();});await remove.click();await x.page.getByText('Schlüssel entfernt. Dieser Zugang steht in euren Apps nicht mehr zur Verfügung.',{exact:true}).waitFor();
 const writes=calls.filter(r=>r.path==='/rest/v1/rpc/rg_hub_set_ai_key');assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{p_provider:'openai',p_key:null});await x.page.getByText('Noch kein nutzbarer Zugang.',{exact:false}).waitFor();assert.deepEqual(await x.page.evaluate(()=>window.__audit.errors),[]);assert.deepEqual(await x.page.evaluate(()=>window.__audit.rejections),[]);console.log('PASS management deep link, cancelled removal, confirmed removal, refreshed unavailable status');
}finally{await x.close();await browser.close();}
