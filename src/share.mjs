import { analyze, measurements, localDate } from './domain.mjs';
const format = value => Number(value).toLocaleString('de-DE', { maximumFractionDigits: 1 });
export function shareContent(snapshot, height, options) {
  const asOf = options.asOf || localDate();
  const filtered = { weights: snapshot.weights.filter(row => row.recorded_on <= asOf), measurements: snapshot.measurements.filter(row => row.recorded_on <= asOf), photos: [] };
  const a = analyze(filtered, height, asOf);
  const lines = [];
  if (options.weight && a.latest) lines.push({ label: 'Gewicht', value: `${format(a.latest.weight_kg)} kg` });
  if (options.change && a.weightChange !== null) lines.push({ label: 'Veränderung seit Beginn', value: `${a.weightChange > 0 ? '+' : ''}${format(a.weightChange)} kg` });
  if (options.bmi && a.bmi !== null) lines.push({ label: 'BMI', value: format(a.bmi) });
  for (const [field, label] of measurements) {
    if (!options[field]) continue;
    const metric = a.circumferenceChanges.find(item => item.field === field);
    if (metric?.latest) lines.push({ label, value: `${format(metric.latest[field])} cm` });
  }
  const photo = options.photoId ? snapshot.photos.find(item => item.id === options.photoId) || null : null;
  if (!lines.length && !photo) throw new Error('Bitte mindestens einen vorhandenen Wert oder ein Foto auswählen.');
  return { title: 'Mein Fortschritt', caption: String(options.caption || '').trim().slice(0, 120),
    date: options.date ? new Date(asOf + 'T12:00:00').toLocaleDateString('de-DE') : '', lines,
    photoPath: photo?.storage_path || null };
}
function wrap(context, text, width) {
  const words = text.split(/\s+/), lines = []; let line = '';
  for (const word of words) {
    if (context.measureText(line ? `${line} ${word}` : word).width > width && line) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
export async function makeShareCard(content, photoBlob, formatName = 'story') {
  const canvas = document.createElement('canvas'); canvas.width = 1080;
  canvas.height = formatName === 'square' ? 1080 : formatName === 'portrait' ? 1350 : 1920;
  const ctx = canvas.getContext('2d'); const h = canvas.height;
  ctx.fillStyle = '#f4edf8'; ctx.fillRect(0, 0, 1080, h);
  ctx.fillStyle = '#e9dff0'; ctx.beginPath(); ctx.arc(1000, 30, 250, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#705280'; ctx.font = '34px sans-serif'; ctx.fillText('✦  MEIN WEG. MEIN TEMPO.', 78, 100);
  ctx.fillStyle = '#493652'; ctx.font = '64px Georgia, serif'; ctx.fillText(content.title, 74, 192);
  let y = h < 1400 ? 235 : 245;
  if (content.date) { ctx.font = '27px sans-serif'; ctx.fillText(content.date, 78, y); y += h < 1400 ? 40 : 50; }
  if (content.caption) {
    ctx.font = '30px sans-serif';
    for (const line of wrap(ctx, content.caption, 920).slice(0, h < 1400 ? 2 : 3)) { ctx.fillText(line, 78, y); y += h < 1400 ? 34 : 42; }
    y += 10;
  }
  const rowHeight = h < 1400 ? 58 : 85;
  if (photoBlob) {
    const available = h - y - content.lines.length * rowHeight - (h < 1400 ? 110 : 130);
    const photoHeight = Math.max(100, Math.min(available, h > 1400 ? 820 : 480));
    const bitmap = await createImageBitmap(photoBlob);
    try {
      const factor = Math.min(920 / bitmap.width, photoHeight / bitmap.height);
      const width = bitmap.width * factor, height = bitmap.height * factor;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(70, y, 940, photoHeight + 20, 24); ctx.fill();
      ctx.drawImage(bitmap, (1080 - width) / 2, y + 10 + (photoHeight - height) / 2, width, height);
      y += photoHeight + (h < 1400 ? 35 : 45);
    } finally { bitmap.close(); }
  }
  for (const line of content.lines) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(70, y, 940, rowHeight - 10, 16); ctx.fill();
    ctx.fillStyle = '#716077'; ctx.font = '27px sans-serif'; ctx.fillText(line.label, 100, y + (rowHeight - 10) / 2 + 10);
    ctx.fillStyle = '#493652'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(line.value, 978, y + (rowHeight - 10) / 2 + 10); ctx.textAlign = 'left';
    y += rowHeight;
  }
  ctx.fillStyle = '#806e89'; ctx.font = '25px sans-serif'; ctx.fillText('Jeder kleine Schritt zählt.', 78, h - 55);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('Die Karte konnte nicht erstellt werden.');
  return blob;
}
