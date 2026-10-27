import {dateValue,noteValue,numberValue,measurements}from './domain.mjs';
import {compressPhoto}from './photos.mjs';
import {fail,bucket}from './data.mjs';
const photoViews=['front','side','back'];
export function checkinPayload(form){
  const optional=(name,max,decimals=1)=>String(form.get(name)||'').trim()?numberValue(form.get(name),max,decimals):null;
  const weight=optional('weight_kg',700,2),height=optional('height_cm',260);
  if(weight!==null&&weight<1)throw Error('Bitte ein Gewicht ab 1 kg eingeben.');
  if(height!==null&&height<50)throw Error('Bitte eine Körpergröße zwischen 50 und 260 cm eingeben.');
  const body=Object.fromEntries(measurements.map(([key])=>[key,optional(key,500)]));
  const photos=photoViews.filter(view=>form.get('photo_'+view)?.size>0);
  if(weight===null&&!Object.values(body).some(value=>value!==null)&&!photos.length)throw Error('Bitte mindestens Gewicht, ein Körpermaß oder ein Foto für den Check-in ergänzen.');
  return {p_recorded_on:dateValue(form.get('recorded_on')),p_weight:weight,p_height:height,p_body:body,p_note:noteValue(form.get('note')),p_photos:[]};
}
export async function saveCheckin(client,diaryId,form,{active=()=>true,compress=compressPhoto}={}){
  const payload=checkinPayload(form),staged=[];let rpcAttempted=false,definiteFailure=false;
  try{
    for(const view of photoViews){
      const file=form.get('photo_'+view);if(!file?.size)continue;
      const blob=await compress(file);
      if(!active())throw Error('Die Anmeldung wurde unterbrochen.');
      const id=crypto.randomUUID(),path=`${diaryId}/${id}.jpg`;staged.push({id,path,view});
      const result=await client.storage.from(bucket).upload(path,blob,{contentType:'image/jpeg',cacheControl:'0',upsert:false});fail(result.error);
    }
    if(!active())throw Error('Die Anmeldung wurde unterbrochen.');
    payload.p_photos=staged.map(({id,view})=>({id,view}));rpcAttempted=true;
    const result=await client.rpc('ab_save_checkin',payload);
    if(result.error){definiteFailure=/^(?:22|23|42|PGRST)/.test(result.error.code||'');fail(result.error);}
    return result.data;
  }catch(error){
    // A definite failed transaction can be compensated. A lost response may
    // follow a successful commit: never delete its files on that ambiguity.
    if(staged.length&&(!rpcAttempted||definiteFailure)){
      const cleanup=await client.storage.from(bucket).remove(staged.map(item=>item.path));
      if(cleanup.error)throw Error('Der Check-in wurde nicht gespeichert. Einzelne Dateien konnten nicht bereinigt werden; sie bleiben im privaten Fotobereich. Bitte neu laden und prüfen.');
    }
    if(rpcAttempted&&!definiteFailure)throw Error('Die Speicherbestätigung fehlt. Bitte aktualisieren und den Tag prüfen, bevor du dieselben Fotos erneut speicherst.');
    throw error;
  }
}
