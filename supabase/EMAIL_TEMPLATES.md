# Personnaliser les emails Supabase (OsteoFacture)

Dashboard : **Authentication → Email Templates**

## Modèles disponibles

| Modèle | Usage |
|---|---|
| **Confirm signup** | Email de confirmation à la création de compte |
| **Magic Link** | Connexion sans mot de passe (non utilisé ici) |
| **Reset Password** | Mot de passe oublié |
| **Change Email Address** | Changement d’email |

## Simplifier (recommandé pour Fabrice)

**Authentication → Providers → Email** :

- Désactiver **« Confirm email »** → connexion immédiate, pas d’email à cliquer
- Les comptes sont créés directement à la fin de l’onboarding

## Personnaliser le contenu

Dans chaque template, variables Supabase :

- `{{ .ConfirmationURL }}` — lien de confirmation
- `{{ .SiteURL }}` — URL de l’app (Settings → Authentication → URL Configuration)
- `{{ .Email }}` — email du praticien

Exemple sujet **Confirm signup** :
```
Confirmez votre compte OsteoFacture
```

Exemple corps (HTML) :
```html
<p>Bonjour,</p>
<p>Cliquez pour activer votre sauvegarde cloud OsteoFacture :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon compte</a></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
```

## URL de redirection

**Authentication → URL Configuration** :

- **Site URL** : `https://facture-osteo.vercel.app` (ou votre domaine)
- **Redirect URLs** : ajouter la même URL + `http://localhost:5173` pour le dev

## SMTP custom (Brevo, optionnel)

**Project Settings → Authentication → SMTP Settings** :

- Activer custom SMTP
- Hôte Brevo : `smtp-relay.brevo.com`, port 587
- Expéditeur : `facturation@votredomaine.fr`

Utile si les emails Supabase finissent en spam. Pas nécessaire au démarrage.
