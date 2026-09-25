/* Contrôleur commun ; les anciens scripts de pages gardent leurs autres fonctions. */
(() => {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const toggle = nav.querySelector('.menu-toggle');
  const menu = nav.querySelector('.nav-menu');
  toggle.dataset.navBound = '1';
  const mobile = matchMedia('(max-width: 1100px)');
  function setOpen(open) {
    toggle.classList.toggle('active', open);
    menu.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.inert = mobile.matches && !open;
  }
  // Capture évite une double bascule par les anciens gestionnaires intégrés.
  toggle.addEventListener('click', event => {
    event.stopImmediatePropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  }, true);
  menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', event => { if (!nav.contains(event.target)) setOpen(false); });
  document.addEventListener('focusin', event => { if (!nav.contains(event.target)) setOpen(false); });
  mobile.addEventListener('change', () => setOpen(false));
  setOpen(false);
})();
