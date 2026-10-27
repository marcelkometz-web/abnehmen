const fold=value=>String(value).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='2000-01-01'&&s<='2100-12-31'&&Number.isFinite(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const shift=(date,days)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function todayInZone(zone='Europe/Berlin',now=new Date()){
 try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}catch{throw Error('invalid_timezone');}
}
export function containsSecret(message){return /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b|\bAIza[A-Za-z0-9_-]{25,}\b/.test(message);}
export function parseEntry(message,{today,ownerSpeaking=false,source='chat',sourceDate=null}={}){
 const text=fold(message),question=content=>({kind:'question',question:content});
 const patternList=[
  ['weight_kg',/\b(?:gewicht|wiege|wiegt|wog)\b[^\d\n]{0,35}?(\d+(?:[.,]\d+)?)\s*(kg|kilo(?:gramm)?)\b/g],
  ['weight_kg',/\b(\d+(?:[.,]\d+)?)\s*(kg|kilo(?:gramm)?)\s+wiegen\b/g],
  ['height_cm',/\b(?:koerpergroesse|groesse)\b[^\d\n]{0,20}?(\d+(?:[.,]\d+)?)\s*(cm|m)\b/g],
  ['height_cm',/\b(?:bin|ist)\s+(\d+(?:[.,]\d+)?)\s*(cm|m)\s+gross\b/g],
  ['chest_cm',/\b(?:brust(?:umfang)?)\b[^\d\n]{0,20}?(\d+(?:[.,]\d+)?)\s*(cm)\b/g],
  ['waist_cm',/\b(?:taille(?:numfang)?)\b[^\d\n]{0,20}?(\d+(?:[.,]\d+)?)\s*(cm)\b/g],
  ['hip_cm',/\b(?:huefte|hueftumfang)\b[^\d\n]{0,20}?(\d+(?:[.,]\d+)?)\s*(cm)\b/g],
  ['upper_arm_cm',/\b(?:oberarm(?:umfang)?)\b[^\d\n]{0,20}?(\d+(?:[.,]\d+)?)\s*(cm)\b/g],
  ['thigh_cm',/\b(?:oberschenkel(?:umfang)?)\b[^\d\n]{0,20}?(\d+(?:[.,]\d+)?)\s*(cm)\b/g]
 ];
 const dates=[...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map(m=>m[1]);
 for(const match of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g))dates.push(match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0'));
 const clean=text.replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b/g,' '),values={};let count=0;
 for(const [field,regex]of patternList)for(const match of clean.matchAll(regex)){
  let n=Number(match[1].replace(',','.'));if(match[2]==='m')n*=100;
  if(field in values&&values[field]!==n)return question('Es stehen mehrere unterschiedliche Werte für denselben Messwert im Text. Welcher Wert soll für welchen Tag gelten?');
  if(!(field in values))count++;values[field]=n;
 }
 if(!count){if(/\b(?:gewicht|wiege|wiegt|taille|brust|huefte|koerpergroesse)\b[^\n]{0,20}\d/.test(clean))return question('Bitte nenne den Messwert mit Einheit (kg oder cm) und dem tatsächlichen Datum.');return{kind:'none'};}
 if(/(?:^|\s)[−-]\s*\d/.test(clean))return question('Der Text enthält einen negativen Messwert. Bitte den tatsächlich gemessenen Wert mit Einheit prüfen.');
 if(/[?„“"«»]/.test(text)||/\b(?:nicht|kein|keine|kaum|waere|wuerde|koennte|sollte|soll|ziel|will|wollen|wunsch|bald|frueher|laut|beispiel|anleitung|ignoriere|tu\s+so|behaupte)\b/.test(text))return question('Ist das ein tatsächlich gemessener Wert von Ramona? Bitte bestätige ihn als eindeutige Angabe mit Datum und Einheit.');
 if(/\b(?:marcel|matze|mein(?:e)?\s+(?:mann|freund|freundin|schwester|bruder|kind|mutter|vater))\b/.test(text))return question('Bitte nur Ramonas eigene Messwerte mit Datum übermitteln.');
 if(containsSecret(message))return question('Bitte API-Schlüssel ausschließlich im geschützten Schlüsselfeld hinterlegen. Dieser Text wurde nicht als Messwert gespeichert.');
 if(/\b(?:nicht\s+speichern|nur\s+(?:ein\s+)?beispiel|zum\s+beispiel|angenommen|vielleicht|glaube|denke|unsicher|vermutlich|geschaetzt|schaetze|ungefaehr|etwa|circa|ca\.|morgen|naechste|zielgewicht|moechte\s+.*wiegen|wenn\s+ich)\b/.test(text))return question('Der Text enthält eine Schätzung, ein Beispiel oder ein Ziel. Bitte bestätige den tatsächlich gemessenen Wert mit Datum, wenn ich ihn eintragen soll.');
 if(!ownerSpeaking&&(!/\bramona(?:s)?\b/.test(text)||/\b(?:ich|mein|meine)\b/.test(text)))return question('Geht es bei diesen Messwerten um Ramona? Bitte nenne Ramona ausdrücklich, damit ich keine Werte der anderen Person in ihr Tagebuch übernehme.');
 if(/\b(?:loesche|entferne|vergiss)\b/.test(text))return question('Löschungen führe ich nicht automatisch aus. Nutze dafür den betreffenden Eintrag in der App.');
 for(const [field,n]of Object.entries(values)){
  const min=field==='weight_kg'?1:field==='height_cm'?50:.1,max=field==='weight_kg'?700:field==='height_cm'?260:500,d=field==='weight_kg'?100:10;
  if(!Number.isFinite(n)||n<min||n>max||Math.abs(n*d-Math.round(n*d))>1e-6)return question('Bitte prüfe Messwert und Einheit. Der Wert passt nicht zum zulässigen Eingabebereich.');
 }
 let reference=today;if(source==='import'){if(sourceDate&&!validDate(sourceDate))return question('Bitte das tatsächliche Datum des ursprünglichen Chats angeben.');reference=sourceDate;}
 const relative=[];if(/\bvorgestern\b/.test(text))relative.push(-2);if(/\bgestern\b/.test(text))relative.push(-1);if(/\bheute\b/.test(text))relative.push(0);
 if(new Set(dates).size>1||relative.length>1||dates.length&&relative.length)return question('Bitte übermittle nur einen Messtag pro Nachricht, damit die Zuordnung eindeutig bleibt.');
 if(dates.some(date=>!validDate(date)))return question('Das Datum ist nicht gültig. Bitte Tag, Monat und Jahr prüfen.');
 let day=dates[0]||(reference&&relative.length?shift(reference,relative[0]):null);
 if(!day&&count===1&&values.height_cm)day=today;
 if(!day)return question(source==='import'?'Von welchem Tag stammen die Messwerte? Für „heute“ oder „gestern“ brauche ich das Datum des ursprünglichen Chats.':'Für welchen Tag soll ich die gemessenen Werte eintragen? Bitte Datum, heute oder gestern dazuschreiben.');
 if(day>today)return question('Der Messtag liegt in der Zukunft. Bitte nenne das tatsächliche Aufnahmedatum.');
 return{kind:'entry',day,values,correction:/\b(?:korrigiere|korrektur|ersetze|aendere|berichtige)\b/.test(text),note:'Aus ausdrücklich genannten Chat-Angaben übernommen.'};
}
export function entryConflict(entry,{weights,measurements,height}){
 if(entry.kind!=='entry'||entry.correction)return null;
 const weight=weights.find(r=>r.recorded_on===entry.day),body=measurements.find(r=>r.recorded_on===entry.day);
 for(const [field,value]of Object.entries(entry.values)){
  const existing=field==='weight_kg'?weight?.weight_kg:field==='height_cm'?height:body?.[field];
  if(existing!==null&&existing!==undefined&&Number(existing)!==value)return 'Für dieses Datum ist bereits ein anderer Wert gespeichert. Soll der vorhandene Eintrag korrigiert werden? Schreibe die Korrektur mit Datum und neuem Messwert ausdrücklich dazu.';
 }
 return null;
}
function actionDay(text,{today,source,sourceDate}){
 const dates=[...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map(m=>m[1]);for(const m of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g))dates.push(m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'));
 const rel=[];if(/\bvorgestern\b/.test(text))rel.push(-2);if(/\bgestern\b/.test(text))rel.push(-1);if(/\bheute\b/.test(text))rel.push(0);
 if(new Set(dates).size>1||rel.length>1||dates.length&&rel.length)return null;
 const reference=source==='import'?sourceDate:today,day=dates[0]||(reference&&validDate(reference)&&rel.length?shift(reference,rel[0]):null);
 return day&&validDate(day)&&day<=today?day:null;
}
export function parseAppAction(message,options){
 const text=fold(message),measurement=parseEntry(message,options),q=question=>({kind:'question',question});
 const cycle=/\b(?:periode|periodenbeginn|blutung)\b/.test(text),train=/\b(?:laufband|gummiband|gummibaender|bandtraining|krafttraining|koerpergewichtstraining)\b/.test(text)&&/\d+\s*(?:minuten|min)\b/.test(text);
 if(measurement.kind!=='none'){if(measurement.kind==='entry'&&(cycle||train))return q('Bitte Messwerte und Training oder Zyklus einzeln senden, damit Datum und Angaben eindeutig zugeordnet werden.');return measurement;}
 if(!cycle&&!train)return measurement;
 if(/[?„“"«»]/.test(text)||/\b(?:nicht|kein|keine|waere|wuerde|koennte|sollte|soll|ziel|will|denke|unsicher|vermutlich)\b/.test(text))return q('Bitte bestätige Ramonas tatsächliche Angabe mit Datum als eindeutigen Eintrag.');
 if(cycle&&train)return q('Bitte Zyklus und Training einzeln mit dem tatsächlichen Datum übermitteln.');
 if(containsSecret(message)||/\b(?:vielleicht|glaube|geschaetzt|schaetze|ungefaehr|etwa|circa|morgen|naechste|moechte|plane|werde|beispiel|angenommen|loesche|nicht\s+speichern)\b/.test(text))return q('Ist dies tatsächlich passiert oder noch ein Plan? Bitte bestätige die genaue Angabe mit Datum.');
 if(!options.ownerSpeaking&&(!/\bramona(?:s)?\b/.test(text)||/\b(?:ich|mein|meine)\b/.test(text)))return q('Bitte bestätige, dass diese Angaben zu Ramona gehören.');
 if(/\b(?:marcel|matze|mein(?:e)?\s+(?:mann|freund|freundin|schwester|bruder|kind|mutter|vater))\b/.test(text))return q('Bitte nur Ramonas eigene Angaben mit eindeutigem Datum übermitteln.');
 const day=actionDay(text,options);if(!day)return q('Für welchen tatsächlichen Tag gilt die Angabe? Bei eingefügten Chats brauche ich auch das ursprüngliche Gesprächsdatum.');
 if(cycle){if(!/\b(?:begonnen|beginn|begann|startete|angefangen|fing)\b/.test(text))return q('An welchem Tag hat die Periode tatsächlich begonnen? Bitte den Beginn ausdrücklich nennen.');return{kind:'cycle',day,values:{recorded_on:day,end_on:null,note:''}};}
 const activities=[[/\blaufband\b/,'treadmill'],[/\b(?:gummiband|gummibaender|bandtraining)\b/,'bands'],[/\b(?:krafttraining|koerpergewichtstraining)\b/,'bodyweight']].filter(([r])=>r.test(text));
 const times=[...text.matchAll(/\b(\d+)\s*(?:minuten|min)\b/g)];if(activities.length!==1||times.length!==1)return q('Bitte eine abgeschlossene Trainingsart und deren tatsächliche Dauer pro Nachricht nennen.');
 const minutes=Number(times[0][1]),effortMatch=text.match(/\b(?:anstrengung|rpe)\s*(\d{1,2})(?:\s*\/\s*10)?\b/),effort=effortMatch?Number(effortMatch[1]):null;
 if(minutes<1||minutes>300||effort!==null&&(effort<1||effort>10))return q('Bitte Trainingsdauer und Anstrengung prüfen.');
 if(!/\b(?:gemacht|trainiert|absolviert|war|habe|ging|gegangen)\b/.test(text)&&!/\btraining\s*(?:heute|gestern|\d)/.test(text))return q('Hast du diese Einheit bereits absolviert? Bitte als abgeschlossenes Training mit Datum bestätigen.');
 const band=/\b(?:leichtes|leicht)\b/.test(text)?'light':/\b(?:mittleres|mittel)\b/.test(text)?'medium':/\b(?:kraeftiges|starkes|kraeftig)\b/.test(text)?'firm':null;
 return{kind:'training',day,values:{recorded_on:day,kind:activities[0][1],minutes,effort,band_level:band,note:''}};
}
