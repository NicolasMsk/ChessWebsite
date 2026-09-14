# Offre de rentrée — livre relié à la main

Prix préparé : **39,99 € TTC, livraison comprise**, ancien prix affiché : 64,99 €.
Livre unique de 200 pages. Économie : 25 €.

## État de préparation

Les pages et la bannière sont préparées localement. **Ne pas publier avant l'activation du nouveau paiement Stripe.** Les deux boutons d'achat sont temporairement désactivés pour éviter d'envoyer un acheteur vers l'ancien prix. Aucune date de fin n'a été fixée.

## Activer le paiement

La clé `STRIPE_WEBHOOK_SECRET` existante permet de vérifier les notifications ; elle ne permet pas de créer un prix ou un Payment Link.

Avec une clé API Stripe de production autorisée à lire et créer les produits, prix et Payment Links, définir `STRIPE_SECRET_KEY` dans `api/.env.stripe` (ignoré par Git), puis exécuter depuis la racine :

```powershell
node api/create-rentree-payment-link.mjs
```

Le script crée ou retrouve le prix à 3999 centimes et le lien de paiement, collecte l'adresse de livraison en France et pose la métadonnée `product=pack_livres_relies` pour conserver le traitement des commandes existant. Il vérifie le prix et le lien, puis affiche uniquement leurs identifiants publics. Il ne débite aucun client et ne modifie pas l'ancien lien.

Dans `edition-raffinee/index.html` et `guide-apprendre-les-echecs.html`, remplacer `role="link" aria-disabled="true" data-rentree-checkout` par le `href` retourné, puis retirer le paragraphe `.rentree-payment-note`. Vérifier le montant final de 39,99 € sur Stripe avant publication. Le JSON-LD peut conserver l'URL de la page produit.

## Fin de l'offre

Retirer les inclusions de `promo-rentree.css` et `promo-rentree.js` : les anciennes bannières restent dans les pages et réapparaîtront. Rétablir le prix et le lien standard sur les pages de vente, la page cadeau, les CGV, `llms.txt` et la constante de prix dans `api/order.js`. Retirer les prix barrés, mentions de rentrée et badges d'économie. Désactiver le Payment Link de cette campagne dans Stripe pour éviter des achats promotionnels après la fin de l'offre. L'ancien lien standard est `https://buy.stripe.com/4gM4gB0KjgVQ1pj09idQQ03`.
