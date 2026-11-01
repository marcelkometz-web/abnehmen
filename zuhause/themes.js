/* The only persisted value is a public design identifier. App data and account
   information are never read by the shared home's theme chooser. */
(()=>{
 'use strict';
 const STORAGE_KEY='unser-zuhause:design-v1';
 const THEMES=Object.freeze({
  gartenruhe:Object.freeze({name:'Gartenruhe',description:'Salbeigrün, Creme und ein ruhiger Start.',color:'#f7f5ef'}),
  rosengarten:Object.freeze({name:'Rosengarten',description:'Rosé, warme Blüten und sanfte Farben.',color:'#fbf3f5'}),
  lavendelabend:Object.freeze({name:'Lavendelabend',description:'Flieder, helle Blautöne und kleine Sterne.',color:'#f4f1fb'}),
  abendlicht:Object.freeze({name:'Abendlicht',description:'Dunkle Beere, warmes Gold und weiches Licht.',color:'#211e22'})
 });
 const normalizeTheme=value=>typeof value==='string'&&Object.hasOwn(THEMES,value)?value:'gartenruhe';
 const readTheme=storage=>{try{return normalizeTheme(storage.getItem(STORAGE_KEY));}catch{return'gartenruhe';}};
 if(typeof module!=='undefined'&&module.exports&&typeof window==='undefined'){module.exports={STORAGE_KEY,THEMES,normalizeTheme,readTheme};return;}
 if(window.self!==window.top||!['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(location.pathname)||document.documentElement.dataset.appShell!=='unser-zuhause-v1')return;
 let selected='gartenruhe',dialog,trigger,status;
 function apply(value,{persist=true,announce=true}={}){
  if(!Object.hasOwn(THEMES,value))return false;
  selected=value;document.documentElement.dataset.theme=value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',THEMES[value].color);
  if(persist)try{window.localStorage.setItem(STORAGE_KEY,value);}catch{}
  for(const input of document.querySelectorAll('#home-theme-dialog input[name="home_theme"]')){const active=input.value===value;input.checked=active;input.closest('.home-theme-choice')?.setAttribute('data-selected',String(active));}
  if(status)status.textContent=announce?THEMES[value].name+' ist ausgewählt.':THEMES[value].name+' ist aktuell aktiv.';
  if(trigger)trigger.title='Design ändern · '+THEMES[value].name;
  return true;
 }
 try{selected=readTheme(window.localStorage);}catch{}
 apply(selected,{persist:false,announce:false});
 function close(){if(dialog?.open)dialog.close();}
 function open(){if(!dialog)return false;apply(selected,{persist:false,announce:false});if(!dialog.open){document.documentElement.classList.add('home-theme-open');try{dialog.showModal();}catch{document.documentElement.classList.remove('home-theme-open');return false;}}dialog.querySelector('input:checked')?.focus({preventScroll:true});return true;}
 function mount(){
  dialog=document.getElementById('home-theme-dialog');trigger=document.getElementById('choose-home-theme');status=document.getElementById('home-theme-status');if(!dialog||!trigger)return;
  trigger.addEventListener('click',open);document.getElementById('close-home-theme')?.addEventListener('click',close);
  dialog.addEventListener('change',event=>{const input=event.target;if(input?.matches('input[name="home_theme"]'))apply(input.value);});
  dialog.addEventListener('close',()=>document.documentElement.classList.remove('home-theme-open'));
  apply(selected,{persist:false,announce:false});
 }
 Object.defineProperty(window,'unserZuhauseThemes',{value:Object.freeze({open,close,current:()=>selected,set:value=>apply(value)}),writable:false,configurable:false});
 window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)apply(normalizeTheme(event.newValue),{persist:false});});
 window.addEventListener('pagehide',close);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
