# Audit complet — cours-echecs-paris.fr — 23 septembre 2026

Périmètre : code du dépôt (49 pages HTML publiées, Worker Cloudflare `api/`), site en production (curl, Lighthouse 13.5 local mobile/desktop, Search Console via compte de service sur 2 × 90 jours), pages légales, tunnel Stripe côté site. Non mesuré : données terrain CrUX (clé API absente), PageSpeed API (quota 429), configuration du Payment Link dans le dashboard Stripe, positions hors Search Console.

## Tableau de synthèse

| # | Problème | Sévérité | Impact business | Effort |
|---|---|---|---|---|
| 1 | Aucun mécanisme de désinscription dans les emails du guide, alors que le site et les mentions légales le promettent | Bloquant | Risque juridique RGPD/CPCE, image | 0,5 j |
| 2 | Prix du livre codé en dur à 15 endroits / 6 fichiers + Worker + Stripe, aucune date de fin d'offre affichée | Bloquant | Écart page/Stripe au 30/09, litige prix barré | 0,5 j |
| 3 | Bandeau promo livre écrase le bandeau « 1er cours offert » sur l'accueil | Bloquant | Le produit secondaire cannibalise l'objectif principal (réservation) | 1 h |
| 4 | Volume 2 payant téléchargeable dans l'historique Git public (4 blobs, 33 Mo) | Bloquant, reporté en phase 3 | Fuite du bonus exclusif | 1 h |
| 5 | Livre invisible pour Google : 3 impressions/90 j, 0 lien depuis les 36 articles, absent nav et footer | Important | Zéro acquisition organique sur le seul produit payant | 1 j |
| 6 | Prix du livre visible après ~2 écrans de scroll mobile, réassurance enterrée dans la FAQ, lien « PDF gratuit » sous le bouton Commander | Important | Conversion page livre | 0,5 j |
| 7 | Zéro preuve sociale sur le livre, 4 photos/8 montrent l'ancienne édition 2 tomes, aucun extrait intérieur | Important | Confiance, conversion | 1 j + collecte |
| 8 | CGV incomplètes (médiateur, formulaire rétractation, encadré garanties, adresse) ; CGV non exigées par Stripe | Important | Non-conformité Code conso | 0,5 j |
| 9 | LCP mobile 4,4 à 7,2 s : mauvaise image préchargée, PNG 717 Ko, Font Awesome complet 243 Ko, fonts bloquantes | Important | Perf mobile 60–76, SEO indirect | 1 j |
| 10 | Aucun header de sécurité côté site (GitHub Pages) ; GitHub Pages interdit l'usage e-commerce | Important | Risque de retrait sans préavis | 1 j (migration Cloudflare Pages) |
| 11 | Consentement cookies sans expiration, lien « Gérer mes cookies » sur 6/46 pages, Google Fonts avant consentement | Important | CNIL | 0,5 j |
| 12 | 49 pages maintenues à la main, 14 variantes de nav, 20 de footer, 40 Ko CSS inline, script d'inscription copié 8 fois, aucune CI | Important | Coût de chaque changement, régressions | 3–5 j (Eleventy + Actions) |
| 13 | Schéma Book sans `priceValidUntil`, `shippingDetails`, `hasMerchantReturnPolicy`, pas de Product ; @id `#business`/`#website` dupliqués | Mineur | Rich results | 2 h |
| 14 | Contrastes AA en échec (or #a6872e sur blanc 3,4:1), burger `<div>` sans rôle, input email sans label, pas de `:focus-visible` | Mineur | Accessibilité | 0,5 j |
| 15 | 3,7 Mo d'images mortes publiées, dépôt de 115 Mo, pipeline de fabrication du livre mélangé au site | Mineur | Hygiène, risque de publication accidentelle | 0,5 j |

Résultats positifs à ne pas casser : 0 titre ou description dupliqué, 0 lien interne cassé, 0 erreur JSON-LD, 0 secret dans le dépôt, tests Worker 30/30, redirections http/apex correctes, TTFB 130–230 ms, consentement GA4 réellement opt-in, trafic organique +40 % clics sur 90 jours (556 clics, 22 041 impressions).

## 1. Performance technique

Lighthouse 13.5 local, throttling mobile standard. Pas de données terrain CrUX.

| Page | Perf | LCP | FCP | TBT | CLS | Poids |
|---|---|---|---|---|---|---|
| / mobile | 72 | 4,7 s | 2,8 s | 250 ms | 0,048 | 821 Ko |
| / desktop | 93 | 1,4 s | 0,6 s | 110 ms | 0,026 | 1 522 Ko |
| /edition-raffinee/ mobile | 76 | 4,4 s | 3,7 s | 80 ms | 0 | 1 144 Ko |
| /guide-apprendre-les-echecs.html mobile | 60 | 7,2 s | 2,0 s | 470 ms | 0,089 | 1 351 Ko |

Constats :
- **Le preload LCP vise la mauvaise ressource** (important). `index.html:34` précharge `nicolas_musicki.webp` (172 Ko) mais l'élément LCP est le `<header>` dont le fond `echiquier.avif` (194 Ko) est déclaré dans le CSS, donc découvert tard (724 ms de délai). Un `nicolas_musicki.avif` de 4 Ko existe mais fait 301 px, trop petit.
- **`couverture-guide-v1.png` = 717 Ko** (important), PNG 800×1280 affiché 490 px sur le guide et 220 px sur l'accueil. Économie 650 Ko en AVIF redimensionné.
- **Font Awesome 6.0.0 complet** (important) : CSS 87 Ko + 2 woff2 = 243 Ko pour ~32 icônes. Sur l'accueil la feuille est chargée deux fois (`media=print` puis bloquante en `<noscript>`... et une balise bloquante), ce qui annule l'astuce. Sur livre et guide elle bloque le rendu ~1 s. Aucun `integrity`.
- **Google Fonts** : 3 familles, 9 variantes, 185 Ko. Bloquant sur livre et guide (813–964 ms), asynchrone seulement sur l'accueil.
- **Image LCP de la page livre en `loading="lazy"`** (`edition-raffinee/index.html`, `pack-2026-auteur.webp`). Galerie : 8 WebP de 47 à 168 Ko pour des vignettes 154×205, pas de `srcset` (−730 Ko possibles).
- **`promo-rentree.js:25,30`** lit `offsetHeight` de façon synchrone : reflows forcés de 170 à 223 ms, 1,6 s de bootup sur la page livre.
- **Cache** : GitHub Pages sert `Cache-Control: max-age=600` sur tout, gzip seulement, pas de Brotli. Le `?v=N` manuel est inutile avec 10 min de TTL.
- 38 pages blog chargent `style.css` non minifié (53 Ko) au lieu de `style.min.css`, plus `blog-style.css` 25 Ko non minifié.

Recommandations : préchargez `echiquier.avif` recompressé (~120 Ko) et remplacez la photo par un AVIF 640 px (~35 Ko) ; convertissez la couverture en AVIF ≤ 500 px ; remplacez Font Awesome par des SVG inline ou un sous-ensemble woff2 auto-hébergé ; auto-hébergez 4 woff2 de Google Fonts avec `unicode-range` latin ; retirez `lazy` sur l'image LCP livre et ajoutez `srcset` à la galerie ; passez le calcul d'offset en `ResizeObserver` ; mettez Cloudflare devant (ou migrez vers Cloudflare Pages) pour Brotli et `max-age=31536000` sur assets versionnés.

## 2. SEO technique

Search Console, 23/06 → 20/09/2026 : 556 clics, 22 041 impressions, CTR 2,52 %, position 9,3. Fenêtre précédente : 396 clics, 15 947 impressions. Top pages : guide PDF 97 clics, citations 90, accueil 57 (position 10,8). **/edition-raffinee/ : 0 clic, 3 impressions, position 33,7.** « cours d'échecs » : position 26,9 (83 impressions, 1 clic).

Constats :
- **Le livre n'a aucun maillage** (important). 4 pages entrantes (accueil, guide, cadeau, CGV), 0 sur 36 articles, absent de la nav et du footer. Ancres : « Voir le sommaire des 23 chapitres → », jamais « livre pour apprendre les échecs ». Les 4 requêtes contenant « livre » (26 impressions) atterrissent sur le guide gratuit.
- **Title/H1 du livre sans « débutant »** : « Livre pour Apprendre les Échecs — Relié, 200 Pages » / « Votre premier livre pour apprendre les échecs ».
- **H1 accueil ≠ title** : « Cours d'Échecs à Paris et dans les Yvelines » vs « Cours d'Échecs à Paris, Versailles et en Visio ». Cannibalisation avec `blog/cours-echecs-adultes-paris.html` (3 625 mots, ton commercial).
- **Données structurées** : `edition-raffinee/index.html:45` Book + Offer sans `priceValidUntil`, `shippingDetails`, `hasMerchantReturnPolicy`, `isbn`, `datePublished` ; pas de Product ; GSC ne détecte que Breadcrumbs. `#business` défini dans 8 fichiers, `#website` dans 2, LocalBusiness et WebSite nommés « Nicolas Musicki » comme la Person.
- `ebook-gratuit.html` présent dans git mais **404 en production** ; 2 pages « Redirection » du blog en `index,follow` et orphelines ; `/blog/` rend sa liste d'articles en JS (79 mots dans le HTML brut) ; `cgv.html` dans le sitemap mais « Discovered, not indexed ».
- `robots.txt` ligne 1 `License:` non standard (Lighthouse SEO 92). `llms.txt` dit 96 pages vs 95. Elo 2086 partout sur le site, à confirmer vs profil FIDE.
- Articles à fort trafic sous-maillés : citations (90 clics, ≤ 2 entrants), seniors, échiquier pliable.
- Gaps de contenu : « cours d'échecs débutant », « professeur d'échecs » sans page dédiée.

Recommandations : encart livre contextuel dans les 12 articles « débutant » et les 7 gros trafics, entrée nav + footer ; title « Livre d'Échecs pour Débutant : Apprendre les Échecs, Relié 200 pages » ; sur le guide, lien texte explicite vers le livre ; compléter Offer et ajouter Product ; aligner H1 accueil sur le title ; nettoyer @id ; liste blog en HTML statique ; retirer les pages Redirection ou les passer en noindex.

## 3. Conversion et tunnel de vente

Parcours : Google → accueil → lien texte « Voir le sommaire » (6e bloc du main, sans prix, sans bouton) → page livre → Stripe. 3 clics, prix visible pour la première fois sur la page livre après ~1 300–1 500 px de scroll mobile.

Constats :
- **`promo-rentree.js:7-21` remplace le bandeau fixe « 1er COURS OFFERT » par l'offre livre** sur l'accueil (bloquant). Le CTA principal du site perd sa position la plus visible. Sur la page livre, le même bandeau « Découvrir le livre → » pointe vers la page elle-même.
- **Prix en dur** : `edition-raffinee/index.html:6,70,229,236,103,377`, `guide…:652`, `cgv.html:108`, `api/order.js:10` (`PACK_AMOUNT_CENTS=3999`), `promo-rentree.js:20`. Le JS ne change pas l'URL Stripe. Aucune date de fin, aucun `priceValidUntil`. Le prix barré 64,99 € doit être le prix le plus bas pratiqué sur 30 jours (art. L112-1-1 C. conso.) : à vérifier qu'il a réellement été vendu à ce prix.
- **Avant le bouton Commander** : livraison comprise, Stripe, France, 14 jours visibles. Non visibles : métropole uniquement, rétractation, fabriqué à la commande, logos CB, facture, tout dans la FAQ 4 écrans plus bas. Le lien « PDF gratuit » est juste sous le bouton d'achat. Le bouton « Choisir mon livre relié → » en bas de page remonte vers `#pack-cta` au lieu d'aller sur Stripe.
- **Cannibalisation gratuit/payant** : `index.html:681` « Apprends les échecs avec mon guide gratuit » (tutoiement, bouton plein, formulaire) est suivi de `:762` « Apprendre les échecs en partant de zéro » (vouvoiement, lien texte). Même promesse, le payant moins mis en avant.
- **Récit incohérent** : page livre = édition unique 200 pages, mais 4 photos sur 8 montrent les deux tomes rouges ; confirmation, CGV, emails Worker et `order.js:11` disent « Volumes I & II » ; `idee-cadeau-echecs.html:432` annonce des photos « bientôt » ; sommaire en tutoiement.
- **Preuve sociale** : accueil = 4 témoignages prénom seul, sans date, photo ni source, étoiles sans note agrégée ni lien Google (le GBP existe). Page livre = 0 avis, pas d'Elo, pas de lien FIDE, aucune page intérieure, aucun extrait.
- **CTA** : 15 `.btn` et 11 liens `#contact` sur l'accueil, 30 mentions « cours offert/gratuit ». Pas de CTA sticky mobile (classe `.floating-cta` définie `style.css:1891`, jamais utilisée). Pas de parcours cadeau alors que la FAQ dit que c'est « l'usage principal ».
- **Mesure** : aucun événement `purchase` sur `commande-confirmee.html`, seul `click_acheter_ebook` au clic.

Recommandations : rendre le bandeau au 1er cours offert sur l'accueil ; prix + bouton + ligne de réassurance sous le H1 livre (« 39,99 € livraison comprise · CB via Stripe · France métropolitaine · sous 14 jours · rétractation 14 jours ») ; date de fin visible ; supprimer le lien PDF gratuit sous le bouton ; purger les photos deux tomes et unifier le nom du produit partout ; ajouter 2–3 photos d'intérieur + extrait PDF de 3 pages + ligne auteur avec lien FIDE ; collecter des avis acheteurs via l'email de confirmation ; différencier « Volume 1 en PDF gratuit » et « livre complet relié 39,99 € » sur l'accueil avec un vrai bouton ; événement `purchase` GA4.

## 4. UX et design

- **Six styles de bouton** coexistent (`.btn`, `header .btn`, `.pack-cta`, `.book-return-cta`, `.rentree-banner__cta`, `.hlm-form button`), rayons 0 / 3 / 4 / 6 / 8 / 16 px selon la feuille, deux palettes brunes parallèles, `--accent-dark` différent entre `style.css:33` et `pack-livres.css:650`.
- **Mobile 390 px** : bandeau fixe 74 px + navbar ~60 px + bandeau cookies ≈ 35 % de l'écran. Boutons hero à 10,7 px de texte et ~33 px de haut (`index.html:60`), tags du bandeau à 8 px.
- **Nav** : 9 items dont « Contact » et « Réserver » vers la même ancre ; le livre payant n'a d'entrée dans aucun menu, « Le guide » gratuit oui. 27 pages ont un burger `<div>` sans rôle, 19 un `<button>`.
- **Accessibilité** : contraste `--accent #c9a84c`/blanc 2,29:1 et `--accent-dark #a6872e`/blanc 3,43:1 utilisés en texte (eyebrows, notes, kickers) ; `<strong>` noir sur vert #203e35 = 1,8:1 sur la page livre ; `#hlm-email` sans `<label>` ; aucun `:focus-visible`, `outline:none` sur les inputs ; pas de skip-link ; étoiles sans `aria-label` sur 3 blocs/4 ; h4 sans h3 ; icônes `<i>` sans `aria-hidden`. Lighthouse accessibilité 95–96 malgré cela.
- 120 lignes de CSS dans le `<body>` de l'accueil (`index.html:553-673`), FAQ dupliquée sur la page livre, code vidéo mort dans `pack-livres.js:147-184`.

Recommandations : un seul système `.btn` + variantes, tokens uniques, passer l'or texte à ≥ #7a6222, `:focus-visible` global, `<button>` partout, labels, boutons mobile ≥ 14 px / 44 px, une nav identique sur toutes les pages avec entrée « Le livre ».

## 5. Sécurité et conformité

Headers site (GitHub Pages) : aucun HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. Aucun `<meta http-equiv CSP>`. HSTS preload « unknown ». Worker : CSP stricte, nosniff, DENY, no-referrer, no-store, noindex, CORS restreint ; manque HSTS, Permissions-Policy, COOP. TLS 1.3 Let's Encrypt partout, redirections http/apex OK. Fichiers sensibles testés (`.git/HEAD`, service account, `api/.env`, Volume 2, backups, audits) : tous 404.

Worker (`api/worker.js`, `security.js`, `order.js`) : les constats du 5 septembre sont corrigés (rate limiting IP/email, fail-closed sur `ADMIN_TOKEN`, tolérance Stripe 300 s, dédup `delivered:*`, CSV échappé, cookie `__Host-` Secure/HttpOnly/SameSite). Restent :
- **Aucune désinscription** (bloquant) : 0 occurrence de `unsubscribe` dans `api/`, pas de `List-Unsubscribe`, alors que `index.html:690` promet « Désinscription en un clic » et que les « conseils pédagogiques » sont de la prospection.
- **Chemin legacy `?token=`** (`worker.js:64-69`) sans rate limiting, contrairement au POST `/admin`.
- **Aucune durée de conservation** sur `subscriber:*`, `order:*` (nom, adresse, téléphone), `delivered:*` ; pas de route de suppression ; pas de logout.
- `deliverNotifications` get/put non atomique (atténué par `Idempotency-Key` Resend).
- Fichiers non suivis `api/worker-expose.js` (copie divergente de `worker.js`) et `api/apercu.html` : ne pas committer.

Client : GA4 opt-in réel, bons boutons Refuser/Accepter. Mais consentement stocké sans date (CNIL : 6 mois max), lien « Gérer mes cookies » sur 6 pages sur 46, Google Fonts appelé avant consentement sur toutes les pages (transfert IP), Font Awesome sans `integrity`, 6 `onclick` inline, formulaires sans lien vers la politique de confidentialité, Formspree absent des mentions.

Mentions légales : manquent adresse postale (LCEN 6-III), liste des sous-traitants (Cloudflare, Resend, Stripe, Formspree, Google, GitHub) et transferts hors UE, base légale et durée pour les commandes, et le texte revendique une case à cocher et un lien de désinscription qui n'existent pas. CGV : manquent adresse, **médiateur nommé** (L616-1), **formulaire type de rétractation**, **encadré garanties légales** (D211-2, numérotation L217-3 s.), lien ODR à retirer (plateforme fermée juillet 2025), prix 39,99 € en dur. Le Payment Link (`api/create-rentree-payment-link.mjs:49-58`) ne demande pas `consent_collection[terms_of_service]=required`.

GitHub Pages : les conditions interdisent explicitement « run your online business, e-commerce site ». Le site vend cours et livre via Stripe sous SIRET. Risque de retrait sans préavis, faible mais réel ; Cloudflare Pages lève ce risque et donne le fichier `_headers`.

## 6. Stack technique et pratiques dev

| Métrique | Valeur |
|---|---|
| Pages HTML publiées | 49 (37 blog, 8 racine, 3 zones, 1 livre) |
| Build / templating | aucun, pas de package.json |
| Variantes de `<nav>` / `<footer>` | 14 / 20 (927 + 1 137 lignes répétées) |
| Blocs `<style>` inline | 11, 40 509 octets ; 353 attributs `style=""` |
| Script d'inscription copié | 8 pages, URL Worker en dur |
| Dépôt | 182 commits, 92,6 Mo packés + 22 Mo loose, jamais `gc` |
| Plus gros blobs | 12 PDF de 7,6 à 12,3 Mo (7 versions Vol 1, 4 Vol 2) |
| Images mortes publiées | `echiquier.png` 2 Mo, `nicolas_musicki.PNG` 911 Ko, `15eme.PNG`, `couverture-guide-v2.png` 547 Ko |
| Tests | `api/` 30/30, `tests/cookies.test.js` 3/3 |
| CI | aucune (`.github/` absent), pas de `.nvmrc`, html-validate 68 erreurs sur 3 pages |
| Secrets | aucun dans l'historique, `.env*` et service account jamais committés |

- **Volume 2 dans l'historique public** (bloquant) : commits `f904e37`, `4c53da6`, `83bdf18`, `0a02a22`, supprimé en `612c8ca`. Vérifié le 23 septembre, le PDF répond en HTTP 200 sur `raw.githubusercontent.com` : 9,2 Mo au commit `0a02a22`, 7,6 Mo au commit `f904e37` sous son ancien nom. Le dépôt est public mais compte 0 fork, 0 étoile et 0 observateur, ce qui limite la diffusion réelle à qui connaît le SHA.

  Décision du 23 septembre : traitement reporté en phase 3. Une réécriture d'historique suivie d'un force-push ne suffit pas, GitHub conservant les objets devenus inaccessibles et les servant par SHA jusqu'à son ramasse-miettes, ce qui impose en plus un ticket au support. Rendre le dépôt privé coupe l'accès immédiatement mais exige un compte Pro tant que le site est servi par GitHub Pages. La migration vers Cloudflare Pages, déjà prévue en phase 3, lève cette contrainte et permet de traiter les deux sujets en une seule fois.
- **Pipeline de fabrication du livre dans le dépôt du site** : 11 PDF (~120 Mo), 12 scripts, 2 dossiers de sauvegarde, protégés seulement par `.gitignore`. `scripts/impose-cahiers.py` et `edition-raffinee/impose-cahiers.py` divergent.
- Menu mobile implémenté deux fois, `nav-mobile.js:36-41` recâble le clavier sur un `<div>`. Cache-busting incohérent (`nav-mobile.js?v=1` sur 4 pages, sans version sur 4, `cookies.js` jamais versionné). `blog/index.html` dépend de `fetch('articles.json')`.
- `sitemap.xml` édité à la main 21 fois, `index.html` 25 fois sur 60 commits. Messages de commit mêlant français, anglais et kebab-case.

Recommandations : Eleventy (Nunjucks, sortie HTML identique) avec layout unique pour head/nav/footer/JSON-LD, `articles.json` comme source de la liste blog, sitemap et llms.txt générés, hash des assets ; GitHub Actions avec html-validate, lychee, Lighthouse CI budget et `node --test` ; dépôt privé séparé pour la fabrication du livre ; `git filter-repo` puis `gc --aggressive` ; `config.js` unique pour URL Worker, liens Stripe et prix ; nettoyage des assets morts (objectif < 25 fichiers à la racine).

## Plan d'action en 3 phases

### Bilan de la phase 1 (exécutée le 23 septembre 2026, branche `phase-1-audit`)

Neuf commits, deux déploiements du Worker. Fait : prix centralisé dans `_data/offre-livre.json` avec script et test (offre jusqu'au 15 octobre, prix barré retiré car jamais pratiqué) ; bandeau livre réservé aux deux pages du livre et retiré de 43 pages ; désinscription signée avec en-têtes RFC 8058, déployée ; Worker durci (limite sur `?token=`, déconnexion, HSTS, Permissions-Policy, COOP) ; prix et commande sous le H1 de la page livre, image LCP préchargée ; images critiques en AVIF et cinq fichiers morts supprimés ; CGV et mentions complétées, information près de chaque formulaire ; branches `seo/*` supprimées.

Mesure locale après la tâche images, page du guide en mobile : performance 60 → 73, LCP 7,2 s → 4,4 s, poids 1 351 → 605 Kio. Le FCP à 4,1 s reste borné par les polices et Font Awesome bloquants, traités en phase 2. Mesure de l'accueil non obtenue (Lighthouse headless instable), à refaire en production après fusion.

Reporté : purge du Volume 2 (phase 3, avec Cloudflare Pages) ; acceptation des CGV sur le Payment Link Stripe (nouveau lien à créer, `consent_collection[terms_of_service]=required`) ; adresse géographique du vendeur, que l'éditeur ne souhaite pas publier ; ligne `License:` de robots.txt conservée volontairement (déclaration RSL, signalée à tort par Lighthouse). Adhésion CM2C à finaliser en ligne.

### Phase 1 — Quick wins (cette semaine, ~2 jours)
1. Route `/unsubscribe?t=<hmac(email)>` + lien dans les emails + `List-Unsubscribe` ; retirer la promesse tant que ce n'est pas livré.
2. Bandeau accueil : ne plus écraser « 1er cours offert » (`promo-rentree.js:10`) ; bandeau livre réservé aux pages guide/livre/blog.
3. Centraliser le prix (constante lue par la page, le bandeau, le JSON-LD, `order.js`) ; afficher « jusqu'au 30 septembre, puis 64,99 € » ; `priceValidUntil` ; vérifier la légalité du prix barré.
4. ~~`git filter-repo` sur `fichiers/guide-volume-2*`~~ — reporté en phase 3, à traiter avec la migration Cloudflare Pages qui permettra de passer le dépôt en privé. Les deux branches `seo/*` obsolètes, entièrement fusionnées, ont été supprimées le 23 septembre.
5. Page livre : prix + bouton + réassurance sous le H1, retirer `loading="lazy"` sur l'image LCP, supprimer le lien PDF gratuit sous le bouton, pointer le CTA bas vers Stripe.
6. Images : couverture en AVIF ≤ 500 px, preload de `echiquier.avif`, AVIF 640 px pour la photo, supprimer les 4 images mortes.
7. CGV/mentions : médiateur, formulaire rétractation, encadré garanties, adresse postale, sous-traitants, retirer ODR ; recréer le Payment Link avec `consent_collection[terms_of_service]=required`.
8. Rate limiting sur `?token=`, headers HSTS/Permissions-Policy/COOP dans `secureResponse`, retirer `License:` de robots.txt, supprimer `api/worker-expose.js`.

### Phase 2 — Moyen terme (2 à 4 semaines)
1. Maillage du livre : encart dans les 12 articles débutant et les 7 gros trafics, entrée nav et footer, ancres « livre pour apprendre les échecs » ; title/H1 livre avec « débutant ».
2. Preuve sociale livre : photos d'intérieur, extrait PDF 3 pages, ligne auteur + FIDE, collecte d'avis acheteurs par l'email de confirmation, lien avis Google sur l'accueil.
3. Purger l'ancienne édition deux tomes (photos, « Volumes I & II » dans confirmation/CGV/emails/`order.js`), uniformiser le vouvoiement.
4. Remplacer Font Awesome par des SVG inline, auto-héberger 4 woff2, fusionner les CSS bloquants, servir `style.min.css` aux 38 pages blog, minifier `blog-style.css`.
5. Cookies : `{choice, ts}` réaffiché à 6 mois, lien « Gérer mes cookies » injecté par `cookies.js` partout, mention RGPD + lien confidentialité près de chaque formulaire.
6. TTL KV sur abonnés et `delivered:*`, purge commandes, `POST /logout`.
7. Schéma : Product ou Offer complet, un seul `#business`/`#website`, `dateModified` fiables, Elo vérifié.
8. Événement `purchase` GA4, aligner H1 accueil sur le title, corriger `ebook-gratuit.html` et les pages Redirection.
9. Accessibilité : contrastes, `:focus-visible`, `<button>` burger unique, labels, tailles mobile.

### Phase 3 — Structurant (1 à 2 mois)
1. Migration vers Eleventy : layout unique, données centralisées (prix, URLs, nav), sitemap et llms.txt générés, hash des assets.
2. GitHub Actions : html-validate, lychee, Lighthouse CI avec budgets, tests Worker ; `package.json` racine + `.nvmrc`.
3. Hébergement Cloudflare Pages : `_headers` (HSTS, CSP, nosniff, XFO, Referrer-Policy), Brotli, cache long sur assets versionnés, sortie des conditions GitHub Pages. Une fois le site servi par Cloudflare, passer le dépôt GitHub en privé et purger l'historique du Volume 2 (`git filter-repo`, force-push, puis ticket au support GitHub pour le ramasse-miettes).
4. Dépôt privé pour la fabrication du livre ; le site ne garde que `edition-raffinee/index.html`.
5. Contenu : pages « cours d'échecs débutant » et « professeur d'échecs », liste blog statique, maillage des 9 articles sous-liés, décision sur `blog/cours-echecs-adultes-paris.html` vs accueil.
6. Parcours cadeau sur la page livre (bouton Offrir, dédicace, ×2) et CTA sticky mobile pour la réservation.
