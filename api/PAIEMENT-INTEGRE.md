# Paiement intégré — préparation du 22 novembre 2026

État au 23 novembre 2026 : paiement intégré ACTIF. Worker déployé (version ed4bc3d4) avec STRIPE_SECRET_KEY (clé restreinte avec Checkout Sessions en écriture) et CHECKOUT_IP_LIMITER ; checkout-config refuse les origines externes (403). Test serveur réel sans paiement : session trio à 60 € créée par le Worker avec couleur et produit en métadonnées, puis expirée. paiement-liens.js est réinclus dans les quatre pages commerciales ; paiement.html reprend l'en-tête, le pied de page, les polices et les couleurs du site. Retour au parcours hébergé : retirer ces quatre inclusions.

## Architecture

- paiement.html / paiement.js / paiement.css : formulaire dans la charte du site, couleur (livre et trio), email et téléphone obligatoires, Address Element et Payment Element Stripe.
- paiement-liens.js : envoie les cinq achats vers le formulaire ; liens Stripe d'origine conservés sans JavaScript et en secours si le service intégré est indisponible.
- checkout.js : Checkout Sessions en mode elements, API Stripe 2026-11-18.endive. Prix imposés côté serveur, métadonnées produit/couleur, téléphone obligatoire, livraison FR, session de visite KV 15 minutes liée à l'IP, idempotence et limiteur.
- commande-verification.js : vérifie payment_status avant de confirmer une session Elements. Pas de coordonnées exposées par checkout-status.
- Le webhook signé existant conserve la commande et envoie les confirmations. order.js lit la couleur depuis les métadonnées Elements ou le champ personnalisé du Payment Link. Le CSV ajoute couleur_livre à la fin ; anciennes commandes compatibles.

## Activation après autorisation

1. Vérifier le rendu mobile et bureau et le parcours complet avec un compte/clé Stripe de test (ne jamais saisir de carte de test en mode live). Tests actuels sans achat : 89 réussis.
2. Configurer STRIPE_SECRET_KEY dans les secrets Cloudflare du Worker, sans l'inscrire dans le dépôt. Le fichier local api/.env.stripe n'est pas publié. Conserver les secrets webhook/Resend et tous les bindings existants.
3. STRIPE_PUBLISHABLE_KEY est une variable publique dans wrangler.toml, fournie par Nicolas ; elle doit correspondre au même compte et au même mode que la clé serveur.
4. Déployer le Worker avec Wrangler compatible avec [[ratelimits]] et le nouveau binding CHECKOUT_IP_LIMITER. ALLOWED_ORIGIN doit rester l'origine canonique exacte du site.
5. Vérifier checkout-config depuis l'origine autorisée, puis publier les fichiers statiques après intégration des articles. Vérifier le chargement Stripe, les prix affichés, les couleurs obligatoires, le téléphone, l'adresse et le total fourni par Stripe, sans acheter en production.
6. Vérifier les notifications webhook en environnement de test et la réception des couleurs et téléphones dans commande/email/CSV. Le Worker déjà en ligne ne reprend pas encore la couleur dans ses emails ; elle est cependant enregistrée dans Stripe dès maintenant sur les Payment Links.

Si le service intégré manque de configuration, le formulaire affiche son lien de paiement Stripe correspondant. Pour revenir au parcours hébergé, retirer les inclusions paiement-liens.js ; les href HTML d'origine sont conservés. La sauvegarde de la configuration Stripe précédente est locale dans tmp/payment-links-before-update.json (pas de clés ni de données clients).

Documentation officielle consultée :
- https://docs.stripe.com/payments/accept-a-payment?payment-ui=elements&api-integration=checkout
- https://docs.stripe.com/js/custom_checkout/init
- https://docs.stripe.com/js/custom_checkout/confirm
- https://docs.stripe.com/api/payment-link/update
