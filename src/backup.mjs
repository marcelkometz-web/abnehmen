// Private, portable backups. No network or storage calls live in this module.
import {dateValue} from './domain.mjs';
export const BACKUP_VERSION=1;
export const BACKUP_LIMITS=Object.freeze({fileBytes:64*1024*1024,photoBytes:1024*1024,photoTotal:40*1024*1024,photos:300,rows:20000});
const FORMAT='ramonas-weg-private-backup',ITERATIONS=310000;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const bad=()=>{throw Error('Die Sicherung hat ein ungültiges oder nicht unterstütztes Format.');};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const str=(v,max=1000)=>{if(typeof v!=='string'||v.length>max)bad();return v;};
const num=(v,min,max,optional=false)=>{if(optional&&(v===null||v===undefined))return null;if(typeof v!=='number'&&typeof v!=='string'||String(v).trim()==='')bad();const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)bad();return n;};
const choice=(v,list,optional=false)=>{if(optional&&(v===null||v===undefined))return null;if(!list.includes(v))bad();return v;};
const bool=(v,optional=false)=>{if(optional&&v===undefined)return null;if(typeof v!=='boolean')bad();return v;};
const date=v=>{try{return dateValue(v);}catch{bad();}};
const uuid=v=>{if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))bad();return v.toLowerCase();};
const note=v=>str(v??'');
const numeric=(v,min,max)=>num(v,min,max,true);
function row(value){if(!plain(value))bad();return value;}
function array(value,max=BACKUP_LIMITS.rows){if(!Array.isArray(value)||value.length>max)bad();return value;}
export function bytesToBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
export function base64ToBytes(value,max=BACKUP_LIMITS.fileBytes){if(typeof value!=='string'||value.length>Math.ceil(max/3)*4+4||!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).test(value))bad();let binary;try{binary=atob(value);}catch{bad();}if(binary.length>max)bad();return Uint8Array.from(binary,c=>c.charCodeAt(0));}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function photoKey(p){return JSON.stringify([p.recorded_on,p.view,p.note,p.sha256]);}
const schemas={
 weights(v){return{recorded_on:date(v.recorded_on),weight_kg:num(v.weight_kg,1,700),note:note(v.note)};},
 measurements(v){const r={recorded_on:date(v.recorded_on),note:note(v.note)};for(const k of['chest_cm','waist_cm','hip_cm','upper_arm_cm','thigh_cm'])r[k]=numeric(v[k],.1,500);if(!Object.values(r).some((x,i)=>i>1&&x!==null))bad();return r;},
 training(v){return{recorded_on:date(v.recorded_on),kind:choice(v.kind,['treadmill','bodyweight','bands','strength-a','strength-b','mobility']),minutes:num(v.minutes,1,300),effort:numeric(v.effort,1,10),band_level:choice(v.band_level,['none','light','medium','firm'],true),note:note(v.note)};},
 cycles(v){const r={recorded_on:date(v.recorded_on),end_on:v.end_on?date(v.end_on):null,note:note(v.note)};if(r.end_on&&(r.end_on<r.recorded_on||Date.parse(r.end_on)-Date.parse(r.recorded_on)>20*86400000))bad();return r;},
 exerciseLogs(v){const r={recorded_on:date(v.recorded_on),exercise_id:str(v.exercise_id,100),band_level:choice(v.band_level,['none','light','medium','firm']),band_label:str(v.band_label??'',80),sets:num(v.sets,1,6),reps:num(v.reps,1,30),effort:num(v.effort,1,10),technique_ok:bool(v.technique_ok),pain:bool(v.pain),completed:bool(v.completed),note:note(v.note)};if(![r.sets,r.reps,r.effort].every(Number.isInteger))bad();return r;},
 weekPlan(v){const r={planned_on:date(v.planned_on),kind:choice(v.kind,['meal','training','weighin']),slot:choice(v.slot,['breakfast','lunch','dinner','snack'],true),title:str(v.title,200),recipe_id:v.recipe_id==null?null:str(v.recipe_id,120),servings:numeric(v.servings,.25,30),ingredients:array(v.ingredients??[],100).map(x=>({name:str(row(x).name,160),quantity:numeric(x.quantity,Number.MIN_VALUE,1e6),unit:str(x.unit??'',40)})),minutes:numeric(v.minutes,1,300),done:bool(v.done??false)};if(!r.title.trim()||r.kind==='meal'&&(!r.slot||r.servings===null)||r.kind!=='meal'&&(r.slot!==null||r.servings!==null||r.recipe_id!==null||r.ingredients.length)||r.kind!=='training'&&r.minutes!==null||r.minutes!==null&&!Number.isInteger(r.minutes))bad();return r;}
};
export function sanitizeRecord(kind,value){return schemas[kind](row(value));}
function profile(v){if(v===null||v===undefined)return null;return{height_cm:num(row(v).height_cm,50,260)};}
function preferences(v){if(v===null||v===undefined)return null;row(v);const r={};
 for(const[k,min,max]of[['birth_year',1900,2100],['reported_loss_kg',.1,500],['remaining_goal_min',.1,200],['remaining_goal_max',.1,200],['cycle_length_days',18,45],['goal_baseline_weight_kg',1,700]])if(v[k]!==undefined)r[k]=numeric(v[k],min,max);
 for(const k of['birth_year','cycle_length_days'])if(r[k]!==null&&r[k]!==undefined&&!Number.isInteger(r[k]))bad();
 if(v.activity_level!==undefined)r.activity_level=choice(v.activity_level,['gentle','active'],true);
 for(const k of['reported_loss_approx','motivation_enabled'])if(v[k]!==undefined)r[k]=bool(v[k]);
 const patterns={instagram_url:/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/,tiktok_url:/^https:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9_.]+\/?$/,youtube_url:/^https:\/\/(www\.)?youtube\.com\/(@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+)\/?$/};
 for(const[k,re]of Object.entries(patterns))if(v[k]!==undefined){r[k]=v[k]===null?null:str(v[k],300);if(r[k]!==null&&!re.test(r[k]))bad();}
 if(v.goal_baseline_recorded_on!==undefined)r.goal_baseline_recorded_on=v.goal_baseline_recorded_on===null?null:date(v.goal_baseline_recorded_on);
 if(r.remaining_goal_min!=null&&r.remaining_goal_max!=null&&r.remaining_goal_min>r.remaining_goal_max)bad();return r;
}
export function normalizeBackup(value){
 row(value);if(value.format!==FORMAT||value.version!==BACKUP_VERSION)bad();
 if(typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt)))bad();
 const data=row(value.data),result={format:FORMAT,version:BACKUP_VERSION,createdAt:value.createdAt,data:{profile:profile(data.profile),preferences:preferences(data.preferences)}};
 let totalRows=0;
 for(const key of Object.keys(schemas)){result.data[key]=array(data[key]??[]).map(v=>sanitizeRecord(key,v));totalRows+=result.data[key].length;}
 if(totalRows>BACKUP_LIMITS.rows)bad();
 result.data.photos=array(data.photos??[],BACKUP_LIMITS.photos).map(p=>{row(p);const bytes=base64ToBytes(p.jpeg,BACKUP_LIMITS.photoBytes);if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)bad();if(!/^[a-f0-9]{64}$/.test(p.sha256))bad();return{recorded_on:date(p.recorded_on),view:choice(p.view,['front','side','back','other']),note:note(p.note),sha256:p.sha256,jpeg:p.jpeg};});
 if(result.data.photos.reduce((n,p)=>n+base64ToBytes(p.jpeg,BACKUP_LIMITS.photoBytes).length,0)>BACKUP_LIMITS.photoTotal)throw Error('Die Fotos überschreiten die Grenze von 40 MiB. Es wurde keine Teilsicherung erstellt.');
 // AI history is portable reference material; it is never inserted as trusted model memory.
 const ref=data.aiReference??{};row(ref);result.data.aiReference={messages:array(ref.messages??[],BACKUP_LIMITS.rows).map(v=>({role:choice(row(v).role,['user','assistant']),content:str(v.content,8000),created_at:str(v.created_at??'',80)})),tips:array(ref.tips??[],1).map(v=>({content:str(row(v).content,1500),memory:str(v.memory??'',4000),created_at:str(v.created_at??'',80)}))};
 return result;
}
export function makeBackup(data,now=new Date()){return normalizeBackup({format:FORMAT,version:BACKUP_VERSION,createdAt:now.toISOString(),data});}
const passwordBytes=password=>{if(typeof password!=='string'||password.length<12||password.length>256)throw Error('Bitte ein eigenes Sicherungspasswort mit 12 bis 256 Zeichen verwenden.');return enc.encode(password);};
const ENVELOPE_FORMAT='unser-zuhause-encrypted-backup';
const header=(salt,iv)=>({format:ENVELOPE_FORMAT,version:BACKUP_VERSION,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:bytesToBase64(salt),iv:bytesToBase64(iv)});
async function derive(password,salt,usage){const key=await crypto.subtle.importKey('raw',passwordBytes(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,usage);}
function validateJson(value){let nodes=0;const visit=(v,depth)=>{if(++nodes>500000||depth>20)bad();if(v===null||typeof v==='boolean'||typeof v==='string')return;if(typeof v==='number'){if(!Number.isFinite(v))bad();return;}if(Array.isArray(v)){for(const x of v)visit(x,depth+1);return;}row(v);for(const[k,x]of Object.entries(v)){if(k==='__proto__'||k==='constructor'||k==='prototype')bad();visit(x,depth+1);}};visit(value,0);return value;}
// Callers of the generic JSON helpers MUST validate their application format
// before writing any imported data. Encryption alone never authorizes a write.
export async function encryptJson(value,password){
 const bytes=enc.encode(JSON.stringify(validateJson(value)));if(bytes.length>BACKUP_LIMITS.fileBytes-1024)throw Error('Die Sicherung ist für diesen Browser zu groß (maximal 64 MiB). Es wurde keine Teilsicherung erstellt.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),h=header(salt,iv),key=await derive(password,salt,['encrypt']);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(JSON.stringify(h)),tagLength:128},key,bytes);
 // The binary envelope avoids another base64 copy of the complete archive.
 const hb=enc.encode(JSON.stringify(h)),out=new Uint8Array(4+hb.length+ciphertext.byteLength);new DataView(out.buffer).setUint32(0,hb.length);out.set(hb,4);out.set(new Uint8Array(ciphertext),4+hb.length);return out;
}
export async function decryptJson(input,password){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(bytes.length<64||bytes.length>BACKUP_LIMITS.fileBytes)bad();const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);if(length<50||length>1024||length+20>=bytes.length)bad();
 let h;try{h=JSON.parse(dec.decode(bytes.subarray(4,4+length)));}catch{bad();}row(h);if(h.format!==ENVELOPE_FORMAT||h.version!==BACKUP_VERSION||h.kdf!=='PBKDF2-SHA256'||h.iterations!==ITERATIONS||h.cipher!=='AES-256-GCM')bad();
 const salt=base64ToBytes(h.salt,16),iv=base64ToBytes(h.iv,12);if(salt.length!==16||iv.length!==12)bad();const key=await derive(password,salt,['decrypt']);let clear;
 try{clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(JSON.stringify(header(salt,iv))),tagLength:128},key,bytes.subarray(4+length));}catch{throw Error('Die Sicherung konnte nicht entschlüsselt werden. Passwort oder Datei ist nicht korrekt.');}
 let value;try{value=JSON.parse(dec.decode(clear));}catch{bad();}return validateJson(value);
}
export async function encryptBackup(value,password){return encryptJson(normalizeBackup(value),password);}
export async function decryptBackup(input,password){
 const backup=normalizeBackup(await decryptJson(input,password));
 for(const p of backup.data.photos)if(await sha256(base64ToBytes(p.jpeg,BACKUP_LIMITS.photoBytes))!==p.sha256)throw Error('Die Fotoprüfsumme stimmt nicht. Die Sicherung wurde nicht übernommen.');
 return backup;
}
const stable=v=>JSON.stringify(v);
export function buildRestorePreview(backup,current){
 const source=normalizeBackup(backup).data,now=normalizeBackup(current).data,insert={profile:now.profile?null:source.profile,preferences:now.preferences?null:source.preferences},counts={},skipped={};
 for(const kind of Object.keys(schemas)){
  const key=kind==='weights'||kind==='measurements'||kind==='cycles'?r=>r.recorded_on:kind==='exerciseLogs'?r=>r.recorded_on+'|'+r.exercise_id:stable;
  const unique=['weights','measurements','cycles','exerciseLogs'].includes(kind),existing=new Map();for(const r of now[kind])existing.set(key(r),(existing.get(key(r))??0)+1);insert[kind]=[];
  for(const r of source[kind]){const k=key(r),count=existing.get(k)??0;if(count>0){if(!unique)existing.set(k,count-1);continue;}if(unique)existing.set(k,1);insert[kind].push(r);}
  counts[kind]=insert[kind].length;skipped[kind]=source[kind].length-insert[kind].length;
 }
 const known=new Set(now.photos.map(photoKey));insert.photos=[];for(const p of source.photos){const k=photoKey(p);if(known.has(k))continue;known.add(k);insert.photos.push(p);}
 counts.photos=insert.photos.length;skipped.photos=source.photos.length-insert.photos.length;counts.profile=insert.profile?1:0;counts.preferences=insert.preferences?1:0;skipped.profile=source.profile&&!insert.profile?1:0;skipped.preferences=source.preferences&&!insert.preferences?1:0;
 const dates=[...Object.values(insert).filter(Array.isArray).flat().map(r=>r.recorded_on??r.planned_on).filter(Boolean)].sort();
 return{insert,counts,skipped,firstDate:dates[0]??null,lastDate:dates.at(-1)??null,aiReferenceCount:source.aiReference.messages.length+source.aiReference.tips.length};
}
