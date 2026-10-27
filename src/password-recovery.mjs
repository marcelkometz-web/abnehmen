export function recoveryLinkState(href, verifier = '') {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  return {
    requested: hash.get('type') === 'recovery' || (url.searchParams.has('code') && String(verifier).endsWith('/PASSWORD_RECOVERY')),
    failed: hash.has('error') || hash.has('error_code') || url.searchParams.has('error') || url.searchParams.has('error_code') || (url.searchParams.has('code') && !verifier)
  };
}
export function recoveryRedirect(href) {
  const url = new URL(href), app = /^\/(garten|rezepte|abnehmen)\//.exec(url.pathname)?.[1];
  if (!app) throw Error('Die Rückkehradresse der App ist ungültig.');
  return new URL('/' + app + '/', url.origin).href;
}
export function newPassword(form) {
  const password = String(form.get('password') || '');
  if (password.length < 12 || password.length > 128) throw Error('Bitte ein Passwort mit 12 bis 128 Zeichen wählen.');
  if (password !== String(form.get('confirm_password') || '')) throw Error('Die beiden Passwörter stimmen nicht überein.');
  return password;
}
export function clearRecoveryURL(href) {
  const url = new URL(href);
  for (const name of ['code', 'error', 'error_code', 'error_description']) url.searchParams.delete(name);
  url.hash = '';
  return url.pathname + url.search;
}
