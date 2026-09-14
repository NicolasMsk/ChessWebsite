/** Provisionnement ponctuel ; aucune clé n'est envoyée au navigateur.
 * STRIPE_SECRET_KEY doit être définie dans l'environnement ou api/.env.stripe.
 * API : https://docs.stripe.com/api/payment_links/payment_links/create
 */
import { existsSync } from 'node:fs';

const secretFile = new URL('./.env.stripe', import.meta.url);
if (existsSync(secretFile)) process.loadEnvFile(secretFile);
const secret = process.env.STRIPE_SECRET_KEY;
if (!/^(sk|rk)_live_/.test(secret || '')) {
  console.error('Clé Stripe de production absente : définir STRIPE_SECRET_KEY dans api/.env.stripe (fichier ignoré par Git).');
  process.exit(1);
}

const campaign = 'rentree-2026-livre-3999';
const site = 'https://www.cours-echecs-paris.fr';
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

try {
  const prices = await stripe('prices?lookup_keys[]=' + campaign);
  const price = prices.data[0] || await stripe('prices', {
    currency: 'eur', unit_amount: '3999', tax_behavior: 'inclusive',
    lookup_key: campaign,
    'product_data[name]': 'Apprendre les Échecs — Livre relié à la main, 200 pages — Offre de rentrée',
    'metadata[campaign]': campaign,
  }, campaign + '-price');
  if (!price.livemode || !price.active || price.unit_amount !== 3999 || price.currency !== 'eur') throw new Error('Le prix Stripe ne correspond pas à l’offre.');

  let link;
  let cursor = '';
  do {
    const page = await stripe('payment_links?limit=100' + (cursor ? '&starting_after=' + cursor : ''));
    link = page.data.find(item => item.metadata?.campaign === campaign && item.active);
    cursor = !link && page.has_more ? page.data.at(-1).id : '';
  } while (cursor);
  link ||= await stripe('payment_links', {
    'line_items[0][price]': price.id,
    'line_items[0][quantity]': '1',
    'shipping_address_collection[allowed_countries][0]': 'FR',
    'metadata[product]': 'pack_livres_relies',
    'metadata[campaign]': campaign,
    'after_completion[type]': 'redirect',
    'after_completion[redirect][url]': site + '/commande-confirmee.html',
    'custom_text[submit][message]': '39,99 € TTC, livraison comprise en France métropolitaine. Livre relié à la main, 200 pages. Livraison sous 14 jours maximum. CGV : ' + site + '/cgv.html',
  }, campaign + '-link');

  const items = await stripe('payment_links/' + link.id + '/line_items');
  if (!link.livemode || !link.active || items.data.length !== 1 || items.data[0].price.id !== price.id || items.data[0].quantity !== 1 || link.metadata?.product !== 'pack_livres_relies') {
    throw new Error('Le lien Stripe ne correspond pas à l’offre.');
  }
  console.log(JSON.stringify({ url: link.url, id: link.id, price: price.id, amount: 3999, currency: 'eur', livemode: true }, null, 2));
} catch (error) {
  // Ni en-têtes, ni clé, ni réponse brute de Stripe dans les journaux.
  console.error(error.message);
  process.exitCode = 1;
}
