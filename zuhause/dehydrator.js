import{DEHYDRATOR_DEVICE,DEHYDRATOR_CATALOG,DEHYDRATOR_SOURCES,searchDehydrator,matchDehydratorPlant,dehydratorRecipeUrl,dehydratorGradeAdvice}from'./dehydrator-catalog.mjs';

const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const range=values=>values[0]===values[1]?String(values[0]):values[0]+'–'+values[1];
const categories={fruit:'🍎 Obst',vegetables:'🥕 Gemüse & Chili'};
let dialog,search,sort,grade,results,status,observerFrame;
let trusted=true;
try{if(window.self!==window.top)trusted=window.unserZuhauseFrame===true&&window.parent===window.top&&window.parent.location.origin===location.origin&&['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(window.parent.location.pathname)&&window.parent.document.documentElement.dataset.appShell==='unser-zuhause-v1';}catch{trusted=false;}

function sourceLink(id){const source=DEHYDRATOR_SOURCES[id],a=el('a',source.title);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function recipeLink(entry){const a=el('a','🍲 In der Rezepte-App öffnen','dehydrator-recipe-link');a.href=dehydratorRecipeUrl(entry);a.target='_blank';a.rel='noopener noreferrer';return a;}
function entryContent(entry){
 const box=el('div',undefined,'dehydrator-entry-detail');
 box.append(el('p',range(entry.temperatureC)+' °C · '+range(entry.hours)+' Stunden · '+(entry.method==='manufacturer'?'Hersteller-Richtwert für Arendo 306526':'separates Fachquellen-Verfahren')),
  el('p','Schnitt: '+entry.cut),el('p',entry.preparation),el('p','Trockenprobe: '+entry.endpoint));
 if(entry.note)box.append(el('p',entry.note,'dehydrator-note'));
 box.append(recipeLink(entry));return box;
}
function cell(label){const node=el('td');node.dataset.label=label;node.setAttribute('role','cell');return node;}
function renderTables(){
 const open=new Set([...results.querySelectorAll('details[data-dehydrator-category][open]')].map(node=>node.dataset.dehydratorCategory));
 const items=searchDehydrator(search.value,sort.value);status.textContent=items.length+' von '+DEHYDRATOR_CATALOG.length+' Einträgen';results.replaceChildren();
 if(!items.length){results.append(el('p','Dafür gibt es in diesem geprüften Katalog keinen passenden Eintrag. Bitte keine Zeit einer anderen Frucht oder Gemüseart übernehmen. Die Quellen unten helfen bei der weiteren Suche.','dehydrator-empty'));return;}
 for(const[category,title]of Object.entries(categories)){
  const rows=items.filter(item=>item.category===category);if(!rows.length)continue;
  const group=el('details',undefined,'dehydrator-category');group.dataset.dehydratorCategory=category;group.open=Boolean(search.value.trim())||open.has(category);group.append(el('summary',title+' · '+rows.length+' Einträge'));
  const scroller=el('div',undefined,'dehydrator-table-scroll'),table=el('table',undefined,'dehydrator-table'),caption=el('caption',title+' – Vorbereitung, Temperatur, Zeitfenster und Trockenprobe');table.setAttribute('role','table');
  const head=el('thead'),headRow=el('tr');head.setAttribute('role','rowgroup');headRow.setAttribute('role','row');for(const label of['Lebensmittel','Temperatur & Zeit','Vorbereitung','Trockenprobe & Dörrgrad']){const th=el('th',label);th.scope='col';th.setAttribute('role','columnheader');headRow.append(th);}head.append(headRow);
  const body=el('tbody');body.setAttribute('role','rowgroup');
  for(const entry of rows){
   const tr=el('tr');tr.dataset.dehydratorEntry=entry.id;tr.setAttribute('role','row');
   const name=el('th',undefined,'dehydrator-food-name');name.scope='row';name.setAttribute('role','rowheader');name.append(el('strong',entry.name),el('small',entry.cut));
   const timing=cell('Temperatur & Zeit');timing.append(el('strong',range(entry.temperatureC)+' °C'),el('p',range(entry.hours)+' Stunden'),el('small',entry.method==='manufacturer'?'Arendo-Handbuch · Richtwert':'Fachquelle · eigenes Verfahren'),el('p','Ab '+entry.hours[0]+' Stunden regelmäßig ein Stück herausnehmen, abkühlen lassen und prüfen.','dehydrator-check'));
   if(entry.hours[1]>24)timing.append(el('p','Länger als der 24-h-Timer: keine automatische Fortsetzung zugesichert.','dehydrator-note'));
   const prep=cell('Vorbereitung');prep.append(el('p',entry.preparation));
   const endpoint=cell('Trockenprobe & Dörrgrad');endpoint.append(el('p',entry.endpoint));if(grade.value!=='standard')endpoint.append(el('p',dehydratorGradeAdvice(entry,grade.value),'dehydrator-grade-note'));
   if(entry.note){const note=el('details'),summary=el('summary','Wichtiger Hinweis');note.append(summary,el('p',entry.note));endpoint.append(note);}
   if(entry.reference){const evidence=el('details'),summary=el('summary','Abweichende Fachquelle');evidence.append(summary,el('p','CSU: '+range(entry.reference.hours)+' Stunden bei '+range(entry.reference.temperatureC)+' °C für '+entry.reference.cut+'. Das ist ein eigenes Verfahren; die Zeitfenster werden nicht zusammengerechnet.'),sourceLink(entry.reference.sourceId));endpoint.append(evidence);}
   const sources=el('details'),sourceSummary=el('summary','Quellen zu diesem Eintrag'),links=el('ul');for(const id of entry.sourceIds){const li=el('li');li.append(sourceLink(id));links.append(li);}sources.append(sourceSummary,links);endpoint.append(sources,recipeLink(entry));tr.append(name,timing,prep,endpoint);body.append(tr);
  }
  table.append(caption,head,body);scroller.append(table);group.append(scroller);results.append(group);
 }
}
function close(){if(dialog?.open)dialog.close();}
function mount(){
 if(dialog)return;
 dialog=el('dialog',undefined,'dehydrator-dialog');dialog.id='dehydrator-dialog';dialog.setAttribute('aria-labelledby','dehydrator-title');
 const header=el('div',undefined,'dehydrator-header'),title=el('h2','Dörren mit deinem Arendo 🌬️'),closeButton=el('button','Schließen','dehydrator-button');title.id='dehydrator-title';closeButton.type='button';closeButton.addEventListener('click',close);header.append(title,closeButton);
 const content=el('div',undefined,'dehydrator-content');content.append(el('p','Obst und Gemüse vorbereiten, das passende Zeitfenster finden und den Trocknungsgrad selbst prüfen. Öffne eine Kategorie oder suche direkt nach einer Frucht.','dehydrator-intro'));
 const device=el('details',undefined,'dehydrator-device');device.append(el('summary','Dein Gerät: Arendo · Modell '+DEHYDRATOR_DEVICE.model),el('p',DEHYDRATOR_DEVICE.trays+' Edelstahlgitter · '+DEHYDRATOR_DEVICE.powerW+' W · '+range(DEHYDRATOR_DEVICE.temperatureC)+' °C in '+DEHYDRATOR_DEVICE.temperatureStepC+'-°C-Schritten · Timer 0,5–24 Stunden.'),sourceLink('manual'),el('p','Die Temperaturen und Stunden sind Richtwerte aus dem zugeordneten Handbuch oder ausdrücklich gekennzeichneten Fachquellen. Beladung, Luftstrom, Stückgröße und Feuchtigkeit verändern die Dauer. Das Gerät misst damit keinen sicheren Restfeuchtewert.'));
 content.append(device);
 const controls=el('div',undefined,'dehydrator-controls'),searchLabel=el('label','Lebensmittel suchen'),sortLabel=el('label','Sortieren'),gradeLabel=el('label','Gewünschten Dörrgrad einordnen');search=el('input');search.type='search';search.placeholder='Zum Beispiel Feige, Peperoni, Zucchini';search.maxLength=100;search.autocomplete='off';sort=el('select');for(const[value,label]of[['name','Name A–Z'],['hours','Früheste Kontrollzeit']]){const option=el('option',label);option.value=value;sort.append(option);}grade=el('select');for(const[value,label]of[['standard','Vollständig trocken · Standard'],['soft','Weich / ledrig'],['crisp','Knusprig'],['powder','Für Pulver']]){const option=el('option',label);option.value=value;grade.append(option);}searchLabel.append(search);sortLabel.append(sort);gradeLabel.append(grade);controls.append(searchLabel,sortLabel,gradeLabel);status=el('p',undefined,'dehydrator-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 content.append(controls,status,el('p','Es gibt keine verlässlich belegte Extra-Stundenzahl je Dörrgrad. Die Tabelle zeigt das veröffentlichte Gesamtfenster; die zusätzliche Auswahl erklärt die Trockenprobe, ohne Zeiten zu erfinden.','dehydrator-note'));results=el('div',undefined,'dehydrator-results');content.append(results);
 const storage=el('details',undefined,'dehydrator-storage');storage.append(el('summary','Abkühlen, prüfen und richtig aufbewahren'),el('p','Immer einige Stücke vollständig abkühlen lassen und an der dicksten Stelle prüfen. Noch feuchte oder saftige Lebensmittel sind kein lagerfertiger Trockenvorrat. Auch ein erreichtes Zeitfenster garantiert keine sichere Lagerung.'),el('p','Vollständig getrocknetes Obst nach Fachquelle 4–10 Tage konditionieren: abgekühlt locker in saubere Behälter füllen, täglich bewegen und auf Feuchtigkeit prüfen. Bei Kondenswasser erneut trocknen. Bei Schimmel oder fremdem Geruch entsorgen.'),el('p','Danach portionsweise trocken, dicht verschlossen, kühl und dunkel lagern; bei Unsicherheit kühlen oder einfrieren. Diese Übersicht verspricht keine feste Haltbarkeit. Trockenobst enthält weiterhin natürlichen Zucker und Energie in kleinerem Gewicht – Dörren macht daraus kein zuckerfreies Lebensmittel.'),el('p','CSU-Blanchierzeiten sind teilweise für etwa 900–1.500 m Höhe angegeben. Das jeweils verlinkte Verfahren und örtliche Bedingungen beachten. Kein Übertragen dieser Obst-/Gemüsewerte auf Fleisch oder Fisch.'),sourceLink('csuFruit'),sourceLink('csuVeg'));
 const sources=el('details',undefined,'dehydrator-sources');sources.append(el('summary','Geprüfte Quellen · Stand 1. November 2026'));const list=el('ul');for(const id of Object.keys(DEHYDRATOR_SOURCES)){const li=el('li');li.append(sourceLink(id));list.append(li);}sources.append(list);content.append(storage,sources);
 dialog.append(header,content);document.body.append(dialog);
 search.addEventListener('input',renderTables);sort.addEventListener('change',renderTables);grade.addEventListener('change',renderTables);
 dialog.addEventListener('close',()=>{document.documentElement.classList.remove('dehydrator-open');search.value='';results.replaceChildren();});
}
function open({query=''}={}){
 if(!trusted)return false;mount();search.value=String(query??'').slice(0,100);grade.value='standard';sort.value='name';renderTables();
 if(!dialog.open){document.documentElement.classList.add('dehydrator-open');try{dialog.showModal();}catch{document.documentElement.classList.remove('dehydrator-open');return false;}}
 dialog.scrollTop=0;dialog.querySelector('button').focus({preventScroll:true});return true;
}
function enhance(){
 observerFrame=null;if(!trusted)return;
 if(/^\/(?:garten|rezepte)\//.test(location.pathname))for(const nav of document.querySelectorAll('.main-nav')){
  if(nav.querySelector('[data-open-dehydrator]'))continue;
  const button=el('button',undefined,'nav-button dehydrator-nav-button');button.type='button';button.dataset.openDehydrator='';button.setAttribute('aria-haspopup','dialog');button.append(el('span','🌬','nav-symbol'),el('span','Dörrautomat'));nav.append(button);nav.classList.add('has-dehydrator-menu');
 }
 if(!location.pathname.startsWith('/garten/'))return;
 for(const plantDialog of document.querySelectorAll('dialog.plant-detail-dialog[open]')){
  const heading=plantDialog.querySelector('.plant-detail-heading #dialog-title'),body=plantDialog.querySelector('.plant-detail-body #selected-variety');if(!heading||!body||body.querySelector('[data-plant-dehydrator]'))continue;
  const entry=matchDehydratorPlant(heading.textContent);if(!entry)continue;
  const details=el('details',undefined,'detail-section-accordion dehydrator-plant-info');details.dataset.plantDehydrator=entry.id;details.append(el('summary','🌬 Dörrautomat · '+entry.name),entryContent(entry));const button=el('button','Dörrtabelle und Dörrgrade öffnen','dehydrator-button');button.type='button';button.dataset.openDehydrator=entry.id;details.append(button);body.append(details);
 }
}
function scheduleEnhance(){if(!observerFrame)observerFrame=requestAnimationFrame(enhance);}
if(trusted){
 Object.defineProperty(window,'unserZuhauseDehydrator',{value:Object.freeze({open,close}),writable:false,configurable:false});
 document.addEventListener('click',event=>{const target=event.target.closest?.('[data-open-dehydrator]');if(!target||event.defaultPrevented)return;event.preventDefault();open({query:target.dataset.openDehydrator||''});});
 const ready=()=>{new MutationObserver(scheduleEnhance).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});enhance();const query=new URL(location.href).searchParams.get('doerren');if(location.pathname.startsWith('/rezepte/')&&query!==null)open({query});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 document.addEventListener('visibilitychange',()=>{if(document.hidden||window.unserZuhauseHidden===true)close();});window.addEventListener('pagehide',close);
}
