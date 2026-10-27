import { photoPath } from './domain.mjs';
export const bucket = 'ab-progress-photos';
export function fail(error) {
  if (error) {
    if (error.code === '23505') throw new Error('Für diesen Tag besteht bereits ein Eintrag. Bitte neu laden und erneut speichern.');
    if (['42501', 'PGRST301', 'PGRST116'].includes(error.code)) throw new Error('Kein Zugriff. Bitte melde dich erneut an.');
    throw new Error('Die Änderung konnte nicht gespeichert werden. Bitte prüfe deine Verbindung und versuche es erneut.');
  }
}
export async function allRows(client, table) {
  const result = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from(table).select('*').order('recorded_on', { ascending: false }).order('id').range(from, from + 499);
    fail(error);
    result.push(...data);
    if (data.length < 500) return result;
  }
}
export async function saveDaily(client, table, payload) {
  const existing = await client.from(table).select('id').eq('recorded_on', payload.recorded_on).maybeSingle();
  fail(existing.error);
  const query = existing.data ? client.from(table).update(payload).eq('id', existing.data.id) : client.from(table).insert(payload);
  const result = await query.select('id').single();
  fail(result.error);
  return result.data;
}
export async function uploadPhoto(client, userId, payload, jpeg) {
  const id = crypto.randomUUID();
  const path = photoPath(userId, id);
  const storage = client.storage.from(bucket);
  const uploaded = await storage.upload(path, jpeg, { contentType: 'image/jpeg', cacheControl: '0', upsert: false });
  fail(uploaded.error);
  const saved = await client.from('ab_progress_photos').insert({ id, ...payload }).select('id').single();
  if (saved.error) {
    const cleanup = await storage.remove([path]);
    if (cleanup.error) throw new Error('Der Fotoeintrag konnte nicht gespeichert werden. Die hochgeladene Datei konnte nicht entfernt werden; bitte die Bereinigung des privaten Fotobereichs veranlassen.');
    fail(saved.error);
  }
  return saved.data;
}
export async function deletePhoto(client, photo) {
  // Delete the file first; keeping metadata on failure makes deletion retryable.
  const removed = await client.storage.from(bucket).remove([photo.storage_path]);
  fail(removed.error);
  const result = await client.from('ab_progress_photos').delete().eq('id', photo.id).select('id').single();
  fail(result.error);
}
