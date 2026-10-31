import {readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {HELP_THEMES,parseHelp,topicIcon,friendlyHeading} from '../help-view.mjs';
const root=process.argv[2]||fileURLToPath(new URL('../../../',import.meta.url));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function blockHtml(block,preserve){
 if(/^\s*[-•]\s/m.test(block)){
  const parts=block.split(/\n(?=\s*[-•]\s)/),items=[];let before='';
  for(const part of parts)if(/^\s*[-•]\s/.test(part))items.push('<li>'+escape(part.replace(/^\s*[-•]\s/,'').replace(/\n/g,' '))+'</li>');else before+='<p>'+escape(part.replace(/\n/g,' '))+'</p>';
  return before+'<ul class="help-list">'+items.join('')+'</ul>';
 }
 return '<p'+(preserve?' class="help-preserve"':'')+'>'+escape(preserve?block:block.replace(/\n/g,' '))+'</p>';
}
function html(kind,text,download){
 const theme=HELP_THEMES[kind],doc=parseHelp(text),title=kind==='legal'?'Impressum & Datenschutz':theme.eyebrow.split(' · ')[0]+' · Bedienhilfe';
 const hero='<header class="help-hero"><div class="help-hero-copy"><p class="help-eyebrow">'+escape(theme.eyebrow)+'</p><h1 class="help-title">'+escape(theme.title)+'</h1><p class="help-intro">'+escape(theme.description)+'</p></div><img class="help-app-icon" src="'+theme.icon+'" width="80" height="80" alt=""><div class="help-tags">'+theme.tags.map(tag=>'<span>'+escape(tag)+'</span>').join('')+'</div><p class="help-updated">Aktuell für dich · '+escape(doc.updated)+'</p></header>';
 const toc='<details class="help-toc"><summary>📖 Direkt zu einem Thema</summary><nav class="help-toc-links" aria-label="Hilfethemen">'+doc.sections.map((s,i)=>'<a href="#hilfe-'+(i+1)+'">'+topicIcon(s.heading,kind)+' '+escape(friendlyHeading(s.heading))+'</a>').join('')+'</nav></details>';
 const sections=doc.sections.map((section,index)=>'<details class="help-topic" id="hilfe-'+(index+1)+'"'+(index===0?' open':'')+'><summary><span class="help-topic-icon" aria-hidden="true">'+topicIcon(section.heading,kind)+'</span><span>'+escape(friendlyHeading(section.heading))+'</span><span class="help-topic-toggle" aria-hidden="true">+</span></summary><div class="help-topic-body">'+section.blocks.map(b=>blockHtml(b,/BETREIBER|KONTAKT/.test(section.heading))).join('')+(kind==='progress'&&section.heading==='TRAINING UND WOHLBEFINDEN'?'<div class="help-pictures">'+[['band-row','Mit Bändern trainieren'],['treadmill','Auf dem Laufband bewegen']].map(([id,label])=>'<figure><img src="/abnehmen/assets/training/'+id+'-360.webp" alt="Vorhandene KI-Demonstration: '+label+'" width="360" height="240" loading="lazy" decoding="async"><figcaption>'+label+' · KI-Demonstration</figcaption></figure>').join('')+'</div>':'')+'</div></details>').join('');
 return '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'"><title>'+escape(title)+'</title><link rel="stylesheet" href="/abnehmen/zuhause/documents.css?v=20261031-help"><script type="module" src="/abnehmen/zuhause/help-page.mjs"></script></head><body class="document-page"><main><nav class="document-nav" aria-label="Zur App"><a href="/abnehmen/zuhause/">🏡 Unser Zuhause</a><a href="./">Zur App</a><a href="'+escape(download)+'" download>📥 Als Text sichern</a><a href="./impressum.html">Impressum</a></nav><article class="help-view" data-help-kind="'+kind+'">'+hero+'<p class="help-result-count">'+doc.sections.length+' Themen · Tippe zum Öffnen auf eine Überschrift</p>'+toc+'<div class="help-topics">'+sections+'</div></article><footer>💬 Du brauchst Unterstützung? <a href="mailto:marcelkometz@icloud.com">marcelkometz@icloud.com</a> · <a href="tel:+4915203397547">+49 152 03397547</a></footer></main></body></html>\n';
}
const legal=await readFile(path.join(root,'abnehmen/zuhause/impressum.txt'),'utf8');
for(const [folder,kind,filename]of [['abnehmen','progress','read.txt'],['garten','garden','read.txt'],['rezepte','recipes','Read.txt'],['abnehmen/zuhause','general','read.txt']]){
 const directory=path.join(root,folder);try{await access(directory);}catch{continue;}
 const content=await readFile(path.join(directory,filename),'utf8');await writeFile(path.join(directory,'read.html'),html(kind,content,'./'+filename));await writeFile(path.join(directory,'impressum.html'),html('legal',legal,'/abnehmen/zuhause/impressum.txt'));console.log('Updated help and imprint:',folder);
}
