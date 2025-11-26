# 📊 Visualiseur de Conversations Chatbot

Script Node.js pour visualiser et analyser les conversations du chatbot.

## 🚀 Installation

Le script utilise les dépendances déjà installées (`@supabase/supabase-js` et `dotenv`).

## 📝 Commandes Disponibles

### 1. Statistiques Générales
Affiche un aperçu global des conversations :
```bash
node view-conversations.js stats
```

**Affiche :**
- Nombre total de sessions
- Nombre total de messages
- Moyenne de messages par session
- Top 5 sessions les plus actives
- 3 dernières questions posées

---

### 2. Voir les Dernières Conversations
Affiche les X dernières conversations (par défaut 10) :
```bash
node view-conversations.js view
node view-conversations.js view 20
node view-conversations.js view 50
```

**Affiche pour chaque conversation :**
- Date et heure
- ID de session (abrégé)
- Message utilisateur
- Réponse du bot

---

### 3. Lister Toutes les Sessions
Liste toutes les sessions avec leur date de création et nombre de messages :
```bash
node view-conversations.js sessions
```

**Affiche :**
- ID complet de chaque session
- Date de création
- Nombre de messages échangés

---

### 4. Voir les Conversations d'une Session Spécifique
Affiche toutes les conversations d'une session particulière :
```bash
node view-conversations.js session <session-id>
```

**Exemple :**
```bash
node view-conversations.js session a5006603-c68f-49f3-9974-f6d8e916083a
```

---

### 5. Rechercher par Mot-Clé
Recherche dans les messages utilisateurs ET les réponses du bot :
```bash
node view-conversations.js search <mot-clé>
```

**Exemples :**
```bash
node view-conversations.js search "tarif"
node view-conversations.js search "enfant"
node view-conversations.js search "Paris"
node view-conversations.js search "gratuit"
```

---

## 🎯 Exemples d'Utilisation

### Cas d'usage 1 : Vue d'ensemble rapide
```bash
node view-conversations.js stats
```

### Cas d'usage 2 : Analyser les 30 dernières conversations
```bash
node view-conversations.js view 30
```

### Cas d'usage 3 : Suivre une session client
```bash
# 1. Lister les sessions
node view-conversations.js sessions

# 2. Voir les détails d'une session
node view-conversations.js session a5006603-c68f-49f3-9974-f6d8e916083a
```

### Cas d'usage 4 : Analyser les questions sur les tarifs
```bash
node view-conversations.js search "tarif"
node view-conversations.js search "prix"
node view-conversations.js search "€"
```

---

## 🎨 Couleurs du Terminal

Le script utilise des couleurs pour faciliter la lecture :
- 🟢 **Vert** : Statistiques et informations positives
- 🔵 **Bleu** : Réponses du bot
- 🟡 **Jaune** : Avertissements et sections
- 🔴 **Rouge** : Erreurs
- 🟦 **Cyan** : Métadonnées (dates, IDs, sessions)

---

## 💡 Conseils

### Pour analyser l'engagement
```bash
node view-conversations.js stats
```
→ Regarde "Messages par session" : plus c'est élevé, plus les utilisateurs sont engagés

### Pour identifier les questions fréquentes
```bash
node view-conversations.js view 50
```
→ Analyse manuellement les patterns dans les questions

### Pour améliorer le prompt
```bash
node view-conversations.js search "pas compris"
node view-conversations.js search "erreur"
```
→ Identifie où le bot a du mal à répondre

### Pour suivre un client intéressé
```bash
node view-conversations.js sessions
# Copie l'ID de la session avec le plus de messages
node view-conversations.js session <id>
```
→ Voir le parcours complet de la conversation

---

## 🔧 Dépannage

### Erreur "Cannot find module"
```bash
cd chatbot-backend
npm install
```

### Erreur de connexion Supabase
Vérifie que ton fichier `.env` contient :
```
SUPABASE_URL=https://...
SUPABASE_SECRET_KEY=...
```

### Aucune conversation affichée
Normal si le chatbot n'a pas encore reçu de messages. Teste le chatbot sur ton site puis relance le script.

---

## 📈 Métriques Recommandées

**À surveiller chaque semaine :**
1. Nombre de nouvelles sessions
2. Messages par session (engagement)
3. Mots-clés les plus recherchés
4. Questions auxquelles le bot ne répond pas bien

**Commandes recommandées :**
```bash
# Chaque lundi matin
node view-conversations.js stats

# Si problème signalé
node view-conversations.js search "<mot problématique>"

# Pour analyser un client VIP
node view-conversations.js session <id>
```

---

## 🚀 Évolutions Possibles

Pour aller plus loin, tu pourrais :
- Exporter les stats en CSV
- Créer un dashboard web avec graphiques
- Ajouter des filtres par date
- Calculer le taux de conversion (combien demandent les coordonnées)
- Détecter automatiquement les sentiments (positif/négatif)

---

## 📞 Support

Si tu as besoin d'aide ou de nouvelles fonctionnalités, demande-moi !
