import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {launch,fixture,ORIGIN,geometry} from './browser-helper.mjs';
const engine=process.env.AUDIT_ENGINE||'chromium',browser=await launch(engine);
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+y5a8AAAAASUVORK5CYII=','base64');
const recipe={id:1,revision:0,title:'Audit-Hähnchen mit Brokkoli',category:'["mittag","abend","highprotein","kalorienbewusst"]',emoji:'🥦',ingredients:'Hähnchen Brokkoli',zutaten_liste:'• 100 g Hähnchenbrust\n• 200 g Brokkoli\n• Salz nach Geschmack',kcal:280,prot:35,kh:12,sugar:3,fat:8,sat_fat:1,fiber:5,salt:.3,tipps:'',prep:'Gut durchgaren.',image_url:'recipes/photo.jpg',has_side:false};
const notes=[{id:1,author:'Test',content:'Milch',is_done:false}];const calls=[];let holdImages=false,imagePending=[],holdBoots=false,bootPending=[],holdNotes=false,notePending=[],failToggle=false;
const f=await fixture(browser,{route:async(route,url,req)=>{
 if(url.pathname==='/recipe-audit.html'){await route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="de"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/rezepte/style.css"><link rel="stylesheet" href="/rezepte/recipe.css"><body><div id="app"></div><dialog id="dialog"></dialog><script type="module" src="/recipe-harness.mjs"></script></body></html>'});return true;}
 if(url.pathname==='/recipe-harness.mjs'){await route.fulfill({contentType:'text/javascript',body:await readFile(new URL('./recipe-controller-harness.mjs',import.meta.url),'utf8')});return true;}
 if(url.pathname.endsWith('/functions/v1/recipes-api')){const body=req.postDataJSON();calls.push(body);const json=value=>route.fulfill({status:200,json:value});
  if(body.action==='boot'){const done=()=>json({recipes:[{...recipe}],notes:notes.map(x=>({...x})),rights:[],canEdit:true,admin:true});if(holdBoots)bootPending.push(done);else await done();return true;}
  if(body.action==='image'){const done=()=>route.fulfill({status:200,contentType:'image/png',body:pixel});if(holdImages)imagePending.push(done);else await done();return true;}
  if(body.action==='note-add'){const done=()=>json({ok:true});if(holdNotes)notePending.push(done);else await done();return true;}
  if(body.action==='note-toggle'){if(failToggle)await route.fulfill({status:503,json:{error:'Synthetic offline'}});else{notes[0].is_done=body.done;await json({ok:true});}return true;}
  if(body.action==='recipe-save'){Object.assign(recipe,body.recipe,{revision:recipe.revision+1});await json({recipe});return true;}
  throw Error('Unexpected recipe action '+body.action);
 }return false;
}});
const {page}=f,wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('condition not reached');};
try{
 await page.goto(ORIGIN+'/recipe-audit.html');await page.locator('.plant-visual img').waitFor();assert.equal(calls.filter(x=>x.action==='image').length,1);
 await page.locator('.card-title').click();await page.locator('.detail-hero img').waitFor();assert.equal(calls.filter(x=>x.action==='image').length,1,'cached detail must not re-fetch');
 await page.getByRole('button',{name:'Eine halbe Portion mehr'}).click();await page.locator('.detail-hero img').waitFor();await page.getByText('150 g Hähnchenbrust',{exact:true}).waitFor();assert.equal(calls.filter(x=>x.action==='image').length,1);
 const whatsapp=new URL(await page.getByRole('link',{name:'Per WhatsApp teilen'}).getAttribute('href'));assert.match(whatsapp.searchParams.get('text'),/150 g Hähnchenbrust/);
 holdNotes=true;const add=page.getByRole('button',{name:'Auf die Einkaufsliste',exact:true});await add.evaluate(node=>{node.click();node.click();});await wait(()=>notePending.length===1);assert.equal(await add.isDisabled(),true);assert.equal(calls.filter(x=>x.action==='note-add').length,1,'double click must not add twice');await notePending.shift()();holdNotes=false;await wait(async()=>!await add.isDisabled());
 await page.getByLabel('Eigene Tipps & Erfahrungen').fill('Synthetischer Tipp');await page.getByRole('button',{name:'Tipps speichern'}).click();await page.waitForFunction(()=>!document.querySelector('#dialog').open);assert.equal(recipe.tipps,'Synthetischer Tipp');
 await page.getByRole('button',{name:'Einkauf',exact:true}).click();failToggle=true;const toggle=page.getByRole('checkbox',{name:'Erledigt: Milch'});await toggle.click();await wait(async()=>!await toggle.isDisabled());assert.equal(await toggle.isChecked(),false,'failed save must restore displayed checkbox');assert.equal(notes[0].is_done,false);
 failToggle=false;await toggle.check();await page.locator('.list-item.done').waitFor();assert.equal(notes[0].is_done,true);
 await page.evaluate(()=>{fixture.state.view='overview';fixture.render();});await page.locator('.plant-visual img').waitFor();
 // A pending old-user image must not return after logout or enter the new cache.
 holdImages=true;await page.evaluate(()=>fixture.setUser('user-b'));await wait(()=>imagePending.length===1);const createdBefore=await page.evaluate(()=>fixture.created.length);await page.evaluate(()=>fixture.setUser(null));await imagePending.shift()();await new Promise(r=>setTimeout(r,100));assert.equal(await page.evaluate(()=>fixture.created.length),createdBefore);assert.equal(await page.locator('img').count(),0);holdImages=false;
 // Settling the old user's boot must not clear the new user's loading gate.
 holdBoots=true;await page.evaluate(()=>fixture.setUser('user-c'));await wait(()=>bootPending.length===1);await page.evaluate(()=>fixture.setUser('user-d'));await wait(()=>bootPending.length===2);await bootPending.shift()();await new Promise(r=>setTimeout(r,50));const boots=calls.filter(x=>x.action==='boot').length;await page.evaluate(()=>fixture.render());await new Promise(r=>setTimeout(r,50));assert.equal(calls.filter(x=>x.action==='boot').length,boots);await bootPending.shift()();holdBoots=false;await page.locator('.plant-visual img').waitFor();
 const layouts=[];for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(viewport);await page.locator('.card-title').click();const g=await geometry(page);assert.ok(g.bodyWidth<=viewport.width+1);const rect=await page.locator('#dialog').boundingBox();assert.ok(rect.x>=-1&&rect.x+rect.width<=viewport.width+1);layouts.push({viewport,bodyWidth:g.bodyWidth,dialog:rect});await page.getByRole('button',{name:'Schließen',exact:true}).click();}
 assert.deepEqual(await page.evaluate(()=>__audit.errors),[]);assert.deepEqual(await page.evaluate(()=>__audit.rejections),[]);
 const result={engine,checks:['cached images survive detail/portion/list rerender','one picture fetch for repeated renders','1.5 servings and WhatsApp agree','double shopping click saved once','tips save fields survive disabled controls','failed checkbox save rolls back UI','successful checkbox save persists','logout rejects late private image','old login boot cannot release new loading gate','320/390/844/1280 dialog geometry'],layouts,calls:calls.map(x=>x.action),pageErrors:f.pageErrors,missing:f.missing};await writeFile(`/workspace/reports/recipe-regression-${engine}-2026-11-02.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await f.close();await browser.close();}
