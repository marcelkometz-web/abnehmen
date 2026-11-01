import {localDate} from './domain.mjs';
import {PROGRESS_EXERCISES,BAND_LABELS,exerciseLogPayload,progressionAdvice,sameExerciseLog} from './training-progress.mjs';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const labelDate=day=>new Date(day+'T12:00:00').toLocaleDateString('de-DE');
const errorText=error=>['42501','PGRST301'].includes(error?.code)?'Kein Zugriff. Bitte erneut anmelden.':'Die Übungsdaten konnten nicht gespeichert oder geladen werden. Bitte Verbindung prüfen und erneut versuchen.';
function field(form,name,text,{type='text',value='',min,max,required=false,maxLength}={}){const label=el('label',text),input=el('input');input.type=type;input.name=name;input.defaultValue=value;input.value=value;input.required=required;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;if(maxLength)input.maxLength=maxLength;if(type==='number')input.inputMode='numeric';label.append(input);form.append(label);return input;}
function select(form,name,text,options){const label=el('label',text),input=el('select');input.name=name;for(const[value,title]of options){const option=el('option',title);option.value=value;input.append(option);}label.append(input);form.append(label);return input;}
function check(form,name,text,checked=false){const label=el('label',undefined,'check'),input=el('input');input.type='checkbox';input.name=name;input.checked=checked;input.defaultChecked=checked;label.append(input,document.createTextNode(text));form.append(label);return input;}

export class TrainingProgressUI{
 constructor({client,host,onSaved=()=>{},onError=()=>{},isActive=()=>true}){
  this.client=client;this.host=host;this.onSaved=onSaved;this.onError=onError;this.isActive=isActive;this.rows=[];this.epoch=0;this.loadRequest=0;this.pending=null;this.savingDraft=null;this.loaded=false;this.busy=false;this.mount();
 }
 mount(){
  const heading=el('h2','Deine Kraftübungen: Fortschritt & Belastung');this.host.append(heading,el('p','Dokumentiere jede Kraftübung als Tageszusammenfassung. Bei einseitigen Übungen zählen die Wiederholungen je Seite. Trainingsdauer und ganze Einheiten bleiben im bisherigen Trainingsprotokoll.','hint'));
  const details=el('details'),summary=el('summary','💪 Übung protokollieren und Aufbau prüfen');details.append(summary);this.host.append(details);
  this.form=el('form');this.form.id='exercise-progress-form';details.append(this.form);
  const grid=el('div',undefined,'form-grid');this.form.append(grid);
  this.day=field(grid,'recorded_on','Trainingstag',{type:'date',value:localDate(),min:'2000-01-01',max:localDate(),required:true});
  this.exercise=select(grid,'exercise_id','Kraftübung',PROGRESS_EXERCISES.map(ex=>[ex.id,ex.name]));this.exercise.value='tube-squat';this.exercise.selectedOptions[0].defaultSelected=true;
  this.band=select(grid,'band_level','Relative Bandstärke',Object.entries(BAND_LABELS));
  this.band.value='light';this.band.selectedOptions[0].defaultSelected=true;field(grid,'band_label','Welches Band? (optional)',{maxLength:80});
  field(grid,'sets','Absolvierte Sätze',{type:'number',value:'2',min:1,max:6,required:true});
  field(grid,'reps','Wiederholungen je Satz / Seite',{type:'number',value:'8',min:1,max:30,required:true});
  field(grid,'effort','Anstrengung von 1 bis 10',{type:'number',min:1,max:10,required:true});
  check(this.form,'completed','Alle angegebenen Sätze und Wiederholungen abgeschlossen');
  check(this.form,'technique_ok','Die Ausführung war kontrolliert und sauber');
  check(this.form,'pain','Während oder nach dieser Übung hatte ich Schmerzen');
  const noteLabel=el('label','Notiz (optional)'),note=el('textarea');note.name='note';note.maxLength=1000;note.rows=2;noteLabel.append(note);this.form.append(noteLabel);
  const readiness=el('div',undefined,'form-grid');this.form.append(readiness);
  this.energy=select(readiness,'readiness_energy','Wie fühlst du dich heute?',[['normal','Gut / normal'],['low','Wenig Energie – leichter planen']]);
  this.symptoms=select(readiness,'readiness_symptom','Aktuelle Beschwerden',[['none','Keine angegeben'],['discomfort','Schmerzen / Beschwerden'],['chest-pain','Brustschmerz'],['dizziness','Schwindel'],['unusual-breathlessness','Starke ungewohnte Atemnot']]);
  this.form.append(el('p','Befinden und aktuelle Beschwerden dienen diesem Vorschlag und werden hier nicht als Diagnose gespeichert. Wiederholungen sind deine eigene Angabe, keine automatische Technikprüfung.','hint'));
  this.advice=el('div',undefined,'wellbeing-metric');this.advice.id='exercise-progress-advice';this.advice.setAttribute('role','status');this.form.append(this.advice);
  this.status=el('p','Noch kein Übungsprotokoll geladen.','hint');this.status.setAttribute('role','status');this.form.append(this.status);
  this.submit=el('button','Übungsfortschritt speichern');this.submit.type='submit';this.form.append(this.submit);
  this.form.addEventListener('input',()=>{this.form.dataset.dirty='true';this.updateAdvice();});
  this.form.addEventListener('change',()=>{this.form.dataset.dirty='true';this.updateAdvice();});
  this.form.addEventListener('submit',event=>{event.preventDefault();this.save();});
  const historyDetails=el('details');historyDetails.append(el('summary','Deine gespeicherten Übungsprotokolle'));this.history=el('div');historyDetails.append(this.history);this.host.append(historyDetails);
  this.host.append(el('p','Aufbauvorschläge sind feste, nachvollziehbare Regeln: mindestens zwei vergleichbare, als sauber bestätigte und schmerzfreie Einheiten, jeweils mit Erholung dazwischen. Die App erkennt keine Technikfehler auf Bildern und erhöht keine Belastung automatisch.','hint'));
  this.updateAdvice();
 }
 active(generation=this.epoch){return generation===this.epoch&&this.isActive();}
 clear(){this.epoch++;this.loadRequest++;this.rows=[];this.loaded=false;this.pending=null;this.savingDraft=null;this.busy=false;this.form.reset();this.day.value=localDate();this.day.max=localDate();delete this.form.dataset.dirty;delete this.form.dataset.busy;this.form.removeAttribute('aria-busy');for(const control of this.form.elements)control.disabled=false;this.status.textContent='Noch kein Übungsprotokoll geladen.';this.history.replaceChildren();this.advice.replaceChildren();}
 async load(){
  if(!this.isActive())return;const generation=this.epoch,request=++this.loadRequest,rows=[];
  try{for(let offset=0;;offset+=500){const result=await this.client.from('ab_exercise_logs').select('*').order('recorded_on',{ascending:false}).order('id').range(offset,offset+499);if(!this.active(generation)||request!==this.loadRequest)return;if(result.error)throw result.error;rows.push(...result.data);if(result.data.length<500)break;}if(!this.active(generation)||request!==this.loadRequest)return;this.render({rows});}
  catch(error){if(this.active(generation)&&request===this.loadRequest){this.status.textContent='Übungsprotokolle konnten nicht geladen werden. Deine Eingaben bleiben erhalten.';this.onError(errorText(error),true);}}
 }
 render({rows=this.rows}={}){if(!this.isActive())return;this.rows=rows.slice();this.loaded=true;this.history.replaceChildren();
  this.status.textContent=this.rows.length?this.rows.length+' gespeicherte Tagesprotokolle.':'Noch keine Kraftübungen protokolliert.';
  if(!this.rows.length)this.history.append(el('p','Dein erstes Übungsprotokoll erscheint nach dem Speichern.','hint'));
  for(const row of this.rows.slice().sort((a,b)=>b.recorded_on.localeCompare(a.recorded_on)).slice(0,40)){
   const exercise=PROGRESS_EXERCISES.find(ex=>ex.id===row.exercise_id);if(!exercise)continue;const item=el('article',undefined,'entry');item.append(el('small',labelDate(row.recorded_on)),el('strong',exercise.name),el('p',row.sets+' × '+row.reps+' · '+BAND_LABELS[row.band_level]+(row.band_label?' ('+row.band_label+')':'')+' · Anstrengung '+row.effort+'/10'),el('p',(row.completed?'Abgeschlossen':'Nicht vollständig abgeschlossen')+' · '+(row.technique_ok?'Ausführung selbst als sauber bestätigt':'Ausführung nicht bestätigt')+(row.pain?' · Schmerzen angegeben':''),'hint'));
   if(row.note)item.append(el('p',row.note,'note'));
   const remove=el('button','Protokoll löschen','danger');remove.type='button';remove.addEventListener('click',()=>this.remove(row,remove));item.append(remove);this.history.append(item);
  }
  if(this.rows.length>40)this.history.append(el('p','Die letzten 40 Protokolle werden hier angezeigt. Alle geladenen Protokolle werden für den Vergleich berücksichtigt.','hint'));this.updateAdvice();
 }
 updateAdvice(){if(!this.isActive())return;const advice=progressionAdvice(this.rows,{exerciseId:this.exercise.value,today:localDate(),energy:this.energy.value,symptoms:this.symptoms.value==='none'?[]:[this.symptoms.value]});this.advice.replaceChildren(el('strong',advice.title),el('p',advice.message));if(advice.evidence.length)this.advice.append(el('small','Grundlage: '+advice.evidence.map(r=>labelDate(r.recorded_on)+' · '+r.sets+' × '+r.reps+' · '+r.effort+'/10').join(' / ')));}
 setBusy(value){this.busy=value;if(value){this.form.dataset.busy='true';this.form.setAttribute('aria-busy','true');}else{delete this.form.dataset.busy;this.form.removeAttribute('aria-busy');}for(const control of this.form.elements)control.disabled=value;}
 async save(){
  if(this.busy||!this.isActive())return;const generation=this.epoch;let payload;
  const draft=new FormData(this.form);
  try{payload=exerciseLogPayload(draft);}catch(error){this.status.textContent=error.message;return;}
  this.savingDraft=[...draft];
  if(!this.pending||!sameExerciseLog(this.pending,payload))this.pending={...payload,id:crypto.randomUUID()};
  const operation={...this.pending};this.setBusy(true);this.status.textContent='Dein Übungsfortschritt wird gespeichert …';
  try{
   if(!this.active(generation))return;
   let result=await this.client.from('ab_exercise_logs').insert(operation).select('*').single();
   if(!this.active(generation))return;
   if(result.error?.code==='23505'){
    result=await this.client.from('ab_exercise_logs').select('*').eq('recorded_on',operation.recorded_on).eq('exercise_id',operation.exercise_id).maybeSingle();
    if(!this.active(generation))return;
    if(!result.error&&(!result.data||!sameExerciseLog(result.data,operation)))throw Error('Für diese Übung und diesen Tag gibt es bereits ein anderes Protokoll. Prüfe es bitte; zum Korrigieren kannst du es gezielt löschen und neu erfassen.');
   }
   if(result.error)throw result.error;
   if(!result.data||!sameExerciseLog(result.data,operation))throw Error('Die gespeicherten Angaben konnten nicht bestätigt werden. Bitte erneut laden.');
   const readiness={energy:this.energy.value,symptom:this.symptoms.value};
   this.pending=null;delete this.form.dataset.dirty;this.form.reset();this.energy.value=readiness.energy;this.symptoms.value=readiness.symptom;this.day.value=localDate();this.day.max=localDate();
   await this.load();if(!this.active(generation))return;this.status.textContent='Übungsfortschritt für '+labelDate(operation.recorded_on)+' gespeichert.';
   try{await this.onSaved(result.data);}catch{if(this.active(generation))this.status.textContent='Der Übungsfortschritt ist gespeichert. Die übrige Übersicht konnte noch nicht aktualisiert werden; bitte später erneut laden.';}
  }catch(error){if(this.active(generation)){this.status.textContent=error.code?errorText(error):error.message;this.onError(this.status.textContent,true);}}
  finally{if(this.active(generation)){this.savingDraft=null;this.setBusy(false);}}
 }
 async remove(row,button){
  if(this.busy||!this.isActive()||!confirm('Nur dieses Übungsprotokoll vom '+labelDate(row.recorded_on)+' löschen?'))return;
  const generation=this.epoch;this.setBusy(true);button.disabled=true;
  try{const result=await this.client.from('ab_exercise_logs').delete().eq('id',row.id).select('id').single();if(!this.active(generation))return;if(result.error)throw result.error;await this.load();if(this.active(generation)){try{await this.onSaved({deleted:true,id:row.id});}catch{if(this.active(generation))this.status.textContent='Das Protokoll ist gelöscht. Die übrige Übersicht konnte noch nicht aktualisiert werden.';}}}
  catch(error){if(this.active(generation))this.onError(errorText(error),true);}
  finally{if(this.active(generation)){this.setBusy(false);button.disabled=false;}}
 }
}
