# Diagrammes du site — contrôle du 23 novembre 2026

Version locale non publiée. Les changements de paiement et de page cadeau réalisés dans les autres travaux ne font pas partie de cette intervention.

## Résultat

Les 35 diagrammes SVG existants sont répertoriés et contrôlés. Les corrections antérieures des couleurs de 22 échiquiers sont conservées. Treize nouveaux SVG portent le total à 48, utilisés dans 14 pages, avec 66 affichages de diagrammes au total.

Chaque SVG est comparé à sa position de référence : type, couleur et case des pièces, coordonnées, orientation et alternance des 64 cases. Les suites d’ouverture sont rejouées coup par coup. Les solutions des exercices font l’objet de contrôles de légalité, d’attaque, de clouage, de mat ou de pat selon le cas. Les flèches et surlignages des nouveaux SVG et des schémas de déplacement sont également contrôlés.

Le référentiel distingue 40 positions complètes, six schémas de déplacement avec des pièces isolées et deux mini-jeux. Les schémas isolés ne sont pas présentés comme des positions de parties complètes. Le mini-jeu « Capture tout » est vérifié avec un parcours de tour qui capture les quatre pions en cinq déplacements ; ses pions sont immobiles et il ne comporte pas de rois.

## Pages enrichies

| Article | Diagrammes ajoutés | Contenu illustré |
| --- | ---: | --- |
| debuter-echecs-guide-complet-0-500-elo.html | 16 | Position initiale, prise en passant, promotion, centre, roque avant/après, cinq motifs tactiques, Italienne, Londres, Française, mat et pat |
| 10-erreurs-debutant-echecs.html | 6 | Centre, sorties de dame, dame en prise, roque avant/après, opposition |
| mon-enfant-perd-toujours-echecs.html | 2 | Italienne et Française, notation française harmonisée |
| magnus-carlsen-parcours-champion-monde.html | 1 | Position de l’Espagnole citée dans le texte |
| activites-enfants-vacances-echecs.html | 1 | 1.e4 e5 2.Cf3 à rejouer ensemble |
| championnat-monde-echecs-2026.html | 1 | Lecture de la notation sur un exemple de début de partie |
| stagnation-echecs-progresser.html | 2 | Exemples de réponses à 1.e4 et à 1.d4 |
| combien-temps-devenir-bon-echecs.html | 2 | Positions de base pour visualiser un répertoire |

Les exemples de l’Espagnole et de notation ne sont pas attribués à une partie précise d’un champion ou du championnat. Les textes le précisent. Les passages généraux sur l’Elo, les biographies ou les plateformes, sans position à expliquer, ne reçoivent pas de diagramme décoratif.

## Corrections échiquéennes du texte

- Clouage : le fou g5, le cavalier f6 et le roi e8 ne sont pas alignés. L’exemple devient fou b5, cavalier c6, roi e8, avec d7 libre. La distinction entre clouage absolu et relatif est précisée.
- Attaque double : exemple avec dame d4, roi noir g7 et tour a1. L’échec force une réponse avant la capture de la tour ; les deux lignes sont libres.
- Découverte : Ff5+ ouvre réellement la colonne de la tour e1 contre le roi e8. La pièce déplacée ne peut pas nécessairement capturer n’importe quoi sans conséquence.
- Mat et pat : une case attaquée n’est pas une fuite légale du roi. Les deux résultats sont montrés avec des positions voisines ; le pat est une nulle, pas une défaite.
- Londres : les réponses noires sont explicites ; un plan ne s’applique pas automatiquement contre toute défense.
- Française : 3.e5 c5 est un exemple précis de variante d’avance. Le pion e5 contrôle f6, ce qui interdit d’y développer automatiquement le cavalier noir.
- Promotion : quatre choix légaux, dame, tour, fou ou cavalier ; la promotion en pion ou en roi est exclue.
- Prise en passant : rangée correcte, dernier coup adverse et sécurité du roi précisés.
- Le diagramme des principes d’ouverture conserve sa position correcte ; sa légende précise que les fous de l’aile roi sont développés, sans prétendre que les quatre fous sont sortis.

Les dates de modification des neuf articles concernés et les deux sitemaps sont actualisés au 23 novembre 2026. Les dates de publication initiales sont conservées.

## Vérifications et maintenance

- `py scripts/diagrammes.py --check` : 48 diagrammes vérifiés, soit 3 072 couleurs de cases contrôlées.
- `py tests/diagrammes_test.py` : six tests de régression échiquéenne réussis, notamment le rejet d’un faux mat, d’une mauvaise ouverture et de couleurs inversées.
- Suite JavaScript : 91 tests réussis, dont liens et ressources des diagrammes, navigation, tarifs et commandes.
- Audit statique de 53 pages : liens et images locaux, identifiants et JSON structurés sans erreur. Avertissement préexistant sur la longueur du titre de la page seniors.
- Mise en page : SVG vectoriels avec dimensions explicites et chargement différé. La grille des paires accepte les petits écrans sans largeur minimale fixe de 240 px.
- Contrôle visuel bureau/mobile non réalisé : l’accès navigateur est indisponible dans cette session. À effectuer avant mise en ligne.

Le référentiel est `_data/diagrammes.json`. Les coups y utilisent la notation SAN anglaise attendue par python-chess ; les visiteurs lisent la notation française dans les articles. `scripts/diagrammes.py --write` régénère les 13 nouveaux SVG marqués `generated`, puis vérifie l’ensemble des diagrammes. Les symboles de pièces sont réutilisés depuis les SVG déjà présents sur le site.

Installation de l’outil de développement : `py -m pip install -r scripts/requirements-diagrammes.txt --target tmp/chess-tools-normal`. Cette dépendance sert aux contrôles et à la génération ; le site statique n’en a pas besoin pour afficher les SVG. Les caches Python sont ignorés et le dossier temporaire, déjà exclu de la publication, est également exclu du contrôle des tarifs.

Références : [règles FIDE, articles 2 et 3](https://handbook.fide.com/chapter/e012023), [documentation python-chess](https://python-chess.readthedocs.io/en/latest/).
