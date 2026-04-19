/**
 * Bandeau de consentement cookies — RGPD
 * Auto-injecte sa CSS + son HTML. Charge Google Analytics uniquement après consentement.
 */
(function () {
  var CONSENT_KEY = 'chess-cookie-consent';
  var GA_ID = 'G-KCK01E71GB';

  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') { loadAnalytics(); return; }
  if (consent === 'refused')  { return; }

  // Injecte le CSS
  var style = document.createElement('style');
  style.textContent = [
    '#chess-cookie-banner{',
      'position:fixed;bottom:20px;left:20px;right:20px;',
      'max-width:520px;margin-left:auto;margin-right:auto;',
      'background:#ffffff;color:#2a2a2a;',
      'padding:22px 24px;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
      'font-size:15px;line-height:1.55;',
      'border-radius:14px;',
      'box-shadow:0 10px 40px rgba(0,0,0,0.18),0 2px 6px rgba(0,0,0,0.08);',
      'border:1px solid rgba(0,0,0,0.05);',
      'z-index:99999;',
      'animation:ccSlide .4s cubic-bezier(.22,.61,.36,1);',
      'box-sizing:border-box;',
    '}',
    '@keyframes ccSlide{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}',
    '#chess-cookie-banner .cc-head{',
      'display:flex;align-items:center;gap:10px;margin-bottom:10px;',
    '}',
    '#chess-cookie-banner .cc-emoji{font-size:22px;line-height:1;}',
    '#chess-cookie-banner .cc-title{',
      'font-size:16px;font-weight:700;color:#1a1a1a;letter-spacing:-0.2px;',
    '}',
    '#chess-cookie-banner p{',
      'margin:0 0 16px 0;color:#4a4a4a;font-size:14.5px;',
    '}',
    '#chess-cookie-banner a{color:#8B5A2B;text-decoration:underline;font-weight:500;}',
    '#chess-cookie-banner a:hover{color:#3E2C1C;}',
    '#chess-cookie-banner .cc-buttons{',
      'display:flex;gap:10px;',
    '}',
    '#chess-cookie-banner button{',
      'flex:1;padding:12px 18px;border-radius:8px;border:none;',
      'font-family:inherit;font-size:14px;font-weight:600;',
      'cursor:pointer;transition:all .18s ease;letter-spacing:.2px;',
      '-webkit-tap-highlight-color:transparent;',
    '}',
    '#chess-cookie-banner .cc-accept{',
      'background:#3E2C1C;color:#F0D9B5;',
    '}',
    '#chess-cookie-banner .cc-accept:hover{',
      'background:#5C3317;transform:translateY(-1px);',
      'box-shadow:0 4px 12px rgba(62,44,28,0.25);',
    '}',
    '#chess-cookie-banner .cc-refuse{',
      'background:#f3f0e8;color:#5a5a5a;',
    '}',
    '#chess-cookie-banner .cc-refuse:hover{background:#e8e3d4;color:#3E2C1C;}',
    '@media (max-width:540px){',
      '#chess-cookie-banner{bottom:12px;left:12px;right:12px;padding:18px 20px;}',
      '#chess-cookie-banner .cc-title{font-size:15px;}',
      '#chess-cookie-banner p{font-size:14px;margin-bottom:14px;}',
      '#chess-cookie-banner .cc-buttons{flex-direction:column;}',
      '#chess-cookie-banner button{padding:13px 18px;}',
    '}'
  ].join('');
  document.head.appendChild(style);

  // Injecte le HTML
  function injectBanner() {
    var banner = document.createElement('div');
    banner.id = 'chess-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Bandeau de consentement cookies');
    banner.innerHTML =
      '<div class="cc-head">' +
        '<span class="cc-emoji">🍪</span>' +
        '<span class="cc-title">Ce site utilise des cookies</span>' +
      '</div>' +
      '<p>Nous utilisons des cookies pour mesurer l\'audience du site via Google Analytics. Aucun cookie n\'est déposé sans votre accord. <a href="mentions-legales.html">En savoir plus</a></p>' +
      '<div class="cc-buttons">' +
        '<button class="cc-refuse" type="button">Refuser</button>' +
        '<button class="cc-accept" type="button">Accepter</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('.cc-accept').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      dismiss(banner);
      loadAnalytics();
    });
    banner.querySelector('.cc-refuse').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'refused');
      dismiss(banner);
    });
  }

  function dismiss(el) {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(function () { el.remove(); }, 280);
  }

  if (document.body) {
    injectBanner();
  } else {
    document.addEventListener('DOMContentLoaded', injectBanner);
  }

  function loadAnalytics() {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(gaScript);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  // Fonction globale pour permettre à l'utilisateur de réouvrir ses préférences
  window.chessCookiesReset = function () {
    localStorage.removeItem(CONSENT_KEY);
    location.reload();
  };
})();
