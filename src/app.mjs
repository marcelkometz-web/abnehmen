import { createClient } from '@supabase/supabase-js';
import { localDate, dateValue, noteValue, numberValue, weightPayload, measurementsPayload, measurements, views, monthGrid, shiftMonth, analyze } from './domain.mjs';
import { allRows, saveDaily, uploadPhoto, deletePhoto, fail, bucket } from './data.mjs';
import { compressPhoto } from './photos.mjs';
import { Assistant } from './assistant.mjs';
import { shareContent, makeShareCard } from './share.mjs';
import { DailyRecipes } from './daily-recipes.mjs';

const $ = id => document.getElementById(id);
const formatNumber = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const dateLabel = value => new Date(value + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
let client;
let user = null;
let diaryId = null;
let heightCm = null;
let selectedDay = localDate();
let visibleMonth = selectedDay.slice(0, 7);
let activeFactors = [];
let enrollmentId = null;
let lastActivity = Date.now();
let refreshPending = false;
let latestAnalysis = null;
let assistant = null;
let dailyRecipes = null;
let shareBlob = null;
let shareUrl = null;
let shareRevision = 0;
let epoch = 0;
let snapshot = { weights: [], measurements: [], photos: [] };
let shownPhotos = 0;
const photoUrls = new Set();

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
  for (const input of document.querySelectorAll('input[type=date]')) input.value = localDate();
}
function clearPrivate() {
  snapshot = { weights: [], measurements: [], photos: [] };
  for (const url of photoUrls) URL.revokeObjectURL(url);
  photoUrls.clear();
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
  for (const id of ['weight-form','measurements-form','photo-form','height-form']) $(id).reset();
  $('selected-date-label').textContent = ''; $('jump-date').value = ''; $('calendar-month').value = '';
  assistant?.clear();
  dailyRecipes?.clear();
  if ($('share-dialog').open) $('share-dialog').close();
  $('share-form').reset(); clearSharePreview();
}
function tab(name) {
  for (const section of document.querySelectorAll('.page')) section.hidden = section.id !== name;
  for (const button of document.querySelectorAll('[data-tab]')) {
    if (button.dataset.tab === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
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
async function loadSnapshot(generation = epoch) {
  const identity = await client.rpc('ab_current_diary');
  fail(identity.error);
  if (generation !== epoch || !user) return false;
  if (!identity.data || identity.data !== diaryId) throw new Error('Der private Zugriff ist nicht mehr verfügbar. Bitte melde dich erneut an.');
  const [weights, body, photos, profile] = await Promise.all([
    allRows(client, 'ab_weights'), allRows(client, 'ab_measurements'), allRows(client, 'ab_progress_photos'),
    client.from('ab_profile').select('height_cm').maybeSingle()
  ]);
  fail(profile.error);
  if (generation !== epoch || !user) return false;
  const unchanged = JSON.stringify(snapshot) === JSON.stringify({ weights, measurements: body, photos }) && heightCm === (profile.data?.height_cm ?? null);
  snapshot = { weights, measurements: body, photos };
  heightCm = profile.data?.height_cm ?? null;
  if (!unchanged || !latestAnalysis) { render(); assistant?.schedule(); }
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
  selectDay(row.recorded_on);
  const form = $(formId);
  for (const input of form.querySelectorAll('input,textarea')) input.value = row[input.name] ?? '';
  form.elements.recorded_on.focus();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
function render() {
  latestAnalysis = analyze(snapshot, heightCm);
  const { latest, first } = latestAnalysis;
  $('first-weight').textContent = first ? `${formatNumber.format(first.weight_kg)} kg` : '–';
  $('latest-weight').textContent = latest ? `${formatNumber.format(latest.weight_kg)} kg` : '–';
  $('first-date').textContent = first ? dateLabel(first.recorded_on) : 'Noch kein Gewicht erfasst';
  $('latest-date').textContent = latest ? dateLabel(latest.recorded_on) : 'Dein Tagebuch wartet auf dich';
  const change = latest && first ? Math.round((Number(latest.weight_kg) - Number(first.weight_kg)) * 100) / 100 : null;
  $('weight-change').textContent = change === null ? '–' : `${change > 0 ? '+' : ''}${formatNumber.format(change)} kg`;
  renderChart();
  renderHistory('ab_weights', $('weight-history'), snapshot.weights, null, 'weight-form');
  renderHistory('ab_measurements', $('measurements-history'), snapshot.measurements, measurements, 'measurements-form');
  renderAnalysis();
  renderCalendar();
  renderPhotos();
}
function renderPhotos() {
  for (const url of photoUrls) URL.revokeObjectURL(url);
  photoUrls.clear();
  if ($('photo-dialog').open) $('photo-dialog').close();
  $('large-photo').removeAttribute('src');
  $('photo-gallery').replaceChildren();
  shownPhotos = 0;
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
    $('photo-gallery').append(card);
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
  return $('photo-filter').value === 'day' ? snapshot.photos.filter(photo => photo.recorded_on === selectedDay) : snapshot.photos;
}
function signed(value) {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${formatNumber.format(rounded)}`;
}
function renderAnalysis() {
  const a = latestAnalysis;
  $('floating-weight').textContent = a.latest ? `${formatNumber.format(a.latest.weight_kg)} kg` : 'Gewicht: –';
  $('floating-bmi').textContent = a.bmi === null ? 'BMI: Größe/Gewicht fehlt' : `BMI ${a.bmi.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  $('floating-date').textContent = a.latest ? `Stand ${dateLabel(a.latest.recorded_on)}` : 'Noch kein Gewicht erfasst';
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
  buttons.append(action('Gewicht', () => { tab('weight'); $('weight-form').scrollIntoView({ block: 'start' }); }),
    action('Maße', () => { tab('measurements'); $('measurements-form').scrollIntoView({ block: 'start' }); }),
    action('Fotos', () => { $('photo-filter').value = 'day'; renderPhotos(); tab('photos'); $('photo-form').scrollIntoView({ block: 'start' }); }));
  summary.append(buttons);
}
function selectDay(day, preserveForm = '') {
  selectedDay = dateValue(day);
  visibleMonth = selectedDay.slice(0, 7);
  for (const [id, data] of [['weight-form', snapshot.weights], ['measurements-form', snapshot.measurements]]) {
    if (id === preserveForm) continue;
    const form = $(id), row = data.find(item => item.recorded_on === selectedDay);
    form.reset();
    for (const input of form.querySelectorAll('input,textarea')) input.value = input.name === 'recorded_on' ? selectedDay : row?.[input.name] ?? '';
  }
  if (preserveForm !== 'photo-form') { $('photo-form').reset(); $('photo-form').elements.recorded_on.value = selectedDay; }
  renderCalendar();
  if ($('photo-filter').value === 'day') renderPhotos();
}
function clearMfa() {
  activeFactors = []; enrollmentId = null;
  $('mfa-secret').textContent = '';
  $('mfa-qr').removeAttribute('src');
  $('mfa-qr-panel').hidden = true;
  $('mfa-form').reset();
  $('mfa-factor').replaceChildren();
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
  ++epoch; clearPrivate(); clearMfa(); resetForms();
  user = null;
  $('mfa-panel').hidden = true; $('denied-panel').hidden = true;
  $('login-panel').hidden = false; $('logout').hidden = true;
  try { await client.auth.signOut({ scope: 'local' }); }
  finally { sessionStorage.removeItem('abnehmen-auth'); message(text); }
}
function bindAdditionalFeatures() {
  $('previous-month').addEventListener('click', () => { visibleMonth = shiftMonth(visibleMonth, -1); renderCalendar(); });
  $('next-month').addEventListener('click', () => { visibleMonth = shiftMonth(visibleMonth, 1); renderCalendar(); });
  $('calendar-month').addEventListener('change', event => { try { monthGrid(event.target.value); visibleMonth = event.target.value; renderCalendar(); } catch (error) { message(error.message, true); } });
  $('jump-date').addEventListener('change', event => { try { selectDay(event.target.value); } catch (error) { message(error.message, true); } });
  $('jump-today').addEventListener('click', () => selectDay(localDate()));
  for (const id of ['weight-form', 'measurements-form', 'photo-form']) $(id).elements.recorded_on.addEventListener('change', event => {
    try { selectDay(event.target.value, id); } catch (error) { message(error.message, true); }
  });
  $('photo-filter').addEventListener('change', renderPhotos);
  $('floating-summary').addEventListener('click', () => { tab('overview'); document.querySelector('.analysis-card').scrollIntoView({ behavior: 'smooth' }); });
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
    await loadSnapshot(generation);
    if (generation === epoch) message('Körpergröße und BMI aktualisiert.');
  });
  $('enroll-mfa').addEventListener('click', () => busy($('enroll-mfa'), async generation => {
    const factors = await client.auth.mfa.listFactors(); fail(factors.error);
    for (const factor of factors.data.all || []) {
      if (factor.status === 'unverified' && factor.friendly_name?.startsWith('Abnehmen ')) {
        const removed = await client.auth.mfa.unenroll({ factorId: factor.id }); fail(removed.error);
      }
    }
    const enrolled = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Abnehmen ${new Date().toISOString()}` }); fail(enrolled.error);
    if (generation !== epoch) return;
    enrollmentId = enrolled.data.id;
    $('mfa-qr').src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrolled.data.totp.qr_code)}`;
    $('mfa-secret').textContent = enrolled.data.totp.secret;
    $('mfa-qr-panel').hidden = false; $('mfa-form').hidden = false; $('mfa-factor-label').hidden = true;
    $('mfa-instructions').textContent = 'QR-Code mit deinem Authenticator scannen oder den Schlüssel manuell eintragen. Danach den sechsstelligen Code eingeben.';
  }));
  bindForm('mfa-form', async (data, generation, form) => {
    const factorId = enrollmentId || $('mfa-factor').value;
    if (!factorId) throw new Error('Bitte zuerst deinen Authenticator einrichten.');
    const challenge = await client.auth.mfa.challenge({ factorId }); fail(challenge.error);
    const verified = await client.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: String(data.get('code')).trim() });
    form.elements.code.value = '';
    if (verified.error) throw new Error('Der Code ist ungültig oder abgelaufen. Bitte den nächsten Code aus deinem Authenticator versuchen.');
    $('mfa-secret').textContent = ''; $('mfa-qr').removeAttribute('src'); $('mfa-qr-panel').hidden = true;
    if (generation === epoch) $('message').hidden = true;
  });
  for (const event of ['pointerdown','keydown','touchstart','wheel']) document.addEventListener(event, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
  setInterval(async () => {
    if (!user || document.hidden || refreshPending) return;
    if (Date.now() - lastActivity >= 10 * 60 * 1000) { await lockDiary().catch(() => {}); return; }
    if (!diaryId) return;
    refreshPending = true;
    try { await loadSnapshot(); await assistant?.load().catch(() => {}); await dailyRecipes?.load(); }
    catch { await lockDiary('Die private Verbindung konnte nicht bestätigt werden. Bitte melde dich erneut an.').catch(() => {}); }
    finally { refreshPending = false; }
  }, 15000);
  document.addEventListener('visibilitychange', async () => {
    if (!user) return;
    if (document.hidden) {
      ++epoch; clearPrivate(); clearMfa(); resetForms(); $('mfa-panel').hidden = true;
    } else if (Date.now() - lastActivity >= 10 * 60 * 1000) {
      await lockDiary().catch(() => {});
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
  $('mfa-panel').hidden = true;
  clearMfa();
  if (!user) { resetForms(); return; }
  lastActivity = Date.now();
  try {
    const access = await client.from('ab_access').select('enabled,diary_user_id').eq('user_id', user.id).maybeSingle();
    fail(access.error);
    if (generation !== epoch) return;
    if (!access.data?.enabled) { $('denied-panel').hidden = false; return; }
    const [assurance, factors] = await Promise.all([client.auth.mfa.getAuthenticatorAssuranceLevel(), client.auth.mfa.listFactors()]);
    fail(assurance.error); fail(factors.error);
    if (generation !== epoch) return;
    activeFactors = (factors.data.totp || []).filter(factor => factor.status === 'verified');
    if (assurance.data.currentLevel !== 'aal2' || !activeFactors.length) {
      enrollmentId = (factors.data.all || []).find(factor => factor.status === 'unverified' && factor.friendly_name?.startsWith('Abnehmen '))?.id || null;
      $('mfa-panel').hidden = false;
      $('mfa-enrollment').hidden = activeFactors.length > 0;
      $('mfa-form').hidden = activeFactors.length === 0 && !enrollmentId;
      $('mfa-instructions').textContent = enrollmentId ? 'Wenn du den Authenticator bereits hinzugefügt hast, gib seinen aktuellen Code ein. Andernfalls „Authenticator einrichten“ wählen und einen neuen QR-Code scannen.' : 'Bestätige die Anmeldung mit deinem Authenticator. Falls noch keiner hinterlegt ist, richte ihn hier ein.';
      $('mfa-factor').replaceChildren(...activeFactors.map(factor => {
        const option = node('option', factor.friendly_name || 'Authenticator'); option.value = factor.id; return option;
      }));
      $('mfa-factor-label').hidden = activeFactors.length < 2;
      return;
    }
    diaryId = access.data.diary_user_id;
    await loadSnapshot(generation);
    if (generation !== epoch) return;
    $('dashboard').hidden = false;
    renderChart();
    $('floating-summary').hidden = false;
    $('height-form').elements.height_cm.value = heightCm ?? '';
    selectDay(selectedDay);
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
    busy(form.querySelector('[type=submit]'), async generation => {
      const data = new FormData(form);
      await callback(data, generation, form);
    });
  });
}
async function start() {
  if (window.self !== window.top) {
    const link = node('a','Tagebuch direkt öffnen'); link.href = './'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    document.body.replaceChildren(node('p','Der private Bereich wird in eingebetteten Fenstern nicht geöffnet.'),link);
    return;
  }
  resetForms();
  const config = await fetch('./config.json', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Die App-Konfiguration konnte nicht geladen werden.');
    return response.json();
  });
  client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { storageKey: 'abnehmen-auth', storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) }
  });
  client.auth.onAuthStateChange((_event, session) => {
    // Leave the SDK's auth lock before making further API requests.
    setTimeout(() => sessionChanged(session), 0);
  });
  bindForm('login-form', async (data, generation, form) => {
    const result = await client.auth.signInWithPassword({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
    form.elements.password.value = '';
    if (result.error) throw new Error('Anmeldung fehlgeschlagen. Bitte prüfe E-Mail und Passwort oder versuche es später erneut.');
    $('message').hidden = true;
  });
  bindForm('weight-form', async (data, generation) => {
    await saveDaily(client, 'ab_weights', weightPayload(data));
    await loadSnapshot(generation);
    if (generation === epoch) message('Gewicht gespeichert.');
  });
  bindForm('measurements-form', async (data, generation) => {
    await saveDaily(client, 'ab_measurements', measurementsPayload(data));
    await loadSnapshot(generation);
    if (generation === epoch) message('Körpermaße gespeichert.');
  });
  bindForm('photo-form', async (data, generation, form) => {
    const uid = diaryId;
    if (!uid) throw new Error('Bitte melde dich erneut an.');
    const payload = { recorded_on: dateValue(data.get('recorded_on')), view: data.get('view'), note: noteValue(data.get('note')) };
    const jpeg = await compressPhoto(data.get('photo'));
    if (generation !== epoch) return;
    await uploadPhoto(client, uid, payload, jpeg);
    await loadSnapshot(generation);
    if (generation === epoch) { form.elements.photo.value = ''; form.elements.note.value = ''; message('Foto privat gespeichert.'); }
  });
  $('logout').addEventListener('click', () => busy($('logout'), () => lockDiary('Du bist abgemeldet.')));
  for (const button of document.querySelectorAll('[data-tab]')) button.addEventListener('click', () => tab(button.dataset.tab));
  $('more-photos').addEventListener('click', appendPhotos);
  $('close-photo').addEventListener('click', () => $('photo-dialog').close());
  $('photo-dialog').addEventListener('close', () => $('large-photo').removeAttribute('src'));
  bindAdditionalFeatures();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer=setTimeout(() => { if(user&&!$('dashboard').hidden)renderChart(); },120); });
  assistant = new Assistant({ client, active: () => Boolean(user && diaryId && !$('dashboard').hidden), error: message });
  dailyRecipes = new DailyRecipes({client,container:$('daily-recipes')});
  const { data, error } = await client.auth.getSession();
  fail(error);
  await sessionChanged(data.session);
}
start().catch(error => message(error.message || 'Die App konnte nicht gestartet werden. Bitte lade die Seite erneut.', true));
