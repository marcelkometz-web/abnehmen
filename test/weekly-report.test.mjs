import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyReport,reportWeek} from '../src/weekly-report.mjs';

const options={asOf:'2026-10-28',today:'2026-11-01'};
test('week boundaries use Monday and Sunday independently of daylight saving changes',()=>{
 assert.deepEqual(reportWeek('2026-10-28'),{asOf:'2026-10-28',start:'2026-10-26',end:'2026-11-01',observedUntil:'2026-10-28',previousStart:'2026-10-19',previousEnd:'2026-10-25',complete:false});
 assert.equal(reportWeek('2026-11-01').complete,true);
 assert.equal(reportWeek('2024-01-01').previousStart,'2023-12-25');
 assert.throws(()=>reportWeek('2026-02-30'));
 assert.throws(()=>weeklyReport({}, {asOf:'2026-11-02',today:'2026-11-01'}));
});
test('an empty or sparse diary remains unknown rather than zero or an invented trend',()=>{
 const empty=weeklyReport({},options);assert.equal(empty.weight.bmi,null);assert.equal(empty.weight.change,null);assert.equal(empty.weight.currentMedian,null);assert.equal(empty.weight.trend,null);assert.equal(empty.cycle,null);assert.equal(empty.training.count,0);assert.ok(empty.wellbeing.every(item=>item.average===null));
 const sparse=weeklyReport({weights:[{recorded_on:'2026-10-27',weight_kg:82}]},{...options,height:160});assert.equal(sparse.weight.currentMedian,82);assert.equal(sparse.weight.previousMedian,null);assert.equal(sparse.weight.change,null);assert.equal(sparse.weight.bmi,82/1.6**2);assert.equal(sparse.weight.trend,null);
});
test('weekly weigh-ins compare real observations and ignore future uploads and invalid values',()=>{
 const report=weeklyReport({weights:[{recorded_on:'2026-10-20',weight_kg:'83',created_at:'2026-11-01'},{recorded_on:'2026-10-27',weight_kg:'82'},{recorded_on:'2026-10-29',weight_kg:30},{recorded_on:'2026-10-28',weight_kg:''},{recorded_on:'2026-02-30',weight_kg:35}]},options);
 assert.equal(report.weight.currentCount,1);assert.equal(report.weight.previousCount,1);assert.equal(report.weight.change,-1);assert.deepEqual(report.weight.currentDates,['2026-10-27']);assert.equal(report.weight.latest.date,'2026-10-27');assert.equal(report.weight.bmi,null);
 const multiple=weeklyReport({weights:[{recorded_on:'2026-10-19',weight_kg:100},{recorded_on:'2026-10-20',weight_kg:110},{recorded_on:'2026-10-26',weight_kg:98},{recorded_on:'2026-10-27',weight_kg:99},{recorded_on:'2026-10-28',weight_kg:120}]},options);assert.equal(multiple.weight.currentMedian,99);assert.equal(multiple.weight.previousMedian,105);assert.equal(multiple.weight.change,-6);
});
test('body measurements compare the same fields only when both weeks have actual values',()=>{
 const snapshot={measurements:[{recorded_on:'2026-10-10',hip_cm:120},{recorded_on:'2026-10-20',waist_cm:100,chest_cm:null},{recorded_on:'2026-10-21',waist_cm:99},{recorded_on:'2026-10-27',waist_cm:98,hip_cm:115,chest_cm:''}]};const report=weeklyReport(snapshot,options);
 assert.equal(report.circumference.find(item=>item.field==='waist_cm').change,-1);assert.equal(report.circumference.find(item=>item.field==='hip_cm').change,null);assert.equal(report.circumference.find(item=>item.field==='chest_cm').current,null);assert.equal(snapshot.measurements[0].recorded_on,'2026-10-10');
});
test('actual sessions and period entries are described without inferred body composition or wellbeing',()=>{
 const report=weeklyReport({training:[{recorded_on:'2026-10-26',kind:'bands',minutes:30,effort:8},{recorded_on:'2026-10-26',kind:'treadmill',minutes:20,effort:5},{recorded_on:'2026-10-27',kind:'strength-a',minutes:25},{recorded_on:'2026-10-29',kind:'bands',minutes:300}],cycles:[{recorded_on:'2026-10-24',end_on:'2026-10-29'},{recorded_on:'2026-11-20'}]},options);
 assert.equal(report.training.count,3);assert.equal(report.training.minutes,75);assert.equal(report.training.days,2);assert.equal(report.training.strengthDays,2);assert.equal(report.training.averageEffort,6.5);assert.equal(report.cycle.start,'2026-10-24');assert.equal(report.cycle.end,null);assert.equal(report.cycle.daysSinceStart,4);assert.ok(report.wellbeing.every(item=>item.count===0));assert.ok(report.actions.some(item=>item.code==='recovery'));
});
test('longer observed rapid loss prompts recovery instead of escalating the weight loss target',()=>{
 const report=weeklyReport({weights:[{recorded_on:'2026-10-01',weight_kg:90},{recorded_on:'2026-10-15',weight_kg:86},{recorded_on:'2026-10-27',weight_kg:82}]},options);assert.equal(report.weight.trend.days,26);assert.equal(report.weight.trend.rapidLoss,true);assert.equal(report.actions[0].code,'rapid-loss');
 assert.equal(weeklyReport({weights:[{recorded_on:'2026-10-27',weight_kg:82}]},{...options,height:0}).weight.bmi,null);assert.equal(weeklyReport({weights:[{recorded_on:'2026-10-27',weight_kg:82}]},{...options,height:261}).weight.bmi,null);
});
test('only expressly present wellbeing fields are summarized and zero sleep remains an entered value',()=>{
 const report=weeklyReport({wellbeing:[{recorded_on:'2026-10-26',energy:2,mood:3,sleep_hours:0},{recorded_on:'2026-10-27',energy:4,mood:null,sleep_hours:8},{recorded_on:'2026-10-29',energy:5,mood:5,sleep_hours:10}]},options);assert.equal(report.wellbeing.find(item=>item.field==='energy').average,3);assert.equal(report.wellbeing.find(item=>item.field==='mood').count,1);assert.equal(report.wellbeing.find(item=>item.field==='sleep_hours').average,4);
});
