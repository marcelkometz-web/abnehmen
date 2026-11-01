import {renderHelpDocument} from './help-view.mjs';
function bootHome(){
const byId=id=>document.getElementById(id);
const steps={
 apple:['Öffne diese Startseite in Safari.','Tippe auf „Teilen“ und dann auf „Zum Home-Bildschirm“. Der Eintrag kann unter „Mehr“ stehen.','Falls angeboten, „Als Web-App öffnen“ einschalten. Mit „Hinzufügen“ bestätigen.'],
 android:['Öffne diese Startseite in Chrome, Edge oder Samsung Internet.','Wähle im Browsermenü „App installieren“ oder „Zum Startbildschirm hinzufügen“.','Bestätige das Hinzufügen. Das Zuhause-Symbol öffnet anschließend eure gemeinsame Startseite.'],
 desktop:['Öffne diese Startseite in einem aktuellen Browser.','In Chrome oder Edge das Installationssymbol in der Adressleiste oder den App-Eintrag im Browsermenü wählen.','Auf dem Mac kannst du in Safari auch „Ablage → Zum Dock hinzufügen“ verwenden.']
};
let installPrompt=null,scrollPosition=0;
const dialog=byId('install-dialog'),installButton=byId('install-app'),nativeButton=byId('native-install');
const infoDialog=byId('info-dialog'),infoContent=byId('info-content');
const documents={general:{title:'Unser Zuhause · Allgemeine Hilfe',path:'./read.txt'},garden:{title:'Bedienhilfe · Garten',path:'/garten/read.txt'},recipes:{title:'Bedienhilfe · Rezepte',path:'/rezepte/Read.txt'},progress:{title:'Bedienhilfe · Ramonas Weg',path:'/abnehmen/read.txt'},legal:{title:'Impressum & Datenschutz',path:'./impressum.txt'}};
let documentRequest=0;
function lockDialog(){scrollPosition=window.scrollY;document.body.style.top=-scrollPosition+'px';document.documentElement.classList.add('dialog-open');}
function unlockDialog(){if(document.querySelector('dialog[open]'))return;document.documentElement.classList.remove('dialog-open');document.body.style.removeProperty('top');window.scrollTo({top:scrollPosition,behavior:'instant'});}
async function openInfo(key){
 if(!Object.hasOwn(documents,key))return;
 if(dialog.open)dialog.close();
 const request=++documentRequest,doc=documents[key];
 byId('info-title').textContent=doc.title;byId('info-download').href=doc.path;
 for(const button of infoDialog.querySelectorAll('[data-info]'))button.setAttribute('aria-pressed',String(button.dataset.info===key));
 infoContent.textContent='Die Hilfe wird geladen …';infoContent.setAttribute('aria-busy','true');
 if(!infoDialog.open){lockDialog();infoDialog.showModal();}
 try{
  const response=await fetch(doc.path,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('load');const content=await response.text();if(request!==documentRequest)return;
  renderHelpDocument(infoContent,content,key);
  infoContent.scrollTop=0;
 }catch{if(request===documentRequest)infoContent.textContent='Die Hilfe konnte gerade nicht geladen werden. Bitte prüfe die Internetverbindung und öffne das Thema erneut. Über „Text herunterladen“ ist die Datei auch direkt erreichbar.';}
 finally{if(request===documentRequest)infoContent.removeAttribute('aria-busy');}
}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-info]');if(button){event.preventDefault();openInfo(button.dataset.info);}});
byId('close-info').addEventListener('click',()=>infoDialog.close());
infoDialog.addEventListener('close',()=>{documentRequest++;unlockDialog();});
function updateDate(){
 const now=new Date(),hour=now.getHours();
 byId('greeting').textContent=hour<5?'Dein ruhiger Moment.':hour<11?'Guten Morgen.':hour<18?'Schön, dass du da bist.':'Ein schöner Abend für dich.';
 byId('today').textContent=new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long'}).format(now);
}
function updateInstalled(){
 const installed=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
 installButton.hidden=installed;byId('installed-label').hidden=!installed;
}
function openInstall(){
 const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||/Mac/.test(navigator.platform)&&navigator.maxTouchPoints>1;
 const platform=apple?'apple':/Android/.test(navigator.userAgent)?'android':'desktop';
 const list=byId('install-steps');list.replaceChildren();
 for(const instruction of steps[platform]){const item=document.createElement('li');item.textContent=instruction;list.append(item);}
 byId('install-hint').textContent='Die erste Anmeldung in der installierten App kann erneut nötig sein. Danach wechselst du innerhalb dieses App-Fensters zwischen euren drei Bereichen.';
 byId('install-status').textContent='';nativeButton.hidden=!installPrompt;
 if(infoDialog.open)infoDialog.close();lockDialog();dialog.showModal();
}
installButton.addEventListener('click',openInstall);
byId('close-install').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',unlockDialog);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;nativeButton.hidden=false;});
window.addEventListener('appinstalled',()=>{installPrompt=null;nativeButton.hidden=true;byId('install-status').textContent='Hinzugefügt. Du kannst euer Zuhause jetzt über das neue Symbol öffnen.';updateInstalled();});
nativeButton.addEventListener('click',async()=>{
 if(!installPrompt)return;const prompt=installPrompt;installPrompt=null;nativeButton.disabled=true;
 try{await prompt.prompt();const choice=await prompt.userChoice;byId('install-status').textContent=choice.outcome==='accepted'?'Das Hinzufügen wurde bestätigt.':'Du kannst die Startseite jederzeit später hinzufügen.';}
 catch{byId('install-status').textContent='Nutze bitte die oben beschriebene Funktion in deinem Browsermenü.';}
 finally{nativeButton.disabled=false;nativeButton.hidden=true;}
});
matchMedia('(display-mode: standalone)').addEventListener('change',updateInstalled);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateDate();updateInstalled();}});
window.addEventListener('pageshow',()=>{updateDate();updateInstalled();});
let viewportFrame;
function updateViewport(){
 cancelAnimationFrame(viewportFrame);viewportFrame=requestAnimationFrame(()=>{
  const height=window.visualViewport?.height||innerHeight;
  document.documentElement.style.setProperty('--app-viewport',height+'px');
  document.documentElement.classList.toggle('keyboard-open',height<innerHeight*.75&&document.activeElement?.tagName==='IFRAME');
 });
}
window.visualViewport?.addEventListener('resize',updateViewport);window.addEventListener('resize',updateViewport);updateViewport();
updateDate();updateInstalled();

// One outer app, with exactly three allowlisted first-party areas. Keeping each
// visited frame mounted preserves unfinished forms when changing areas.
const areas={garten:{path:'/garten/',title:'Garten'},rezepte:{path:'/rezepte/',title:'Rezepte'},abnehmen:{path:'/abnehmen/',title:'Ramonas Weg'}};
const frames=new Map();let activeArea='home',pendingArea=null,navigationTimer;
function openArea(key,{historyEntry=true}={}){
 if(key!=='home'&&!Object.hasOwn(areas,key))key='home';
 if(activeArea!=='home'&&key!==activeArea){
  let saving=false;try{saving=Boolean(frames.get(activeArea)?.contentDocument?.querySelector('form[data-busy],form[aria-busy="true"],button[aria-busy="true"]'));}catch{}
   if(saving){pendingArea=key;byId('navigation-status').textContent='Einen Moment, der laufende Vorgang wird noch abgeschlossen.';byId('navigation-status').hidden=false;clearTimeout(navigationTimer);navigationTimer=setTimeout(()=>openArea(pendingArea),180);return false;}
 }
 pendingArea=null;clearTimeout(navigationTimer);byId('navigation-status').hidden=true;activeArea=key;
 const home=key==='home';document.body.classList.toggle('app-open',!home);byId('frame-region').hidden=home;byId('shell-title').hidden=home;byId('shell-title').textContent=home?'':areas[key].title;
 document.title=home?'Unser Zuhause · Eure Apps':areas[key].title+' · Unser Zuhause';
 for(const link of document.querySelectorAll('.shell-nav [data-open]')){if(link.dataset.open===key)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 for(const [id,frame]of frames){frame.hidden=id!==key;frame.inert=id!==key;frame.setAttribute('aria-hidden',String(id!==key));frame.dataset.homeActive=String(id===key);frame.contentWindow?.postMessage({type:'UNSER_ZUHAUSE_VISIBILITY',active:id===key},location.origin);}
 byId('frame-loading').hidden=true;
 if(!home){
  let frame=frames.get(key);
  if(!frame){
   frame=document.createElement('iframe');frame.className='app-frame';frame.title=areas[key].title;frame.name='unser-zuhause-'+key;frame.dataset.homeActive='true';frame.referrerPolicy='no-referrer';frame.allow='camera; microphone; clipboard-write; web-share';
   frame.src=areas[key].path+'?zuhause=1&v=20261031';
   frame.addEventListener('load',()=>{frame.dataset.loaded='true';frame.contentWindow.postMessage({type:'UNSER_ZUHAUSE_VISIBILITY',active:activeArea===key},location.origin);if(activeArea===key)byId('frame-loading').hidden=true;});
   frames.set(key,frame);byId('frame-host').append(frame);
  }
  frame.hidden=false;frame.inert=false;frame.setAttribute('aria-hidden','false');byId('frame-loading').hidden=frame.dataset.loaded==='true';
 }
 if(historyEntry&&location.hash!=='#'+key)history.pushState(null,'','#'+key);
 if(home)window.scrollTo({top:0,behavior:'instant'});
 window.appNavigation?.area(key);
 return true;
}
document.addEventListener('click',event=>{const link=event.target.closest?.('[data-open]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();openArea(link.dataset.open);});
window.addEventListener('popstate',()=>openArea(location.hash.slice(1)||'home',{historyEntry:false}));
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||!['UNSER_ZUHAUSE_OPEN','UNSER_ZUHAUSE_INFO'].includes(event.data?.type)||!frames.size)return;
 if(![...frames.values()].some(frame=>frame.contentWindow===event.source))return;
 if(event.data.type==='UNSER_ZUHAUSE_INFO'){if(Object.hasOwn(documents,event.data.document))openInfo(event.data.document);return;}
 const key=event.data.app;if(key==='home'||Object.hasOwn(areas,key))openArea(key);
});
window.appNavigation?.register({app:'hub',navigate:async route=>{
 // A floating history jump must wait for active saves and app dialogs.
 let blocked=false;try{blocked=Boolean(frames.get(activeArea)?.contentDocument?.querySelector('form[data-busy],dialog[open]:not([data-app-navigation-dialog])'));}catch{}
 if(blocked||infoDialog.open||dialog.open)return false;
 if(!openArea(route.app))return false;
 return route.app==='home'?true:await window.appNavigation.requestPage(route.app,route.page);
}});
openArea(location.hash.slice(1)||'home',{historyEntry:false});

}
if(window.self===window.top)bootHome();else{const p=document.createElement('p');p.textContent='Bitte öffne die gemeinsame Startseite direkt.';const a=document.createElement('a');a.href=location.origin+'/abnehmen/zuhause/';a.target='_top';a.textContent='Unser Zuhause öffnen';document.body.replaceChildren(p,a);}
