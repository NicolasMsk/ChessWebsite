/**
 * Logique métier des commandes du pack de livres reliés.
 *
 * Ce module est VOLONTAIREMENT dépourvu d'I/O : aucun fetch, aucun accès KV,
 * aucune horloge. Toutes les entrées arrivent par paramètre. C'est ce qui le
 * rend testable avec `node --test` sans réseau ni mock.
 */

export const PACK_PRODUCT_ID = 'pack_livres_relies';
export const PACK_AMOUNT_CENTS = 4000;
export const PACK_NAME = 'Apprendre les Échecs — Volumes I & II (édition reliée à la main)';
export const DELAI_LIVRAISON = '14 jours maximum';

/**
 * Catalogue des produits physiques vendus par Payment Link. La clé est la
 * métadonnée `product` posée sur le lien Stripe ; elle pilote le contenu des
 * emails de confirmation. Un produit inconnu retombe sur le livre relié.
 */
export const PRODUITS = {
  [PACK_PRODUCT_ID]: {
    nom: PACK_NAME,
    entete: 'Édition reliée à la main',
    sousTitre: 'Apprendre les Échecs — Volumes I & II',
    fabrication: "Je prépare votre exemplaire à la main, puis je l'expédie en Colissimo suivi.",
    consigne: 'Numéroter, signer, emballer en kraft (sans prix visible), expédier en Colissimo suivi.',
  },
  cahier_mats: {
    nom: 'Mes premiers mats en un coup — cahier d’exercices A6 cousu main',
    entete: 'Le cahier nomade N° 1',
    sousTitre: 'Mes premiers mats en un coup',
    fabrication: "J'imprime puis je couds votre cahier à la main, avant de l'expédier en envoi suivi.",
    consigne: 'Imprimer, coudre, emballer (sans prix visible), expédier en envoi suivi.',
  },
  cahier_tactiques: {
    nom: 'Mes premières tactiques — cahier d’exercices A6 cousu main',
    entete: 'Le cahier nomade N° 2',
    sousTitre: 'Mes premières tactiques',
    fabrication: "J'imprime puis je couds votre cahier à la main, avant de l'expédier en envoi suivi.",
    consigne: 'Imprimer, coudre, emballer (sans prix visible), expédier en envoi suivi.',
  },
  cahiers_pack: {
    nom: 'Les deux cahiers nomades — mats + tactiques (A6, cousus main)',
    entete: 'Les cahiers nomades',
    sousTitre: 'Mes premiers mats + Mes premières tactiques',
    fabrication: "J'imprime puis je couds vos deux cahiers à la main, avant de les expédier en envoi suivi.",
    consigne: 'Imprimer et coudre les DEUX cahiers, emballer (sans prix visible), expédier en envoi suivi.',
  },
  trio_livre_cahiers: {
    nom: 'Le trio complet — livre relié « Apprendre les Échecs » + les deux cahiers nomades',
    entete: 'Le trio complet',
    sousTitre: 'Apprendre les Échecs + les deux cahiers nomades',
    fabrication: "Je prépare votre livre relié et je couds vos deux cahiers à la main, puis j'expédie le tout ensemble en Colissimo suivi.",
    consigne: 'TRIO : livre (numéroter, signer) + les DEUX cahiers (imprimer, coudre). Emballer ensemble (sans prix visible), expédier en Colissimo suivi.',
  },
};

/** Fiche produit d'une commande ; le livre relié sert de valeur par défaut. */
export function produitDe(order) {
  return PRODUITS[order?.product] || PRODUITS[PACK_PRODUCT_ID];
}
export const SERVICE_EMAIL = 'nicolas.musicki@gmail.com';
export const SERVICE_TEL = '06 09 36 56 91';
export const SITE_URL = 'https://www.cours-echecs-paris.fr';

// ============================================================
// Utilitaires
// ============================================================

export function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Formate un montant en centimes vers un prix en euros, au format français. */
export function formatAmount(cents) {
  const n = Number(cents) || 0;
  return `${(n / 100).toFixed(2).replace('.', ',')} €`;
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// ============================================================
// Construction de l'enregistrement de commande
// ============================================================

/**
 * Extrait le bloc de livraison, où qu'il se trouve.
 *
 * L'emplacement a changé selon la version d'API Stripe :
 *   - API >= 2025-03-31 : session.collected_information.shipping_details
 *   - API <  2025-03-31 : session.shipping_details
 */
function extractShipping(session) {
  return (
    session?.collected_information?.shipping_details ||
    session?.shipping_details ||
    null
  );
}

/**
 * Vrai si la session correspond à une commande du pack de livres reliés.
 *
 * Deux critères, dans cet ordre :
 *   1. la métadonnée explicite `product` (posée si le Payment Link la définit) ;
 *   2. à défaut, la présence d'une adresse de livraison — le seul produit du
 *      site qui en collecte une est le pack de livres. Le guide PDF est délivré
 *      par le formulaire email (/subscribe) et ne passe jamais par Stripe.
 */
export function isPackSession(session) {
  if (!session) return false;
  if (session.metadata?.product === PACK_PRODUCT_ID) return true;
  const shipping = extractShipping(session);
  return Boolean(shipping?.address?.line1);
}

/**
 * Transforme une Checkout Session Stripe en enregistrement de commande.
 *
 * @param {object} session  la Checkout Session Stripe
 * @param {string} nowIso   date ISO injectée par l'appelant (pas d'horloge ici)
 */
export function buildOrderRecord(session, nowIso) {
  const s = session || {};
  const customer = s.customer_details || {};
  const shipping = extractShipping(s) || {};
  const address = shipping.address || customer.address || {};

  return {
    id: str(s.id),
    date: nowIso,
    product: str(s.metadata?.product) || PACK_PRODUCT_ID,
    email: str(customer.email || s.customer_email).toLowerCase(),
    name: str(shipping.name || customer.name),
    phone: str(customer.phone || shipping.phone),
    address: {
      line1: str(address.line1),
      line2: str(address.line2),
      postal_code: str(address.postal_code),
      city: str(address.city),
      country: str(address.country) || 'FR',
    },
    amount_total: Number(s.amount_total) || 0,
    currency: str(s.currency) || 'eur',
    payment_status: str(s.payment_status),
    status: 'a_expedier',
  };
}

/** Étiquette postale, une entrée par ligne, lignes vides omises. */
export function formatAddressLines(order) {
  const a = order.address || {};
  const villeLigne = [a.postal_code, a.city].filter(Boolean).join(' ');
  const pays = a.country === 'FR' ? 'FRANCE' : a.country;
  return [order.name, a.line1, a.line2, villeLigne, pays].filter(Boolean);
}

// ============================================================
// Email client
// ============================================================

export function orderConfirmationHtml(order) {
  const p = produitDe(order);
  const lignes = formatAddressLines(order)
    .map((l) => escapeHtml(l))
    .join('<br>');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Commande confirmee</title></head>
<body style="margin:0; padding:0; background-color:#faf6ef; font-family: Georgia, 'Times New Roman', serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#faf6ef; padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(62,44,28,0.1);">
      <tr>
        <td style="background:linear-gradient(135deg,#F0D9B5 0%,#B58863 100%); padding:36px 40px; text-align:center;">
          <div style="font-family:Georgia,serif; font-size:12px; text-transform:uppercase; letter-spacing:3px; color:#3E2C1C; opacity:0.85; margin-bottom:6px;">${escapeHtml(p.entete)}</div>
          <div style="font-family:Georgia,serif; font-size:25px; font-weight:700; color:#3E2C1C; line-height:1.2;">Votre commande est confirm&eacute;e</div>
          <div style="font-family:Georgia,serif; font-style:italic; font-size:14px; color:#3E2C1C; opacity:0.8; margin-top:8px;">${escapeHtml(p.sousTitre)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 20px; color:#3a3a3a; font-size:16px; line-height:1.65;">
          <p style="margin:0 0 20px; font-size:17px;">Bonjour,</p>
          <p style="margin:0 0 22px;">Merci beaucoup pour votre commande. Votre paiement a bien &eacute;t&eacute; re&ccedil;u, et je m'occupe de la suite.</p>

          <div style="margin:0 0 22px; padding:20px 22px; background:#faf6ef; border-left:4px solid #8B5A2B; border-radius:6px;">
            <p style="margin:0 0 12px; font-weight:700; color:#3E2C1C; font-size:15px;">R&eacute;capitulatif</p>
            <p style="margin:0 0 6px; font-size:14.5px;">${escapeHtml(p.nom)}</p>
            <p style="margin:0 0 14px; font-size:14.5px;"><strong>${formatAmount(order.amount_total)}</strong> &mdash; livraison comprise</p>
            <p style="margin:0 0 6px; font-weight:700; color:#3E2C1C; font-size:14.5px;">Adresse de livraison</p>
            <p style="margin:0; font-size:14.5px; line-height:1.55;">${lignes}</p>
          </div>

          <p style="margin:0 0 20px;">
            ${escapeHtml(p.fabrication)}
            Compte <strong>${DELAI_LIVRAISON}</strong> avant de le recevoir.
          </p>

          <p style="margin:0 0 20px;">
            Vous en avez besoin plus vite&nbsp;? R&eacute;pondez &agrave; cet email&nbsp;:
            je regarde ce que je peux faire en <strong>envoi express</strong>.
          </p>

          <p style="margin:0 0 20px;">
            Une adresse &agrave; corriger, une d&eacute;dicace &agrave; ajouter&nbsp;? R&eacute;pondez simplement &agrave; cet email&nbsp;:
            tant que le colis n'est pas parti, tout est modifiable.
          </p>

          <p style="margin:0 0 8px;">&Agrave; tr&egrave;s vite,</p>
          <p style="margin:0 0 4px; font-weight:700; color:#3E2C1C;">Nicolas Musicki</p>
          <p style="margin:0 0 24px; font-size:13px; color:#8B5A2B;">Professeur et entra&icirc;neur d'&eacute;checs &mdash; 2086 Elo FIDE</p>

          <p style="margin:26px 0 0; padding-top:18px; border-top:1px solid #e8e0cc; font-size:12.5px; color:#6a6a6a; line-height:1.6;">
            <strong style="color:#3E2C1C;">Service client</strong> &mdash;
            <a href="mailto:${SERVICE_EMAIL}" style="color:#8B5A2B;">${SERVICE_EMAIL}</a> &middot;
            ${SERVICE_TEL}<br>
            Vous disposez d'un droit de r&eacute;tractation de <strong>14 jours</strong> &agrave; compter de la r&eacute;ception.
            &Eacute;cris-moi pour l'exercer&nbsp;: je te communique l'adresse de retour sous 48&nbsp;heures ouvr&eacute;es.
            D&eacute;tails dans les <a href="${SITE_URL}/cgv.html" style="color:#8B5A2B;">conditions g&eacute;n&eacute;rales de vente</a>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#3E2C1C; padding:20px 40px; text-align:center; color:#F0D9B5; font-size:12px; letter-spacing:0.5px;">
          <a href="${SITE_URL}" style="color:#F0D9B5; text-decoration:none;">cours-echecs-paris.fr</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function orderConfirmationText(order) {
  const p = produitDe(order);
  const lignes = formatAddressLines(order).join('\n');
  return `Bonjour,

Merci beaucoup pour votre commande. Votre paiement a bien ete recu.

RECAPITULATIF
${p.nom}
${formatAmount(order.amount_total)} - livraison comprise

ADRESSE DE LIVRAISON
${lignes}

${p.fabrication}
Compte ${DELAI_LIVRAISON} avant de le recevoir.

Vous en avez besoin plus vite ? Repondez a cet email : je regarde ce que je peux faire
en envoi express.

Une adresse a corriger, une dedicace a ajouter ? Repondez simplement a cet email :
tant que le colis n'est pas parti, tout est modifiable.

A tres vite,
Nicolas Musicki
Professeur et entraineur d'echecs - 2086 Elo FIDE

---
Service client : ${SERVICE_EMAIL} - ${SERVICE_TEL}
Droit de retractation de 14 jours a compter de la reception. Ecrivez-moi pour l'exercer :
l'adresse de retour vous est communiquee sous 48 heures ouvrees.
Conditions generales de vente : ${SITE_URL}/cgv.html`;
}

// ============================================================
// Email admin (Nicolas)
// ============================================================

export function orderAdminHtml(order) {
  const etiquette = formatAddressLines(order)
    .map((l) => escapeHtml(l))
    .join('<br>');

  return `<!DOCTYPE html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif; color:#222;">
  <div style="max-width:560px; margin:20px auto; padding:22px; border:1px solid #e5e5e5; border-radius:8px;">
    <h2 style="margin:0 0 16px; color:#3E2C1C;">Nouvelle commande &mdash; ${formatAmount(order.amount_total)}</h2>

    <div style="margin:0 0 18px; padding:16px 18px; background:#faf6ef; border-left:4px solid #8B5A2B; border-radius:6px;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:#8B5A2B; margin-bottom:8px;">Etiquette d'expedition</div>
      <div style="font-family:monospace; font-size:14px; line-height:1.7; color:#111;">${etiquette}</div>
    </div>

    <p style="margin:6px 0;"><strong>Email :</strong> <a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a></p>
    <p style="margin:6px 0;"><strong>Telephone :</strong> ${escapeHtml(order.phone) || '&mdash;'}</p>
    <p style="margin:6px 0;"><strong>Produit :</strong> ${escapeHtml(produitDe(order).nom)} <span style="color:#999;">(${escapeHtml(order.product)})</span></p>
    <p style="margin:6px 0;"><strong>Montant :</strong> ${formatAmount(order.amount_total)}</p>
    <p style="margin:6px 0;"><strong>Date :</strong> ${escapeHtml(order.date)}</p>
    <p style="margin:6px 0; font-size:12px; color:#777;"><strong>Session Stripe :</strong> ${escapeHtml(order.id)}</p>

    <p style="margin:18px 0 0; padding-top:14px; border-top:1px solid #eee; font-size:13px; color:#555;">
      A faire : ${escapeHtml(produitDe(order).consigne)}
    </p>
  </div>
</body></html>`;
}

// ============================================================
// Export CSV
// ============================================================

/**
 * Échappe un champ CSV.
 * Préfixe par une apostrophe les valeurs commençant par = + - @, qui seraient
 * sinon interprétées comme des formules par Excel et LibreOffice.
 */
export function csvField(value) {
  let v = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(v) || /^[\t\r\n]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function ordersToCsv(orders) {
  const entete =
    'date,id,email,nom,telephone,adresse1,adresse2,code_postal,ville,pays,montant_eur,statut';
  const lignes = orders.map((o) =>
    [
      o.date,
      o.id,
      o.email,
      o.name,
      o.phone,
      o.address?.line1,
      o.address?.line2,
      o.address?.postal_code,
      o.address?.city,
      o.address?.country,
      ((Number(o.amount_total) || 0) / 100).toFixed(2),
      o.status,
    ]
      .map(csvField)
      .join(',')
  );
  return [entete, ...lignes].join('\n') + '\n';
}
