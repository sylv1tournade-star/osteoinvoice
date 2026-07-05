import type { InvoiceData, PractitionerProfile } from '../types'
import { formatPatientName, formatPractitionerName } from '../lib/names'
import { paymentLabel, isVirement } from '../types'

interface Props {
  profile: PractitionerProfile
  invoice: InvoiceData
}

function formatDateFR(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function InvoicePreview({ profile, invoice }: Props) {
  const patientName = formatPatientName(invoice.patientFirstName, invoice.patientLastName)
  const practitionerName = formatPractitionerName(profile.firstName, profile.lastName)

  return (
    <div className="invoice-sheet" id="invoice-preview">
      <header className="invoice-header">
        <h1>FACTURE/QUITTANCE</h1>
        <p className="invoice-number">Facture n° {invoice.invoiceNumber}</p>
        <p className="practitioner-name">{practitionerName}</p>
        {profile.subtitleLine1 && <p>{profile.subtitleLine1}</p>}
        {(profile.doNumber || profile.subtitleLine2) && (
          <p>{profile.doNumber ? `n° ${profile.doNumber}` : profile.subtitleLine2}</p>
        )}
      </header>

      <section className="invoice-patient">
        <div className="field-row">
          <span className="field-label">Prénom et nom du patient</span>
          <span className="field-value">{patientName}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Date de naissance :</span>
          <span className="field-value">{formatDateFR(invoice.patientBirthDate)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Consultation du</span>
          <span className="field-value">{formatDateFR(invoice.consultationDate)}</span>
        </div>
      </section>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Acte</th>
            <th>Honoraires</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Consultation ostéopathique</td>
            <td>{invoice.amount} euros</td>
          </tr>
        </tbody>
      </table>

      <p className="invoice-total">
        Montant total : <strong>{invoice.amount}</strong> euros TTC
      </p>

      <p className="invoice-legal">{profile.legalNotice}</p>

      {invoice.paymentMethod && (
        <p className="invoice-payment">
          Payé par {paymentLabel(invoice.paymentMethod)}
        </p>
      )}

      {(invoice.patientEmail || invoice.patientPhone) && (
        <p className="invoice-patient-contact">
          {invoice.patientPhone && <span>Tél. patient : {invoice.patientPhone}</span>}
          {invoice.patientEmail && <span>Email : {invoice.patientEmail}</span>}
        </p>
      )}

      {isVirement(invoice.paymentMethod) && (
        <div className="invoice-rib-block">
          {profile.ribImage ? (
            <>
              <p className="invoice-rib-label">Coordonnées bancaires (virement) :</p>
              <img
                src={profile.ribImage}
                alt="RIB"
                className="invoice-rib-image"
              />
            </>
          ) : profile.rib ? (
            <p className="invoice-rib">RIB : {profile.rib}</p>
          ) : null}
        </div>
      )}

      <footer className="invoice-stamp-area">
        {profile.stampImage ? (
          <img src={profile.stampImage} alt="Cachet professionnel" className="stamp-image" />
        ) : (
          <div className="stamp-placeholder">
            <p className="stamp-name">{practitionerName}</p>
            <p>{profile.subtitleLine2}</p>
            <p>{profile.addressLine1}</p>
            <p>{profile.addressLine2}</p>
          </div>
        )}
      </footer>
    </div>
  )
}
