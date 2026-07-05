import type { PractitionerProfile, PatientRecord, StoredInvoice } from '../types'
import { getRecentPatients } from '../lib/patients'
import { getDraft } from '../lib/drafts'
import { getInvoices } from '../lib/invoices'
import { getCurrentMonthTotal } from '../lib/stats'
import { formatPractitionerName, formatPatientName } from '../lib/names'

interface Props {
  profile: PractitionerProfile
  onNewInvoice: () => void
  onResumeDraft: () => void
  onSelectPatient: (p: PatientRecord) => void
  onRepeatInvoice: (invoice: StoredInvoice) => void
}

export function HomeScreen({
  profile,
  onNewInvoice,
  onResumeDraft,
  onSelectPatient,
  onRepeatInvoice,
}: Props) {
  const recent = getRecentPatients(5, profile.id)
  const draft = getDraft(profile.id)
  const lastInvoice = getInvoices(profile.id)[0]
  const monthTotal = getCurrentMonthTotal()

  return (
    <div className="home-screen">
      <p className="home-greeting">
        Bonjour, {formatPractitionerName(profile.firstName, profile.lastName).split(' ')[0]}
      </p>
      <p className="home-month-total">Ce mois : <strong>{monthTotal} €</strong></p>

      <button type="button" className="btn-hero" onClick={onNewInvoice}>
        + Nouvelle facture
      </button>

      {draft && (
        <button type="button" className="btn-secondary home-draft" onClick={onResumeDraft}>
          Reprendre le brouillon ({draft.lastName || '…'})
        </button>
      )}

      {lastInvoice && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onRepeatInvoice(lastInvoice)}
        >
          Répéter : {formatPatientName(lastInvoice.invoice.patientFirstName, lastInvoice.invoice.patientLastName)}
        </button>
      )}

      {recent.length > 0 && (
        <section className="home-section">
          <h3>Patients récents</h3>
          <ul className="home-patient-list">
            {recent.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelectPatient(p)}>
                  <span>{p.lastName} {p.firstName}</span>
                  <small>{p.birthDate.split('-').reverse().join('/')}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
