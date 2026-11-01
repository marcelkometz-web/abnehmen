export const measurements = [
  ['chest_cm', 'Brust'], ['waist_cm', 'Taille'], ['hip_cm', 'Hüfte'],
  ['upper_arm_cm', 'Oberarm'], ['thigh_cm', 'Oberschenkel']
];
export const views = { front: 'Vorne', side: 'Seite', back: 'Hinten', other: 'Sonstige' };
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31' || new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value) {
    throw new Error('Bitte ein gültiges Datum eingeben.');
  }
  return value;
}
export function numberValue(value, max, decimals = 1) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error('Bitte eine gültige Zahl eingeben.');
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > max) throw new Error(`Bitte einen Wert zwischen 0 und ${max} eingeben.`);
  if (Math.abs(n * 10 ** decimals - Math.round(n * 10 ** decimals)) > 1e-7) throw new Error(`Bitte höchstens ${decimals} Nachkommastellen verwenden.`);
  return n;
}
export function noteValue(value) {
  const text = String(value || '').trim();
  if (text.length > 1000) throw new Error('Die Notiz darf höchstens 1000 Zeichen lang sein.');
  return text;
}
export function weightPayload(form) {
  const weight = numberValue(form.get('weight_kg'), 700, 2);
  if (weight < 1) throw new Error('Bitte ein Gewicht ab 1 kg eingeben.');
  return { recorded_on: dateValue(form.get('recorded_on')), weight_kg: weight, note: noteValue(form.get('note')) };
}
export function measurementsPayload(form) {
  const result = { recorded_on: dateValue(form.get('recorded_on')), note: noteValue(form.get('note')) };
  for (const [field] of measurements) {
    const raw = String(form.get(field) || '').trim();
    result[field] = raw ? numberValue(raw, 500) : null;
  }
  if (!measurements.some(([field]) => result[field] !== null)) throw new Error('Bitte mindestens ein Körpermaß eingeben.');
  return result;
}
export function photoPath(userId, id) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!uuid.test(userId) || !uuid.test(id)) throw new Error('Ungültige Foto-Zuordnung.');
  return `${userId}/${id}.jpg`;
}

export function monthGrid(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Ungültiger Monat.');
  const [year, number] = month.split('-').map(Number);
  if (year < 2000 || year > 2100 || number < 1 || number > 12) throw new Error('Ungültiger Monat.');
  const first = new Date(year, number - 1, 1, 12);
  const days = new Date(year, number, 0, 12).getDate();
  return [...Array((first.getDay() + 6) % 7).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
}
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number);
  const next = localDate(new Date(year, number - 1 + delta, 1, 12)).slice(0, 7);
  return next < '2000-01' ? '2000-01' : next > '2100-12' ? '2100-12' : next;
}
export function analyze(data, height, today = localDate()) {
  // Compare by observation date, never by upload time. Backfilled records cannot
  // accidentally become the "current" weight just because they were uploaded now.
  const weights = [...data.weights].filter(row => row.recorded_on <= today).sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
  const body = [...data.measurements].filter(row => row.recorded_on <= today).sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
  const first = weights[0] || null, latest = weights.at(-1) || null;
  const bmi = latest && Number(height) >= 50 && Number(height) <= 260 ? Number(latest.weight_kg) / (Number(height) / 100) ** 2 : null;
  const start = new Date(today + 'T12:00:00'); start.setDate(start.getDate() - 6);
  const recent = weights.filter(row => row.recorded_on >= localDate(start));
  const circumferenceChanges = measurements.map(([field, label]) => {
    const rows = body.filter(row => row[field] !== null && row[field] !== undefined);
    return { field, label, first: rows[0] || null, latest: rows.at(-1) || null,
      change: rows.length > 1 ? Number(rows.at(-1)[field]) - Number(rows[0][field]) : null };
  });
  return { first, latest, bmi, weightChange: first && latest ? Number(latest.weight_kg) - Number(first.weight_kg) : null,
    weeklyAverage: recent.length ? recent.reduce((sum, row) => sum + Number(row.weight_kg), 0) / recent.length : null,
    recentCount: recent.length, circumferenceChanges, weightCount: weights.length, photoCount: data.photos.length };
}

// This provenance is calculated by the server, never authored by the model.
// Keep it compact enough to accompany the existing bounded tip/message columns.
export function assistantEvidence({today,revision,weights=[],measurements:body=[],training=[],cycles=[],height,analysis},capturedAt=new Date().toISOString()) {
  dateValue(today);
  const series=(rows,key)=>{const valid=rows.filter(row=>typeof row?.[key]==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row[key])&&row[key]<=today);return[valid.length,valid.map(row=>row[key]).sort().at(-1)||null];};
  const sources=[series(weights,'recorded_on'),series(body,'recorded_on'),series(training,'recorded_on'),series(cycles,'recorded_on')];
  const confirmedHeight=Number.isFinite(Number(height))&&Number(height)>=50&&Number(height)<=260;
  const missing=[];if(!confirmedHeight)missing.push('height');
  for(const[key,index]of[['weights',0],['measurements',1],['training',2],['cycles',3]])if(!sources[index][0])missing.push(key);
  return{asOf:today,at:new Date(capturedAt).toISOString(),revision:Number.isSafeInteger(Number(revision))?Number(revision):0,sources,height:confirmedHeight?Number(height):null,
    bmi:confirmedHeight&&Number.isFinite(analysis?.bmi)?Math.round(analysis.bmi*1000)/1000:null,weightDate:analysis?.latest?.recorded_on||null,missing};
}
export function packAssistantContent(content,evidence,maxLength=8000){
  let text=String(content||'').trim();
  if(!evidence)return text.slice(0,maxLength);
  const encode=value=>JSON.stringify({kind:'ab-evidence-v1',text:value,basis:evidence});
  if(encode('').length>maxLength)throw new Error('Die Datenbasis überschreitet die erlaubte Länge.');
  if(encode(text).length<=maxLength)return encode(text);
  let low=0,high=text.length;
  while(low<high){const middle=Math.ceil((low+high)/2);if(encode(text.slice(0,middle)).length<=maxLength)low=middle;else high=middle-1;}
  return encode(text.slice(0,low));
}
export function readAssistantContent(content){
  const raw=String(content||'');
  if(raw.length<=8000&&raw.startsWith('{'))try{
    const value=JSON.parse(raw),basis=value?.basis;
    if(value?.kind==='ab-evidence-v1'&&typeof value.text==='string'&&basis&&/^\d{4}-\d{2}-\d{2}$/.test(basis.asOf)&&typeof basis.at==='string'&&Number.isFinite(Date.parse(basis.at))&&Array.isArray(basis.sources)&&basis.sources.length===4&&basis.sources.every(row=>Array.isArray(row)&&row.length===2&&Number.isSafeInteger(row[0])&&row[0]>=0&&(row[1]===null||/^\d{4}-\d{2}-\d{2}$/.test(row[1])))&&Array.isArray(basis.missing))return{text:value.text,evidence:basis};
  }catch{}
  return{text:raw,evidence:null};
}
export function confirmedAssistantMemory(preferences={}){
  const allowed=['birth_year','activity_level','reported_loss_kg','reported_loss_approx','remaining_goal_min','remaining_goal_max','goal_baseline_weight_kg','goal_baseline_recorded_on','cycle_length_days'];
  const facts=Object.fromEntries(allowed.filter(key=>Object.hasOwn(preferences||{},key)).map(key=>[key,preferences[key]]));
  return'Bestätigte gespeicherte Profilangaben: '+JSON.stringify(facts)+'. Andere Chat-Aussagen sind Gesprächsmaterial, keine bestätigten Gesundheitsdaten. KI-Vermutungen werden nicht als neue persönliche Fakten gespeichert.';
}
