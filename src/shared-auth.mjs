// One browser login for the three apps. Only Supabase session data and an idle
// timestamp are shared; application data and provider API keys never enter here.
export const IDLE_MS = 10 * 60 * 1000;
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
};
function browserStorage(name) {
  try {
    const storage = globalThis[name], probe = 'ramona-auth-storage-test';
    storage.setItem(probe, '1'); storage.removeItem(probe);
    return storage;
  } catch { return null; }
}
function validSession(raw) {
  try {
    if (!raw || raw.length > 262144) return false;
    const value = JSON.parse(raw);
    return typeof value?.access_token === 'string' && Boolean(value.access_token)
      && typeof value.refresh_token === 'string' && Boolean(value.refresh_token)
      && typeof value.user?.id === 'string';
  } catch { return false; }
}
function identity(raw) {
  try {
    const session = JSON.parse(raw), part = session.access_token.split('.')[1];
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return session.user.id + ':' + claims.session_id;
  } catch { return null; }
}
export function createSharedAuth({ projectUrl, legacyKey, sharedStorage, tabStorage, now = Date.now, documentObject = globalThis.document, windowObject = globalThis.window, timers = globalThis } = {}) {
  const storageKey = `sb-${new URL(projectUrl).hostname.split('.')[0]}-auth-token`;
  const tab = tabStorage ?? browserStorage('sessionStorage') ?? memoryStorage();
  const shared = sharedStorage ?? browserStorage('localStorage') ?? tab;
  const activityKey = storageKey + ':activity', markerKey = storageKey + ':shared-v1', recoveryKey = storageKey + ':recovery';
  const legacyKeys = [...new Set([legacyKey, storageKey, 'abnehmen-auth'].filter(Boolean))];
  let client, pending = false, bypassIdle = false, timer;
  const clearLegacy = () => { if (tab !== shared) for (const key of legacyKeys) tab.removeItem(key); };
  const isIdle = () => {
    if (!shared.getItem(storageKey)) return false;
    const activity = Number(shared.getItem(activityKey)), time = now();
    return !Number.isFinite(activity) || activity <= 0 || activity > time + 60000 || time - activity >= IDLE_MS;
  };
  // Migrate an existing login once. A logout tombstone prevents another tab's
  // older sessionStorage copy from silently logging the person back in.
  if (!shared.getItem(markerKey)) {
    const existing = shared.getItem(storageKey);
    const candidate = validSession(existing) ? existing : legacyKeys.map(key => tab.getItem(key)).find(validSession);
    if (candidate) {
      shared.setItem(activityKey, String(now())); shared.setItem(storageKey, candidate);
      shared.setItem(markerKey, '1'); clearLegacy();
    }
  } else clearLegacy();
  async function expire() {
    if (!client || pending || !isIdle()) return;
    pending = true; bypassIdle = true;
    try {
      let failed = false;
      try { failed = Boolean((await client.auth.signOut({ scope: 'local' })).error); }
      catch { failed = true; }
      if (failed) {
        storage.removeItem(storageKey);
        // With no stored token this emits SIGNED_OUT without another network call.
        await client.auth.signOut({ scope: 'local' });
      }
    } finally { bypassIdle = false; pending = false; }
  }
  const scheduleExpiry = () => { if (client && !pending) timers.setTimeout(() => expire().catch(() => {}), 0); };
  const storage = {
    getItem(key) {
      if (key === storageKey && !bypassIdle && isIdle()) { scheduleExpiry(); return null; }
      return shared.getItem(key);
    },
    setItem(key, value) {
      if (key === storageKey) {
        if (!validSession(value)) throw Error('Die Anmeldung konnte nicht gespeichert werden.');
        const before = shared.getItem(key), newIdentity = identity(value), previousIdentity = identity(before);
        const newLogin = !before || (newIdentity && previousIdentity && newIdentity !== previousIdentity);
        if (!newLogin && isIdle()) { scheduleExpiry(); return; }
        if (newLogin) shared.setItem(activityKey, String(now()));
        shared.setItem(markerKey, '1'); clearLegacy();
      }
      shared.setItem(key, value);
    },
    removeItem(key) {
      shared.removeItem(key);
      if (key === storageKey) {
        shared.removeItem(activityKey); shared.removeItem(recoveryKey); shared.setItem(markerKey, '1'); clearLegacy();
      }
    }
  };
  const touch = event => {
    if (event?.isTrusted === false || documentObject?.hidden || !shared.getItem(storageKey)) return;
    if (isIdle()) { scheduleExpiry(); return; }
    if (now() - Number(shared.getItem(activityKey)) >= 1000) shared.setItem(activityKey, String(now()));
  };
  return {
    storageKey, storage, isIdle, expire,
    isRecovering: session => Boolean(session && identity(JSON.stringify(session)) && shared.getItem(recoveryKey) === identity(JSON.stringify(session))),
    finishRecovery: () => shared.removeItem(recoveryKey),
    bind(currentClient) {
      if (client) return;
      client = currentClient;
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) shared.setItem(recoveryKey, identity(JSON.stringify(session)) || '');
        if (event === 'SIGNED_OUT') { shared.setItem(markerKey, '1'); clearLegacy(); }
      });
      for (const event of ['pointerdown', 'keydown', 'touchstart', 'wheel']) documentObject?.addEventListener(event, touch, { passive: true, capture: true });
      documentObject?.addEventListener('visibilitychange', scheduleExpiry);
      windowObject?.addEventListener('pageshow', scheduleExpiry);
      timer = timers.setInterval(() => expire().catch(() => {}), 15000);
      timer?.unref?.();
      scheduleExpiry();
    }
  };
}
