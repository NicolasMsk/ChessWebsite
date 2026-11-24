# Série des ouvertures : modèle et premier exemple

La série compte désormais onze pages rédigées : Italienne, Espagnole, Écossaise,
Londres, gambit dame, Anglaise, Caro-Kann, Sicilienne, Française, Scandinave et Slave.
Elles sont générées en local ; aucune publication automatique n’a lieu.

## Les fichiers à utiliser

- `scripts/templates/ouverture.html` : présentation commune, navigation et auteur.
- `ouvertures.css` et `ouvertures.js` : affichage responsive et échiquier pas à pas.
- `_data/ouvertures/italienne.json` : exemple complet de contenu personnalisé.
- `_data/ouvertures-serie.json` : onze ouvertures, leur angle et la recherche historique à mener.
- `scripts/ouvertures.mjs` : génération et vérification des pages rédigées.

```powershell
node scripts/ouvertures.mjs --write
node scripts/ouvertures.mjs --check
node scripts/articles-lies.mjs --check
py scripts/diagrammes.py --check
```

Le générateur n’effectue aucun déploiement. Il parcourt les onze fichiers de contenu
effectivement rédigés, avec leurs métadonnées, sources et exercices propres.

## Ce que le modèle partage

Une réponse immédiate à la question du lecteur, les premiers coups expliqués,
un échiquier avec un nombre d’étapes adapté à chaque ouverture, les idées de jeu, une ligne courte
illustrative, deux réponses adverses, l’histoire du nom, trois erreurs propres
à l’ouverture, un exercice et sa correction, un bloc PDF, une FAQ et les sources.

Les boutons de l’échiquier utilisent des éléments HTML natifs ; position et
explications restent lisibles sans JavaScript. La solution s’ouvre sans script.
Sur petit écran, les colonnes deviennent une seule colonne, avec des contrôles
d’au moins 44 px. Une seule position est affichée à la fois.

## Ce qui doit être rédigé pour chaque ouverture

Ne pas remplacer seulement « Italienne » par un autre nom. Le centre, les pièces
à développer, les menaces, le rôle des pions, les erreurs et l’exercice doivent
être propres à la position. La feuille de route distingue par exemple le
développement de l’Italienne, la poussée centrale de l’Écossaise et le contrôle
de d5 depuis c4 dans l’Anglaise.

Pour l’histoire, chercher les analyses anciennes et l’origine du nom séparément.
Une ouverture peut exister avant sa dénomination. Distinguer auteur d’un traité,
analyste, popularisateur et inventeur. Ne pas donner de date de création exacte
ou de créateur unique sans preuve. Les notes historiques de la feuille de route
sont des pistes à vérifier, pas des faits destinés à être publiés tels quels.

Limiter l’enseignement aux premiers coups caractéristiques et à une ligne courte
qui montre le développement. Présenter les réponses adverses comme des repères,
sans arbre de variantes. Ne pas promettre une victoire ni un gain de classement.

## Le PDF et son parcours

Le CTA mène au formulaire existant :
`guide-apprendre-les-echecs.html#ebook-form`.

Il s’agit du Volume 1 gratuit, 95 pages, avec les principes d’ouverture, envoyé
par email. Le texte précise qu’il ne s’agit pas d’un répertoire complet propre
à l’Italienne. Aucun nouveau PDF, formulaire, traitement d’email ou automatisme
d’envoi n’a été inventé. Les accroches peuvent varier selon la page tout en
décrivant fidèlement cette même ressource.

## Ajouter la prochaine page

1. Rechercher les sources et rédiger un nouveau JSON dans `_data/ouvertures/`.
2. Inscrire ses positions et coups SAN dans `_data/diagrammes.json` ; produire
   les SVG avec le moteur existant. Vérifier les coups, le trait, l’orientation,
   les surlignages et la solution. La notation publique reste française.
3. Inscrire la page dans `blog/articles.json` et `_data/articles-lies.json`, avec
   trois recommandations et au moins un lien entrant pertinent. Le générateur
   crée ensuite le fichier cible ; aucune page vide n’est nécessaire.
4. Générer la page ; vérifier les sources, titres distincts, FAQ visible et JSON-LD,
   liens, parcours PDF, affichage mobile et fonctionnement sans JavaScript.
5. Ajouter les liens depuis l’article central et les sitemaps avec la date réelle.
6. Relire la page entière avant toute publication. Les titres et descriptions
   aident à présenter le contenu ; les moteurs peuvent les réécrire.

## Intégration de l’exemple

Le guide central propose les onze fiches, regroupées avec les Blancs, avec les Noirs
contre e4 et avec les Noirs contre le gambit dame. Chaque fiche propose trois
lectures pertinentes et reçoit des liens entrants. Catalogue et sitemaps
sont mis à jour au 24 novembre 2026. Les fichiers de paiement et les modifications
commerciales en cours ne font pas partie de ce travail.

Sources : Chess.com, fiche Italian Game pour le contexte historique ; article de
Bill Wall sur le sens de Giuoco Piano ; nomenclature publique Lichess pour les noms
et les premiers coups. Les références figurent aussi dans la page et son JSON-LD.

## Vérification de la série complète

Les cinq pages avec les Noirs ont leurs échiquiers orientés côté noir, leurs
réponses adverses présentées comme choix des Blancs et leurs exercices avec
le trait noir. Le nombre de positions du lecteur pas à pas reste variable.
Les 65 nouveaux diagrammes complètent les huit de l’Italienne. Les 154 diagrammes
du site sont contrôlés par le validateur existant. Les lignes principales restent courtes. Les ateliers isolent un motif sur
quelques demi-coups supplémentaires, sans arbre de variantes.

Les sources historiques incluent les fiches Chess.com, l’étude de Bryan Smith
sur la Caro-Kann, ChessBase pour Londres et la Scandinave, Chess Klub pour le nom
Slave et l’extrait de Grivas publié par Thinkers Publishing pour la Sicilienne.
Chaque page indique ses références et leur date de consultation.

## Enrichissement échiquéen des onze fiches

Chaque page comprend désormais une lecture détaillée de la structure de pions,
une carte de cinq pièces ou éléments avec leurs cases et conditions, trois
réactions aux idées adverses, une position commentée supplémentaire et une
transition vers le milieu de partie. Les réponses sont présentées comme des
décisions à justifier, pas comme une variante à réciter.

Les nouveaux cas pratiques portent notamment sur …Dd4 et la double attaque
e4/e5 dans l’Espagnole, la perte immédiate de la dame après Dxd4 dans la position
d’Écossaise étudiée, Db3 contre la pression sur b2 dans Londres et la mobilité
du fou c8 après les échanges dans la Française. Les conditions et obstacles
sur les diagonales sont explicités, notamment b3–c4–d5 dans la Slave et la
grande diagonale du fou g2 dans l’Anglaise.

Onze diagrammes supplémentaires sont générés depuis les coups SAN et les
154 diagrammes du site sont contrôlés. Les suites proposées sont légalement
rejouées ; les attaques clés des diagrammes sont contrôlées. Il ne s’agit pas
d’évaluations moteur ni d’affirmations que toutes les réponses seraient forcées.

Les fiches comptent environ 2 400 à 2 800 mots de contenu HTML avant les lectures
recommandées (explications des étapes incluses). Le catalogue et les pages
indiquent des temps de lecture harmonisés. Les variantes restent courtes :
les nouveaux cas isolent une décision ou un motif plutôt qu’un arbre de théorie.

## Ateliers de comparaison et autovérification

Les onze pages proposent chacune un atelier comparant deux positions issues
d’un même départ : 22 diagrammes supplémentaires et 33 questions corrigées.
Les deux branches ne sont pas présentées comme deux recommandations équivalentes :
certaines illustrent une erreur ou un coût concret. Les exemples vont jusqu’à
huit coups pour montrer une capture, une reprise ou une parade ; ce ne sont
pas des répertoires théoriques à mémoriser.

Le validateur vérifie désormais les bilans matériels selon les valeurs usuelles
(pion 1, cavalier et fou 3, tour 5, dame 9), les absences d’attaque annoncées
et les positions où un échec est explicitement absent. Des tests négatifs
rejettent un faux bilan de la Française, un fou qui traverserait son pion dans
l’Anglaise et un faux échec de dame à travers le cavalier c3 dans la Scandinave.
Ces contrôles portent sur les faits de la position et ne prétendent pas fournir
une évaluation moteur ou prouver que les suites sont toutes forcées.

Les ateliers sont disponibles sans JavaScript. Leurs deux colonnes deviennent
une seule colonne sur mobile ; les réponses des quiz utilisent des éléments
HTML details/summary accessibles au clavier. Les premiers coups interactifs,
les liens PDF et le maillage éditorial sont conservés.

## Variantes et vigilance tactique — 24 novembre 2026

Ajout de deux branches courtes par fiche (22 variantes) et de 11 situations tactiques, avec 33 nouveaux diagrammes. Chaque situation fournit la position, une suite expliquée et une ligne de prévention ou de réponse. Les mats, clouages, fourchettes et bilans matériels disposent de contrôles explicites. Les notations françaises des nouveaux blocs sont comparées au rejeu SAN.

Les pages comportent désormais environ 2 900 à 3 300 mots. Les titres, descriptions et temps de lecture reflètent le contenu enrichi. Le total du manifeste passe à 187 diagrammes. Vérification automatisée des ressources et du contenu ; aucune nouvelle vérification visuelle dans un navigateur ni publication effectuée pour cette passe.

## Lisibilité, référencement et petits écrans — 24 novembre 2026

Ajout de trois repères propres à chaque ouverture et de deux comparaisons contextualisées (22 liens) par fiche. Les informations restent présentes dans le HTML ; les sections déclarées dans les données structurées correspondent à des ancres visibles. Ajout de la description alternative Twitter et de la gratuité de l’article dans son balisage.

Le sommaire reste ouvert sans JavaScript et devient repliable sur téléphone. Grilles d’étude en une colonne sous 900 px, marges réduites sur téléphone, contrôle des retours à la ligne, cibles tactiles et décalage des ancres calculé depuis la bannière existante. Styles limités aux pages d’ouverture.

Référence éditoriale : https://developers.google.com/search/docs/appearance/ai-features — contenu utile, texte accessible et données structurées fidèles ; aucune garantie de citation. Les navigateurs CUA et le module de rendu local étaient indisponibles : vérifications de code et tests automatisés, sans validation visuelle mobile dans cette passe. Aucune publication.

## Correction pédagogique et suppression des encarts — 24 novembre 2026

À la demande de Nicolas, retrait des blocs visibles « Sources et vérification » et des liens qui pointaient vers eux dans les onze fiches, ainsi que de l’encart homonyme du guide de jeu en ligne. Les références de travail sont conservées dans les données éditoriales.

Caro-Kann : la position commentée utilise désormais 4. Cc3 au lieu de 4. Cf3. Le cavalier g1 reste en g1 et la dame d1 défend g4 ; …Fxg4 permet Dxg4. Séquence, SVG, légende, contexte, réponse et preuves ont été synchronisés. Une régression vérifie également que l’ancienne position avec Cf3 bloque cette reprise.

Relecture des 22 exercices et positions commentées, ainsi que des quiz des ateliers ; ajout de preuves après les solutions pour contrôler les propriétés réellement expliquées. Ces contrôles ne constituent pas une analyse moteur ni une preuve que chaque réponse pédagogique serait le seul meilleur coup.
