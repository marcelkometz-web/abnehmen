import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {launch,fixture,ORIGIN,geometry} from './browser-helper.mjs';
const reportDir=process.env.AUDIT_REPORT_DIR||path.join(tmpdir(),'app-public-audit');await mkdir(reportDir,{recursive:true});
const engine=process.env.AUDIT_ENGINE||'chromium',browser=await launch(engine),results=[];
const viewports=[[320,740],[390,844],[430,932],[844,390],[1280,900]];
const urls=['/abnehmen/zuhause/','/garten/','/rezepte/','/abnehmen/'];
try{
for(const [width,height]of viewports)for(const url of urls){
 const x=await fixture(browser,{viewport:{width,height},route:async(route,url)=>{if(url.pathname.endsWith('/rpc/rg_app_capabilities')){await route.fulfill({status:200,json:{blocked:false,maintenance:false,maintenance_access:false,member_approval_required:true}});return true;}return false;}});const{page}=x;const result={engine,url,width,height};
 try{
  await page.goto(ORIGIN+url);await page.waitForTimeout(800);
  const g=await geometry(page);result.geometry=g;result.missing=x.missing;result.pageErrors=x.pageErrors;result.external=x.external;
  assert.equal(g.bodyWidth,width,'body horizontal overflow');assert.equal(g.docWidth,width,'root horizontal overflow');assert.equal(g.audit.errors.length,0,'window errors');assert.equal(g.audit.rejections.length,0,'unhandled rejections');assert.equal(g.audit.csp.length,0,'CSP violations');assert.equal(x.missing.length,0,'missing assets');
  assert(g.images.every(i=>i.complete&&i.width>0),'broken visible images');
  if(url==='/abnehmen/zuhause/'){
   await page.locator('#choose-home-theme').click();await page.locator('#home-theme-dialog[open]').waitFor();
   for(const theme of ['rosengarten','lavendelabend','abendlicht','gartenruhe']){await page.locator(`input[name=home_theme][value=${theme}]`).check();}
   await page.locator('#close-home-theme').click();
   await page.locator('.topbar [data-info=general]').click();await page.locator('#info-content .help-hero').first().waitFor({timeout:5000});
   for(const key of ['garden','recipes','progress','legal','general']){await page.locator(`#info-dialog [data-info=${key}]`).click();await page.waitForFunction(()=>!document.querySelector('#info-content').hasAttribute('aria-busy'));assert(!await page.locator('#info-content').getAttribute('aria-busy'),'help load');assert((await page.locator('#info-content').textContent()).length>100,'help populated');}
   await page.locator('#close-info').click();
   await page.locator('#install-app').click();assert(await page.locator('#install-steps li').count()>0);await page.locator('#close-install').click();
   for(const area of ['garten','rezepte','abnehmen','home']){
    await page.locator(`.shell-nav [data-open=${area}]`).click();await page.waitForTimeout(350);assert.equal(new URL(page.url()).hash,'#'+area);
    if(area!=='home'){const frame=page.frame({name:'unser-zuhause-'+area});assert(frame);const geom=await geometry(frame);assert.equal(geom.bodyWidth,width,'embedded overflow');assert.equal(geom.audit.errors.length,0,'embedded errors');assert.equal(geom.audit.rejections.length,0,'embedded unhandled rejections');}
   }
   await page.locator('#app-nav-back').click();await page.waitForTimeout(200);assert.equal(new URL(page.url()).hash,'#abnehmen');await page.locator('#app-nav-forward').click();await page.waitForTimeout(200);assert.equal(new URL(page.url()).hash,'#home');
   await page.locator('#app-nav-history').click();assert(await page.locator('.app-nav-entry').count()>=4);await page.locator('#app-nav-close-history').click();
   for(const trigger of ['[data-open-week-plan]','[data-open-hub-ai]','[data-open-hub-backup]']){
    await page.locator(trigger).click();const dialog=page.locator('dialog[open]');await dialog.waitFor();assert.match(await dialog.textContent(),/anmeld|passwort|Zugang|Sicherung/i);await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('dialog[open]').count(),0);
   }
  }else{
   assert.match(await page.locator('body').textContent(),/Anmelden|anmelden|Anmeldung/);
   assert.equal(await page.locator('input[type=password]').count()>0,true,'login input');
   await page.locator('[data-confirmed-socials] a').first().waitFor({timeout:10000});
   const profiles=await page.locator('[data-confirmed-socials] a').evaluateAll(els=>els.map(e=>({href:e.href,target:e.target,rel:e.rel})));
   result.profiles=profiles;assert.equal(profiles.length,3,'three confirmed profiles');assert(profiles.every(p=>p.target==='_blank'&&p.rel.includes('noopener')&&p.rel.includes('noreferrer')),'external profiles protected');
  }
  result.pass=true;
 }catch(error){result.pass=false;result.error=error.stack;await page.screenshot({path:path.join(reportDir,`fail-${engine}-${url.split('/').filter(Boolean).join('-')}-${width}.png`),fullPage:true});}
 results.push(result);console.log(JSON.stringify({engine,url,width,pass:result.pass,error:result.error?.split('\n')[0]}));await x.close();
}
}finally{await writeFile(path.join(reportDir,`public-${engine}.json`),JSON.stringify(results,null,2));await browser.close();}
assert(results.every(r=>r.pass),'some public checks failed');
