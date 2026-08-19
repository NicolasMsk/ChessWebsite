# Pack « Édition reliée à la main » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendre depuis la landing page de cours-echecs-paris.fr un pack des deux volumes reliés à la main à 64,99 € TTC livraison comprise, avec paiement Stripe, email de confirmation client et email de notification vendeur.

**Architecture:** Site statique (GitHub Pages, domaine `cours-echecs-paris.fr`) + un Cloudflare Worker existant (`api/worker.js`) qui gère déjà le lead magnet et un webhook Stripe. On ajoute au Worker un endpoint de création de Checkout Session, une branche produit dans le webhook existant, et deux endpoints admin. Côté site, une section sur `index.html`, une feuille de style dédiée, et deux pages statiques.

**Tech Stack:** HTML/CSS statiques · Cloudflare Workers (ES modules) · Cloudflare KV · Stripe Checkout (API REST, form-encoded) · Resend (emails) · Node 24 `node:test` pour les tests unitaires · Wrangler 4.x

**Spec:** [2026-08-19-pack-livres-relies-design.md](../specs/2026-08-19-pack-livres-relies-design.md)

---

## Structure des fichiers

| Fichier | Responsabilité | Action |
|---|---|---|
| `images/reliure/*.webp`, `*.mp4` | Visuels du produit | Créer (copie depuis `ebook/reliure_images/`) |
| `pack-livres.css` | Styles de la section, de la FAQ pack, et des 2 nouvelles pages | Créer |
| `index.html` | + section `#pack-livres`, + FAQ pack, + JSON-LD, + script CTA | Modifier |
| `cgv.html` | Conditions générales de vente | Créer |
| `commande-confirmee.html` | Page de remerciement post-paiement | Créer |
| `api/order.js` | Logique métier pure des commandes : construction de l'enregistrement, formatage d'adresse, templates d'emails | Créer |
| `api/worker.js` | Routage + I/O : endpoints, appels Stripe/Resend/KV | Modifier |
| `api/test/order.test.js` | Tests unitaires de `order.js` | Créer |
| `sitemap.xml` | + `cgv.html` | Modifier |

**Pourquoi `api/order.js` séparé :** `worker.js` fait déjà 534 lignes et mélange routage, I/O et templates HTML. Y ajouter 300 lignes de commande le rendrait impossible à tenir en tête. En isolant la logique **pure** (aucun I/O) dans `order.js`, elle devient testable sans réseau ni KV — c'est ce qui rend les tâches 7 et 9 testables en TDD. `worker.js` garde le routage et les effets de bord.

---

## Task 1 : Copier les visuels du produit

**Files:**
- Create: `images/reliure/pack-principal.webp`
- Create: `images/reliure/pack-tranche.webp`
- Create: `images/reliure/pack-rouge.webp`
- Create: `images/reliure/pack-plongee.webp`
- Create: `images/reliure/pack-video.mp4`

Les fichiers sources sont dans `ebook/reliure_images/` avec des noms d'appareil photo (`1000020263.webp`). On les renomme en noms parlants et on les sort de `ebook/` (qui contient les PDF sources, pas des assets web).

Les `.webp` pèsent 48 à 75 Ko : aucune optimisation nécessaire.

- [ ] **Step 1: Créer le dossier et copier les fichiers**

```bash
cd "c:/Users/nmusicki/Documents/CoS/projects/personal/Chess_Website"
mkdir -p images/reliure
cp ebook/reliure_images/1000020263.webp images/reliure/pack-principal.webp
cp ebook/reliure_images/1000020264.webp images/reliure/pack-tranche.webp
cp ebook/reliure_images/1000020256.webp images/reliure/pack-rouge.webp
cp ebook/reliure_images/1000020258.webp images/reliure/pack-plongee.webp
cp ebook/reliure_images/1000020265.mp4 images/reliure/pack-video.mp4
```

`1000020266.webp` n'est volontairement pas copiée (arrière-plan encombré).

- [ ] **Step 2: Vérifier les tailles**

Run: `ls -la images/reliure/`

Expected : 4 fichiers `.webp` entre 45 et 80 Ko, 1 fichier `.mp4` de ~2,7 Mo.

Si un `.webp` dépasse 200 Ko, c'est que le mauvais fichier a été copié — vérifier.

- [ ] **Step 3: Commit**

```bash
git add images/reliure/
git commit -m "feat(pack): ajoute les visuels de l'edition reliee"
```

---

## Task 2 : Feuille de style `pack-livres.css`

**Files:**
- Create: `pack-livres.css`

Le site charge `style.min.css` (version minifiée de `style.css`). Modifier `style.css` obligerait à re-minifier et à garder deux fichiers en phase — source de bugs silencieux. Une feuille dédiée évite complètement le problème.

Les couleurs reprennent les variables déjà définies dans `:root` de `style.css` (`--walnut: #3b2314`, `--accent: #c9a84c`, `--beige-warm: #f5efe6`), disponibles globalement puisque `style.min.css` est chargé avant.

- [ ] **Step 1: Créer le fichier**

```css
/* ==========================================================
   PACK LIVRES RELIÉS — section landing, FAQ, pages annexes
   Chargé APRÈS style.min.css. Utilise les variables :root
   déjà définies par style.css (--walnut, --accent, etc.).
   ========================================================== */

.pack-livres {
  background: linear-gradient(180deg, #ffffff 0%, var(--beige-warm, #f5efe6) 100%);
  padding: 80px 20px;
  border-top: 1px solid rgba(59, 35, 20, 0.08);
}

.pack-wrap {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 56px;
  align-items: center;
}

/* ---------- Colonne visuels ---------- */

.pack-visuals {
  min-width: 0;
}

.pack-hero-media {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(59, 35, 20, 0.22);
  background: var(--walnut, #3b2314);
  aspect-ratio: 4 / 3;
}

.pack-hero-media img,
.pack-hero-media video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* La vidéo est masquée tant que JS ne l'a pas activée : évite
   d'imposer 2,7 Mo aux utilisateurs qui ne verront jamais la section. */
.pack-hero-media video {
  display: none;
}

.pack-hero-media.is-video-ready img {
  display: none;
}

.pack-hero-media.is-video-ready video {
  display: block;
}

.pack-thumbs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.pack-thumbs img {
  display: block;
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(59, 35, 20, 0.16);
}

/* ---------- Colonne contenu ---------- */

.pack-content {
  min-width: 0;
}

.pack-eyebrow {
  font-family: Montserrat, sans-serif;
  font-size: 0.72rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--accent-dark, #a6872e);
  margin-bottom: 14px;
}

.pack-livres h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.7rem, 3.4vw, 2.4rem);
  line-height: 1.2;
  color: var(--walnut, #3b2314);
  margin: 0 0 18px;
}

.pack-pitch {
  font-family: Lora, Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.7;
  color: #333;
  margin: 0 0 24px;
}

.pack-features {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
}

.pack-features li {
  font-family: Lora, Georgia, serif;
  font-size: 0.98rem;
  line-height: 1.6;
  padding: 9px 0 9px 30px;
  position: relative;
  border-bottom: 1px solid rgba(59, 35, 20, 0.07);
}

.pack-features li::before {
  content: '◆';
  position: absolute;
  left: 4px;
  top: 9px;
  color: var(--accent, #c9a84c);
  font-size: 0.75rem;
}

.pack-features li strong {
  color: var(--walnut, #3b2314);
}

/* ---------- Prix et CTA ---------- */

.pack-price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;
}

.pack-price-amount {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--walnut, #3b2314);
  line-height: 1;
}

.pack-price-note {
  font-family: Montserrat, sans-serif;
  font-size: 0.82rem;
  color: var(--accent-dark, #a6872e);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.pack-cta {
  display: inline-block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 20px;
  padding: 17px 32px;
  background: var(--walnut, #3b2314);
  color: #f0d9b5;
  font-family: Montserrat, sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-align: center;
  text-decoration: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.pack-cta:hover:not(:disabled) {
  background: #291709;
  transform: translateY(-2px);
}

.pack-cta:disabled {
  opacity: 0.6;
  cursor: progress;
  transform: none;
}

.pack-cta-error {
  display: none;
  margin-top: 12px;
  padding: 12px 14px;
  background: #fdf0f0;
  border-left: 3px solid var(--error, #8b3a3a);
  font-family: Lora, Georgia, serif;
  font-size: 0.9rem;
  color: #7a2f2f;
  border-radius: 3px;
}

.pack-cta-error.is-visible {
  display: block;
}

.pack-honesty {
  margin-top: 20px;
  padding: 14px 16px;
  background: rgba(201, 168, 76, 0.1);
  border-left: 3px solid var(--accent, #c9a84c);
  font-family: Lora, Georgia, serif;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #4a3b28;
  border-radius: 3px;
}

.pack-service {
  margin-top: 16px;
  font-family: Montserrat, sans-serif;
  font-size: 0.8rem;
  color: #6b6b6b;
  line-height: 1.7;
}

.pack-service a {
  color: var(--accent-dark, #a6872e);
  text-decoration: none;
}

.pack-service a:hover {
  text-decoration: underline;
}

/* ---------- FAQ du pack ---------- */

.pack-faq {
  max-width: 820px;
  margin: 64px auto 0;
}

.pack-faq h3 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  color: var(--walnut, #3b2314);
  text-align: center;
  margin: 0 0 28px;
}

.pack-faq details {
  border-bottom: 1px solid rgba(59, 35, 20, 0.12);
  background: transparent;
}

.pack-faq summary {
  font-family: Montserrat, sans-serif;
  font-size: 0.97rem;
  font-weight: 500;
  color: var(--walnut, #3b2314);
  padding: 18px 34px 18px 2px;
  cursor: pointer;
  position: relative;
  list-style: none;
}

.pack-faq summary::-webkit-details-marker {
  display: none;
}

.pack-faq summary::after {
  content: '+';
  position: absolute;
  right: 6px;
  top: 15px;
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--accent, #c9a84c);
  transition: transform 0.2s ease;
}

.pack-faq details[open] summary::after {
  content: '−';
}

.pack-faq summary:focus-visible {
  outline: 2px solid var(--accent, #c9a84c);
  outline-offset: 2px;
}

.pack-faq .pack-faq-answer {
  padding: 0 34px 20px 2px;
  font-family: Lora, Georgia, serif;
  font-size: 0.95rem;
  line-height: 1.75;
  color: #3f3f3f;
}

.pack-faq .pack-faq-answer p {
  margin: 0 0 12px;
}

.pack-faq .pack-faq-answer p:last-child {
  margin-bottom: 0;
}

/* ---------- Responsive ---------- */

@media (max-width: 900px) {
  .pack-wrap {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .pack-livres {
    padding: 56px 18px;
  }

  .pack-thumbs img {
    height: 84px;
  }
}

@media (max-width: 420px) {
  .pack-price-amount {
    font-size: 2.1rem;
  }

  .pack-thumbs {
    gap: 8px;
  }

  .pack-thumbs img {
    height: 68px;
  }
}

/* Respecte le réglage système : pas d'animation vidéo imposée */
@media (prefers-reduced-motion: reduce) {
  .pack-hero-media.is-video-ready img {
    display: block;
  }

  .pack-hero-media.is-video-ready video {
    display: none;
  }

  .pack-cta {
    transition: none;
  }
}

/* ==========================================================
   PAGES ANNEXES — cgv.html, commande-confirmee.html
   ========================================================== */

.pack-page {
  max-width: 780px;
  margin: 110px auto 70px;
  padding: 0 20px;
  font-family: Lora, Georgia, serif;
  color: #2a2a2a;
  line-height: 1.75;
}

.pack-page h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.1rem;
  color: var(--walnut, #3b2314);
  margin: 0 0 0.3em;
}

.pack-page .pack-page-sub {
  font-family: Montserrat, sans-serif;
  color: var(--accent-dark, #a6872e);
  font-size: 0.8rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 2.4em;
}

.pack-page h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  color: var(--walnut, #3b2314);
  margin: 2em 0 0.6em;
}

.pack-page ul {
  padding-left: 22px;
}

.pack-page li {
  margin-bottom: 8px;
}

.pack-page a {
  color: var(--accent-dark, #a6872e);
}

.pack-confirm {
  text-align: center;
}

.pack-confirm-mark {
  font-size: 3.2rem;
  line-height: 1;
  margin-bottom: 18px;
}

.pack-confirm-box {
  margin: 32px auto 0;
  padding: 24px 26px;
  background: var(--beige-warm, #f5efe6);
  border-radius: 5px;
  text-align: left;
  font-size: 0.95rem;
}

.pack-confirm-box h2 {
  margin-top: 0;
  font-size: 1.1rem;
}
```

- [ ] **Step 2: Vérifier que le CSS est valide**

Run: `npx --yes csslint@1.0.5 pack-livres.css 2>&1 | tail -20`

Expected : aucune erreur bloquante (`Error`). Des avertissements (`Warning`) sur les préfixes ou l'ordre des propriétés sont acceptables et ne doivent pas être corrigés.

Si `csslint` n'est pas disponible hors ligne, ouvrir `pack-livres.css` dans le navigateur via une page de test suffit — l'important est qu'aucune accolade ne soit déséquilibrée.

- [ ] **Step 3: Commit**

```bash
git add pack-livres.css
git commit -m "feat(pack): feuille de style dediee a la section pack livres"
```

---

## Task 3 : Section `#pack-livres` dans `index.html`

**Files:**
- Modify: `index.html` (insertion après la fermeture de `.home-vol2-bonus`, ligne ~811)
- Modify: `index.html` (ajout du `<link>` vers `pack-livres.css` dans le `<head>`, après la ligne 48)

Le CTA est **volontairement inactif à cette étape** (attribut `disabled`). Il sera câblé en Task 11, une fois le Worker déployé et testé. Cela permet de valider le rendu visuel sans risquer qu'un visiteur clique sur un bouton mort.

- [ ] **Step 1: Ajouter la feuille de style dans le `<head>`**

Repérer dans `index.html` la ligne :

```html
  <link rel="stylesheet" href="style.min.css">
```

Ajouter **juste après** :

```html
  <link rel="stylesheet" href="pack-livres.css">
```

- [ ] **Step 2: Insérer la section**

Repérer la fin de la section `home-vol2-bonus` dans `index.html` — c'est la séquence :

```html
            <div class="v2-mini">Cours d'essai d'1h &middot; offert &middot; à Paris, Versailles ou en visio</div>
          </div>
        </div>
      </section>
```

Insérer **juste après** ce `</section>`, avant le commentaire `<!-- Avantages des échecs -->` :

```html
      <!-- Pack des 2 volumes reliés à la main -->
      <section class="pack-livres" id="pack-livres" aria-labelledby="pack-title">
        <div class="pack-wrap">

          <div class="pack-visuals">
            <div class="pack-hero-media" id="pack-hero-media">
              <img src="images/reliure/pack-principal.webp"
                   alt="Les deux volumes reliés à la main d'Apprendre les Échecs, posés sur un échiquier en bois"
                   width="1080" height="810" loading="lazy" decoding="async">
              <video muted loop playsinline preload="none"
                     poster="images/reliure/pack-principal.webp"
                     aria-label="Vidéo de présentation des deux volumes reliés">
                <source src="images/reliure/pack-video.mp4" type="video/mp4">
              </video>
            </div>
            <div class="pack-thumbs">
              <img src="images/reliure/pack-tranche.webp"
                   alt="Les deux volumes debout, tranche cousue visible"
                   width="1080" height="810" loading="lazy" decoding="async">
              <img src="images/reliure/pack-rouge.webp"
                   alt="Gros plan sur la couverture rouge du Volume I"
                   width="810" height="1080" loading="lazy" decoding="async">
              <img src="images/reliure/pack-plongee.webp"
                   alt="Vue en plongée des deux volumes sur l'échiquier"
                   width="810" height="1080" loading="lazy" decoding="async">
            </div>
          </div>

          <div class="pack-content">
            <div class="pack-eyebrow">L'édition reliée à la main</div>
            <h2 id="pack-title">Apprendre les Échecs<br>Volumes&nbsp;I &amp; II</h2>

            <p class="pack-pitch">
              Deux volumes cousus main par une relieuse professionnelle, imprimés sur papier ivoire.
              Chaque exemplaire est numéroté et signé à la main. Ce n'est pas un livre de plus dans
              une étagère&nbsp;: c'est un objet qu'on offre, et qu'on garde.
            </p>

            <ul class="pack-features">
              <li><strong>Reliure cousue main</strong> par une relieuse professionnelle</li>
              <li><strong>Papier ivoire</strong>, impression couleur, couvertures rigides</li>
              <li><strong>Exemplaire numéroté et signé</strong> — série limitée à 50</li>
              <li><strong>Les deux volumes</strong>&nbsp;: les bases, puis le répertoire et les finales</li>
            </ul>

            <div class="pack-price">
              <span class="pack-price-amount">64,99&nbsp;€</span>
              <span class="pack-price-note">Livraison comprise</span>
            </div>

            <button type="button" class="pack-cta" id="pack-cta" disabled>
              Commander les 2 volumes
            </button>
            <div class="pack-cta-error" id="pack-cta-error" role="alert"></div>

            <div class="pack-honesty">
              <strong>Soyons clairs&nbsp;:</strong> le contenu reste disponible gratuitement en PDF
              sur ce site. Ici, tu n'achètes pas de l'information — tu achètes un objet fabriqué à la main.
            </div>

            <div class="pack-service">
              Une question&nbsp;? <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a>
              &nbsp;·&nbsp; <a href="tel:+33609365691">06&nbsp;09&nbsp;36&nbsp;56&nbsp;91</a><br>
              Livraison en France sous 5 à 10 jours ouvrés &nbsp;·&nbsp;
              <a href="cgv.html">Conditions générales de vente</a>
            </div>
          </div>

        </div>
      </section>
```

- [ ] **Step 3: Vérifier le rendu**

Run: `python -m http.server 8000` (depuis la racine du projet), puis ouvrir `http://localhost:8000/#pack-livres`

Expected :
- La section apparaît entre « Volume 2 offert » et « Pourquoi suivre des cours d'échecs ? »
- Deux colonnes sur desktop, une seule en dessous de 900 px
- Les 4 photos s'affichent (aucune image cassée)
- Le bouton « Commander les 2 volumes » est grisé et non cliquable — c'est normal à ce stade

Si une image est cassée, vérifier que la Task 1 a bien été exécutée.

- [ ] **Step 4: Vérifier le responsive**

Dans les DevTools du navigateur, tester les largeurs 360 px, 768 px, 1024 px et 1440 px.

Expected : aucun débordement horizontal, le prix reste lisible, les vignettes ne s'écrasent pas.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(pack): section pack-livres sur la landing (CTA inactif)"
```

---

## Task 4 : FAQ du pack et balisage JSON-LD

**Files:**
- Modify: `index.html` (ajout du bloc FAQ à la fin de la section `#pack-livres`)
- Modify: `index.html` (ajout d'un bloc `<script type="application/ld+json">` avant `</head>`)

Le site a déjà un `FAQPage` JSON-LD (ligne ~121) pour les cours. Google n'accepte **qu'un seul** `FAQPage` par page — ajouter un second bloc `FAQPage` ferait ignorer les deux. On étend donc le tableau `mainEntity` du bloc existant plutôt que d'en créer un nouveau.

- [ ] **Step 1: Ajouter le bloc FAQ dans le HTML**

Dans la section `#pack-livres` créée en Task 3, insérer **juste avant** la fermeture `</section>` (donc après `</div>` de `.pack-wrap`) :

```html
        <div class="pack-faq">
          <h3>Questions sur l'édition reliée</h3>

          <details>
            <summary>Le guide n'est pas gratuit&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Si — et il le reste. Le Volume 1 est téléchargeable gratuitement en PDF sur ce site, et le Volume 2 est offert après un premier cours d'essai.</p>
              <p>Ce que tu achètes ici, ce n'est pas le contenu&nbsp;: c'est l'objet. Deux livres cousus main, sur papier ivoire, numérotés et signés. Si tu veux seulement apprendre les échecs, prends le PDF, il est fait pour ça.</p>
            </div>
          </details>

          <details>
            <summary>Qu'est-ce qui est relié à la main exactement&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Les cahiers sont cousus à la main, un à un, par une relieuse professionnelle — pas collés en dos carré comme un livre industriel. Les couvertures sont rigides, habillées de toile.</p>
              <p>Conséquence concrète&nbsp;: le livre s'ouvre à plat sans se casser, et il tient des décennies. C'est aussi pour ça que la production est lente.</p>
            </div>
          </details>

          <details>
            <summary>Les exemplaires sont-ils numérotés&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Oui. Chaque exemplaire porte un numéro manuscrit sur la page de garde, sous la forme «&nbsp;n°&nbsp;7&nbsp;/&nbsp;50&nbsp;», accompagné de ma signature.</p>
              <p>La première série est limitée à 50 exemplaires. Au-delà, j'ouvrirai une seconde série, numérotée séparément.</p>
            </div>
          </details>

          <details>
            <summary>Combien de temps pour le recevoir&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Entre 5 et 10 jours ouvrés après ta commande. L'envoi se fait en Colissimo suivi, et tu reçois un email de confirmation dès le paiement validé.</p>
            </div>
          </details>

          <details>
            <summary>Livrez-vous en dehors de la France&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Pas pour le moment. La livraison est limitée à la France métropolitaine — c'est la seule zone où je peux garantir le délai et l'état du colis à l'arrivée.</p>
              <p>Si tu es à l'étranger et que ça t'intéresse vraiment, écris-moi à <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a>, on trouvera une solution au cas par cas.</p>
            </div>
          </details>

          <details>
            <summary>Puis-je l'offrir&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>C'est même l'usage principal. Le colis est emballé en papier kraft, sans aucun prix visible sur l'emballage ni dans le paquet.</p>
              <p>Si tu veux une dédicace au nom de la personne, précise-le par email après ta commande&nbsp;: j'écris à la main, donc c'est faisable tant que le colis n'est pas parti.</p>
            </div>
          </details>

          <details>
            <summary>Et si je veux seulement le contenu&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Prends le PDF gratuit, sans hésiter. Le contenu est strictement identique&nbsp;: mêmes chapitres, mêmes exercices, mêmes diagrammes.</p>
              <p>Le livre relié n'apporte rien de plus sur le plan pédagogique. Il apporte autre chose.</p>
            </div>
          </details>

          <details>
            <summary>Comment se passe le paiement&nbsp;? Puis-je être remboursé&nbsp;?</summary>
            <div class="pack-faq-answer">
              <p>Le paiement se fait par carte bancaire sur une page sécurisée Stripe. Je n'ai jamais accès à tes coordonnées bancaires.</p>
              <p>Tu disposes d'un <strong>droit de rétractation de 14 jours</strong> à compter de la réception. Pour l'exercer, écris à <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a>&nbsp;: je te communique l'adresse postale de retour sous 48&nbsp;heures ouvrées, et je te rembourse dès réception du colis en bon état.</p>
              <p>Le détail figure dans les <a href="cgv.html">conditions générales de vente</a>.</p>
            </div>
          </details>

          <div class="pack-service" style="text-align:center; margin-top:26px;">
            Une autre question&nbsp;? <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a>
            &nbsp;·&nbsp; <a href="tel:+33609365691">06&nbsp;09&nbsp;36&nbsp;56&nbsp;91</a>
          </div>
        </div>
```

- [ ] **Step 2: Étendre le JSON-LD FAQPage existant**

Ouvrir `index.html` et repérer le bloc commençant ligne ~120 :

```html
  <!-- FAQPage Schema - Rich Snippets Google -->
  <script type="application/ld+json">
```

Dans ce bloc, le tableau `"mainEntity": [ ... ]` contient les questions sur les cours. Ajouter les 4 entrées suivantes **à la fin du tableau** (après la dernière accolade fermante d'une question, en ajoutant une virgule à celle-ci) :

```json
    {
      "@type": "Question",
      "name": "Le guide des échecs n'est-il pas gratuit ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Si. Le Volume 1 est téléchargeable gratuitement en PDF sur cours-echecs-paris.fr, et le Volume 2 est offert après un premier cours d'essai. L'édition reliée à la main vendue 64,99 € n'est pas le contenu mais l'objet : deux volumes cousus main par une relieuse professionnelle, sur papier ivoire, numérotés et signés."
      }
    },
    {
      "@type": "Question",
      "name": "Qu'est-ce qu'un livre relié à la main ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Les cahiers sont cousus à la main un à un par une relieuse professionnelle, et non collés en dos carré comme un livre industriel. Les couvertures sont rigides et habillées de toile. Le livre s'ouvre à plat sans se casser et tient des décennies."
      }
    },
    {
      "@type": "Question",
      "name": "Combien de temps pour recevoir les livres reliés ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Entre 5 et 10 jours ouvrés après la commande, en Colissimo suivi. La livraison est limitée à la France métropolitaine et les frais de port sont compris dans le prix de 64,99 €."
      }
    },
    {
      "@type": "Question",
      "name": "Puis-je être remboursé après l'achat des livres reliés ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Oui. Un droit de rétractation de 14 jours à compter de la réception s'applique. Il suffit d'écrire à nicolas.musicki@gmail.com : l'adresse postale de retour est communiquée sous 48 heures ouvrées, et le remboursement est effectué dès réception du colis en bon état."
      }
    }
```

- [ ] **Step 3: Vérifier que le JSON-LD est valide**

Run:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const blocks=[...html.matchAll(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g)];
let faq=0;
blocks.forEach((m,i)=>{
  let o;
  try { o=JSON.parse(m[1]); } catch(e) { console.error('BLOC '+i+' INVALIDE : '+e.message); process.exit(1); }
  if (o['@type']==='FAQPage') { faq++; console.log('FAQPage : '+o.mainEntity.length+' questions'); }
});
if (faq!==1) { console.error('ERREUR : '+faq+' blocs FAQPage (il en faut exactement 1)'); process.exit(1); }
console.log('OK — '+blocks.length+' blocs JSON-LD tous valides');
"
```

Expected :
```
FAQPage : 10 questions
OK — 5 blocs JSON-LD tous valides
```

Si le compte de questions n'est pas 10 (6 existantes + 4 ajoutées), une entrée a été mal insérée. Si le script signale un bloc invalide, c'est une virgule manquante ou en trop.

- [ ] **Step 4: Vérifier le rendu de la FAQ**

Rouvrir `http://localhost:8000/#pack-livres`.

Expected :
- 8 questions repliées, avec un `+` à droite
- Un clic ouvre la réponse et le `+` devient `−`
- La navigation au clavier (Tab puis Entrée) ouvre et ferme les questions
- Le focus clavier est visible (contour doré)

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(pack): FAQ du pack relie + extension du JSON-LD FAQPage"
```

---

## Task 5 : Page `cgv.html`

**Files:**
- Create: `cgv.html`

Obligatoire pour la vente d'un bien physique en France. La structure du `<head>`, du header et du footer est reprise de `mentions-legales.html` pour rester cohérente.

- [ ] **Step 1: Récupérer le header et le footer de référence**

Run:

```bash
grep -n "<body\|</body>\|<header\|</header>\|<footer\|</footer>" mentions-legales.html
```

Noter les numéros de ligne du `<header>…</header>` et du `<footer>…</footer>`. Ces deux blocs seront copiés tels quels dans `cgv.html` aux emplacements indiqués ci-dessous par `<!-- HEADER COPIÉ -->` et `<!-- FOOTER COPIÉ -->`.

- [ ] **Step 2: Créer le fichier**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <script src="cookies.js" defer></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Conditions générales de vente de l'édition reliée à la main d'Apprendre les Échecs, Volumes I et II — cours-echecs-paris.fr.">
  <meta name="author" content="Nicolas Musicki">
  <meta name="robots" content="index,follow">
  <title>Conditions générales de vente | Cours d'Échecs Paris — Nicolas Musicki</title>

  <link rel="canonical" href="https://www.cours-echecs-paris.fr/cgv.html">

  <link rel="icon" type="image/x-icon" href="https://www.cours-echecs-paris.fr/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="https://www.cours-echecs-paris.fr/favicon-32x32.png">
  <link rel="apple-touch-icon" href="https://www.cours-echecs-paris.fr/apple-touch-icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@400;500;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <link rel="stylesheet" href="style.min.css">
  <link rel="stylesheet" href="pack-livres.css">
</head>
<body>

  <!-- HEADER COPIÉ depuis mentions-legales.html -->

  <main class="pack-page">
    <h1>Conditions générales de vente</h1>
    <div class="pack-page-sub">Édition reliée — Apprendre les Échecs, Volumes I &amp; II</div>

    <p><em>Dernière mise à jour&nbsp;: 19 août 2026.</em></p>

    <h2>1. Identité du vendeur</h2>
    <p>
      Nicolas Musicki, entrepreneur individuel.<br>
      SIRET&nbsp;: 945 080 547 00017<br>
      Email&nbsp;: <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a><br>
      Téléphone&nbsp;: <a href="tel:+33609365691">06 09 36 56 91</a><br>
      Site&nbsp;: <a href="https://www.cours-echecs-paris.fr">www.cours-echecs-paris.fr</a>
    </p>
    <p>
      TVA non applicable, article 293 B du Code général des impôts.
    </p>

    <h2>2. Objet</h2>
    <p>
      Les présentes conditions régissent la vente, par Nicolas Musicki à tout acheteur
      particulier, de l'édition reliée à la main de l'ouvrage <em>Apprendre les Échecs</em>,
      Volumes I et II. Toute commande passée sur le site emporte acceptation sans réserve
      des présentes conditions.
    </p>

    <h2>3. Produit</h2>
    <p>
      Le produit vendu est un lot indissociable de deux volumes reliés à la main&nbsp;:
    </p>
    <ul>
      <li>reliure cousue main, réalisée par une relieuse professionnelle&nbsp;;</li>
      <li>impression couleur sur papier ivoire, couvertures rigides toilées&nbsp;;</li>
      <li>exemplaire numéroté et signé à la main sur la page de garde, série limitée
        à 50 exemplaires pour la première série&nbsp;;</li>
      <li>environ 96 pages par volume.</li>
    </ul>
    <p>
      Les volumes ne sont pas vendus séparément. S'agissant d'un produit fabriqué
      artisanalement, de légères variations de teinte, de grain ou de finition peuvent
      exister d'un exemplaire à l'autre&nbsp;: elles constituent une caractéristique du
      produit et non un défaut.
    </p>
    <p>
      Le contenu de l'ouvrage est par ailleurs disponible gratuitement au format PDF sur
      le site. L'achat porte sur l'objet imprimé et relié, non sur un contenu exclusif.
    </p>

    <h2>4. Prix</h2>
    <p>
      Le prix est de <strong>64,99&nbsp;€ TTC, frais de livraison compris</strong>. Aucun
      frais supplémentaire n'est ajouté au moment du paiement. Le prix applicable est
      celui affiché sur le site au moment de la validation de la commande.
    </p>

    <h2>5. Commande et paiement</h2>
    <p>
      La commande s'effectue en ligne. Le paiement est traité par
      <strong>Stripe Payments Europe, Ltd.</strong>, prestataire agréé. Les coordonnées
      bancaires de l'acheteur sont saisies directement sur les serveurs sécurisés de Stripe
      et ne transitent jamais par le site&nbsp;; le vendeur n'y a à aucun moment accès.
    </p>
    <p>
      La vente est réputée conclue à la réception du paiement. Un email de confirmation
      récapitulant la commande est envoyé à l'acheteur.
    </p>

    <h2>6. Livraison</h2>
    <p>
      La livraison est effectuée <strong>en France métropolitaine uniquement</strong>, par
      Colissimo suivi, à l'adresse renseignée par l'acheteur lors de la commande.
    </p>
    <p>
      Le délai est de <strong>5 à 10 jours ouvrés</strong> à compter de la validation du
      paiement. En cas de retard exceptionnel, l'acheteur en est informé par email.
    </p>
    <p>
      L'acheteur est responsable de l'exactitude de l'adresse qu'il communique. Un colis
      retourné en raison d'une adresse erronée pourra être réexpédié à ses frais.
    </p>

    <h2>7. Droit de rétractation</h2>
    <p>
      Conformément aux articles L221-18 et suivants du Code de la consommation, l'acheteur
      dispose d'un délai de <strong>quatorze (14) jours</strong> à compter de la réception
      du colis pour exercer son droit de rétractation, sans avoir à motiver sa décision ni
      à supporter de pénalité.
    </p>
    <p>
      Pour l'exercer, l'acheteur adresse une demande à
      <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a>.
      <strong>L'adresse postale de retour lui est communiquée par email en réponse, sous
      48 heures ouvrées.</strong> Le délai de rétractation n'est en aucun cas réduit par ce
      temps de réponse.
    </p>
    <p>
      Les frais de retour sont à la charge de l'acheteur. Les produits doivent être
      retournés dans leur état d'origine, complets et correctement protégés.
    </p>
    <p>
      Le remboursement de l'intégralité des sommes versées, frais de livraison inclus, est
      effectué dans un délai maximal de 14 jours à compter de la réception du colis
      retourné, par le même moyen de paiement que celui utilisé lors de la commande.
    </p>

    <h2>8. Garanties légales</h2>
    <p>
      Indépendamment de toute garantie commerciale, le vendeur reste tenu de la garantie
      légale de conformité (articles L217-4 et suivants du Code de la consommation) et de
      la garantie contre les vices cachés (articles 1641 et suivants du Code civil).
    </p>
    <p>
      En cas de produit endommagé pendant le transport, l'acheteur est invité à le signaler
      par email dans les meilleurs délais, photos à l'appui. Un exemplaire de remplacement
      est alors expédié sans frais.
    </p>

    <h2>9. Service client</h2>
    <p>
      Pour toute question relative à une commande&nbsp;:<br>
      Email&nbsp;: <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a><br>
      Téléphone&nbsp;: <a href="tel:+33609365691">06 09 36 56 91</a>
    </p>

    <h2>10. Données personnelles</h2>
    <p>
      Les données collectées lors d'une commande (nom, adresse postale, email, téléphone)
      ont pour unique finalité le traitement et l'expédition de celle-ci, ainsi que le
      respect des obligations comptables. Elles ne sont ni vendues ni cédées à des tiers,
      hormis le transporteur et le prestataire de paiement, pour les seuls besoins de
      l'exécution de la commande.
    </p>
    <p>
      Conformément au RGPD, l'acheteur dispose d'un droit d'accès, de rectification,
      d'effacement et de portabilité de ses données, exerçable à
      <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a>.
      Voir également les <a href="mentions-legales.html">mentions légales</a>.
    </p>

    <h2>11. Médiation de la consommation</h2>
    <p>
      Conformément à l'article L612-1 du Code de la consommation, l'acheteur peut recourir
      gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un
      litige, après avoir tenté au préalable de le résoudre directement auprès du vendeur.
    </p>
    <p>
      La plateforme européenne de règlement en ligne des litiges est accessible à l'adresse
      <a href="https://ec.europa.eu/consumers/odr" rel="nofollow noopener" target="_blank">ec.europa.eu/consumers/odr</a>.
    </p>

    <h2>12. Droit applicable</h2>
    <p>
      Les présentes conditions sont soumises au droit français. En cas de litige, et à
      défaut de résolution amiable, les tribunaux français sont seuls compétents.
    </p>
  </main>

  <!-- FOOTER COPIÉ depuis mentions-legales.html -->

</body>
</html>
```

- [ ] **Step 3: Copier le header et le footer**

Remplacer les deux commentaires `<!-- HEADER COPIÉ … -->` et `<!-- FOOTER COPIÉ … -->` par les blocs `<header>…</header>` et `<footer>…</footer>` de `mentions-legales.html`, repérés au Step 1, **sans les modifier**.

- [ ] **Step 4: Vérifier le rendu**

Ouvrir `http://localhost:8000/cgv.html`.

Expected :
- Le header et le footer sont identiques à ceux de `mentions-legales.html`
- Les 12 sections s'affichent, typographie cohérente avec le reste du site
- Le menu mobile fonctionne (le JS du header est chargé)

- [ ] **Step 5: Commit**

```bash
git add cgv.html
git commit -m "feat(pack): conditions generales de vente"
```

---

## Task 6 : Page `commande-confirmee.html`

**Files:**
- Create: `commande-confirmee.html`

Page atteignable par URL directe, donc **aucune donnée de commande n'y est affichée** — le récapitulatif passe exclusivement par l'email. `noindex` pour ne pas polluer l'index Google.

- [ ] **Step 1: Créer le fichier**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <script src="cookies.js" defer></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Confirmation de commande — édition reliée d'Apprendre les Échecs.">
  <meta name="robots" content="noindex,nofollow">
  <title>Commande confirmée | Cours d'Échecs Paris — Nicolas Musicki</title>

  <link rel="icon" type="image/x-icon" href="https://www.cours-echecs-paris.fr/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="https://www.cours-echecs-paris.fr/favicon-32x32.png">
  <link rel="apple-touch-icon" href="https://www.cours-echecs-paris.fr/apple-touch-icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@400;500;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <link rel="stylesheet" href="style.min.css">
  <link rel="stylesheet" href="pack-livres.css">
</head>
<body>

  <!-- HEADER COPIÉ depuis mentions-legales.html -->

  <main class="pack-page pack-confirm">
    <div class="pack-confirm-mark">♞</div>
    <h1>Merci, ta commande est confirmée</h1>
    <div class="pack-page-sub">Apprendre les Échecs — Volumes I &amp; II</div>

    <p>
      Ton paiement a bien été reçu. Un email de confirmation vient de t'être envoyé, avec
      le récapitulatif de ta commande et l'adresse de livraison que tu as renseignée.
    </p>
    <p>
      S'il n'arrive pas d'ici quelques minutes, pense à regarder dans tes spams — et dans
      l'onglet «&nbsp;Promotions&nbsp;» si tu es sur Gmail.
    </p>

    <div class="pack-confirm-box">
      <h2>Et maintenant&nbsp;?</h2>
      <p>
        Je prépare ton exemplaire, je le numérote et je le signe à la main, puis je
        l'expédie en Colissimo suivi. Compte <strong>5 à 10 jours ouvrés</strong> avant de
        le recevoir.
      </p>
      <p style="margin-bottom:0;">
        Une question, une dédicace à ajouter, une adresse à corriger&nbsp;? Écris-moi à
        <a href="mailto:nicolas.musicki@gmail.com">nicolas.musicki@gmail.com</a> ou
        appelle-moi au <a href="tel:+33609365691">06&nbsp;09&nbsp;36&nbsp;56&nbsp;91</a>.
        Tant que le colis n'est pas parti, tout est modifiable.
      </p>
    </div>

    <p style="margin-top:36px;">
      <a href="/" class="pack-cta" style="width:auto; padding:14px 30px;">Retour à l'accueil</a>
    </p>
  </main>

  <!-- FOOTER COPIÉ depuis mentions-legales.html -->

</body>
</html>
```

- [ ] **Step 2: Copier le header et le footer**

Comme en Task 5, remplacer les deux commentaires par les blocs `<header>` et `<footer>` de `mentions-legales.html`.

- [ ] **Step 3: Vérifier le rendu**

Ouvrir `http://localhost:8000/commande-confirmee.html`.

Expected : page centrée, cavalier `♞` en haut, encadré beige « Et maintenant ? », bouton de retour à l'accueil fonctionnel.

- [ ] **Step 4: Commit**

```bash
git add commande-confirmee.html
git commit -m "feat(pack): page de confirmation de commande"
```

---

## Task 7 : Module `api/order.js` — logique pure et tests

**Files:**
- Create: `api/order.js`
- Create: `api/test/order.test.js`

Ce module ne contient **aucun I/O** : pas de `fetch`, pas de KV. C'est ce qui le rend testable avec `node --test` sans mock ni réseau.

Point d'attention traité ici : depuis la version d'API Stripe 2025-03-31, l'adresse de livraison a migré de `session.shipping_details` vers `session.collected_information.shipping_details`. `buildOrderRecord` lit les deux, avec repli sur `customer_details.address`.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

Créer `api/test/order.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACK_PRODUCT_ID,
  PACK_AMOUNT_CENTS,
  buildOrderRecord,
  formatAddressLines,
  formatAmount,
  orderConfirmationHtml,
  orderConfirmationText,
  orderAdminHtml,
  ordersToCsv,
} from '../order.js';

// ---------- Constantes ----------

test('le prix du pack est de 64,99 € en centimes', () => {
  assert.equal(PACK_AMOUNT_CENTS, 6499);
});

test('formatAmount convertit les centimes en euros français', () => {
  assert.equal(formatAmount(6499), '64,99 €');
  assert.equal(formatAmount(0), '0,00 €');
  assert.equal(formatAmount(100), '1,00 €');
});

// ---------- buildOrderRecord ----------

const sessionModerne = {
  id: 'cs_test_abc123',
  payment_status: 'paid',
  amount_total: 6499,
  currency: 'eur',
  metadata: { product: PACK_PRODUCT_ID },
  customer_details: { email: 'Client@Exemple.FR ', phone: '+33612345678' },
  collected_information: {
    shipping_details: {
      name: 'Marie Dupont',
      address: {
        line1: '12 rue des Lilas',
        line2: 'Bât. B, 3e étage',
        postal_code: '75011',
        city: 'Paris',
        country: 'FR',
      },
    },
  },
};

test('buildOrderRecord lit collected_information.shipping_details (API récente)', () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  assert.equal(order.id, 'cs_test_abc123');
  assert.equal(order.email, 'client@exemple.fr');
  assert.equal(order.name, 'Marie Dupont');
  assert.equal(order.phone, '+33612345678');
  assert.equal(order.address.line1, '12 rue des Lilas');
  assert.equal(order.address.city, 'Paris');
  assert.equal(order.amount_total, 6499);
  assert.equal(order.status, 'a_expedier');
  assert.equal(order.product, PACK_PRODUCT_ID);
  assert.equal(order.date, '2026-08-19T18:00:00.000Z');
});

test('buildOrderRecord lit shipping_details à la racine (API ancienne)', () => {
  const session = {
    id: 'cs_test_old',
    payment_status: 'paid',
    amount_total: 6499,
    currency: 'eur',
    metadata: { product: PACK_PRODUCT_ID },
    customer_details: { email: 'vieux@exemple.fr' },
    shipping_details: {
      name: 'Jean Martin',
      address: { line1: '5 avenue Foch', postal_code: '78000', city: 'Versailles', country: 'FR' },
    },
  };
  const order = buildOrderRecord(session, '2026-08-19T18:00:00.000Z');
  assert.equal(order.name, 'Jean Martin');
  assert.equal(order.address.city, 'Versailles');
});

test('buildOrderRecord se replie sur customer_details.address si aucune livraison', () => {
  const session = {
    id: 'cs_test_fallback',
    payment_status: 'paid',
    amount_total: 6499,
    currency: 'eur',
    metadata: { product: PACK_PRODUCT_ID },
    customer_details: {
      email: 'repli@exemple.fr',
      name: 'Paul Repli',
      address: { line1: '1 place Vendôme', postal_code: '75001', city: 'Paris', country: 'FR' },
    },
  };
  const order = buildOrderRecord(session, '2026-08-19T18:00:00.000Z');
  assert.equal(order.name, 'Paul Repli');
  assert.equal(order.address.line1, '1 place Vendôme');
});

test('buildOrderRecord ne plante pas sur une session vide', () => {
  const order = buildOrderRecord({}, '2026-08-19T18:00:00.000Z');
  assert.equal(order.email, '');
  assert.equal(order.name, '');
  assert.equal(order.address.line1, '');
  assert.equal(order.address.country, 'FR');
});

// ---------- formatAddressLines ----------

test('formatAddressLines produit une étiquette postale prête à copier', () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  assert.deepEqual(formatAddressLines(order), [
    'Marie Dupont',
    '12 rue des Lilas',
    'Bât. B, 3e étage',
    '75011 Paris',
    'FRANCE',
  ]);
});

test('formatAddressLines omet les lignes vides', () => {
  const order = buildOrderRecord(
    {
      id: 'cs_x',
      customer_details: { email: 'a@b.fr' },
      shipping_details: {
        name: 'Sans Complement',
        address: { line1: '2 rue Courte', postal_code: '69001', city: 'Lyon', country: 'FR' },
      },
    },
    '2026-08-19T18:00:00.000Z'
  );
  assert.deepEqual(formatAddressLines(order), [
    'Sans Complement',
    '2 rue Courte',
    '69001 Lyon',
    'FRANCE',
  ]);
});

// ---------- Emails ----------

test("l'email client contient le montant, l'adresse et le délai", () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const html = orderConfirmationHtml(order);
  assert.match(html, /64,99&nbsp;€|64,99 €/);
  assert.match(html, /12 rue des Lilas/);
  assert.match(html, /5 à 10 jours ouvrés/);
  assert.match(html, /nicolas\.musicki@gmail\.com/);
  assert.match(html, /14 jours/);
  assert.match(html, /50/); // mention de la série limitée
});

test("l'email client échappe le HTML des champs saisis par le client", () => {
  const session = {
    ...sessionModerne,
    collected_information: {
      shipping_details: {
        name: '<script>alert(1)</script>',
        address: { line1: 'a', postal_code: '1', city: 'b', country: 'FR' },
      },
    },
  };
  const html = orderConfirmationHtml(buildOrderRecord(session, '2026-08-19T18:00:00.000Z'));
  assert.ok(!html.includes('<script>alert(1)</script>'), 'le script ne doit pas être injecté brut');
  assert.match(html, /&lt;script&gt;/);
});

test("la version texte de l'email client est non vide et sans balise", () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const txt = orderConfirmationText(order);
  assert.ok(txt.length > 200);
  assert.ok(!txt.includes('<'), 'la version texte ne doit contenir aucune balise');
  assert.match(txt, /64,99/);
});

test("l'email admin contient l'étiquette d'expédition et l'identifiant Stripe", () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const html = orderAdminHtml(order);
  assert.match(html, /Marie Dupont/);
  assert.match(html, /75011 Paris/);
  assert.match(html, /FRANCE/);
  assert.match(html, /cs_test_abc123/);
  assert.match(html, /64,99/);
});

// ---------- CSV ----------

test('ordersToCsv produit un en-tête et une ligne par commande', () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const csv = ordersToCsv([order]);
  const lignes = csv.trim().split('\n');
  assert.equal(lignes.length, 2);
  assert.match(lignes[0], /^date,id,email,nom,telephone,adresse1,adresse2,code_postal,ville,pays,montant_eur,statut$/);
  assert.match(lignes[1], /Marie Dupont/);
  assert.match(lignes[1], /64\.99/);
});

test('ordersToCsv neutralise les injections de formule et les guillemets', () => {
  const order = buildOrderRecord(
    {
      id: 'cs_inj',
      customer_details: { email: 'x@y.fr' },
      shipping_details: {
        name: '=SOMME(A1:A9)',
        address: { line1: 'rue du "Test"', postal_code: '1', city: 'V', country: 'FR' },
      },
    },
    '2026-08-19T18:00:00.000Z'
  );
  const csv = ordersToCsv([order]);
  assert.match(csv, /"'=SOMME\(A1:A9\)"/, 'la formule doit être préfixée par une apostrophe');
  assert.match(csv, /rue du ""Test""/, 'les guillemets doivent être doublés');
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `node --test api/test/order.test.js`

Expected: FAIL — `Cannot find module '.../api/order.js'`

- [ ] **Step 3: Écrire `api/order.js`**

```js
/**
 * Logique métier des commandes du pack de livres reliés.
 *
 * Ce module est VOLONTAIREMENT dépourvu d'I/O : aucun fetch, aucun accès KV,
 * aucune horloge. Toutes les entrées arrivent par paramètre. C'est ce qui le
 * rend testable avec `node --test` sans réseau ni mock.
 */

export const PACK_PRODUCT_ID = 'pack_livres_relies';
export const PACK_AMOUNT_CENTS = 6499;
export const PACK_NAME = 'Apprendre les Échecs — Volumes I & II (édition reliée à la main)';
export const SERIE_TOTAL = 50;
export const DELAI_LIVRAISON = '5 à 10 jours ouvrés';
export const SERVICE_EMAIL = 'nicolas.musicki@gmail.com';
export const SERVICE_TEL = '06 09 36 56 91';
export const SITE_URL = 'https://www.cours-echecs-paris.fr';

// ============================================================
// Utilitaires
// ============================================================

export function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** 6499 → "64,99 €" */
export function formatAmount(cents) {
  const n = Number(cents) || 0;
  return `${(n / 100).toFixed(2).replace('.', ',')} €`;
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// ============================================================
// Construction de l'enregistrement de commande
// ============================================================

/**
 * Transforme une Checkout Session Stripe en enregistrement de commande.
 *
 * L'adresse de livraison a changé d'emplacement selon la version d'API :
 *   - API >= 2025-03-31 : session.collected_information.shipping_details
 *   - API <  2025-03-31 : session.shipping_details
 * On lit les deux, puis on se replie sur customer_details (facturation).
 *
 * @param {object} session  la Checkout Session Stripe
 * @param {string} nowIso   date ISO injectée par l'appelant (pas d'horloge ici)
 */
export function buildOrderRecord(session, nowIso) {
  const s = session || {};
  const customer = s.customer_details || {};

  const shipping =
    s.collected_information?.shipping_details ||
    s.shipping_details ||
    {};

  const address = shipping.address || customer.address || {};

  return {
    id: str(s.id),
    date: nowIso,
    product: str(s.metadata?.product) || PACK_PRODUCT_ID,
    email: str(customer.email || s.customer_email).toLowerCase(),
    name: str(shipping.name || customer.name),
    phone: str(customer.phone || shipping.phone),
    address: {
      line1: str(address.line1),
      line2: str(address.line2),
      postal_code: str(address.postal_code),
      city: str(address.city),
      country: str(address.country) || 'FR',
    },
    amount_total: Number(s.amount_total) || 0,
    currency: str(s.currency) || 'eur',
    payment_status: str(s.payment_status),
    status: 'a_expedier',
  };
}

/** Étiquette postale, une entrée par ligne, lignes vides omises. */
export function formatAddressLines(order) {
  const a = order.address || {};
  const villeLigne = [a.postal_code, a.city].filter(Boolean).join(' ');
  const pays = a.country === 'FR' ? 'FRANCE' : a.country;
  return [order.name, a.line1, a.line2, villeLigne, pays].filter(Boolean);
}

// ============================================================
// Email client
// ============================================================

export function orderConfirmationHtml(order) {
  const lignes = formatAddressLines(order)
    .map((l) => escapeHtml(l))
    .join('<br>');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Commande confirmée</title></head>
<body style="margin:0; padding:0; background-color:#faf6ef; font-family: Georgia, 'Times New Roman', serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#faf6ef; padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(62,44,28,0.1);">
      <tr>
        <td style="background:linear-gradient(135deg,#F0D9B5 0%,#B58863 100%); padding:36px 40px; text-align:center;">
          <div style="font-family:Georgia,serif; font-size:12px; text-transform:uppercase; letter-spacing:3px; color:#3E2C1C; opacity:0.85; margin-bottom:6px;">Édition reliée à la main</div>
          <div style="font-family:Georgia,serif; font-size:25px; font-weight:700; color:#3E2C1C; line-height:1.2;">Ta commande est confirmée</div>
          <div style="font-family:Georgia,serif; font-style:italic; font-size:14px; color:#3E2C1C; opacity:0.8; margin-top:8px;">Apprendre les Échecs — Volumes I &amp; II</div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 20px; color:#3a3a3a; font-size:16px; line-height:1.65;">
          <p style="margin:0 0 20px; font-size:17px;">Bonjour,</p>
          <p style="margin:0 0 22px;">Merci beaucoup pour ta commande. Ton paiement a bien été reçu, et je m'occupe de la suite.</p>

          <div style="margin:0 0 22px; padding:20px 22px; background:#faf6ef; border-left:4px solid #8B5A2B; border-radius:6px;">
            <p style="margin:0 0 12px; font-weight:700; color:#3E2C1C; font-size:15px;">Récapitulatif</p>
            <p style="margin:0 0 6px; font-size:14.5px;">${escapeHtml(PACK_NAME)}</p>
            <p style="margin:0 0 12px; font-size:14.5px;"><strong>${formatAmount(order.amount_total)}</strong> — livraison comprise</p>
            <p style="margin:0 0 6px; font-weight:700; color:#3E2C1C; font-size:14.5px;">Adresse de livraison</p>
            <p style="margin:0; font-size:14.5px; line-height:1.55;">${lignes}</p>
          </div>

          <p style="margin:0 0 20px;">
            Je prépare ton exemplaire, je le <strong>numérote</strong> (série limitée à ${SERIE_TOTAL}) et je le
            <strong>signe à la main</strong>, puis je l'expédie en Colissimo suivi.
            Compte <strong>${DELAI_LIVRAISON}</strong> avant de le recevoir.
          </p>

          <p style="margin:0 0 20px;">
            Une adresse à corriger, une dédicace à ajouter&nbsp;? Réponds simplement à cet email&nbsp;:
            tant que le colis n'est pas parti, tout est modifiable.
          </p>

          <p style="margin:0 0 8px;">À très vite,</p>
          <p style="margin:0 0 4px; font-weight:700; color:#3E2C1C;">Nicolas Musicki</p>
          <p style="margin:0 0 24px; font-size:13px; color:#8B5A2B;">Professeur et entraîneur d'échecs — 2092 Elo FIDE</p>

          <p style="margin:26px 0 0; padding-top:18px; border-top:1px solid #e8e0cc; font-size:12.5px; color:#6a6a6a; line-height:1.6;">
            <strong style="color:#3E2C1C;">Service client</strong> —
            <a href="mailto:${SERVICE_EMAIL}" style="color:#8B5A2B;">${SERVICE_EMAIL}</a> ·
            ${SERVICE_TEL}<br>
            Tu disposes d'un droit de rétractation de <strong>14 jours</strong> à compter de la réception.
            Écris-moi pour l'exercer&nbsp;: je te communique l'adresse de retour sous 48&nbsp;heures ouvrées.
            Détails dans les <a href="${SITE_URL}/cgv.html" style="color:#8B5A2B;">conditions générales de vente</a>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#3E2C1C; padding:20px 40px; text-align:center; color:#F0D9B5; font-size:12px; letter-spacing:0.5px;">
          <a href="${SITE_URL}" style="color:#F0D9B5; text-decoration:none;">cours-echecs-paris.fr</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function orderConfirmationText(order) {
  const lignes = formatAddressLines(order).join('\n');
  return `Bonjour,

Merci beaucoup pour ta commande. Ton paiement a bien ete recu.

RECAPITULATIF
${PACK_NAME}
${formatAmount(order.amount_total)} - livraison comprise

ADRESSE DE LIVRAISON
${lignes}

Je prepare ton exemplaire, je le numerote (serie limitee a ${SERIE_TOTAL}) et je le signe
a la main, puis je l'expedie en Colissimo suivi. Compte ${DELAI_LIVRAISON} avant de le recevoir.

Une adresse a corriger, une dedicace a ajouter ? Reponds simplement a cet email :
tant que le colis n'est pas parti, tout est modifiable.

A tres vite,
Nicolas Musicki
Professeur et entraineur d'echecs - 2092 Elo FIDE

---
Service client : ${SERVICE_EMAIL} - ${SERVICE_TEL}
Droit de retractation de 14 jours a compter de la reception. Ecris-moi pour l'exercer :
l'adresse de retour t'est communiquee sous 48 heures ouvrees.
Conditions generales de vente : ${SITE_URL}/cgv.html`;
}

// ============================================================
// Email admin (Nicolas)
// ============================================================

export function orderAdminHtml(order) {
  const etiquette = formatAddressLines(order)
    .map((l) => escapeHtml(l))
    .join('<br>');

  return `<!DOCTYPE html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif; color:#222;">
  <div style="max-width:560px; margin:20px auto; padding:22px; border:1px solid #e5e5e5; border-radius:8px;">
    <h2 style="margin:0 0 16px; color:#3E2C1C;">🎉 Nouvelle commande — ${formatAmount(order.amount_total)}</h2>

    <div style="margin:0 0 18px; padding:16px 18px; background:#faf6ef; border-left:4px solid #8B5A2B; border-radius:6px;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:#8B5A2B; margin-bottom:8px;">Étiquette d'expédition</div>
      <div style="font-family:monospace; font-size:14px; line-height:1.7; color:#111;">${etiquette}</div>
    </div>

    <p style="margin:6px 0;"><strong>Email :</strong> <a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a></p>
    <p style="margin:6px 0;"><strong>Téléphone :</strong> ${escapeHtml(order.phone) || '—'}</p>
    <p style="margin:6px 0;"><strong>Produit :</strong> ${escapeHtml(order.product)}</p>
    <p style="margin:6px 0;"><strong>Montant :</strong> ${formatAmount(order.amount_total)}</p>
    <p style="margin:6px 0;"><strong>Date :</strong> ${escapeHtml(order.date)}</p>
    <p style="margin:6px 0; font-size:12px; color:#777;"><strong>Session Stripe :</strong> ${escapeHtml(order.id)}</p>

    <p style="margin:18px 0 0; padding-top:14px; border-top:1px solid #eee; font-size:13px; color:#555;">
      À faire : numéroter, signer, emballer en kraft (sans prix visible), expédier en Colissimo suivi.
    </p>
  </div>
</body></html>`;
}

// ============================================================
// Export CSV
// ============================================================

/**
 * Échappe un champ CSV.
 * Préfixe par une apostrophe les valeurs commençant par = + - @, qui seraient
 * sinon interprétées comme des formules par Excel et LibreOffice.
 */
function csvField(value) {
  let v = String(value ?? '');
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function ordersToCsv(orders) {
  const entete = 'date,id,email,nom,telephone,adresse1,adresse2,code_postal,ville,pays,montant_eur,statut';
  const lignes = orders.map((o) =>
    [
      o.date,
      o.id,
      o.email,
      o.name,
      o.phone,
      o.address?.line1,
      o.address?.line2,
      o.address?.postal_code,
      o.address?.city,
      o.address?.country,
      ((Number(o.amount_total) || 0) / 100).toFixed(2),
      o.status,
    ]
      .map(csvField)
      .join(',')
  );
  return [entete, ...lignes].join('\n') + '\n';
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `node --test api/test/order.test.js`

Expected : `# pass 14`, `# fail 0`

Si `formatAddressLines` échoue, vérifier que `line2` est bien présent dans la fixture. Si le test d'échappement HTML échoue, vérifier que `escapeHtml` est bien appliqué aux lignes d'adresse.

- [ ] **Step 5: Commit**

```bash
git add api/order.js api/test/order.test.js
git commit -m "feat(pack): module de logique commande + tests unitaires"
```

---

## Task 8 : Endpoint `POST /create-order-session`

**Files:**
- Modify: `api/worker.js` (import, route, handler)
- Modify: `api/wrangler.toml` (documentation du nouveau secret)

Pas de rate-limit : un compteur en KV consommerait le quota d'écriture du plan gratuit (1 000/jour), et un attaquant pourrait ainsi casser le lead magnet qui écrit lui aussi en KV. L'endpoint ne déclenche ni email ni écriture. Un contrôle d'`Origin` suffit.

- [ ] **Step 1: Ajouter l'import en tête de `api/worker.js`**

Juste après le bloc de commentaire d'en-tête et avant `const PDF_URL`, ajouter :

```js
import {
  PACK_PRODUCT_ID,
  PACK_AMOUNT_CENTS,
  PACK_NAME,
  buildOrderRecord,
  orderConfirmationHtml,
  orderConfirmationText,
  orderAdminHtml,
  ordersToCsv,
} from './order.js';
```

- [ ] **Step 2: Enregistrer la route**

Dans `export default { async fetch(request, env) { … } }`, dans le bloc `try`, ajouter **avant** la ligne `if (path === '/stripe-webhook' …)` :

```js
      if (path === '/create-order-session' && request.method === 'POST') {
        return await handleCreateOrderSession(request, env);
      }
```

- [ ] **Step 3: Ajouter le handler**

Insérer ce bloc dans `api/worker.js`, juste **avant** le commentaire `// ENDPOINT : /stripe-webhook (POST)` :

```js
// ============================================================
// ENDPOINT : /create-order-session (POST) — pack de livres reliés
// ============================================================
async function handleCreateOrderSession(request, env) {
  // Contrôle d'origine : le endpoint n'est destiné qu'au site.
  // Pas de rate-limit en KV : cela consommerait le quota d'écriture du plan
  // gratuit et permettrait de casser le lead magnet par saturation.
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || '';
  if (allowed !== '*' && origin && origin !== allowed) {
    return jsonResponse({ error: 'Origine non autorisée' }, 403, env);
  }

  if (!env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY absent');
    return jsonResponse({ error: 'Paiement indisponible pour le moment' }, 500, env);
  }

  const site = allowed && allowed !== '*' ? allowed : 'https://www.cours-echecs-paris.fr';

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('locale', 'fr');
  params.set('success_url', `${site}/commande-confirmee.html`);
  params.set('cancel_url', `${site}/#pack-livres`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'eur');
  params.set('line_items[0][price_data][unit_amount]', String(PACK_AMOUNT_CENTS));
  params.set('line_items[0][price_data][product_data][name]', PACK_NAME);
  params.set(
    'line_items[0][price_data][product_data][description]',
    'Exemplaire numéroté et signé à la main. Livraison en France comprise.'
  );
  params.set('shipping_address_collection[allowed_countries][0]', 'FR');
  params.set('phone_number_collection[enabled]', 'true');
  params.set('metadata[product]', PACK_PRODUCT_ID);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.url) {
    console.error('Stripe session creation failed:', response.status, JSON.stringify(data));
    return jsonResponse({ error: 'Impossible de démarrer le paiement' }, 502, env);
  }

  return jsonResponse({ url: data.url }, 200, env);
}
```

- [ ] **Step 4: Documenter le secret dans `api/wrangler.toml`**

Remplacer le bloc de commentaires de fin de fichier :

```toml
# Les secrets sont configurés via : wrangler secret put <NOM>
# - RESEND_API_KEY : ta clé API Resend
# - ADMIN_TOKEN    : un token random que tu choisis (pour accéder à /subscribers)
```

par :

```toml
# Les secrets sont configurés via : wrangler secret put <NOM>
# - RESEND_API_KEY        : clé API Resend
# - ADMIN_TOKEN           : token random choisi par toi (accès /subscribers et /orders)
# - STRIPE_SECRET_KEY     : clé secrète Stripe (sk_test_... puis sk_live_...)
# - STRIPE_WEBHOOK_SECRET : clé de signature du webhook Stripe (whsec_...)
```

- [ ] **Step 5: Configurer la clé Stripe de test et démarrer le Worker en local**

Récupérer la clé **de test** dans le dashboard Stripe (Développeurs → Clés API → « Clé secrète » en mode Test, commence par `sk_test_`).

Créer `api/.dev.vars` (ce fichier ne doit **jamais** être commité) :

```
STRIPE_SECRET_KEY=sk_test_REMPLACER_PAR_TA_CLE_DE_TEST
```

Vérifier que `.dev.vars` est ignoré :

```bash
grep -q "\.dev\.vars" .gitignore || echo "api/.dev.vars" >> .gitignore
cat .gitignore
```

Puis lancer le Worker :

```bash
cd api && wrangler dev
```

Expected : `Ready on http://localhost:8787`

- [ ] **Step 6: Tester la création de session**

Dans un autre terminal :

```bash
curl -s -X POST http://localhost:8787/create-order-session \
  -H "Origin: https://www.cours-echecs-paris.fr" \
  -H "Content-Type: application/json" -d '{}'
```

Expected : `{"url":"https://checkout.stripe.com/c/pay/cs_test_..."}`

Ouvrir cette URL dans un navigateur et vérifier :
- Le montant affiché est **64,99 €**
- **Aucune ligne de frais de livraison** n'apparaît
- Le formulaire demande une adresse et le pays est **figé sur France**
- Un champ téléphone est présent
- L'interface est en français

Si la réponse est une erreur 502, lire les logs de `wrangler dev` : le message d'erreur Stripe y est logué intégralement.

- [ ] **Step 7: Tester le rejet d'une origine étrangère**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787/create-order-session \
  -H "Origin: https://site-malveillant.example" \
  -H "Content-Type: application/json" -d '{}'
```

Expected : `403`

- [ ] **Step 8: Commit**

```bash
git add api/worker.js api/wrangler.toml .gitignore
git commit -m "feat(pack): endpoint de creation de session Stripe Checkout"
```

---

## Task 9 : Branche pack dans le webhook Stripe

**Files:**
- Modify: `api/worker.js` (fonction `handleStripeWebhook`)
- Modify: `api/order.js` (ajout de `isPackSession`)
- Modify: `api/test/order.test.js` (tests de `isPackSession`)

Le webhook existant envoie le guide PDF gratuit à tout `checkout.session.completed`. La branche pack doit être testée **en premier** et sortir immédiatement, sinon un acheteur de livres recevrait aussi l'email du guide gratuit.

L'idempotence est indispensable : Stripe rejoue les événements en échec pendant plusieurs jours, et un rejeu déclencherait un second email.

- [ ] **Step 1: Ajouter les tests d'aiguillage**

Ajouter à la fin de `api/test/order.test.js` :

```js
// ---------- Aiguillage produit ----------

test('isPackSession reconnaît une session du pack', async () => {
  const { isPackSession } = await import('../order.js');
  assert.equal(isPackSession({ metadata: { product: PACK_PRODUCT_ID } }), true);
});

test('isPackSession rejette une session du guide gratuit', async () => {
  const { isPackSession } = await import('../order.js');
  assert.equal(isPackSession({ metadata: { product: 'guide_pdf' } }), false);
  assert.equal(isPackSession({ metadata: {} }), false);
  assert.equal(isPackSession({}), false);
  assert.equal(isPackSession(null), false);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `node --test api/test/order.test.js`

Expected: FAIL — `isPackSession is not a function`

- [ ] **Step 3: Ajouter `isPackSession` à `api/order.js`**

Ajouter juste après la fonction `buildOrderRecord` :

```js
/** Vrai si la session correspond à une commande du pack de livres reliés. */
export function isPackSession(session) {
  return session?.metadata?.product === PACK_PRODUCT_ID;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `node --test api/test/order.test.js`

Expected : `# pass 16`, `# fail 0`

- [ ] **Step 5: Ajouter `isPackSession` à l'import de `worker.js`**

Dans le bloc `import { … } from './order.js';` créé en Task 8, ajouter `isPackSession,` à la liste.

- [ ] **Step 6: Brancher le webhook**

Dans `api/worker.js`, fonction `handleStripeWebhook`, repérer :

```js
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const email = normalizeEmail(session.customer_details?.email || session.customer_email);
```

Insérer, **entre** la ligne `const session = …` et la ligne `const email = …` :

```js
    // Aiguillage produit : le pack de livres a son propre traitement et ne doit
    // surtout pas déclencher l'envoi du guide PDF gratuit.
    if (isPackSession(session)) {
      await handlePackOrder(session, env);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

```

- [ ] **Step 7: Ajouter le handler de commande**

Insérer dans `api/worker.js`, juste **après** la fin de la fonction `handleStripeWebhook` (avant le commentaire `// Vérifie la signature d'un webhook Stripe`) :

```js
// ============================================================
// Traitement d'une commande du pack de livres reliés
// ============================================================
async function handlePackOrder(session, env) {
  // On ne traite que les paiements effectivement encaissés.
  if (session.payment_status !== 'paid') {
    console.log('Pack order ignored, payment_status =', session.payment_status);
    return;
  }

  const key = `order:${session.id}`;

  // Idempotence : Stripe rejoue les events pendant plusieurs jours.
  const deja = await env.SUBSCRIBERS.get(key);
  if (deja) {
    console.log('Pack order already processed:', session.id);
    return;
  }

  const order = buildOrderRecord(session, new Date().toISOString());

  // Écriture AVANT les emails : si Resend tombe, la commande reste récupérable
  // via /orders. Une commande payée mais perdue est le pire échec possible.
  await env.SUBSCRIBERS.put(key, JSON.stringify(order));

  if (isValidEmail(order.email)) {
    try {
      await sendOrderConfirmationEmail(order, env);
    } catch (err) {
      console.error('Order confirmation email failed:', err);
    }
  } else {
    console.error('Order without valid email:', session.id);
  }

  try {
    await sendOrderAdminNotification(order, env);
  } catch (err) {
    console.error('Order admin notification failed:', err);
  }
}

// ============================================================
// Emails de commande
// ============================================================
async function sendOrderConfirmationEmail(order, env) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [order.email],
      reply_to: REPLY_TO,
      subject: 'Ta commande est confirmée — Apprendre les Échecs, Volumes I & II',
      html: orderConfirmationHtml(order),
      text: orderConfirmationText(order),
    }),
  });
  return { ok: response.ok, status: response.status };
}

async function sendOrderAdminNotification(order, env) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ADMIN_EMAIL],
      reply_to: order.email || REPLY_TO,
      subject: `🎉 Nouvelle commande — ${(order.amount_total / 100).toFixed(2).replace('.', ',')} € — ${order.name || order.email}`,
      html: orderAdminHtml(order),
    }),
  });
  return { ok: response.ok, status: response.status };
}
```

- [ ] **Step 8: Tester le webhook de bout en bout avec la CLI Stripe**

Installer la CLI Stripe si absente (`https://stripe.com/docs/stripe-cli`), puis :

```bash
stripe login
stripe listen --forward-to http://localhost:8787/stripe-webhook
```

La commande affiche un secret `whsec_...`. L'ajouter à `api/.dev.vars` :

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

Redémarrer `wrangler dev`, puis créer une session (Task 8 Step 6), ouvrir l'URL et payer avec la carte de test :

- Numéro : `4242 4242 4242 4242`
- Date : n'importe quelle date future · CVC : n'importe quels 3 chiffres
- Adresse : une adresse française réelle quelconque

Expected :
- Redirection vers `/commande-confirmee.html`
- Dans le terminal `stripe listen` : `checkout.session.completed` → `[200]`
- Dans les logs `wrangler dev` : aucune erreur
- L'email de confirmation arrive à l'adresse saisie
- L'email admin arrive sur `nicolas.musicki@gmail.com`, avec l'étiquette d'adresse correcte

- [ ] **Step 9: Tester l'idempotence**

Récupérer l'identifiant de l'événement dans la sortie de `stripe listen` (`evt_...`), puis le rejouer :

```bash
stripe events resend evt_REMPLACER_PAR_ID
```

Expected :
- Réponse `[200]`
- Dans les logs `wrangler dev` : `Pack order already processed: cs_test_...`
- **Aucun second email** ne doit arriver

Si un second email arrive, l'écriture KV n'a pas eu lieu ou la clé lue diffère de la clé écrite — vérifier que les deux utilisent bien `order:${session.id}`.

- [ ] **Step 10: Vérifier la non-régression du guide gratuit**

```bash
curl -s -X POST http://localhost:8787/subscribe \
  -H "Origin: https://www.cours-echecs-paris.fr" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-nonregression@exemple.fr","why":"test"}'
```

Expected : `{"success":true,"message":"Parfait ! Ton guide arrive dans ta boîte mail..."}` et réception de l'email du guide.

- [ ] **Step 11: Commit**

```bash
git add api/worker.js api/order.js api/test/order.test.js
git commit -m "feat(pack): traitement des commandes dans le webhook Stripe (idempotent)"
```

---

## Task 10 : Endpoints admin `/orders` et `/orders/export.csv`

**Files:**
- Modify: `api/worker.js`

Le CSV sert à préparer les colis : une ligne par commande, adresse en colonnes.

- [ ] **Step 1: Enregistrer les routes**

Dans `export default { async fetch … }`, après la route `/subscribers/export.csv`, ajouter :

```js
      if (path === '/orders' && request.method === 'GET') {
        return await handleListOrders(request, env);
      }
      if (path === '/orders/export.csv' && request.method === 'GET') {
        return await handleExportOrdersCsv(request, env);
      }
```

- [ ] **Step 2: Ajouter les handlers**

Insérer dans `api/worker.js`, juste après la fonction `handleExportCsv` :

```js
// ============================================================
// ENDPOINTS : /orders et /orders/export.csv (GET, admin)
// ============================================================
async function fetchAllOrders(env) {
  const orders = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'order:', cursor });
    for (const key of list.keys) {
      const raw = await env.SUBSCRIBERS.get(key.name);
      if (!raw) continue;
      try {
        orders.push(JSON.parse(raw));
      } catch {
        console.error('Order JSON invalide:', key.name);
      }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  orders.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return orders;
}

async function handleListOrders(request, env) {
  if (!isAdminAuthorized(request, env)) {
    return jsonResponse({ error: 'Non autorisé' }, 401, env);
  }
  const orders = await fetchAllOrders(env);
  return jsonResponse({ count: orders.length, orders }, 200, env);
}

async function handleExportOrdersCsv(request, env) {
  if (!isAdminAuthorized(request, env)) {
    return new Response('Non autorisé', { status: 401 });
  }
  const orders = await fetchAllOrders(env);
  return new Response(ordersToCsv(orders), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="commandes.csv"',
    },
  });
}
```

- [ ] **Step 3: Tester l'accès sans token**

Avec `wrangler dev` en cours :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/orders
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/orders/export.csv
```

Expected : `401` pour les deux.

- [ ] **Step 4: Tester l'accès avec token**

Ajouter `ADMIN_TOKEN=un-token-de-test` à `api/.dev.vars`, redémarrer `wrangler dev`, puis :

```bash
curl -s http://localhost:8787/orders -H "Authorization: Bearer un-token-de-test"
curl -s http://localhost:8787/orders/export.csv -H "Authorization: Bearer un-token-de-test"
```

Expected :
- Le premier renvoie `{"count":1,"orders":[{...}]}` avec la commande de test de la Task 9
- Le second renvoie un CSV dont la première ligne est exactement
  `date,id,email,nom,telephone,adresse1,adresse2,code_postal,ville,pays,montant_eur,statut`
  (en-tête non quoté), suivie d'une ligne de données dont chaque champ est entre guillemets

Ouvrir le CSV dans Excel ou LibreOffice pour confirmer que les accents s'affichent correctement.

- [ ] **Step 5: Commit**

```bash
git add api/worker.js
git commit -m "feat(pack): endpoints admin de consultation et export des commandes"
```

---

## Task 11 : Câbler le CTA de la landing page

**Files:**
- Modify: `index.html` (retrait de `disabled`, ajout du script)

Le Worker est maintenant testé. On active le bouton.

- [ ] **Step 1: Retirer l'attribut `disabled`**

Dans `index.html`, remplacer :

```html
            <button type="button" class="pack-cta" id="pack-cta" disabled>
```

par :

```html
            <button type="button" class="pack-cta" id="pack-cta">
```

- [ ] **Step 2: Ajouter le script**

Insérer **juste avant** la fermeture `</section>` de `#pack-livres` (après le bloc `.pack-faq`) :

```html
        <script>
          (function () {
            const WORKER_URL = 'https://chess-lead-magnet.chess-musicki.workers.dev';
            const bouton = document.getElementById('pack-cta');
            const erreur = document.getElementById('pack-cta-error');
            const libelle = bouton ? bouton.textContent : '';

            if (bouton) {
              bouton.addEventListener('click', async function () {
                erreur.classList.remove('is-visible');
                bouton.disabled = true;
                bouton.textContent = 'Redirection vers le paiement…';

                try {
                  const res = await fetch(WORKER_URL + '/create-order-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                  });
                  const data = await res.json();

                  if (res.ok && data.url) {
                    window.location.href = data.url;
                    return;
                  }
                  throw new Error(data.error || 'Réponse inattendue');
                } catch (e) {
                  bouton.disabled = false;
                  bouton.textContent = libelle;
                  erreur.textContent =
                    "Le paiement n'a pas pu démarrer. Réessaie dans un instant, ou écris-moi à nicolas.musicki@gmail.com et je m'occupe de ta commande directement.";
                  erreur.classList.add('is-visible');
                }
              });
            }

            // Vidéo : chargée seulement quand la section approche du viewport,
            // pour ne pas imposer 2,7 Mo à qui ne descend jamais jusqu'ici.
            const media = document.getElementById('pack-hero-media');
            const video = media ? media.querySelector('video') : null;
            const reduit =
              window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (media && video && !reduit && 'IntersectionObserver' in window) {
              const observer = new IntersectionObserver(
                function (entries) {
                  entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    observer.disconnect();
                    video.preload = 'auto';
                    video.load();
                    video.play().then(
                      function () {
                        media.classList.add('is-video-ready');
                      },
                      function () {
                        /* autoplay refusé : on garde l'image fixe */
                      }
                    );
                  });
                },
                { rootMargin: '300px' }
              );
              observer.observe(media);
            }
          })();
        </script>
```

- [ ] **Step 3: Déployer le Worker en mode test**

```bash
cd api
wrangler secret put STRIPE_SECRET_KEY   # coller la clé sk_test_...
wrangler deploy
```

Expected : `Published chess-lead-magnet` suivi de l'URL du Worker.

Vérifier que l'URL correspond bien à `https://chess-lead-magnet.chess-musicki.workers.dev` (la constante `WORKER_URL` du script). Si elle diffère, corriger la constante dans `index.html`.

- [ ] **Step 4: Tester le parcours complet depuis la page locale**

Relancer `python -m http.server 8000` et ouvrir `http://localhost:8000/#pack-livres`.

> Note : `ALLOWED_ORIGIN` vaut `https://www.cours-echecs-paris.fr`, donc un appel depuis `localhost` sera bloqué par CORS. Pour ce test, déployer temporairement avec `ALLOWED_ORIGIN = "*"` dans `wrangler.toml`, **et impérativement le remettre à `https://www.cours-echecs-paris.fr` avant la Task 13.**

Expected :
- Le clic grise le bouton et affiche « Redirection vers le paiement… »
- Redirection vers Stripe Checkout, montant 64,99 €
- Paiement avec `4242 4242 4242 4242` → retour sur `/commande-confirmee.html`
- Les deux emails arrivent

- [ ] **Step 5: Tester le chemin d'erreur**

Dans les DevTools, onglet Réseau, activer le mode hors ligne, puis cliquer sur le CTA.

Expected : le bouton redevient cliquable, et le message d'erreur rouge apparaît avec l'adresse email de contact.

- [ ] **Step 6: Vérifier la vidéo**

Recharger la page et faire défiler jusqu'à la section.

Expected : la vidéo se lance en boucle, sans son. Avec « Réduire les animations » activé dans l'OS, l'image fixe reste affichée.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(pack): active le CTA de commande et le chargement differe de la video"
```

---

## Task 12 : Sitemap et liens de pied de page

**Files:**
- Modify: `sitemap.xml`
- Modify: `index.html`, `cgv.html`, `commande-confirmee.html`, `mentions-legales.html` (lien CGV dans le footer)

`commande-confirmee.html` est en `noindex` et n'entre donc **pas** dans le sitemap.

- [ ] **Step 1: Ajouter les CGV au sitemap**

Ouvrir `sitemap.xml`, repérer l'entrée de `mentions-legales.html` et ajouter juste après :

```xml
  <url>
    <loc>https://www.cours-echecs-paris.fr/cgv.html</loc>
    <lastmod>2026-08-19</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
```

- [ ] **Step 2: Vérifier que le sitemap est valide**

Run:

```bash
node -e "
const fs=require('fs');
const x=fs.readFileSync('sitemap.xml','utf8');
const locs=[...x.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const dup=locs.filter((v,i)=>locs.indexOf(v)!==i);
console.log(locs.length+' URLs');
if(dup.length){console.error('DOUBLONS : '+dup.join(', '));process.exit(1);}
if(!locs.some(u=>u.endsWith('/cgv.html'))){console.error('cgv.html absent');process.exit(1);}
if(locs.some(u=>u.includes('commande-confirmee'))){console.error('commande-confirmee ne doit pas etre indexee');process.exit(1);}
console.log('OK');
"
```

Expected : le nombre d'URLs puis `OK`.

- [ ] **Step 3: Ajouter le lien CGV dans les pieds de page**

Dans le `<footer>` de `index.html`, repérer le lien vers les mentions légales :

```html
<a href="mentions-legales.html">Mentions légales</a>
```

Ajouter juste après :

```html
 &middot; <a href="cgv.html">CGV</a>
```

Répéter la même modification dans `mentions-legales.html`, `cgv.html` et `commande-confirmee.html`, afin que les quatre pieds de page restent identiques.

- [ ] **Step 4: Vérifier qu'aucun lien n'est cassé**

Run:

```bash
node -e "
const fs=require('fs');
const pages=['index.html','cgv.html','commande-confirmee.html','mentions-legales.html'];
let ko=0;
for(const p of pages){
  const html=fs.readFileSync(p,'utf8');
  for(const m of html.matchAll(/href=\"([^\"#:?]+\.html)\"/g)){
    if(!fs.existsSync(m[1])){console.error(p+' -> '+m[1]+' INTROUVABLE');ko++;}
  }
  for(const m of html.matchAll(/(?:src|href)=\"(images\/[^\"]+)\"/g)){
    if(!fs.existsSync(m[1])){console.error(p+' -> '+m[1]+' INTROUVABLE');ko++;}
  }
}
if(ko){process.exit(1);}
console.log('OK — tous les liens internes et images resolvent');
"
```

Expected : `OK — tous les liens internes et images resolvent`

- [ ] **Step 5: Commit**

```bash
git add sitemap.xml index.html cgv.html commande-confirmee.html mentions-legales.html
git commit -m "feat(pack): reference les CGV dans le sitemap et les pieds de page"
```

---

## Task 13 : Passage en production

**Files:**
- Modify: `api/wrangler.toml` (si `ALLOWED_ORIGIN` a été modifié en Task 11)

Rien n'est déployé en `live` avant que tout le reste ait été validé en mode test.

- [ ] **Step 1: Rétablir `ALLOWED_ORIGIN`**

Vérifier que `api/wrangler.toml` contient bien :

```toml
[vars]
ALLOWED_ORIGIN = "https://www.cours-echecs-paris.fr"
```

Run: `grep ALLOWED_ORIGIN api/wrangler.toml`

Expected : la valeur `https://www.cours-echecs-paris.fr`, **jamais** `*`.

- [ ] **Step 2: Vérifier qu'aucun secret n'a été commité**

Run:

```bash
git log --all --oneline -S "sk_test_" -- . | head
git log --all --oneline -S "sk_live_" -- . | head
git log --all --oneline -S "whsec_" -- . | head
ls api/.dev.vars 2>/dev/null && git check-ignore -v api/.dev.vars
```

Expected : les trois `git log` ne renvoient **aucune ligne**, et `git check-ignore` confirme que `api/.dev.vars` est ignoré.

Si un secret apparaît dans l'historique, le révoquer immédiatement depuis le dashboard Stripe avant de continuer.

- [ ] **Step 3: Lancer la suite de tests complète**

Run: `node --test api/test/`

Expected : `# pass 16`, `# fail 0`

- [ ] **Step 4: Configurer le webhook Stripe en mode live**

Dans le dashboard Stripe, basculer en mode **Live**, puis Développeurs → Webhooks → « Ajouter un point de terminaison » :

- URL : `https://chess-lead-magnet.chess-musicki.workers.dev/stripe-webhook`
- Événement à écouter : `checkout.session.completed` uniquement

Copier le secret de signature affiché (`whsec_...`).

- [ ] **Step 5: Poser les secrets de production**

```bash
cd api
wrangler secret put STRIPE_SECRET_KEY      # coller la clé sk_live_...
wrangler secret put STRIPE_WEBHOOK_SECRET  # coller le whsec_... du Step 4
wrangler deploy
```

Expected : `Published chess-lead-magnet`

- [ ] **Step 6: Publier le site**

```bash
git push origin main
```

Attendre le déploiement GitHub Pages (1 à 2 minutes), puis ouvrir
`https://www.cours-echecs-paris.fr/#pack-livres`.

- [ ] **Step 7: Commande de test réelle**

Passer une **vraie commande** avec une vraie carte, à sa propre adresse.

Expected :
- Le paiement passe, redirection vers `/commande-confirmee.html`
- L'email client arrive, adresse correcte
- L'email admin arrive sur `nicolas.musicki@gmail.com`
- La commande apparaît dans le dashboard Stripe
- `curl https://chess-lead-magnet.chess-musicki.workers.dev/orders -H "Authorization: Bearer $ADMIN_TOKEN"` la liste

Puis **rembourser cette commande** depuis le dashboard Stripe (Paiements → sélectionner → Rembourser).

- [ ] **Step 8: Vérifier le rendu final**

Sur `https://www.cours-echecs-paris.fr` :

- [ ] Section `#pack-livres` visible, photos et vidéo chargées
- [ ] FAQ dépliable, 8 questions
- [ ] `#guide-gratuit` toujours fonctionnel (tester une inscription réelle)
- [ ] Section « Volume 2 offert » intacte
- [ ] `cgv.html` accessible depuis la section et le pied de page
- [ ] Aucun prix « 30 € » visible où que ce soit
- [ ] Mention « n° X / 50 » cohérente entre la section, la FAQ et l'email
- [ ] Test Lighthouse mobile : pas de chute du score Performance par rapport à avant

Lancer le test de données structurées : `https://search.google.com/test/rich-results?url=https://www.cours-echecs-paris.fr`

Expected : un `FAQPage` détecté avec 10 questions, aucune erreur.

- [ ] **Step 9: Commit final**

```bash
git add -A
git commit -m "chore(pack): passage en production du pack de livres relies"
git push origin main
```

---

## Récapitulatif des secrets à configurer

| Secret | Où | Valeur |
|---|---|---|
| `STRIPE_SECRET_KEY` | `wrangler secret put` | `sk_test_…` puis `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `wrangler secret put` | `whsec_…` du webhook live |
| `RESEND_API_KEY` | déjà configuré | inchangé |
| `ADMIN_TOKEN` | déjà configuré | inchangé |

`api/.dev.vars` contient les équivalents de développement et **ne doit jamais être commité**.

## Actions manuelles pour Nicolas

1. Fournir la clé Stripe de test (`sk_test_…`) avant la Task 8.
2. Créer le webhook live dans le dashboard Stripe (Task 13, Step 4).
3. Passer et rembourser une commande test réelle (Task 13, Step 7).
4. Tenir le compteur de numérotation à la main, et ouvrir une seconde série au 51ᵉ exemplaire.
