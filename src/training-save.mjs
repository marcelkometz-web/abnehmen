import {fail} from './data.mjs';

const fields=['recorded_on','kind','minutes','effort','band_level','note'];
const matches=(row,payload)=>fields.every(key=>(row?.[key]??null)===(payload?.[key]??null));

// Keep the operation ID until the form has received a confirmed save. Retrying
// after a lost response must not insert another workout or double its minutes.
export async function saveTrainingSession(client,id,payload,{active=()=>true}={}){
 const result=await client.from('ab_training_sessions').insert({id,...payload}).select('*').single();
 if(!active())return null;
 if(result.error?.code==='23505'){
  const existing=await client.from('ab_training_sessions').select('*').eq('id',id).maybeSingle();
  if(!active())return null;
  fail(existing.error);
  if(!existing.data||!matches(existing.data,payload))throw Error('Die vorherige Trainingseinheit wurde bereits mit anderen Angaben gespeichert. Deine jetzigen Eingaben bleiben erhalten. Prüfe die gespeicherte Einheit; zum Korrigieren zuerst gezielt löschen und anschließend erneut speichern.');
  return existing.data;
 }
 fail(result.error);
 if(!result.data||result.data.id!==id||!matches(result.data,payload))throw Error('Die Speicherbestätigung für dein Training fehlt. Bitte erneut versuchen; dieselbe Einheit wird dabei nicht doppelt angelegt.');
 return result.data;
}
