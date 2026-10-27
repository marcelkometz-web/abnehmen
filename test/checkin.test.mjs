import test from 'node:test';import assert from 'node:assert/strict';
import {checkinPayload,saveCheckin}from '../src/checkin.mjs';
const form=()=>new Map([['recorded_on','2024-02-29'],['weight_kg','72,5'],['height_cm','168'],['waist_cm','82'],['note','Notiz']]);
test('one check-in carries its date, weight, height and optional measurements together',()=>{
 const payload=checkinPayload(form());assert.equal(payload.p_recorded_on,'2024-02-29');assert.equal(payload.p_weight,72.5);assert.equal(payload.p_height,168);assert.equal(payload.p_body.waist_cm,82);assert.equal(payload.p_body.chest_cm,null);
 assert.throws(()=>checkinPayload(new Map([['recorded_on','2024-02-29'],['height_cm','168']])));
});
test('combined save uses one guarded database RPC and compensates definite rejected uploads',async()=>{
 const f=form();f.set('photo_front',new File(['x'],'test.jpg',{type:'image/jpeg'}));const calls=[];
 const client={rpc:async(name,payload)=>{calls.push({name,payload});return {error:{code:'42501'}};},storage:{from:()=>({upload:async path=>{calls.push({upload:path});return {};},remove:async paths=>{calls.push({remove:paths});return {};}})}};
 await assert.rejects(saveCheckin(client,'11111111-1111-4111-8111-111111111111',f,{compress:async file=>file}));
 assert.equal(calls[1].name,'ab_save_checkin');assert.equal(calls[1].payload.p_photos.length,1);assert.equal(calls[2].remove[0],calls[0].upload);
});
test('an ambiguous response never removes a possibly committed photo',async()=>{
 const f=form();f.set('photo_side',new File(['x'],'test.jpg',{type:'image/jpeg'}));let removed=false;
 const client={rpc:async()=>({error:{code:'',message:'network'}}),storage:{from:()=>({upload:async()=>({}),remove:async()=>{removed=true;return {};}})}};
 await assert.rejects(saveCheckin(client,'11111111-1111-4111-8111-111111111111',f,{compress:async file=>file}),/Speicherbestätigung/);assert.equal(removed,false);
});
