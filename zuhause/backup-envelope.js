/* Private JSON backups for Garden and Recipes. The app still validates its own
   import schema before any write. This helper performs no database request. */
(()=>{
 'use strict';
 if(typeof window==='undefined')return;
 try{
  if(window.self!==window.top&&!(window.unserZuhauseFrame===true&&window.parent===window.top&&window.parent.location.origin===location.origin&&['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(window.parent.location.pathname)&&window.parent.document.documentElement.dataset.appShell==='unser-zuhause-v1'))return;
 }catch{return;}
 const limits=Object.freeze({plainBytes:20*1024*1024,fileBytes:20*1024*1024+1024});
 const abort=()=>new DOMException('Der Sicherungsvorgang wurde abgebrochen.','AbortError');
 let generation=0,working=false,promptState=null,cryptoModule=null;
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const check=epoch=>{if(epoch!==generation||document.hidden||window.unserZuhauseHidden===true)throw abort();};
 function clear(){generation++;promptState?.cancel();}
 function validateTree(value){
  let nodes=0;const visit=(item,depth)=>{
   if(++nodes>500000||depth>20)throw Error('Die JSON-Sicherung ist zu komplex.');
   if(item===null||typeof item==='string'||typeof item==='boolean')return;
   if(typeof item==='number'&&Number.isFinite(item))return;
   if(Array.isArray(item)){for(const child of item)visit(child,depth+1);return;}
   if(!item||typeof item!=='object'||Object.getPrototypeOf(item)!==Object.prototype)throw Error('Die JSON-Sicherung ist ungültig.');
   for(const[key,child]of Object.entries(item)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Die JSON-Sicherung enthält nicht erlaubte Felder.');visit(child,depth+1);}
  };visit(value,0);
  if(!value||typeof value!=='object')throw Error('Bitte eine vollständige JSON-Sicherung auswählen.');
  return value;
 }
 function parseLegacy(bytes){
  let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''));}catch{throw Error('Die ausgewählte Datei ist keine lesbare JSON-Sicherung.');}
  return validateTree(value);
 }
 function requestPassword(encrypt){
  if(typeof HTMLDialogElement==='undefined'||!crypto?.subtle)throw Error('Dieser Browser unterstützt die private Sicherung nicht. Bitte einen aktuellen Browser über HTTPS verwenden.');
  return new Promise((resolve,reject)=>{
   const dialog=el('dialog'),form=el('form'),title=el('h2',encrypt?'Sicherung verschlüsseln 🔐':'Sicherung entschlüsseln 🔐'),hint=el('p',encrypt?'Wähle ein eigenes Sicherungspasswort mit 12 bis 256 Zeichen. Es ist unabhängig vom App-Passwort. Ohne dieses Passwort lässt sich die Datei nicht wiederherstellen.':'Gib das Sicherungspasswort für diese Datei ein. Es wird nur für diesen Vorgang verwendet.'),label=el('label','Sicherungspasswort'),password=el('input'),repeatLabel=el('label','Sicherungspasswort wiederholen'),repeat=el('input'),error=el('p'),actions=el('div'),cancel=el('button','Abbrechen'),submit=el('button',encrypt?'Verschlüsseln und sichern':'Entschlüsseln');
   dialog.id='private-backup-password-dialog';title.id='private-backup-password-title';dialog.setAttribute('aria-labelledby',title.id);dialog.className='private-backup-dialog';form.method='dialog';
   for(const input of[password,repeat]){input.type='password';input.minLength=12;input.maxLength=256;input.required=true;input.autocomplete=encrypt?'new-password':'current-password';input.spellcheck=false;input.autocapitalize='off';}
   password.name='backup_password';repeat.name='backup_password_repeat';label.append(password);repeatLabel.append(repeat);error.setAttribute('role','alert');error.hidden=true;cancel.type='button';submit.type='submit';
   actions.className='private-backup-actions';
   actions.append(cancel,submit);form.append(title,hint,label);if(encrypt)form.append(repeatLabel);form.append(error,el('p','Die App speichert dieses Passwort nicht.'),actions);dialog.append(form);document.body.append(dialog);
   document.documentElement.classList.add('private-backup-open');
   let settled=false;const finish=(value,reason)=>{
    if(settled)return;settled=true;password.value='';repeat.value='';promptState=null;if(dialog.open)dialog.close();dialog.remove();
    document.documentElement.classList.remove('private-backup-open');
    if(reason)reject(reason);else resolve(value);
   };
   promptState={cancel:()=>finish(null,abort())};cancel.addEventListener('click',()=>finish(null,abort()));dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null,abort());});dialog.addEventListener('close',()=>{if(!settled)finish(null,abort());});
   form.addEventListener('submit',event=>{
    event.preventDefault();const value=password.value;if(value.length<12||value.length>256){error.textContent='Bitte 12 bis 256 Zeichen verwenden.';error.hidden=false;return;}
    if(encrypt&&value!==repeat.value){error.textContent='Die beiden Sicherungspasswörter stimmen nicht überein.';error.hidden=false;repeat.focus();return;}
    finish(value);
   });try{dialog.showModal();password.focus();}catch(error){finish(null,error);}
  });
 }
 async function module(){return cryptoModule??=(await import('/abnehmen/src/backup.mjs'));}
 async function operation(callback){
  if(working)throw Error('Bitte den laufenden Sicherungsvorgang zuerst abschließen.');
  working=true;const epoch=generation;try{check(epoch);return await callback(epoch);}finally{working=false;}
 }
 async function download(value,filename='Private_Sicherung.json'){
  return operation(async epoch=>{
   let raw;try{raw=JSON.stringify(value);}catch{throw Error('Diese Daten konnten nicht als vollständige JSON-Sicherung vorbereitet werden.');}
   if(typeof raw!=='string')throw Error('Bitte vollständige Sicherungsdaten übergeben.');const plainBytes=new TextEncoder().encode(raw);if(plainBytes.length>limits.plainBytes)throw Error('Die JSON-Sicherung überschreitet die Grenze von 20 MiB. Es wurde keine Teilsicherung erstellt.');
   const frozenValue=parseLegacy(plainBytes);
   let password=await requestPassword(true),bytes;try{check(epoch);const api=await module();check(epoch);bytes=await api.encryptJson(frozenValue,password);}finally{password=null;}
   check(epoch);if(bytes.length>limits.fileBytes)throw Error('Die verschlüsselte Sicherung ist zu groß.');
   const name=String(filename).replace(/[^A-Za-z0-9ÄÖÜäöüß_. -]/g,'_').slice(0,150).replace(/\.(?:json|private-backup)$/i,'')+'.private-backup';
   const downloader=await import('/abnehmen/src/backup-download.mjs');check(epoch);
   return downloader.downloadEncryptedBytes(bytes,name,{isActive:()=>epoch===generation&&!document.hidden&&window.unserZuhauseHidden!==true});
  });
 }
 async function read(file){
  return operation(async epoch=>{
   if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size<2||file.size>limits.fileBytes)throw Error('Bitte eine JSON- oder verschlüsselte Sicherung bis 20 MiB auswählen.');
   const bytes=new Uint8Array(await file.arrayBuffer());check(epoch);if(bytes.length!==file.size||bytes.length>limits.fileBytes)throw Error('Die Sicherungsdatei ist unvollständig oder zu groß.');
   // The binary envelope starts with its bounded big-endian header length.
   // Legacy JSON stays available for old exports, followed by the app's schema check.
   if(bytes[0]!==0){if(bytes.length>limits.plainBytes)throw Error('Die JSON-Sicherung ist zu groß.');return parseLegacy(bytes);}
   if(bytes.length<64)throw Error('Die verschlüsselte Sicherung ist unvollständig.');
   const headerLength=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);if(headerLength<50||headerLength>1024||headerLength+20>=bytes.length)throw Error('Die verschlüsselte Sicherung hat ein ungültiges Format.');
   let password=await requestPassword(false),value;try{check(epoch);const api=await module();check(epoch);value=await api.decryptJson(bytes,password);}finally{password=null;}
   check(epoch);return validateTree(value);
  });
 }
 Object.defineProperty(window,'privateBackup',{value:Object.freeze({download,read,clear,limits}),writable:false,configurable:false});
 document.addEventListener('visibilitychange',()=>{if(document.hidden||window.unserZuhauseHidden===true)clear();});window.addEventListener('pagehide',clear);
})();
