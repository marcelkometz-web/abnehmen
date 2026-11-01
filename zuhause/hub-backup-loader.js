// The SDK/crypto bundle is needed only when the user opens backup/recovery.
(()=>{
 if(self!==top||!['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(location.pathname)||document.documentElement.dataset.appShell!=='unser-zuhause-v1')return;
 let pending=null,attempt=0,epoch=0,status;
 const source=new URL('./hub-backup.js',document.currentScript.src);
 document.addEventListener('click',async event=>{
  const trigger=event.target.closest?.('[data-open-hub-backup]');
  if(!trigger||event.defaultPrevented||window.unserZuhauseBackup)return;
  event.preventDefault();if(pending)return;
  if(!status){status=document.createElement('p');status.className='hub-backup-load-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');(trigger.closest('.home-tools')||trigger).after(status);}
  const turn=epoch;status.hidden=false;status.textContent='Sicherung wird geöffnet …';trigger.disabled=true;trigger.setAttribute('aria-busy','true');
  source.search='?v=20261101&load='+ ++attempt;
  try{pending=import(source.href);await pending;if(turn===epoch&&!document.hidden&&!document.getElementById('main')?.hidden)await window.unserZuhauseBackup.open();status.hidden=true;}
  catch{if(turn===epoch){status.hidden=false;status.textContent='Die Sicherung konnte gerade nicht geladen werden. Bitte die Verbindung prüfen und erneut auf die Schaltfläche tippen.';}}
  finally{pending=null;trigger.disabled=false;trigger.removeAttribute('aria-busy');}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)epoch++;});window.addEventListener('pagehide',()=>epoch++);
})();
