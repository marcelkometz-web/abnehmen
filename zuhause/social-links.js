// These are the three public profiles explicitly supplied by the app owner.
(()=>{
 if(!['/garten/','/rezepte/','/abnehmen/'].some(path=>location.pathname.startsWith(path)))return;
 const profiles=[['instagram','Instagram','diegartenmutti86','https://www.instagram.com/diegartenmutti86/'],['tiktok','TikTok','gartenmutti86','https://www.tiktok.com/@gartenmutti86'],['youtube','YouTube','diemutti86','https://youtube.com/@diemutti86']];
 const ns='http://www.w3.org/2000/svg';
 function icon(type){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');const shape=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);};
  if(type==='instagram'){shape('rect',{x:3,y:3,width:18,height:18,rx:5,fill:'none',stroke:'currentColor','stroke-width':2});shape('circle',{cx:12,cy:12,r:4,fill:'none',stroke:'currentColor','stroke-width':2});shape('circle',{cx:17.5,cy:6.5,r:1.2,fill:'currentColor'});}
  else if(type==='youtube'){shape('rect',{x:1,y:4,width:22,height:16,rx:5,fill:'currentColor'});shape('path',{d:'M10 8l7 4-7 4z',fill:'#fff'});}
  else shape('path',{d:'M14 3h3c.4 2.4 1.8 3.8 4 4v3a10 10 0 0 1-4-1.2v7.1a6 6 0 1 1-6-6h1v3h-1a3 3 0 1 0 3 3V3z',fill:'currentColor'});
  return svg;}
 function enhance(){for(const footer of document.querySelectorAll('footer:not(.info-footer)')){if(footer.querySelector(':scope > [data-confirmed-socials]'))continue;const nav=document.createElement('nav');nav.className='confirmed-socials';nav.dataset.confirmedSocials='';nav.setAttribute('aria-label','Ramonas Social-Media-Profile');for(const[type,label,handle,url]of profiles){const a=document.createElement('a');a.className='social-profile social-profile-'+type;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.setAttribute('aria-label',label+' · @'+handle+' · in neuem Fenster öffnen');a.title='@'+handle;a.append(icon(type),document.createTextNode(label));nav.append(a);}footer.append(nav);}}
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});};enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();
