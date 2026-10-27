import test from 'node:test';import assert from 'node:assert/strict';
import { uploadPhoto, deletePhoto } from '../src/data.mjs';
const uid='11111111-1111-4111-8111-111111111111';
test('failed metadata insert compensates the private photo upload',async()=>{
  const calls=[];const storage={upload:async(path)=>{calls.push(['upload',path]);return {};},remove:async(paths)=>{calls.push(['remove',...paths]);return {};}};
  const client={storage:{from:()=>storage},from:()=>({insert:()=>({select:()=>({single:async()=>({error:{code:'42501'}})})})})};
  await assert.rejects(uploadPhoto(client,uid,{recorded_on:'2024-01-01',view:'front'},new Blob()),/Kein Zugriff/);
  assert.equal(calls.length,2);assert.equal(calls[0][1],calls[1][1]);assert.ok(calls[0][1].startsWith(uid+'/'));
});
test('photo metadata is not deleted when private file removal fails',async()=>{
  let touched=false;const client={storage:{from:()=>({remove:async()=>({error:{code:'network'}})})},from:()=>{touched=true;}};
  await assert.rejects(deletePhoto(client,{id:'x',storage_path:'private/x.jpg'}));assert.equal(touched,false);
});
