# OsteoFacture

Application PWA de facturation pour ostéopathes.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173 sur smartphone (même réseau WiFi) ou PC.

## Installation sur smartphone

1. Ouvrir l'app dans Chrome (Android) ou Safari (iPhone)
2. Menu → **Ajouter à l'écran d'accueil**
3. L'app fonctionne hors-ligne après la première visite

## Fonctionnalités

- **Connexion par code PIN** — chaque ostéo a son espace isolé
- Profil praticien configurable (nom, D.O., cachet, tarifs)
- **Historique** de toutes les factures générées (consultation, partage)
- Tarif auto : 30 € enfant (<18 ans), 60 € adulte
- Génération PDF identique au modèle papier
- Partage natif (WhatsApp, Mail, etc.)

## Sécurité & isolation

- Données stockées **séparément par profil** (profil, factures, cachet)
- Accès protégé par **code PIN** (4 chiffres minimum)
- Impossible de voir les factures d'un autre praticien sans son PIN
- Déconnexion via le bouton en haut à droite

## Production

```bash
npm run build
npm run preview
```

Déployer le dossier `dist/` sur Netlify, Vercel ou un hébergement statique.
