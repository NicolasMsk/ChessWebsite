/** Provisionnement ponctuel des liens de paiement des cahiers d'exercices.
 * Idempotent : relancer le script retrouve les prix (lookup_key) et les liens
 * (métadonnée campaign) existants au lieu d'en créer de nouveaux.
 * STRIPE_SECRET_KEY doit être définie dans l'environnement ou api/.env.stripe.
 * Aucune clé ni réponse brute de Stripe dans les journaux.
 */
import { existsSync } from 'node:fs';

const secretFile = new URL('./.env.stripe', import.meta.url);
if (existsSync(secretFile)) process.loadEnvFile(secretFile);
const secret = process.env.STRIPE_SECRET_KEY;
if (!/^(sk|rk)_live_/.test(secret || '')) {
  console.error('Clé Stripe de production absente : définir STRIPE_SECRET_KEY dans api/.env.stripe (fichier ignoré par Git).');
  process.exit(1);
}

const site = 'https://www.cours-echecs-paris.fr';

/** Un produit par lien ; `product` est la métadonnée lue par le webhook (api/order.js). */
const CAHIERS = [
  {
    campaign: 'cahier-mats-1500',
    product: 'cahier_mats',
    amount: 1500,
    name: 'Mes premiers mats en un coup — cahier d’exercices A6 cousu main',
    message: '15 € TTC, envoi compris en France métropolitaine. Cahier A6 couleur cousu main, 50 exercices avec solutions au verso. Expédition sous 14 jours maximum. CGV : ' + site + '/cgv.html',
  },
  {
    campaign: 'cahier-tactiques-1500',
    product: 'cahier_tactiques',
    amount: 1500,
    name: 'Mes premières tactiques — cahier d’exercices A6 cousu main',
    message: '15 € TTC, envoi compris en France métropolitaine. Cahier A6 couleur cousu main, 50 exercices avec solutions au verso. Expédition sous 14 jours maximum. CGV : ' + site + '/cgv.html',
  },
  {
    campaign: 'cahiers-pack-2500',
    product: 'cahiers_pack',
    amount: 2500,
    name: 'Les deux cahiers nomades — mats + tactiques (A6, cousus main)',
    message: '25 € TTC les deux cahiers, envoi compris en France métropolitaine. Cahiers A6 couleur cousus main. Expédition sous 14 jours maximum. CGV : ' + site + '/cgv.html',
  },
];

async function stripe(path, values, idempotencyKey) {
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: values ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + secret,
      ...(values ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: values ? new URLSearchParams(values) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Stripe : HTTP ' + response.status + ' (' + (data.error?.code || data.error?.type || 'erreur') + ')');
  return data;
}

/** Tous les liens actifs, paginés une seule fois pour les trois produits. */
async function liensActifs() {
  const liens = [];
  let cursor = '';
  do {
    const page = await stripe('payment_links?limit=100' + (cursor ? '&starting_after=' + cursor : ''));
    liens.push(...page.data.filter((l) => l.active));
    cursor = page.has_more ? page.data.at(-1).id : '';
  } while (cursor);
  return liens;
}

try {
  const existants = await liensActifs();
  const resultat = {};
  for (const c of CAHIERS) {
    const prices = await stripe('prices?lookup_keys[]=' + c.campaign);
    const price = prices.data[0] || await stripe('prices', {
      currency: 'eur', unit_amount: String(c.amount), tax_behavior: 'inclusive',
      lookup_key: c.campaign,
      'product_data[name]': c.name,
      'metadata[campaign]': c.campaign,
    }, c.campaign + '-price');
    if (!price.livemode || !price.active || price.unit_amount !== c.amount || price.currency !== 'eur') {
      throw new Error('Le prix Stripe de ' + c.campaign + ' ne correspond pas à l’offre.');
    }

    let link = existants.find((l) => l.metadata?.campaign === c.campaign);
    link ||= await stripe('payment_links', {
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      'shipping_address_collection[allowed_countries][0]': 'FR',
      'metadata[product]': c.product,
      'metadata[campaign]': c.campaign,
      'after_completion[type]': 'redirect',
      'after_completion[redirect][url]': site + '/commande-confirmee.html',
      'custom_text[submit][message]': c.message,
    }, c.campaign + '-link');

    const items = await stripe('payment_links/' + link.id + '/line_items');
    if (!link.livemode || !link.active || items.data.length !== 1 || items.data[0].price.id !== price.id || items.data[0].quantity !== 1 || link.metadata?.product !== c.product) {
      throw new Error('Le lien Stripe de ' + c.campaign + ' ne correspond pas à l’offre.');
    }
    resultat[c.product] = { url: link.url, id: link.id, amount: c.amount };
  }
  console.log(JSON.stringify(resultat, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
