# Spec — Pack « Édition reliée à la main » (Volumes I & II)

Date : 2026-08-19
Site : cours-echecs-paris.fr
Auteur : Nicolas Musicki

---

## 1. Objectif

Vendre depuis la landing page un **pack des deux volumes** d'*Apprendre les Échecs* en
édition papier reliée à la main (papier ivoire, série artisanale), chaque exemplaire
**numéroté et signé à la main**.

- Prix : **64,99 € TTC, livraison comprise**
- Vendu **uniquement par paire** — pas de volume à l'unité
- Livraison **France uniquement**
- Délai annoncé : **5 à 10 jours ouvrés**

Le parcours : section landing → Stripe Checkout (adresse + carte) → email de confirmation
client + email de notification à Nicolas.

### Décisions de prix

**Un seul prix tout compris plutôt que 59,98 € + 4,99 € de port.** À encaissement
identique (64,99 € dans les deux cas, 7 à 9 € de Colissimo dans les deux cas, soit 56 à
58 € nets), le prix unique convertit mieux : les frais de port apparaissant en fin de
tunnel sont la première cause d'abandon de panier.

**Aucun prix au volume affiché.** 30 € pour 96 pages invite la comparaison avec un livre
du commerce. 64,99 € pour une paire reliée main, numérotée et signée, ne se compare à
rien. Le prix unitaire reste un outil de calcul interne.

**La numérotation compense le format.** Deux volumes de 96 pages en petit format ne se
vendent pas au poids. « Exemplaire n° X / 50 », signé à la main sur la page de garde,
déplace l'achat du livre vers la pièce d'artisan. Coût : zéro.

## 2. Positionnement (décision produit)

Le site propose déjà le **Volume 1 en PDF gratuit** et le **Volume 2 offert après le
premier cours d'essai**. Le pack payant ne les remplace pas et ne les masque pas.

**La différenciation est l'objet, pas le contenu.** Ce qui est vendu : une reliure cousue
main, du papier ivoire, une fabrication artisanale, un exemplaire numéroté. Le contenu
reste gratuit en PDF, et la page le dit explicitement plutôt que de l'esquiver. Cette
honnêteté est l'argument de vente, pas une faiblesse : elle rend crédible le prix de
l'objet.

Le PDF gratuit n'est pas un concurrent du livre — il en est l'**entonnoir**. Les deux
publics se recouvrent peu : qui télécharge le gratuit n'aurait pas acheté ; qui achète à
65 € achète un objet, souvent pour l'offrir.

Conséquence : **aucune régression** sur les sections `#guide-gratuit` et
`home-vol2-bonus` — la capture d'email reste intacte.

## 3. Architecture

```
Landing #pack-livres
   │  clic CTA « Commander les 2 volumes »
   ▼
POST {WORKER}/create-order-session
   │  crée une Stripe Checkout Session côté serveur
   │  · line_item  : Pack Volumes I & II, livraison comprise — 6499 (EUR)
   │  · pas de shipping_option (le port est inclus dans le prix)
   │  · shipping_address_collection : ['FR']
   │  · phone_number_collection : true
   │  · metadata.product = 'pack_livres_relies'
   ▼
Redirection navigateur → page Stripe hébergée
   │  email, nom, adresse postale, téléphone, carte, 3-D Secure
   ▼
success_url → /commande-confirmee.html
cancel_url  → /#pack-livres
   │
   ▼  (asynchrone, côté Stripe)
POST {WORKER}/stripe-webhook   · event checkout.session.completed
   │  1. vérification signature HMAC-SHA256  (code déjà en place)
   │  2. si metadata.product ≠ 'pack_livres_relies' → branche existante (guide PDF)
   │  3. idempotence : si KV order:<session_id> existe → 200, on s'arrête
   │  4. écriture KV  order:<session_id>  (AVANT tout envoi d'email)
   │  5. email client  (best-effort)
   │  6. email Nicolas (best-effort)
   ▼
200 { received: true }
```

**Pourquoi une Checkout Session créée par le Worker plutôt qu'un Payment Link Stripe :**
le prix et la restriction pays vivent dans du code versionné, pas dans des réglages de
dashboard susceptibles de dériver silencieusement. Le coût est un endpoint de ~40 lignes.

**Pourquoi écrire en KV avant d'envoyer les emails :** si Resend est indisponible, la
commande est déjà persistée et récupérable via `/orders`. Une commande payée mais perdue
serait le pire échec possible du système.

## 4. Composants

### 4.1 Section `#pack-livres` — [index.html](../../../index.html)

Insérée après la section `home-vol2-bonus`, avant `advantages`.

Contenu :

- Sur-titre : « L'ÉDITION RELIÉE À LA MAIN »
- Titre : « Apprendre les Échecs — Volumes I & II »
- Visuel principal : `1000020263.webp` (les 2 volumes à plat, couvertures lisibles)
- Vidéo `1000020265.mp4` — `autoplay muted loop playsinline`, avec `poster`, remplacée
  par l'image fixe sous `prefers-reduced-motion`
- Galerie secondaire : `1000020264` (tranche visible → la reliure), `1000020256`
  (gros plan rouge → le grain), `1000020258` (vue plongeante)
- Arguments : reliure cousue main par une relieuse professionnelle · papier ivoire ·
  **exemplaire numéroté et signé à la main** · **série limitée à 50 exemplaires**
- Prix : **64,99 €**, mention « livraison comprise » juste en dessous
- CTA : « Commander les 2 volumes »
- Mention d'honnêteté : « Le contenu reste disponible gratuitement en PDF. Ici, tu
  achètes un objet. »
- Ligne service client : « Une question ? nicolas.musicki@gmail.com · 06 09 36 56 91 »
- Lien discret vers `cgv.html`

Photo écartée : `1000020266.webp` (arrière-plan encombré).

### 4.2 FAQ du pack

Huit questions, en `<details>` accessibles, avec balisage `FAQPage` JSON-LD :

1. Le guide n'est pas gratuit ?
2. Qu'est-ce qui est relié à la main exactement ?
3. Les exemplaires sont-ils numérotés ? *(réponse : « n° X / 50 », manuscrit et signé)*
4. Combien de temps pour le recevoir ?
5. Livrez-vous en dehors de la France ?
6. Puis-je l'offrir ?
7. Et si je veux seulement le contenu ?
8. Comment se passe le paiement ? Puis-je être remboursé ?

La question 8 précise le droit de rétractation de 14 jours et indique que l'adresse
postale de retour est communiquée par email sur demande. Un bloc **service client**
(`nicolas.musicki@gmail.com` · 06 09 36 56 91) clôt la FAQ.

### 4.3 Worker — [api/worker.js](../../../api/worker.js)

Nouveaux éléments :

| Élément | Rôle |
|---|---|
| `POST /create-order-session` | Crée la Checkout Session, renvoie `{ url }`. CORS et `Origin` restreints à `ALLOWED_ORIGIN`. |
| Branche `pack_livres_relies` dans `handleStripeWebhook` | Discrimine sur `session.metadata.product`. La branche guide PDF existante n'est pas modifiée. |
| `sendOrderConfirmationEmail(order, env)` | Email client. |
| `sendOrderAdminNotification(order, env)` | Email Nicolas. |
| `GET /orders` (auth Bearer `ADMIN_TOKEN`) | Liste JSON des commandes. |
| `GET /orders/export.csv` (auth Bearer) | Export CSV pour la préparation des colis. |

Nouveau secret : `STRIPE_SECRET_KEY` (`sk_live_…`).
Secret déjà existant, à re-vérifier : `STRIPE_WEBHOOK_SECRET` (`whsec_…`).

**Pas de rate-limit sur `/create-order-session`.** Un compteur en KV consommerait le quota
d'écriture du plan gratuit (1 000/jour) : un attaquant pourrait l'épuiser et casser le
lead magnet, qui écrit lui aussi en KV. L'endpoint ne coûte rien (ni email, ni écriture),
un contrôle d'en-tête `Origin` suffit.

**Adresse de livraison — piège d'API.** Depuis la version d'API 2025-03-31, Stripe a
déplacé `session.shipping_details` vers `session.collected_information.shipping_details`.
Le code lit les deux emplacements, avec repli sur `customer_details.address`.

**CSS dans un fichier dédié `pack-livres.css`.** Les pages chargent `style.min.css` :
modifier `style.css` imposerait de re-minifier et de maintenir deux fichiers synchronisés.
Un fichier séparé supprime ce risque.

Structure KV d'une commande :

```json
{
  "id": "cs_live_...",
  "date": "2026-08-19T18:00:00.000Z",
  "product": "pack_livres_relies",
  "email": "client@exemple.com",
  "name": "Prénom Nom",
  "phone": "+33...",
  "address": { "line1": "", "line2": "", "postal_code": "", "city": "", "country": "FR" },
  "amount_total": 6499,
  "currency": "eur",
  "payment_status": "paid",
  "status": "a_expedier"
}
```

Clé : `order:<session_id>`. Le préfixe `order:` ne collisionne pas avec
`subscriber:` / `email:` — les listings existants ne sont pas affectés.

### 4.4 Emails

**Au client** — objet : « Ta commande est confirmée — Apprendre les Échecs, Volumes I & II »

Récapitulatif de commande, adresse de livraison telle que saisie, montant, délai de 5 à
10 jours ouvrés, mention que l'exemplaire sera **numéroté (n° X / 50) et signé à la
main**, rappel du
droit de rétractation, bloc **service client** (`nicolas.musicki@gmail.com` ·
06 09 36 56 91), `reply-to` vers `nicolas.musicki@gmail.com`. Ton cohérent avec les emails
existants du site.

**À Nicolas** (`nicolas.musicki@gmail.com`) — objet : « 🎉 Nouvelle commande — 64,99 € »

Nom, email, téléphone, **adresse postale complète formatée pour être copiée-collée sur
une étiquette**, montant, identifiant de session Stripe, date.

### 4.5 Page `commande-confirmee.html`

Page de remerciement sobre, réutilisant le header/footer du site. Confirme la commande,
rappelle le délai, indique qu'un email vient d'être envoyé. `<meta name="robots"
content="noindex">`. Aucune donnée sensible affichée (la page est atteignable par URL
directe).

### 4.6 Page `cgv.html`

Conditions générales de vente pour un bien physique, obligatoires en France. Construite
sur le gabarit de [mentions-legales.html](../../../mentions-legales.html).

Sections : identité du vendeur (SIRET 945 080 547 00017), produit, prix TTC livraison
comprise, zone de livraison, délai, paiement (Stripe), **droit de rétractation de
14 jours**, modalités de retour et de remboursement, garanties légales de conformité et
des vices cachés, données personnelles, médiation de la consommation, droit applicable.

**Service client** — affiché dans les CGV, dans la section `#pack-livres`, dans la FAQ,
dans la page de confirmation et dans l'email client :

- Email : `nicolas.musicki@gmail.com`
- Téléphone : `06 09 36 56 91`

**Adresse de retour** — l'adresse postale n'est pas publiée sur le site. Formulation
retenue dans les CGV et la FAQ :

> Pour exercer votre droit de rétractation, écrivez à `nicolas.musicki@gmail.com`.
> L'adresse postale de retour vous sera communiquée par email en réponse à votre
> demande, sous 48 heures ouvrées.

C'est la pratique courante pour un micro-entrepreneur travaillant depuis son domicile, et
cela évite de publier une adresse personnelle. Le point de vigilance : le délai de
rétractation de 14 jours du client ne peut pas être raccourci par le temps de réponse —
d'où l'engagement explicite de répondre sous 48 heures ouvrées.

## 5. Gestion des erreurs

| Situation | Comportement |
|---|---|
| `/create-order-session` échoue | Message d'erreur inline sous le CTA, invitation à écrire à Nicolas. Aucune redirection à blanc. |
| Client abandonne sur Stripe | `cancel_url` ramène à `/#pack-livres`. Aucune trace, aucun email. |
| Signature webhook invalide | 400, aucun traitement. |
| Webhook rejoué par Stripe | Idempotence via `order:<session_id>` — pas de double email. |
| Resend indisponible | Commande déjà en KV. Erreur loguée. Récupération via `/orders`. |
| Paiement `unpaid` / en attente | Aucun email, aucune écriture. Seul `payment_status === 'paid'` déclenche le traitement. |

## 6. Vérification

- [ ] Session Checkout créée en mode test → page Stripe affichée, **un seul montant : 64,99 €**
- [ ] Aucune ligne de frais de port n'apparaît dans le tunnel
- [ ] Champ adresse limité à la France
- [ ] Paiement test avec `4242 4242 4242 4242` → redirection vers `/commande-confirmee.html`
- [ ] Webhook reçu, signature validée, commande présente en KV
- [ ] Email client reçu, adresse correcte, rendu correct sur mobile
- [ ] Email admin reçu sur `nicolas.musicki@gmail.com`, adresse copiable
- [ ] Rejeu manuel du webhook depuis le dashboard Stripe → aucun second email
- [ ] `/orders` et `/orders/export.csv` protégés par le token admin (401 sans)
- [ ] Section responsive 360 px → 1440 px, vidéo ne casse pas la mise en page
- [ ] Lighthouse : pas de régression de performance sur la landing
- [ ] `#guide-gratuit` et `home-vol2-bonus` toujours fonctionnels
- [ ] JSON-LD FAQ valide (Rich Results Test)
- [ ] Aucun prix au volume (30 €) visible nulle part sur le site
- [ ] Mention « n° X / 50 » cohérente entre la section, la FAQ et l'email client

## 7. Hors périmètre

- Vente des volumes à l'unité
- Livraison hors France
- Suivi de colis automatisé
- Gestion de stock
- Codes promo
- Compte client

## 8. Ordre de déploiement

1. Section + FAQ + CGV + page de confirmation, en local, CTA inactif
2. Endpoints Worker, testés en mode Stripe **test**
3. Passage en clés **live**, configuration du webhook live
4. Une commande test réelle en live, puis remboursement depuis le dashboard Stripe
5. Mise en ligne

## 9. Numérotation — décidé

**Formulation retenue : « Exemplaire n° X / 50 », manuscrite et signée sur la page de
garde.** Première série limitée à **50 exemplaires**.

Engagement à tenir : au 51ᵉ exemplaire, ouvrir explicitement une **seconde série**
(« n° X / 50 — seconde série ») plutôt que de continuer la numérotation. C'est une
pratique d'éditeur légitime ; laisser la mention devenir fausse ne l'est pas.

Le compteur est tenu à la main par Nicolas — pas de suivi automatique côté Worker
(gestion de stock hors périmètre, cf. §7). L'export `/orders/export.csv` sert de
référence pour retrouver l'ordre des commandes.
