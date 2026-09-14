#!/usr/bin/env node
// Soumet des URLs à IndexNow (Bing, Yandex, Seznam, Naver, Yep).
// Google n'utilise pas IndexNow.
//
// Usage :
//   node scripts/indexnow.mjs                      -> toutes les URLs du sitemap.xml
//   node scripts/indexnow.mjs https://... https://... -> URLs données
//
// La clé doit être hébergée à la racine : https://www.cours-echecs-paris.fr/<KEY>.txt

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HOST = "www.cours-echecs-paris.fr";
const KEY = "3de095a7ae8c4792af54b28df371a398";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function urlsFromSitemap() {
  const xml = readFileSync(join(root, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

const urlList = process.argv.length > 2 ? process.argv.slice(2) : urlsFromSitemap();

const bad = urlList.filter((u) => !u.startsWith(`https://${HOST}/`));
if (bad.length) {
  console.error("URLs hors du host, refusées :\n" + bad.join("\n"));
  process.exit(1);
}
if (urlList.length === 0) {
  console.error("Aucune URL à soumettre.");
  process.exit(1);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList,
};

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`IndexNow -> HTTP ${res.status} ${res.statusText} pour ${urlList.length} URL(s)`);
if (text.trim()) console.log(text.trim());

const meaning = {
  200: "OK : URLs reçues.",
  202: "Acceptées : validation de la clé en attente (normal au premier envoi).",
  400: "Format invalide.",
  403: "Clé refusée : fichier clé absent ou contenu différent.",
  422: "URLs hors du host ou clé non conforme.",
  429: "Trop de requêtes.",
};
console.log(meaning[res.status] ?? "Code inattendu.");
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
