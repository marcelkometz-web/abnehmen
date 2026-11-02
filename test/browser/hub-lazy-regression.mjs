import assert from 'node:assert/strict';
import {launch,fixture,ORIGIN} from './browser-helper.mjs';
const browser=await launch();
try {
 for(const scenario of ['app-switch','other-dialog','normal']) {
  let release,requested;
  const gate=new Promise(r=>release=r),started=new Promise(r=>requested=r);
  const f=await fixture(browser,{route:async(route,url)=>{
   if(url.pathname.endsWith('/hub-backup.js')) {requested();await gate;await route.fulfill({status:200,contentType:'text/javascript',body:'window.unserZuhauseBackup={open:async()=>{window.__backupOpens=(window.__backupOpens||0)+1;}};'});return true;}return false;
  }});
  await f.page.goto(ORIGIN+'/abnehmen/zuhause/');
  await f.page.locator('[data-open-hub-backup]').click();await started;
  if(scenario==='app-switch')await f.page.locator('.shell-nav [data-open="garten"]').click();
  if(scenario==='other-dialog')await f.page.locator('#choose-home-theme').click();
  release();await f.page.locator('[data-open-hub-backup]').evaluate(async el=>{while(el.disabled)await new Promise(r=>setTimeout(r,10));});
  const opens=await f.page.evaluate(()=>window.__backupOpens||0);
  console.log(JSON.stringify({scenario,opens,expected:scenario==='normal'?1:0,errors:f.pageErrors}));
  assert.equal(opens,scenario==='normal'?1:0);
  await f.close();
 }
} finally {await browser.close();}
