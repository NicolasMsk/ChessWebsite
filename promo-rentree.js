/* Bandeau de l’offre sur le livre relié, commun à toutes les pages du site. */
(function () {
  'use strict';

  // Résolu depuis ce script pour fonctionner aussi en ouvrant les fichiers locaux.
  var pageCadeauxUrl = new URL('idee-cadeau-echecs.html', document.currentScript.src);
  var banner = document.querySelector('.promo-banner');
  if (!banner) {
    banner = document.createElement('aside');
    document.body.insertBefore(banner, document.body.firstChild);
  }
  banner.className = 'promo-banner rentree-banner';
  banner.setAttribute('aria-label', 'Cadeaux d’échecs pour Noël');
  banner.innerHTML = '<div class="rentree-banner__inner">' +
    '<div class="rentree-banner__copy"><span class="rentree-banner__tag">Des échecs sous le sapin</span>' +
    '<span class="rentree-banner__detail">Ouvrages en stock · Livrés sous 7 jours maximum</span></div>' +
    '<div class="rentree-banner__offer"><strong>Dès 15 €</strong></div>' +
    '<a class="rentree-banner__cta"></a></div>';
  var cta = banner.querySelector('.rentree-banner__cta');
  cta.href = location.pathname === pageCadeauxUrl.pathname ? '#choisir-cadeau' : pageCadeauxUrl.href;
  cta.textContent = 'Choisir un cadeau';
  document.body.classList.add('has-promo', 'has-rentree-promo');
  function updateAnchorOffset() {
    var nav = document.querySelector('.navbar');
    document.body.style.setProperty('--rentree-anchor-offset', (banner.offsetHeight + (nav ? nav.offsetHeight : 0) + 16) + 'px');
  }
  updateAnchorOffset();
  window.addEventListener('resize', updateAnchorOffset);
  window.addEventListener('load', function () {
    updateAnchorOffset();
    if (location.hash === '#pack-livres') {
      var book = document.getElementById('pack-livres');
      if (book) book.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  });
})();
