export const HELP_THEMES={
 general:{eyebrow:'UNSER ZUHAUSE · DEINE HILFE',title:'Alles an einem Ort.\nIn Ruhe erklärt.',description:'Garten, Rezepte und dein persönlicher Weg. Hier findest du die passenden Schritte für euren Alltag.',icon:'/abnehmen/zuhause/icon.svg',emoji:'🏡',tags:['🔐 Gemeinsam & privat','📱 Für dein Gerät','💬 Hilfe, wenn du sie brauchst']},
 garden:{eyebrow:'RAMONAS GARTEN · DEINE HILFE',title:'Dein Garten.\nEinfach erklärt.',description:'Vom ersten Beet bis zur nächsten Ernte: Such dir das Thema aus, das du gerade brauchst.',icon:'/abnehmen/zuhause/assets/garten.png',emoji:'🌿',tags:['🌱 Pflanzen & Beete','🗓️ Dein Gartenjahr','💚 Gemeinsam wachsen']},
 recipes:{eyebrow:'REZEPTE · DEINE HILFE',title:'Gutes Essen.\nGanz einfach finden.',description:'Lieblingsgerichte entdecken, Portionen anpassen und gemeinsam kochen. Schritt für Schritt zum guten Essen.',icon:'/abnehmen/zuhause/assets/rezepte.svg',emoji:'🍽️',tags:['🥗 Frische Ideen','🥣 Deine Portionen','🧡 Gemeinsam genießen']},
 progress:{eyebrow:'RAMONAS WEG · DEINE HILFE',title:'Dein Weg.\nGut begleitet.',description:'Dein Check-in, deine Bilder und dein Wohlbefinden. Alles verständlich erklärt, in deinem Tempo.',icon:'/abnehmen/zuhause/assets/fortschritt.png',emoji:'🌸',tags:['⚖️ Deinen Verlauf verstehen','💪 Bewegung & Kraft','💗 Zeit für dich']},
 legal:{eyebrow:'UNSER ZUHAUSE · GUT ZU WISSEN',title:'Kontakt & Vertrauen.',description:'Wer eure Apps betreibt, wie Daten verarbeitet werden und wo du Unterstützung bekommst.',icon:'/abnehmen/zuhause/icon.svg',emoji:'🛡️',tags:['☎️ Direkter Kontakt','🔐 Deine Daten','📖 Transparent erklärt']}
};
const isHeading=line=>/^[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 .:&/()–+?!„“,\-]{3,}$/.test(line);
export function parseHelp(text){
 const blocks=text.trim().split(/\n\s*\n/),sections=[];let current=null;
 const updated=text.match(/Stand:\s*([^\n]+)/)?.[1]||'';
 for(let index=0;index<blocks.length;index++){
  const [first,...rest]=blocks[index].split('\n');
  if(index===0&&isHeading(first))continue;
  if(isHeading(first)){current={heading:first,blocks:[]};sections.push(current);if(rest.length)current.blocks.push(rest.join('\n'));}
  else{if(!current){current={heading:'AUF EINEN BLICK',blocks:[]};sections.push(current);}current.blocks.push(blocks[index]);}
 }
 return{updated,sections};
}
export function topicIcon(heading,kind){
 const title=heading.toLocaleUpperCase('de');
 for(const [pattern,icon]of [[/PASSWORT/,'🔑'],[/ANMELD|ZUGANG|RECHTE|FREIGABE|KONTO/,'🔐'],[/FOTO|GALERIE|BILD/,'📸'],[/TRAINING|ÜBUNG|BEWEG/,'💪'],[/BMI|GEWICHT|CHECK.IN|AUSWERT/,'⚖️'],[/ZYKLUS|WOHLBEFIND/,'🌸'],[/DATENSCHUTZ|SICHERHEIT/,'🛡️'],[/NÄHR|ZUTAT|PORTION/,'🥗'],[/REZEPT|KOCH|ESSEN|KÜCH|BEILAGE/,'🍽️'],[/PFLANZ|BEET|ANBAU|SORTE|KATALOG/,'🌱'],[/KALENDER|TERMIN/,'🗓️'],[/CHATGPT|GEMINI|\bKI\b/,'✨'],[/SICHERUNG|BACKUP|SPEICH/,'💾'],[/INSTALL|GERÄT|WEB.APP/,'📱'],[/KONTAKT|IMPRESSUM|BETREIBER/,'☎️'],[/HILFE|FEHLER/,'💬'],[/TEILEN|VERÖFFENT/,'💌']])if(pattern.test(title))return icon;
 return HELP_THEMES[kind]?.emoji||'📖';
}
const nouns='Anmeldung Familie Freigabe Konten Konto Passwort Passworts Freigaben Rechte Profile Profil Fotos Foto Pflanzen Sorten Beete Beet Positionen Lageplan Video Zeichnung Fotoablage Notizen Teilen Drucken Sicherung Sicherungen Aktualisieren Fenster Termine Installation Kalender Kalenderabo Wetter Standort Pflege Sammlung Suche Startseite Favoriten Gerichte Mengen Portionen Nährwerte Zutaten Zutatenberechnung Ernährung Nachtisch Salate Rezepte Rezept Rezeptdetails Rezeptbilder Training Übungen Bewegung Zyklus Wohlbefinden Auswertung BMI Check-in Wochen-Check-in Menü Design Datenschutz Sicherheit Hilfe Impressum Kontakt Betreiber Grenzen Hinweise Verantwortung Verarbeitung Aufbewahrung Zugriff Zugriffe Zugriffsschutz Anbieter Dienste Neu Browser Gerät Geräte Geräteanpassung Eingaben Hintergrund Speicherstand Daten Datenqualität Funktionen Einstellungen Rolle Rollen Gemeinschaft Gemeinschaftsapp Symbole Internet Informationen Kontolöschung Fortschritt Tagesansicht Speichern Löschen Rückfragen Kontoverwaltung Fehlerprüfung';
const proper=new Map((nouns+' Blick Haptik Wahl Sorte Apple Abo Alternative Uhrzeit Aufgaben Forum Ernte Plätze Lebensdauer Vorlage Inhalte Jahreszeiten Sprüche Verbindung Tagebuch').split(' ').map(word=>[word.toLocaleLowerCase('de'),word]));
for(const word of ['ChatGPT','Gemini','OpenAI','Supabase','GitHub','API','KI','PKCE','JPEG','JPG','EXIF','Android','Windows','ChromeOS','iOS','Mac','Google','YouTube','Instagram','TikTok','2D','HTML','EU','RAMONAS','GARTEN'])proper.set(word.toLocaleLowerCase('de'),word==='RAMONAS'?'Ramonas':word==='GARTEN'?'Garten':word);
export function friendlyHeading(raw){
 const clean=raw.replace(/^\d+\.\s*/,'');
 const titles=['Web-App installieren','2D-Lageplan aus Video, Fotos oder eigener Zeichnung','Teilen und KI-Fragen zu einer Sorte','Eigenes Konto löschen','Kostenloser Supabase-Tarif','Superadmin-Zusatzpasswort vergessen','Nutzer per E-Mail einladen','Superadmin: Funktionen, Limits und Sicherheit','Katalogergänzung 23. Oktober 2026','Web-App für Wartungsarbeiten schliessen','Neue Garten-Adresse','Gemeinsame App: Unser Zuhause','ChatGPT-Begleiter','Rezepte anlegen, bearbeiten und löschen','Eier-Timer'];
 const exact=titles.find(title=>title.toLocaleUpperCase('de')===clean);if(exact)return exact.replace('schliessen','schließen');
 let title=clean.toLocaleLowerCase('de').replace(/[\p{L}\p{N}-]+/gu,word=>proper.get(word)||word);
 return title.charAt(0).toLocaleUpperCase('de')+title.slice(1);
}
function element(tag,text,className){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(className)node.className=className;return node;}
function copyBlock(block,preserve=false){
 if(/^\s*[-•]\s/m.test(block)){
  const wrap=element('div'),parts=block.split(/\n(?=\s*[-•]\s)/);let list=null;
  for(const part of parts){if(/^\s*[-•]\s/.test(part)){if(!list){list=element('ul',null,'help-list');wrap.append(list);}list.append(element('li',part.replace(/^\s*[-•]\s/,'').replace(/\n/g,' ')));}else wrap.append(element('p',part.replace(/\n/g,' ')));}return wrap;
 }
 return element('p',preserve?block:block.replace(/\n/g,' '),preserve?'help-preserve':null);
}
export function exercisePictures(){
 const gallery=element('div',null,'help-pictures');
 for(const [id,label]of [['band-row','Mit Bändern trainieren'],['treadmill','Auf dem Laufband bewegen']]){const figure=element('figure'),img=element('img');img.src='/abnehmen/assets/training/'+id+'-360.webp';img.alt='Vorhandene KI-Demonstration: '+label;img.width=360;img.height=240;img.loading='lazy';img.decoding='async';figure.append(img,element('figcaption',label+' · KI-Demonstration'));gallery.append(figure);}return gallery;
}
export function renderHelpDocument(host,text,kind){
 const theme=HELP_THEMES[kind]||HELP_THEMES.general,doc=parseHelp(text);host.classList.add('help-view');host.dataset.helpKind=kind;host.replaceChildren();
 const hero=element('header',null,'help-hero'),copy=element('div',null,'help-hero-copy'),image=element('img');image.src=theme.icon;image.alt='';image.width=80;image.height=80;image.className='help-app-icon';
 copy.append(element('p',theme.eyebrow,'help-eyebrow'),element('h3',theme.title,'help-title'),element('p',theme.description,'help-intro'));
 const tags=element('div',null,'help-tags');for(const tag of theme.tags)tags.append(element('span',tag));hero.append(copy,image,tags);if(doc.updated)hero.append(element('p','Aktuell für dich · '+doc.updated,'help-updated'));host.append(hero);
 const tools=element('div',null,'help-tools'),label=element('label','🔎 Was möchtest du wissen?','help-search-label'),search=element('input');search.type='search';search.placeholder='Zum Beispiel Fotos, Passwort oder Speichern';search.setAttribute('aria-label','Hilfethemen durchsuchen');label.append(search);const count=element('p',null,'help-result-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');tools.append(label,count);host.append(tools);
 const toc=element('details',null,'help-toc');toc.append(element('summary','📖 Direkt zu einem Thema'));const tocList=element('div',null,'help-toc-links');toc.append(tocList);host.append(toc);
 const topics=element('div',null,'help-topics');host.append(topics);const entries=[];
 doc.sections.forEach((section,index)=>{
  const details=element('details',null,'help-topic'),summary=element('summary'),icon=element('span',topicIcon(section.heading,kind),'help-topic-icon');icon.setAttribute('aria-hidden','true');summary.append(icon,element('span',friendlyHeading(section.heading)),element('span','+','help-topic-toggle'));summary.lastChild.setAttribute('aria-hidden','true');const body=element('div',null,'help-topic-body');
  for(const block of section.blocks)body.append(copyBlock(block,/BETREIBER|KONTAKT/.test(section.heading)));
  if(kind==='progress'&&section.heading==='TRAINING UND WOHLBEFINDEN')body.append(exercisePictures());
  details.append(summary,body);details.open=index===0;topics.append(details);
  const button=element('button',topicIcon(section.heading,kind)+' '+friendlyHeading(section.heading));button.type='button';button.addEventListener('click',()=>{details.open=true;toc.open=false;details.scrollIntoView({block:'start',behavior:'auto'});summary.focus({preventScroll:true});});tocList.append(button);
  entries.push({details,button,text:(section.heading+' '+section.blocks.join(' ')).toLocaleLowerCase('de')});
 });
 const empty=element('p','Dazu habe ich hier kein Thema gefunden. Versuche ein kürzeres Suchwort oder nutze den Kontakt unten.','help-empty');empty.hidden=true;host.append(empty);
 const update=()=>{const words=search.value.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);let matches=0;for(const entry of entries){const match=words.every(word=>entry.text.includes(word));entry.details.hidden=!match;entry.button.hidden=!match;entry.details.open=words.length?match:entry===entries[0];if(match)matches++;}count.textContent=words.length?matches+' passende '+(matches===1?'Thema':'Themen'):entries.length+' Themen · Tippe zum Öffnen auf eine Überschrift';empty.hidden=matches>0;};search.addEventListener('input',update);update();
}
