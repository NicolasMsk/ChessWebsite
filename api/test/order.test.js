import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACK_PRODUCT_ID,
  PACK_AMOUNT_CENTS,
  buildOrderRecord,
  formatAddressLines,
  formatAmount,
  isPackSession,
  orderConfirmationHtml,
  orderConfirmationText,
  orderAdminHtml,
  ordersToCsv,
} from '../order.js';

// ---------- Constantes ----------

test('le prix du pack est de 64,99 € en centimes', () => {
  assert.equal(PACK_AMOUNT_CENTS, 6499);
});

test('formatAmount convertit les centimes en euros français', () => {
  assert.equal(formatAmount(6499), '64,99 €');
  assert.equal(formatAmount(0), '0,00 €');
  assert.equal(formatAmount(100), '1,00 €');
});

// ---------- buildOrderRecord ----------

const sessionModerne = {
  id: 'cs_test_abc123',
  payment_status: 'paid',
  amount_total: 6499,
  currency: 'eur',
  customer_details: { email: 'Client@Exemple.FR ', phone: '+33612345678' },
  collected_information: {
    shipping_details: {
      name: 'Marie Dupont',
      address: {
        line1: '12 rue des Lilas',
        line2: 'Bât. B, 3e étage',
        postal_code: '75011',
        city: 'Paris',
        country: 'FR',
      },
    },
  },
};

test('buildOrderRecord lit collected_information.shipping_details (API récente)', () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  assert.equal(order.id, 'cs_test_abc123');
  assert.equal(order.email, 'client@exemple.fr');
  assert.equal(order.name, 'Marie Dupont');
  assert.equal(order.phone, '+33612345678');
  assert.equal(order.address.line1, '12 rue des Lilas');
  assert.equal(order.address.city, 'Paris');
  assert.equal(order.amount_total, 6499);
  assert.equal(order.status, 'a_expedier');
  assert.equal(order.product, PACK_PRODUCT_ID);
  assert.equal(order.date, '2026-08-19T18:00:00.000Z');
});

test('buildOrderRecord lit shipping_details à la racine (API ancienne)', () => {
  const session = {
    id: 'cs_test_old',
    payment_status: 'paid',
    amount_total: 6499,
    currency: 'eur',
    customer_details: { email: 'vieux@exemple.fr' },
    shipping_details: {
      name: 'Jean Martin',
      address: { line1: '5 avenue Foch', postal_code: '78000', city: 'Versailles', country: 'FR' },
    },
  };
  const order = buildOrderRecord(session, '2026-08-19T18:00:00.000Z');
  assert.equal(order.name, 'Jean Martin');
  assert.equal(order.address.city, 'Versailles');
});

test('buildOrderRecord se replie sur customer_details.address si aucune livraison', () => {
  const session = {
    id: 'cs_test_fallback',
    payment_status: 'paid',
    amount_total: 6499,
    currency: 'eur',
    customer_details: {
      email: 'repli@exemple.fr',
      name: 'Paul Repli',
      address: { line1: '1 place Vendôme', postal_code: '75001', city: 'Paris', country: 'FR' },
    },
  };
  const order = buildOrderRecord(session, '2026-08-19T18:00:00.000Z');
  assert.equal(order.name, 'Paul Repli');
  assert.equal(order.address.line1, '1 place Vendôme');
});

test('buildOrderRecord ne plante pas sur une session vide', () => {
  const order = buildOrderRecord({}, '2026-08-19T18:00:00.000Z');
  assert.equal(order.email, '');
  assert.equal(order.name, '');
  assert.equal(order.address.line1, '');
  assert.equal(order.address.country, 'FR');
});

// ---------- formatAddressLines ----------

test('formatAddressLines produit une étiquette postale prête à copier', () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  assert.deepEqual(formatAddressLines(order), [
    'Marie Dupont',
    '12 rue des Lilas',
    'Bât. B, 3e étage',
    '75011 Paris',
    'FRANCE',
  ]);
});

test('formatAddressLines omet les lignes vides', () => {
  const order = buildOrderRecord(
    {
      id: 'cs_x',
      customer_details: { email: 'a@b.fr' },
      shipping_details: {
        name: 'Sans Complement',
        address: { line1: '2 rue Courte', postal_code: '69001', city: 'Lyon', country: 'FR' },
      },
    },
    '2026-08-19T18:00:00.000Z'
  );
  assert.deepEqual(formatAddressLines(order), [
    'Sans Complement',
    '2 rue Courte',
    '69001 Lyon',
    'FRANCE',
  ]);
});

// ---------- Emails ----------

test("l'email client contient le montant, l'adresse et le délai", () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const html = orderConfirmationHtml(order);
  assert.match(html, /64,99/);
  assert.match(html, /12 rue des Lilas/);
  assert.match(html, /5 à 10 jours ouvrés/);
  assert.match(html, /nicolas\.musicki@gmail\.com/);
  assert.match(html, /14 jours/);
  assert.match(html, /50/); // mention de la série limitée
});

test("l'email client échappe le HTML des champs saisis par le client", () => {
  const session = {
    ...sessionModerne,
    collected_information: {
      shipping_details: {
        name: '<script>alert(1)</script>',
        address: { line1: 'a', postal_code: '1', city: 'b', country: 'FR' },
      },
    },
  };
  const html = orderConfirmationHtml(buildOrderRecord(session, '2026-08-19T18:00:00.000Z'));
  assert.ok(!html.includes('<script>alert(1)</script>'), 'le script ne doit pas être injecté brut');
  assert.match(html, /&lt;script&gt;/);
});

test("la version texte de l'email client est non vide et sans balise", () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const txt = orderConfirmationText(order);
  assert.ok(txt.length > 200);
  assert.ok(!txt.includes('<'), 'la version texte ne doit contenir aucune balise');
  assert.match(txt, /64,99/);
});

test("l'email admin contient l'étiquette d'expédition et l'identifiant Stripe", () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const html = orderAdminHtml(order);
  assert.match(html, /Marie Dupont/);
  assert.match(html, /75011 Paris/);
  assert.match(html, /FRANCE/);
  assert.match(html, /cs_test_abc123/);
  assert.match(html, /64,99/);
});

// ---------- Aiguillage produit ----------

test('isPackSession reconnaît une commande de livres à son adresse de livraison', () => {
  assert.equal(isPackSession(sessionModerne), true);
});

test('isPackSession reconnaît la métadonnée explicite si elle est posée', () => {
  assert.equal(
    isPackSession({ metadata: { product: PACK_PRODUCT_ID }, payment_status: 'paid' }),
    true
  );
});

test('isPackSession rejette un paiement sans adresse ni métadonnée', () => {
  assert.equal(isPackSession({ customer_details: { email: 'x@y.fr' } }), false);
  assert.equal(isPackSession({ metadata: {} }), false);
  assert.equal(isPackSession({}), false);
  assert.equal(isPackSession(null), false);
});

// ---------- CSV ----------

test('ordersToCsv produit un en-tête et une ligne par commande', () => {
  const order = buildOrderRecord(sessionModerne, '2026-08-19T18:00:00.000Z');
  const csv = ordersToCsv([order]);
  const lignes = csv.trim().split('\n');
  assert.equal(lignes.length, 2);
  assert.equal(
    lignes[0],
    'date,id,email,nom,telephone,adresse1,adresse2,code_postal,ville,pays,montant_eur,statut'
  );
  assert.match(lignes[1], /Marie Dupont/);
  assert.match(lignes[1], /64\.99/);
});

test('ordersToCsv neutralise les injections de formule et les guillemets', () => {
  const order = buildOrderRecord(
    {
      id: 'cs_inj',
      customer_details: { email: 'x@y.fr' },
      shipping_details: {
        name: '=SOMME(A1:A9)',
        address: { line1: 'rue du "Test"', postal_code: '1', city: 'V', country: 'FR' },
      },
    },
    '2026-08-19T18:00:00.000Z'
  );
  const csv = ordersToCsv([order]);
  assert.match(csv, /"'=SOMME\(A1:A9\)"/, 'la formule doit être préfixée par une apostrophe');
  assert.match(csv, /rue du ""Test""/, 'les guillemets doivent être doublés');
});
