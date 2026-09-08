# Nouvelle page retenue à partir de Search Console

## Données et décision

Lecture de l'API Search Console le 7 septembre 2026, propriété `https://www.cours-echecs-paris.fr/`, recherche Web, données finales du **7 juin au 4 septembre 2026** inclus (90 jours). Les chiffres ci-dessous proviennent d'une requête groupée uniquement par requête de recherche, pour éviter d'additionner plusieurs apparitions de pages ou de liens annexes sur une même recherche. Une seconde extraction par requête et page sert à identifier les pages actuellement visibles.

| Requête exacte | Impressions | Clics | Position moyenne |
|---|---:|---:|---:|
| 100 exercices pour progresser aux échecs pdf | 17 | 1 | 9,3 |
| exercices échecs débutant pdf | 8 | 0 | 10,8 |
| probleme echec debutant | 6 | 0 | 16,7 |
| tactique échec pdf | 2 | 0 | 18,0 |

Les deux premières requêtes représentent **25 impressions et un clic**. Elles aboutissent actuellement à la page générale du guide. Le signal reste modeste : il justifie un essai ciblé sur les exercices corrigés, pas une promesse de trafic. La requête non-PDF ajoute six impressions et celle sur la tactique deux ; ces volumes sont distingués du total PDF exercices.

**Décision : créer une seule nouvelle page, `blog/exercices-echecs-debutant.html`.** Elle permet de résoudre des positions concrètes puis de consulter une correction. Cette intention diffère des règles, du parcours d'apprentissage et des finales. La page ne promet ni cent exercices ni le téléchargement d'un ouvrage tiers.

## Contenu livré

- Title : « Exercices Échecs Débutant : 5 Corrections et Guide PDF » — 54 caractères.
- Description : 147 caractères.
- 1 166 mots de contenu principal, légendes et FAQ, hors formulaire, sommaire, auteur et navigation/promotion.
- Cinq exercices : capturer une dame non défendue, sortir d'un échec, fourchette de cavalier, capture interdite par un clouage, mat du couloir.
- Cinq nouveaux diagrammes SVG, avec a8 et h1 claires, sans flèches qui dévoileraient les solutions.
- Corrections dans des éléments HTML `details` utilisables à la souris, au clavier et sans JavaScript.
- Même formulaire et même script d'inscription que la page de référence ; source de suivi `exercices_pdf`. Le code d'envoi conserve son unique lien vers le PDF gratuit du volume 1. Aucun PDF créé ni modifié, aucun changement de l'API.
- Liens entrants depuis `10-erreurs-debutant-echecs.html`, `debuter-echecs-guide-complet-0-500-elo.html` et `comment-jouer-echecs-en-ligne.html`. Liens réciproques vers ces trois pages, plus les règles et les finales.
- Entrée en tête de `blog/articles.json`, ajout au sitemap racine et à `llms.txt`.

## Vérifications

JSON de l'index et JSON-LD valides ; deux schémas Article et FAQPage, FAQ visible synchronisée mot pour mot, métadonnées cohérentes, fichiers et ancres présents, auteur identique au modèle, absence de BOM et d'emojis dans les titres et contrôles.

Les positions ont été contrôlées avec les tables de finales de Lichess : coups légaux, impossibilité de Txa2 dans le clouage, Te8 mat. L'exercice de fourchette illustre le gain de la dame sans prétendre garantir le gain de la partie.

Chromium à 1 440 et 390 pixels : images chargées, pas de débordement horizontal, menu mobile fonctionnel, corrections ouvrables et refermables au clavier, aucune erreur JavaScript. Formulaire testé avec email invalide, réponse 429 et succès simulés. Aucun email réel envoyé.

## Sujets non retenus maintenant

- **Tactique séparée** : seulement deux impressions sur la requête PDF exacte ; regroupée avec les exercices pour éviter deux pages trop proches.
- **Déplacement des pièces** : une impression sur « déplacement échec pdf » ; sujet déjà détaillé par le guide des règles.
- **Notation et premier tournoi** : aucune requête pertinente retournée pour ces intentions de débutant. La requête sur les tournois internationaux 2026 concerne une autre intention. L'absence dans les lignes retournées ne prouve pas une absence totale de demande.
- **Cours complet / livre PDF** : demande observée, mais intention déjà satisfaite par la page générale du guide et la nouvelle porte d'entrée Apprendre. Pas de nouvelle page presque identique.
- **Règles, enfants, ouvertures, finales** : pages déjà présentes ; pas de duplication.

Les modifications restent locales, sans commit ni déploiement. Les deux articles créés précédemment sont conservés.

## Visuel

Image réutilisée : `blog/images/chess-set.jpg`. Les balises OG/Twitter et l'index utilisent ce fichier existant.

Futur fichier proposé : `blog/images/exercices-echecs-debutant.webp`.

Alt proposé après production et vérification : « Un échiquier en bois et un carnet vierge préparés pour une séance d'exercices d'échecs ».

Prompt en anglais :

> Photorealistic editorial photograph, 1200 × 630 pixels. A wooden Staunton chessboard on a quiet study desk, a blank open notebook and a pencil beside it, ready for a beginner's chess puzzle session. Sparse, plausible placement of pieces, each centered on a square, light square at the near right corner. Warm natural window light, cream and walnut palette, refined but approachable atmosphere. No text, no lettering, no logos, no recognizable faces.

## Mesure après publication

Observer les impressions, clics et requêtes de la nouvelle URL dans Search Console, ainsi que l'évolution conjointe de la page générale du guide sur les mêmes requêtes. Utiliser des fenêtres comparables et laisser le temps à l'indexation. L'événement existant `ebook_signup`, avec sa source `exercices_pdf`, permet de distinguer les inscriptions lorsque la mesure est autorisée ; le total peut être incomplet en cas de refus du consentement.
