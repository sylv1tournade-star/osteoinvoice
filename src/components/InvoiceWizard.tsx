import { useEffect, useRef, useState } from 'react'
import type { InvoiceData, PractitionerProfile, PatientRecord } from '../types'
import { computePrice, todayISO } from '../lib/pricing'
import { hasRib } from '../lib/rib'
import { incrementInvoiceNumber } from '../lib/storage'
import { searchPatientsDirectory, upsertPatient } from '../lib/patients'
import { getDraft, saveDraft, clearDraft } from '../lib/drafts'
import { contactsSupported, pickFromContacts } from '../lib/contacts'
import { VoiceInputButton } from './VoiceInputButton'

interface Props {
  profile: PractitionerProfile
  initialPatient?: PatientRecord | null
  onPreview: (invoice: InvoiceData) => void
  onCancel?: () => void
}

const STEPS = ['Patient', 'Consultation', 'Paiement']

export function InvoiceWizard({ profile, initialPatient, onPreview, onCancel }: Props) {
  const draft = getDraft(profile.id)
  const [step, setStep] = useState(initialPatient ? 1 : draft?.step ?? 0)
  const [firstName, setFirstName] = useState(initialPatient?.firstName ?? draft?.firstName ?? '')
  const [lastName, setLastName] = useState(initialPatient?.lastName ?? draft?.lastName ?? '')
  const [birthDate, setBirthDate] = useState(initialPatient?.birthDate ?? draft?.birthDate ?? '')
  const [patientEmail, setPatientEmail] = useState(initialPatient?.email ?? draft?.patientEmail ?? '')
  const [patientPhone, setPatientPhone] = useState(initialPatient?.phone ?? draft?.patientPhone ?? '')
  const [consultationDate, setConsultationDate] = useState(draft?.consultationDate ?? todayISO())
  const [paymentMethod, setPaymentMethod] = useState(draft?.paymentMethod ?? 'cheque')
  const [amount, setAmount] = useState(profile.adultPrice)
  const [isChild, setIsChild] = useState(false)
  const [suggestions, setSuggestions] = useState<PatientRecord[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (birthDate && consultationDate) {
      const r = computePrice(birthDate, consultationDate, profile.childPrice, profile.adultPrice)
      setAmount(r.amount)
      setIsChild(r.isChild)
    }
  }, [birthDate, consultationDate, profile.childPrice, profile.adultPrice])

  useEffect(() => {
    saveDraft({
      step,
      firstName,
      lastName,
      birthDate,
      patientEmail,
      patientPhone,
      consultationDate,
      paymentMethod,
      savedAt: new Date().toISOString(),
    }, profile.id)
  }, [step, firstName, lastName, birthDate, patientEmail, patientPhone, consultationDate, paymentMethod, profile.id])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearch(value: string) {
    setLastName(value)
    const results = searchPatientsDirectory(value, profile.id)
    setSuggestions(results)
    setShowSuggestions(value.trim().length >= 1 && results.length > 0)
  }

  function selectPatient(p: PatientRecord) {
    setLastName(p.lastName)
    setFirstName(p.firstName)
    setBirthDate(p.birthDate)
    setPatientEmail(p.email)
    setPatientPhone(p.phone)
    setShowSuggestions(false)
  }

  async function handlePickContact() {
    const c = await pickFromContacts()
    if (!c) {
      alert(contactsSupported()
        ? 'Sélection annulée'
        : 'Contacts non disponibles sur cet appareil (Chrome Android recommandé)')
      return
    }
    setFirstName(c.firstName)
    setLastName(c.lastName.toUpperCase())
    setPatientPhone(c.phone)
    setPatientEmail(c.email)
  }

  function canNext(): boolean {
    if (step === 0) return Boolean(firstName.trim() && lastName.trim())
    if (step === 1) return Boolean(birthDate && consultationDate)
    return true
  }

  function next() {
    if (!canNext()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    if (step === 0) onCancel?.()
    else setStep((s) => s - 1)
  }

  function generate() {
    if (!firstName.trim() || !lastName.trim() || !birthDate) return

    upsertPatient({
      firstName: firstName.trim(),
      lastName: lastName.trim().toUpperCase(),
      birthDate,
      email: patientEmail,
      phone: patientPhone,
    }, profile.id)

    const invoiceNumber = incrementInvoiceNumber(profile.id)
    const invoice: InvoiceData = {
      patientFirstName: firstName.trim(),
      patientLastName: lastName.trim().toUpperCase(),
      patientBirthDate: birthDate,
      patientEmail: patientEmail || undefined,
      patientPhone: patientPhone || undefined,
      consultationDate,
      invoiceDate: todayISO(),
      invoiceNumber,
      amount,
      isChild,
      paymentMethod,
    }

    clearDraft(profile.id)
    setSuccessFlash(true)
    setTimeout(() => {
      setSuccessFlash(false)
      onPreview(invoice)
    }, 600)
  }

  return (
    <div className="wizard">
      <div className="wizard-progress">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step-dot ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}>
            <span>{i + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className="wizard-body">
        {step === 0 && (
          <div className="wizard-panel">
            <h2>Qui est le patient ?</h2>
            <div className="search-field" ref={searchRef}>
              <label>
                Nom
                <span className="input-with-voice">
                  <input
                    value={lastName}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => handleSearch(lastName)}
                    placeholder="Commencez à taper…"
                    autoFocus
                    autoComplete="off"
                  />
                  <VoiceInputButton mode="text" label="Dicter le nom" onResult={(v) => handleSearch(v.toUpperCase())} />
                </span>
              </label>
              {showSuggestions && (
                <ul className="suggestions-list">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => selectPatient(p)}>
                        {p.lastName} {p.firstName}
                        <span>{p.birthDate.split('-').reverse().join('/')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label>
              Prénom
              <span className="input-with-voice">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Gaspard" />
                <VoiceInputButton mode="text" label="Dicter le prénom" onResult={setFirstName} />
              </span>
            </label>
            <button type="button" className="btn-secondary" onClick={handlePickContact}>
              📇 Importer depuis mes contacts
            </button>
            <label>
              Email patient (optionnel)
              <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} />
            </label>
            <label>
              Téléphone patient (optionnel)
              <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-panel">
            <h2>Consultation</h2>
            <p className="wizard-patient-recap">
              {lastName.toUpperCase()} {firstName}
            </p>
            <label>
              Date de naissance
              <span className="input-with-voice">
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                <VoiceInputButton mode="date" label="Dicter la date de naissance" onResult={setBirthDate} />
              </span>
              <small className="field-hint">Dictez « 30 avril 2020 » ou « 30/04/2020 »</small>
            </label>
            <label>
              Date de consultation
              <span className="input-with-voice">
                <input type="date" value={consultationDate} onChange={(e) => setConsultationDate(e.target.value)} />
                <VoiceInputButton mode="date" label="Dicter la date de consultation" onResult={setConsultationDate} />
              </span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-panel">
            <h2>Paiement</h2>
            <div className="wizard-recap">
              <p><strong>{lastName.toUpperCase()} {firstName}</strong></p>
              <p>Consultation : {consultationDate.split('-').reverse().join('/')}</p>
              <p className="wizard-price">{amount} € — {isChild ? 'Enfant' : 'Adulte'}</p>
            </div>
            <label>
              Mode de paiement
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cheque">Chèque au cabinet</option>
                <option value="especes">Espèces</option>
                <option value="virement">Virement bancaire</option>
                <option value="carte">Carte bancaire</option>
              </select>
            </label>
            {paymentMethod === 'virement' && !hasRib(profile) && (
              <p className="field-hint warning">Ajoutez votre RIB dans Mon profil (enregistrement auto).</p>
            )}
          </div>
        )}
      </div>

      <div className="price-bar">
        <span className={`price-tag ${isChild ? 'child' : 'adult'}`}>
          {birthDate ? `${isChild ? 'Enfant' : 'Adulte'} — ${amount} €` : `${profile.childPrice} € / ${profile.adultPrice} €`}
        </span>
      </div>

      <div className="wizard-nav">
        <button type="button" className="btn-text" onClick={back}>
          {step === 0 ? 'Annuler' : '← Retour'}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={next} disabled={!canNext()}>
            Continuer →
          </button>
        ) : (
          <button
            type="button"
            className={`btn-primary ${successFlash ? 'success-flash' : ''}`}
            onClick={generate}
          >
            {successFlash ? '✓ Facture créée !' : 'Générer la facture'}
          </button>
        )}
      </div>
    </div>
  )
}
