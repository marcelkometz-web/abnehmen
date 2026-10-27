export const measurements = [
  ['chest_cm', 'Brust'], ['waist_cm', 'Taille'], ['hip_cm', 'Hüfte'],
  ['upper_arm_cm', 'Oberarm'], ['thigh_cm', 'Oberschenkel']
];
export const views = { front: 'Vorne', side: 'Seite', back: 'Hinten', other: 'Sonstige' };
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31' || new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value) {
    throw new Error('Bitte ein gültiges Datum eingeben.');
  }
  return value;
}
export function numberValue(value, max, decimals = 1) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error('Bitte eine gültige Zahl eingeben.');
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > max) throw new Error(`Bitte einen Wert zwischen 0 und ${max} eingeben.`);
  if (Math.abs(n * 10 ** decimals - Math.round(n * 10 ** decimals)) > 1e-7) throw new Error(`Bitte höchstens ${decimals} Nachkommastellen verwenden.`);
  return n;
}
export function noteValue(value) {
  const text = String(value || '').trim();
  if (text.length > 1000) throw new Error('Die Notiz darf höchstens 1000 Zeichen lang sein.');
  return text;
}
export function weightPayload(form) {
  const weight = numberValue(form.get('weight_kg'), 700, 2);
  if (weight < 1) throw new Error('Bitte ein Gewicht ab 1 kg eingeben.');
  return { recorded_on: dateValue(form.get('recorded_on')), weight_kg: weight, note: noteValue(form.get('note')) };
}
export function measurementsPayload(form) {
  const result = { recorded_on: dateValue(form.get('recorded_on')), note: noteValue(form.get('note')) };
  for (const [field] of measurements) {
    const raw = String(form.get(field) || '').trim();
    result[field] = raw ? numberValue(raw, 500) : null;
  }
  if (!measurements.some(([field]) => result[field] !== null)) throw new Error('Bitte mindestens ein Körpermaß eingeben.');
  return result;
}
export function photoPath(userId, id) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!uuid.test(userId) || !uuid.test(id)) throw new Error('Ungültige Foto-Zuordnung.');
  return `${userId}/${id}.jpg`;
}

export function monthGrid(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Ungültiger Monat.');
  const [year, number] = month.split('-').map(Number);
  if (year < 2000 || year > 2100 || number < 1 || number > 12) throw new Error('Ungültiger Monat.');
  const first = new Date(year, number - 1, 1, 12);
  const days = new Date(year, number, 0, 12).getDate();
  return [...Array((first.getDay() + 6) % 7).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
}
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number);
  const next = localDate(new Date(year, number - 1 + delta, 1, 12)).slice(0, 7);
  return next < '2000-01' ? '2000-01' : next > '2100-12' ? '2100-12' : next;
}
export function analyze(data, height, today = localDate()) {
  // Compare by observation date, never by upload time. Backfilled records cannot
  // accidentally become the "current" weight just because they were uploaded now.
  const weights = [...data.weights].filter(row => row.recorded_on <= today).sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
  const body = [...data.measurements].filter(row => row.recorded_on <= today).sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
  const first = weights[0] || null, latest = weights.at(-1) || null;
  const bmi = latest && Number(height) >= 50 && Number(height) <= 260 ? Number(latest.weight_kg) / (Number(height) / 100) ** 2 : null;
  const start = new Date(today + 'T12:00:00'); start.setDate(start.getDate() - 6);
  const recent = weights.filter(row => row.recorded_on >= localDate(start));
  const circumferenceChanges = measurements.map(([field, label]) => {
    const rows = body.filter(row => row[field] !== null && row[field] !== undefined);
    return { field, label, first: rows[0] || null, latest: rows.at(-1) || null,
      change: rows.length > 1 ? Number(rows.at(-1)[field]) - Number(rows[0][field]) : null };
  });
  return { first, latest, bmi, weightChange: first && latest ? Number(latest.weight_kg) - Number(first.weight_kg) : null,
    weeklyAverage: recent.length ? recent.reduce((sum, row) => sum + Number(row.weight_kg), 0) / recent.length : null,
    recentCount: recent.length, circumferenceChanges, weightCount: weights.length, photoCount: data.photos.length };
}
export function sortPhotos(photos, order = 'desc') {
  const direction = order === 'asc' ? 1 : -1, viewOrder = {front:0,side:1,back:2,other:3};
  return [...photos].sort((a,b) => direction * a.recorded_on.localeCompare(b.recorded_on)
    || (viewOrder[a.view]??3) - (viewOrder[b.view]??3)
    || String(b.created_at||'').localeCompare(String(a.created_at||''))
    || String(a.id).localeCompare(String(b.id)));
}
