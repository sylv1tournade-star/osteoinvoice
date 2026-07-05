# Mise en production — OsteoFacture

## Option recommandée : Vercel ou Netlify (gratuit, 15 min)

### 1. Préparer le build

```bash
cd c:\Users\sylv1\osteo-facture
npm run build
```

Le dossier `dist/` contient l'application prête à déployer.

### 2. Déployer sur Vercel

1. Créer un compte sur [vercel.com](https://vercel.com)
2. Installer Vercel CLI : `npm i -g vercel`
3. Dans le projet : `vercel`
4. Suivre les prompts (framework : Vite)
5. URL obtenue : `https://osteo-facture-xxx.vercel.app`

### 3. Déployer sur Netlify (alternative)

1. Compte sur [netlify.com](https://netlify.com)
2. Glisser-déposer le dossier `dist/` sur netlify.com/drop
3. Ou : `npm i -g netlify-cli` puis `netlify deploy --prod --dir=dist`

### 4. Installer sur le téléphone

1. Ouvrir l'URL HTTPS dans Chrome (Android) ou Safari (iPhone)
2. Menu → **Ajouter à l'écran d'accueil**
3. L'app fonctionne comme une application native (PWA)

> **Important** : le déploiement doit être en **HTTPS** (obligatoire pour PWA et contacts).

---

## Nom de domaine personnalisé (optionnel)

- Acheter un domaine (ex. `osteofacture.fr` ~10 €/an)
- Dans Vercel/Netlify : Settings → Domains → ajouter le domaine
- Configurer les DNS chez le registrar

---

## Phase 2 — Sync cloud multi-appareils

Actuellement les données sont **locales** (localStorage du téléphone).

Pour plusieurs ostéos avec sauvegarde cloud :

| Service | Coût | Usage |
|---------|------|-------|
| **Supabase** | Gratuit jusqu'à 500 Mo | Auth + base PostgreSQL + stockage fichiers (cachet, RIB) |
| **Firebase** | Gratuit (limité) | Alternative Google |

Étapes :
1. Créer projet Supabase
2. Tables `profiles`, `invoices`, `patients` avec `user_id`
3. Remplacer `localStorage` par API Supabase
4. Chiffrement côté client pour cachet/RIB

---

## Checklist avant mise en prod

- [ ] Tester sur le téléphone de l'ostéo (Chrome Android)
- [ ] Vérifier génération PDF + partage WhatsApp
- [ ] Charger cachet et RIB → enregistrement auto OK
- [ ] Créer une facture test enfant (30 €) et adulte (60 €)
- [ ] Vérifier l'onboarding au 1er lancement
- [ ] Exporter un CSV mensuel (onglet Stats)

---

## Mises à jour

Après modification du code :

```bash
npm run build
vercel --prod
```

Les utilisateurs reçoivent la mise à jour automatiquement (PWA auto-update).

---

## Contacts téléphone

La fonction **Importer depuis mes contacts** fonctionne sur **Chrome Android** (API Contact Picker).

Sur iPhone/Safari : saisie manuelle ou carnet patients interne (historique des factures).

---

## Biométrie (Face ID / empreinte)

Prévu en phase 2 via **WebAuthn**. Actuellement : PIN + option « Rester connecté ».
