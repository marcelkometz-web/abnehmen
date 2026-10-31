// A first-party app may be embedded only by the top-level shared home on this
// exact origin. Nested and foreign frames remain blocked by each app's guard.
(()=>{
 let trusted=false;
 try{trusted=window.self!==window.top&&window.parent===window.top&&window.parent.location.origin===window.location.origin&&['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(window.parent.location.pathname)&&window.parent.document.documentElement.dataset.appShell==='unser-zuhause-v1';}catch{}
 Object.defineProperty(window,'unserZuhauseFrame',{value:trusted,writable:false,configurable:false});
 if(!trusted)return;
 document.documentElement.dataset.homeFrame='true';
 let active=window.frameElement?.dataset.homeActive!=='false';
 Object.defineProperty(window,'unserZuhauseHidden',{get:()=>!active,configurable:false});
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='UNSER_ZUHAUSE_VISIBILITY'||typeof event.data.active!=='boolean')return;
  if(active===event.data.active)return;active=event.data.active;
  document.dispatchEvent(new Event('visibilitychange'));
 });
 let resizeFrame;
 window.addEventListener('resize',()=>{
  cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
   const field=document.activeElement;
   if(active&&field?.matches('input,textarea,select'))field.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  });
 });
 const destinations={'/garten/':'garten','/rezepte/':'rezepte','/abnehmen/':'abnehmen','/abnehmen/zuhause/':'home'};
 const documents={'/garten/read.html':'garden','/garten/read.txt':'garden','/rezepte/read.html':'recipes','/rezepte/Read.txt':'recipes','/abnehmen/read.html':'progress','/abnehmen/read.txt':'progress','/abnehmen/zuhause/read.html':'general','/abnehmen/zuhause/read.txt':'general','/garten/impressum.html':'legal','/rezepte/impressum.html':'legal','/abnehmen/impressum.html':'legal','/abnehmen/zuhause/impressum.html':'legal'};
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download'))return;
  let url;try{url=new URL(anchor.href,location.href);}catch{return;}
  if(url.origin!==location.origin||url.search||url.hash)return;
  if(Object.hasOwn(documents,url.pathname)){event.preventDefault();window.parent.postMessage({type:'UNSER_ZUHAUSE_INFO',document:documents[url.pathname]},location.origin);return;}
  if(!Object.hasOwn(destinations,url.pathname))return;
  event.preventDefault();window.parent.postMessage({type:'UNSER_ZUHAUSE_OPEN',app:destinations[url.pathname]},location.origin);
 },true);
})();
