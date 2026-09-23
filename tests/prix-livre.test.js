/**
 * Garde-fou sur le prix du livre relié.
 *
 * Ces tests échouent dans trois cas :
 *   1. le prix affiché quelque part ne correspond plus à `_data/offre-livre.json` ;
 *   2. le tarif prévu après l'offre réapparaît comme prix de référence barré,
 *      alors qu'il n'a jamais été pratiqué ;
 *   3. la date de fin de l'offre est passée, ce qui force la mise à jour du
 *      prix affiché et du lien de paiement Stripe.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargerOffre, verifier } from '../scripts/prix-livre.mjs';

test('la source unique du prix est complète et cohérente', () => {
  const offre = chargerOffre();
  assert.match(offre.prix, /^\d{1,3},\d{2}$/, 'prix au format français attendu');
  assert.match(offre.prixSchema, /^\d+\.\d{2}$/, 'prix schema.org au format décimal anglais attendu');
  assert.equal(
    offre.prixCents,
    Math.round(Number(offre.prixSchema) * 100),
    'le montant en centimes doit correspondre au prix affiché'
  );
  assert.match(offre.finOffre, /^\d{4}-\d{2}-\d{2}$/, 'date de fin au format ISO attendue');
  assert.ok(offre.mention.length > 0, 'une mention d’échéance doit être définie');
});

test('le prix affiché sur le site correspond à la source unique', () => {
  // Date figée : ce test porte sur la cohérence des fichiers, pas sur l'échéance.
  const problemes = verifier({ aujourdhui: new Date('2026-01-01T12:00:00Z') });
  assert.deepEqual(
    problemes,
    [],
    `Incohérences détectées :\n  - ${problemes.join('\n  - ')}`
  );
});

test('l’offre du livre n’est pas expirée', () => {
  const offre = chargerOffre();
  const problemes = verifier().filter((p) => p.includes('a expiré'));
  assert.deepEqual(
    problemes,
    [],
    `L'offre a expiré le ${offre.finOffreTexte} : mettez à jour _data/offre-livre.json, ` +
    `lancez « node scripts/prix-livre.mjs --apply », puis recréez le lien Stripe.`
  );
});
