# Observatoire local — Search Console × GA4

Tableau de bord privé pour les pages de cours-echecs-paris.fr. Node.js 22 ou plus récent ; aucun paquet à installer, aucune base à migrer, aucun appel API en écriture.

## Ouvrir

Double-cliquer sur `Lancer.cmd`, puis ouvrir http://127.0.0.1:4317. Garder le terminal ouvert. Ctrl+C arrête le serveur. Si le port est déjà utilisé, vérifier si le tableau de bord est déjà ouvert.

Ou, depuis ce dossier :

```powershell
node server.mjs
```

Le bouton **Actualiser les API** récupère les données réelles. Le premier accès initialise le cache ; ensuite, les données restent disponibles sans nouvel appel jusqu'à l'actualisation. Un cache de plus de 24 heures est signalé. Le filtre Google organic possède un cache séparé.

Actualisation sans interface :

```powershell
node server.mjs --refresh
node server.mjs --refresh --google
```

## Connexion

Les valeurs par défaut reprennent les scripts de reporting existants :

- Search Console : `https://www.cours-echecs-paris.fr/`
- GA4 : `512332614`
- Clé : `../chess_service_account.json`, lue uniquement par le serveur.

Pour changer ces paramètres ou les catégories, copier `config.example.json` vers `config.local.json`. Exemple de personnalisation : `"categoryOverrides": { "/blog/mon-article.html": "Ma catégorie" }`. Ne jamais copier le contenu de la clé dans ce fichier ou dans le navigateur.

Le compte de service doit disposer d'un accès en lecture à la propriété Search Console et à la propriété GA4. Les API Search Console et Analytics Data doivent être activées dans son projet Google. Les erreurs d'accès apparaissent dans l'interface ; elles ne sont pas remplacées par des données de démonstration.

## Mesures et rapprochement

- Valeurs : 28 jours arrêtés à J−3.
- WoW : les 7 derniers jours de cette fenêtre contre les 7 précédents.
- MoM : deux mois calendaires complets précédant le mois de fin de fenêtre. Les durées des mois peuvent différer.
- Search Console : impressions, clics, CTR, position ; données finales, recherche Web.
- GA4 par **page d'entrée** : sessions, utilisateurs entrants, sessions engagées, taux d'engagement, durée de session et événements clés.
- GA4 par **page consultée** : vues et temps engagé cumulé.
- Les événements clés sont ceux configurés dans GA4 ; ce ne sont pas nécessairement des ventes ou des demandes de cours. Un événement est attribué à la session entrée sur la page, même s'il se produit sur une autre page.
- Le filtre Google organic utilise `sessionSourceMedium = google / organic`. Search Console reste inchangé.
- Les totaux en haut sont ceux du site entier, obtenus par des requêtes distinctes. Les filtres de catégorie et de texte portent sur le tableau. Les utilisateurs ne sont pas additionnés pour fabriquer un total site.
- Les chemins sont rapprochés sans paramètres ni fragments, et `/index.html` rejoint `/`. Les anciennes redirections éditoriales restent distinctes. Les variantes peuvent entraîner des utilisateurs en doublon dans une ligne ; l'interface le signale.
- `—` signifie absent/non calculable ; zéro signifie aucune activité dans les lignes retournées. Cela ne certifie pas qu'une page est non indexée. Search Console applique des limites internes et GA4 peut appliquer des seuils, de l'échantillonnage ou un regroupement « other » ; les métadonnées disponibles sont signalées.
- Search Console utilise les jours en heure du Pacifique ; GA4 utilise le fuseau de la propriété, affiché dans l'interface. Le rapprochement n'est pas une attribution individuelle entre les sources.
- Le CSV contient les valeurs des cinq périodes et les variations par page. Taux bruts entre 0 et 1, durées en secondes, différences de taux en points, autres variations en pourcentage sauf position (écart absolu).

## Confidentialité

Serveur limité à `127.0.0.1`, validation Host/Origin, absence de CORS, routes statiques explicitement autorisées, actualisation protégée contre les appels intersites. La clé et les jetons Google ne sont jamais envoyés au navigateur. Le cache `.cache/` et la configuration locale sont ignorés par Git ; `analytics-local` est exclu de GitHub Pages via `_config.yml`.

Ne pas héberger ce tableau de bord sur GitHub Pages et ne pas exposer son port sur le réseau. Une personne ayant accès à la session Windows ou aux fichiers locaux peut consulter les rapports. La clé existante reste un secret à protéger.

## Tests

```powershell
node --test --test-isolation=none test/*.test.mjs
```

Les tests vérifient les dates, les rapprochements d'URL, les moyennes pondérées, les données absentes et les divisions par zéro. L'API Google reste la source des valeurs observées.

Documentation : [Search Console](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [schéma GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), [authentification des comptes de service](https://developers.google.com/identity/protocols/oauth2/service-account).
