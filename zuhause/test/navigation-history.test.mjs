import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';
const module={exports:{}};vm.runInNewContext(readFileSync(new URL('../navigation.js',import.meta.url),'utf8'),{module});const{createHistory,canonical,frameApp}=module.exports;const plain=value=>JSON.parse(JSON.stringify(value));
test('back/forward jumps retain visited pages, and a new visit truncates only the forward branch',()=>{
 const history=createHistory();for(const page of['checkin','training','gallery','nutrition'])history.visit({app:'abnehmen',page});
 assert.equal(history.move(1),true);assert.deepEqual(plain(history.current()),{app:'abnehmen',page:'training'});assert.equal(history.snapshot().entries.length,4);
 history.visit({app:'rezepte',page:'daily'});assert.deepEqual(plain(history.snapshot()),{cursor:2,entries:[{app:'abnehmen',page:'checkin'},{app:'abnehmen',page:'training'},{app:'rezepte',page:'daily'}]});
 assert.equal(history.move(3),false);assert.equal(history.move(-1),false);assert.equal(history.move(0),true);assert.equal(history.move(2),true);
});
test('route refreshes deduplicate, bounds stay consistent and logout reset removes earlier visits',()=>{
 const history=createHistory(3);history.visit({app:'garten',page:'overview'});history.visit({app:'garten',page:'overview'});assert.equal(history.snapshot().entries.length,1);
 for(const page of['plants','beds','notes'])history.visit({app:'garten',page});assert.deepEqual(plain(history.snapshot()),{cursor:2,entries:[{app:'garten',page:'plants'},{app:'garten',page:'beds'},{app:'garten',page:'notes'}]});
 history.reset({app:'home',page:'home'});assert.deepEqual(plain(history.snapshot()),{cursor:0,entries:[{app:'home',page:'home'}]});
});
test('history accepts enum routes only and discards supplied content, account and URL data',()=>{
 const history=createHistory();history.visit({app:'rezepte',page:'daily',title:'Private recipe',user_id:'private',url:'https://example.invalid/?token=private'});
 assert.deepEqual(plain(history.current()),{app:'rezepte',page:'daily'});const snapshot=history.snapshot();snapshot.entries[0].page='private';assert.equal(history.current().page,'daily');
 for(const value of[{app:'__proto__',page:'x'},{app:'garten',page:'constructor'},{app:'abnehmen',page:'food'},{app:'garten',page:'https://example.invalid/'},{app:{},page:'overview'},null])assert.equal(canonical(value),null);
});
test('frame route reports require the correct first-party origin, known named frame and source window',()=>{
 const source={},other={},origin='https://marcelkometz-web.github.io',frames=[{name:'unser-zuhause-rezepte',contentWindow:source}];
 assert.equal(frameApp({origin,source},frames,origin),'rezepte');assert.equal(frameApp({origin:'https://outside.invalid',source},frames,origin),null);assert.equal(frameApp({origin,source:other},frames,origin),null);assert.equal(frameApp({origin,source},[{name:'unser-zuhause-unknown',contentWindow:source}],origin),null);
});
