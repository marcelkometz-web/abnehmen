import test from'node:test';import assert from'node:assert/strict';
import{DEHYDRATOR_DEVICE,DEHYDRATOR_CATALOG,DEHYDRATOR_SOURCES,searchDehydrator,matchDehydratorPlant,dehydratorRecipeUrl,dehydratorGradeAdvice}from'../zuhause/dehydrator-catalog.mjs';

test('catalog has thirty unique, sourced fruit and vegetable entries with bounded real ranges',()=>{
 assert.equal(DEHYDRATOR_CATALOG.length,30);assert.equal(new Set(DEHYDRATOR_CATALOG.map(item=>item.id)).size,30);
 assert.equal(DEHYDRATOR_CATALOG.filter(item=>item.category==='fruit').length,12);
 for(const item of DEHYDRATOR_CATALOG){assert.ok(item.name&&item.preparation&&item.endpoint&&item.cut);assert.ok(['fruit','vegetables'].includes(item.category));assert.equal(item.temperatureC.length,2);assert.equal(item.hours.length,2);assert.ok(item.temperatureC.every(n=>Number.isFinite(n)&&n>=35&&n<=85));assert.ok(item.hours.every(n=>Number.isFinite(n)&&n>0&&n<=72));assert.ok(item.hours[0]<=item.hours[1]);assert.ok(item.temperatureC[0]<=item.temperatureC[1]);for(const id of item.sourceIds)assert.ok(DEHYDRATOR_SOURCES[id]?.url.startsWith('https://'));}
});
test('the verified device is not silently replaced by a similarly named model',()=>{
 assert.equal(DEHYDRATOR_DEVICE.model,'306526');assert.equal(DEHYDRATOR_DEVICE.asin,'B0DD46X95W');assert.equal(DEHYDRATOR_DEVICE.trays,8);assert.equal(DEHYDRATOR_DEVICE.powerW,700);assert.deepEqual(DEHYDRATOR_DEVICE.temperatureC,[35,85]);assert.deepEqual(DEHYDRATOR_DEVICE.timerHours,[.5,24]);assert.equal(DEHYDRATOR_DEVICE.temperatureStepC,5);
});
test('manual and scientific methods stay separate rather than blending times and temperatures',()=>{
 const figs=DEHYDRATOR_CATALOG.find(item=>item.id==='feige');assert.deepEqual(figs.hours,[6,26]);assert.deepEqual(figs.temperatureC,[50,60]);assert.deepEqual(figs.reference.hours,[12,24]);assert.deepEqual(figs.reference.temperatureC,[60,60]);assert.match(figs.preparation,/nicht entkernt/);assert.match(figs.note,/6–12/);
 const chili=DEHYDRATOR_CATALOG.find(item=>item.id==='chili-rot');assert.equal(chili.method,'extension');assert.deepEqual(chili.hours,[12,24]);assert.deepEqual(chili.temperatureC,[60,60]);assert.ok(chili.sourceIds.includes('csuVeg'));
 assert.equal(DEHYDRATOR_CATALOG.find(item=>item.id==='blumenkohl').method,'extension');assert.equal(DEHYDRATOR_CATALOG.find(item=>item.id==='zucchini').method,'extension');
});
test('generic chili does not guess the ripeness and unknown plants do not inherit another species time',()=>{
 assert.equal(matchDehydratorPlant('Chili'),null);assert.equal(matchDehydratorPlant('Peperoni'),null);assert.equal(matchDehydratorPlant('Chili rot Cayenne')?.id,'chili-rot');assert.equal(matchDehydratorPlant('Grüne Peperoni')?.id,'chili-gruen');
 for(const name of['Apfelminze','Bohnenkraut','unbekannt','Tomate und Paprika','Bohne','Dicke Bohne','Sellerie','Orange','Zierkürbis','wilde Tomate'])assert.equal(matchDehydratorPlant(name),null,name);
 assert.equal(matchDehydratorPlant('Feige Brown Turkey')?.id,'feige');assert.equal(matchDehydratorPlant('🍅 Tomate Green Zebra')?.id,'tomate');assert.equal(matchDehydratorPlant('Grüne Bohne')?.id,'bohne');assert.equal(matchDehydratorPlant('Stangensellerie')?.id,'sellerie');
});
test('search handles German spelling and unknown names without fabricated fallbacks',()=>{
 assert.equal(searchDehydrator('FEIGEN')[0].id,'feige');assert.equal(searchDehydrator('Möhren')[0].id,'karotte');assert.equal(searchDehydrator('peperoni').length,2);assert.equal(searchDehydrator('blaue wolkenfrucht').length,0);assert.equal(searchDehydrator('<script>alert(1)</script>').length,0);
 const byHours=searchDehydrator('','hours');for(let i=1;i<byHours.length;i++)assert.ok(byHours[i].hours[0]>=byHours[i-1].hours[0]);assert.equal(DEHYDRATOR_CATALOG[0].id,'apfel');
});
test('recipe deep links only contain known public catalog identifiers',()=>{
 assert.equal(dehydratorRecipeUrl('feige'),'/rezepte/?doerren=feige');assert.equal(dehydratorRecipeUrl({id:'chili-gruen'}),'/rezepte/?doerren=chili-gruen');assert.equal(dehydratorRecipeUrl('https://evil.invalid/'),null);assert.equal(dehydratorRecipeUrl({id:'../../private'}),null);
});
test('dryness grades use physical endpoints and never invent separate hourly guarantees',()=>{
 const fig=DEHYDRATOR_CATALOG.find(item=>item.id==='feige'),chili=DEHYDRATOR_CATALOG.find(item=>item.id==='chili-rot');assert.equal(dehydratorGradeAdvice({id:'unknown'},'powder'),null);assert.match(dehydratorGradeAdvice(fig,'powder'),/keine verlässliche Pulver-Zeit/);assert.match(dehydratorGradeAdvice(chili,'powder'),/Keine Restfeuchte/);assert.match(dehydratorGradeAdvice(chili,'soft'),/kein fertiger Trockenvorrat/);assert.match(dehydratorGradeAdvice(fig,'crisp'),/keine zusätzliche exakte Zeit/);assert.equal(dehydratorGradeAdvice(fig),fig.endpoint);
});
test('the timer limitation and ambiguous source corrections remain explicit',()=>{
 const grapes=DEHYDRATOR_CATALOG.find(item=>item.id==='traube');assert.equal(grapes.hours[1],72);assert.match(grapes.note,/24-Stunden-Timer/);assert.match(grapes.note,/nicht nachweislich automatisch/);
 assert.ok(!DEHYDRATOR_CATALOG.some(item=>item.id==='mandel'||item.id==='pfeffer'||item.id==='pilz'));assert.match(DEHYDRATOR_CATALOG.find(item=>item.id==='pflaume').note,/deutlich kürzer/);assert.match(DEHYDRATOR_CATALOG.find(item=>item.id==='orangenschale').note,/nicht für ganze Orangen/);
});
