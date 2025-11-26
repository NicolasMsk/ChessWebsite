# 🎯 Comment Utiliser le Visualiseur de Conversations

## Option 1 : Via Railway CLI (Recommandé si Node.js pas installé localement)

### Installation Railway CLI (une seule fois)
```bash
npm install -g @railway/cli
railway login
```

### Utilisation
```bash
cd chatbot-backend
railway run node view-conversations.js stats
railway run node view-conversations.js view 20
railway run node view-conversations.js search "tarif"
```

---

## Option 2 : Directement sur Railway (Interface Web)

1. Va sur https://railway.app
2. Ouvre ton projet "chesswebsite"
3. Clique sur "Shell" ou "Terminal"
4. Exécute :
```bash
node view-conversations.js stats
```

---

## Option 3 : Installation Node.js en local

Si tu veux l'utiliser directement sur ton PC :

### 1. Installer Node.js
Télécharge depuis https://nodejs.org (version LTS)

### 2. Utiliser le script
```bash
cd chatbot-backend
node view-conversations.js stats
```

---

## ⚡ Commandes Rapides

```bash
# Statistiques globales
node view-conversations.js stats

# Voir 20 dernières conversations
node view-conversations.js view 20

# Lister toutes les sessions
node view-conversations.js sessions

# Voir une session spécifique
node view-conversations.js session <id-session>

# Rechercher par mot-clé
node view-conversations.js search "tarif"
node view-conversations.js search "enfant"
node view-conversations.js search "Paris"
```

---

## 🔧 Alternative : Script Python (Si tu préfères)

Je peux aussi créer une version Python du script si tu préfères, qui serait plus facile à exécuter sur Windows !

Dis-moi quelle option tu préfères ! 😊
