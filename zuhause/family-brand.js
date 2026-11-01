// First-party app marks. No account contents, external requests or tracking.
(()=>{
 const path=location.pathname;
 const file=path.startsWith('/garten/')?'/garten/icon.svg':path.startsWith('/rezepte/')?'/rezepte/icon.svg':null;
 if(!file)return;
 function enhance(){for(const symbol of document.querySelectorAll('.brand .brand-symbol')){const image=document.createElement('img');image.src=file+'?v=20261101-berry';image.className='family-brand-icon';image.alt='';image.width=36;image.height=36;image.decoding='async';symbol.replaceWith(image);}}
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();
