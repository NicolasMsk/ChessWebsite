/* ==========================================================
   PACK LIVRES RELIÉS — visionneuse photos + vidéo différée
   Partagé par index.html et guide-apprendre-les-echecs.html.
   Chargé avec `defer`. Sort silencieusement si la section est absente.
   ========================================================== */
(function () {
  'use strict';

  var section = document.getElementById('pack-livres');
  if (!section) return;

  // ---------- Visionneuse ----------

  var PHOTOS = [
    { src: 'images/reliure/pack-principal.webp', legende: 'Les deux volumes reliés à la main, sur un échiquier en bois' },
    { src: 'images/reliure/pack-tranche.webp',   legende: 'Debout : la tranche cousue main est visible' },
    { src: 'images/reliure/pack-rouge.webp',     legende: 'Le Volume I, couverture rouge, grain du papier ivoire' },
    { src: 'images/reliure/pack-plongee.webp',   legende: 'Vue en plongée des deux volumes' }
  ];

  var lb = document.getElementById('pack-lightbox');
  var stage = document.getElementById('plb-stage');
  var img = document.getElementById('plb-img');
  var caption = document.getElementById('plb-caption');
  var counter = document.getElementById('plb-counter');
  var strip = document.getElementById('plb-strip');
  var boutonFermer = document.getElementById('plb-close');
  var index = 0;
  var declencheur = null;

  if (lb && stage && img && strip) {
    // Vignettes de navigation dans la visionneuse
    PHOTOS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Voir : ' + p.legende);
      var t = document.createElement('img');
      t.src = p.src;
      t.alt = '';
      t.loading = 'lazy';
      b.appendChild(t);
      b.addEventListener('click', function () { afficher(i); });
      strip.appendChild(b);
    });
    var boutonsStrip = strip.querySelectorAll('button');

    var afficher = function (i) {
      index = (i + PHOTOS.length) % PHOTOS.length;
      img.src = PHOTOS[index].src;
      img.alt = PHOTOS[index].legende;
      caption.textContent = PHOTOS[index].legende;
      counter.textContent = (index + 1) + ' / ' + PHOTOS.length;
      stage.classList.remove('is-zoomed');
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      for (var j = 0; j < boutonsStrip.length; j++) {
        boutonsStrip[j].setAttribute('aria-current', j === index ? 'true' : 'false');
      }
    };

    var ouvrir = function (i, source) {
      declencheur = source || null;
      afficher(i);
      lb.hidden = false;
      lb.classList.add('is-open');
      document.body.classList.add('plb-lock');
      boutonFermer.focus();
    };

    var fermer = function () {
      lb.classList.remove('is-open');
      lb.hidden = true;
      document.body.classList.remove('plb-lock');
      stage.classList.remove('is-zoomed');
      if (declencheur && declencheur.focus) declencheur.focus();
    };

    // Ouverture depuis le visuel principal et les vignettes
    var ouvreurs = section.querySelectorAll('.pack-open-lb');
    for (var k = 0; k < ouvreurs.length; k++) {
      (function (el) {
        el.addEventListener('click', function () {
          ouvrir(parseInt(el.getAttribute('data-index'), 10) || 0, el);
        });
        // Le visuel principal est un div : le clavier se câble à la main
        if (el.getAttribute('role') === 'button') {
          el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              ouvrir(parseInt(el.getAttribute('data-index'), 10) || 0, el);
            }
          });
        }
      })(ouvreurs[k]);
    }

    boutonFermer.addEventListener('click', fermer);
    document.getElementById('plb-prev').addEventListener('click', function () { afficher(index - 1); });
    document.getElementById('plb-next').addEventListener('click', function () { afficher(index + 1); });

    // Clic sur l'image : zoom. Le défilement natif du conteneur sert de
    // déplacement, et le pincer-pour-zoomer du mobile reste disponible.
    img.addEventListener('click', function (e) {
      e.stopPropagation();
      var zoome = stage.classList.toggle('is-zoomed');
      if (zoome) {
        var r = img.getBoundingClientRect();
        var rx = (e.clientX - r.left) / r.width;
        var ry = (e.clientY - r.top) / r.height;
        stage.scrollLeft = rx * (stage.scrollWidth - stage.clientWidth);
        stage.scrollTop = ry * (stage.scrollHeight - stage.clientHeight);
      }
    });

    // Clic en dehors de l'image : fermeture
    stage.addEventListener('click', function (e) {
      if (e.target === stage) fermer();
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') fermer();
      else if (e.key === 'ArrowLeft') afficher(index - 1);
      else if (e.key === 'ArrowRight') afficher(index + 1);
    });

    // Balayage horizontal sur mobile (ignoré quand l'image est zoomée : le
    // geste sert alors à se déplacer à l'intérieur de l'image)
    var xDepart = null;
    stage.addEventListener('touchstart', function (e) {
      xDepart = e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (xDepart === null || stage.classList.contains('is-zoomed')) return;
      var dx = e.changedTouches[0].clientX - xDepart;
      if (Math.abs(dx) > 55) afficher(dx < 0 ? index + 1 : index - 1);
      xDepart = null;
    });
  }

  // ---------- Vidéo ----------
  // Chargée seulement à l'approche du viewport : évite d'imposer 2,7 Mo
  // à qui ne descend jamais jusqu'à cette section.

  var media = document.getElementById('pack-hero-media');
  var video = media ? media.querySelector('video') : null;
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (media && video && !reduit && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        video.preload = 'auto';
        video.load();
        var p = video.play();
        if (p && p.then) {
          p.then(function () {
            media.classList.add('is-video-ready');
          }, function () {
            /* autoplay refusé par le navigateur : on garde l'image fixe */
          });
        }
      });
    }, { rootMargin: '300px' });
    observer.observe(media);
  }
})();
