import{bucket}from'./data.mjs';
import{BACKUP_LIMITS,makeBackup,normalizeBackup,sanitizeRecord,bytesToBase64,base64ToBytes,sha256,buildRestorePreview}from'./backup.mjs';
const TABLES={weights:'ab_weights',measurements:'ab_measurements',training:'ab_training_sessions',cycles:'ab_cycle_entries',exerciseLogs:'ab_exercise_logs',weekPlan:'ab_week_plan'};
const optional=new Set(['ab_exercise_logs','ab_week_plan']);
const errorMessage=error=>error?.code==='40001'?'Der Datenstand wurde inzwischen geändert. Bitte die Vorschau neu laden.':'Die Sicherung konnte nicht vollständig verarbeitet werden. Bitte Verbindung und Anmeldung prüfen.';
function checked(result){if(result.error){const error=new Error(errorMessage(result.error));error.code=result.error.code;throw error;}return result.data;}
const requireActive=fn=>{if(fn&&!fn())throw Error('Die Anmeldung ist nicht mehr aktiv. Bitte erneut anmelden.');};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function backupIdentity(client,isActive){requireActive(isActive);const result=await client.auth.getUser();if(result.error||!result.data?.user?.id)throw Error('Bitte erneut anmelden.');const diary=checked(await client.rpc('ab_current_diary'));if(!uuid(diary))throw Error('Kein Zugriff auf das private Tagebuch.');requireActive(isActive);return{actor:result.data.user.id,diary};}
async function revision(client){const row=checked(await client.from('ab_diary_state').select('revision').maybeSingle());const value=Number(row?.revision??0);if(!Number.isSafeInteger(value)||value<0)throw Error('Der Speicherstand konnte nicht geprüft werden.');return value;}
async function rows(client,table){const out=[];for(let from=0;;from+=500){const response=await client.from(table).select('*').order('id').range(from,from+499);if(response.error&&optional.has(table)&&['42P01','PGRST205'].includes(response.error.code))return[];const data=checked(response);if(!Array.isArray(data))throw Error('Ungültige Serverantwort.');out.push(...data);if(out.length>BACKUP_LIMITS.rows)throw Error('Das Tagebuch überschreitet die Sicherungsgrenze von 20.000 Einträgen. Es wurde keine Teilsicherung erstellt.');if(data.length<500)return out;}}
export async function collectBackup(client,{isActive}={}){
 const identity=await backupIdentity(client,isActive),before=await revision(client),data={};
 await Promise.all(Object.entries(TABLES).map(async([key,table])=>{data[key]=(await rows(client,table)).map(v=>sanitizeRecord(key,v));}));
 const [profile,prefs,photos,messages,tips]=await Promise.all([client.from('ab_profile').select('*').maybeSingle(),client.from('ab_preferences').select('*').maybeSingle(),rows(client,'ab_progress_photos'),rows(client,'ab_ai_messages'),client.from('ab_ai_tips').select('*')]);
 data.profile=checked(profile);data.preferences=checked(prefs);data.aiReference={messages,tips:checked(tips)};data.photos=[];
 if(photos.length>BACKUP_LIMITS.photos)throw Error('Mehr als 300 Fotos überschreiten die Sicherungsgrenze. Es wurde keine Teilsicherung erstellt.');
 let total=0;
 for(const photo of photos){
  requireActive(isActive);if(!uuid(photo.id)||photo.storage_path!==identity.diary+'/'+photo.id+'.jpg')throw Error('Eine Fotozuordnung ist ungültig. Die Sicherung wurde abgebrochen.');
  const blob=checked(await client.storage.from(bucket).download(photo.storage_path));if(!(blob instanceof Blob)||blob.size>BACKUP_LIMITS.photoBytes)throw Error('Ein Foto überschreitet die zulässige Größe. Die Sicherung wurde abgebrochen.');
  total+=blob.size;if(total>BACKUP_LIMITS.photoTotal)throw Error('Die Fotos überschreiten 40 MiB. Es wurde keine Teilsicherung erstellt.');
  const bytes=new Uint8Array(await blob.arrayBuffer());data.photos.push({recorded_on:photo.recorded_on,view:photo.view,note:photo.note,sha256:await sha256(bytes),jpeg:bytesToBase64(bytes)});
 }
 const after=await revision(client),current=await backupIdentity(client,isActive);if(before!==after||identity.actor!==current.actor||identity.diary!==current.diary)throw Error('Während der Sicherung wurden Daten oder die Anmeldung geändert. Bitte erneut starten.');
 return{backup:makeBackup(data),identity,revision:after};
}
export async function prepareRestore(client,backup,{isActive}={}){const validated=normalizeBackup(backup),current=await collectBackup(client,{isActive});return{...buildRestorePreview(validated,current.backup),identity:current.identity,revision:current.revision,sourceCreatedAt:validated.createdAt,aiReference:validated.data.aiReference};}
export async function commitRestore(client,preview,{isActive,onProgress}={}){
 requireActive(isActive);const current=await backupIdentity(client,isActive);if(current.actor!==preview.identity.actor||current.diary!==preview.identity.diary)throw Error('Die Anmeldung hat sich geändert. Bitte die Vorschau neu laden.');
 if(await revision(client)!==preview.revision)throw Error('Der Datenstand wurde inzwischen geändert. Bitte die Vorschau neu laden.');
 const insert=preview.insert,storage=client.storage.from(bucket),uploaded=[],photos=[];let committed=false,metadataStarted=false;
 try{
  for(let index=0;index<insert.photos.length;index++){
   requireActive(isActive);const p=insert.photos[index],bytes=base64ToBytes(p.jpeg,BACKUP_LIMITS.photoBytes);if(await sha256(bytes)!==p.sha256)throw Error('Die Fotoprüfsumme stimmt nicht.');
   requireActive(isActive);
   const id=crypto.randomUUID(),path=current.diary+'/'+id+'.jpg';uploaded.push(path);photos.push({id,recorded_on:p.recorded_on,view:p.view,note:p.note});checked(await storage.upload(path,new Blob([bytes],{type:'image/jpeg'}),{contentType:'image/jpeg',cacheControl:'0',upsert:false}));onProgress?.(index+1,insert.photos.length);
  }
  const actor=await backupIdentity(client,isActive);if(actor.actor!==current.actor||actor.diary!==current.diary)throw Error('Die Anmeldung hat sich geändert. Die Wiederherstellung wurde abgebrochen.');
  const payload={...insert,photos,expectedActor:current.actor,expectedDiary:current.diary};metadataStarted=true;const result=await client.rpc('ab_restore_backup',{p_expected_revision:preview.revision,p_data:payload});checked(result);if(result.data?.saved!==true)throw Error('Die Rückmeldung der Wiederherstellung ist unvollständig. Bitte den aktuellen Datenstand neu prüfen.');committed=true;return result.data;
 }catch(error){
  if(uploaded.length&&!committed){
   // A lost RPC response may hide a committed transaction. Inspect only our new IDs
   // before removing staged objects; never remove a file with persisted metadata.
   let unreferenced=[];
   try{const lookup=await client.from('ab_progress_photos').select('id').in('id',photos.map(p=>p.id));if(lookup.error)throw lookup.error;const persisted=new Set((lookup.data??[]).map(p=>p.id));if(persisted.size===photos.length&&photos.length){return{saved:true,recoveredResponse:true,counts:preview.counts};}if(metadataStarted&&!(typeof error.code==='string'&&/^(22|23|40|42)[0-9A-Z]{3}$/.test(error.code)))throw Error('An unconfirmed SQL request may still be running.');unreferenced=uploaded.filter(path=>!persisted.has(path.split('/').at(-1).replace(/\.jpg$/,'')));}catch{throw Error('Die Rückmeldung war unklar. Private Uploads wurden vorsichtshalber nicht gelöscht. Bitte den Datenstand neu laden und die Wiederherstellung erneut prüfen.');}
   if(unreferenced.length){const cleanup=await storage.remove(unreferenced);if(cleanup.error)throw Error('Die Wiederherstellung wurde abgebrochen; private Uploadreste konnten nicht bereinigt werden. Bitte die private Speicherbereinigung veranlassen.');}
  }
  throw error;
 }
}
