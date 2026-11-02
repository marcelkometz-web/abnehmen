/* Shared private weekly plan. No plan rows or drafts are written to browser storage. */
(()=>{
 'use strict';
 const BASE='https://wwybkswpyoyowciumxda.supabase.co',KEY='sb_publishable_-pwXCK8cRaDEj2EQJiRvTQ_spOoDIbv',AUTH='sb-wwybkswpyoyowciumxda-auth-token',ORIGIN=location.origin;
 const HUB_PATHS=['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'],APPS=['garten','rezepte','abnehmen'];
 const hub=self===top&&HUB_PATHS.includes(location.pathname)&&document.documentElement.dataset.appShell==='unser-zuhause-v1';
 let framed=false;try{framed=window.unserZuhauseFrame===true&&parent===top&&parent.location.origin===ORIGIN&&HUB_PATHS.includes(parent.location.pathname)&&parent.document.documentElement.dataset.appShell==='unser-zuhause-v1';}catch{}
 if(self!==top&&!framed)return;
 if(!hub&&!APPS.some(app=>location.pathname.startsWith('/'+app+'/')))return;
 const corePromise=import('/abnehmen/zuhause/planning-core.mjs?v=20261101-plan');
 let configuredSession=null,core,dialog,body,status,title,form,fields={},listHost,shoppingHost,weekInput,weekLabel,busy=false,opening=false,systemClosing=false,polling=false;
 let loadSerial=0;let generation=0,identity=null,rows=[],currentWeek=null,selected=null,pausedDraft=null,initialRecipe=null,ingredientsServings=1,editorIngredients=[],pendingCreateId=null;
 const controllers=new Set();
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=(text,action,cls='plan-button')=>{const el=node('button',text,cls);el.type='button';el.addEventListener('click',action);return el;};
 const announce=text=>{if(status){status.textContent=text||'';status.hidden=!text;}};
 function storedSession(){try{const shared=localStorage.getItem(AUTH),raw=shared||(localStorage.getItem(AUTH+':shared-v1')?null:sessionStorage.getItem(AUTH));if(!raw||raw.length>262144)return null;return JSON.parse(raw);}catch{return null;}}
 function sessionIdentity(session){try{const body=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return String(session.user.id)+':'+String(body.session_id||'');}catch{return null;}}
 async function getSession(){
  const session=configuredSession?await configuredSession():storedSession();
  let activity=0,recovery='';try{activity=Number(localStorage.getItem(AUTH+':activity')||sessionStorage.getItem(AUTH+':activity'));recovery=localStorage.getItem(AUTH+':recovery')||sessionStorage.getItem(AUTH+':recovery')||'';}catch{}
  const now=Date.now();
  if(!session?.access_token||!session?.user?.id||!sessionIdentity(session)||!Number.isFinite(activity)||activity<=0||activity>now+60000||now-activity>=600000||recovery||session.expires_at&&Number(session.expires_at)*1000<=now)throw Error('Bitte zuerst in einer App anmelden. Nach zehn Minuten ohne Bedienung ist eine erneute Anmeldung nötig.');
  return session;
 }
 async function request(path,options={},verify=true){
  const stamp=generation,check=()=>{if(stamp!==generation)throw new DOMException('Die Planansicht wurde geschlossen.','AbortError');};
  const session=await getSession();check();const actor=sessionIdentity(session);
  if(identity&&actor!==identity){clearPrivate();throw Error('Die Anmeldung hat sich geändert. Bitte den Wochenplan erneut öffnen.');}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);controllers.add(controller);
  const headers={apikey:KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...(options.headers||{})};
  const fetchJSON=async(url,opts)=>{check();const res=await fetch(url,{...opts,cache:'no-store',credentials:'omit',signal:controller.signal});check();if(!res.ok){if(res.status===401||res.status===403){clearPrivate();if(body){body.replaceChildren(node('p','Der private Wochenplan ist nur für eure freigeschalteten Konten verfügbar. Bitte erneut anmelden.','plan-muted'));if(!dialog.open)dialog.showModal();document.documentElement.classList.add('weekly-plan-open');}throw Error('Der private Wochenplan ist nur für eure freigeschalteten Konten verfügbar. Bitte erneut anmelden.');}if(res.status===409){const error=Error('Dieser Planeintrag wurde bereits gespeichert. Bitte den Wochenplan aktualisieren und den vorhandenen Eintrag bearbeiten.');error.code=409;throw error;}if(res.status===404)throw Error('Der Wochenplan ist noch nicht freigeschaltet. Bitte später erneut öffnen.');throw Error('Der Wochenplan konnte nicht gespeichert oder geladen werden. Bitte die Verbindung prüfen.');}const data=res.status===204?null:await res.json();check();return data;};
  try{
   if(verify){const user=await fetchJSON(BASE+'/auth/v1/user',{headers});if(user?.id!==session.user.id)throw Error('Die Anmeldung konnte nicht bestätigt werden.');const diary=await fetchJSON(BASE+'/rest/v1/rpc/ab_current_diary',{method:'POST',headers,body:'{}'});if(!diary)throw Error('Nur eure zwei freigeschalteten Tagebuchkonten haben Zugriff auf diesen Wochenplan.');}
   const result=await fetchJSON(BASE+path,{...options,headers});
   const latest=await getSession();if(stamp!==generation||sessionIdentity(latest)!==actor)throw Error('Die Anmeldung oder Ansicht hat sich geändert. Bitte neu laden.');
   return{data:result,actor};
  }catch(error){if(controller.signal.aborted&&stamp===generation)throw Error('Die Verbindung hat zu lange gebraucht. Deine Eingabe bleibt erhalten; bitte erneut versuchen.');throw error;}finally{clearTimeout(timeout);controllers.delete(controller);}
 }
 function safeError(error){if(error?.name==='AbortError')return;announce(error?.message||'Der Wochenplan konnte nicht geöffnet werden.');}
 function markBusy(value){busy=value;if(form){form.toggleAttribute('data-busy',value);form.setAttribute('aria-busy',String(value));}dialog?.querySelectorAll('button,input,select,textarea').forEach(el=>{el.disabled=value;});}
 function isDirty(){return Boolean(form?.dataset.dirty);}
 function captureDraft(){if(!form||!isDirty())return null;return{actor:identity,week:currentWeek,selected,values:Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.type==='checkbox'?input.checked:input.value])),ingredientsServings,recipe:initialRecipe,pendingCreateId};}
 function clearPrivate({keepDraft=false}={}){
  if(keepDraft)pausedDraft=captureDraft();else pausedDraft=null;
  generation++;for(const ctrl of controllers)ctrl.abort();controllers.clear();rows=[];identity=null;selected=null;editorIngredients=[];initialRecipe=null;pendingCreateId=null;opening=false;busy=false;
  systemClosing=true;if(dialog?.open)dialog.close();systemClosing=false;
  body?.replaceChildren();fields={};form=null;listHost=null;shoppingHost=null;announce('');document.documentElement.classList.remove('weekly-plan-open');
 }
 async function readWeek({quiet=false}={}){
  const stamp=generation,serial=++loadSerial,targetWeek=currentWeek;if(!quiet)announce('Dein Wochenplan wird geladen …');
  const end=core.addDays(currentWeek,6),path='/rest/v1/ab_week_plan?select=id,planned_on,kind,slot,title,recipe_id,servings,ingredients,minutes,done,revision,updated_at&and=(planned_on.gte.'+currentWeek+',planned_on.lte.'+end+')&order=planned_on.asc,created_at.asc&limit=1000';
  const result=await request(path);if(stamp!==generation||serial!==loadSerial||targetWeek!==currentWeek)return false;identity=result.actor;rows=Array.isArray(result.data)?result.data:[];renderWeek();if(!quiet)announce(rows.length?'':'Deine Woche ist noch frei. Plane ein Essen, Training oder einen freiwilligen Wiegetermin.');return true;
 }
 function formatDay(day,options={weekday:'short',day:'2-digit',month:'2-digit'}){return new Intl.DateTimeFormat('de-DE',options).format(new Date(day+'T12:00:00'));}
 function renderWeek(){
  if(!listHost)return;weekLabel.textContent=formatDay(currentWeek,{day:'2-digit',month:'2-digit'})+' – '+formatDay(core.addDays(currentWeek,6),{day:'2-digit',month:'2-digit',year:'numeric'});weekInput.value=currentWeek;
  listHost.replaceChildren();
  for(let offset=0;offset<7;offset++){
   const day=core.addDays(currentWeek,offset),section=node('section',undefined,'weekly-plan-day');section.append(node('h3',formatDay(day,{weekday:'long',day:'2-digit',month:'2-digit'})));
   const dayRows=rows.filter(row=>row.planned_on===day);
   if(!dayRows.length)section.append(node('p','Noch nichts geplant.','plan-muted'));
   for(const row of dayRows){
    const card=node('article',undefined,'weekly-plan-entry');card.classList.toggle('plan-done',row.done);const heading=node('div',undefined,'plan-entry-heading');
    const done=node('input');done.type='checkbox';done.checked=row.done;done.setAttribute('aria-label',row.title+' als erledigt markieren');done.addEventListener('change',()=>updateDone(row,done.checked));
    heading.append(done,node('strong',row.title));card.append(heading);
    const detail=core.PLAN_KINDS[row.kind]||'Eintrag',slot=core.MEAL_SLOTS[row.slot];card.append(node('p',detail+(slot?' · '+slot:'')+(row.servings?' · '+Number(row.servings).toLocaleString('de-DE')+' Portionen':'')+(row.minutes?' · '+row.minutes+' Minuten':''),'plan-muted'));
    const actions=node('div',undefined,'plan-actions');actions.append(button('Bearbeiten',()=>{if(isDirty()&&!confirm('Ungespeicherte Plan-Eingabe verwerfen?'))return;fillEditor(row);}),button('Entfernen',()=>removeEntry(row),'plan-button plan-quiet'));card.append(actions);section.append(card);
   }
   section.append(button('+ Für diesen Tag',()=>{if(isDirty()&&!confirm('Ungespeicherte Plan-Eingabe verwerfen?'))return;fillEditor({planned_on:day});}));listHost.append(section);
  }
  renderShopping();updateSaveState();
 }
 function renderShopping(){
  shoppingHost.replaceChildren(node('h3','Deine Einkaufsliste für diese Woche'));
  const list=core.shoppingList(rows);if(!list.length){shoppingHost.append(node('p','Übernimm Rezepte oder trage Zutaten beim geplanten Essen ein. Erledigte Mahlzeiten werden nicht mehr eingerechnet.','plan-muted'));return;}
  const ul=node('ul',undefined,'plan-shopping-list');for(const item of list){const parts=[];if(item.quantity>0)parts.push(item.quantity.toLocaleString('de-DE',{maximumFractionDigits:6})+(item.unit?' '+item.unit:''));if(item.unknown)parts.push(item.unknown+'× Menge offen');ul.append(node('li',item.name+' · '+parts.join(' + ')));}shoppingHost.append(ul,node('p','Die Mengen stammen aus deinen geplanten Rezeptportionen. Unterschiedliche Einheiten bleiben getrennt; unbekannte Mengen werden nicht geschätzt. Prüfe deinen Vorrat vor dem Einkauf.','plan-muted'));
 }
 function field(label,name,type='text'){const wrap=node('label',label),input=node(type==='textarea'?'textarea':type==='select'?'select':'input');if(type!=='textarea'&&type!=='select')input.type=type;input.name=name;wrap.append(input);fields[name]=input;return wrap;}
 function options(input,items){for(const[value,label]of Object.entries(items)){const option=node('option',label);option.value=value;input.append(option);}}
 function createEditor(){
  const section=node('section',undefined,'plan-editor');section.append(node('h3','Eintrag planen oder bearbeiten'));form=node('form');form.id='weekly-plan-form';const grid=node('div',undefined,'plan-form-grid');
  grid.append(field('Tag','planned_on','date'),field('Was möchtest du planen?','kind','select'));options(fields.kind,core.PLAN_KINDS);fields.planned_on.required=true;fields.planned_on.min='2000-01-01';fields.planned_on.max='2100-12-31';
  form.append(grid,field('Titel','title'));fields.title.required=true;fields.title.maxLength=200;
  const meal=node('div',undefined,'plan-meal-fields'),mealGrid=node('div',undefined,'plan-form-grid');mealGrid.append(field('Mahlzeit','slot','select'),field('Portionen insgesamt','servings','number'));options(fields.slot,core.MEAL_SLOTS);fields.servings.min='.25';fields.servings.max='30';fields.servings.step='.25';meal.append(mealGrid,field('Zutaten für die Einkaufsliste','ingredients','textarea'));fields.ingredients.rows=5;fields.ingredients.maxLength=24000;fields.ingredients.placeholder='200 | g | Tomaten\n1 | Stück | Gurke\n | | Pfeffer';meal.append(node('p','Eine Zeile je Zutat: Menge | Einheit | Name. Menge leer lassen, wenn sie unbekannt ist. Bei geänderten Portionen wird eine prüfbare Skalierung angeboten.','plan-muted'));
  meal.append(button('Zutaten auf diese Portionen umrechnen',()=>{try{const current=core.ingredientsFromText(fields.ingredients.value),next=Number(fields.servings.value);const scaled=core.scaleIngredients(current,ingredientsServings,next);fields.ingredients.value=core.ingredientsToText(scaled);ingredientsServings=next;form.dataset.dirty='true';announce('Die Zutaten sind auf '+next.toLocaleString('de-DE')+' Portionen umgerechnet. Bitte prüfen und speichern.');}catch(error){safeError(error);}}));
  const training=node('div',undefined,'plan-training-fields');training.append(field('Geplante Minuten · freiwillig','minutes','number'));fields.minutes.min='1';fields.minutes.max='300';fields.minutes.step='1';
  form.append(meal,training);const hint=node('p','Ein Wiegetermin ist freiwillig. Es wird kein tägliches Wiegen verlangt.','plan-weighin-hint');form.append(hint);
  fields.kind.addEventListener('change',()=>{updateEditorKind();if(!fields.title.value)fields.title.value=fields.kind.value==='weighin'?'Freiwilliger Wiegetermin':fields.kind.value==='training'?'Mein Training':'';});
  const actions=node('div',undefined,'plan-actions'),submit=node('button','Plan speichern','plan-button');submit.type='submit';actions.append(submit,button('Neue Eingabe',()=>{if(isDirty()&&!confirm('Ungespeicherte Plan-Eingabe verwerfen?'))return;fillEditor();},'plan-button plan-quiet'));const saved=node('p',undefined,'plan-muted plan-save-state');form.append(saved,actions);
  form.addEventListener('input',()=>{form.dataset.dirty='true';});form.addEventListener('change',()=>{form.dataset.dirty='true';});form.addEventListener('submit',event=>{event.preventDefault();saveEditor().catch(safeError);});section.append(form);return section;
 }
 function updateSaveState(){const el=form?.querySelector('.plan-save-state');if(!el)return;const dates=rows.map(row=>Date.parse(row.updated_at)).filter(Number.isFinite);el.textContent=dates.length?'Letzte gespeicherte Änderung in dieser Woche: '+new Date(Math.max(...dates)).toLocaleString('de-DE'):'Für diese Woche wurde noch kein Plan gespeichert.';}
 function updateEditorKind(){const kind=fields.kind.value;form.querySelector('.plan-meal-fields').hidden=kind!=='meal';form.querySelector('.plan-training-fields').hidden=kind!=='training';form.querySelector('.plan-weighin-hint').hidden=kind!=='weighin';}
 function fillEditor(value={}){
  pendingCreateId=value.id?null:crypto.randomUUID();initialRecipe=value.recipe_id?{recipe_id:value.recipe_id}:null;selected=value.id?{id:value.id,revision:Number(value.revision),recipe_id:value.recipe_id||null,done:value.done===true}:null;editorIngredients=core.normalizeIngredients(value.ingredients||[]);ingredientsServings=Number(value.servings)||1;
  fields.planned_on.value=value.planned_on||core.localDay();fields.kind.value=value.kind||'meal';fields.title.value=value.title||'';fields.slot.value=value.slot||'dinner';fields.servings.value=String(ingredientsServings);fields.ingredients.value=core.ingredientsToText(editorIngredients);fields.minutes.value=value.minutes||'';delete form.dataset.dirty;updateEditorKind();updateSaveState();
 }
 async function mutate(method,row,payload){
  if(busy)return null;const stamp=generation;markBusy(true);announce('Dein Plan wird gespeichert …');
  try{const query=row?'?id=eq.'+encodeURIComponent(row.id)+'&revision=eq.'+Number(row.revision):'';let result;try{result=await request('/rest/v1/ab_week_plan'+query,{method,headers:{Prefer:'return=representation'},...(payload?{body:JSON.stringify(payload)}:{})});}catch(error){if(method!=='POST'||error.code!==409)throw error;const existing=await request('/rest/v1/ab_week_plan?id=eq.'+encodeURIComponent(payload.id)+'&select=id,planned_on,kind,slot,title,recipe_id,servings,ingredients,minutes,done,revision,updated_at');if(existing.data?.length===1&&JSON.stringify(core.normalizePlan(existing.data[0]))===JSON.stringify(core.normalizePlan(payload)))result=existing;else{await readWeek();throw error;}}if(stamp!==generation)return null;if(!Array.isArray(result.data)||result.data.length!==1){await readWeek();throw Error('Der Eintrag wurde inzwischen geändert. Die Woche wurde aktualisiert; bitte deine Eingabe prüfen und erneut auswählen.');}return result.data[0];}
  finally{if(stamp===generation)markBusy(false);}
 }
 async function saveEditor(){
  if(busy)return;const payload=core.normalizePlan({planned_on:fields.planned_on.value,kind:fields.kind.value,title:fields.title.value,slot:fields.slot.value,servings:fields.servings.value,ingredients:fields.kind.value==='meal'?core.ingredientsFromText(fields.ingredients.value):[],minutes:fields.minutes.value,recipe_id:selected?.recipe_id||initialRecipe?.recipe_id||null,done:selected?.done||false});
  if(payload.kind==='meal'&&Number(payload.servings)!==ingredientsServings&&payload.ingredients.length)throw Error('Bitte Zutaten auf die geänderten Portionen umrechnen oder die ursprüngliche Portionszahl beibehalten.');
  const result=await mutate(selected?'PATCH':'POST',selected,{...payload,...(!selected?{id:pendingCreateId||crypto.randomUUID()}:{})});if(!result)return;delete form.dataset.dirty;initialRecipe=null;currentWeek=core.weekStart(payload.planned_on);const stamp=generation;markBusy(true);try{if(!await readWeek()||stamp!==generation)return;fillEditor({planned_on:payload.planned_on});announce('Gespeichert am '+new Date(result.updated_at).toLocaleString('de-DE')+'.');}finally{if(stamp===generation)markBusy(false);}
 }
 async function updateDone(row,done){try{const result=await mutate('PATCH',row,{done});if(result){await readWeek();announce(done?'Als erledigt gespeichert.':'Wieder als geplant gespeichert.');}}catch(error){safeError(error);renderWeek();}}
 async function removeEntry(row){if(busy||!confirm('„'+row.title+'“ aus dem Wochenplan entfernen?'))return;try{const result=await mutate('DELETE',row);if(result){if(selected?.id===row.id)fillEditor();await readWeek();announce('Der geplante Eintrag wurde entfernt.');}}catch(error){safeError(error);}}
 function mountDialog(){
  if(dialog)return;dialog=node('dialog',undefined,'weekly-plan-dialog');dialog.id='weekly-plan-dialog';dialog.setAttribute('aria-labelledby','weekly-plan-title');const header=node('div',undefined,'plan-header');title=node('h2','Dein gemeinsamer Wochenplan');title.id='weekly-plan-title';header.append(title,button('Schließen',()=>closePlan(),'plan-button plan-quiet'));status=node('p',undefined,'plan-status');status.id='weekly-plan-status';status.setAttribute('role','status');status.hidden=true;body=node('div',undefined,'plan-body');dialog.append(header,status,body);document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePlan();});dialog.addEventListener('close',()=>{document.documentElement.classList.remove('weekly-plan-open');});
 }
 function closePlan(){if(busy)return;if(isDirty()&&!confirm('Ungespeicherte Plan-Eingabe verwerfen?'))return;clearPrivate();}
 function createBody(){
  body.replaceChildren();const nav=node('div',undefined,'plan-week-nav');weekLabel=node('strong');weekLabel.setAttribute('aria-live','polite');weekInput=node('input');weekInput.type='date';weekInput.min='2000-01-01';weekInput.max='2100-12-31';weekInput.setAttribute('aria-label','Zu einer Kalenderwoche springen');
  async function go(day){if(busy)return;if(isDirty()&&!confirm('Ungespeicherte Plan-Eingabe verwerfen?')){weekInput.value=currentWeek;return;}try{currentWeek=core.weekStart(day);fillEditor({planned_on:currentWeek});await readWeek();}catch(error){safeError(error);}}
  nav.append(button('← Woche',()=>go(core.addDays(currentWeek,-7))),weekLabel,button('Woche →',()=>go(core.addDays(currentWeek,7))),weekInput,button('Diese Woche',()=>go(core.localDay())),button('Plan aktualisieren',()=>{if(!busy)readWeek().catch(safeError);}));weekInput.addEventListener('change',()=>go(weekInput.value));
  const privacy=node('p','Gemeinsam nur für eure zwei freigeschalteten Konten. Mahlzeiten, Training und freiwillige Wiegetermine; tatsächliche Gewichte und Fotos bleiben im privaten Tagebuch.','plan-muted');
  listHost=node('div',undefined,'weekly-plan-grid');shoppingHost=node('section',undefined,'plan-shopping');body.append(privacy,nav,listHost,createEditor(),shoppingHost);fillEditor();
 }
 async function open(value=null){
  if(framed){parent.postMessage({type:value?'ZUH_PLAN_RECIPE':'ZUH_PLAN_OPEN',...(value?{recipe:value}:{})},ORIGIN);return;}
  if(opening||busy)return;if(dialog?.open){if(value){try{const draft=core.recipeDraft(value);if(isDirty()&&!confirm('Ungespeicherte Plan-Eingabe verwerfen?'))return;initialRecipe=draft;fillEditor({...draft,planned_on:core.localDay()});form.dataset.dirty='true';}catch(error){safeError(error);}}return;}
  opening=true;mountDialog();const stamp=++generation;
  try{
   core=await corePromise;const session=await getSession(),actor=sessionIdentity(session);if(stamp!==generation)return;identity=actor;currentWeek=core.weekStart(core.localDay());createBody();dialog.showModal();document.documentElement.classList.add('weekly-plan-open');
   if(!await readWeek()||stamp!==generation)return;
   if(value){initialRecipe=core.recipeDraft(value);fillEditor({...initialRecipe,planned_on:core.localDay()});form.dataset.dirty='true';announce('Rezept übernommen. Bitte Tag und Mahlzeit wählen, Zutaten prüfen und speichern.');}
   else if(pausedDraft?.actor===actor){const saved=pausedDraft;pausedDraft=null;currentWeek=saved.week;await readWeek();selected=saved.selected;for(const[key,input]of Object.entries(fields)){if(Object.hasOwn(saved.values,key)){if(input.type==='checkbox')input.checked=saved.values[key];else input.value=saved.values[key];}}ingredientsServings=saved.ingredientsServings;initialRecipe=saved.recipe||null;pendingCreateId=saved.pendingCreateId||crypto.randomUUID();form.dataset.dirty='true';updateEditorKind();announce('Deine ungespeicherte Plan-Eingabe wurde wiederhergestellt.');}
  }catch(error){if(stamp===generation){body?.replaceChildren(node('p',error.message||'Bitte zuerst in einer App anmelden.','plan-muted'));if(!dialog.open){dialog.showModal();document.documentElement.classList.add('weekly-plan-open');}safeError(error);}}
  finally{if(stamp===generation)opening=false;}
 }
 function trustedFrame(event){if(!hub||event.origin!==ORIGIN||!event.source)return false;return [...document.querySelectorAll('#frame-host iframe')].some(frame=>APPS.some(app=>frame.name==='unser-zuhause-'+app)&&frame.contentWindow===event.source);}
 document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-open-week-plan]');if(!trigger||event.defaultPrevented)return;event.preventDefault();open().catch(safeError);});
 window.addEventListener('zuhause:plan-recipe',event=>{if(!event.detail)return;corePromise.then(lib=>{const recipe=lib.recipeDraft(event.detail);open({recipeId:recipe.recipe_id,title:recipe.title,servings:recipe.servings,ingredients:recipe.ingredients}).catch(safeError);}).catch(safeError);});
 window.addEventListener('message',event=>{if(!trustedFrame(event)||!event.data||typeof event.data!=='object')return;if(event.data.type==='ZUH_PLAN_OPEN')open().catch(safeError);if(event.data.type==='ZUH_PLAN_RECIPE')corePromise.then(lib=>{const recipe=lib.recipeDraft(event.data.recipe);return open({recipeId:recipe.recipe_id,title:recipe.title,servings:recipe.servings,ingredients:recipe.ingredients});}).catch(safeError);});
 function mountTriggers(){for(const nav of document.querySelectorAll('.app-shell .sidebar .main-nav')){if(nav.querySelector('[data-open-week-plan]'))continue;const trigger=node('button',undefined,'nav-button weekly-plan-trigger');trigger.type='button';trigger.dataset.openWeekPlan='';trigger.setAttribute('aria-label','Gemeinsamen Wochenplan öffnen');const icon=node('span','📅','nav-symbol');icon.setAttribute('aria-hidden','true');trigger.append(icon,node('span','Plan'));nav.classList.add('has-week-plan');nav.append(trigger);window.appNavigation?.report?.({});}}
 const api=Object.freeze({open,configure(options={}){if(typeof options.getSession==='function')configuredSession=options.getSession;},clear:()=>clearPrivate(),mountTriggers});Object.defineProperty(window,'unserZuhausePlanning',{value:api,writable:false,configurable:false});
 let triggerFrame;new MutationObserver(()=>{if(!triggerFrame)triggerFrame=requestAnimationFrame(()=>{triggerFrame=null;mountTriggers();});}).observe(document.documentElement,{subtree:true,childList:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(dialog?.open)clearPrivate({keepDraft:true});}else if(identity)getSession().then(session=>{if(sessionIdentity(session)!==identity)clearPrivate();}).catch(()=>clearPrivate());});
 window.addEventListener('storage',event=>{if(event.key===AUTH){const session=storedSession();if(identity&&sessionIdentity(session)!==identity)clearPrivate();}});
 window.addEventListener('pagehide',()=>clearPrivate());
 const touch=event=>{if(event.isTrusted===false||document.hidden)return;getSession().then(()=>{const now=Date.now();try{if(now-Number(localStorage.getItem(AUTH+':activity'))>=1000)localStorage.setItem(AUTH+':activity',String(now));}catch{}}).catch(()=>{if(identity)clearPrivate();});};
 for(const name of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(name,touch,{passive:true,capture:true});
 setInterval(()=>{if(identity&&dialog?.open&&!document.hidden&&!busy&&!opening&&!isDirty())readWeek({quiet:true}).catch(safeError);},30000);
 setInterval(async()=>{if(!identity||polling)return;polling=true;try{if(sessionIdentity(await getSession())!==identity)clearPrivate();}catch{clearPrivate();}finally{polling=false;}},1000);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountTriggers,{once:true});else mountTriggers();
})();
