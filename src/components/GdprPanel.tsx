import type { PractitionerProfile } from '../types'
import { exportPractitionerDataJson, downloadBlob } from '../lib/export'

interface Props {
  profile: PractitionerProfile
}

export function GdprPanel({ profile }: Props) {
  function handleExportData() {
    const blob = exportPractitionerDataJson(profile.id)
    downloadBlob(blob, `osteofacture_export_${profile.id.slice(0, 8)}.json`)
  }

  return (
    <section className="gdpr-panel">
      <h3>Données personnelles (RGPD)</h3>
      <p className="field-hint">
        OsteoFacture traite des données de santé (noms, dates de naissance, consultations).
        En tant que praticien, vous êtes <strong>responsable de traitement</strong> ;
        l&apos;application vous aide à respecter vos obligations.
      </p>

      <details className="gdpr-block">
        <summary>Base légale & finalités</summary>
        <ul>
          <li><strong>Facturation</strong> — exécution du contrat de soins (art. 6.1.b RGPD)</li>
          <li><strong>Comptabilité</strong> — obligation légale (art. 6.1.c — conservation 10 ans des pièces)</li>
          <li><strong>Données patients</strong> — pas de revente, pas de publicité, pas de profilage</li>
        </ul>
      </details>

      <details className="gdpr-block">
        <summary>Données collectées</summary>
        <ul>
          <li>Praticien : identité, coordonnées, cachet, RIB, tarifs</li>
          <li>Patient : nom, prénom, date de naissance, email/tél. (optionnels)</li>
          <li>Consultation : date, montant, mode de paiement, n° de facture</li>
        </ul>
      </details>

      <details className="gdpr-block">
        <summary>Durées de conservation</summary>
        <ul>
          <li><strong>Factures</strong> : 10 ans (obligation comptable et fiscale)</li>
          <li><strong>Données patients</strong> : tant que nécessaire à la facturation + délais légaux</li>
          <li><strong>Compte cloud</strong> (Supabase) : jusqu&apos;à suppression de votre compte</li>
        </ul>
      </details>

      <details className="gdpr-block">
        <summary>Droits des patients</summary>
        <p>Sur demande écrite du patient, vous devez pouvoir :</p>
        <ul>
          <li><strong>Accès</strong> — fournir une copie de ses factures</li>
          <li><strong>Rectification</strong> — corriger une erreur (refaire la facture)</li>
          <li><strong>Effacement</strong> — sauf opposition aux obligations légales (factures conservées 10 ans)</li>
          <li><strong>Portabilité</strong> — export CSV/PDF via Historique ou Stats</li>
        </ul>
        <p className="field-hint">
          Supprimez une facture dans Historique ou le profil entier pour effacer les données locales.
        </p>
      </details>

      <details className="gdpr-block">
        <summary>Mesures de sécurité</summary>
        <ul>
          <li>Données isolées par praticien (PIN + stockage local par profil)</li>
          <li>Connexion cloud chiffrée (HTTPS / TLS)</li>
          <li>Pas de tracking publicitaire</li>
          <li>Hébergement Vercel (UE possible) + Supabase (vérifier la région du projet)</li>
        </ul>
      </details>

      <details className="gdpr-block">
        <summary>Sous-traitants</summary>
        <ul>
          <li><strong>Vercel</strong> — hébergement de l&apos;application</li>
          <li><strong>Supabase</strong> — sauvegarde cloud (si activée) — DPA à signer sur supabase.com</li>
        </ul>
        <p className="field-hint">
          Informez vos patients dans votre notice d&apos;information cabinet ou sur demande.
        </p>
      </details>

      <div className="gdpr-actions">
        <button type="button" className="btn-secondary" onClick={handleExportData}>
          Exporter toutes mes données (JSON)
        </button>
      </div>

      <p className="gdpr-footer field-hint">
        Document d&apos;information interne — ne remplace pas un avis juridique.
        Pour un DPO externe ou un registre des traitements formalisé, consultez un juriste spécialisé santé.
      </p>
    </section>
  )
}
