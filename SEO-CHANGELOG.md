# Journal des optimisations SEO

Ce document sert à mesurer les effets des changements SEO dans Search Console et GA4. Les comparaisons doivent porter sur des fenêtres de durée identique et tenir compte de la saisonnalité.

## Lot 1 — 20 août 2026

### Période de référence

- Source : API Google Search Console et API GA4.
- Fenêtre : 20 mai au 19 août 2026 inclus.
- Fichier brut : `temp/seo_ga_3mois_2026-05-20_2026-08-19.json`.
- Total GSC : 467 clics, 19 029 impressions, CTR 2,45 %, position moyenne 9,0.
- Total GA4 : 842 sessions, 634 utilisateurs, 49,4 % d'engagement, 149 s de durée moyenne et 1,20 page par session.

### Modifications

#### Accueil — `/`

- Nouveau title : `Cours d'Échecs à Paris, Versailles et en Visio`.
- Meta description recentrée sur les cours particuliers, les trois modalités et la preuve `2092 Elo`.
- Titres Open Graph et Twitter harmonisés.

Référence GSC : 44 clics, 2 531 impressions, CTR 1,74 %, position 10,76.

#### Seniors — `/blog/echecs-retraite-seniors.html`

- Title recentré sur la requête `échecs pour seniors` et l'intention de débuter.
- Suppression de la promesse chiffrée `mémoire +23 %` dans le snippet.
- Meta description, H1, Open Graph, Twitter et données Article harmonisés.
- `dateModified` mise au 20 août 2026.

Référence GSC : 28 clics, 1 525 impressions, CTR 1,84 %, position 5,84.

#### Magnus Carlsen — `/blog/magnus-carlsen-parcours-champion-monde.html`

- Title raccourci et aligné sur `biographie`, `palmarès`, `Elo` et `records`.
- Meta description, H1, Open Graph, Twitter et données Article harmonisés.
- Ajout d'un lien contextuel vers le guide d'apprentissage.
- `dateModified` mise au 20 août 2026.

Référence GSC : 12 clics, 2 181 impressions, CTR 0,55 %, position 11,09.

#### Citations — `/blog/citations-echecs-inspirantes.html`

- Requête exacte `citations sur les échecs` placée dans le title et le H1.
- Title raccourci pour réduire sa troncature dans Google.
- Meta description, Open Graph, Twitter et données Article harmonisés.
- Ajout d'un lien contextuel vers le guide d'apprentissage.
- `dateModified` mise au 20 août 2026.

Référence GSC : 127 clics, 5 414 impressions, CTR 2,35 %, position 7,70.

#### Sitemap

- `lastmod` actualisé uniquement pour les quatre URL réellement modifiées.
- L'ancienne URL de redirection `/ebook-gratuit.html` reçoit `noindex,follow` afin d'éviter son indexation en parallèle de la page canonique du guide.

#### Stabilité visuelle

- Dimensions intrinsèques ajoutées à cinq portraits secondaires des pages seniors, Magnus et citations.
- Chargement différé et décodage asynchrone activés pour ces images situées sous la ligne de flottaison.
- Objectif : réduire les décalages de mise en page (CLS) et le travail initial du navigateur sur mobile.

### Contrôles programmés

#### À 28 jours — 17 septembre 2026

- Vérifier que Google a exploré les quatre pages après le 20 août.
- Comparer clics, impressions, CTR et position avec les 28 jours précédents.
- Ne pas modifier à nouveau les titles avant ce premier contrôle sauf anomalie majeure.

#### À 56 jours — 15 octobre 2026

- Confirmer ou infirmer l'amélioration du CTR sur les pages seniors et citations.
- Vérifier l'entrée éventuelle de Magnus Carlsen dans le top 10.
- Mesurer les clics vers le guide depuis Magnus et citations dans GA4.

#### À 90 jours — 18 novembre 2026

- Décider de conserver ou réviser chaque snippet.
- Mesurer l'évolution des inscriptions au guide et des demandes de cours issues du SEO.
- Préparer le lot suivant en privilégiant les requêtes alors situées entre les positions 4 et 20.

### Objectifs du lot

- Accueil : CTR supérieur à 2,3 % et position inférieure à 10.
- Seniors : CTR supérieur à 3 % à position comparable.
- Magnus Carlsen : position inférieure à 10 et CTR supérieur à 1,2 %.
- Citations : CTR supérieur à 3,2 % à position comparable.

### Limite de mesure GA4

Au 20 août 2026, `user_engagement` est configuré comme événement clé dans GA4 et gonfle le total des conversions. Cette configuration doit être corrigée dans l'interface GA4. Les événements métier à suivre sont `ebook_signup`, `generate_lead`, `click_telephone`, `click_email` et un futur événement d'achat confirmé.
