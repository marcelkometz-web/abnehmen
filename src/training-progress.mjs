import {dateValue,localDate,noteValue} from './domain.mjs';
import {EXERCISES} from './training.mjs';

export const PROGRESS_EXERCISES=EXERCISES.filter(ex=>ex.type!=='treadmill');
export const BAND_LABELS={none:'Ohne Band',light:'Leicht',medium:'Mittel',firm:'Kräftig'};
const exercises=new Map(PROGRESS_EXERCISES.map(ex=>[ex.id,ex]));
const dayNumber=date=>Math.round(Date.parse(date+'T12:00:00Z')/86400000);
const bool=value=>value===true||value==='on'||value==='true';
function integer(value,min,max,label){
 const text=String(value??'').trim(),n=Number(text);
 if(!/^\d+$/.test(text)||!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' muss eine ganze Zahl von '+min+' bis '+max+' sein.');
 return n;
}
export function exerciseLogPayload(form,{today=localDate()}={}){
 const get=key=>form.get(key),exercise_id=String(get('exercise_id')||''),band_level=String(get('band_level')||'none');
 if(!exercises.has(exercise_id))throw Error('Bitte eine vorhandene Kraftübung auswählen.');
 if(!Object.hasOwn(BAND_LABELS,band_level))throw Error('Bitte eine gültige relative Bandstärke auswählen.');
 const recorded_on=dateValue(String(get('recorded_on')||''));
 if(recorded_on>dateValue(today))throw Error('Absolviertes Training kann nicht in der Zukunft liegen.');
 const band_label=String(get('band_label')||'').trim();
 if(band_label.length>80)throw Error('Die Bandbezeichnung darf höchstens 80 Zeichen lang sein.');
 return {recorded_on,exercise_id,band_level,band_label:band_level==='none'?'':band_label,
  sets:integer(get('sets'),1,6,'Sätze'),reps:integer(get('reps'),1,30,'Wiederholungen je Satz'),
  effort:integer(get('effort'),1,10,'Anstrengung'),technique_ok:bool(get('technique_ok')),
  pain:bool(get('pain')),completed:bool(get('completed')),note:noteValue(get('note'))};
}
export const LOG_VALUE_KEYS=['recorded_on','exercise_id','band_level','band_label','sets','reps','effort','technique_ok','pain','completed','note'];
export function sameExerciseLog(a,b){return LOG_VALUE_KEYS.every(key=>(a?.[key]??'')===(b?.[key]??''));}
const validDate=value=>{try{return dateValue(value)===value;}catch{return false;}};
const safeRecord=row=>row&&exercises.has(row.exercise_id)&&validDate(row.recorded_on)&&Object.hasOwn(BAND_LABELS,row.band_level)&&typeof row.band_label==='string'&&row.band_label.length<=80&&Number.isInteger(row.sets)&&row.sets>=1&&row.sets<=6&&Number.isInteger(row.reps)&&row.reps>=1&&row.reps<=30&&Number.isInteger(row.effort)&&row.effort>=1&&row.effort<=10;
const comparable=(a,b)=>a.exercise_id===b.exercise_id&&a.band_level===b.band_level&&String(a.band_label||'')===String(b.band_label||'')&&a.sets===b.sets&&a.reps===b.reps;

// Deliberately deterministic: no calorie/fat estimates, inferred resistance or
// automatic prescription. Logged self-assessments are not proof of safe form.
export function progressionAdvice(rows,{exerciseId,today=localDate(),energy='normal',symptoms=[]}={}){
 dateValue(today);const exercise=exercises.get(exerciseId),evidence=[];
 const answer=(kind,title,message,next=null)=>({kind,title,message,evidence:[...evidence],next});
 if(!exercise)return answer('unknown','Übung auswählen','Wähle eine Kraftübung für einen passenden Vorschlag.');
 const easier=exercise.easier;
 if(symptoms.some(s=>['chest-pain','dizziness','unusual-breathlessness'].includes(s)))return answer('stop','Training unterbrechen','Bei Brustschmerz, Schwindel oder starker ungewohnter Atemnot nicht weitertrainieren und medizinische Hilfe suchen; bei akuten starken Beschwerden 112.');
 if(energy==='low'||symptoms.includes('discomfort'))return answer('ease','Heute leichter oder erholen','Du musst heute nichts steigern. Bei Schmerzen die Übung auslassen. Leichtere Möglichkeit: '+easier);
 const ordered=(rows||[]).filter(r=>r&&r.exercise_id===exerciseId&&validDate(r.recorded_on)&&r.recorded_on<=today).slice().sort((a,b)=>b.recorded_on.localeCompare(a.recorded_on)||String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const latest=ordered[0];
 if(!latest)return answer('start','Erst kennenlernen','Beginne mit kontrollierbarer Belastung und etwa zwei bis drei sauberen Wiederholungen als Reserve. '+easier);
 if(!safeRecord(latest))return answer('hold','Angaben zuerst prüfen','Die letzten Übungsangaben sind unvollständig oder ungültig. Bitte zuerst das Protokoll prüfen; daraus wird kein Aufbau abgeleitet.');
 evidence.push({recorded_on:latest.recorded_on,sets:latest.sets,reps:latest.reps,effort:latest.effort});
 if(latest.pain===true)return answer('stop','Beschwerden zuerst beachten','Beim letzten Eintrag wurden Schmerzen angegeben. Diese Übung vorerst auslassen; anhaltende oder wiederkehrende Beschwerden fachlich abklären. Keine automatische Steigerung.');
 if(latest.completed!==true||latest.technique_ok!==true||latest.pain!==false||latest.effort>7)return answer('hold','Belastung beibehalten oder reduzieren','Für einen Aufbau fehlen zuletzt eine vollständig absolvierte, als kontrolliert bestätigte und schmerzfreie Ausführung und moderate Anstrengung (höchstens 7/10). '+easier);
 if(dayNumber(today)-dayNumber(latest.recorded_on)>21)return answer('restart','Nach der Pause neu prüfen','Der letzte Eintrag ist mehr als drei Wochen her. Zunächst leichter wieder einsteigen und die aktuelle Verträglichkeit prüfen. '+easier);
 if(latest.band_level!=='none'&&!String(latest.band_label||'').trim())return answer('identify','Dasselbe Band wiedererkennen','Für einen Vergleich bitte die konkrete Band-/Herstellerbezeichnung ergänzen. Farben, „mittel“ oder aufgedruckte lbs verschiedener Bänder sind nicht vergleichbar.');
 const previous=ordered.find(row=>row.recorded_on<latest.recorded_on);
 if(!previous||!safeRecord(previous)||!comparable(latest,previous)||previous.completed!==true||previous.technique_ok!==true||previous.pain!==false||previous.effort>7||dayNumber(latest.recorded_on)-dayNumber(previous.recorded_on)<2||dayNumber(latest.recorded_on)-dayNumber(previous.recorded_on)>21)return answer('observe','Noch eine vergleichbare Einheit','Erst nach zwei vergleichbaren, vollständig absolvierten und beschwerdefreien Einheiten an getrennten Tagen mit mindestens einem Tag dazwischen wird ein kleiner Aufbau vorgeschlagen. Gleiches Band, gleiche Sätze und Wiederholungen ermöglichen den Vergleich.');
 evidence.push({recorded_on:previous.recorded_on,sets:previous.sets,reps:previous.reps,effort:previous.effort});
 if(dayNumber(today)-dayNumber(latest.recorded_on)<2)return answer('rest','Erholung einplanen','Die beiden Einträge passen zusammen. Trainiere dieselbe Kraftübung frühestens nach einem freien Tag wieder und steigere heute nicht. Leichte Alltagsbewegung ist nach Befinden möglich.');
 const range=exercise.dose.match(/mit (\d+)–(\d+)/),low=range?Number(range[1]):8,high=range?Number(range[2]):12;
 if(latest.reps<low||latest.reps>=high)return answer('maintain','Saubere Ausführung festigen','Behalte die verträgliche Belastung bei. Der Übungsvorschlag liegt bei '+low+'–'+high+' Wiederholungen je Satz. Ein anderes oder stärkeres Band erfordert eine neue vorsichtige Erprobung; die App rechnet keine Farben oder lbs in eine sichere Last um.');
 const next={exercise_id:exerciseId,sets:latest.sets,reps:latest.reps+1,band_level:latest.band_level,band_label:latest.band_label||''};
 return answer('progress','Eine Wiederholung mehr ausprobieren','Bei gutem Befinden kannst du in der nächsten Einheit '+next.reps+' statt '+latest.reps+' Wiederholungen je Satz ausprobieren. Sätze und dasselbe Band bleiben gleich. Nur fortsetzen, wenn die Ausführung kontrolliert und beschwerdefrei bleibt; etwa zwei bis drei Wiederholungen Reserve lassen.',next);
}
