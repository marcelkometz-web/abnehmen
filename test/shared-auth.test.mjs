import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedAuth,IDLE_MS} from '../src/shared-auth.mjs';
const projectUrl='https://shared-test.supabase.co';
const store=()=>{const data=new Map();return{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};};
const raw=(id='one',sessionId='session-one',token='access')=>JSON.stringify({access_token:Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({session_id:sessionId})).toString('base64url')+'.'+token,refresh_token:'refresh-only',user:{id}});
function fixture(){let time=1000000;const shared=store(),tab=store(),documentObject=new EventTarget(),timers={setTimeout:()=>{},setInterval:()=>({unref(){}})};const options={projectUrl,sharedStorage:shared,tabStorage:tab,now:()=>time,documentObject,windowObject:new EventTarget(),timers};return{shared,tab,documentObject,options,advance:n=>{time+=n;}};}
test('migrates the current legacy login once and reuses it from another tab',()=>{
 const f=fixture();f.tab.setItem('abnehmen-auth',raw());const a=createSharedAuth({...f.options,legacyKey:'abnehmen-auth'});
 assert.equal(a.storage.getItem(a.storageKey),raw());assert.equal(f.tab.getItem('abnehmen-auth'),null);
 const b=createSharedAuth({...f.options,tabStorage:store()});assert.equal(b.storageKey,a.storageKey);assert.equal(b.storage.getItem(b.storageKey),raw());
});
test('logout clears the shared login and prevents resurrection by a legacy tab',()=>{
 const f=fixture(),a=createSharedAuth(f.options);a.storage.setItem(a.storageKey,raw());const olderTab=store();olderTab.setItem('abnehmen-auth',raw());
 a.storage.removeItem(a.storageKey);const b=createSharedAuth({...f.options,tabStorage:olderTab,legacyKey:'abnehmen-auth'});
 assert.equal(b.storage.getItem(b.storageKey),null);assert.equal(olderTab.getItem('abnehmen-auth'),null);
});
test('background refresh and page loads cannot extend the idle deadline',()=>{
 const f=fixture(),a=createSharedAuth(f.options);a.storage.setItem(a.storageKey,raw());f.advance(IDLE_MS-1);
 a.storage.setItem(a.storageKey,raw('one','session-one','refreshed'));createSharedAuth({...f.options,tabStorage:store()});f.advance(2);
 assert.equal(a.isIdle(),true);assert.equal(a.storage.getItem(a.storageKey),null);
 a.storage.setItem(a.storageKey,raw('one','session-one','late-refresh'));assert.equal(a.storage.getItem(a.storageKey),null);
});
test('real activity in another app extends the shared deadline; synthetic activity does not',()=>{
 const f=fixture(),a=createSharedAuth(f.options);a.storage.setItem(a.storageKey,raw());const listeners=new Map(),doc={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn)},b=createSharedAuth({...f.options,documentObject:doc});
 b.bind({auth:{onAuthStateChange(){},signOut:async()=>({error:null})}});f.advance(IDLE_MS-1000);
 listeners.get('pointerdown')({isTrusted:true});f.advance(1001);assert.equal(a.isIdle(),false);
 f.advance(IDLE_MS-2000);listeners.get('pointerdown')({isTrusted:false});f.advance(1000);assert.equal(a.isIdle(),true);
});
test('a fresh authenticated session can replace an expired one without accepting a stale refresh',()=>{
 const f=fixture(),a=createSharedAuth(f.options);a.storage.setItem(a.storageKey,raw());f.advance(IDLE_MS);
 a.storage.setItem(a.storageKey,raw('one','new-login-session'));assert.equal(a.isIdle(),false);assert.equal(a.storage.getItem(a.storageKey),raw('one','new-login-session'));
});
test('password recovery state survives reload and is scoped to its authenticated session',()=>{
 const f=fixture(),a=createSharedAuth(f.options);a.storage.setItem(a.storageKey,raw());let notify;
 a.bind({auth:{onAuthStateChange(fn){notify=fn;},signOut:async()=>({error:null})}});
 notify('PASSWORD_RECOVERY',JSON.parse(raw()));assert.equal(a.isRecovering(JSON.parse(raw())),true);
 const b=createSharedAuth({...f.options,tabStorage:store()});assert.equal(b.isRecovering(JSON.parse(raw())),true);assert.equal(b.isRecovering(JSON.parse(raw('one','different-session'))),false);
 a.finishRecovery();assert.equal(b.isRecovering(JSON.parse(raw())),false);
});
test('idle expiry clears the browser session even when server sign-out is unavailable',async()=>{
 const f=fixture(),a=createSharedAuth(f.options);a.storage.setItem(a.storageKey,raw());let calls=0;
 a.bind({auth:{onAuthStateChange(){},async signOut(){calls++;if(calls===1)throw Error('offline');assert.equal(a.storage.getItem(a.storageKey),null);return{error:null};}}});
 f.advance(IDLE_MS);await a.expire();assert.equal(calls,2);assert.equal(a.storage.getItem(a.storageKey),null);
});
