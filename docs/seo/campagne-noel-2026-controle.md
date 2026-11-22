# Campagne cadeaux — contrôle du 22 novembre 2026

Version de travail locale, non publiée. Les nouveaux articles restent sous la responsabilité de leur auteur jusqu’à la remise pour intégration.

## Résultat des contrôles

- 89 tests réussis : navigation, prix, parcours de commande, confirmations, FAQ, cookies et API.
- 53 pages avec navigation examinées : titres, H1, URL canoniques, descriptions, identifiants, liens et images locaux, JSON des données structurées.
- Aucun lien local cassé, titre dupliqué, identifiant répété ou JSON invalide détecté dans ce périmètre.
- Un avertissement éditorial non bloquant : le titre de la page seniors compte 71 caractères ; cette page n’a pas été réécrite pour la campagne.
- Les deux nouveaux articles présentent maintenant eux aussi le stock et le délai de 7 jours. Ils n’ont pas été modifiés par l’agent responsable des pages commerciales.
- Vérification visuelle mobile non réalisée : le navigateur de prévisualisation est indisponible. Les règles responsive sont présentes ; ce contrôle reste à effectuer avant publication.

## Cohérence commerciale préparée

Ouvrages en stock, livraison sous 7 jours maximum après validation du paiement en France métropolitaine. Le droit de rétractation et le délai de remboursement de 14 jours ne sont pas modifiés. Prix conservés : cahier 15 €, duo 25 €, livre 40 €, trio 60 €.

Les descriptions des pages commerciales, les fils d’Ariane, les URL sociales et les données structurées ont été harmonisés. La fiche du livre décrit les retours selon les CGV. Aucun avis, stock chiffré, réduction, délai d’expédition intermédiaire ou résultat de classement n’a été inventé.

Le script de création du lien du livre lit désormais le tarif depuis `_data/offre-livre.json`, au lieu de conserver l’ancien montant de 39,99 €. Les scripts des cahiers annoncent les solutions regroupées à la fin.

## À traiter lors de la publication autorisée

1. Intégrer les deux articles après réception de leur remise : catalogue du blog, index, sitemaps, liens contextuels et résumé llms.txt. Conserver leurs fichiers tant qu’ils sont en cours d’écriture.
2. Les cinq liens Stripe ont été modifiés par API le 22 novembre 2026, sur instruction de Nicolas : téléphone obligatoire, couleur obligatoire (rouge, vert, bleu, marron) pour livre et trio, livraison de 7 jours et solutions à la fin. Les réponses API confirment ces réglages ; URL et prix conservés. Sauvegarde précédente locale dans tmp/payment-links-before-update.json. Ne pas recréer les liens.
3. Déployer les changements du Worker, après autorisation de mise en ligne, avec sa clé serveur Stripe et le nouveau limiteur CHECKOUT_IP_LIMITER. La clé publique fournie est configurée. Les confirmations utiliseront le nouveau délai et la couleur choisie ; les nouvelles routes serviront le paiement Elements intégré. Voir api/PAIEMENT-INTEGRE.md.
4. Publier le site puis contrôler les pages publiques, les métadonnées, les images et les cinq parcours de paiement, sans effectuer d’achat de test en production.
5. L’emplacement Black Friday reste masqué ; une offre, ses dates et ses conditions doivent être décidées avant activation.

## Références techniques consultées

Les recommandations Google privilégient le contenu textuel utile, les liens internes et les données structurées conformes au contenu visible : https://developers.google.com/search/docs/appearance/ai-features

Référence des données produits et de retour : https://developers.google.com/search/docs/appearance/structured-data/merchant-listing

Les accès OAI-SearchBot sont déjà autorisés par le robots.txt ; documentation : https://developers.openai.com/api/docs/bots

## Paiement intégré préparé

Page paiement.html dans la charte du site : récapitulatif, quatre couleurs pour livre/trio, email et téléphone obligatoires, adresse et champs bancaires Stripe Elements. Prix déterminés côté serveur, session de visite limitée à 15 minutes, limitation des requêtes et création idempotente. La page de confirmation vérifie le paiement auprès du serveur avant de confirmer une session Elements. Les liens Stripe restent disponibles en secours. Aucun paiement ni achat de test en production réalisé. La navigation et les parcours ont des tests automatisés ; le rendu visuel et un parcours complet en environnement Stripe de test restent à vérifier avant activation.
