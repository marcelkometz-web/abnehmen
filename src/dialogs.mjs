// Native dialogs make the page inert, but iOS can still scroll it underneath.
// Fix its position while any dialog is open and restore the exact position.
export function setupDialogScrollLock() {
  let locked = false;
  let scrollTop = 0;
  const sync = () => {
    const open = Boolean(document.querySelector('dialog[open]'));
    if (open === locked) return;
    locked = open;
    if (open) {
      scrollTop = window.scrollY;
      document.body.style.top = `-${scrollTop}px`;
      document.documentElement.classList.add('dialog-open');
    } else {
      document.documentElement.classList.remove('dialog-open');
      document.body.style.removeProperty('top');
      window.scrollTo({ top: scrollTop, behavior: 'instant' });
    }
  };
  const observer = new MutationObserver(sync);
  for (const dialog of document.querySelectorAll('dialog')) {
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    dialog.addEventListener('close', sync);
  }
  sync();
}
