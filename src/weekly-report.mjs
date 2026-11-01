import {localDate,measurements} from './domain.mjs';

const DAY=86400000;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const dayNumber=value=>Math.floor(Date.parse(value+'T12:00:00Z')/DAY);
const dateFromDay=value=>new Date(value*DAY).toISOString().slice(0,10);
const numeric=(value,min,max)=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):null;
const sortRows=(rows,asOf)=>Array.isArray(rows)?rows.filter(row=>row&&validDate(row.recorded_on)&&row.recorded_on<=asOf).slice().sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on)||String(a.id||'').localeCompare(String(b.id||''))):[];
const inRange=(row,start,end)=>row.recorded_on>=start&&row.recorded_on<=end;
const median=values=>{if(!values.length)return null;const sorted=values.slice().sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};

export function reportWeek(asOf=localDate()){
 if(!validDate(asOf))throw new Error('Bitte ein gültiges Berichtsdatum wählen.');
 const day=dayNumber(asOf),weekDay=(new Date(asOf+'T12:00:00Z').getUTCDay()+6)%7,start=day-weekDay;
 return {asOf,start:dateFromDay(start),end:dateFromDay(start+6),observedUntil:asOf,previousStart:dateFromDay(start-7),previousEnd:dateFromDay(start-1),complete:weekDay===6};
}

/** Observed records only: neither missed measurements nor unknown wellbeing are imputed. */
export function weeklyReport(snapshot={},options={}){
 const asOf=options.asOf??localDate(),week=reportWeek(asOf),realToday=options.today??localDate();
 if(!validDate(realToday)||asOf>realToday)throw new Error('Der Bericht kann nur bis zu einem bereits erreichten Tag erstellt werden.');
 const weights=sortRows(snapshot.weights,asOf).filter(row=>numeric(row.weight_kg,1,700)!==null);
 const currentWeights=weights.filter(row=>inRange(row,week.start,asOf)),previousWeights=weights.filter(row=>inRange(row,week.previousStart,week.previousEnd));
 const currentMedian=median(currentWeights.map(row=>Number(row.weight_kg))),previousMedian=median(previousWeights.map(row=>Number(row.weight_kg))),latest=weights.at(-1)||null;
 const height=numeric(options.height,50,260);
 const body=sortRows(snapshot.measurements,asOf);
 const circumference=measurements.map(([field,label])=>{
  const rows=body.filter(row=>numeric(row[field],.1,500)!==null),current=rows.filter(row=>inRange(row,week.start,asOf)).at(-1)||null,previous=rows.filter(row=>inRange(row,week.previousStart,week.previousEnd)).at(-1)||null;
  return {field,label,current:current?{date:current.recorded_on,value:Number(current[field])}:null,previous:previous?{date:previous.recorded_on,value:Number(previous[field])}:null,change:current&&previous?Number(current[field])-Number(previous[field]):null};
 });
 const training=sortRows(snapshot.training,asOf).filter(row=>inRange(row,week.start,asOf)&&numeric(row.minutes,1,300)!==null);
 const previousTraining=sortRows(snapshot.training,asOf).filter(row=>inRange(row,week.previousStart,week.previousEnd)&&numeric(row.minutes,1,300)!==null);
 const strengthKinds=new Set(['bands','bodyweight','strength-a','strength-b']);
 const totalMinutes=training.reduce((sum,row)=>sum+Number(row.minutes),0),trainingDays=new Set(training.map(row=>row.recorded_on));
 const strengthDays=new Set(training.filter(row=>strengthKinds.has(row.kind)).map(row=>row.recorded_on));
 const effort=training.map(row=>numeric(row.effort,1,10)).filter(value=>value!==null);
 const cycles=sortRows(snapshot.cycles,asOf),cycle=cycles.at(-1)||null;
 const recent=weights.filter(row=>dayNumber(asOf)-dayNumber(row.recorded_on)<=35),first=recent[0],last=recent.at(-1),span=first&&last?dayNumber(last.recorded_on)-dayNumber(first.recorded_on):0;
 const trend=span>=14?{days:span,count:recent.length,firstDate:first.recorded_on,lastDate:last.recorded_on,perWeek:(Number(last.weight_kg)-Number(first.weight_kg))*7/span,rapidLoss:(Number(first.weight_kg)-Number(last.weight_kg))*7/span/Number(first.weight_kg)>.01}:null;
 // This optional collection is accepted only as explicitly entered data. Nothing
 // is inferred from notes, body weight, cycle timing or exercise effort.
 const wellbeing=sortRows(snapshot.wellbeing,asOf).filter(row=>inRange(row,week.start,asOf));
 const wellbeingFields=[['energy','Energie',1,5],['mood','Stimmung',1,5],['sleep_hours','Schlafdauer',0,24]].map(([field,label,min,max])=>{
  const rows=wellbeing.filter(row=>numeric(row[field],min,max)!==null);
  return {field,label,count:rows.length,average:rows.length?rows.reduce((sum,row)=>sum+Number(row[field]),0)/rows.length:null};
 });
 const missing=[];
 if(!currentWeights.length)missing.push('Für diese Woche ist kein Gewicht eingetragen.');
 if(!previousWeights.length)missing.push('Für die Vorwoche fehlt ein Gewicht; ein Wochenvergleich bleibt offen.');
 if(height===null)missing.push('Ohne bestätigte Körpergröße bleibt der BMI unbekannt.');
 if(!circumference.some(item=>item.change!==null))missing.push('Es liegen keine vergleichbaren Körpermaße aus beiden Wochen vor.');
 if(!wellbeingFields.some(item=>item.count))missing.push('Dein Wohlbefinden wurde für diese Woche nicht als auswertbarer Eintrag erfasst.');
 const actions=[{code:'steady',text:'Wöchentliches Wiegen unter ähnlichen Bedingungen reicht aus. Du musst keine täglichen Werte nachtragen.'},
  {code:'muscle',text:'Zum Muskelerhalt gehören regelmäßiges verträgliches Krafttraining, ausreichende Mahlzeiten und Erholung. Die App berechnet daraus keine unbekannte Muskelmasse.'}];
 if(!training.length)actions.push({code:'no-training-record',text:'Es ist kein Training dokumentiert. Das bedeutet nicht, dass du dich nicht bewegt hast; trage absolvierte Einheiten bei Bedarf nach.'});
 else if(effort.some(value=>value>=8))actions.push({code:'recovery',text:'Mindestens eine Einheit war mit 8/10 oder höher als anstrengend eingetragen. Plane Erholung und steigere erst, wenn sich die Ausführung wieder gut und beschwerdefrei anfühlt.'});
 if(trend?.rapidLoss)actions.unshift({code:'rapid-loss',text:'Über mindestens zwei Wochen ist eine schnelle Abnahme von mehr als 1 % des Ausgangsgewichts pro Woche dokumentiert. Achte auf Energie, Kraft und ausreichendes Essen. Bei anhaltendem Tempo oder Beschwerden bitte fachlich begleiten lassen.'});
 return {week,weight:{currentMedian,previousMedian,change:currentMedian!==null&&previousMedian!==null?currentMedian-previousMedian:null,currentCount:currentWeights.length,previousCount:previousWeights.length,currentDates:currentWeights.map(row=>row.recorded_on),previousDates:previousWeights.map(row=>row.recorded_on),latest:latest?{date:latest.recorded_on,value:Number(latest.weight_kg)}:null,bmi:latest&&height!==null?Number(latest.weight_kg)/(height/100)**2:null,height,trend},circumference,
  training:{count:training.length,minutes:totalMinutes,days:trainingDays.size,strengthDays:strengthDays.size,previousCount:previousTraining.length,previousMinutes:previousTraining.reduce((sum,row)=>sum+Number(row.minutes),0),effortCount:effort.length,averageEffort:effort.length?effort.reduce((sum,value)=>sum+value,0)/effort.length:null,dates:[...trainingDays].sort()},
  cycle:cycle?{start:cycle.recorded_on,end:validDate(cycle.end_on)&&cycle.end_on<=asOf?cycle.end_on:null,daysSinceStart:dayNumber(asOf)-dayNumber(cycle.recorded_on),recordedThisWeek:inRange(cycle,week.start,asOf)}:null,
  wellbeing:wellbeingFields,missing,actions};
}
