import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, monthGrid, shiftMonth, weightPayload, measurementsPayload, dateValue } from '../src/domain.mjs';
import { shareContent } from '../src/share.mjs';
import { selectDailyRecipes } from '../src/daily-selection.mjs';
const snapshot={weights:[{recorded_on:'2025-02-15',weight_kg:80},{recorded_on:'2024-01-01',weight_kg:90},{recorded_on:'2025-02-14',weight_kg:81}],measurements:[{recorded_on:'2024-01-01',waist_cm:90},{recorded_on:'2025-02-15',waist_cm:85}],photos:[{id:'chosen',storage_path:'private/chosen.jpg'},{id:'not-chosen',storage_path:'private/other.jpg'}]};
test('historical inputs, decimal commas and measurement validation',()=>{
  assert.equal(dateValue('2024-02-29'),'2024-02-29');assert.throws(()=>dateValue('2023-02-29'));
  assert.equal(weightPayload(new Map([['recorded_on','2020-01-01'],['weight_kg','72,35']])).weight_kg,72.35);
  assert.throws(()=>measurementsPayload(new Map([['recorded_on','2020-01-01']])));
  assert.throws(()=>weightPayload(new Map([['recorded_on','2020-01-01'],['weight_kg','-4']])));
});
test('BMI and summaries use observation dates, including backfills and sparse measurements',()=>{
  const a=analyze(snapshot,200,'2025-02-15');assert.equal(a.bmi,20);assert.equal(a.latest.weight_kg,80);assert.equal(a.first.weight_kg,90);assert.equal(a.weeklyAverage,80.5);assert.equal(a.weightChange,-10);assert.equal(a.circumferenceChanges.find(x=>x.field==='waist_cm').change,-5);
  assert.equal(analyze(snapshot,null,'2025-02-15').bmi,null);
  assert.equal(analyze(snapshot,200,'2024-01-01').latest.weight_kg,90);
});
test('calendar supports leap years, Monday alignment and arbitrary month jumps',()=>{
  const feb=monthGrid('2024-02');assert.equal(feb.filter(Boolean).length,29);assert.equal(feb[0],null);assert.equal(feb[3],'2024-02-01');assert.equal(shiftMonth('2025-01',-1),'2024-12');assert.equal(shiftMonth('2000-01',-1),'2000-01');
});
test('share export contains only explicitly selected values and photos',()=>{
  const content=shareContent(snapshot,200,{asOf:'2025-02-15',change:true});assert.deepEqual(content.lines,[{label:'Veränderung seit Beginn',value:'-10 kg'}]);assert.equal(content.date,'');assert.equal(content.photoPath,null);assert.ok(!JSON.stringify(content).includes('80 kg'));assert.ok(!JSON.stringify(content).includes('private/'));
  assert.equal(shareContent(snapshot,200,{asOf:'2025-02-15',photoId:'chosen'}).photoPath,'private/chosen.jpg');
  assert.throws(()=>shareContent(snapshot,200,{asOf:'2025-02-15'}));
});
test('daily recipes are stable across apps, distinct and change the next day',()=>{
  const list=Array.from({length:10},(_,i)=>({id:i+1,title:`Rezept ${i+1}`}));
  const a=selectDailyRecipes(list,'2026-10-27');assert.equal(a.length,2);assert.notEqual(a[0].id,a[1].id);assert.deepEqual(selectDailyRecipes([...list].reverse(),'2026-10-27'),a);assert.notDeepEqual(selectDailyRecipes(list,'2026-10-28'),a);assert.throws(()=>selectDailyRecipes(list,'2023-02-29'));
});
