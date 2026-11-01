import{BACKUP_LIMITS,encryptBackup,decryptBackup}from'./backup.mjs';
import{collectBackup,prepareRestore,commitRestore}from'./backup-client.mjs';
import{readAssistantContent}from'../supabase/functions/abnehmen-ai/domain.mjs';
import{downloadEncryptedBytes}from'./backup-download.mjs';
const labels={weights:'Gewichtstage',measurements:'Messtage',photos:'Fotos',training:'Trainingseinheiten',cycles:'Zykluseinträge',exerciseLogs:'Übungsprotokolle',weekPlan:'Planeinträge',profile:'Körpergröße',preferences:'Profilangaben'};
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
function field(label,input){const box=el('label',label);box.append(input);return box;}
function input(type,options={}){const node=el('input');node.type=type;Object.assign(node,options);return node;}
export class BackupUI{
 constructor({client,host,isActive=()=>true,onSaved=()=>{},onError=()=>{}}){this.client=client;this.host=host;this.isActive=isActive;this.onSaved=onSaved;this.onError=onError;this.epoch=0;this.preview=null;this.render();}
 active(epoch){return epoch===this.epoch&&this.isActive();}
 clear(){this.epoch++;this.preview=null;this.render();}
 render(){
  const host=this.host;host.replaceChildren();
  host.append(el('h2','🔐 Deine verschlüsselte Sicherung'),el('p','Sichere dein privates Tagebuch mit Fotos, Körpermaßen, Training, Zyklus und Wochenplan in einer verschlüsselten Datei. Nur dein eigenes Sicherungspasswort öffnet diese Datei. Es wird nicht gespeichert und kann nicht zurückgesetzt werden.'),el('p','Die Sicherung bleibt auf deinem Gerät. Bewahre Datei und Passwort getrennt auf. Sie ist eine zusätzliche persönliche Sicherung; sie ersetzt keine Sicherung des gesamten Servers.'));
  const limits=el('p','Grenzen: maximal 64 MiB pro Datei, 40 MiB Fotos und 300 Fotos. Bei Überschreitung wird vollständig abgebrochen; es gibt keine unbemerkte Teilsicherung.');limits.className='hint';host.append(limits);
  const exportForm=el('form');exportForm.dataset.backup='export';
  const password=input('password',{minLength:12,maxLength:256,required:true,autocomplete:'new-password'}),repeat=input('password',{minLength:12,maxLength:256,required:true,autocomplete:'new-password'}),download=el('button','Verschlüsselte Sicherung herunterladen');download.type='submit';
  exportForm.append(field('Neues Sicherungspasswort · mindestens 12 Zeichen',password),field('Sicherungspasswort wiederholen',repeat),download);host.append(exportForm);
  this.status=el('p');this.status.role='status';this.status.setAttribute('aria-live','polite');host.append(this.status);
  const restoreDetails=el('details'),summary=el('summary','📥 Eine Sicherung wiederherstellen');restoreDetails.append(summary,el('p','Zuerst wird die Datei nur lokal entschlüsselt und mit dem aktuellen Tagebuch verglichen. Vorhandene Einträge und Profilwerte werden nicht überschrieben. Neue Daten werden erst nach deiner Bestätigung ergänzt.'));
  const importForm=el('form');importForm.dataset.backup='import';const file=input('file',{accept:'.ramona-backup,application/octet-stream',required:true}),restorePassword=input('password',{minLength:12,maxLength:256,required:true,autocomplete:'off'}),inspect=el('button','Entschlüsseln und Vorschau anzeigen');inspect.type='submit';importForm.append(field('Sicherungsdatei',file),field('Passwort dieser Sicherung',restorePassword),inspect);restoreDetails.append(importForm);this.previewHost=el('div');restoreDetails.append(this.previewHost);host.append(restoreDetails);
  this.forms=[exportForm,importForm];
  exportForm.addEventListener('submit',event=>{event.preventDefault();if(password.value!==repeat.value){this.notify('Die Sicherungspasswörter stimmen nicht überein.');return;}const secret=password.value;password.value='';repeat.value='';this.run(exportForm,async epoch=>{this.notify('Private Einträge und Fotos werden geladen.');const {backup}=await collectBackup(this.client,{isActive:()=>this.active(epoch)});if(!this.active(epoch))return;const encrypted=await encryptBackup(backup,secret);if(!this.active(epoch))return;downloadEncryptedBytes(encrypted,'ramonas-weg-'+new Date().toISOString().slice(0,10)+'.ramona-backup',{isActive:()=>this.active(epoch)});this.notify('Die verschlüsselte Datei wurde zum Download übergeben. Bitte prüfe, dass sie auf deinem Gerät gespeichert wurde.');});});
  importForm.addEventListener('submit',event=>{event.preventDefault();const selected=file.files?.[0],secret=restorePassword.value;restorePassword.value='';file.value='';this.preview=null;this.previewHost.replaceChildren();if(!selected)return;if(selected.size>BACKUP_LIMITS.fileBytes){this.notify('Die ausgewählte Datei überschreitet 64 MiB.');return;}this.run(importForm,async epoch=>{this.notify('Die Datei wird lokal entschlüsselt. Es wird noch nichts gespeichert.');const backup=await decryptBackup(await selected.arrayBuffer(),secret);if(!this.active(epoch))return;const preview=await prepareRestore(this.client,backup,{isActive:()=>this.active(epoch)});if(!this.active(epoch))return;this.preview=preview;this.showPreview(preview);this.notify('Die Vorschau ist bereit. Es wurde noch nichts verändert.');});});
 }
 notify(text){this.status.textContent=text;}
 async run(form,action){
  if(this.forms.some(f=>f.dataset.busy))return;const epoch=this.epoch;form.dataset.busy='true';form.setAttribute('aria-busy','true');const controls=[...this.host.querySelectorAll('button,input')],disabled=new Set(controls.filter(x=>x.disabled));controls.forEach(x=>x.disabled=true);
  try{if(!this.active(epoch))throw Error('Bitte zuerst das private Tagebuch öffnen.');await action(epoch);}catch(error){if(this.active(epoch)){this.notify(error.message||'Die Sicherung konnte nicht verarbeitet werden.');this.onError(error.message||'Die Sicherung konnte nicht verarbeitet werden.');}}
  finally{if(epoch===this.epoch){delete form.dataset.busy;form.removeAttribute('aria-busy');controls.forEach(x=>x.disabled=disabled.has(x));}}
 }
 showPreview(preview){
  const box=this.previewHost;this.forms=this.forms.slice(0,2);box.replaceChildren(el('h3','Deine Wiederherstellungsvorschau'));
  box.append(el('p','Sicherung vom '+new Date(preview.sourceCreatedAt).toLocaleString('de-DE')+'. Ziel: das aktuell geöffnete private Tagebuch.'));
  const list=el('ul');for(const[key,label]of Object.entries(labels))list.append(el('li',label+': '+preview.counts[key]+' neu · '+preview.skipped[key]+' vorhanden/mehrfach, werden übersprungen'));box.append(list);
  if(preview.firstDate)box.append(el('p','Neue Einträge vom '+preview.firstDate+' bis '+preview.lastDate+'.'));
  if(preview.aiReferenceCount){
   box.append(el('p',preview.aiReferenceCount+' KI-Chat-/Tipp-Einträge bleiben als Lesereferenz in der verschlüsselten Datei. Sie werden nicht erneut als bestätigte Angaben oder als KI-Gedächtnis importiert.'));
   const reference=el('details'),rows=el('div'),controls=el('div'),previous=el('button','Vorherige Texte'),next=el('button','Weitere Texte'),position=el('span');previous.type=next.type='button';controls.className='actions';
   const items=[...(preview.aiReference?.messages??[]).map(m=>(m.role==='user'?'Du: ':'Begleiter: ')+(m.role==='user'?m.content:readAssistantContent(m.content).text)),...(preview.aiReference?.tips??[]).map(t=>'Gesicherter Tipp: '+readAssistantContent(t.content).text)];let page=0;
   const render=()=>{rows.replaceChildren();for(const content of items.slice(page*10,page*10+10)){const text=el('p',content);text.className='backup-reference-text';rows.append(text);}position.textContent='Seite '+(page+1)+' von '+Math.max(1,Math.ceil(items.length/10));previous.disabled=page===0;next.disabled=(page+1)*10>=items.length;};
   previous.addEventListener('click',()=>{if(page>0){page--;render();}});next.addEventListener('click',()=>{if((page+1)*10<items.length){page++;render();}});controls.append(previous,position,next);reference.append(el('summary','Gesicherte KI-Texte nur ansehen'),rows,controls);reference.addEventListener('toggle',()=>{if(reference.open&&!rows.childElementCount)render();});box.append(reference);
  }
  box.append(el('p','Bei bereits vorhandenen Gewichts-, Mess- und Zyklustagen bleibt der gesamte vorhandene Tag erhalten. Vorhandene Körpergröße und Profilangaben bleiben ebenfalls erhalten. Prüfe die übersprungenen Einträge, wenn sich Sicherung und aktueller Stand unterscheiden.'));
  const form=el('form'),confirm=input('checkbox',{required:true}),button=el('button','Bestätigte neue Einträge ergänzen');button.type='submit';form.append(field('Ich habe die Vorschau geprüft und möchte diese neuen Einträge in das aktuelle Tagebuch übernehmen.',confirm),button);this.forms.push(form);box.append(form);
  form.addEventListener('submit',event=>{event.preventDefault();if(!confirm.checked||this.preview!==preview)return;this.run(form,async epoch=>{this.notify('Neue private Einträge werden wiederhergestellt. Bitte die App geöffnet lassen.');const result=await commitRestore(this.client,preview,{isActive:()=>this.active(epoch),onProgress:(current,total)=>{if(this.active(epoch))this.notify('Private Fotos werden vorbereitet: '+current+' von '+total+'.');}});if(!this.active(epoch))return;this.preview=null;box.replaceChildren();await this.onSaved(result);if(this.active(epoch))this.notify('Wiederherstellung abgeschlossen. Vorhandene Einträge wurden nicht überschrieben.');});});
 }
}
