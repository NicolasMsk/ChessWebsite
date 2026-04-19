# API maison — Lead Magnet "Guide Volume 1"

Tout le système d'inscription + envoi du PDF dans **un seul fichier Worker** (`worker.js`).
Stockage KV Cloudflare (base de données) + envoi email via Resend.

---

## 🚀 Déploiement — checklist (30 min max)

### Pré-requis

- [ ] Compte **Cloudflare** (gratuit) — [cloudflare.com](https://cloudflare.com)
- [ ] Compte **Resend** (gratuit, 3 000 emails/mois) — [resend.com](https://resend.com)
- [ ] **Node.js** installé localement (pour Wrangler)
- [ ] Domaine `cours-echecs-paris.fr` **vérifié sur Resend** (DNS records ajoutés)

---

### 1. Installer Wrangler (CLI Cloudflare)

```bash
npm install -g wrangler
```

Puis se logger :

```bash
wrangler login
```

### 2. Créer le namespace KV (la base de données)

```bash
cd api
wrangler kv:namespace create SUBSCRIBERS
```

Cette commande sort un ID du type `id = "abc123..."`. **Copie cet ID** et colle-le dans `wrangler.toml` à la place de `REMPLACER_PAR_ID_KV`.

### 3. Configurer les secrets

Ta clé API Resend :

```bash
wrangler secret put RESEND_API_KEY
# Colle ta clé Resend (re_...) quand demandé
```

Un token admin (invente une chaîne aléatoire, ex : `openssl rand -hex 32`) :

```bash
wrangler secret put ADMIN_TOKEN
# Colle le token que tu viens d'inventer
```

Garde le token admin précieusement — il te permet de lister/exporter les inscrits.

### 4. Déployer

```bash
wrangler deploy
```

Wrangler affiche l'URL du Worker, du type :
```
https://chess-lead-magnet.TON-NOM.workers.dev
```

**Copie cette URL** et mets-la dans `ebook-gratuit.html` (champ `WORKER_URL` dans le script).

---

## 🔌 Endpoints disponibles

### `POST /subscribe`

Inscription + envoi du PDF.

**Requête :**
```json
{
  "email": "user@exemple.com",
  "why": "guide_achat_gratuit"
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Parfait ! Ton guide arrive dans ta boîte mail..."
}
```

### `GET /subscribers`

Liste JSON de tous les inscrits (auth Bearer).

```bash
curl https://chess-lead-magnet.TON-NOM.workers.dev/subscribers \
  -H "Authorization: Bearer TON_ADMIN_TOKEN"
```

### `GET /subscribers/export.csv`

Export CSV (auth Bearer).

```bash
curl https://chess-lead-magnet.TON-NOM.workers.dev/subscribers/export.csv \
  -H "Authorization: Bearer TON_ADMIN_TOKEN" \
  -o inscrits.csv
```

---

## 📋 Structure des données (KV)

Chaque inscrit = 2 entrées KV :

```
Clé : subscriber:<uuid>
Valeur : {
  "id": "uuid-v4",
  "email": "user@exemple.com",
  "date": "2026-04-19T14:35:22.000Z",
  "why": "guide_achat_gratuit"
}

Clé : email:<email>
Valeur : "<uuid>"  (utilisé pour la détection de doublons)
```

---

## 🔧 Mise à jour / redéploiement

Après avoir modifié `worker.js` :

```bash
cd api
wrangler deploy
```

Pas besoin de toucher aux secrets ni à la KV.

---

## 🧪 Test en local (avant déploiement)

```bash
cd api
wrangler dev
```

Ça lance une version locale sur `http://localhost:8787`. Tu peux tester avec :

```bash
curl -X POST http://localhost:8787/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","why":"test"}'
```

---

## ❓ Support

Si un souci :
- Logs des requêtes : `wrangler tail`
- Dashboard Cloudflare → Workers → ton worker → Logs
- Dashboard Resend → Logs pour voir les envois d'emails
