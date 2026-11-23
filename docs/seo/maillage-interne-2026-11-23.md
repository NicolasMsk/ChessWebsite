# Maillage des articles — 23 novembre 2026

Modifications locales, non publiées.

## Périmètre et constat

Le catalogue contient 38 adresses : 36 articles et deux anciennes pages redirigées vers les pages de zones. Tous les fichiers HTML du blog, hors index, ont été rapprochés de ce catalogue. Les deux redirections ne reçoivent pas de nouveau contenu.

Six articles n’avaient aucun encart de recommandations visible :

- 10-erreurs-debutant-echecs
- judit-polgar-meilleure-joueuse-echecs
- classement-elo-echecs
- meilleurs-films-series-echecs
- psychologie-biais-mentaux-echecs
- bienfaits-echecs-enfants

La page des dix erreurs possédait déjà des liens contextuels dans son texte. Le problème était l’absence d’une section de lectures complémentaires explicite. D’autres pages proposaient seulement une recommandation, ou un lien vers une page commerciale.

## Résultat préparé

Les 36 articles ont maintenant un bloc « À lire aussi », avec trois articles distincts choisis selon leur sujet : 108 liens de recommandation au total. Chaque article reçoit au moins une recommandation depuis un autre article. Aucune recommandation ne pointe vers elle-même, une ancienne adresse redirigée ou une page inexistante.

Pour « 10 erreurs de débutant », les trois choix sont : exercices corrigés, ouvertures pour débutants et finales de base. Les parcours enfants, adultes, cadeaux, biographies et progression disposent de sélections propres à leur thème.

Les liens sont de vraies balises HTML, disponibles sans JavaScript, accompagnées de titres et de descriptions utiles. Les anciens blocs de lecture sont remplacés pour éviter les doublons. Les liens du texte et les encarts commerciaux du guide, des cours et des cadeaux sont conservés.

La mise en page utilise trois cartes sur grand écran et une colonne sous 800 px, avec un état de focus visible au clavier. La feuille de style des articles porte une version pour renouveler le cache. Le rendu visuel reste à vérifier dans le navigateur.

Les dates de modification des articles et les deux sitemaps sont actualisés au 23 novembre 2026 ; les dates de publication initiale sont conservées.

## Maintenance et contrôles

La sélection éditoriale est dans `_data/articles-lies.json`. Les titres des liens viennent du catalogue `blog/articles.json` ; les descriptions et les trois destinations sont définies explicitement pour chaque article.

Commandes :

```text
node scripts/articles-lies.mjs --check
node scripts/articles-lies.mjs --write --date=2026-11-23
```

Le contrôle refuse un article oublié, une cible invalide, un lien vers soi-même, des destinations répétées ou un article ne recevant aucune recommandation. Lors de l’ajout d’un nouvel article, prévoir ses trois lectures complémentaires et l’inclure dans la sélection d’au moins un article existant.

Les quatre tests de maillage vérifient la couverture complète, les destinations, la stabilité de la génération et la conservation des liens contextuels et commerciaux. La suite JavaScript complète passe ses 95 tests. L’audit statique des 53 pages avec navigation ne détecte ni lien local cassé, ni identifiant répété, ni JSON structuré invalide. L’avertissement antérieur concernant la longueur du titre de la page seniors reste hors de cette intervention.

Le cache local `.pytest_cache` est exclu du contrôle des fichiers publiés et du suivi Git. Aucun changement de tarif ou de parcours de commande n’est effectué.
