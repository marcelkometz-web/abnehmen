import test from'node:test';import assert from'node:assert/strict';
import{SEED_GUIDES,SEED_SOURCES,SEED_CATEGORIES,seedGuide,searchSeedGuides,matchSeedPlant,seedCultivarStatus}from'../zuhause/seed-saving-catalog.mjs';

test('fourteen public, bounded crop guides have exact source links and no stored cultivar verdict',()=>{
 assert.equal(SEED_GUIDES.length,14);assert.equal(new Set(SEED_GUIDES.map(item=>item.id)).size,14);
 for(const item of SEED_GUIDES){assert.ok(Object.hasOwn(SEED_CATEGORIES,item.category));assert.equal(item.steps.length,3);assert.ok(item.harvest&&item.caution&&item.cycle&&item.method);assert.ok(item.sourceIds.length);for(const id of item.sourceIds)assert.equal(new URL(SEED_SOURCES[id].url).protocol,'https:');assert.equal(item.isOpenPollinated,undefined);assert.equal(item.germinationRate,undefined);assert.equal(item.storageYears,undefined);assert.equal(item.family_id,undefined);}
 assert.equal(Object.isFrozen(SEED_GUIDES),true);assert.equal(Object.isFrozen(seedGuide('tomate').steps),true);
});
test('named cultivars are not silently treated as open-pollinated, and F1 remains explicit',()=>{
 assert.match(seedCultivarStatus('Tomate Green Zebra'),/nicht bestätigt/);
 assert.match(seedCultivarStatus('Tomate Beispiel F1'),/nicht zuverlässig sortenecht/);
 assert.match(seedCultivarStatus('Paprika F-1 Muster'),/F1-/);
 assert.match(seedCultivarStatus('Chili Hybrid'),/F1-/);
 assert.match(seedCultivarStatus(),/Packung|Saatgutpackung/);
});
test('crop headings match conservatively; ambiguous, unrelated, ornamental and special species do not inherit guidance',()=>{
 for(const name of['Unbekannte Pflanze','Apfelminze','Unbekannte Pflanze Tomate','Tomate und Paprika','Zierkürbis','Mexikanische Minigurke','Kichererbse','Dicke Bohne','Feuerbohne','Bohne','Feldsalat','Endivie','Rucola','Chinakohl'])assert.equal(matchSeedPlant(name),null,name);
 assert.equal(matchSeedPlant('🍅 Tomate Green Zebra')?.id,'tomate');assert.equal(matchSeedPlant('Paprika Sweet F1')?.id,'paprika-chili');assert.equal(matchSeedPlant('Peperoni Cayenne')?.id,'paprika-chili');assert.equal(matchSeedPlant('Buschbohne Golden Wax')?.id,'gartenbohne');assert.equal(matchSeedPlant('Rote Bete Detroit')?.id,'bete-mangold');assert.equal(matchSeedPlant('Erdbeere Polka')?.id,'erdbeere');
});
test('search supports German spellings, safe unknowns and category whitelists without mutating the catalogue',()=>{
 assert.equal(searchSeedGuides('MÖHRE')[0].id,'mohre');assert.equal(searchSeedGuides('Moehre')[0].id,'mohre');assert.equal(searchSeedGuides('Peperoni')[0].id,'paprika-chili');assert.equal(searchSeedGuides('Bohne')[0].id,'gartenbohne');assert.equal(searchSeedGuides('Apfel')[0].id,'apfel-birne');
 assert.deepEqual(searchSeedGuides('Blaue Wolkenfrucht'),[]);assert.deepEqual(searchSeedGuides('<script>alert(1)</script>'),[]);assert.deepEqual(searchSeedGuides('','__proto__'),[]);assert.equal(searchSeedGuides('','fruit').length,2);assert.equal(SEED_GUIDES[0].id,'tomate');
});
test('biennial and cross-pollinated crops retain their actual conditions instead of universal calendar claims',()=>{
 assert.match(seedGuide('mohre').cycle,/zwei/);assert.match(seedGuide('bete-mangold').cycle,/zwei/);assert.match(seedGuide('bete-mangold').caution,/Beta vulgaris/);assert.match(seedGuide('zwiebel').cycle,/Folgesaison/);assert.match(seedGuide('radieschen').cycle,/ein- oder zweijährig/);
 assert.match(seedGuide('gurke').caution,/Bestäubung/);assert.match(seedGuide('kohl').caution,/keine pauschale/);assert.match(seedGuide('salat').caution,/Lactuca sativa/);
});
test('cucurbit guidance rejects unknown food seed lineage and does not claim cooking neutralizes bitterness',()=>{
 const g=seedGuide('kurbis-zucchini');assert.match(g.steps[0],/unbekannter Bestäubung keinen Nachbau/);assert.match(g.caution,/Cucurbita pepo/);assert.match(g.caution,/Bittere Früchte nicht essen/);assert.match(g.caution,/Erhitzen beseitigt die Giftstoffe nicht/);assert.match(g.caution,/Aussehen allein/);
});
test('fruit seed experiments remain distinct from vegetative variety preservation',()=>{
 assert.match(seedGuide('apfel-birne').method,/kein Sortenklon/);assert.match(seedGuide('apfel-birne').caution,/nicht dieselbe/);assert.match(seedGuide('apfel-birne').steps[2],/Veredelung/);assert.match(seedGuide('erdbeere').method,/Ausläufer/);assert.match(seedGuide('erdbeere').caution,/keine Samen/);assert.match(seedGuide('erdbeere').steps[2],/nach der Bewurzelung/);
});
test('unsafe or unknown IDs cannot become URLs or borrowed seed instructions',()=>{
 for(const id of['__proto__','constructor','../../private','https://evil.invalid/',null,{},'','feige'])assert.equal(seedGuide(id),null);
});
