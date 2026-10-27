import {localDate,dateValue,noteValue,numberValue} from './domain.mjs';
const dayNumber=date=>Math.round(Date.parse(date+'T12:00:00Z')/86400000);
export function cycleInfo(entries,length,today=localDate()){
 const rows=entries.filter(row=>row.recorded_on<=today).slice().sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on));
 const last=rows.at(-1);if(!last)return null;
 const day=dayNumber(today)-dayNumber(last.recorded_on)+1;
 return {start:last.recorded_on,end:last.end_on||null,day,length:Number.isInteger(Number(length))&&Number(length)>=18&&Number(length)<=45?Number(length):null,
  note:'Zyklus und Flüssigkeit können die Waage beeinflussen. Daraus lässt sich kein Fettzuwachs ableiten. Der BMI wird nicht um einen angenommenen Zykluswert korrigiert.'};
}
export function weightTrend(weights,today=localDate()){
 const rows=weights.filter(r=>r.recorded_on<=today&&dayNumber(today)-dayNumber(r.recorded_on)<=35).slice().sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on));
 if(rows.length<2)return null;const first=rows[0],last=rows.at(-1),days=dayNumber(last.recorded_on)-dayNumber(first.recorded_on);
 if(days<14)return null;
 const perWeek=(Number(last.weight_kg)-Number(first.weight_kg))*7/days;
 return {perWeek,days,measurements:rows.length,rapidLoss:perWeek<0&&-perWeek/Number(first.weight_kg)>.01};
}
export function goalProjection(preferences,height){
 const baseline=Number(preferences?.goal_baseline_weight_kg),min=Number(preferences?.remaining_goal_min),max=Number(preferences?.remaining_goal_max);
 if(!baseline||!min||!max)return null;
 const light=baseline-max,heavy=baseline-min,h=Number(height)/100;
 return {light,heavy,lowBmi:h>0?light/(h*h):null,needsReview:light<=0||(h>=.5&&light/(h*h)<18.5)};
}
export function normalizeSocial(value,platform){
 const raw=String(value||'').trim();if(!raw)return null;
 const handle=raw.replace(/^@/,'');let url;
 try{url=new URL(raw.includes('://')?raw:platform==='instagram'?'https://www.instagram.com/'+handle+'/':platform==='tiktok'?'https://www.tiktok.com/@'+handle:'https://www.youtube.com/@'+handle);}catch{throw Error('Bitte einen gültigen Profil-Link angeben.');}
 const host=url.hostname.toLowerCase().replace(/^www\./,'');
 const allowed={instagram:'instagram.com',tiktok:'tiktok.com',youtube:'youtube.com'};
 const pattern=platform==='instagram'?/^\/[A-Za-z0-9_.]+\/?$/:platform==='tiktok'?/^\/@[A-Za-z0-9_.]+\/?$/:/^\/(?:@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+)\/?$/;
 if(url.protocol!=='https:'||host!==allowed[platform]||url.username||url.password||!pattern.test(url.pathname))throw Error('Bitte den persönlichen '+platform+'-Profil-Link verwenden.');
 if(platform==='instagram'&&/^\/(?:p|reel|stories|accounts|explore)\/?$/.test(url.pathname))throw Error('Bitte das Profil statt eines Beitrags verlinken.');
 return 'https://www.'+host+url.pathname.replace(/\/$/,'')+(platform==='instagram'?'/':'');
}
export function profilePayload(form){
 const optional=(key,max)=>String(form.get(key)||'').trim()?numberValue(form.get(key),max,1):null;
 const birth=optional('birth_year',new Date().getFullYear()),cycle=optional('cycle_length_days',45);
 if(birth!==null&&(!Number.isInteger(birth)||birth<1900||birth>new Date().getFullYear()-18))throw Error('Das Trainingsangebot richtet sich an Erwachsene. Bitte das Geburtsjahr prüfen.');
 if(cycle!==null&&(!Number.isInteger(cycle)||cycle<18))throw Error('Bitte die bekannte Zykluslänge zwischen 18 und 45 Tagen eingeben oder leer lassen.');
 const min=optional('remaining_goal_min',200),max=optional('remaining_goal_max',200);
 if((min===null)!==(max===null))throw Error('Bitte beide Grenzen des gewünschten Zielbereichs eintragen oder beide leer lassen.');
 if(min!==null&&max!==null&&min>max)throw Error('Bitte die Reihenfolge des gewünschten Zielbereichs prüfen.');
 return {birth_year:birth,activity_level:['active','gentle'].includes(form.get('activity_level'))?form.get('activity_level'):null,
  reported_loss_kg:optional('reported_loss_kg',500),reported_loss_approx:form.has('reported_loss_approx'),remaining_goal_min:min,remaining_goal_max:max,cycle_length_days:cycle,motivation_enabled:form.has('motivation_enabled'),
  instagram_url:normalizeSocial(form.get('instagram_url'),'instagram'),tiktok_url:normalizeSocial(form.get('tiktok_url'),'tiktok'),youtube_url:normalizeSocial(form.get('youtube_url'),'youtube')};
}
export function trainingPayload(form){
 const recorded_on=dateValue(form.get('recorded_on'));if(recorded_on>localDate())throw Error('Bitte ein bereits absolviertes Training eintragen.');
 const minutes=numberValue(form.get('minutes'),300,0),raw=String(form.get('effort')||'').trim(),effort=raw?numberValue(raw,10,0):null;
 const kind=form.get('kind'),band_level=form.get('band_level');
 if(!['treadmill','bodyweight','bands','strength-a','strength-b','mobility'].includes(kind)||!['none','light','medium','firm'].includes(band_level))throw Error('Bitte Trainingsart und Band wählen.');
 return{recorded_on,kind,minutes,effort,band_level,note:noteValue(form.get('note'))};
}
export function cyclePayload(form){
 const recorded_on=dateValue(form.get('recorded_on')),end=String(form.get('end_on')||'').trim(),end_on=end?dateValue(end):null;
 if(recorded_on>localDate()||end_on&&end_on>localDate())throw Error('Bitte tatsächliche Periodentage eintragen, keine Vorhersage.');
 if(end_on&&(end_on<recorded_on||dayNumber(end_on)-dayNumber(recorded_on)>20))throw Error('Bitte Anfang und Ende prüfen. Bei ungewöhnlich lang anhaltender Blutung ärztlichen Rat einholen.');
 return{recorded_on,end_on,note:noteValue(form.get('note'))};
}
export function savedStateLabel(state){
 if(!state?.last_saved_at)return 'Noch kein Speicherzeitpunkt erfasst. Nach deiner nächsten Speicherung erscheint er hier.';
 const date=new Date(state.last_saved_at);if(!Number.isFinite(date.getTime()))return 'Der Speicherzeitpunkt konnte nicht gelesen werden.';
 return 'Zuletzt gespeichert: '+date.toLocaleDateString('de-DE')+' um '+date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+(state.last_recorded_on?' · Eintrag vom '+new Date(state.last_recorded_on+'T12:00:00').toLocaleDateString('de-DE'):' · Profilstand');
}
