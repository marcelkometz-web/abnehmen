import {chromium,firefox,webkit} from 'playwright';
import {readFile,stat,mkdtemp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const WORKSPACE=path.resolve(process.env.APP_AUDIT_WORKSPACE||fileURLToPath(new URL('../../../',import.meta.url)));
export const ORIGIN='https://marcelkometz-web.github.io';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
export async function launch(engine=process.env.AUDIT_ENGINE||'chromium'){
 const base={headless:true,timeout:25000};
 if(engine==='chromium')return chromium.launch({...base,...(process.env.APP_AUDIT_CHROMIUM_PATH?{executablePath:process.env.APP_AUDIT_CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 if(engine==='firefox'){
  const config=await mkdtemp(path.join(tmpdir(),'app-audit-firefox-'));const cache=path.join(config,'cache');await mkdir(cache);
  const implementation=process.env.APP_AUDIT_FIREFOX_MODULE?(await import(process.env.APP_AUDIT_FIREFOX_MODULE)).firefox:firefox;
  return implementation.launch({...base,env:{...process.env,XDG_CONFIG_HOME:config,XDG_CACHE_HOME:cache,MOZ_DISABLE_CONTENT_SANDBOX:'1',MOZ_DISABLE_RDD_SANDBOX:'1',MOZ_DISABLE_GMP_SANDBOX:'1'}});
 }
 return webkit.launch(base);
}
export async function fixture(browser,{viewport={width:390,height:844},route:custom,init,contextOptions={}}={}){
 const context=await browser.newContext({viewport,locale:'de-DE',timezoneId:'Europe/Berlin',serviceWorkers:'block',...contextOptions});
 const requests=[],missing=[],external=[],pageErrors=[],consoleErrors=[];
 await context.addInitScript(()=>{
  window.__audit={errors:[],rejections:[],csp:[]};
  window.addEventListener('error',e=>window.__audit.errors.push(e.message||String(e.error)));
  window.addEventListener('unhandledrejection',e=>window.__audit.rejections.push(String(e.reason?.message||e.reason)));
  document.addEventListener('securitypolicyviolation',e=>window.__audit.csp.push({directive:e.violatedDirective,url:e.blockedURI}));
 });
 if(init)await context.addInitScript(init);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());requests.push({url:req.url(),method:req.method()});
  if(url.protocol==='blob:'||url.protocol==='data:')return route.continue();
  if(custom&&await custom(route,url,req))return;
  if(url.origin===ORIGIN){
   let file=path.resolve(WORKSPACE,'.'+decodeURIComponent(url.pathname));
   if(!file.startsWith(WORKSPACE+path.sep))return route.abort();
   try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');const body=await readFile(file);await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body});}
   catch{missing.push(url.pathname);await route.fulfill({status:404,contentType:'text/plain',body:'Not found (local audit)'});}
   return;
  }
  external.push({url:req.url(),method:req.method()});
  if(url.pathname.includes('/auth/v1/')&&url.pathname.endsWith('/logout'))return route.fulfill({status:204});
  if(url.pathname.includes('/auth/v1/'))return route.fulfill({status:401,json:{error:'invalid_credentials',message:'Synthetic unsigned audit'}});
  if(url.pathname.includes('/rest/v1/')||url.pathname.includes('/functions/v1/'))return route.fulfill({status:403,json:{message:'Synthetic unauthenticated audit',code:'42501'}});
  await route.abort('blockedbyclient');
 });
 const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
 return{browser,context,page,requests,missing,external,pageErrors,consoleErrors,close:()=>context.close()};
}
export async function geometry(page){return page.evaluate(()=>{
 const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';};
 const elements=[...document.body.querySelectorAll('*')].filter(visible);
 return{width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,mainHeight:document.querySelector('main')?.getBoundingClientRect().height,overflow:elements.filter(el=>{const r=el.getBoundingClientRect();return r.left<-2||r.right>innerWidth+2;}).slice(0,30).map(el=>({tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:el.textContent?.trim().slice(0,80),rect:el.getBoundingClientRect().toJSON()})),images:[...document.images].filter(visible).map(el=>({src:el.getAttribute('src'),complete:el.complete,width:el.naturalWidth})),audit:window.__audit};
 });}
