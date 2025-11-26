# 🚀 Guide de Déploiement sur Railway (5 min)

## Pourquoi Railway ?
- ✅ **Gratuit** : $5/mois de crédits (plus que suffisant)
- ✅ **Facile** : Connexion GitHub directe
- ✅ **Automatique** : Déploiement à chaque push
- ✅ **24/7** : Ton serveur tourne en permanence

---

## Étape 1 : Créer un compte Railway

1. Va sur https://railway.app
2. Clique sur "Start a New Project"
3. Connecte-toi avec **GitHub**
4. Autorise Railway à accéder à tes repos

---

## Étape 2 : Importer ton projet

1. Clique sur "Create a New Project"
2. Sélectionne **"Deploy from GitHub"**
3. Choisis ton repo `ChessWebsite-main`
4. Selectionne le dossier racine

---

## Étape 3 : Configurer les variables d'environnement

Dans Railway, va sur "Variables" et ajoute :

```
OPENAI_API_KEY=sk-proj-XXXXX...    (ta vraie clé OpenAI)
SUPABASE_URL=https://gpLHd04kj2JQbQljPS-Uow.supabase.co
SUPABASE_SECRET_KEY=sb_secret_I39SU_4pHouttEEhUZtvdg_xNNyir5M
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://www.cours-echecs-paris.fr
```

---

## Étape 4 : Lancer le déploiement

1. Railway devrait auto-détecter que c'est un projet Node.js
2. Clique sur "Deploy"
3. Attends ~2 minutes

**C'est bon !** 🎉

---

## 📍 Récupérer ton URL de production

Une fois déployé :
1. Va dans "Deployments"
2. Clique sur la dernière version
3. Tu trouveras une URL comme : `https://chess-chatbot-xxx.railway.app`

**Cette URL remplacera `http://localhost:3000` partout !**

---

## ✏️ Mettre à jour ton code après le déploiement

Quand tu fais des changements :
1. Modifie ton code localement
2. Commit + Push vers GitHub
3. Railway redéploie automatiquement en ~1 min

---

## 🔗 Configurer ton site pour le chatbot

Dans ton `index.html`, remplace :
```javascript
const CHATBOT_CONFIG = {
  API_URL: 'http://localhost:3000',  // ❌ OLD
  API_URL: 'https://chess-chatbot-xxx.railway.app',  // ✅ NEW
  STORAGE_KEY: 'chess_chatbot_session'
};
```

---

## 🆘 Troubleshooting

**"Build failed"**
- Vérifie que `package.json` existe
- Vérifie que `server.js` existe
- Regarde les logs de build

**"Application error"**
- Vérifie les variables d'environnement
- Regarde les logs de l'app

**"CORS error"**
- Ajoute ton domaine à `CORS_ORIGIN`

---

## 📊 Monitorer ton app

Dans Railway, tu peux voir :
- **Logs** : Erreurs en temps réel
- **Metrics** : CPU, mémoire, requêtes
- **Deployments** : Historique des versions

---

**C'est tout ! Ton chatbot tourne 24/7 maintenant !** ♟️
