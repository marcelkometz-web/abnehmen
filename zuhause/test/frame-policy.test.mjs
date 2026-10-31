import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../shell-bridge.js',import.meta.url),'utf8'),origin='https://marcelkometz-web.github.io';
function fixture({path='/abnehmen/zuhause/',marker='unser-zuhause-v1',nested=false,foreign=false,standalone=false}={}){
 const sent=[],listeners={},document={documentElement:{dataset:{}},dispatchEvent:()=>{},addEventListener:(name,fn)=>listeners[name]=fn};
 const top={location:{origin,pathname:path},document:{documentElement:{dataset:{appShell:marker}}},postMessage:(...args)=>sent.push(args)},win={location:{origin},frameElement:{dataset:{homeActive:'true'}},addEventListener:(name,fn)=>listeners['window:'+name]=fn};win.self=win;win.top=standalone?win:top;win.parent=standalone?win:nested?{}:top;
 if(foreign)Object.defineProperty(top,'location',{get(){throw Error('cross-origin');}});
 vm.runInNewContext(source,{window:win,document,location:{origin,href:origin+'/garten/'},URL,Event,cancelAnimationFrame:()=>{},requestAnimationFrame:()=>0});return{win,document,sent,listeners};
}
test('only the same-origin top-level shared home can embed a protected app',()=>{const ok=fixture();assert.equal(ok.win.unserZuhauseFrame,true);assert.equal(ok.document.documentElement.dataset.homeFrame,'true');assert.equal(Object.getOwnPropertyDescriptor(ok.win,'unserZuhauseFrame').writable,false);for(const options of[{foreign:true},{nested:true},{path:'/other/'},{path:'/'},{marker:'other'},{standalone:true}])assert.equal(fixture(options).win.unserZuhauseFrame,false);});
test('internal app switches become allowlisted messages, without forwarding arbitrary URLs or tokens',()=>{const x=fixture();let prevented=false;const click=href=>x.listeners.click({button:0,defaultPrevented:false,target:{closest:()=>({href,hasAttribute:()=>false})},preventDefault:()=>prevented=true});click(origin+'/rezepte/');assert.ok(prevented);assert.equal(x.sent[0][0].app,'rezepte');assert.equal(x.sent[0][1],origin);const count=x.sent.length;for(const href of['https://outside.invalid/','https://marcelkometz-web.github.io/unknown/',origin+'/rezepte/?access_token=secret'])click(href);assert.equal(x.sent.length,count);});

test('background work follows only visibility messages from the trusted parent',()=>{const x=fixture();assert.equal(x.win.unserZuhauseHidden,false);x.listeners['window:message']({source:{},origin,data:{type:'UNSER_ZUHAUSE_VISIBILITY',active:false}});assert.equal(x.win.unserZuhauseHidden,false);x.listeners['window:message']({source:x.win.parent,origin,data:{type:'UNSER_ZUHAUSE_VISIBILITY',active:false}});assert.equal(x.win.unserZuhauseHidden,true);x.listeners['window:message']({source:x.win.parent,origin,data:{type:'UNSER_ZUHAUSE_VISIBILITY',active:true}});assert.equal(x.win.unserZuhauseHidden,false);});
test('public help and imprint open an allowlisted document without navigating the private frame',()=>{
 const x=fixture();let prevented=false;
 const click=(href,download=false)=>x.listeners.click({button:0,defaultPrevented:false,target:{closest:()=>({href,hasAttribute:()=>download})},preventDefault:()=>prevented=true});
 click(origin+'/abnehmen/read.html');assert.ok(prevented);assert.equal(x.sent[0][0].type,'UNSER_ZUHAUSE_INFO');assert.equal(x.sent[0][0].document,'progress');
 click(origin+'/garten/impressum.html');assert.equal(x.sent[1][0].document,'legal');
 const count=x.sent.length;click(origin+'/abnehmen/read.txt',true);click('https://outside.invalid/impressum.html');click(origin+'/abnehmen/read.html?token=secret');assert.equal(x.sent.length,count);
});
