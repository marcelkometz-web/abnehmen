import {localDate} from './domain.mjs';
import {weeklyReport} from './weekly-report.mjs';

const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const date=value=>new Date(value+'T12:00:00').toLocaleDateString('de-DE');
const format=value=>Number(value).toLocaleString('de-DE',{maximumFractionDigits:1});
const signed=value=>(value>0?'+':'')+format(value);

export class WeeklyReportUI{
 constructor({host,onError=()=>{}}){if(!host)throw new Error('Der Wochenbericht benötigt einen Anzeigebereich.');this.host=host;this.onError=onError;this.data=null;this.selectedDate=null;}
 clear(){this.host.replaceChildren();this.data=null;this.selectedDate=null;}
 render(data){
  this.data=data;const asOf=data.asOf??this.selectedDate??localDate();
  let report;try{report=weeklyReport(data.snapshot,{height:data.height,asOf});}catch(error){this.host.replaceChildren(element('h2','Dein Wochenbericht'),element('p',error.message));this.onError(error.message);return;}
  const box=this.host;box.replaceChildren(element('h2','Dein Wochenbericht 💜'));
  const controls=element('form',undefined,'form-grid'),label=element('label','Bericht bis einschließlich'),input=element('input'),button=element('button','Zeitraum anzeigen');input.type='date';input.required=true;input.min='2000-01-01';input.max=localDate();input.value=asOf;input.name='report_date';label.append(input);button.type='submit';controls.append(label,button);
  controls.addEventListener('submit',event=>{event.preventDefault();this.selectedDate=input.value;this.render({...this.data,asOf:this.selectedDate});});box.append(controls);
  box.append(element('p',date(report.week.start)+' bis '+date(report.week.observedUntil)+(report.week.complete?' · Kalenderwoche bis Sonntag':' · Teil der Kalenderwoche bis zum Stichtag')));
  box.append(element('p','Der Bericht fasst gespeicherte Beobachtungen zusammen. Fehlende Tage bleiben offen; er ist keine Diagnose oder Vorhersage.','hint'));
  const metric=(title,text)=>{const item=element('section',undefined,'wellbeing-metric');item.append(element('h3',title),element('p',text));box.append(item);return item;};
  const w=report.weight;
  let weightText=w.currentMedian===null?'Diese Woche ist noch kein Gewicht dokumentiert.':'Mittlerer dokumentierter Wert (Median): '+format(w.currentMedian)+' kg aus '+w.currentCount+' Eintrag/Einträgen.';
  if(w.previousMedian!==null)weightText+=' Vorwoche: '+format(w.previousMedian)+' kg aus '+w.previousCount+' Eintrag/Einträgen.';
  if(w.change!==null)weightText+=' Unterschied der Wochenmediane: '+signed(w.change)+' kg. Einzelne Wiegetage können auch Flüssigkeit, Salz, Verdauung und Messbedingungen abbilden.';
  metric('Gewicht in Ruhe betrachten',weightText);
  if(w.latest)metric('Letzter tatsächlicher Messpunkt',format(w.latest.value)+' kg am '+date(w.latest.date)+(w.bmi===null?' · BMI unbekannt, Körpergröße fehlt.':' · BMI '+format(w.bmi)+' aus '+format(w.height)+' cm bestätigter Körpergröße.')+' Der BMI allein misst weder Körperfett noch Muskelmasse.');
  if(w.trend)metric('Längerer Verlauf',signed(w.trend.perWeek)+' kg pro Woche zwischen '+date(w.trend.firstDate)+' und '+date(w.trend.lastDate)+' ('+w.trend.days+' Tage, '+w.trend.count+' Einträge). Das beschreibt die bisherigen Messpunkte und sagt kein zukünftiges Tempo voraus.');
  const circumference=metric('Körpermaße',report.circumference.some(item=>item.change!==null)?'Verglichen wird jeweils dasselbe Körpermaß aus beiden Wochen. Ein Zentimeterwert wird nicht in Körperfett umgerechnet.':'Für einen Vergleich fehlen passende Körpermaße aus beiden Wochen. Du musst dich dafür nicht täglich messen.');
  const bodyList=element('ul');for(const item of report.circumference){if(item.current)bodyList.append(element('li',item.label+': '+format(item.current.value)+' cm am '+date(item.current.date)+(item.change===null?' · kein Vergleichswert aus der Vorwoche':'; '+signed(item.change)+' cm gegenüber '+date(item.previous.date))));}if(bodyList.childElementCount)circumference.append(bodyList);
  const t=report.training;metric('Bewegung und Kraft',t.count?t.count+' dokumentierte Einheit(en), insgesamt '+t.minutes+' Minuten an '+t.days+' Tag(en). Davon '+t.strengthDays+' Tag(e) mit eingetragenem Kraft-/Bandtraining.'+(t.effortCount?' Durchschnittliche selbst eingetragene Anstrengung: '+format(t.averageEffort)+'/10 aus '+t.effortCount+' Angabe(n).':' Anstrengung nicht angegeben.')+' Die Vorwoche enthält '+t.previousCount+' dokumentierte Einheit(en) mit '+t.previousMinutes+' Minuten.':'Für diese Woche ist kein Training dokumentiert. Nicht eingetragenes Training und Alltagsbewegung sind unbekannt.');
  metric('Zyklus einordnen',report.cycle?'Letzter eingetragener Periodenbeginn: '+date(report.cycle.start)+(report.cycle.end?' · eingetragenes Ende: '+date(report.cycle.end):' · Ende nicht angegeben')+'. Zyklus und Flüssigkeit können das Gewicht beeinflussen. Daraus werden weder ein Fettzuwachs noch eine genaue Zyklusphase abgeleitet. Der BMI wird nicht um einen vermuteten Zykluswert korrigiert.':'Kein Periodenbeginn eingetragen. Eine Angabe ist freiwillig. Die App nimmt ohne Eintrag keine Zyklusphase an und verändert den BMI nicht.');
  const wellbeing=report.wellbeing.filter(item=>item.count);metric('Wohlbefinden',wellbeing.length?wellbeing.map(item=>item.label+': '+format(item.average)+(item.field==='sleep_hours'?' Stunden':'/5')+' aus '+item.count+' ausdrücklichen Angabe(n)').join(' · ')+'.':'Energie, Stimmung und Schlaf sind für diese Woche nicht als auswertbare Angaben vorhanden. Sie werden nicht aus Gewicht, Zyklus oder Training erraten.');
  const action=metric('Was dich jetzt unterstützt','Wähle etwas, das sich in deinen Alltag einfügt. Weniger Gewichtsverlust oder eine einzelne Zunahme sind kein persönlicher Misserfolg.');const actions=element('ul');for(const item of report.actions)actions.append(element('li',item.text));action.append(actions);
  const evidence=element('details'),summary=element('summary','Datengrundlage und offene Angaben');evidence.append(summary);
  const sources=element('ul');sources.append(element('li','Gewicht diese Woche: '+(w.currentDates.map(date).join(', ')||'keine Messpunkte')),element('li','Gewicht Vorwoche: '+(w.previousDates.map(date).join(', ')||'keine Messpunkte')),element('li','Trainingstage diese Woche: '+(t.dates.map(date).join(', ')||'keine Einträge')));for(const missing of report.missing)sources.append(element('li',missing));evidence.append(sources,element('p','Der Bericht wird aus den gespeicherten Einträgen für diesen Zeitraum berechnet. Er erzeugt keine neuen Gesundheitsdaten und benötigt keinen zusätzlichen KI-Aufruf.','hint'));box.append(evidence);
 }
}
