#!/usr/bin/env node
/**
 * Synchronise le prix du livre relié depuis sa source unique `_data/offre-livre.json`.
 *
 * Pourquoi ce script existe : le prix vivait en dur dans sept fichiers (page de
 * vente, page du guide, page cadeau, CGV, llms.txt, bandeau, Worker). Un
 * changement de tarif demandait sept éditions manuelles, avec un risque réel
 * d'écart entre le prix affiché et le montant réellement encaissé par Stripe.
 *
 * Le prix reste écrit en dur dans le HTML livré — et non injecté en JavaScript —
 * pour que Google et les visiteurs sans JS voient le vrai prix. Ce script est
 * donc un outil d'écriture, pas un mécanisme d'exécution.
 *
 * Usage :
 *   node scripts/prix-livre.mjs --check    vérifie la cohérence (utilisé par les tests)
 *   node scripts/prix-livre.mjs --apply    réécrit les fichiers depuis la source
 *
 * Après un changement de prix, il reste DEUX actions manuelles :
 *   1. recréer le lien de paiement Stripe (api/create-rentree-payment-link.mjs)
 *      et reporter la nouvelle URL dans edition-raffinee/index.html ;
 *   2. vérifier le montant dans le tableau de bord Stripe.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fichiers publiés qui portent le prix du livre. */
const FICHIERS_PRIX = [
  'edition-raffinee/index.html',
  'guide-apprendre-les-echecs.html',
  'idee-cadeau-echecs.html',
  'cgv.html',
  'llms.txt',
  'promo-rentree.js',
  'api/order.js',
];

/** Dossiers jamais publiés ou hors périmètre du site. */
const DOSSIERS_IGNORES = new Set([
  '.git', '.claude', '.playwright-mcp', 'node_modules', 'temp', 'docs', 'tests',
  'scripts', 'ebook', 'campagnes-email', 'analytics-local', 'api', '_data', 'fichiers', 'images',
]);

const EXTENSIONS_SCANNEES = new Set(['.html', '.js', '.css', '.txt']);

export function chargerOffre() {
  return JSON.parse(readFileSync(join(RACINE, '_data/offre-livre.json'), 'utf8'));
}

/**
 * Règles de réécriture. Chacune est idempotente : l'appliquer deux fois donne
 * le même résultat. C'est ce qui permet à --check de simplement comparer le
 * résultat en mémoire avec le contenu du disque.
 */
function reglesPour(offre) {
  return [
    {
      nom: 'montant affiché (virgule + € ou euros)',
      // Ancré sur l'unité monétaire : les valeurs rgba(255,255,255,0.25) et
      // autres décimales CSS ne sont donc jamais touchées. Les tarifs de cours
      // sont des entiers (40 €, 50 €) et restent hors de portée.
      regex: /\d{1,3},\d{2}(&nbsp;| )?(€|euros)/g,
      remplacer: (_m, sep, unite) => `${offre.prix}${sep || ''}${unite}`,
    },
    {
      nom: 'prix dans les données structurées',
      regex: /("price":\s*")\d+\.\d{2}(")/g,
      remplacer: (_m, avant, apres) => `${avant}${offre.prixSchema}${apres}`,
    },
    {
      nom: 'date de validité dans les données structurées',
      regex: /("priceValidUntil":\s*")[^"]*(")/g,
      remplacer: (_m, avant, apres) => `${avant}${offre.finOffre}${apres}`,
    },
    {
      nom: 'montant en centimes du Worker',
      regex: /(PACK_AMOUNT_CENTS\s*=\s*)\d+/g,
      remplacer: (_m, avant) => `${avant}${offre.prixCents}`,
    },
    {
      nom: 'mention d’échéance de l’offre',
      regex: /Offre jusqu[’']au \d{1,2} [a-zûéôA-Zûéô]+/g,
      remplacer: () => offre.mention,
    },
  ];
}

function transformer(contenu, offre) {
  return reglesPour(offre).reduce(
    (texte, regle) => texte.replace(regle.regex, regle.remplacer),
    contenu
  );
}

/** Parcourt les fichiers publiés pour les contrôles d'interdiction. */
function fichiersPublies(dossier = RACINE, acc = []) {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      // Les dossiers « … _files » sont des pages sauvegardées depuis un
      // navigateur (déchet ignoré par .gitignore) : ne pas les analyser.
      if (!DOSSIERS_IGNORES.has(entree) && !entree.endsWith('_files')) {
        fichiersPublies(chemin, acc);
      }
      continue;
    }
    const point = entree.lastIndexOf('.');
    if (point > 0 && EXTENSIONS_SCANNEES.has(entree.slice(point))) acc.push(chemin);
  }
  return acc;
}

/**
 * Vérifie la cohérence. Retourne la liste des problèmes (vide si tout va bien).
 */
export function verifier({ aujourdhui = new Date() } = {}) {
  const offre = chargerOffre();
  const problemes = [];

  // 1. Le prix écrit sur le disque correspond-il à la source ?
  for (const relatif of FICHIERS_PRIX) {
    const contenu = readFileSync(join(RACINE, relatif), 'utf8');
    const attendu = transformer(contenu, offre);
    if (contenu !== attendu) {
      problemes.push(
        `${relatif} : le prix ou la date ne correspond pas à _data/offre-livre.json. ` +
        `Lancez « node scripts/prix-livre.mjs --apply ».`
      );
    }
  }

  // 2. Le tarif prévu après l'offre n'a jamais été pratiqué : il ne doit
  //    apparaître nulle part dans les pages publiées, ni barré, ni autrement.
  const interdits = [
    { motif: offre._prixPrevuApresOffre, raison: 'tarif jamais pratiqué, interdit comme prix de référence' },
    { motif: 'rentree-price-was', raison: 'classe du prix barré supprimé' },
    { motif: 'Ancien prix', raison: 'libellé de prix de référence supprimé' },
  ];
  for (const chemin of fichiersPublies()) {
    const contenu = readFileSync(chemin, 'utf8');
    for (const { motif, raison } of interdits) {
      if (contenu.includes(motif)) {
        problemes.push(`${relative(RACINE, chemin).split(sep).join('/')} : contient « ${motif} » (${raison}).`);
      }
    }
  }

  // 3. Garde-fou temporel : au lendemain de l'échéance, la vérification échoue
  //    pour forcer la mise à jour du prix affiché et du lien Stripe.
  const fin = new Date(`${offre.finOffre}T23:59:59+02:00`);
  if (aujourdhui > fin) {
    problemes.push(
      `L'offre du livre a expiré le ${offre.finOffreTexte}. Mettez à jour _data/offre-livre.json ` +
      `(prix et date), lancez « node scripts/prix-livre.mjs --apply », puis recréez le lien de ` +
      `paiement Stripe et reportez sa nouvelle URL dans edition-raffinee/index.html.`
    );
  }

  return problemes;
}

/** Réécrit les fichiers depuis la source. Retourne la liste des fichiers modifiés. */
export function appliquer() {
  const offre = chargerOffre();
  const modifies = [];
  for (const relatif of FICHIERS_PRIX) {
    const chemin = join(RACINE, relatif);
    const contenu = readFileSync(chemin, 'utf8');
    const nouveau = transformer(contenu, offre);
    if (contenu !== nouveau) {
      writeFileSync(chemin, nouveau);
      modifies.push(relatif);
    }
  }
  return modifies;
}

// ============================================================
// Interface en ligne de commande
// ============================================================
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  const offre = chargerOffre();

  if (mode === '--apply') {
    const modifies = appliquer();
    console.log(`Prix appliqué : ${offre.prix} € — ${offre.mention}`);
    console.log(modifies.length ? `Fichiers réécrits :\n  ${modifies.join('\n  ')}` : 'Aucun fichier à modifier.');
    const restants = verifier();
    if (restants.length) {
      console.error(`\nIl reste ${restants.length} point(s) à traiter à la main :`);
      for (const p of restants) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.log('\nRappel : recréez le lien de paiement Stripe si le montant a changé.');
  } else if (mode === '--check') {
    const problemes = verifier();
    if (problemes.length) {
      console.error(`Prix du livre — ${problemes.length} problème(s) :`);
      for (const p of problemes) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.log(`Prix du livre cohérent : ${offre.prix} € jusqu'au ${offre.finOffreTexte}.`);
  } else {
    console.error('Usage : node scripts/prix-livre.mjs --check | --apply');
    process.exit(2);
  }
}
