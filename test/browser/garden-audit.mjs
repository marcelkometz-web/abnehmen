// Real Garden DOM and bundle with synthetic in-memory records. No production reads or writes.
// Browser setup and commands: ./README.md. All API clients here are synthetic.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {launch,fixture,ORIGIN,geometry} from './browser-helper.mjs';
const original=await readFile(new URL('../../../garten/app.js',import.meta.url),'utf8');
function syntheticBoot(){
 const user={id:'10000000-0000-4000-8000-000000000001',email:'garden-audit@example.invalid'};
 const family='20000000-0000-4000-8000-000000000001';
 const now='2026-11-02T08:00:00.000Z';
 const rows={
 rg_members:[{user_id:user.id,family_id:family,role:'owner',joined_at:now}],
 rg_families:[{id:family,name:'Synthetischer Testgarten',settings_version:1,growing_settings:{}}],
 rg_profiles:[],rg_plants:[{id:'30000000-0000-4000-8000-000000000001',family_id:family,is_catalog:false,name:'Tomate',variety:'Testtomate',category:'Gemüse',location:'Sonnig',spacing:'50 cm',sowing:'März',harvest:'August',care:'Testpflege',months:[3,4],schedule:{},favorite:false,source:'manual',version:1,created_at:now,updated_at:now,photo_path:null}],
 rg_beds:[{id:'40000000-0000-4000-8000-000000000001',family_id:family,name:'Testbeet',description:'Nur synthetische Daten',width_cm:200,length_cm:100,version:1,created_at:now,updated_at:now}],
 rg_notes:[],rg_plantings:[],rg_events:[],rg_tasks:[],rg_harvests:[],rg_forum_topics:[],rg_forum_replies:[]};
 const capabilities={blocked:false,maintenance:false,ai:false,forum:true};
 const writes=[],uploads=[],removed=[];
 let failWrites=false,uploadWait=null,releaseUpload=null;
 class Query{
  constructor(table){this.table=table;this.filters=[];this.action='read';this.one=false;}
  select(){return this;} eq(k,v){this.filters.push(r=>r[k]===v);return this;} or(){return this;}
  in(k,vs){this.filters.push(r=>vs.includes(r[k]));return this;} gte(k,v){this.filters.push(r=>r[k]>=v);return this;} lte(k,v){this.filters.push(r=>r[k]<=v);return this;}
  ilike(k,v){const term=v.slice(1,-1).replace(/\\([\\%_])/g,'$1').toLocaleLowerCase('de');this.filters.push(r=>String(r[k]||'').toLocaleLowerCase('de').includes(term));return this;}
  order(){return this;} range(a,b){this.bounds=[a,b];return this;} limit(n){this.bounds=[0,n-1];return this;}
  maybeSingle(){this.one=true;return this;} single(){this.one=true;return this;}
  insert(data){this.action='insert';this.data=data;return this;} update(data){this.action='update';this.data=data;return this;} delete(){this.action='delete';return this;}
  then(resolve,reject){try{
   let source=rows[this.table]||[],result=source.filter(r=>this.filters.every(f=>f(r)));
   if(this.action!=='read'){
    if(failWrites)return Promise.resolve({data:null,error:{message:'NetworkError synthetic offline'}}).then(resolve,reject);
    writes.push({table:this.table,action:this.action,data:structuredClone(this.data),filters:this.filters.length});
    if(this.action==='insert'){result=(Array.isArray(this.data)?this.data:[this.data]).map(r=>({id:crypto.randomUUID(),created_at:now,updated_at:now,created_by:user.id,version:1,...r}));rows[this.table]=source.concat(result);}
    if(this.action==='update'){for(const r of result)Object.assign(r,this.data,{version:r.version+1,updated_at:now});}
    if(this.action==='delete')rows[this.table]=source.filter(r=>!result.includes(r));
   }
   if(this.bounds)result=result.slice(this.bounds[0],this.bounds[1]+1);
   return Promise.resolve({data:this.one?(structuredClone(result[0])||null):structuredClone(result),error:null}).then(resolve,reject);
  }catch(e){return Promise.reject(e).then(resolve,reject);}}
 }
 Be={from:table=>new Query(table),rpc:async(name)=>({data:name==='rg_app_capabilities'?capabilities:name==='rg_invitation'?{pending:false}:[],error:null}),auth:{getSession:async()=>({data:{session:{access_token:'synthetic-audit-token',user}},error:null})},storage:{from:bucket=>({upload:async(path,blob)=>{uploads.push({bucket,path,size:blob.size,type:blob.type});if(uploadWait)await uploadWait;return{data:{path},error:null};},remove:async(paths)=>{removed.push(...paths);return{data:[],error:null};}})}};
 yt=false; p={...p,user,data:{membership:rows.rg_members[0],family:rows.rg_families[0],members:rows.rg_members,profile:null,plants:structuredClone(rows.rg_plants),beds:structuredClone(rows.rg_beds),notes:[],plantings:[],events:[],capabilities},access:capabilities,loading:false,lastSync:new Date()};
 globalThis.__gardenTest={rows,writes,uploads,removed,render:ue,navigate:Pn,harvest:()=>Fa.harvestDialog(),plant:()=>Sr(),bed:(existing=false)=>$t(existing?p.data.beds[0]:null),sharedKeys:()=>se('Gemeinsame KI-Zugänge',Yd(true)),task:()=>Fa.taskDialog(),calendar:()=>wr(),detail:()=>He(p.data.plants[0]),state:()=>p,failWrites:v=>{failWrites=v;},holdUpload:()=>{uploadWait=new Promise(r=>releaseUpload=r);},releaseUpload:()=>{releaseUpload?.();uploadWait=null;},logout:()=>{Ai();ue();}};
 ue();
}
const needle='oh();})();';assert.ok(original.endsWith(needle+'\n')||original.endsWith(needle));
const injected=original.replace(/oh\(\);\}\)\(\);\s*$/,`(${syntheticBoot.toString()})();})();`);
const browser=await launch();
const f=await fixture(browser,{route:async(route,url)=>{
 if(url.pathname==='/garten/app.js'){await route.fulfill({contentType:'text/javascript',body:injected});return true;}
 if(url.pathname.endsWith('/recipes-daily')){await route.fulfill({json:{recipes:[],basis:null}});return true;}
 return false;
}});
const {page}=f; page.on('dialog',d=>d.accept());
const checks=[];async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto(ORIGIN+'/garten/');await page.waitForFunction(()=>globalThis.__gardenTest);
 await check('Five authenticated Garden views remain usable at 320/390/844/1280 px',async()=>{
  for(const viewport of[{width:320,height:700},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
   await page.setViewportSize(viewport);
   for(const view of['overview','plants','beds','notes','settings']){
    await page.evaluate(view=>__gardenTest.navigate(view),view);
    const g=await geometry(page);assert.ok(g.docWidth<=viewport.width+1&&g.bodyWidth<=viewport.width+1,JSON.stringify({view,viewport,g}));
    assert.deepEqual(g.audit.errors,[]);assert.deepEqual(g.audit.rejections,[]);
   }
  }
 });
 await page.setViewportSize({width:390,height:844});
 await check('Harvest comma decimal saves numeric 1.5, date and optional association stay correct',async()=>{
  await page.evaluate(()=>__gardenTest.harvest());
  await page.getByLabel('Was hast du geerntet?').fill('Audit-Ernte');await page.getByLabel('Menge',{exact:true}).fill('1,5');await page.getByLabel('Erntedatum',{exact:true}).fill('2026-10-28');
  await page.getByRole('button',{name:'Ernte speichern',exact:true}).click();await page.waitForFunction(()=>__gardenTest.writes.some(w=>w.table==='rg_harvests'));
  const row=await page.evaluate(()=>__gardenTest.rows.rg_harvests.at(-1));assert.equal(row.quantity,1.5);assert.equal(row.harvested_on,'2026-10-28');assert.equal(row.plant_id,null);
 });
 await check('Failed save preserves harvest values and allows retry',async()=>{
  await page.evaluate(()=>{__gardenTest.failWrites(true);__gardenTest.harvest();});
  await page.getByLabel('Was hast du geerntet?').fill('Nicht verlieren');await page.getByLabel('Menge',{exact:true}).fill('2,25');
  await page.getByRole('button',{name:'Ernte speichern',exact:true}).click();await page.locator('#dialog [data-error]').filter({hasText:'Keine Verbindung'}).waitFor();
  assert.equal(await page.getByLabel('Menge',{exact:true}).inputValue(),'2,25');assert.equal(await page.getByRole('button',{name:'Ernte speichern',exact:true}).isEnabled(),true);
  await page.evaluate(()=>__gardenTest.failWrites(false));await page.getByRole('button',{name:'Ernte speichern',exact:true}).click();await page.waitForFunction(()=>__gardenTest.rows.rg_harvests.some(r=>r.title==='Nicht verlieren'));
 });
 await check('Plant search finds a cultivar and clearing restores result',async()=>{
  await page.evaluate(()=>__gardenTest.navigate('plants'));await page.locator('#plant-search').fill('Testtomate');assert.equal(await page.locator('#plant-results .culture-card').count(),1);
  await page.locator('#plant-search').fill('zzzz-no-match');await page.getByText('Hier wächst noch etwas Neues.',{exact:true}).waitFor();
  assert.equal(await page.locator('.culture-card').count(),0);await page.locator('#plant-search').fill('');assert.equal(await page.locator('#plant-results .culture-card').count(),1);
 });
 await check('Calendar rejects nonexistent time at spring DST change without persisting',async()=>{
  await page.evaluate(()=>__gardenTest.calendar());await page.getByLabel('Datum',{exact:true}).fill('2027-03-28');await page.getByLabel('Ganztägiger Termin',{exact:true}).uncheck();await page.getByLabel('Uhrzeit (Europe/Berlin)',{exact:true}).fill('02:30');
  const count=await page.evaluate(()=>__gardenTest.writes.length);await page.getByRole('button',{name:'Termin speichern',exact:true}).click();await page.locator('#dialog [data-error]').filter({hasText:'Zeitumstellung'}).waitFor();assert.equal(await page.evaluate(()=>__gardenTest.writes.length),count);
  await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();
 });
 await check('New bed converts metres to centimetres and save conflicts preserve the draft',async()=>{
  await page.evaluate(()=>__gardenTest.bed());await page.getByLabel('Beetname',{exact:true}).fill('Neues Testbeet');await page.getByLabel('Breite in m',{exact:true}).fill('2.5');await page.getByLabel('Länge in m',{exact:true}).fill('1.2');
  await page.getByRole('button',{name:'Beet speichern',exact:true}).click();await page.waitForFunction(()=>__gardenTest.rows.rg_beds.some(r=>r.name==='Neues Testbeet'));
  const bed=await page.evaluate(()=>__gardenTest.rows.rg_beds.find(r=>r.name==='Neues Testbeet'));assert.equal(bed.width_cm,250);assert.equal(bed.length_cm,120);
  await page.evaluate(()=>{__gardenTest.bed(true);__gardenTest.rows.rg_beds[0].version++;});await page.getByLabel('Beetname',{exact:true}).fill('Konfliktentwurf');await page.getByRole('button',{name:'Beet speichern',exact:true}).click();
  await page.locator('#dialog [data-error]').filter({hasText:'inzwischen geändert'}).waitFor();assert.equal(await page.getByLabel('Beetname',{exact:true}).inputValue(),'Konfliktentwurf');assert.equal(await page.evaluate(()=>__gardenTest.rows.rg_beds[0].name),'Testbeet');
  await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();
 });
 await check('Personal task saves the chosen date and can be marked complete',async()=>{
  await page.evaluate(()=>__gardenTest.task());await page.getByLabel('Aufgabe',{exact:true}).fill('Synthetisch gießen');await page.getByLabel('Fällig am',{exact:true}).fill('2026-11-03');
  await page.getByRole('button',{name:'Aufgabe speichern',exact:true}).click();await page.waitForFunction(()=>__gardenTest.rows.rg_tasks.length===1);assert.equal(await page.evaluate(()=>__gardenTest.rows.rg_tasks[0].due_date),'2026-11-03');
  await page.evaluate(()=>__gardenTest.navigate('notes'));await page.getByRole('button',{name:'Synthetisch gießen: als erledigt markieren',exact:true}).click();await page.waitForFunction(()=>__gardenTest.rows.rg_tasks[0].status==='erledigt');
 });
 await check('Calendar saves a valid day and exposes an actual ICS download',async()=>{
  await page.evaluate(()=>__gardenTest.calendar());await page.getByLabel('Titel',{exact:true}).fill('Gartentermin-Test');await page.getByLabel('Datum',{exact:true}).fill('2026-11-09');
  await page.getByRole('button',{name:'Termin speichern',exact:true}).click();await page.getByRole('link',{name:'Kalenderdatei öffnen / laden',exact:true}).waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Kalenderdatei öffnen / laden',exact:true}).click()]);const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const ics=Buffer.concat(chunks).toString('utf8');assert.match(ics,/BEGIN:VCALENDAR/);assert.match(ics,/DTSTART;VALUE=DATE:20261109/);assert.match(ics,/SUMMARY:Gartentermin-Test/);assert.match(ics,/CLASS:PRIVATE/);
  await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();
 });
 await check('API key changes route to password-protected central management',async()=>{
  await page.evaluate(()=>__gardenTest.sharedKeys());
  const link=page.getByRole('link',{name:'KI-Zugänge in Zuhause verwalten',exact:true});assert.equal(await link.getAttribute('href'),'/abnehmen/zuhause/?manage=ai#home');assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);assert.match(await link.getAttribute('rel'),/noreferrer/);
  assert.equal(await page.locator('#dialog input[name=api_key]').count(),0);assert.equal(await page.getByRole('button',{name:'Als Familienstandard verwenden',exact:true}).isEnabled(),true);
  await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();
 });
 await check('Closing a dialog cannot interrupt a photo upload/save halfway through',async()=>{
  await page.evaluate(()=>{__gardenTest.harvest();__gardenTest.holdUpload();});
  await page.getByLabel('Was hast du geerntet?').fill('Uploadtest');await page.getByLabel('Menge',{exact:true}).fill('1');
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;const x=c.getContext('2d');x.fillStyle='green';x.fillRect(0,0,20,20);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#dialog input[type=file]').last().setInputFiles({name:'synthetic-green.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.getByRole('button',{name:'Ernte speichern',exact:true}).click();await page.waitForFunction(()=>__gardenTest.uploads.length===1);
  await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();assert.equal(await page.locator('#dialog').evaluate(d=>d.open),true,'Uploading dialog must stay open');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').evaluate(d=>d.open),true,'Escape must not close active write');
  const writes=await page.evaluate(()=>__gardenTest.writes.length);await page.evaluate(()=>{__gardenTest.logout();__gardenTest.releaseUpload();});
  await page.waitForFunction(()=>__gardenTest.removed.length===1);assert.equal(await page.evaluate(()=>__gardenTest.writes.length),writes,'Logout prevents late harvest insert');
 });
 const audit=await page.evaluate(()=>__audit);assert.deepEqual(audit.errors,[]);assert.deepEqual(audit.rejections,[]);assert.deepEqual(audit.csp,[]);
 if(process.env.AUDIT_REPORT_DIR)await writeFile(process.env.AUDIT_REPORT_DIR+'/garden-'+(process.env.AUDIT_ENGINE||'chromium')+'.json',JSON.stringify({engine:process.env.AUDIT_ENGINE||'chromium',checks,missing:f.missing,audit},null,2));
 console.log(JSON.stringify({checks:checks.length,missing:f.missing,errors:audit}));
}finally{await f.close();await browser.close();}
