/* ==========================================================
   MENU MOBILE — bouton burger
   Chargé par les pages secondaires (guide, mentions légales, CGV,
   confirmation de commande) qui n'ont pas leur propre script de nav.
   index.html et blog/ ont déjà le leur : le garde ci-dessous évite
   tout double branchement si ce fichier y est ajouté un jour.
   ========================================================== */
(function () {
  'use strict';

  var toggle = document.getElementById('mobile-menu');
  var menu = document.querySelector('.nav-menu');
  if (!toggle || !menu || toggle.dataset.navBound === '1') return;
  toggle.dataset.navBound = '1';

  function ouvrir() {
    toggle.classList.add('active');
    menu.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function fermer() {
    toggle.classList.remove('active');
    menu.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function basculer() {
    if (menu.classList.contains('active')) fermer();
    else ouvrir();
  }

  toggle.addEventListener('click', basculer);

  // Le burger est un div : le clavier se câble à la main
  toggle.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      basculer();
    }
  });

  // Fermeture après un clic sur un lien
  var liens = menu.querySelectorAll('.nav-link');
  for (var i = 0; i < liens.length; i++) {
    liens[i].addEventListener('click', fermer);
  }

  // Échap ferme le menu
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('active')) {
      fermer();
      toggle.focus();
    }
  });

  // Clic en dehors de la navigation
  document.addEventListener('click', function (e) {
    if (!menu.classList.contains('active')) return;
    if (menu.contains(e.target) || toggle.contains(e.target)) return;
    fermer();
  });
})();
