---
name: chess-blog-writer
description: Use when writing a new blog article for cours-echecs-paris.fr. Triggered by a topic/subject for the chess blog. Handles full article creation, indexing, sitemaps, image prompt, and all files needed for the article to go live.
---

# Chess Blog Writer

Pipeline complet pour publier un article sur **cours-echecs-paris.fr**.

## Input requis

Le sujet de l'article (ex: "les ouvertures pour debutants", "echecs et autisme").

## Pipeline - Checklist stricte

Chaque article requiert **7 fichiers modifies/crees**. Ne rien oublier.

```
1. [RECHERCHE]   Analyser le sujet, les articles existants, le maillage interne possible
2. [ARTICLE]     Ecrire blog/{slug}.html (template complet)
3. [ARTICLES.JSON] Ajouter l'entree en PREMIERE position dans blog/articles.json
4. [SITEMAP ROOT]  Ajouter <url> dans sitemap.xml (racine)
5. [SITEMAP BLOG]  Ajouter <url> dans blog/sitemap.xml
6. [LLMS.TXT]      Ajouter la ligne dans llms.txt (section appropriee)
7. [IMAGE]         Fournir : nom du fichier + prompt de generation d'image
```

## Etape 1 — Recherche prealable

Avant d'ecrire :
- Lire `blog/articles.json` pour connaitre les articles existants
- Identifier 3-5 articles existants pour le **maillage interne** (liens bidirectionnels)
- Definir le **slug** : mots-cles-separes-par-tirets (ex: `echecs-autisme-enfants`)
- Definir la **date** : date du jour au format YYYY-MM-DD
- Estimer le **readTime** : en minutes (typiquement 10-18 min)

## Etape 2 — Ecrire l'article HTML

Fichier : `blog/{slug}.html`

Utiliser le template de reference dans `article-template.html` de ce skill.

### Style d'ecriture (CRITIQUE)

Le ton de Nicolas est **conversationnel, chaleureux, expert mais accessible** :
- **Tutoyer ou vouvoyer** : TOUJOURS vouvoyer (pas de "tu")
- **Emojis** : utiliser avec parcimonie (1-2 par section max)
- **Adresse directe** : parler au lecteur ("Vous vous demandez...", "Imaginez...")
- **Humour leger** : parentheses humoristiques, auto-derision douce
- **Expert credible** : citer des etudes, des chiffres, son experience
- **Pas corporate** : jamais de jargon marketing, rester authentique
- **Phrases courtes** : alterner phrases courtes percutantes et explications
- **Listes a puces** : pour la lisibilite, beaucoup de listes
- **Mots en gras** : mettre en evidence les points cles avec `<strong>`

### Structure de contenu obligatoire

1. **Intro box** (`.intro-box`) — accroche emotionnelle/question, ~3-4 phrases
2. **Table des matieres** (`.table-of-contents`) — liens ancres vers les H2
3. **Contenu principal** — H2 > H3, avec encarts varies :
   - `.tip-box` — conseil pratique de Nicolas
   - `.science-box` — etude scientifique / chiffre source
   - `.highlight-box` — fait marquant ou temoignage
   - `.quote` — citation (eleve, champion, parent)
   - `.cta-section` — appel a l'action vers `../#contact`
4. **CTA final** — section CTA "Vous etes a Paris ou Versailles ?"
5. **Article recommande** (`.article-recommendation`) — lien vers article connexe
6. **Footer auteur** — signature Nicolas + liens retour

### SEO obligatoire

- **Title tag** : < 60 chars, mot-cle principal + accroche (parenthese ou chiffre)
- **Meta description** : < 160 chars, chiffre + benefice + curiosite
- **Meta keywords** : 8-12 mots-cles pertinents
- **H1** : peut differer legerement du title, plus descriptif
- **Open Graph** : title, description, image, type=article, locale=fr_FR
- **Twitter Card** : summary_large_image
- **Schema.org Article** : JSON-LD complet (author, publisher, dates, image)
- **Canonical URL** : `https://www.cours-echecs-paris.fr/blog/{slug}.html`
- **article:published_time** : date du jour
- **article:section** : categorie de l'article
- **article:tag** : 3-4 tags pertinents

### Maillage interne

- Minimum **3 liens** vers d'autres articles du blog (in-content, naturels)
- **1 lien** vers la page d'accueil ou section specifique
- Dans l'encart `.article-recommendation` : lien vers l'article le plus proche thematiquement
- Les liens doivent etre contextuels, pas forces

### Longueur cible

- **2500-4000 mots** de contenu (hors HTML/meta)
- **8-18 min** de lecture
- Minimum **4 sections H2** + sous-sections H3

## Etape 3 — Mettre a jour articles.json

Ajouter l'entree **en premiere position** du tableau `articles` dans `blog/articles.json` :

```json
{
  "id": "{slug}",
  "title": "Titre SEO de l'Article",
  "description": "Meta description < 160 chars",
  "date": "YYYY-MM-DD",
  "readTime": "XX min",
  "author": "Nicolas Musicki",
  "image": "images/{slug}.webp",
  "imageAlt": "Description alt detaillee de l'image"
}
```

## Etape 4 — Mettre a jour sitemap.xml (racine)

Ajouter avant `</urlset>` dans `sitemap.xml` :

```xml
<url>
  <loc>https://www.cours-echecs-paris.fr/blog/{slug}.html</loc>
  <lastmod>YYYY-MM-DD</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
```

## Etape 5 — Mettre a jour blog/sitemap.xml

Meme format, ajouter dans `blog/sitemap.xml`.

## Etape 6 — Mettre a jour llms.txt

Ajouter la ligne dans la **section appropriee** de `llms.txt` :
```
- [Titre court](https://www.cours-echecs-paris.fr/blog/{slug}.html): Description courte.
```

Sections existantes : Services, Guides pour debutants, Ressources pour enfants et parents, Progression et strategie, References et culture echecs. Choisir la plus pertinente ou en creer une si necessaire.

## Etape 7 — Image

**Nom du fichier** : `blog/images/{slug}.webp`

**Fournir un prompt de generation d'image** adapte au sujet. Le prompt doit :
- Decrire une scene en rapport avec le sujet de l'article
- Etre en anglais (pour les generateurs d'images)
- Style : photo realiste, lumiere chaude, ambiance premium
- Inclure un echiquier ou des pieces d'echecs si pertinent
- Resolution : 1200x630 (format OG image / blog card)
- Pas de texte dans l'image
- Pas de visages reconnaissables

Format de sortie :
```
FICHIER IMAGE : blog/images/{slug}.webp
ALT TEXT : {description en francais}
PROMPT : {prompt en anglais pour generation}
```

## Verification finale

Avant de presenter le travail comme termine :
- [ ] L'article HTML est complet et suit le template exactement
- [ ] Le schema JSON-LD est valide
- [ ] articles.json est valide (tester le JSON)
- [ ] Les deux sitemaps sont mis a jour
- [ ] llms.txt est mis a jour
- [ ] Le maillage interne est bidirectionnel (liens dans les deux sens si possible)
- [ ] Le prompt d'image est fourni avec le nom de fichier
- [ ] Toutes les URLs utilisent le bon domaine : `www.cours-echecs-paris.fr`
