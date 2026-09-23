/* Bandeau de l'offre sur le livre relié, réservé aux deux pages du livre. */
(function () {
  'use strict';
  // Les deux pages du livre se reconnaissent à leur ancre : #pack-livres pour la
  // page de vente, #livre-relie pour le renvoi depuis le guide gratuit. Partout
  // ailleurs, on sort avant toute écriture : ce script écrasait auparavant le
  // .promo-banner déjà présent dans le HTML, ce qui remplaçait le « 1er cours
  // offert » — le CTA principal du site — par la promotion d'un produit
  // secondaire, sur l'accueil comme sur les 43 autres pages qui le chargeaient.
  var pageDeVente = document.getElementById('pack-livres');
  if (!pageDeVente && !document.getElementById('livre-relie')) return;

  // Résolu depuis ce script pour fonctionner aussi en ouvrant les fichiers locaux.
  var pageLivreUrl = new URL('edition-raffinee/', document.currentScript.src);
  var banner = document.querySelector('.promo-banner');
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
    '<a class="rentree-banner__cta"></a></div>';
  // Sur la page de vente, renvoyer vers la page elle-même n'avait aucun effet :
  // on descend vers le bloc de l'offre. Depuis le guide, on va à la page du livre.
  var cta = banner.querySelector('.rentree-banner__cta');
  cta.href = pageDeVente ? '#pack-livres' : pageLivreUrl.href;
  cta.textContent = pageDeVente ? 'Voir l’offre →' : 'Découvrir le livre →';
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
