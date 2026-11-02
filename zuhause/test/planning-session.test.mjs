import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Execute the actual transport, with deferred session/network replies. No real
// login, private content or production write is involved.
const source=readFileSync(new URL('../planning.js',import.meta.url),'utf8');
const transport=source.slice(source.indexOf(' async function request('),source.indexOf(' function safeError('));
const session={access_token:'synthetic',user:{id:'test'}};
function fixture(){
 const calls=[],state={generation:1,identity:'test:session',controllers:new Set(),BASE:'https://example.invalid',KEY:'public',body:null,dialog:null,
  AbortController,DOMException,setTimeout,clearTimeout,Error,
  getSession:async()=>session,sessionIdentity:()=> 'test:session',
  clearPrivate(){state.generation++;state.clears++;},clears:0,
  fetch:async(url,options)=>{calls.push({url,options});return{ok:true,status:200,json:async()=>url.endsWith('/user')?{id:'test'}:url.endsWith('/ab_current_diary')?'diary':[{id:'saved'}]};}
 };
 vm.createContext(state);vm.runInContext(transport+';globalThis.runRequest=request;',state);
 return{state,calls};
}
const deferred=()=>{let resolve;return{promise:new Promise(done=>resolve=done),resolve};};

test('closing the plan while session lookup is pending prevents every subsequent request',async()=>{
 const {state,calls}=fixture(),gate=deferred();state.getSession=()=>gate.promise;
 const result=state.runRequest('/rest/v1/ab_week_plan',{method:'POST',body:'{}'});
 state.generation++;state.identity=null;gate.resolve(session);
 await assert.rejects(result,{name:'AbortError'});assert.equal(calls.length,0);
});

test('a delayed unauthorized response from a closed view cannot clear the newly opened view',async()=>{
 const {state}=fixture(),gate=deferred();state.fetch=()=>gate.promise;
 const result=state.runRequest('/rest/v1/ab_week_plan');await new Promise(resolve=>setImmediate(resolve));
 state.generation++;state.identity='new-session';gate.resolve({ok:false,status:403});
 await assert.rejects(result,{name:'AbortError'});assert.equal(state.clears,0);assert.equal(state.identity,'new-session');
});

test('an active save verifies user and diary before writing and returns the saved result',async()=>{
 const {state,calls}=fixture();const result=await state.runRequest('/rest/v1/ab_week_plan',{method:'POST',body:'{}'});
 assert.deepEqual(calls.map(x=>new URL(x.url).pathname),['/auth/v1/user','/rest/v1/rpc/ab_current_diary','/rest/v1/ab_week_plan']);
 assert.equal(result.data[0].id,'saved');assert.equal(state.controllers.size,0);
});
