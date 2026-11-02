import test from 'node:test';
import assert from 'node:assert/strict';
import {saveTrainingSession} from '../src/training-save.mjs';

const id='11111111-1111-4111-8111-111111111111';
const payload={recorded_on:'2026-10-31',kind:'bands',minutes:30,effort:6,band_level:'light',note:'Kontrolliert'};
function fixture({loseFirst=false,row=null}={}){
 const rows=new Map(row?[[id,row]]:[]),calls=[];let lose=loseFirst;
 const client={from(table){assert.equal(table,'ab_training_sessions');return {
  insert(value){calls.push(['insert',value.id]);return {select(){return {async single(){
   if(rows.has(value.id))return {error:{code:'23505'}};
   rows.set(value.id,{...value});if(lose){lose=false;return {error:{code:'',message:'Lost response'}};}
   return {data:{...value}};
  }}}};},
  select(){return {eq(key,value){assert.equal(key,'id');calls.push(['read',value]);return {async maybeSingle(){return {data:rows.get(value)||null};}};}};}
 };}};
 return {client,rows,calls};
}
test('a lost training save response can be retried without doubling duration',async()=>{
 const {client,rows}=fixture({loseFirst:true});
 await assert.rejects(saveTrainingSession(client,id,payload));
 assert.equal(rows.size,1);
 assert.deepEqual(await saveTrainingSession(client,id,payload),{id,...payload});
 assert.equal(rows.size,1);assert.equal([...rows.values()].reduce((sum,row)=>sum+row.minutes,0),30);
});
test('changed inputs after an ambiguous save do not overwrite or clone a committed workout',async()=>{
 const {client,rows}=fixture({loseFirst:true});
 await assert.rejects(saveTrainingSession(client,id,payload));
 await assert.rejects(saveTrainingSession(client,id,{...payload,minutes:45}),/bereits mit anderen Angaben gespeichert/);
 assert.equal(rows.size,1);assert.equal(rows.get(id).minutes,30);
 // The explicit correction route stays recoverable after the user deletes the
 // old workout from the history; the same operation ID can then be saved.
 rows.delete(id);
 assert.equal((await saveTrainingSession(client,id,{...payload,minutes:45})).minutes,45);
 assert.equal(rows.size,1);
});
test('distinct deliberately submitted workouts can still be recorded on the same day',async()=>{
 const {client,rows}=fixture();
 await saveTrainingSession(client,id,payload);
 await saveTrainingSession(client,'22222222-2222-4222-8222-222222222222',payload);
 assert.equal(rows.size,2);
});
test('an inactive session does not read back or expose a delayed conflict response',async()=>{
 const {client,calls}=fixture({row:{id,...payload}});
 assert.equal(await saveTrainingSession(client,id,payload,{active:()=>false}),null);
 assert.deepEqual(calls,[['insert',id]]);
});
test('an unconfirmed successful response is never presented as a confirmed save',async()=>{
 const client={from:()=>({insert:()=>({select:()=>({single:async()=>({data:null})})})})};
 await assert.rejects(saveTrainingSession(client,id,payload),/Speicherbestätigung/);
});
