import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseLogPayload,progressionAdvice,sameExerciseLog,PROGRESS_EXERCISES} from '../src/training-progress.mjs';
const today='2026-11-01';
const log=(recorded_on,values={})=>({recorded_on,exercise_id:'tube-squat',band_level:'light',band_label:'Mein Set · 10 lbs',sets:2,reps:8,effort:6,technique_ok:true,pain:false,completed:true,note:'',...values});
const advice=(rows,options={})=>progressionAdvice(rows,{exerciseId:'tube-squat',today,...options});

test('real exercise-day payload validates explicit values and never assumes technique or completion',()=>{
 const form=new Map(Object.entries({...log('2026-10-30'),technique_ok:'on',completed:'on',pain:''})),p=exerciseLogPayload(form,{today});
 assert.deepEqual(p,log('2026-10-30'));form.delete('technique_ok');form.delete('completed');assert.equal(exerciseLogPayload(form,{today}).technique_ok,false);assert.equal(exerciseLogPayload(form,{today}).completed,false);
 form.set('band_level','none');assert.equal(exerciseLogPayload(form,{today}).band_label,'');
 for(const[key,value]of[['exercise_id','unknown'],['recorded_on','2026-11-02'],['recorded_on','2026-02-30'],['sets','2.5'],['reps','31'],['effort',''],['effort','11'],['band_level','pink'],['band_label','x'.repeat(81)]]){
  const invalid=new Map(Object.entries(log('2026-10-30')));invalid.set(key,value);assert.throws(()=>exerciseLogPayload(invalid,{today}),key);
 }
 assert.ok(PROGRESS_EXERCISES.every(ex=>ex.type!=='treadmill'));
});
test('two clean matching sessions and recovery permit only one repetition to change',()=>{
 const rows=[log('2026-10-27'),log('2026-10-30')],result=advice(rows);
 assert.equal(result.kind,'progress');assert.equal(result.evidence.length,2);
 assert.deepEqual(result.next,{exercise_id:'tube-squat',sets:2,reps:9,band_level:'light',band_label:'Mein Set · 10 lbs'});
 assert.equal(rows[1].reps,8,'source logs remain unchanged');
});
test('a single session, same-day duplicates, rushed sessions, stale sessions and a changed band do not qualify',()=>{
 for(const rows of[
  [log('2026-10-30')],
  [log('2026-10-30'),log('2026-10-30')],
  [log('2026-10-29'),log('2026-10-30')],
  [log('2026-10-01'),log('2026-10-30')],
  [log('2026-10-27',{band_label:'Another manufacturer · 10 lbs'}),log('2026-10-30')],
  [log('2026-10-27',{band_level:'medium'}),log('2026-10-30')],
  [log('2026-10-27',{sets:3}),log('2026-10-30')],
  [log('2026-10-27',{reps:9}),log('2026-10-30')]
 ])assert.equal(advice(rows).kind,'observe');
 assert.equal(advice([log('2026-10-01'),log('2026-10-04')]).kind,'restart');
 assert.equal(advice([log('2026-10-27',{band_label:''}),log('2026-10-30',{band_label:''})]).kind,'identify');
});
test('recent discomfort and incomplete or excessive efforts prevent a progression',()=>{
 for(const change of[{technique_ok:false},{effort:8},{completed:false},{pain:undefined}])assert.equal(advice([log('2026-10-27'),log('2026-10-30',change)]).kind,'hold');
 assert.equal(advice([log('2026-10-27'),log('2026-10-30',{pain:true})]).kind,'stop');
 for(const change of[{pain:true},{technique_ok:false},{completed:false},{effort:8}])assert.equal(advice([log('2026-10-27',change),log('2026-10-30')]).kind,'observe');
});
test('low energy and current symptoms override a good history without assigning invented medical data',()=>{
 const rows=[log('2026-10-27'),log('2026-10-30')];
 assert.equal(advice(rows,{energy:'low'}).kind,'ease');assert.equal(advice(rows,{symptoms:['discomfort']}).kind,'ease');
 for(const symptom of['chest-pain','dizziness','unusual-breathlessness']){const result=advice(rows,{energy:'low',symptoms:[symptom]});assert.equal(result.kind,'stop');assert.equal(result.next,null);assert.match(result.message,/112/);}
});
test('recovery advice and exercise-specific ceilings block automatic resistance increases',()=>{
 assert.equal(advice([log('2026-10-27'),log('2026-10-31')]).kind,'rest');
 assert.equal(advice([log('2026-10-27',{reps:12}),log('2026-10-30',{reps:12})]).kind,'maintain');
 assert.equal(advice([log('2026-10-27',{reps:6}),log('2026-10-30',{reps:6})]).kind,'maintain');
 const row=log('2026-10-27',{exercise_id:'tube-lateral-raise',sets:1,reps:11});
 assert.equal(progressionAdvice([row,{...row,recorded_on:'2026-10-30'}],{today,exerciseId:row.exercise_id}).next.reps,12,'1–2 sets must not be mistaken for repetition range');
});
test('future and unrelated observations cannot authorize a progression; no history stays explicit',()=>{
 assert.equal(advice([]).kind,'start');assert.equal(advice([log('2026-11-03'),log('2026-11-05')]).kind,'start');
 assert.equal(advice([log('2026-10-27',{exercise_id:'tube-row'}),log('2026-10-30')]).kind,'observe');
 assert.equal(advice([],{exerciseId:'unknown'}).kind,'unknown');
 assert.equal(advice([log('2026-10-27'),log('2026-10-30',{effort:'6'})]).kind,'hold','invalid latest record must not be skipped to reuse older evidence');
 assert.equal(advice([log('2026-10-27'),log('2026-10-30',{band_level:'unknown'})]).kind,'hold');
});
test('idempotent retries compare actual content while excluding server identity and timestamps',()=>{
 const original=log('2026-10-30');assert.ok(sameExerciseLog(original,{...original,id:'different',user_id:'server',created_at:'later'}));
 for(const key of['band_label','sets','reps','technique_ok','pain','completed','note'])assert.equal(sameExerciseLog(original,{...original,[key]:typeof original[key]==='boolean'?!original[key]:String(original[key])+'x'}),false,key);
});
