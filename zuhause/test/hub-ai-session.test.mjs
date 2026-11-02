import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(process.env.HUB_AI_TEST_SOURCE||new URL('../hub-ai.js',import.meta.url),'utf8');
const AUTH='sb-wwybkswpyoyowciumxda-auth-token',actor='11111111-1111-4111-8111-111111111111';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture({holdLogin=false,holdDiary=false,loginUser=actor,confirmRemoval=true,memberRole='owner',deepLink=false}={}){
 const elements=[],listeners={},windowListeners={},intervals=[],requests=[],storage=new Map();
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners={};this.open=false;this.value='';this.disabled=false;this._text='';elements.push(this);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this._text='';}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(x=>x.textContent||'').join('');}
  get elements(){const out=[];const walk=node=>{for(const child of node.children){if(['INPUT','SELECT','BUTTON'].includes(child.tagName))out.push(child);walk(child);}};walk(this);return out;}
  addEventListener(type,listener){this.listeners[type]=listener;}
  showModal(){this.open=true;}
  close(){this.open=false;this.listeners.close?.();}
 }
 const document={hidden:false,body:new Element('body'),createElement:tag=>new Element(tag),documentElement:{dataset:{appShell:'unser-zuhause-v1'},classList:{add(){},remove(){}}},addEventListener:(type,listener)=>listeners[type]=listener};
 const window={addEventListener:(type,listener)=>windowListeners[type]=listener};
 const loginGate=deferred(),diaryGate=deferred(),temporaryToken='temporary-password-session';
 function setSession(sid='main-session',accessSuffix='signature'){
  const exp=Math.floor(Date.now()/1000)+3600,access_token='header.'+btoa(JSON.stringify({sub:actor,session_id:sid,exp}))+'.'+accessSuffix;
  storage.set(AUTH,JSON.stringify({access_token,user:{id:actor},expires_at:exp}));storage.set(AUTH+':activity',String(Date.now()));
 }
 setSession();
 const response=data=>({ok:true,status:200,json:async()=>data});
 const fetch=async(url,options={})=>{
  requests.push({url,options});const path=new URL(url).pathname;
  if(path==='/auth/v1/user')return response({id:actor,email:'synthetic@example.invalid'});
  if(path==='/rest/v1/rpc/ab_current_diary'){if(holdDiary)await diaryGate.promise;return response('synthetic-diary');}
  if(path==='/rest/v1/rg_members')return response([{role:memberRole,family_id:'synthetic-family'}]);
  if(path==='/rest/v1/rg_families')return response([{owner_id:actor}]);
  if(path==='/auth/v1/token'){if(holdLogin)await loginGate.promise;return response({user:{id:loginUser},access_token:temporaryToken});}
  if(path==='/auth/v1/logout')return{ok:true,status:204};
  if(path==='/rest/v1/rpc/ab_shared_ai_status')return response({provider:'openai',configured:true,shared:true});
  if(path==='/rest/v1/rpc/rg_ai_provider_status')return response({configured:true});
  if(path==='/rest/v1/rpc/rg_hub_select_ai')return response({provider:'gemini'});
  if(path==='/rest/v1/rpc/rg_hub_set_ai_key')return response({ok:true});
  throw Error('Unexpected synthetic request: '+path);
 };
 const replaced=[],confirmations=[];
 vm.runInNewContext(source,{window,self:window,top:window,location:{pathname:'/abnehmen/zuhause/',href:'https://marcelkometz-web.github.io/abnehmen/zuhause/'+(deepLink?'?manage=ai#home':'')},history:{state:null,replaceState:(_state,_title,url)=>replaced.push(url)},confirm:message=>{confirmations.push(message);return confirmRemoval;},document,localStorage:{getItem:key=>storage.get(key)||null},fetch,AbortSignal,Date,JSON,URL,atob,setInterval:fn=>intervals.push(fn)});
 const dialog=()=>elements.find(x=>x.id==='hub-ai-dialog');
 const forms=()=>dialog()?.children.flatMap(x=>x.children).filter(x=>x.tagName==='FORM')||[];
 async function open(){listeners.click({target:{closest:()=>({})}});await tick();}
 async function submitPassword(){const form=forms()[0];assert.ok(form,'Password form exists');form.elements.find(x=>x.name==='password').value='synthetic-password';const pending=form.onsubmit({preventDefault(){}});await tick();return{pending};}
 const logoutRequests=()=>requests.filter(r=>new URL(r.url).pathname==='/auth/v1/logout');
 return{elements,document,storage,requests,intervals,windowListeners,loginGate,diaryGate,temporaryToken,setSession,open,submitPassword,dialog,forms,logoutRequests,replaced,confirmations,close:()=>dialog().children[0].children.find(x=>x.tagName==='BUTTON').onclick()};
}

test('logout while password request is pending revokes the newly created temporary session',async()=>{
 const x=fixture({holdLogin:true});await x.open();const{pending}=await x.submitPassword();x.storage.delete(AUTH);x.loginGate.resolve();await pending;await tick();
 assert.equal(x.logoutRequests().length,1);assert.equal(x.logoutRequests()[0].options.headers.Authorization,'Bearer '+x.temporaryToken);assert.equal(x.dialog().open,false);
});
test('closing while password request is pending revokes late login and leaves the modal closed',async()=>{
 const x=fixture({holdLogin:true});await x.open();const{pending}=await x.submitPassword();x.close();x.loginGate.resolve();await pending;await tick();
 assert.equal(x.logoutRequests().length,1);assert.equal(x.dialog().open,false);assert.equal(x.forms().length,0);
});
test('same user with a new main session cannot inherit an in-flight password unlock',async()=>{
 const x=fixture({holdLogin:true});await x.open();const{pending}=await x.submitPassword();x.setSession('different-main-session');x.loginGate.resolve();await pending;await tick();
 assert.equal(x.logoutRequests().length,1);assert.equal(x.dialog().open,false);assert.equal(x.requests.some(r=>r.url.includes('ab_shared_ai_status')),false);
});
test('a token refresh for the same main session preserves the active unlock',async()=>{
 const x=fixture();await x.open();const{pending}=await x.submitPassword();await pending;await tick();assert.equal(x.forms().length,3);
 x.setSession('main-session','refreshed-signature');x.windowListeners.storage({key:AUTH});x.intervals.forEach(fn=>fn());assert.equal(x.dialog().open,true);assert.equal(x.logoutRequests().length,0);
 x.close();assert.equal(x.logoutRequests().length,1);
});
test('late diary authorization after close does not continue membership checks or mutate the next modal',async()=>{
 const x=fixture({holdDiary:true});await x.open();x.close();x.diaryGate.resolve();await tick();
 assert.equal(x.requests.some(r=>new URL(r.url).pathname==='/rest/v1/rg_members'),false);assert.equal(x.dialog().open,false);
});
test('a login for an unexpected user is revoked instead of kept active',async()=>{
 const x=fixture({loginUser:'another-user'});await x.open();const{pending}=await x.submitPassword();await pending;await tick();
 assert.equal(x.logoutRequests().length,1);assert.equal(x.forms().length,1);assert.equal(x.requests.some(r=>r.url.includes('ab_shared_ai_status')),false);
});
test('same-user session replacement prevents a key write before the periodic check',async()=>{
 const x=fixture();await x.open();const{pending}=await x.submitPassword();await pending;await tick();const keyForm=x.forms()[1];keyForm.elements.find(e=>e.name==='openai').value='synthetic-key-never-sent';
 x.setSession('new-main-session');await keyForm.onsubmit({preventDefault(){}});await tick();
 assert.equal(x.requests.some(r=>r.url.includes('rg_hub_set_ai_key')),false);assert.equal(x.dialog().open,false);assert.equal(x.logoutRequests().length,1);
});
test('clearing shared storage in another tab immediately removes and revokes the unlocked session',async()=>{
 const x=fixture();await x.open();const{pending}=await x.submitPassword();await pending;await tick();x.storage.clear();x.windowListeners.storage({key:null});
 assert.equal(x.dialog().open,false);assert.equal(x.forms().length,0);assert.equal(x.logoutRequests().length,1);
});
test('removing an API key requires confirmation and sends only the selected provider with null',async()=>{
 const x=fixture();await x.open();const{pending}=await x.submitPassword();await pending;await tick();
 await x.forms()[1].elements.find(e=>e.textContent==='Gemeinsamen Schlüssel entfernen').onclick();
 const writes=x.requests.filter(r=>r.url.includes('rg_hub_set_ai_key'));assert.equal(writes.length,1);assert.deepEqual(JSON.parse(writes[0].options.body),{p_provider:'openai',p_key:null});assert.match(x.confirmations[0],/Abnehm-Zugang/);
});
test('cancelled key removal and a non-owner do not send key writes',async()=>{
 for(const options of[{confirmRemoval:false},{memberRole:'member'}]){
  const x=fixture(options);await x.open();const{pending}=await x.submitPassword();await pending;await tick();
  await x.forms()[1].elements.find(e=>e.textContent==='Gemeinsamen Schlüssel entfernen').onclick();assert.equal(x.requests.some(r=>r.url.includes('rg_hub_set_ai_key')),false);
 }
});
test('the explicit management deep link opens the locked dialog and removes only the one-shot parameter',async()=>{
 const x=fixture({deepLink:true});await tick();assert.equal(x.dialog().open,true);assert.equal(x.forms().length,1);assert.deepEqual(x.replaced,['/abnehmen/zuhause/#home']);assert.equal(x.requests.some(r=>r.url.includes('/auth/v1/token')||r.url.includes('rg_hub_set_ai_key')),false);
});
