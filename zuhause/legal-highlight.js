// Public help/legal controls only. No app contents or account state are stored.
(()=>{
 const paths=['/garten/','/rezepte/','/abnehmen/'];
 if(!paths.some(path=>location.pathname.startsWith(path)))return;
 const help=/^(?:Bedienhilfe|READ(?:\s*\/\s*Hilfe)?|read\.txt|Hilfe(?:\s*&\s*Impressum)?|Datenschutz\s*&\s*Hilfe)$/i;
 function enhance(){
  for(const item of document.querySelectorAll('a[href],button[data-info],button.text-button,button.button.secondary,.platform-help-button')){
   if(item.dataset.neonLegal)continue;
   const label=item.textContent.trim().replace(/\s+/g,' '),href=item.getAttribute('href')||'',info=item.dataset.info;
   let type=info==='legal'||/^(?:Impressum(?:\s*&\s*Datenschutz)?)$/i.test(label)||/(?:^|\/)impressum\.(?:html|txt)(?:[?#]|$)/.test(href)?'legal':info==='general'||help.test(label)||/(?:^|\/)read\.(?:html|txt)(?:[?#]|$)/.test(href)?'read':null;
   if(!type)continue;
   item.dataset.neonLegal=type;item.classList.add('legal-neon');
   if(item.classList.contains('info-button')||item.classList.contains('platform-help-button'))item.classList.add('legal-neon-compact');
  }
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};
 enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();
