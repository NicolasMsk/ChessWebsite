/* Bannière temporaire partagée ; l'ancienne bannière reste dans le HTML. */
(function () {
  'use strict';
  // Résolu depuis ce script pour fonctionner aussi en ouvrant les fichiers locaux.
  // Une seule page de vente : edition-raffinee/ (la page du guide ne fait qu'y renvoyer).
  var guideUrl = new URL('edition-raffinee/', document.currentScript.src);
  var banner = document.querySelector('.promo-banner');
  // Pages sans bandeau dans le HTML : on n'en crée un que sur celles du livre
  // (page de vente et renvoi depuis le guide gratuit).
  if (!banner && !document.getElementById('pack-livres') && !document.getElementById('livre-relie')) return;
  if (!banner) {
    banner = document.createElement('aside');
    document.body.insertBefore(banner, document.body.firstChild);
  }
  banner.className = 'promo-banner rentree-banner';
  banner.setAttribute('aria-label', 'Offre sur le livre relié à la main');
  banner.innerHTML = '<div class="rentree-banner__inner">' +
    '<div class="rentree-banner__copy"><span class="rentree-banner__tag">Offre jusqu’au 15 octobre</span>' +
    '<span class="rentree-banner__detail">Livre relié à la main · 200 pages pour débuter · Livraison comprise</span></div>' +
    '<div class="rentree-banner__offer"><strong>39,99 €</strong></div>' +
    '<a class="rentree-banner__cta">Découvrir le livre →</a></div>';
  banner.querySelector('.rentree-banner__cta').href = guideUrl.href;
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
