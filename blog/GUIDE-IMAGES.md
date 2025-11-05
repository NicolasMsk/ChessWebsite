# 📸 GUIDE OPTIMISATION IMAGES BLOG

## 🎯 FORMATS RECOMMANDÉS (par ordre de priorité)

### 1. WebP ⭐⭐⭐⭐⭐
- **Extension** : `.webp`
- **Poids** : 70-90% plus léger que JPEG
- **Support** : Universel (2025)
- **Usage** : Format principal recommandé

### 2. AVIF ⭐⭐⭐⭐
- **Extension** : `.avif`
- **Poids** : 50% plus léger que WebP
- **Support** : Chrome, Firefox, Safari récents
- **Usage** : En complément de WebP (fallback)

### 3. JPEG ⭐⭐⭐
- **Extension** : `.jpg`
- **Usage** : Fallback ultime
- **Qualité** : 80-85% pour un bon compromis

---

## 📏 DIMENSIONS OPTIMALES

### Images principales d'articles :
```
Largeur : 1200px
Hauteur : 630px
Ratio : 1.91:1 (Open Graph)
Poids max : 150KB
```

### Miniatures blog :
```
Largeur : 400px
Hauteur : 250px
Ratio : 1.6:1
Poids max : 50KB
```

### Images dans les articles :
```
Largeur max : 800px
Hauteur : Automatique
Poids max : 100KB
```

---

## 🛠️ OUTILS DE CONVERSION

### En ligne (gratuit) :
- **Squoosh.app** (Google) - Meilleur qualité/poids
- **TinyPNG** - Simple et efficace
- **Convertio** - Nombreux formats

### Logiciels :
- **Photoshop** - Plugin WebP/AVIF
- **GIMP** - Gratuit avec plugins
- **ImageOptim** (Mac)

---

## 💻 IMPLÉMENTATION TECHNIQUE

### HTML Optimal :
```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description précise" loading="lazy">
</picture>
```

### CSS Responsive :
```css
img {
  max-width: 100%;
  height: auto;
  object-fit: cover;
}
```

---

## ✅ CHECKLIST AVANT PUBLICATION

- [ ] Format WebP utilisé
- [ ] Poids < 150KB pour images principales
- [ ] Alt text descriptif et SEO
- [ ] Dimensions appropriées
- [ ] Lazy loading activé
- [ ] Fallback JPEG disponible

---

## 🚀 IMPACT PERFORMANCE

**Avant optimisation :**
- JPEG 500KB → Temps de chargement : 2-3s

**Après optimisation :**
- WebP 80KB → Temps de chargement : 0.3s
- **Gain : 85% plus rapide !**

---

## 📊 SEO BENEFITS

1. **Page Speed** ↗️ (facteur de ranking Google)
2. **Core Web Vitals** ↗️ (LCP amélioré)
3. **Expérience utilisateur** ↗️
4. **Taux de rebond** ↘️
5. **Conversion mobile** ↗️

---

*Guide créé pour le blog de Nicolas Musicki - Cours d'Échecs Paris*
*Dernière mise à jour : Novembre 2025*