import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import vm from'node:vm';
const source=readFileSync(new URL('../themes.js',import.meta.url),'utf8'),css=readFileSync(new URL('../themes.css',import.meta.url),'utf8'),mod={exports:{}};vm.runInNewContext(source,{module:mod});const{THEMES,STORAGE_KEY,normalizeTheme,readTheme}=mod.exports;
test('only four public theme identifiers are accepted, including corrupted-storage fallbacks',()=>{
 assert.deepEqual(Object.keys(THEMES),['gartenruhe','rosengarten','lavendelabend','abendlicht']);for(const value of[null,'','<script>','constructor','__proto__','https://evil.invalid/','Rosengarten'])assert.equal(normalizeTheme(value),'gartenruhe');assert.equal(readTheme({getItem:()=>{throw Error('blocked storage');}}),'gartenruhe');
 let key;assert.equal(readTheme({getItem:value=>(key=value,'rosengarten')}),'rosengarten');assert.equal(key,STORAGE_KEY);
});
test('theme code never initializes in untrusted frames or unrelated documents',()=>{
 const framed={self:{},top:{}};vm.runInNewContext(source,{window:framed});assert.equal(framed.unserZuhauseThemes,undefined);
 const unrelated={};unrelated.self=unrelated.top=unrelated;vm.runInNewContext(source,{window:unrelated,location:{pathname:'/garten/'}});assert.equal(unrelated.unserZuhauseThemes,undefined);
});
test('the browser API persists only the whitelisted enum and does not write unknown values',()=>{
 const writes=[],document={documentElement:{dataset:{appShell:'unser-zuhause-v1'}},querySelector:()=>null,querySelectorAll:()=>[],readyState:'loading',addEventListener(){}},window={localStorage:{getItem:()=>null,setItem:(...args)=>writes.push(args)},addEventListener(){}};window.self=window.top=window;
 vm.runInNewContext(source,{window,document,location:{pathname:'/abnehmen/zuhause/'}});assert.equal(window.unserZuhauseThemes.current(),'gartenruhe');assert.equal(window.unserZuhauseThemes.set('constructor'),false);assert.equal(writes.length,0);assert.equal(window.unserZuhauseThemes.set('abendlicht'),true);assert.equal(document.documentElement.dataset.theme,'abendlicht');assert.equal(writes.length,1);assert.equal(writes[0][0],STORAGE_KEY);assert.equal(writes[0][1],'abendlicht');assert.ok(Object.isFrozen(window.unserZuhauseThemes));
});
const luminance=hex=>{const values=hex.replace('#','').match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('all four actual CSS palettes keep body, secondary text, cards and action labels at 4.5:1',()=>{
 for(const id of Object.keys(THEMES)){
  const block=css.match(new RegExp('html\\[data-theme='+id+'\\]\\{([^}]+)\\}'))?.[1];assert.ok(block,id);const vars=Object.fromEntries([...block.matchAll(/--([a-z-]+):(#\w{6})/g)].map(match=>[match[1],match[2]]));
  for(const[text,background]of[['ink','bg'],['ink','paper'],['muted','paper'],['muted','bg'],['green','paper'],['green','home-soft'],['home-on-accent','green'],['garden-accent','garden-bg'],['recipes-accent','recipes-bg'],['progress-accent','progress-bg']])assert.ok(contrast(vars[text],vars[background])>=4.5,id+' '+text+'/'+background+' '+contrast(vars[text],vars[background]).toFixed(2));
 }
});
