# Relecture du 10 septembre 2026

Publication demandée par Nicolas après validation de chaque lot. Le lot précédent de quatre articles est enregistré dans le commit `98297c6`.

## Article corrigé

`blog/10-erreurs-debutant-echecs.html` : les dix thèmes sont conservés, avec une explication, un repère et une action concrète. Les URL et les ancres existantes sont conservées.

- Exemple de dame corrigé : l'ancienne variante comportait `Dxh8` depuis e5, un déplacement impossible. Deux suites légales montrent désormais le développement avec gain de temps et le danger de capturer un pion défendu.
- Retrait des statistiques sans source, des citations attribuées sans référence et du gain « +200 Elo en un mois garanti ».
- Conseils nuancés sur le centre, la sortie de dame, le roque, le temps par coup, les échanges et le blitz. Conditions du roque référencées aux [règles FIDE, article 3.8.2](https://handbook.fide.com/chapter/e012023).
- Fiche utilisable pour la relecture après la partie ; retrait du conseil de garder une aide à côté de l'écran pendant une partie compétitive.
- Liens vers les règles, ouvertures, exercices, finales, analyse et guide PDF existant. Aucun PDF ajouté.
- Titre, descriptions et FAQ harmonisés entre page, partage social, JSON-LD et catalogue. Date du catalogue alignée sur la date de publication déjà affichée dans l'article (12 novembre 2025). Modification datée du 10 septembre 2026 et reportée dans le sitemap.

## Vérifications

Un seul H1, JSON-LD valide, réponses FAQ identiques aux réponses visibles, liens et ancres internes existants. Vérification Chromium sur les fichiers locaux à 1440 et 390 pixels : aucun débordement horizontal ni erreur JavaScript. `git diff --check` réussi.

Cette passe vise la précision et l'utilité du contenu. Elle ne constitue pas une relecture exhaustive du blog ni une mesure de gain SEO. Les autres articles restent à vérifier, notamment ceux qui présentent des bénéfices cognitifs chiffrés.
