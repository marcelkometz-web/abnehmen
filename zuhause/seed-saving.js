import{SEED_GUIDES,SEED_CATEGORIES,SEED_SOURCES,seedGuide,searchSeedGuides,matchSeedPlant,seedCultivarStatus}from'./seed-saving-catalog.mjs';

const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
let trusted=location.pathname.startsWith('/garten/');
try{if(window.self!==window.top)trusted=trusted&&window.unserZuhauseFrame===true&&window.parent===window.top&&window.parent.location.origin===location.origin&&['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(window.parent.location.pathname)&&window.parent.document.documentElement.dataset.appShell==='unser-zuhause-v1';}catch{trusted=false;}
let dialog,results,search,category,status,returnFocus,observerFrame;
function sourceLink(id){const source=SEED_SOURCES[id],a=el('a',source.title);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';return a;}
function guideBody(guide){
 const body=el('div',undefined,'seed-guide-body');body.append(el('p','Wann sammeln? '+guide.harvest));
 const steps=el('ol');for(const step of guide.steps)steps.append(el('li',step));body.append(steps,el('p',guide.caution,'seed-saving-caution'));
 const sources=el('details',undefined,'seed-guide-sources');sources.append(el('summary','Fachquellen zu dieser Anleitung'));const list=el('ul');for(const id of guide.sourceIds){const item=el('li');item.append(sourceLink(id));list.append(item);}sources.append(list);body.append(sources);return body;
}
function render(){
 const openCategories=new Set([...results.querySelectorAll('[data-seed-category][open]')].map(node=>node.dataset.seedCategory));
 const found=searchSeedGuides(search.value,category.value),searching=Boolean(search.value.trim());status.textContent=found.length+' von '+SEED_GUIDES.length+' Anleitungen';results.replaceChildren();
 if(!found.length){results.append(el('p','Für diese Kultur enthält der geprüfte Bereich noch keine Anleitung. Bitte nicht das Verfahren einer nur ähnlich benannten Pflanze übernehmen.','seed-saving-empty'));return;}
 for(const[id,label]of Object.entries(SEED_CATEGORIES)){
  const guides=found.filter(guide=>guide.category===id);if(!guides.length)continue;
  const group=el('details',undefined,'seed-saving-category');group.dataset.seedCategory=id;group.open=searching||category.value!=='all'||openCategories.has(id);group.append(el('summary',label+' · '+guides.length));
  const list=el('div',undefined,'seed-guide-list');
  for(const guide of guides){
   const entry=el('details',undefined,'seed-guide');entry.dataset.seedGuide=guide.id;const summary=el('summary'),name=el('strong',guide.name),meta=el('span',guide.method+' · '+guide.cycle,'seed-guide-meta');summary.append(name,meta);entry.append(summary);
   const ensure=()=>{if(!entry.querySelector('.seed-guide-body'))entry.append(guideBody(guide));};entry.addEventListener('toggle',()=>{if(entry.open)ensure();});
   if(searching&&found.length<=3){ensure();entry.open=true;}list.append(entry);
  }
  group.append(list);results.append(group);
 }
}
function mount(){
 if(dialog)return;
 dialog=el('dialog',undefined,'seed-saving-dialog');dialog.id='seed-saving-dialog';dialog.setAttribute('aria-labelledby','seed-saving-title');
 const header=el('header',undefined,'seed-saving-header'),title=el('h2','Eigenes Saatgut gewinnen 🌱'),close=el('button','Schließen','seed-saving-button');title.id='seed-saving-title';close.type='button';close.addEventListener('click',()=>dialog.close());header.append(title,close);
 const body=el('div',undefined,'seed-saving-body');body.append(el('p','Von der eigenen Pflanze zur nächsten Gartensaison: Wähle eine Kultur und öffne nur die Anleitung, die du gerade brauchst.','seed-saving-intro'));
 const foundation=el('details',undefined,'seed-saving-foundation');foundation.append(el('summary','Vor dem Start: Samenfestigkeit, Trocknung und Lagerung'));
 const facts=el('ul');for(const text of[
  'Samenfestigkeit ist eine Angabe zur konkreten Sorte. Ein vertrauter Name oder ein fehlendes F1 im App-Eintrag bestätigt sie nicht. Bitte Packung oder Züchterangabe prüfen.',
  'Samen von F1-Hybriden können keimen, ihre Nachkommen müssen der Mutterpflanze aber nicht gleichen. Auch samenfeste Sorten können sich bei Fremdbestäubung verkreuzen.',
  'Für den Einstieg nur gesunde geeignete Mutterpflanzen und reife Samen verwenden. Sortenerhaltung über Generationen braucht mehr Planung als ein einzelnes Experiment.',
  'Saatgut ist lebendes Vermehrungsmaterial. In diesem Bereich gilt Lufttrocknung bei Raumtemperatur im Schatten; das Lebensmittel-Dörrprogramm mit 50–60 °C ist dafür nicht vorgesehen.',
  'Erst vollständig trockene Gemüsesamen in beschriftete Papiertütchen füllen und gegen Feuchtigkeit geschützt kühl lagern. Kultur, Sorte, Erntejahr und unklare Bestäubung dazuschreiben. Vor der Aussaat eine Keimprobe einplanen.'
 ])facts.append(el('li',text));foundation.append(facts,el('p','Diese Hinweise gelten für die hier beschriebenen Kulturen. Andere Samen können andere Lager- oder Keimbedingungen benötigen; eine Keimquote oder feste Haltbarkeit wird nicht versprochen.','seed-saving-note'),sourceLink('rhs'),document.createTextNode(' · '),sourceLink('usu'));body.append(foundation);
 const controls=el('div',undefined,'seed-saving-controls'),searchLabel=el('label','Kultur suchen'),categoryLabel=el('label','Bereich auswählen');search=el('input');search.type='text';search.inputMode='search';search.maxLength=100;search.autocomplete='off';search.placeholder='Zum Beispiel Tomate, Chili, Möhre';category=el('select');for(const[value,text]of Object.entries({all:'Alle Anleitungen',...SEED_CATEGORIES})){const option=el('option',text);option.value=value;category.append(option);}searchLabel.append(search);categoryLabel.append(category);controls.append(searchLabel,categoryLabel);
 status=el('p',undefined,'seed-saving-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');results=el('div',undefined,'seed-saving-results');body.append(controls,status,el('p','Die Anleitungen beziehen sich auf Kulturarten. Sie bestätigen keine Samenfestigkeit, Bestäubung oder Eignung einer einzelnen gespeicherten Sorte.','seed-saving-note'),results);
 const sources=el('details',undefined,'seed-saving-all-sources');sources.append(el('summary','Alle geprüften Quellen · Stand 1. November 2026'));const list=el('ul');for(const id of Object.keys(SEED_SOURCES)){const item=el('li');item.append(sourceLink(id));list.append(item);}sources.append(list);body.append(sources);dialog.append(header,body);document.body.append(dialog);
 search.addEventListener('input',render);category.addEventListener('change',render);
 dialog.addEventListener('close',()=>{document.documentElement.classList.remove('seed-saving-open');search.value='';category.value='all';results.replaceChildren();const target=returnFocus;returnFocus=null;if(!document.hidden&&window.unserZuhauseHidden!==true&&target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});});
}
function open({query=''}={}){
 if(!trusted)return false;mount();search.value=String(query??'').slice(0,100);category.value='all';render();
 if(!dialog.open){returnFocus=document.activeElement;document.documentElement.classList.add('seed-saving-open');try{dialog.showModal();}catch{document.documentElement.classList.remove('seed-saving-open');return false;}}
 dialog.scrollTop=0;dialog.querySelector('button').focus({preventScroll:true});return true;
}
function close(){if(dialog?.open)dialog.close();}
function enhance(){
 observerFrame=null;if(!trusted)return;
 for(const nav of document.querySelectorAll('.main-nav')){
  if(nav.querySelector('[data-open-seeds]'))continue;
  const button=el('button',undefined,'nav-button seed-saving-nav-button');button.type='button';button.dataset.openSeeds='';button.setAttribute('aria-haspopup','dialog');button.append(el('span','🌱','nav-symbol'),el('span','Eigenes Saatgut'));nav.append(button);nav.classList.add('has-seed-saving-menu');
 }
 for(const plantDialog of document.querySelectorAll('dialog.plant-detail-dialog[open]')){
  const heading=plantDialog.querySelector('.plant-detail-heading #dialog-title'),host=plantDialog.querySelector('.plant-detail-body #selected-variety');if(!heading||!host)continue;
  const previous=host.querySelector('[data-plant-seeds]');if(previous?.seedHeadingValue===heading.textContent)continue;if(previous)previous.remove();
  const guide=matchSeedPlant(heading.textContent);if(!guide)continue;
  const details=el('details',undefined,'detail-section-accordion seed-saving-plant-info');details.dataset.plantSeeds=guide.id;details.seedHeadingValue=heading.textContent;details.append(el('summary','🌱 Eigenes Saatgut · '+guide.name),el('p',seedCultivarStatus(heading.textContent),'seed-cultivar-status'));
  details.append(guideBody(guide));const button=el('button','Alle Saatgut-Anleitungen öffnen','seed-saving-button');button.type='button';button.dataset.openSeeds=guide.id;details.append(button);host.append(details);
 }
}
const schedule=()=>{if(!observerFrame)observerFrame=requestAnimationFrame(enhance);};
if(trusted){
 Object.defineProperty(window,'unserZuhauseSeeds',{value:Object.freeze({open,close}),writable:false,configurable:false});
 document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-open-seeds]');if(!trigger||event.defaultPrevented)return;event.preventDefault();const id=trigger.dataset.openSeeds;open({query:seedGuide(id)?.name||''});});
 const ready=()=>{new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});enhance();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 document.addEventListener('visibilitychange',()=>{if(document.hidden||window.unserZuhauseHidden===true)close();});window.addEventListener('pagehide',close);
}
