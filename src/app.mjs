import { createClient } from '@supabase/supabase-js';
import { localDate, dateValue, numberValue, measurements, views, monthGrid, shiftMonth, analyze, sortPhotos } from './domain.mjs';
import { allRows, deletePhoto, fail, bucket } from './data.mjs';
import { saveCheckin } from './checkin.mjs';
import { Assistant } from './assistant.mjs';
import { shareContent, makeShareCard } from './share.mjs';
import { DailyRecipes } from './daily-recipes.mjs';
import { setupThemes } from './themes.mjs';
import { setupDialogScrollLock } from './dialogs.mjs';
import { WellbeingUI } from './wellbeing-ui.mjs';
import { profilePayload, trainingPayload, cyclePayload, savedStateLabel, weightTrend } from './wellbeing.mjs';
import { Motivation } from './motivation.mjs';
import { createSharedAuth } from './shared-auth.mjs';
import { recoveryLinkState, recoveryRedirect, newPassword, clearRecoveryURL } from './password-recovery.mjs';

const $ = id => document.getElementById(id);
const formatNumber = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const dateLabel = value => new Date(value + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
let client;
let sharedAuth;
let wellbeing;
let motivation;
let preferences={};
let saveState=null;
let formRevision=0;
let analysisDay=null;
let pausedDraft=null;
let currentPage='checkin';
const pages={checkin:'Check-in',progress:'Auswertung',calendar:'Kalender & Einträge',gallery:'Fotogalerie',training:'Training',nutrition:'Essen & Rezepte',profile:'Profil & Zyklus'};
let recoveryPending = false;
let resetOpen = false;
let user = null;
let diaryId = null;
let heightCm = null;
let selectedDay = localDate();
let visibleMonth = selectedDay.slice(0, 7);
let refreshPending = false;
let latestAnalysis = null;
let assistant = null;
let dailyRecipes = null;
let shareBlob = null;
let shareUrl = null;
let shareRevision = 0;
let epoch = 0;
let snapshot = { weights: [], measurements: [], photos: [], training: [], cycles: [] };
let shownPhotos = 0;
const photoUrls = new Set();
const photoGroups = new Map();

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function message(text, error = false) {
  const box = $('message');
  box.replaceChildren();
  const close = node('button', 'Schließen');
  close.type = 'button';
  close.addEventListener('click', () => { box.hidden = true; });
  box.append(close, document.createTextNode(text));
  box.classList.toggle('error', error);
  box.hidden = false;
}
function resetForms() {
  for (const form of document.querySelectorAll('form')) form.reset();
  for(const input of document.querySelectorAll('input[type=date]'))input.value=['recorded_on','asOf'].includes(input.name)?localDate():'';
}
function clearPrivate() {
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  snapshot = { weights: [], measurements: [], photos: [], training: [], cycles: [] };
  preferences={};saveState=null;analysisDay=null;document.body.classList.remove('app-signed-in');wellbeing?.clear();motivation?.clear();
  $('save-state').textContent='Speicherstand wird geprüft …';
  for (const url of photoUrls) URL.revokeObjectURL(url);
  photoUrls.clear();
  photoGroups.clear();
  $('photo-count').textContent = '';
  if ($('photo-dialog').open) $('photo-dialog').close();
  $('large-photo').removeAttribute('src');
  for (const id of ['weight-history', 'measurements-history', 'photo-gallery', 'chart']) $(id).replaceChildren();
  for (const id of ['first-weight', 'latest-weight', 'weight-change']) $(id).textContent = '–';
  for (const id of ['first-date', 'latest-date']) $(id).textContent = '';
  $('dashboard').hidden = true;
  $('floating-summary').hidden = true;
  for (const id of ['day-summary', 'calendar-grid', 'analysis']) $(id).replaceChildren();
  for (const id of ['floating-weight','floating-bmi','floating-date']) $(id).textContent = '';
  heightCm = null; latestAnalysis = null; diaryId = null;
  for (const id of ['checkin-form','height-form','training-form','cycle-form','profile-form','import-chat-form']) {$(id).reset();delete $(id).dataset.dirty;}
  $('selected-date-label').textContent = ''; $('jump-date').value = ''; $('calendar-month').value = '';
  assistant?.clear();
  dailyRecipes?.clear();
  if ($('share-dialog').open) $('share-dialog').close();
  $('share-form').reset(); clearSharePreview();
}
function empty(container, text) { container.append(node('p', text, 'empty')); }
function action(text, callback, className = 'quiet small') {
  const button = node('button', text, className);
  button.type = 'button';
  button.addEventListener('click', () => busy(button, callback));
  return button;
}
async function busy(control, callback) {
  const generation = epoch;
  control.disabled = true;
  try { await callback(generation); }
  catch (error) { if (generation === epoch) message(error.message || 'Bitte versuche es erneut.', true); }
  finally { control.disabled = false; }
}
async function loadSnapshot(generation = epoch,attempt = 0) {
  const identity = await client.rpc('ab_current_diary');
  fail(identity.error);
  if (generation !== epoch || !user) return false;
  if (!identity.data || identity.data !== diaryId) throw new Error('Der private Zugriff ist nicht mehr verfügbar. Bitte melde dich erneut an.');
  const initialState=await client.from('ab_diary_state').select('revision').maybeSingle();fail(initialState.error);
  const [weights, body, photos, profile, training, cycles, prefs, state] = await Promise.all([
    allRows(client, 'ab_weights'), allRows(client, 'ab_measurements'), allRows(client, 'ab_progress_photos'),
    client.from('ab_profile').select('height_cm').maybeSingle(),
    allRows(client,'ab_training_sessions'),allRows(client,'ab_cycle_entries'),
    client.from('ab_preferences').select('*').maybeSingle(),client.from('ab_diary_state').select('*').maybeSingle()
  ]);
  fail(profile.error);fail(prefs.error);fail(state.error);
  const finalState=await client.from('ab_diary_state').select('*').maybeSingle();fail(finalState.error);
  if (generation !== epoch || !user) return false;
  if(Number(initialState.data?.revision||0)!==Number(finalState.data?.revision||0)){if(attempt<2)return loadSnapshot(generation,attempt+1);throw Error('Die Daten ändern sich gerade. Bitte den aktuellen Stand erneut laden.');}
  const unchanged = JSON.stringify(snapshot) === JSON.stringify({ weights, measurements: body, photos,training,cycles }) && heightCm === (profile.data?.height_cm ?? null) && JSON.stringify(preferences)===JSON.stringify(prefs.data||{});
  const dayChanged=analysisDay!==localDate();
  const photosChanged = JSON.stringify(snapshot.photos) !== JSON.stringify(photos);
  snapshot = { weights, measurements: body, photos, training, cycles };
  preferences=prefs.data||{};saveState=finalState.data;
  heightCm = profile.data?.height_cm ?? null;
  if (!unchanged || !latestAnalysis || dayChanged) { render({photosChanged}); assistant?.schedule(); }
  updateSaveState();
  if(!unchanged&&!$('checkin-form').dataset.dirty&&!$('checkin-form').dataset.busy&&!$('dashboard').hidden)selectDay(selectedDay,false,true);
  return true;
}
function renderChart() {
  const container = $('chart');
  container.replaceChildren();
  const data = [...snapshot.weights].filter(row => row.recorded_on <= localDate()).reverse();
  if (data.length < 2) { empty(container, 'Mit zwei Gewichtseinträgen beginnt hier dein Verlauf.'); return; }
  const width = Math.max(300, Math.round(container.clientWidth || 900)), height = 250, left = 48, right = 18, top = 20, bottom = 25;
  const values = data.map(row => Number(row.weight_kg));
  const min = Math.min(...values) - 0.5, max = Math.max(...values) + 0.5;
  const dates = data.map(row => Date.parse(row.recorded_on));
  const x = value => left + (value - dates[0]) / Math.max(1, dates.at(-1) - dates[0]) * (width - left - right);
  const y = value => top + (max - value) / (max - min) * (height - top - bottom);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Gewichtsverlauf mit ${data.length} Einträgen von ${dateLabel(data[0].recorded_on)} bis ${dateLabel(data.at(-1).recorded_on)}. Einzelwerte im Bereich Gewicht.`);
  function shape(tag, attributes, text) {
    const element = document.createElementNS(svg.namespaceURI, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    if (text) element.textContent = text;
    svg.append(element);
    return element;
  }
  for (let i = 0; i < 4; i++) {
    const value = min + (max - min) * i / 3;
    shape('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), class: 'chart-grid' });
    shape('text', { x: left - 8, y: y(value) + 4, 'text-anchor': 'end', class: 'chart-label' }, formatNumber.format(value));
  }
  shape('polyline', { points: data.map((row, i) => `${x(dates[i])},${y(Number(row.weight_kg))}`).join(' '), class: 'chart-line' });
  data.forEach((row, i) => {
    const dot = shape('circle', { cx: x(dates[i]), cy: y(Number(row.weight_kg)), r: 3, class: 'chart-dot' });
    const title = document.createElementNS(svg.namespaceURI, 'title');
    title.textContent = `${dateLabel(row.recorded_on)}: ${formatNumber.format(row.weight_kg)} kg`;
    dot.append(title);
  });
  const labels = node('div', undefined, 'chart-axis');
  labels.append(node('span', dateLabel(data[0].recorded_on)), node('span', dateLabel(data.at(-1).recorded_on)));
  container.append(svg, labels);
}
function editDaily(formId, row) {
  selectDay(row.recorded_on, true);
  const form=$('checkin-form');
  (row.weight_kg!==undefined?form.elements.weight_kg:form.elements.waist_cm).focus({preventScroll:true});
}
function renderHistory(table, container, rows, fields, formId) {
  container.replaceChildren();
  if (!rows.length) { empty(container, 'Hier erscheinen deine gespeicherten Einträge.'); return; }
  for (const row of rows) {
    const entry = node('article', undefined, 'entry');
    const header = node('div', undefined, 'entry-head');
    const date = node('time', dateLabel(row.recorded_on)); date.dateTime = row.recorded_on;
    header.append(node('strong', table === 'ab_weights' ? `${formatNumber.format(row.weight_kg)} kg` : dateLabel(row.recorded_on)));
    if (table === 'ab_weights') header.append(date);
    entry.append(header);
    if (fields) entry.append(node('p', fields.filter(([field]) => row[field] !== null).map(([field, label]) => `${label}: ${formatNumber.format(row[field])} cm`).join(' · '), 'measure-list'));
    if (row.note) entry.append(node('p', row.note, 'note'));
    const actions = node('div', undefined, 'actions');
    actions.append(action('Bearbeiten', () => editDaily(formId, row)), action('Löschen', async generation => {
      if (!confirm(`Den Eintrag vom ${dateLabel(row.recorded_on)} endgültig löschen?`)) return;
      const result = await client.from(table).delete().eq('id', row.id).select('id').single();
      fail(result.error);
      await loadSnapshot(generation);
      if (generation === epoch) message('Eintrag gelöscht.');
    }, 'danger'));
    entry.append(actions);
    container.append(entry);
  }
}
function render({photosChanged=true}={}) {
  latestAnalysis = analyze(snapshot, heightCm);analysisDay=localDate();
  const { latest, first } = latestAnalysis;
  $('first-weight').textContent = first ? `${formatNumber.format(first.weight_kg)} kg` : '–';
  $('latest-weight').textContent = latest ? `${formatNumber.format(latest.weight_kg)} kg` : '–';
  $('first-date').textContent = first ? dateLabel(first.recorded_on) : 'Noch kein Gewicht erfasst';
  $('latest-date').textContent = latest ? dateLabel(latest.recorded_on) : 'Dein Tagebuch wartet auf dich';
  const change = latest && first ? Math.round((Number(latest.weight_kg) - Number(first.weight_kg)) * 100) / 100 : null;
  $('weight-change').textContent = change === null ? '–' : `${change > 0 ? '+' : ''}${formatNumber.format(change)} kg`;
  renderChart();
  renderHistory('ab_weights', $('weight-history'), snapshot.weights, null, 'checkin-form');
  renderHistory('ab_measurements', $('measurements-history'), snapshot.measurements, measurements, 'checkin-form');
  renderAnalysis();
  renderCalendar();
  if (photosChanged || !$('photo-gallery').childElementCount) renderPhotos();
  wellbeing?.render({snapshot,preferences,height:heightCm});
}
function renderPhotos() {
  for (const url of photoUrls) URL.revokeObjectURL(url);
  photoUrls.clear();
  if ($('photo-dialog').open) $('photo-dialog').close();
  $('large-photo').removeAttribute('src');
  $('photo-gallery').replaceChildren();
  photoGroups.clear();
  shownPhotos = 0;
  const count=filteredPhotos().length;
  $('photo-count').textContent=count+' '+(count===1?'Foto':'Fotos')+($('photo-filter').value==='day'?' vom '+dateLabel(selectedDay):' in deiner privaten Galerie');
  if (!filteredPhotos().length) empty($('photo-gallery'), $('photo-filter').value === 'day' ? 'Für diesen Tag sind noch keine Fotos gespeichert.' : 'Hier ist Platz für deine ersten Fortschrittsfotos.');
  appendPhotos();
}
function appendPhotos() {
  const generation = epoch;
  const photos = filteredPhotos();
  const batch = photos.slice(shownPhotos, shownPhotos + 12);
  shownPhotos += batch.length;
  $('more-photos').hidden = shownPhotos >= photos.length;
  for (const photo of batch) {
    let group=photoGroups.get(photo.recorded_on);
    if(!group){
      const section=node('section',undefined,'photo-date-group');section.dataset.date=photo.recorded_on;
      section.append(node('h3',dateLabel(photo.recorded_on)));
      group=node('div',undefined,'gallery');section.append(group);photoGroups.set(photo.recorded_on,group);$('photo-gallery').append(section);
    }
    const card = node('article', undefined, 'photo-card');
    const open = node('button', 'Foto wird geladen …', 'photo-open');
    open.type = 'button'; open.disabled = true;
    card.append(open, node('p', `${dateLabel(photo.recorded_on)} · ${views[photo.view] || 'Foto'}`));
    if (photo.note) card.append(node('p', photo.note, 'note'));
    card.append(action('Foto löschen', async current => {
      if (!confirm(`Das Foto vom ${dateLabel(photo.recorded_on)} und seinen Eintrag endgültig löschen?`)) return;
      await deletePhoto(client, photo);
      await loadSnapshot(current);
      if (current === epoch) message('Foto gelöscht.');
    }, 'danger'));
    group.append(card);
    const download = async () => {
      try {
        open.disabled = true;
        open.textContent = 'Foto wird geladen …';
        const { data, error } = await client.storage.from(bucket).download(photo.storage_path);
        if (error) throw error;
        if (generation !== epoch || !card.isConnected) return;
        const url = URL.createObjectURL(data); photoUrls.add(url);
        const image = node('img'); image.src = url; image.alt = `Fortschrittsfoto ${views[photo.view] || ''} vom ${dateLabel(photo.recorded_on)}`;
        open.replaceChildren(image); open.disabled = false;
        open.onclick = () => {
          $('large-photo').src = url; $('large-photo').alt = image.alt;
          $('photo-dialog').showModal();
        };
      } catch {
        if (generation !== epoch || !card.isConnected) return;
        open.textContent = 'Foto erneut laden'; open.disabled = false; open.onclick = download;
      }
    };
    download();
  }
}
function filteredPhotos() {
  const photos=$('photo-filter').value === 'day' ? snapshot.photos.filter(photo => photo.recorded_on === selectedDay) : snapshot.photos;
  return sortPhotos(photos,$('photo-order').value);
}
function signed(value) {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${formatNumber.format(rounded)}`;
}
function renderAnalysis() {
  const a = latestAnalysis;
  $('floating-weight').textContent = a.latest ? `${formatNumber.format(a.latest.weight_kg)} kg` : 'Gewicht: –';
  $('floating-bmi').textContent = a.bmi === null ? 'BMI –' : `BMI ${a.bmi.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  $('floating-date').textContent = a.latest ? `Stand ${dateLabel(a.latest.recorded_on)}` : 'Noch kein Check-in';
  const box = $('analysis'); box.replaceChildren();
  box.append(node('p', `${a.weightCount} Gewichtseinträge · ${snapshot.measurements.length} Messtage · ${a.photoCount} Fotos`));
  box.append(node('p', a.weeklyAverage === null ? 'Für die letzten 7 Tage sind noch keine Gewichte erfasst.' : `Durchschnitt der letzten 7 Tage: ${formatNumber.format(a.weeklyAverage)} kg (${a.recentCount} erfasste Tage).`));
  for (const change of a.circumferenceChanges) {
    if (change.change !== null) box.append(node('p', `${change.label}: ${signed(change.change)} cm seit ${dateLabel(change.first.recorded_on)}; zuletzt ${formatNumber.format(change.latest[change.field])} cm.`));
  }
  box.append(node('p', 'Nachträge fließen anhand ihres Datums in die Auswertung ein. Die Anzeige rechts oben zeigt immer das zuletzt erfasste Gewicht bis heute.', 'hint'));
}
function renderCalendar() {
  $('calendar-month').value = visibleMonth;
  $('jump-date').value = selectedDay;
  $('selected-date-label').textContent = dateLabel(selectedDay);
  $('previous-month').disabled = visibleMonth === '2000-01';
  $('next-month').disabled = visibleMonth === '2100-12';
  const grid = $('calendar-grid'); grid.replaceChildren();
  for (const day of monthGrid(visibleMonth)) {
    if (!day) { const blank = node('span'); blank.setAttribute('aria-hidden', 'true'); grid.append(blank); continue; }
    const weight = snapshot.weights.some(row => row.recorded_on === day);
    const body = snapshot.measurements.some(row => row.recorded_on === day);
    const photos = snapshot.photos.filter(row => row.recorded_on === day).length;
    const button = node('button', undefined, 'calendar-day'); button.type = 'button';
    button.dataset.date = day;
    button.setAttribute('aria-pressed', String(day === selectedDay));
    button.setAttribute('aria-label', `${dateLabel(day)}${weight ? ', Gewicht' : ''}${body ? ', Körpermaße' : ''}${photos ? `, ${photos} Fotos` : ''}`);
    if (day === localDate()) button.classList.add('today');
    button.append(node('span', String(Number(day.slice(-2)))), node('small', [weight ? 'G' : '', body ? 'M' : '', photos ? 'F' : ''].filter(Boolean).join(' ')));
    button.addEventListener('click', () => selectDay(day));
    grid.append(button);
  }
  const summary = $('day-summary'); summary.replaceChildren(node('h3', dateLabel(selectedDay)));
  const weight = snapshot.weights.find(row => row.recorded_on === selectedDay);
  const body = snapshot.measurements.find(row => row.recorded_on === selectedDay);
  const photos = snapshot.photos.filter(row => row.recorded_on === selectedDay);
  summary.append(node('p', weight ? `${formatNumber.format(weight.weight_kg)} kg` : 'Noch kein Gewicht für diesen Tag.'));
  if (body) summary.append(node('p', measurements.filter(([field]) => body[field] !== null).map(([field, label]) => `${label}: ${formatNumber.format(body[field])} cm`).join(' · '), 'hint'));
  summary.append(node('p', `${photos.length} Fotos an diesem Tag.`));
  const buttons = node('div', undefined, 'actions');
  buttons.append(action('Diesen Check-in bearbeiten',()=>selectDay(selectedDay,true)));
  summary.append(buttons);
}
function selectDay(day, scrollToForm = false, force = false) {
  const next=dateValue(day);
  if(next!==selectedDay&&$('checkin-form').dataset.dirty&&!force&&!confirm('Du hast ungespeicherte Eingaben für '+dateLabel(selectedDay)+'. Zum anderen Tag wechseln und diese Eingaben verwerfen?')){renderCalendar();$('checkin-form').elements.recorded_on.value=selectedDay;return;}
  selectedDay = next; visibleMonth = selectedDay.slice(0, 7);
  const form=$('checkin-form'),weight=snapshot.weights.find(row=>row.recorded_on===selectedDay),body=snapshot.measurements.find(row=>row.recorded_on===selectedDay);
  form.reset();delete form.dataset.dirty;formRevision=Number(saveState?.revision||0);form.elements.recorded_on.value=selectedDay;form.elements.weight_kg.value=weight?.weight_kg??'';form.elements.height_cm.value=heightCm??'';
  for(const [field]of measurements)form.elements[field].value=body?.[field]??'';
  form.elements.note.value=weight?.note||body?.note||'';
  updateCheckinPreview();renderCalendar();updateSaveState();
  if($('photo-filter').value==='day')renderPhotos();
  if(scrollToForm){showPage('checkin');$('checkin-card').scrollIntoView({behavior:'smooth',block:'start'});}
}
function updateCheckinPreview(){
  const form=$('checkin-form');
  for(const view of ['front','side','back']){
    const file=form.elements['photo_'+view].files?.[0],label=document.querySelector('[data-file-label="photo_'+view+'"]');
    label.textContent=file?file.name:'Foto hinzufügen';label.closest('.photo-pick').classList.toggle('has-file',Boolean(file));
  }
  const weight=Number(form.elements.weight_kg.value.replace(',','.')),height=Number(form.elements.height_cm.value.replace(',','.'));
  $('checkin-bmi-preview').textContent=weight>=1&&weight<=700&&height>=50&&height<=260?'BMI-Vorschau für diesen Check-in: '+(weight/(height/100)**2).toLocaleString('de-DE',{maximumFractionDigits:1})+' · noch nicht gespeichert':'';
}
function clearSharePreview() {
  ++shareRevision; shareBlob = null;
  if (shareUrl) URL.revokeObjectURL(shareUrl);
  shareUrl = null; $('share-preview').removeAttribute('src'); $('share-preview-panel').hidden = true;
}
function downloadShare() {
  if (!shareBlob || !shareUrl) { message('Bitte zuerst eine Vorschau erstellen.', true); return; }
  const link = node('a'); link.href = shareUrl; link.download = 'mein-fortschritt.jpg';
  document.body.append(link); link.click(); link.remove();
}
async function lockDiary(text = 'Nach 10 Minuten ohne Bedienung wurdest du abgemeldet.') {
  ++epoch; pausedDraft=null;clearPrivate();resetForms();
  user = null;
 $('denied-panel').hidden = true;
  $('login-panel').hidden = false; $('logout').hidden = true;
  try { await client.auth.signOut({ scope: 'local' }); }
  finally { message(text); }
}
function bindAdditionalFeatures() {
  $('previous-month').addEventListener('click', () => { visibleMonth = shiftMonth(visibleMonth, -1); renderCalendar(); });
  $('next-month').addEventListener('click', () => { visibleMonth = shiftMonth(visibleMonth, 1); renderCalendar(); });
  $('calendar-month').addEventListener('change', event => { try { monthGrid(event.target.value); visibleMonth = event.target.value; renderCalendar(); } catch (error) { message(error.message, true); } });
  $('jump-date').addEventListener('change', event => { try { selectDay(event.target.value); } catch (error) { message(error.message, true); } });
  $('jump-today').addEventListener('click', () => selectDay(localDate()));
  $('checkin-form').elements.recorded_on.addEventListener('change',event=>{try{selectDay(event.target.value);}catch(error){message(error.message,true);event.target.value=selectedDay;}});
  $('checkin-form').addEventListener('input',event=>{if(event.target.name!=='recorded_on'){$('checkin-form').dataset.dirty='true';updateSaveState();}updateCheckinPreview();});
  $('checkin-form').addEventListener('change',updateCheckinPreview);
  $('photo-filter').addEventListener('change', renderPhotos);
  $('photo-order').addEventListener('change',renderPhotos);
  $('show-gallery').addEventListener('click',()=>{
    $('photo-filter').value='all';renderPhotos();showPage('gallery');
  });
  $('floating-summary').addEventListener('click',()=>showPage('progress'));
  $('reload-checkin').addEventListener('click',()=>busy($('reload-checkin'),async()=>{if($('checkin-form').dataset.dirty&&!confirm('Ungespeicherte Eingaben verwerfen und den gespeicherten Stand laden?'))return;await loadSnapshot();selectDay(selectedDay,false,true);}));
  $('open-share').addEventListener('click', () => {
    $('share-form').reset(); clearSharePreview(); $('share-form').elements.asOf.value = selectedDay;
    $('share-photo').replaceChildren(node('option', 'Kein Foto teilen'));
    $('share-photo').firstChild.value = '';
    for (const photo of snapshot.photos) {
      const option = node('option', `${dateLabel(photo.recorded_on)} · ${views[photo.view] || 'Foto'}`); option.value = photo.id; $('share-photo').append(option);
    }
    $('share-dialog').showModal();
  });
  $('close-share').addEventListener('click', () => $('share-dialog').close());
  $('share-dialog').addEventListener('close', () => { clearSharePreview(); $('share-form').reset(); });
  $('share-form').addEventListener('input', clearSharePreview);
  $('share-form').addEventListener('change', clearSharePreview);
  bindForm('share-form', async (data, generation) => {
    const revision = ++shareRevision;
    const options = Object.fromEntries(data); options.asOf = dateValue(options.asOf);
    for (const field of ['date','weight','change','bmi',...measurements.map(([field]) => field)]) options[field] = data.has(field);
    const content = shareContent(snapshot, heightCm, options);
    let photo = null;
    if (content.photoPath) {
      const downloaded = await client.storage.from(bucket).download(content.photoPath); fail(downloaded.error); photo = downloaded.data;
    }
    const blob = await makeShareCard(content, photo, options.format);
    if (generation !== epoch || revision !== shareRevision || !user || !$('share-dialog').open) return;
    shareBlob = blob; shareUrl = URL.createObjectURL(blob);
    $('share-preview').src = shareUrl; $('share-preview-panel').hidden = false;
  });
  $('download-share').addEventListener('click', downloadShare);
  $('share-file').addEventListener('click', () => busy($('share-file'), async () => {
    if (!shareBlob) throw new Error('Bitte zuerst eine Vorschau erstellen.');
    const file = new File([shareBlob], 'mein-fortschritt.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch (error) { if (error.name !== 'AbortError') throw new Error('Das Teilen-Menü konnte nicht geöffnet werden. Bitte das Bild herunterladen.'); }
    } else downloadShare();
  }));
  bindForm('height-form', async (data, generation) => {
    const height = numberValue(data.get('height_cm'), 260);
    if (height < 50) throw new Error('Bitte eine Körpergröße zwischen 50 und 260 cm eingeben.');
    const existing = await client.from('ab_profile').select('user_id').maybeSingle(); fail(existing.error);
    const query = existing.data ? client.from('ab_profile').update({ height_cm: height }).eq('user_id', existing.data.user_id) : client.from('ab_profile').insert({ height_cm: height });
    const result = await query.select('height_cm').single(); fail(result.error);
    delete $('height-form').dataset.dirty;
    await loadSnapshot(generation);
    if (generation === epoch) message('Körpergröße und BMI aktualisiert.');
  });
  setInterval(async () => {
    if (!user || document.hidden || refreshPending) return;
    if (sharedAuth.isIdle()) { await sharedAuth.expire().catch(() => {}); return; }
    if (!diaryId) return;
    refreshPending = true;
    try { await loadSnapshot(); await assistant?.load().catch(() => {}); await dailyRecipes?.load(); }
    catch { await lockDiary('Die private Verbindung konnte nicht bestätigt werden. Bitte melde dich erneut an.').catch(() => {}); }
    finally { refreshPending = false; }
  }, 15000);
  document.addEventListener('visibilitychange', async () => {
    if (!user) return;
    if (document.hidden) {
      pausedDraft=captureDraft();++epoch;clearPrivate();resetForms();
    } else if (sharedAuth.isIdle()) {
      await sharedAuth.expire().catch(() => {});
    } else {
      const result = await client.auth.getSession();
      if (result.error) { await lockDiary('Bitte melde dich erneut an.').catch(() => {}); return; }
      await sessionChanged(result.data.session);
    }
  });
}
async function sessionChanged(session) {
  const generation = ++epoch;
  clearPrivate();
  user = session?.user || null;
  $('login-panel').hidden = Boolean(user);
  $('logout').hidden = !user;
  $('denied-panel').hidden = true;
  $('reset-panel').hidden = true;
  $('password-panel').hidden = true;
  if (recoveryPending || sharedAuth?.isRecovering(session)) {
    if (user) { recoveryPending = true; $('login-panel').hidden = true; $('password-panel').hidden = false; return; }
    recoveryPending = false; resetOpen = true;
  }
  if (resetOpen) { $('login-panel').hidden = true; $('reset-panel').hidden = false; return; }
  if (!user) { pausedDraft=null;resetForms();return; }
  try {
    const access = await client.from('ab_access').select('enabled,diary_user_id').eq('user_id', user.id).maybeSingle();
    fail(access.error);
    if (generation !== epoch) return;
    if (!access.data?.enabled) {pausedDraft=null;$('denied-panel').hidden=false;return;}
    diaryId = access.data.diary_user_id;
    await loadSnapshot(generation);
    if (generation !== epoch) return;
    $('dashboard').hidden=false;document.body.classList.add('app-signed-in');showPage(currentPage,false);renderChart();
    $('floating-summary').hidden = false;
    $('height-form').elements.height_cm.value = heightCm ?? '';
    for(const id of ['training-form','cycle-form'])$(id).elements.recorded_on.value=localDate();
    selectDay(selectedDay,false,true);restoreDraft();
    await assistant?.load({ generate: true }).catch(() => {});
    await dailyRecipes?.load();
  } catch (error) {
    if (generation !== epoch) return;
    clearPrivate();
    message(error.message, true);
  }
}
function bindForm(id, callback) {
  const form = $(id);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if(form.dataset.busy)return;form.dataset.busy='true';
    busy(form.querySelector('[type=submit]'),async generation=>{try{const data=new FormData(form);await callback(data,generation,form);}finally{delete form.dataset.busy;}});
  });
}
function showPage(name,updateURL=true){
  if(!(name in pages))name='checkin';currentPage=name;
  for(const page of document.querySelectorAll('[data-page]'))page.hidden=page.dataset.page!==name;
  $('current-page-label').textContent=pages[name];
  for(const b of $('menu-choices').querySelectorAll('[data-destination]'))b.setAttribute('aria-current',b.dataset.destination===name?'page':'false');
  if(updateURL&&!$('dashboard').hidden){history.pushState(null,'','#'+name);$('main').scrollTo({top:0,behavior:'instant'});}
  if($('menu-dialog').open)$('menu-dialog').close();
  if(name==='progress')requestAnimationFrame(renderChart);
}
function setupNavigation(){
  for(const [id,label]of Object.entries(pages)){const b=node('button',label,'quiet');b.type='button';b.dataset.destination=id;b.addEventListener('click',()=>showPage(id));$('menu-choices').append(b);}
  $('open-menu').addEventListener('click',()=>$('menu-dialog').showModal());$('close-menu').addEventListener('click',()=>$('menu-dialog').close());
  $('open-assistant-page').addEventListener('click',()=>$('open-ai').click());
  window.addEventListener('popstate',()=>{const name=location.hash.slice(1);if(name in pages&&!$('dashboard').hidden)showPage(name,false);});
  const updateHeight=()=>document.documentElement.style.setProperty('--app-height',(window.visualViewport?.height||innerHeight)+'px');
  window.visualViewport?.addEventListener('resize',updateHeight);updateHeight();
  const initial=location.hash.slice(1);if(initial in pages)currentPage=initial;
}
function updateSaveState(){
 const box=$('save-state');box.textContent=savedStateLabel(saveState)+($('checkin-form').dataset.dirty?' · Deine aktuellen Eingaben sind noch nicht gespeichert.':'');box.classList.toggle('draft',Boolean($('checkin-form').dataset.dirty));
}
function captureDraft(){
 if(!user||!diaryId)return null;const forms={};
 for(const id of ['checkin-form','height-form','training-form','cycle-form','profile-form','import-chat-form','ai-form']){
  const form=$(id);forms[id]={data:[...new FormData(form)],dirty:form.dataset.dirty||'',busy:Boolean(form.dataset.busy)};
 }
 return{actor:user.id,diary:diaryId,forms,day:selectedDay,page:currentPage,scroll:$('main').scrollTop,revision:formRevision};
}
function restoreDraft(){
 const draft=pausedDraft;pausedDraft=null;if(!draft||draft.actor!==user?.id||draft.diary!==diaryId||sharedAuth.isIdle())return;
 selectedDay=draft.day;visibleMonth=selectedDay.slice(0,7);formRevision=draft.revision;
 for(const [id,record]of Object.entries(draft.forms)){
  const form=$(id);if(record.busy)continue;
  form.reset();for(const control of form.elements)if(control.type==='checkbox')control.checked=false;for(const [name,value]of record.data){const control=form.elements[name];if(!control)continue;
   if(value instanceof File){if(value.size){try{const transfer=new DataTransfer();transfer.items.add(value);control.files=transfer.files;}catch{message('Bitte das Foto erneut auswählen. Deine übrigen Eingaben sind wieder da.',true);}}}
   else if(control.type==='checkbox')control.checked=true;else control.value=value;
  }
  if(record.dirty)form.dataset.dirty='true';
 }
 showPage(draft.page,false);renderCalendar();updateCheckinPreview();updateSaveState();requestAnimationFrame(()=>$('main').scrollTop=draft.scroll);
}
function bindWellbeingForms(){
 for(const id of ['profile-form','height-form'])$(id).addEventListener('input',()=>{$(id).dataset.dirty='true';});
 bindForm('profile-form',async(data,generation,form)=>{const payload=profilePayload(data),existing=await client.from('ab_preferences').select('user_id').maybeSingle();fail(existing.error);const result=existing.data?await client.from('ab_preferences').update(payload).eq('user_id',existing.data.user_id):await client.from('ab_preferences').insert(payload);fail(result.error);delete form.dataset.dirty;await loadSnapshot(generation);if(generation===epoch)message('Deine bestätigten Angaben wurden gespeichert.');});
 bindForm('training-form',async(data,generation,form)=>{const result=await client.from('ab_training_sessions').insert(trainingPayload(data));fail(result.error);if(generation!==epoch)return;form.reset();form.elements.recorded_on.value=localDate();await loadSnapshot(generation);message('Dein Training ist gespeichert.');});
 bindForm('cycle-form',async(data,generation,form)=>{const payload=cyclePayload(data),existing=await client.from('ab_cycle_entries').select('id').eq('recorded_on',payload.recorded_on).maybeSingle();fail(existing.error);const result=existing.data?await client.from('ab_cycle_entries').update(payload).eq('id',existing.data.id):await client.from('ab_cycle_entries').insert(payload);fail(result.error);if(generation!==epoch)return;form.reset();form.elements.recorded_on.value=localDate();await loadSnapshot(generation);message('Dein Zykluseintrag ist gespeichert.');});
 bindForm('import-chat-form',async(data,generation,form)=>{const sourceDate=String(data.get('source_date')||'').trim();await assistant.run('chat',String(data.get('message')).trim(),{source:'import',sourceDate:sourceDate||null});if(generation===epoch){form.reset();$('ai-dialog').showModal();}});
}
async function start() {
  if (window.self !== window.top) {
    const link = node('a','Tagebuch direkt öffnen'); link.href = './'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    document.body.replaceChildren(node('p','Der private Bereich wird in eingebetteten Fenstern nicht geöffnet.'),link);
    return;
  }
  setupThemes();
  setupDialogScrollLock();setupNavigation();
  resetForms();
  const config = await fetch('./config.json', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Die App-Konfiguration konnte nicht geladen werden.');
    return response.json();
  });
  sharedAuth = createSharedAuth({projectUrl:config.supabaseUrl,legacyKey:'abnehmen-auth'});
  const linkState=recoveryLinkState(location.href,sharedAuth.storage.getItem(sharedAuth.storageKey+'-code-verifier'));
  const hadAuthCode=new URL(location.href).searchParams.has('code');
  recoveryPending=linkState.requested;
  client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { storageKey: sharedAuth.storageKey, storage: sharedAuth.storage, flowType:'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) }
  });
  sharedAuth.bind(client);
  client.auth.onAuthStateChange((_event, session) => {
    if(_event==='PASSWORD_RECOVERY')recoveryPending=true;
    if(_event==='SIGNED_OUT')recoveryPending=false;
    // Leave the SDK's auth lock before making further API requests.
    setTimeout(() => {
      // A token refresh must preserve an in-progress check-in and its scroll.
      if (session && user?.id === session.user.id && diaryId && !$('dashboard').hidden && !recoveryPending && !sharedAuth.isRecovering(session)) {
        user = session.user;
        return;
      }
      sessionChanged(session);
    }, 0);
  });
  bindForm('login-form', async (data, generation, form) => {
    const result = await client.auth.signInWithPassword({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
    form.elements.password.value = '';
    if (result.error) throw new Error('Anmeldung fehlgeschlagen. Bitte prüfe E-Mail und Passwort oder versuche es später erneut.');
    $('message').hidden = true;
  });
  $('forgot-password').addEventListener('click',()=>{
    resetOpen=true;$('login-panel').hidden=true;$('reset-panel').hidden=false;
    $('reset-form').elements.email.value=$('login-form').elements.email.value;
    $('reset-form').elements.email.focus();
  });
  $('cancel-reset').addEventListener('click',()=>{resetOpen=false;$('reset-panel').hidden=true;$('login-panel').hidden=false;$('message').hidden=true;});
  $('cancel-password').addEventListener('click',()=>busy($('cancel-password'),async()=>{
    recoveryPending=false;resetOpen=false;sharedAuth.finishRecovery();$('password-form').reset();
    await lockDiary('Du kannst dich jetzt mit deinem Passwort anmelden.');
  }));
  bindForm('reset-form',async(data)=>{
    const result=await client.auth.resetPasswordForEmail(String(data.get('email')).trim(),{redirectTo:recoveryRedirect(location.href)});
    if(result.error)throw Error(result.error.status===429?'Es wurden kürzlich mehrere Links angefordert. Bitte etwas warten und nur den neuesten Link verwenden.':'Der Passwort-Link konnte gerade nicht angefordert werden. Bitte später erneut versuchen.');
    message('Wenn diese E-Mail zu einem Konto gehört, erhältst du einen Passwort-Link. Öffne den neuesten Link im selben Browser; er führt dich zu dieser App zurück.');
  });
  bindForm('password-form',async(data,_generation,form)=>{
    if(!user||!recoveryPending)throw Error('Bitte einen neuen Passwort-Link anfordern.');
    const password=newPassword(data),updated=await client.auth.updateUser({password});
    if(updated.error)throw Error('Das Passwort konnte nicht geändert werden. Prüfe die Passwortvorgaben oder fordere einen neuen Link an.');
    form.reset();sharedAuth.finishRecovery();recoveryPending=false;resetOpen=false;
    const signedOut=await client.auth.signOut({scope:'global'});fail(signedOut.error);
    history.replaceState(null,'',clearRecoveryURL(location.href));
    await sessionChanged(null);
    message('Dein Passwort wurde geändert. Melde dich jetzt mit dem neuen Passwort an – die Anmeldung gilt dann für alle drei Apps.');
  });
  bindForm('checkin-form',async(data,generation,form)=>{
    const uid=diaryId;if(!uid)throw Error('Bitte melde dich erneut an.');
    const before=latestAnalysis;
    const controls=[...form.querySelectorAll('input,textarea')];for(const control of controls)control.disabled=true;
    const button=form.querySelector('[type=submit]'),label=button.textContent;button.textContent='Dein Check-in wird gespeichert …';
    try{
      const result=await saveCheckin(client,uid,data,{expectedRevision:formRevision,active:()=>generation===epoch&&Boolean(user&&diaryId)});
      if(generation!==epoch)return;
      await loadSnapshot(generation);
      if(generation!==epoch)return;
      selectDay(String(data.get('recorded_on')),false,true);
      motivation?.show(before,latestAnalysis,{day:String(data.get('recorded_on')),enabled:preferences.motivation_enabled!==false,rapidLoss:weightTrend(snapshot.weights)?.rapidLoss});
      message('Wochenstand vom '+dateLabel(String(data.get('recorded_on')))+' gespeichert'+(result?.photo_count?' · '+result.photo_count+' Fotos':'')+'.');
    }finally{for(const control of controls)control.disabled=false;button.textContent=label;}
  });
  $('logout').addEventListener('click', () => busy($('logout'), () => lockDiary('Du bist abgemeldet.')));
  $('more-photos').addEventListener('click', appendPhotos);
  $('close-photo').addEventListener('click', () => $('photo-dialog').close());
  $('photo-dialog').addEventListener('close', () => $('large-photo').removeAttribute('src'));
  bindAdditionalFeatures();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer=setTimeout(() => { if(user&&!$('dashboard').hidden)renderChart(); },120); });
  assistant = new Assistant({client,active:()=>Boolean(user&&diaryId&&!$('dashboard').hidden),error:message,onDataSaved:async saved=>{const before=latestAnalysis;await loadSnapshot();motivation?.show(before,latestAnalysis,{day:saved.recorded_on,enabled:preferences.motivation_enabled!==false,rapidLoss:weightTrend(snapshot.weights)?.rapidLoss});}});
  motivation=new Motivation({active:()=>Boolean(user&&diaryId&&!$('dashboard').hidden)});
  wellbeing=new WellbeingUI({onDelete:async(table,id)=>{const result=await client.from(table).delete().eq('id',id).select('id').single();fail(result.error);await loadSnapshot();},onError:message});
  bindWellbeingForms();
  dailyRecipes = new DailyRecipes({client,container:$('daily-recipes')});
  const initialized=await client.auth.initialize();
  if(linkState.failed||(initialized.error&&(linkState.requested||hadAuthCode))){
    recoveryPending=false;resetOpen=true;
    await client.auth.signOut({scope:'local'});
    history.replaceState(null,'',clearRecoveryURL(location.href));
    await sessionChanged(null);
    message('Dieser Link ist ungültig, abgelaufen oder gehört zu einem anderen Browser. Fordere hier einen neuen Link an und öffne ihn im selben Browser.',true);
    return;
  }
  const { data, error } = await client.auth.getSession();
  fail(error);
  await sessionChanged(data.session);
}
start().catch(error => message(error.message || 'Die App konnte nicht gestartet werden. Bitte lade die Seite erneut.', true));
