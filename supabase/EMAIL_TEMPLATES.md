# Emails Supabase — expéditeur, spam, personnalisation

## Expéditeur par défaut (sans SMTP custom)

| | |
|---|---|
| **Adresse** | `noreply@mail.app.supabase.io` |
| **Nom affiché** | Supabase (générique) |
| **Usage officiel** | Tests / dev uniquement |
| **Limite** | ~2–4 emails / heure (service partagé) |
| **Spam** | **Fréquent** — domaine partagé, mauvaise réputation globale |

Supabase indique que ce service **n’est pas prévu pour la production**.

On **ne peut pas garantir** depuis l’app que ces mails arrivent en boîte de réception.

---

## Désactiver la confirmation email (obligatoire)

1. Ouvrir [Supabase → Authentication → Providers → Email](https://supabase.com/dashboard/project/wqoqvplcetliwdcaoxve/auth/providers)
2. **Désactiver « Confirm email »**
3. **Save**

Sans ça, le compte est créé mais reste inactif jusqu’au clic dans un email.

Avec cette option off : compte **actif immédiatement** à la fin de l’onboarding OsteoFacture.

---

## Expéditeur par défaut (si emails encore envoyés)

**Project Settings → Authentication → SMTP Settings**

| Champ | Exemple Brevo |
|---|---|
| Sender email | `facturation@votredomaine.fr` |
| Sender name | `OsteoFacture` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |

**Anti-spam obligatoire :**
- Domaine à vous (pas `@gmail.com`)
- Enregistrements **SPF + DKIM** (Brevo les fournit)
- Idéalement **DMARC**

Sans domaine vérifié, Brevo peut aussi finir en spam.

---

## Personnaliser le texte

**Authentication → Email Templates** — modèles Confirm signup, Reset Password, etc.

Variables : `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`

**Authentication → URL Configuration** :
- Site URL : `https://facture-osteo.vercel.app`
- Redirect URLs : + `http://localhost:5173`

---

## Récap OsteoFacture

| Besoin | Solution |
|---|---|
| Fabrice sans friction | Désactiver confirm email |
| Emails fiables | Domaine + Brevo SMTP + SPF/DKIM |
| Texte des mails | Email Templates Supabase |
