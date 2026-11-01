import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../navigation.js',import.meta.url),'utf8'),origin='https://marcelkometz-web.github.io';
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
function fixture(){
 const listeners={},messages=[],parent={location:{origin,pathname:'/abnehmen/zuhause/'},document:{documentElement:{dataset:{appShell:'unser-zuhause-v1'}}},postMessage:value=>messages.push(value)};
 const win={unserZuhauseFrame:true,addEventListener:(name,fn)=>listeners[name]=fn};win.self=win;win.parent=parent;win.top=parent;
 const document={readyState:'loading',documentElement:{dataset:{}},addEventListener:()=>{}};
 vm.runInNewContext(source,{window:win,document,location:{origin,pathname:'/garten/'},AbortController,setTimeout,clearTimeout,requestAnimationFrame:()=>1});
 const send=(type,id,page='plants')=>listeners.message({origin,source:parent,data:{type,app:'garten',requestId:id,page}});
 return{api:win.appNavigation,send,messages};
}
const tick=()=>new Promise(done=>setImmediate(done));
test('cancel aborts a command already waiting for a draft flush and a later command can still navigate',async()=>{
 const x=fixture(),gate=deferred();let page='overview',signal,jumps=0;
 x.api.register({app:'garten',navigate:async(route,context)=>{signal=context.signal;await gate.promise;if(signal.aborted)return false;jumps++;page=route.page;x.api.report({page,ready:true,busy:false});return true;}});x.api.report({page,ready:true,busy:false});
 x.send('APP_NAV_COMMAND',1);assert.equal(signal.aborted,false);x.send('APP_NAV_CANCEL',1);assert.equal(signal.aborted,true);gate.resolve();await tick();
 assert.equal(jumps,0);assert.equal(page,'overview');assert.equal(x.messages.find(m=>m.type==='APP_NAV_RESULT'&&m.requestId===1)?.ok,false);
 x.send('APP_NAV_COMMAND',2);await tick();assert.equal(jumps,1);assert.equal(page,'plants');assert.equal(x.messages.find(m=>m.type==='APP_NAV_RESULT'&&m.requestId===2)?.ok,true);
});
test('auth reset aborts the active command before its awaited work resumes',async()=>{
 const x=fixture(),gate=deferred();let signal,jumps=0;
 x.api.register({app:'garten',navigate:async(route,context)=>{signal=context.signal;await gate.promise;if(signal.aborted)return false;jumps++;x.api.report({page:route.page,ready:true,busy:false});return true;}});x.api.report({page:'overview',ready:true,busy:false});
 x.send('APP_NAV_COMMAND',3);x.api.reset();assert.equal(signal.aborted,true);gate.resolve();await tick();assert.equal(jumps,0);assert.equal(x.messages.find(m=>m.type==='APP_NAV_RESULT'&&m.requestId===3)?.ok,false);
});
