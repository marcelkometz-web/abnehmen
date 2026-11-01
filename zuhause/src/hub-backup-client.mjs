import{createClient}from'@supabase/supabase-js';
import{collectBackup,prepareRestore,commitRestore}from'../../src/backup-client.mjs';
import{bytesToBase64,base64ToBytes,sha256}from'../../src/backup.mjs';
import{HUB_BACKUP_FORMAT,HUB_BACKUP_LIMITS,normalizeHubBackup,normalizeGarden,normalizeRecipes,gardenRestorePreview,recipeRestorePreview,recipePath}from'./hub-backup-core.mjs';
export const HUB_AUTH='sb-wwybkswpyoyowciumxda-auth-token';
const GARDEN='https://wwybkswpyoyowciumxda.supabase.co',GARDEN_KEY='sb_publishable_-pwXCK8cRaDEj2EQJiRvTQ_spOoDIbv',RECIPES='https://kzxzhpebugvzyqfjqedx.supabase.co/functions/v1/recipes-api',RECIPE_KEY='sb_publishable_8-MkCdXRxN-GagE0g4GYrQ_TY3I6RmD';
const checked=r=>{if(r.error){const error=new Error(r.error.code==='40001'?'Der Datenstand wurde inzwischen geändert. Bitte die Vorschau neu laden.':'Die Daten konnten nicht vollständig verarbeitet werden. Bitte Verbindung und Freigaben prüfen.');error.code=r.error.code;throw error;}return r.data;};
export function storedHubSession(storage=localStorage,fallback=sessionStorage,now=Date.now()){
 let raw,activity,recovery;try{raw=storage.getItem(HUB_AUTH)||(storage.getItem(HUB_AUTH+':shared-v1')?null:fallback.getItem(HUB_AUTH));activity=Number(storage.getItem(HUB_AUTH+':activity')||fallback.getItem(HUB_AUTH+':activity'));recovery=storage.getItem(HUB_AUTH+':recovery')||fallback.getItem(HUB_AUTH+':recovery');}catch{throw Error('Die gemeinsame Anmeldung konnte nicht gelesen werden.');}
 let session,jwt;try{if(!raw||raw.length>262144)throw Error();session=JSON.parse(raw);jwt=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw Error('Bitte zuerst in einer App anmelden.');}
 if(!session?.user?.id||typeof session.access_token!=='string'||typeof jwt.session_id!=='string'||jwt.sub!==session.user.id||!Number.isFinite(activity)||activity<=0||activity>now+60000||now-activity>=600000||recovery||session.expires_at&&session.expires_at*1000<=now||jwt.exp&&jwt.exp*1000<=now)throw Error('Bitte erneut anmelden. Die gemeinsame Anmeldung endet nach zehn Minuten ohne Bedienung.');
 return{...session,sessionKey:session.user.id+':'+jwt.session_id};
}
export class HubBackupConnection{
 constructor({isActive=()=>true,onUnauthorized=()=>{}}={}){
  this.isActive=isActive;this.onUnauthorized=onUnauthorized;this.sessionKey=null;this.controllers=new Set();
  const db=createClient(GARDEN,GARDEN_KEY,{accessToken:async()=>this.session().access_token,global:{fetch:(input,options)=>this.fetch(input,options)},realtime:{params:{eventsPerSecond:1}}});
  this.client={from:db.from.bind(db),rpc:db.rpc.bind(db),storage:db.storage,auth:{getUser:async()=>{try{return{data:{user:await this.json(GARDEN+'/auth/v1/user')},error:null};}catch(error){return{data:{user:null},error};}}}};
 }
 session(){if(!this.isActive())throw new DOMException('Der Sicherungsvorgang wurde abgebrochen.','AbortError');const session=storedHubSession();if(this.sessionKey&&session.sessionKey!==this.sessionKey)throw Error('Die Anmeldung hat sich geändert. Bitte die Sicherung erneut öffnen.');return session;}
 clear(){for(const c of this.controllers)c.abort();this.controllers.clear();this.sessionKey=null;}
 async fetch(input,options={}){
  const session=this.session(),key=session.sessionKey,controller=new AbortController(),abort=()=>controller.abort();this.controllers.add(controller);options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();const timeout=setTimeout(abort,35000);
  try{const response=await fetch(input,{...options,signal:controller.signal,cache:'no-store',credentials:'omit'});if(this.session().sessionKey!==key)throw Error('Die Anmeldung hat sich geändert.');if(response.status===401||response.status===403)this.onUnauthorized();return response;}finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);this.controllers.delete(controller);}
 }
 async json(url,{method='GET',body,recipe=false,...options}={}){
  const session=this.session(),response=await this.fetch(url,{...options,method,headers:{apikey:recipe?RECIPE_KEY:GARDEN_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...options.headers},...(body===undefined?{}:{body:JSON.stringify(body)})});let data;try{data=await response.json();}catch{throw Error('Die Serverantwort ist unvollständig.');}this.session();if(!response.ok){const error=new Error(data?.error||'Der Bereich konnte nicht verarbeitet werden.');error.status=response.status;throw error;}return data;
 }
 async recipe(action,body={},blob=false){
  const session=this.session();if(!blob)return this.json(RECIPES,{method:'POST',body:{action,...body},recipe:true});
  const response=await this.fetch(RECIPES,{method:'POST',headers:{apikey:RECIPE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...body})});if(!response.ok)throw Error('Ein Rezeptfoto konnte nicht vollständig geladen werden.');const value=await response.blob();this.session();return value;
 }
 async verify(expected=null){
  const session=this.session();this.sessionKey=session.sessionKey;const user=await this.json(GARDEN+'/auth/v1/user');if(user.id!==session.user.id||user.is_anonymous||!user.email_confirmed_at){this.onUnauthorized();throw Error('Die Anmeldung konnte nicht bestätigt werden.');}
  const diary=checked(await this.client.rpc('ab_current_diary')),member=checked(await this.client.from('rg_members').select('family_id,role').eq('user_id',user.id).maybeSingle()),caps=checked(await this.client.rpc('rg_app_capabilities'));if(!diary||!member?.family_id||!caps||caps.blocked||caps.maintenance&&!caps.maintenance_access){this.onUnauthorized();throw Error('Die gemeinsame Sicherung steht nur euren aktuell freigegebenen Tagebuchkonten mit Familienzugang zur Verfügung.');}
  const identity={actor:user.id,diary,family:member.family_id,role:member.role,sessionKey:session.sessionKey};if(expected&&['actor','diary','family','sessionKey'].some(k=>identity[k]!==expected[k])){this.onUnauthorized();throw Error('Konto, Familie oder Tagebuch haben sich geändert. Bitte die Vorschau neu laden.');}return identity;
 }
}
async function tableRows(connection,table,family,{catalog=false}={}){
 const out=[];let size=0;for(let start=0;start<10000;start+=500){let query=connection.client.from(table).select('*');query=catalog?query.or('family_id.eq.'+family+',is_catalog.eq.true'):query.eq('family_id',family);const batch=checked(await query.order('id').range(start,start+499));connection.session();size+=new TextEncoder().encode(JSON.stringify(batch)).length;if(size>20*1024*1024)throw Error('Ein Gartenbereich überschreitet 20 MiB. Es wurde keine Teilsicherung erstellt.');out.push(...batch);if(out.length>9999)throw Error('Ein Gartenbereich überschreitet 9.999 Einträge. Es wurde keine Teilsicherung erstellt.');if(batch.length<500)return out;}throw Error('Der Gartenbestand ist für diese Sicherung zu groß.');
}
export async function collectGarden(connection,identity,{photos=true}={}){
 const before=checked(await connection.client.rpc('rg_hub_backup_snapshot'));
 const [plants,beds,plantings,notes,events,tasks,harvests,forum_topics,forum_replies,profile,family]=await Promise.all([
  tableRows(connection,'rg_plants',identity.family,{catalog:true}),...['beds','plantings','notes','events','tasks','harvests','forum_topics','forum_replies'].map(name=>tableRows(connection,'rg_'+name,identity.family)),connection.client.from('rg_profiles').select('display_name,city,photo_path').eq('user_id',identity.actor).maybeSingle().then(checked),connection.client.from('rg_families').select('name,growing_settings,layout_settings,settings_version,ai_provider').eq('id',identity.family).single().then(checked)
 ]);
 const garden=normalizeGarden({core:{family:family.name,plants,beds,plantings,notes,events},personalLife:{tasks},familyLife:{harvests,forum_topics,forum_replies},profile,family,photos:[]});
 if(photos){const paths=new Map();for(const row of[...plants,...beds,...harvests])if(row.photo_path)paths.set('rg-garden-photos:'+row.photo_path,{bucket:'rg-garden-photos',path:row.photo_path});if(profile?.photo_path)paths.set('rg-profile-photos:'+profile.photo_path,{bucket:'rg-profile-photos',path:profile.photo_path});if(paths.size>HUB_BACKUP_LIMITS.photos)throw Error('Zu viele Gartenbilder für eine vollständige Sicherung.');let total=0;for(const item of paths.values()){if(!item.path.startsWith((item.bucket==='rg-profile-photos'?identity.actor:identity.family)+'/'))throw Error('Eine Gartenfoto-Zuordnung ist ungültig.');const blob=checked(await connection.client.storage.from(item.bucket).download(item.path));total+=blob.size;if(total>HUB_BACKUP_LIMITS.photoTotal)throw Error('Die Gartenbilder überschreiten 40 MiB. Es wurde keine Teilsicherung erstellt.');garden.photos.push(await encodeImage(blob,item,262144));connection.session();}}
 const after=checked(await connection.client.rpc('rg_hub_backup_snapshot'));if(before!==after)throw Error('Der Garten wurde während der Sicherung verändert. Bitte erneut starten.');await connection.verify(identity);return{garden,snapshot:after};
}
async function encodeImage(blob,scope,max){if(!(blob instanceof Blob)||!blob.size||blob.size>max)throw Error('Eine Bilddatei ist nicht lesbar oder überschreitet ihre Sicherungsgrenze.');const bytes=new Uint8Array(await blob.arrayBuffer());const mime=blob.type.split(';')[0].toLowerCase()||(scope.path.endsWith('.png')?'image/png':scope.path.endsWith('.webp')?'image/webp':'image/jpeg');return{...scope,mime,data:bytesToBase64(bytes),sha256:await sha256(bytes)};}
export async function collectRecipes(connection,identity,{photos=true}={}){
 const boot=await connection.recipe('boot',{backup:true,expectedActor:identity.actor,expectedFamily:identity.family}),recipes=normalizeRecipes({records:boot.recipes,notes:boot.notes,photos:[],favorites:readFavorites()});if(typeof boot.backupSnapshot!=='string')throw Error('Die gemeinsame Rezeptsicherung ist noch nicht freigeschaltet.');
 if(photos){const paths=new Set(recipes.records.map(r=>r.image_url).filter(Boolean));let total=0;for(const path of paths){recipePath(path);const blob=await connection.recipe('image',{path},true);total+=blob.size;if(total>HUB_BACKUP_LIMITS.photoTotal)throw Error('Die Rezeptbilder überschreiten 40 MiB. Es wurde keine Teilsicherung erstellt.');recipes.photos.push(await encodeImage(blob,{bucket:'RezeptBilder',path},1024*1024));}const after=await connection.recipe('boot',{backup:true,expectedActor:identity.actor,expectedFamily:identity.family});if(after.backupSnapshot!==boot.backupSnapshot)throw Error('Die Rezepte wurden während der Sicherung verändert. Bitte erneut starten.');}
 await connection.verify(identity);return{recipes,snapshot:boot.backupSnapshot,admin:boot.admin===true};
}
function readFavorites(){try{const value=JSON.parse(localStorage.getItem('rezepte:favorites')||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
export async function collectHubBackup(connection,scopes,{onProgress=()=>{}}={}){
 const identity=await connection.verify();const output={format:HUB_BACKUP_FORMAT,version:1,createdAt:new Date().toISOString(),source:{actor:identity.actor,diary:identity.diary,family:identity.family},garden:null,recipes:null,diary:null};
 let gardenSnapshot,recipeSnapshot,diaryRevision;const budget=()=>{const images=[...(output.garden?.photos??[]),...(output.recipes?.photos??[])],total=images.reduce((n,p)=>n+Math.floor(p.data.length*3/4),0)+(output.diary?.data.photos.reduce((n,p)=>n+Math.floor(p.jpeg.length*3/4),0)??0);if(total>HUB_BACKUP_LIMITS.photoTotal)throw Error('Die ausgewählten Bilder überschreiten gemeinsam 40 MiB. Es wurde keine Teilsicherung erstellt.');return total;};
 if(scopes.garden){onProgress('Garten und private Gartenbilder werden geladen.');const result=await collectGarden(connection,identity);output.garden=result.garden;gardenSnapshot=result.snapshot;budget();}
 if(scopes.recipes){onProgress('Rezepte, Einkauf und Rezeptbilder werden geladen.');const result=await collectRecipes(connection,identity);output.recipes=result.recipes;recipeSnapshot=result.snapshot;budget();}
 if(scopes.diary){onProgress('Ramonas privates Tagebuch und Fortschrittsfotos werden geladen.');let photoTotal=budget();const limitedClient={...connection.client,storage:{from:bucket=>{const storage=connection.client.storage.from(bucket);return{download:async path=>{const result=await storage.download(path);if(!result.error){photoTotal+=result.data.size;if(photoTotal>HUB_BACKUP_LIMITS.photoTotal)throw Error('Die ausgewählten Bilder überschreiten gemeinsam 40 MiB. Es wurde keine Teilsicherung erstellt.');}return result;}};}}};const result=await collectBackup(limitedClient,{isActive:()=>{try{connection.session();return true;}catch{return false;}}});output.diary=result.backup;diaryRevision=result.revision;budget();}
 await connection.verify(identity);if(scopes.garden&&checked(await connection.client.rpc('rg_hub_backup_snapshot'))!==gardenSnapshot)throw Error('Der Garten wurde während der gemeinsamen Sicherung verändert. Bitte erneut starten.');if(scopes.recipes&&(await connection.recipe('boot',{backup:true,expectedActor:identity.actor,expectedFamily:identity.family})).backupSnapshot!==recipeSnapshot)throw Error('Die Rezepte wurden während der gemeinsamen Sicherung verändert. Bitte erneut starten.');if(scopes.diary&&Number(checked(await connection.client.from('ab_diary_state').select('revision').maybeSingle())?.revision??0)!==diaryRevision)throw Error('Das Tagebuch wurde während der gemeinsamen Sicherung verändert. Bitte erneut starten.');return normalizeHubBackup(output);
}
export async function prepareHubRestore(connection,bundle,{onProgress=()=>{}}={}){
 const backup=normalizeHubBackup(bundle),identity=await connection.verify();if(['actor','diary','family'].some(k=>backup.source[k]!==identity[k]))throw Error('Diese gemeinsame Sicherung gehört zu einem anderen Konto, Tagebuch oder Familiengarten. Bitte im Erstellerkonto anmelden.');
 const preview={backup,identity,garden:null,recipes:null,diary:null,stages:{},operationId:crypto.randomUUID(),uploadedRecipePhotos:null,uploadedGardenPhotos:null};
 if(backup.garden){onProgress('Garten-Vorschau wird geprüft.');const current=await collectGarden(connection,identity,{photos:false});preview.garden={...gardenRestorePreview(backup.garden,current.garden),snapshot:current.snapshot};}
 if(backup.recipes){onProgress('Rezept-Vorschau wird geprüft.');const current=await collectRecipes(connection,identity,{photos:false});preview.recipes={...recipeRestorePreview(backup.recipes,current.recipes),snapshot:current.snapshot,admin:current.admin};const fold=s=>s.trim().replace(/\s+/g,' ').toLowerCase();preview.recipeMap={};for(const r of backup.recipes.records){const match=current.recipes.records.find(t=>fold(t.title)===fold(r.title));if(match)preview.recipeMap[r.id]=match.id;}}
 if(backup.diary){onProgress('Tagebuch und private Fotoprüfsummen werden verglichen.');const diary=structuredClone(backup.diary);if(preview.recipeMap)for(const r of diary.data.weekPlan)if(r.recipe_id&&preview.recipeMap[r.recipe_id])r.recipe_id=String(preview.recipeMap[r.recipe_id]);preview.diary=await prepareRestore(connection.client,diary,{isActive:()=>{try{connection.session();return true;}catch{return false;}}});}
 await connection.verify(identity);return preview;
}
export async function verifyHubImageHashes(bundle,{isActive=()=>true}={}){const check=()=>{if(!isActive())throw new DOMException('Der Sicherungsvorgang wurde abgebrochen.','AbortError');};for(const scope of['garden','recipes'])for(const photo of bundle[scope]?.photos??[]){check();if(await sha256(base64ToBytes(photo.data,1024*1024))!==photo.sha256)throw Error('Eine Bildprüfsumme stimmt nicht. Die Sicherung wurde nicht übernommen.');}for(const photo of bundle.diary?.data.photos??[]){check();if(await sha256(base64ToBytes(photo.jpeg,1024*1024))!==photo.sha256)throw Error('Eine Fortschrittsfoto-Prüfsumme stimmt nicht. Die Sicherung wurde nicht übernommen.');}check();}
async function stageGardenPhotos(connection,preview){
 const need=new Set(preview.garden.photoKeys),staged=preview.uploadedGardenPhotos??{map:new Map(),uploads:[]};preview.uploadedGardenPhotos=staged;const{map,uploads}=staged;
 for(const p of preview.backup.garden.photos){const key=p.bucket+':'+p.path;if(!need.has(key)||map.has(key))continue;const owner=p.bucket==='rg-profile-photos'?preview.identity.actor:preview.identity.family,path=owner+'/'+crypto.randomUUID()+'.jpg';const bytes=base64ToBytes(p.data,262144);connection.session();uploads.push({bucket:p.bucket,path});checked(await connection.client.storage.from(p.bucket).upload(path,new Blob([bytes],{type:'image/jpeg'}),{contentType:'image/jpeg',cacheControl:'0',upsert:false}));map.set(key,path);}return{map,uploads};
}
function remapGarden(garden,map){const out=normalizeGarden(garden),path=(bucket,value)=>value?map.get(bucket+':'+value)??null:null;for(const row of[...out.core.plants,...out.core.beds,...out.familyLife.harvests])row.photo_path=path('rg-garden-photos',row.photo_path);if(out.profile)out.profile.photo_path=path('rg-profile-photos',out.profile.photo_path);delete out.photos;delete out.family;return out;}
const knownRollback=error=>typeof error?.code==='string'&&/^(22|23|40|42)[0-9A-Z]{3}$/.test(error.code);
async function cleanupGardenUploads(connection,preview){
 const staged=preview.uploadedGardenPhotos;if(!staged?.uploads.length)return;
 for(const bucket of['rg-garden-photos','rg-profile-photos']){
  const candidates=staged.uploads.filter(v=>v.bucket===bucket).map(v=>v.path),kept=new Set();
  for(let start=0;start<candidates.length;start+=40){const batch=candidates.slice(start,start+40),tables=bucket==='rg-profile-photos'?['rg_profiles']:['rg_plants','rg_beds','rg_harvests'];for(const table of tables){let query=connection.client.from(table).select('photo_path');query=table==='rg_profiles'?query.eq('user_id',preview.identity.actor):query.eq('family_id',preview.identity.family);for(const row of checked(await query.in('photo_path',batch)))if(row.photo_path)kept.add(row.photo_path);}}
  const unused=candidates.filter(path=>!kept.has(path));for(let start=0;start<unused.length;start+=40){const batch=unused.slice(start,start+40);connection.session();checked(await connection.client.storage.from(bucket).remove(batch));const removed=new Set(batch);staged.uploads=staged.uploads.filter(v=>v.bucket!==bucket||!removed.has(v.path));for(const[key,path]of staged.map)if(removed.has(path))staged.map.delete(key);}
 }
}
async function cleanupRecipeUploads(connection,preview){
 const response=await connection.recipe('backup-image-cleanup',{operationId:preview.operationId,expectedActor:preview.identity.actor,expectedFamily:preview.identity.family});const removed=new Set(response.removedPaths??[]);for(const[key,path]of preview.uploadedRecipePhotos??[])if(removed.has(path))preview.uploadedRecipePhotos.delete(key);
 if(response.more)throw Error('Weitere private Vorabdateien benötigen noch eine Bereinigung.');
}
export async function restoreHubStage(connection,preview,stage,{onProgress=()=>{}}={}){
 await connection.verify(preview.identity);if(preview.stages[stage]?.status==='done')return preview.stages[stage].result;if(!preview[stage])return null;preview.stages[stage]={status:'running'};onProgress(stage,'running');
 try{
  let result;
  if(stage==='garden'){
   if(preview.identity.role!=='owner')throw Error('Nur die Familienverwaltung kann gemeinsame Gartendaten wiederherstellen.');
   const staged=await stageGardenPhotos(connection,preview),payload=remapGarden(preview.backup.garden,staged.map);if(new TextEncoder().encode(JSON.stringify(payload)).length>20_000_000)throw Error('Die Garten-Metadaten überschreiten 20 MB. Die Wiederherstellung wurde nicht gestartet.');await connection.verify(preview.identity);
   result=checked(await connection.client.rpc('rg_restore_hub_backup',{p_expected_actor:preview.identity.actor,p_expected_family:preview.identity.family,p_expected_snapshot:preview.garden.snapshot,p_data:payload}));
  }else if(stage==='recipes'){
   if(!preview.recipes.admin)throw Error('Nur die Familienverwaltung kann die Rezeptsammlung wiederherstellen.');
   preview.uploadedRecipePhotos??=new Map();const needed=new Set(preview.recipes.photoKeys);for(const photo of preview.backup.recipes.photos)if(needed.has('RezeptBilder:'+photo.path)&&!preview.uploadedRecipePhotos.has(photo.path)){const response=await connection.recipe('backup-image-upload',{operationId:preview.operationId,expectedActor:preview.identity.actor,expectedFamily:preview.identity.family,image:photo.data,mime:photo.mime});preview.uploadedRecipePhotos.set(photo.path,response.path);}
   const records=preview.backup.recipes.records.map(({id,...r})=>({...r,sourceId:id,image_url:r.image_url?preview.uploadedRecipePhotos.get(r.image_url)??null:null}));
   const payload={confirm:true,operationId:preview.operationId,expectedActor:preview.identity.actor,expectedFamily:preview.identity.family,sourceActor:preview.backup.source.actor,sourceFamily:preview.backup.source.family,expectedSnapshot:preview.recipes.snapshot,recipes:records,notes:preview.backup.recipes.notes};if(new TextEncoder().encode(JSON.stringify({action:'backup-restore',...payload})).length>8_000_000)throw Error('Die Rezept-Metadaten überschreiten 8 MB. Die Wiederherstellung wurde nicht gestartet.');result=await connection.recipe('backup-restore',payload);
   preview.recipeMap=result.recipeMap??{};try{const favorites=readFavorites(),restored=preview.backup.recipes.favorites.map(id=>String(preview.recipeMap[id]??id));localStorage.setItem('rezepte:favorites',JSON.stringify([...new Set([...favorites,...restored])]));}catch{}
  }else if(stage==='diary'){
   // A restored recipe may receive a new ID. Preserve working menu links in the
   // new diary plan entries using the server-returned, permission-checked map.
   if(preview.recipeMap)for(const row of preview.diary.insert.weekPlan)if(row.recipe_id&&preview.recipeMap[row.recipe_id])row.recipe_id=String(preview.recipeMap[row.recipe_id]);
   result=await commitRestore(connection.client,preview.diary,{isActive:()=>{try{connection.session();return true;}catch{return false;}}});
  }else throw Error('Unbekannter Sicherungsbereich.');
  connection.session();try{if(stage==='garden')await cleanupGardenUploads(connection,preview);if(stage==='recipes')await cleanupRecipeUploads(connection,preview);}catch{result.cleanupWarning='Die Daten sind gespeichert. Private, nicht verwendete Vorabdateien konnten noch nicht vollständig bereinigt werden.';}
  preview.stages[stage]={status:'done',result};onProgress(stage,'done',result);return result;
 }catch(error){
  if(stage==='garden'&&!knownRollback(error)){try{const current=await collectGarden(connection,preview.identity,{photos:false}),remaining=gardenRestorePreview(preview.backup.garden,current.garden);if(Object.values(remaining.counts).every(n=>n===0)){const result={ok:true,recoveredResponse:true,counts:{},closedRepliesSkipped:remaining.closedReplies};preview.stages[stage]={status:'done',result};onProgress(stage,'done',result);return result;}}catch{}}
  try{if(stage==='garden'&&knownRollback(error))await cleanupGardenUploads(connection,preview);if(stage==='recipes')await cleanupRecipeUploads(connection,preview);}catch{}
  const detail=error.message+(stage==='garden'&&!knownRollback(error)&&preview.uploadedGardenPhotos?.uploads.length?' Die Rückmeldung ist unklar; private Vorabdateien bleiben bis zur erneuten Prüfung erhalten.':'');preview.stages[stage]={status:'failed',error:detail};onProgress(stage,'failed',null,detail);throw error;
 }
}
