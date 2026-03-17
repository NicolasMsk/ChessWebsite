# GEO Audit Report — cours-echecs-paris.fr
**Date:** 17 mars 2026
**Business:** Cours d'Échecs Paris et Versailles — Nicolas Musicki
**Type:** Local Service (coaching d'échecs individuel, Paris & Versailles)
**Auditor:** Claude GEO Audit (5 subagents parallèles)

---

## Composite GEO Score

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║          GEO SCORE GLOBAL :   52 / 100               ║
║                   ★★½☆☆   FAIR                      ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### Détail par catégorie

| Catégorie | Score | Poids | Pondéré | Statut |
|-----------|-------|-------|---------|--------|
| AI Citabilité & Visibilité | 55/100 | 25% | 13.8 | Fair |
| Autorité de Marque | 15/100 | 20% | 3.0 | **Critique** |
| Qualité Contenu / E-E-A-T | 67/100 | 20% | 13.4 | Fair-Good |
| Fondations Techniques | 71/100 | 15% | 10.7 | Good |
| Données Structurées | 52/100 | 10% | 5.2 | Fair |
| Optimisation Plateformes | 58/100 | 10% | 5.8 | Fair |
| **SCORE TOTAL** | **52/100** | 100% | **51.9** | **Fair** |

---

## Diagnostic Rapide

Le site est **techniquement bien construit** pour un site statique — le schema markup, le SSR complet des pages individuelles, et la configuration robots.txt sont au-dessus de la moyenne pour un solopreneur. La vraie faiblesse structurelle est l'**absence quasi-totale de présence hors-domaine** : les moteurs IA (ChatGPT, Perplexity, Gemini) ne citent pas les sites qu'ils ne peuvent pas corroborer via des sources tierces.

### Forces identifiées
- Crawler access 100% — tous les bots IA peuvent accéder au site
- Contenu genuinement expert (intelligence article ~4 200 mots, études citées nommément)
- Schema LocalBusiness, FAQPage, Person, Service déjà en place
- Pages articles entièrement rendues côté serveur
- URL structure propre, hierarchie H1/H2 logique
- 23 pages indexées avec dates lastmod dans sitemaps

### Faiblesses critiques
- **Marque quasi-invisible hors domaine** — aucune présence confirmée sur Chess.com, Lichess, Reddit, annuaires de tuteurs
- **Pas de llms.txt** — les LLMs doivent deviner la structure du site
- **Page /blog/ JavaScript-only** — les crawlers IA ne voient aucun article depuis cette URL
- **Pas de mentions légales / politique de confidentialité** — non-conformité RGPD (formulaire de contact collecte des données)
- **Incohérences factuelles inter-pages** — 5 ans vs 8 ans vs 10 ans d'expérience selon la page

---

## Rapport Détaillé par Module

---

### Module 1 — AI Citabilité & Visibilité : 55/100

#### Scores de citabilité par page

| Page | Score Citabilité | Passages citation-ready |
|------|-----------------|------------------------|
| Guide 0-500 Elo | 78/100 | Routine 30min, "80% de parties gagnées par tactiques" |
| Guide règles complètes | 74/100 | Tableau valeurs pièces, conditions du roque |
| Homepage | 69/100 | Tarifs (1er cours gratuit, 50€/h), Elo 2077 |
| Bienfaits enfants | 66/100 | Étude espagnole 4 000 élèves, étude allemande +15% maths |

**Top 5 passages citation-ready (score > 75)**
1. Tableau valeurs/mouvements pièces (règles article) — 85/100
2. Tarifs homepage — 82/100
3. Routine quotidienne 30min (0-500 Elo) — 81/100
4. "80% des parties de débutants se gagnent par tactiques" (0-500 Elo) — 79/100
5. Quote enseignant "30min/jour > 3h/weekend" (0-500 Elo) — 80/100

#### Accès crawlers IA : 100/100
Tous les crawlers majeurs sont autorisés via `User-agent: * / Allow: /` :
GPTBot ✅ | ClaudeBot ✅ | PerplexityBot ✅ | Google-Extended ✅ | Amazonbot ✅

#### llms.txt : 0/100 — ABSENT
`/llms.txt` retourne HTTP 404. Fichier à créer (voir section Actions).

#### Présence de marque : 15/100 — Critique
| Plateforme | Statut | Impact |
|-----------|--------|--------|
| Wikipedia | Absent | Très fort |
| Wikidata | Absent | Fort |
| Chess.com coach | Absent | Fort (niche chess) |
| Lichess coach | Absent (@magickchess → 404) | Fort (niche chess) |
| Reddit | Non vérifié (403) | Moyen |
| Superprof / tuteurs FR | Absent | Fort |
| LinkedIn | Présent (non vérifié en profondeur) | Moyen |
| Instagram @magickchess | Présent | Faible |

> **Note clé :** Les modèles IA (ChatGPT, Perplexity, Claude) ne recommandent pas par nom un prestataire dont ils ne trouvent pas de mention tierce. C'est la principale raison pour laquelle le score global reste sous 60.

---

### Module 2 — Autorité de Marque : 15/100

Composant le plus faible de l'audit. Nicolas Musicki n'a aucune présence confirmée sur les plateformes que les LLMs utilisent comme sources primaires pour les réponses sur les cours d'échecs à Paris.

**Priorités de présence off-site :**
1. **Chess.com** — annuaire "Find a Coach" indexé par tous les LLMs
2. **Lichess** — profil /coach indexé par Perplexity et ChatGPT
3. **Superprof France** — plateforme de référence pour tuteurs, indexée par Google Gemini
4. **Pages Jaunes / Google Business Profile** — entité locale vérifiée
5. **FFE (Fédération Française des Échecs)** — autorité de domaine forte

---

### Module 3 — Qualité Contenu / E-E-A-T : 67/100

#### Scores E-E-A-T

| Dimension | Score | Principaux signaux |
|-----------|-------|-------------------|
| **Experience** | 15/25 | Voix pédagogique authentique, anecdotes élèves nommés, observations de cours ; mais incohérences durée d'expérience |
| **Expertise** | 14/25 | Elo 2077 (top 2% mondial) fort signal ; aucun lien vers profil FIDE/FFE pour vérification ; durées contradictoires |
| **Authoritativeness** | 12/25 | Couverture thématique large ; zéro lien externe hypertexte vers études citées ; aucune mention FFE ou partenariat club |
| **Trustworthiness** | 19/25 | HTTPS, téléphone visible, garantie 1er cours offert, schema markup ; **pas de mentions légales (RGPD)** |

#### Métriques contenu

| Métrique | Valeur | Évaluation |
|---------|--------|-----------|
| Longueur articles | 2 400–4 200 mots | Bonne profondeur |
| Lisibilité | Flesch ~55-65 | Adapté parents éduqués |
| Liens externes hypertextes | 0 | Gap critique |
| Images par article | 1-2 | Minimal |
| Densité H3 (article intelligence) | ~35 H3 | Trop fragmenté |

#### Incohérence critique détectée
La durée d'expérience varie selon les pages :
- Homepage : "passionné depuis l'enfance" (sans chiffre)
- Article intelligence : "plus de 8 ans"
- Article enfants Paris : "10 ans"
- Page Versailles : "plus de 5 ans" + "environ une dizaine d'élèves"

Cette incohérence est exactement ce que les quality raters Google et les modèles IA signalent comme signal de contenu non fiable.

#### Conformité légale — CRITIQUE
`/mentions-legales.html` → **404**
`/politique-de-confidentialite.html` → **404**
Un formulaire de contact collectant nom + email sans politique de confidentialité est **non conforme au RGPD/CNIL** (amende potentielle). À corriger immédiatement.

---

### Module 4 — Fondations Techniques : 71/100

#### Résultats par catégorie

| Check | Statut | Sévérité |
|-------|--------|----------|
| HTTPS | ✅ Pass | — |
| Rendu SSR (pages articles) | ✅ Pass | — |
| **Rendu SSR (/blog/index)** | ❌ **Fail** | **Critique** |
| Canonical tags | ✅ Pass | — |
| HTML lang="fr" | ✅ Pass | — |
| Open Graph tags | ✅ Pass | — |
| Sitemap XML (2×) | ✅ Pass | — |
| robots.txt | ✅ Pass | — |
| Mobile viewport | ✅ Pass | — |
| Liens internes (articles) | ✅ Pass | — |
| **Security headers** | ❌ **Fail** | High |
| **Liens ancre brisés (9 articles)** | ❌ **Fail** | High |
| **Images PNG non optimisées** | ❌ **Fail** | High |
| **CSS non minifié (pages blog)** | ⚠️ Warning | Medium |
| Sitemap lastmod cohérent | ⚠️ Warning | Low |

#### Problème critique — Blog index JS-rendered
```html
<!-- Ce que voient les crawlers IA sur /blog/ -->
<section class="blog-list" id="blog-list">
  <p>Chargement des articles...</p>
</section>
```
Les articles sont injectés par `fetch('./articles.json')` — invisible pour GPTBot, ClaudeBot, PerplexityBot. Les sitemaps XML compensent partiellement, mais `/blog/` est une impasse pour les crawlers sans JS.

#### Liens ancre brisés — 9 articles affectés
Les articles suivants ont `href="../#offres"` et `href="../#testimonials"` dans le menu de navigation — ces IDs n'existent plus sur la homepage actuelle (renommés en `#advantages`, `#tarifs`, `#faq`).

**Articles affectés :**
- cours-echecs-versailles.html
- debuter-echecs-guide-complet-0-500-elo.html
- echecs-intelligence-enfants-etudes.html
- echecs-tdah-concentration-enfants.html
- echecs-vs-jeux-video.html
- magnus-carlsen-parcours-champion-monde.html
- maxime-vachier-lagrave.html
- meilleur-echiquier-pliable.html
- regles-echecs-guide-complet.html

#### Images surdimensionnées
| Fichier | Taille actuelle | Taille cible | LCP impact |
|---------|----------------|-------------|-----------|
| regles-echecs-guide-complet.png | **1,81 MB** | < 150 KB WebP | Fort |
| cours-echecs-versailles.png | **2,26 MB** | < 150 KB WebP | Fort |

#### Logo manquant dans schema Article
`"url": "https://www.cours-echecs-paris.fr/logo.png"` → fichier **introuvable**
→ Bloque l'éligibilité aux rich snippets Article de Google.

---

### Module 5 — Données Structurées : 52/100

#### Inventaire schemas détectés

| Page | Type | Statut |
|------|------|--------|
| Homepage | LocalBusiness | ⚠️ Partiel |
| Homepage | FAQPage | ✅ Valide (rich results restreints) |
| Homepage | Person | ⚠️ Partiel |
| Homepage | Service | ⚠️ Partiel |
| Articles blog | Article | ⚠️ Partiel |

#### Problèmes de validation

| Problème | Sévérité | Fix |
|---------|----------|-----|
| `@context` HTTP au lieu de HTTPS (LocalBusiness block 1) | Medium | `"http://schema.org"` → `"https://schema.org"` |
| `address` et `geo` en tableau (invalide) | High | Utiliser un objet unique, pas un tableau |
| `logo.png` inexistant dans Article schema | **Critique** | Pointer vers `nicolas_musicki.webp` ou créer logo.png |
| `sameAs` limité à 2 plateformes | High | Ajouter GBP, Facebook, Chess.com, Lichess, FFE |
| `inLanguage: "fr"` absent sur articles | Medium | Ajouter sur tous les BlogPosting |
| `speakable` absent | Medium | Ajouter CSS selectors h1 + intro |
| `AggregateRating` absent | High | Ajouter une fois vraies reviews collectées |
| `BreadcrumbList` absent sur articles | Medium | Intégrer dans BlogPosting schema |
| `worksFor` absent (Person → LocalBusiness) | Low | Ajouter référence croisée |

#### Schemas manquants prioritaires

| Schema | Priorité | Impact GEO |
|--------|---------|-----------|
| AggregateRating | High | Trust signal local business |
| BreadcrumbList (articles) | Medium | Navigation AI |
| speakable | Medium | Voice/AI assistant readiness |
| Course | Low | Pertinent pour instruction chess |
| WebSite + SearchAction | Low | Sitelinks search box |

---

### Module 6 — Optimisation Plateformes : 58/100

| Plateforme | Score | Principal gap |
|-----------|-------|--------------|
| Bing Copilot | 69/100 | Pas de Bing Webmaster Tools, pas d'IndexNow |
| Google AI Overviews | 68/100 | Paragraphes réponse trop courts (< 40 mots), pas de FAQ schema sur articles |
| Google Gemini | 62/100 | Pas de Google Business Profile, pas de YouTube |
| ChatGPT Web Search | 47/100 | Pas d'entité Wikipedia/Wikidata, crawlers non nommés explicitement |
| Perplexity AI | 44/100 | Zéro citations externes hypertextes, aucune présence communautaire |

---

## Plan d'Action Priorisé

### QUICK WINS — Impact fort, effort < 1 journée

| # | Action | Fichier(s) concerné(s) | Impact |
|---|--------|----------------------|--------|
| 1 | **Créer `/llms.txt`** (voir template ci-dessous) | Nouveau fichier à la racine | +7pts AI Visibility |
| 2 | **Corriger liens ancre brisés** dans 9 articles (`#offres` → `#tarifs`, `#testimonials` → `#faq`) | 9 fichiers HTML | UX + Technical |
| 3 | **Corriger `logo.png`** dans Article schema → pointer vers fichier existant | Tous articles HTML | Rich snippets |
| 4 | **Corriger `@context` HTTP** → HTTPS dans LocalBusiness block 1 | index.html | Schema |
| 5 | **Corriger `address` et `geo` en tableau** → objets simples | index.html | Schema |
| 6 | **Ajouter bots IA explicitement** dans robots.txt | robots.txt | Platform |
| 7 | **Ajouter Bing Webmaster Tools** meta tag + soumettre sitemap | index.html | Bing Copilot |
| 8 | **Implémenter IndexNow** (clé API + ping) | Racine + workflow | Bing freshness |

### MEDIUM TERM — Impact fort, effort 1-7 jours

| # | Action | Priorité | Impact |
|---|--------|---------|--------|
| 9 | **Créer `/mentions-legales.html` et `/politique-de-confidentialite.html`** | ⚠️ LÉGAL | Trust, RGPD |
| 10 | **Corriger l'incohérence durée d'expérience** sur toutes les pages | Critique E-E-A-T | Crédibilité |
| 11 | **Ajouter fallback HTML statique** sur `/blog/index.html` pour les articles | Critique technique | AI crawler |
| 12 | **Convertir PNG → WebP** : regles-echecs.png (1,81MB) et versailles.png (2,26MB) | High | LCP, UX |
| 13 | **Ajouter `inLanguage: "fr"`** + `speakable` + `BreadcrumbList` dans Article schemas | Medium | Schema GEO |
| 14 | **Créer Google Business Profile** avec NAP identique au schema homepage | High | Gemini, AIO |
| 15 | **Créer profil Chess.com coach** + **Lichess coach** (activer @magickchess) | High | Brand mentions |
| 16 | **Minifier `blog-style.css`** → `blog-style.min.css` | Medium | Performance |
| 17 | **Ajouter 2-3 liens externes hypertextes** par article blog (études, FFE, FIDE) | High | Perplexity, E-E-A-T |

### STRATÉGIQUE — Impact fort, effort semaines

| # | Action | Impact estimé sur score |
|---|--------|------------------------|
| 18 | Créer profil **Superprof France** et collecter 5+ avis | +5-8pts Brand |
| 19 | Créer **entité Wikidata** pour Nicolas Musicki | +5pts ChatGPT entity |
| 20 | Créer page **`/a-propos`** dédiée avec bio complète, Elo vérifiable, lien FFE | +4pts E-E-A-T |
| 21 | Étendre **`sameAs`** : GBP, Facebook, Chess.com, Lichess, FFE, Wikidata | +5pts Schema |
| 22 | Ajouter **`AggregateRating`** schema (après collecte reviews) | +3pts Schema |
| 23 | Ajouter **FAQ schema au niveau article** sur top 3 articles | +3pts Google AIO |
| 24 | Créer **1 vidéo YouTube** (ex: "Comment enseigner le roque à un enfant") | +4pts Gemini |
| 25 | Étendre paragraphes réponse à **45-60 mots** sous chaque H2 (article règles) | +3pts Google AIO |

---

## Templates à Déployer

### Template llms.txt (créer à la racine du site)

```markdown
# Cours d'Échecs Paris

> Cours particuliers d'échecs à Paris et Versailles avec Nicolas Musicki,
> professeur 2077 Elo (top 2% mondial). Premier cours offert, sans engagement.

## Services
- [Cours particuliers d'échecs Paris](https://www.cours-echecs-paris.fr/): Leçons individuelles, en duo, ou en ligne pour enfants, adolescents et adultes.
- [Cours d'échecs Versailles](https://www.cours-echecs-paris.fr/blog/cours-echecs-versailles.html): Offre de cours dans les Yvelines (78).

## Guides pour débutants
- [Règles des échecs — guide complet](https://www.cours-echecs-paris.fr/blog/regles-echecs-guide-complet.html): Toutes les règles expliquées avec tableaux et illustrations.
- [De zéro à 500 Elo](https://www.cours-echecs-paris.fr/blog/debuter-echecs-guide-complet-0-500-elo.html): Plan structuré sur 2-4 mois avec routine quotidienne de 30 minutes.
- [10 erreurs du débutant](https://www.cours-echecs-paris.fr/blog/10-erreurs-debutant-echecs.html): Les pièges classiques à éviter.

## Ressources pour enfants et parents
- [Bienfaits des échecs pour les enfants](https://www.cours-echecs-paris.fr/blog/bienfaits-echecs-enfants.html): 7 bénéfices documentés, dès 5 ans.
- [Échecs et intelligence — que disent les études ?](https://www.cours-echecs-paris.fr/blog/echecs-intelligence-enfants-etudes.html): Analyse scientifique avec études Venezuela, Belgique, Allemagne, New York.
- [Cours d'échecs pour enfants Paris](https://www.cours-echecs-paris.fr/blog/cours-echecs-enfants-paris.html): Approche pédagogique adaptée par tranche d'âge.
- [Échecs et TDAH](https://www.cours-echecs-paris.fr/blog/echecs-tdah-concentration-enfants.html): Comment les échecs aident les enfants avec TDAH.

## Optional
- [Citations inspirantes sur les échecs](https://www.cours-echecs-paris.fr/blog/citations-echecs-inspirantes.html)
- [Magnus Carlsen — parcours champion du monde](https://www.cours-echecs-paris.fr/blog/magnus-carlsen-parcours-champion-monde.html)
- [Blog — tous les articles](https://www.cours-echecs-paris.fr/blog/)
```

### robots.txt mis à jour (ajouter les entrées explicites)

```
User-agent: *
Allow: /

# AI crawlers — explicit opt-in
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Amazonbot
Allow: /

Sitemap: https://www.cours-echecs-paris.fr/sitemap.xml
Sitemap: https://www.cours-echecs-paris.fr/blog/sitemap.xml
```

---

## Score Projeté Post-Actions

Si les Quick Wins + Medium Term sont tous implémentés :

| Catégorie | Score actuel | Score projeté |
|-----------|-------------|--------------|
| AI Citabilité & Visibilité | 55/100 | 68/100 |
| Autorité de Marque | 15/100 | 38/100 |
| Qualité Contenu / E-E-A-T | 67/100 | 76/100 |
| Fondations Techniques | 71/100 | 84/100 |
| Données Structurées | 52/100 | 71/100 |
| Optimisation Plateformes | 58/100 | 70/100 |
| **GEO Score Global** | **52/100** | **~68/100** |

Si les actions Stratégiques sont également complétées (profils tiers, Wikidata, reviews) :
**Score projeté : ~75-80/100**

---

## Annexe — Méthodologie de Scoring

| Catégorie | Poids | Source de données |
|-----------|-------|------------------|
| AI Citabilité & Visibilité | 25% | Analyse contenu, crawler access, llms.txt, brand mentions |
| Autorité de Marque | 20% | Présence Chess.com, Lichess, Reddit, Wikipedia, Wikidata, annuaires |
| Qualité Contenu / E-E-A-T | 20% | Experience, Expertise, Authoritativeness, Trustworthiness (0-25 chacun) |
| Fondations Techniques | 15% | SSR, CWV, crawlability, mobile, security headers, internal linking |
| Données Structurées | 10% | Schema completeness, validation JSON-LD, rich result eligibility |
| Optimisation Plateformes | 10% | Readiness Google AIO, ChatGPT, Perplexity, Gemini, Bing Copilot |

---

*Rapport généré par Claude GEO Audit — 5 agents parallèles — 17 mars 2026*
