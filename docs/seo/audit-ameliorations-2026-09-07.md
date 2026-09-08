# Améliorations SEO prioritaires — 7 septembre 2026

## Conclusion

Le prochain effort doit porter sur la fiabilité et la cohérence des pages déjà visibles. Le site possède des atouts concrets : offre et tarifs personnels explicites, liens internes généralement fonctionnels, auteur identifiable, guide réel et nouveaux articles pédagogiques avec diagrammes. En revanche, certains anciens articles utilisaient des chiffres non étayés, des raccourcis scientifiques et des formulations répétitives qui fragilisaient cette crédibilité.

**État au 8 septembre 2026 :** les corrections locales décrites aux sections 1, 3, 4, 5 et 7 ont été appliquées. La page Citations a été nettoyée de ses statistiques et contextes non étayés ; la vérification bibliographique individuelle de chaque attribution reste une relecture éditoriale utile. Aucune configuration du compte GA4 n'a été modifiée : le contrôle des événements clés de la section 6 doit encore être réalisé dans l'interface Google. Les changements restent non commités et disponibles pour relecture.

## Méthode et limites

- Search Console : API en lecture, recherche Web, données finales du **7 juin au 4 septembre 2026**, 90 jours.
- Comparaison de deux fenêtres de 28 jours : **8 août–4 septembre** et **11 juillet–7 août**. Ce n'est pas une comparaison entre mois calendaires.
- Métriques par page tirées directement de la dimension `page`. Les lignes contenant un fragment ne sont pas additionnées aux lignes des URL principales.
- Analyse des requêtes à partir des extractions du même jour. Les requêtes visibles ne représentent pas tous les clics ni toutes les impressions ; absence dans l'extraction ne signifie pas absence de demande ou défaut d'indexation.
- GA4 : même période de 90 jours, filtre `google / organic`, pages d'entrée et événements. Les faibles effectifs et le consentement limitent les conclusions. Les événements clés ne sont pas des clients uniques.
- Contrôle des liens et métadonnées de 43 pages HTML locales non redirigées et sans balise noindex repérée, puis lecture ciblée des pages prioritaires. Ce n'est pas un audit exhaustif des performances réseau ou des Core Web Vitals.
- Les nouvelles pages non publiées ne peuvent pas être évaluées dans ces chiffres. Les optimisations récentes n'ont pas encore une fenêtre complète de recul.
- Une extraction complémentaire par appareil avec filtre exact sur la page Citations ne se réconcilie pas avec les totaux par page. Elle est exclue des conclusions : aucune attribution de la baisse au mobile n'est faite. L'écart doit être vérifié dans l'interface Search Console avant toute décision fondée sur ce segment.

## Pages à travailler

| Page | Impressions / 90 j | Clics | CTR | Position moyenne | Priorité |
|---|---:|---:|---:|---:|---|
| Guide gratuit | 1 036 | 76 | 7,34 % | 8,8 | Cohérence de l'offre |
| Citations | 5 082 | 106 | 2,09 % | 7,7 | Fiabilité et accès direct aux citations |
| Temps pour devenir bon | 2 141 | 48 | 2,24 % | 6,6 | Promesses et exactitude |
| Seniors | 1 570 | 29 | 1,85 % | 5,9 | Exactitude des références scientifiques |
| Accueil | 2 889 | 55 | 1,90 % | 11,0 | Clarté commerciale et cohérence |
| Tarifs des cours | 151 | 2 | 1,32 % | 5,9 | Transparence et sources, signal SEO limité |

Ces CTR ne doivent pas être comparés comme si les pages répondaient aux mêmes recherches. Par exemple, l'accueil apparaît aussi sur des expressions générales comme « cours particuliers versailles » et sur le nom d'un autre joueur. Son CTR moyen ne démontre donc pas un mauvais titre.

## 1. Harmoniser les informations sur le guide — correction certaine

Fichiers concernés : `guide-apprendre-les-echecs.html`, `index.html`, les anciens encarts du blog et le modèle d'email `api/worker.js`.

**Constat :** le fichier effectivement lié par le code d'envoi, `fichiers/guide-volume-1-7f3a9c.pdf`, comporte **96 pages**, vérifiées avec un lecteur de structure PDF. La page principale annonce 90 dans le title, les descriptions, le texte, le schéma Book et la FAQ ; l'accueil et l'email emploient aussi 90. Les formulaires récents annoncent 96.

**Modification proposée :** remplacer uniquement les indications de longueur de ce guide gratuit par 96, partout où il s'agit bien de ce document. Ne pas modifier aveuglément les chiffres d'un livre relié ou d'un autre produit. Synchroniser notamment `numberOfPages`, la FAQ visible et son JSON-LD. Garder le même PDF et son lien d'envoi.

**Exemple de title :** `Apprendre les Échecs : Guide PDF Gratuit (96 pages)`.

Autres incohérences à traiter dans le même lot : tutoiement sur le guide et son encart d'accueil alors que le site vise le vouvoiement ; 2092 Elo sur le guide contre 2080 dans les autres présentations. Choisir une valeur vérifiée et datée sur le profil FIDE avant harmonisation, sans transformer un ancien classement en classement actuel. Cette divergence ne permet pas à elle seule de dire quel chiffre est correct.

**À préserver :** cette page a reçu 76 clics. Conserver son URL, sa fonction de téléchargement et son intention générale ; il n'est pas nécessaire de lui ajouter une nouvelle page concurrente ou de refaire son formulaire.

## 2. Corriger la page Citations avant de retoucher son titre

Fichier : `blog/citations-echecs-inspirantes.html`.

**Constats précis :**

- Elle se présente comme une sélection de citations « vérifiées » mais ne fournit pas de références bibliographiques ou d'entretiens permettant de vérifier les citations dans le corps du texte.
- Le texte affirme que les élèves avec une citation au mur progressent « 25 % plus vite » et évoque « 15 % de précision en plus », sans méthode ni source affichée.
- La même formule « Les échecs sont la vie » est attribuée à Fischer dans le résumé puis à Kasparov dans l'introduction explicative : incohérence interne certaine.
- La page comporte deux ensembles de FAQ et plusieurs blocs de conclusion/recommandation, ce qui allonge l'accès au contenu recherché.

**Proposition :** présenter rapidement les citations dans un tableau court « citation / auteur / source ou attribution incertaine », puis garder les commentaires utiles sous les thèmes existants. Vérifier les attributions individuellement ; une attribution invérifiable ne doit pas rester étiquetée « vérifiée ». Ne pas inventer de contexte historique pour combler une source manquante.

**Remplacement concret du passage chiffré :** « Choisissez une phrase qui vous rappelle un réflexe utile, comme vérifier la menace adverse. Utilisez-la comme un aide-mémoire, puis revenez à la position sur l'échiquier. »

**Données récentes :** 35 à 16 clics entre les deux fenêtres de 28 jours, pour 1 407 puis 1 342 impressions ; position 7,6 puis 7,9. Cette évolution justifie une analyse, mais ne prouve pas que le titre ou la qualité éditoriale ont causé la baisse. Le mélange des requêtes et l'affichage des résultats peuvent intervenir. Garder le titre actuel pendant le premier nettoyage permet de limiter le nombre de variables changées.

L'exigence de contenu fiable et sans exagération est cohérente avec les [recommandations éditoriales de Google](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## 3. Réviser les promesses de progression

Fichier : `blog/combien-temps-devenir-bon-echecs.html`.

**Constats :** la page reconnaît qu'aucune équivalence heures/Elo n'est fiable, mais sa description promet « 6 mois pour battre vos amis, 2 ans pour 1600 Elo, 5 ans pour 2000 ». Elle présente aussi des délais par âge comme « Données statistiques (FIDE, 2022) » sans lien vers une étude correspondante.

Autres corrections objectives :

- Le tableau assimile 2200–2400 à « Maître FIDE ». Les titres ne sont pas de simples tranches de classement : la voie au classement requiert normalement 2300 pour FM et 2200 pour CM, avec conditions ; d'autres voies existent. Voir les [règles FIDE](https://handbook.fide.com/chapter/B012024), section 1.3.
- Le texte affirme que 30 minutes par jour et trois heures le samedi font chacun 3 h 30 : le second total est faux.
- Les mentions « 1 heure d'étude ciblée vaut 10 heures de parties rapides » et « éliminé 90 % de vos faiblesses » ne sont pas étayées dans la page.

**Modification proposée :** distinguer apprentissage des règles, autonomie en partie et progression dans un classement précisément nommé. Remplacer les délais garantis par des objectifs observables et des exemples de rythme, présentés comme des suggestions pédagogiques. Retirer les statistiques sans référence vérifiable.

**Description proposée :** « Combien de temps pour apprendre les échecs et progresser ? Distinguez règles, premières parties et niveau de jeu, avec des repères pour vous entraîner. »

Conserver le title, l'URL, les sections pertinentes et les liens déjà ajoutés. La page reçoit 48 clics : une correction ciblée est préférable à une reconstruction complète.

## 4. Corriger une référence scientifique erronée sur les seniors

Fichier : `blog/echecs-retraite-seniors.html`, notamment le passage autour de la ligne 339.

**Erreur vérifiée :** le texte attribue à Sala & Gobet (2016) un résultat sur l'anxiété et la dépression des personnes âgées comparable à une intervention thérapeutique. La publication correspondante porte sur les compétences scolaires et cognitives **des enfants**, pas sur le traitement des seniors. [Publication originale](https://www.sciencedirect.com/science/article/pii/S1747938X16300112).

**Action proposée :** supprimer cette attribution et la comparaison thérapeutique. Recentrer le passage sur la pratique du jeu et les occasions de rencontre, sans en déduire un effet clinique. Harmoniser également la FAQ qui parle de prévention avec les nuances déjà présentes sur les études observationnelles : association observée ne signifie pas effet causal démontré des échecs.

**Exemple de remplacement :** « Une partie peut offrir un moment de concentration et une occasion de retrouver d'autres joueurs. Cela ne suffit pas à présenter les échecs comme un traitement de l'anxiété ou de la dépression. »

La baisse récente des impressions (1 226 à 207) ne peut pas être attribuée à cette erreur : les clics passent simultanément de 9 à 11 et les positions restent proches. Ce sont deux sujets distincts, qualité du contenu et évolution de la demande.

## 5. Conserver des pages commerciales avec des rôles distincts

**Accueil :** l'offre domicile/visio et les tarifs 50 €/h et 40 €/h sont déjà compréhensibles. Harmoniser les informations auteur et guide, retirer ou documenter « top 2 % mondial » en précisant la population et la date. Conserver l'accueil comme entrée générale pour les cours particuliers.

**`blog/cours-echecs-adultes-paris.html` :** la page a été modifiée récemment et ne figure pas dans les lignes de performance de la période. Cela ne démontre ni une pénalité ni une cannibalisation. Renforcer sa spécificité si elle doit rester une page de service : déroulement d'une séance adulte, objectifs possibles, rythme et exemples réels autorisés. Éviter de simplement répéter l'accueil. Avant une fusion, vérifier l'indexation et la page choisie par Google pour les requêtes concernées.

**`blog/cours-echecs-enfants-paris.html` :** le title parle de « Prof d'Échecs à Paris » alors que le H1 et l'article concernent le choix d'un professeur pour un enfant. Proposition plus cohérente : `Cours d'Échecs Enfants à Paris : Choisir Son Professeur`. L'objectif est de clarifier l'intention parentale, sans modifier l'URL.

**`blog/combien-coute-cours-echecs.html` :** ses tarifs personnels sont cohérents avec l'accueil, mais les moyennes du marché et pourcentages d'écart ne sont accompagnés d'aucune source affichée. Remplacer « vrais chiffres du marché » par des repères datés et documentés, ou centrer la page sur les tarifs personnels et des exemples de budgets calculables. Vérifier l'affirmation de forfaits dégressifs « moi compris » : aucun forfait chiffré n'est présenté dans les blocs tarifs de l'accueil inspectés. Ne pas inventer une remise. Un CTR de 1,32 % sur 151 impressions ne suffit pas à incriminer le titre, d'autant que les requêtes visibles sont peu nombreuses et parfois hors intention.

Les titres doivent refléter précisément la page, ce que recommande [Google sur les liens de titre](https://developers.google.com/search/docs/appearance/title-link). Aucun gain chiffré n'est promis pour un changement de title.

## 6. Fiabiliser la mesure avant de prioriser par « conversions »

Dans le rapport GA4 par événement pour Google organic :

| Événement | Occurrences | Comptées comme événements clés |
|---|---:|---:|
| user_engagement | 271 | 74 |
| click_lien_ebook | 21 | 8 |
| ebook_signup | 18 | 12 |
| generate_lead | 2 | 1 |

Les 74 `user_engagement` représentent environ **78 % des 95 événements clés** retournés. Un engagement n'est pas une demande de cours. La différence entre occurrences et événements clés peut notamment dépendre de la configuration pendant la période ; cet historique ne prouve pas que le même paramétrage est encore actif aujourd'hui.

**Proposition :** contrôler les événements clés actuellement configurés, puis présenter séparément engagement, clic vers le guide, inscription réussie au guide et demande de cours effectivement transmise. Conserver une inscription au guide comme un objectif distinct d'un prospect intéressé par des cours. Définir les événements de succès selon la réponse effective des formulaires, pas uniquement un clic de bouton. Les [événements clés GA4](https://support.google.com/analytics/answer/9267568?hl=fr) doivent représenter les actions importantes pour l'activité.

Aucune modification des paramètres Google n'a été faite. Il serait prématuré de conclure que l'accueil a apporté 44 demandes de cours à partir de son total d'événements clés.

## 7. Petite correction de navigation

Dans `cgv.html`, le lien « Retour à l'édition reliée » pointe vers `/#pack-livres`, ancre absente de l'accueil. La destination cohérente est `/edition-raffinee/`, ou `/#edition-reliee` si le retour à l'encart de l'accueil est souhaité. La première mène directement au produit.

Le scanner a aussi signalé `${article.id}.html` dans le JavaScript du blog : c'est un gabarit dynamique, pas une URL cassée confirmée. Ce faux positif est exclu.

## Ce que je déconseille maintenant

- Créer une page pour chaque variante PDF : les trois nouvelles pages distinctes suffisent pour le prochain lot à mesurer.
- Renommer encore les URL ou fusionner des pages sur la seule base d'un faible volume.
- Réécrire immédiatement les pages règles, enfants et ouvertures optimisées début septembre : les données s'arrêtent au 4 septembre et ne mesurent pas ces changements.
- Interpréter 1 à 5 sessions GA4 sur une page comme une preuve de bonne ou mauvaise qualité.
- Fixer une longueur d'article comme objectif SEO. Les listes de citations peuvent être plus directes ; une explication d'échecs peut nécessiter un diagramme et un exemple plutôt qu'un paragraphe supplémentaire.

## Ordre de travail conseillé

1. Corriger les faits vérifiables : 96 pages, attribution Sala & Gobet, incohérences du tableau Elo et erreur de calcul horaire.
2. Nettoyer les citations et promesses non étayées dans les deux articles déjà visités.
3. Harmoniser la présentation auteur, le vouvoiement et les informations commerciales ; préciser les sources de tarifs externes.
4. Vérifier la définition des objectifs GA4, puis suivre séparément inscriptions au guide et demandes de cours.
5. Mesurer les modifications pendant une fenêtre comparable après leur publication, en documentant la date de mise en ligne. Si le volume reste faible, prolonger l'observation plutôt que tirer une conclusion sur quelques clics.

L'objectif est un contenu plus fiable et plus utile, pas une accumulation de balises. Les [recommandations Google pour ses fonctionnalités IA](https://developers.google.com/search/docs/appearance/ai-features) reposent elles aussi sur les fondamentaux SEO et un contenu fiable ; l'éligibilité ne garantit pas une citation.
