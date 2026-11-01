/* Shared in-memory navigation. Route identifiers and labels are public enums;
   no form values, account identifiers, content titles or URLs enter this log. */
(()=>{
 'use strict';
 const ROUTES={
  home:{home:'Unser Zuhause'},
  garten:{overview:'Garten · Startseite',plants:'Garten · Pflanzen',beds:'Garten · Beete',notes:'Garten · Gartenleben',settings:'Garten · Familie & Konto'},
  rezepte:{overview:'Rezepte · Startseite',daily:'Rezepte · Heute',plants:'Rezepte · Favoriten',beds:'Rezepte · Einkauf',notes:'Rezepte · Forum',settings:'Rezepte · Konto'},
  abnehmen:{checkin:'Ramonas Weg · Check-in',progress:'Ramonas Weg · Auswertung',calendar:'Ramonas Weg · Kalender',gallery:'Ramonas Weg · Galerie',training:'Ramonas Weg · Training',nutrition:'Ramonas Weg · Essen & Rezepte',profile:'Ramonas Weg · Profil & Zyklus'}
 };
 const DEFAULTS={home:'home',garten:'overview',rezepte:'overview',abnehmen:'checkin'};
 const same=(a,b)=>Boolean(a&&b&&a.app===b.app&&a.page===b.page);
 const canonical=value=>value&&typeof value.app==='string'&&typeof value.page==='string'&&Object.hasOwn(ROUTES,value.app)&&Object.hasOwn(ROUTES[value.app],value.page)?{app:value.app,page:value.page}:null;
 function createHistory(limit=80){
  let entries=[],cursor=-1;
  return{
   visit(value){const route=canonical(value);if(!route||same(entries[cursor],route))return false;entries=entries.slice(0,cursor+1);entries.push(route);if(entries.length>limit)entries.splice(0,entries.length-limit);cursor=entries.length-1;return true;},
   reset(value){const route=canonical(value);entries=route?[route]:[];cursor=entries.length-1;},
   move(index){if(!Number.isInteger(index)||index<0||index>=entries.length)return false;cursor=index;return true;},
   get(index){return entries[index]?{...entries[index]}:null;},
   current(){return entries[cursor]?{...entries[cursor]}:null;},
   snapshot(){return{cursor,entries:entries.map(route=>({...route}))};}
  };
 }
 function frameApp(event,frames,origin){
  if(event.origin!==origin||!event.source)return null;
  for(const frame of frames){const app=frame.name?.replace(/^unser-zuhause-/,'');if(frame.name==='unser-zuhause-'+app&&Object.hasOwn(DEFAULTS,app)&&app!=='home'&&frame.contentWindow===event.source)return app;}
  return null;
 }
 if(typeof module!=='undefined'&&module.exports&&typeof window==='undefined'){module.exports={createHistory,canonical,frameApp};return;}
 const origin=location.origin,hubPaths=['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'];
 const hub=window.self===window.top&&hubPaths.includes(location.pathname)&&document.documentElement.dataset.appShell==='unser-zuhause-v1';
 let framed=false;
 try{framed=window.unserZuhauseFrame===true&&window.parent===window.top&&window.parent.location.origin===origin&&hubPaths.includes(window.parent.location.pathname)&&window.parent.document.documentElement.dataset.appShell==='unser-zuhause-v1';}catch{}
 if(window.self!==window.top&&!framed)return;
 const ownApp=hub?'home':['garten','rezepte','abnehmen'].find(app=>location.pathname.startsWith('/'+app+'/'));
 if(!ownApp)return;
 const timeline=createHistory(),frameStates=new Map(),frameEverReady=new Set(),pendingRequests=new Map(),queuedCommands=new Map(),completedCommands=new Map();
 let adapter=null,activeApp=ownApp,ownState={app:ownApp,page:DEFAULTS[ownApp],ready:hub,busy:false,dialog:false},hasBeenReady=hub;
 let requestCounter=0,processingCommand=false,activeCommand=null,replaying=false,replayTarget=null,toolbar,backButton,homeButton,forwardButton,historyButton,historyDialog,historyList,status,observerFrame,localDialog=false,localBusy=false,lastSent='';
 timeline.reset({app:ownApp,page:DEFAULTS[ownApp]});
 const frameFor=app=>[...document.querySelectorAll('#frame-host iframe')].find(frame=>frame.name==='unser-zuhause-'+app);
 const currentRoute=()=>hub?(activeApp==='home'?{app:'home',page:'home'}:{app:activeApp,page:frameStates.get(activeApp)?.page||DEFAULTS[activeApp]}):{app:ownApp,page:ownState.page};
 const activeState=()=>hub&&activeApp!=='home'?(frameStates.get(activeApp)||{ready:false,busy:false,dialog:false}):ownState;
 const blocked=()=>replaying||localBusy||activeState().busy;
 function announce(message){if(status){status.textContent=message;status.hidden=!message;}}
 function postState(force=false){
  if(!framed)return;
  const state={type:'APP_NAV_STATE',app:ownApp,page:ownState.page,ready:ownState.ready,busy:ownState.busy||localBusy,dialog:localDialog};
  const key=JSON.stringify(state);if(force||key!==lastSent){lastSent=key;window.parent.postMessage(state,origin);}
 }
 function recordCurrent(){if(!replaying){const route=currentRoute();if(route&&(!hub?ownState.ready:true))timeline.visit(route);}render();}
 function settleRequest(id,ok){const pending=pendingRequests.get(id);if(!pending)return;clearTimeout(pending.timeout);clearTimeout(pending.retry);pendingRequests.delete(id);pending.resolve(ok===true);}
 function cancelRequests(){for(const[id,pending]of pendingRequests){frameFor(pending.app)?.contentWindow?.postMessage({type:'APP_NAV_CANCEL',app:pending.app,requestId:id},origin);settleRequest(id,false);}}
 function sendCommandResult(id,ok){
  completedCommands.set(id,ok===true);if(completedCommands.size>32)completedCommands.delete(completedCommands.keys().next().value);
  postState(true);window.parent.postMessage({type:'APP_NAV_RESULT',app:ownApp,requestId:id,ok:ok===true},origin);
 }
 async function processCommands(){
  if(!framed||processingCommand||!adapter||!ownState.ready||ownState.busy||localBusy||localDialog)return;
  const item=queuedCommands.entries().next();if(item.done)return;
  const[id,command]=item.value;queuedCommands.delete(id);clearTimeout(command.timeout);processingCommand=true;
  const controller=new AbortController();activeCommand={id,controller};
  let ok=false;
  try{const result=await adapter.navigate(command.route,{signal:controller.signal});ok=!controller.signal.aborted&&result!==false&&ownState.ready&&ownState.page===command.route.page;}catch{}
  finally{activeCommand=null;processingCommand=false;sendCommandResult(id,ok);processCommands();}
 }
 function requestPage(app,page){
  const route=canonical({app,page});if(!hub||!route||app==='home')return Promise.resolve(false);
  const known=frameStates.get(app);
  // Revealing a retained page does not need to re-run its form navigation.
  // The default route also represents the public login view before readiness.
  if(frameFor(app)&&((known?.page===page&&(known.ready||page===DEFAULTS[app]))||(!known&&page===DEFAULTS[app])))return Promise.resolve(true);
  return new Promise(resolve=>{
   const id=++requestCounter;
   const pending={app,resolve,timeout:setTimeout(()=>{frameFor(app)?.contentWindow?.postMessage({type:'APP_NAV_CANCEL',app,requestId:id},origin);settleRequest(id,false);},15000),retry:null};pendingRequests.set(id,pending);
   const send=()=>{if(!pendingRequests.has(id))return;const frame=frameFor(app);if(frame?.dataset.loaded==='true'){frame.contentWindow.postMessage({type:'APP_NAV_COMMAND',app,page,requestId:id},origin);}else pending.retry=setTimeout(send,100);};send();
  });
 }
 async function navigate(route,index=null){
  route=canonical(route);if(!route||!adapter||blocked()||localDialog||activeState().dialog)return false;
  if(same(currentRoute(),route)){
   if(index!==null)timeline.move(index);else timeline.visit(route);render();return true;
  }
  replaying=true;replayTarget=route;announce('');render();let ok=false;
  try{const result=await adapter.navigate(route);ok=result!==false&&same(currentRoute(),route);}
  catch{}
  finally{
   replaying=false;replayTarget=null;
   if(ok){if(index!==null)timeline.move(index);else timeline.visit(route);}
   else{timeline.visit(currentRoute());announce('Die Seite konnte gerade nicht geöffnet werden. Bitte beende eine laufende Eingabe oder Speicherung und versuche es erneut.');}
   render();
  }
  return ok;
 }
 function reset(){
  activeCommand?.controller.abort();
  const wasReady=hasBeenReady;hasBeenReady=false;ownState={app:ownApp,page:DEFAULTS[ownApp],ready:hub,busy:false,dialog:localDialog};
  for(const[id,command]of queuedCommands){clearTimeout(command.timeout);sendCommandResult(id,false);}queuedCommands.clear();
  cancelRequests();
  if(framed){if(wasReady)window.parent.postMessage({type:'APP_NAV_RESET',app:ownApp},origin);postState(true);}
  else{timeline.reset(hub?currentRoute():{app:ownApp,page:DEFAULTS[ownApp]});announce('');render();}
 }
 function report(value={}){
  scheduleDOMState();
  const page=canonical({app:ownApp,page:value.page});if(page)ownState.page=page.page;
  if(typeof value.ready==='boolean')ownState.ready=value.ready;
  if(typeof value.busy==='boolean')ownState.busy=value.busy;
  if(ownState.ready)hasBeenReady=true;
  if(framed){postState();processCommands();}
  else recordCurrent();
 }
 const api=Object.freeze({
  register(value){if(!value||typeof value.navigate!=='function'||(hub?value.app!=='hub':value.app!==ownApp))return false;adapter={navigate:value.navigate};if(framed){postState(true);processCommands();}render();return true;},
  report,reset,
  area(app){if(!hub||!Object.hasOwn(DEFAULTS,app))return false;activeApp=app;if(replayTarget&&replayTarget.app!==app)cancelRequests();recordCurrent();return true;},
  requestPage
 });
 Object.defineProperty(window,'appNavigation',{value:api,writable:false,configurable:false});
 window.addEventListener('message',event=>{
  const data=event.data;if(!data||typeof data!=='object')return;
  if(framed){
   if(event.source!==window.parent||event.origin!==origin||data.app!==ownApp||!Number.isSafeInteger(data.requestId)||data.requestId<=0)return;
   if(data.type==='APP_NAV_CANCEL'){const command=queuedCommands.get(data.requestId);if(command){clearTimeout(command.timeout);queuedCommands.delete(data.requestId);}if(activeCommand?.id===data.requestId)activeCommand.controller.abort();return;}
   if(data.type!=='APP_NAV_COMMAND')return;const route=canonical({app:ownApp,page:data.page});if(!route)return;
   if(completedCommands.has(data.requestId)){sendCommandResult(data.requestId,completedCommands.get(data.requestId));return;}
   if(queuedCommands.has(data.requestId)||processingCommand)return;
   if(queuedCommands.size>=8)return;
   queuedCommands.set(data.requestId,{route,timeout:setTimeout(()=>{if(queuedCommands.delete(data.requestId))sendCommandResult(data.requestId,false);},15000)});processCommands();return;
  }
  if(!hub)return;
  const app=frameApp(event,[...document.querySelectorAll('#frame-host iframe')],origin);if(!app||data.app!==app)return;
  if(data.type==='APP_NAV_STATE'){
   const route=canonical({app,page:data.page});if(!route||typeof data.ready!=='boolean'||typeof data.busy!=='boolean'||typeof data.dialog!=='boolean')return;
   frameStates.set(app,{page:route.page,ready:data.ready,busy:data.busy,dialog:data.dialog});if(data.ready)frameEverReady.add(app);if(activeApp===app)recordCurrent();else render();return;
  }
  if(data.type==='APP_NAV_RESULT'){
   const pending=pendingRequests.get(data.requestId);if(pending?.app===app&&typeof data.ok==='boolean')settleRequest(data.requestId,data.ok);return;
  }
  if(data.type==='APP_NAV_RESET'){
   if(!frameEverReady.has(app))return;frameEverReady.delete(app);
   frameStates.set(app,{page:DEFAULTS[app],ready:false,busy:false,dialog:false});cancelRequests();timeline.reset(currentRoute());if(historyDialog?.open)historyDialog.close();announce('');render();
  }
 });
 function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
 function makeButton(id,icon,label){const button=element('button',undefined,'app-nav-button');button.id=id;button.type='button';button.title=label;button.setAttribute('aria-label',label);const glyph=element('span',icon,'app-nav-icon');glyph.setAttribute('aria-hidden','true');button.append(glyph,element('span',label,'app-nav-label'));return button;}
 function openHistory(){
  if(blocked()||localDialog||activeState().dialog)return;
  historyList.replaceChildren();const snapshot=timeline.snapshot();
  for(let index=snapshot.entries.length-1;index>=0;index--){const route=snapshot.entries[index],button=element('button',undefined,'app-nav-entry');button.type='button';button.dataset.navigationIndex=String(index);button.disabled=index===snapshot.cursor;button.setAttribute('aria-current',index===snapshot.cursor?'page':'false');button.append(element('span',ROUTES[route.app][route.page]),element('small',index===snapshot.cursor?'Aktuelle Seite':index<snapshot.cursor?(snapshot.cursor-index)+' zurück':(index-snapshot.cursor)+' vor'));button.addEventListener('click',()=>{historyDialog.close();navigate(route,index);});historyList.append(button);}
  document.documentElement.classList.add('navigation-history-open');historyDialog.showModal();render();
 }
 function render(){
  if(!toolbar)return;const snapshot=timeline.snapshot(),busy=blocked();
  const keyboard=document.documentElement.classList.contains('navigation-keyboard');
  toolbar.hidden=Boolean(localDialog||activeState().dialog||historyDialog?.open||keyboard);
  backButton.disabled=busy||snapshot.cursor<=0;forwardButton.disabled=busy||snapshot.cursor<0||snapshot.cursor>=snapshot.entries.length-1;
  const home={app:hub?'home':ownApp,page:DEFAULTS[hub?'home':ownApp]};homeButton.disabled=busy||same(currentRoute(),home);historyButton.disabled=busy||snapshot.entries.length<2;
  backButton.title=snapshot.cursor>0?'Zurück zu '+ROUTES[snapshot.entries[snapshot.cursor-1].app][snapshot.entries[snapshot.cursor-1].page]:'Keine vorherige App-Seite';
  forwardButton.title=snapshot.cursor>=0&&snapshot.cursor<snapshot.entries.length-1?'Vorwärts zu '+ROUTES[snapshot.entries[snapshot.cursor+1].app][snapshot.entries[snapshot.cursor+1].page]:'Keine nächste App-Seite';
 }
 function updateDOMState(){
  observerFrame=null;
  if(!hub&&!framed){
   const sidebar=document.querySelector('.sidebar'),rect=sidebar?.getBoundingClientRect();
   const dock=rect&&getComputedStyle(sidebar).position==='fixed'&&rect.width>innerWidth*.7&&rect.height<innerHeight*.5&&Math.abs(rect.bottom-innerHeight)<4?rect.height:0;
   document.documentElement.style.setProperty('--app-navigation-dock',dock+'px');
   document.documentElement.classList.toggle('navigation-has-bottom-menu',dock>0);
  }
  localDialog=Boolean(document.querySelector('dialog[open]:not([data-app-navigation-dialog])'));
  localBusy=Boolean(document.querySelector('form[data-busy],form[aria-busy="true"]'));
  const active=document.activeElement,editable=active?.matches?.('input,textarea,select,[contenteditable="true"]')||hub&&active?.tagName==='IFRAME';
  const keyboard=Boolean(editable&&window.visualViewport&&window.visualViewport.height<innerHeight*.75);
  document.documentElement.classList.toggle('navigation-keyboard',keyboard);
  if(framed){postState();processCommands();}render();
 }
 const scheduleDOMState=()=>{if(!observerFrame)observerFrame=requestAnimationFrame(updateDOMState);};
 function mount(){
  if(!framed){
   document.documentElement.classList.add('has-floating-navigation');document.documentElement.dataset.navigationHost=hub?'hub':'standalone';
   toolbar=element('nav',undefined,'app-floating-navigation');toolbar.id='app-floating-navigation';toolbar.setAttribute('aria-label','Schnelle Seitennavigation');
   backButton=makeButton('app-nav-back','←','Zurück');homeButton=makeButton('app-nav-home','⌂','Start');forwardButton=makeButton('app-nav-forward','→','Vorwärts');historyButton=makeButton('app-nav-history','☷','Verlauf');
   homeButton.setAttribute('aria-label',hub?'Gemeinsame Startseite öffnen':'Startseite dieser App öffnen');historyButton.setAttribute('aria-label','Seitenverlauf öffnen und mehrere Seiten überspringen');
   backButton.addEventListener('click',()=>{const snapshot=timeline.snapshot(),index=snapshot.cursor-1;navigate(timeline.get(index),index);});forwardButton.addEventListener('click',()=>{const snapshot=timeline.snapshot(),index=snapshot.cursor+1;navigate(timeline.get(index),index);});
   homeButton.addEventListener('click',()=>navigate({app:hub?'home':ownApp,page:DEFAULTS[hub?'home':ownApp]}));historyButton.addEventListener('click',openHistory);toolbar.append(backButton,homeButton,forwardButton,historyButton);
   status=element('p',undefined,'app-navigation-status');status.id='app-navigation-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;
   historyDialog=element('dialog',undefined,'app-navigation-history');historyDialog.id='app-navigation-history';historyDialog.dataset.appNavigationDialog='true';historyDialog.setAttribute('aria-labelledby','app-nav-history-title');
   const header=element('div',undefined,'app-nav-history-header'),title=element('h2','Deine besuchten Seiten');title.id='app-nav-history-title';const close=element('button','Schließen','app-nav-close');close.id='app-nav-close-history';close.type='button';close.addEventListener('click',()=>historyDialog.close());header.append(title,close);
   historyList=element('div',undefined,'app-nav-history-list');historyDialog.append(header,element('p','Wähle eine Seite, um mehrere Schritte zurück oder wieder vor zu springen.','app-nav-history-hint'),historyList);historyDialog.addEventListener('close',()=>{document.documentElement.classList.remove('navigation-history-open');render();});
   document.body.append(toolbar,status,historyDialog);render();
  }
  new MutationObserver(scheduleDOMState).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','data-busy','aria-busy']});
  document.addEventListener('focusin',scheduleDOMState);document.addEventListener('focusout',scheduleDOMState);window.visualViewport?.addEventListener('resize',scheduleDOMState);window.addEventListener('resize',scheduleDOMState);updateDOMState();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('pagehide',()=>{if(historyDialog?.open)historyDialog.close();});
})();
