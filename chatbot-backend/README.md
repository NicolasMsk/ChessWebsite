# Chess Chatbot Backend - Setup Guide

## 🎯 Quick Start

### 1. Installation des dépendances
```bash
cd chatbot-backend
npm install
```

### 2. Configuration
Remplace dans `.env` :
```
OPENAI_API_KEY=ta_clé_openai_ici
SUPABASE_URL=https://gpLHd04kj2JQbQljPS-Uow.supabase.co
SUPABASE_SECRET_KEY=sb_secret_I39SU_4pHouttEEhUZtvdg_xNNyir5M
```

### 3. Lancer le serveur
```bash
npm start
```

Ou en mode développement:
```bash
npm run dev
```

Le serveur tourne sur `http://localhost:3000`

---

## 📁 Structure des fichiers

```
chatbot-backend/
├── .env                      # Configuration (secrets)
├── .env.example              # Exemple de config
├── package.json              # Dépendances Node
├── server.js                 # Backend Express + OpenAI
├── prompt.txt                # System Prompt pour GPT-4
├── chatbot-widget.html       # Widget à intégrer
├── chatbot-style.css         # Styles du widget
└── README.md                 # Ce fichier
```

---

## 🔌 Intégrer le widget sur ton site

### Étape 1: Ajouter le CSS
Avant `</head>` dans tes HTML :
```html
<link rel="stylesheet" href="https://example.com/chatbot-style.css">
```

### Étape 2: Ajouter le widget
Avant `</body>` dans tes HTML :
```html
<div id="chess-chatbot-widget"></div>
<script src="https://example.com/chatbot-widget.js"></script>
```

### Étape 3: Configurer l'URL API
Dans `chatbot-widget.html`, change:
```javascript
const CHATBOT_CONFIG = {
  API_URL: 'https://ta-api.example.com',  // ← Change ici
  STORAGE_KEY: 'chess_chatbot_session'
};
```

---

## 🚀 Déploiement

### Option 1: Heroku (Gratuit)
```bash
heroku create nom-app
git push heroku main
```

### Option 2: Railway.app (Recommandé)
1. Connecte ton GitHub
2. Importe ce repo
3. Ajoute les variables d'environnement
4. Deploy!

### Option 3: Vercel + Serverless Function
Crée `api/chat.js` pour une function serverless

---

## 📊 API Endpoints

### POST /api/chat
Envoie un message et reçoit une réponse

**Request:**
```json
{
  "message": "Comment apprendre les pions ?",
  "sessionId": "session_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Les pions sont les petits soldats...",
  "sessionId": "session_xxx"
}
```

### GET /api/history/:sessionId
Récupère l'historique complet d'une session

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "session_id": "session_xxx",
      "message_user": "Question",
      "response_ai": "Réponse",
      "timestamp": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### GET /health
Vérification que le serveur est actif

---

## 🔐 Sécurité

✅ Les clés secrètes sont dans `.env` (jamais commitées)
✅ CORS configuré
✅ Rate limiting recommandé en production
✅ Validation des inputs

---

## 🎨 Personnalisation

### Changer les couleurs
Modifie `chatbot-style.css`:
```css
:root {
  --primary-color: #d4af37;      /* Or */
  --secondary-color: #1a1a1a;    /* Noir */
  --accent-color: #3a6ea5;       /* Bleu */
}
```

### Changer le prompt
Édite `prompt.txt` ou `server.js` (variable `SYSTEM_PROMPT`)

### Changer le logo
Remplace `♞` par un emoji ou un SVG

---

## 🐛 Troubleshooting

**Erreur: "Cannot find module 'openai'"**
```bash
npm install openai
```

**Erreur CORS**
Ajoute ton domaine dans `.env`:
```
CORS_ORIGIN=http://localhost:3000,https://www.cours-echecs-paris.fr
```

**Erreur Supabase connection**
Vérifie tes clés dans `.env`

---

## 📞 Support

Pour des questions, visite:
- https://www.cours-echecs-paris.fr
- Contact: contact@cours-echecs-paris.fr

Créé avec ❤️ par Nicolas Musicki
