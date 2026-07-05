import { useEffect, useRef, useState } from 'react'
import type { InvoiceData, PractitionerProfile } from '../types'
import { computePrice, todayISO } from '../lib/pricing'
import { hasRib } from '../lib/rib'
import { incrementInvoiceNumber } from '../lib/storage'
import { searchPatients, type PatientSuggestion } from '../lib/invoices'

interface Props {
  profile: PractitionerProfile
  onPreview: (invoice: InvoiceData) => void
}

export function InvoiceForm({ profile, onPreview }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [consultationDate, setConsultationDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState('cheque')
  const [amount, setAmount] = useState(profile.adultPrice)
  const [isChild, setIsChild] = useState(false)
  const [suggestions, setSuggestions] = useState<PatientSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (birthDate && consultationDate) {
      const result = computePrice(
        birthDate,
        consultationDate,
        profile.childPrice,
        profile.adultPrice
      )
      setAmount(result.amount)
      setIsChild(result.isChild)
    }
  }, [birthDate, consultationDate, profile.childPrice, profile.adultPrice])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNameSearch(value: string) {
    setLastName(value)
    const results = searchPatients(value)
    setSuggestions(results)
    setShowSuggestions(results.length > 0 && value.trim().length >= 2)
  }

  function selectPatient(p: PatientSuggestion) {
    setLastName(p.patientLastName)
    setFirstName(p.patientFirstName)
    setBirthDate(p.patientBirthDate)
    setShowSuggestions(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !birthDate) return

    const invoiceNumber = incrementInvoiceNumber(profile.id)
    const invoice: InvoiceData = {
      patientFirstName: firstName.trim(),
      patientLastName: lastName.trim().toUpperCase(),
      patientBirthDate: birthDate,
      consultationDate,
      invoiceDate: todayISO(),
      invoiceNumber,
      amount,
      isChild,
      paymentMethod,
    }
    onPreview(invoice)
  }

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <h2>Nouvelle facture</h2>

      <div className="search-field" ref={searchRef}>
        <label>
          Nom du patient
          <input
            type="text"
            value={lastName}
            onChange={(e) => handleNameSearch(e.target.value)}
            onFocus={() => {
              if (lastName.length >= 2) {
                const results = searchPatients(lastName)
                setSuggestions(results)
                setShowSuggestions(results.length > 0)
              }
            }}
            placeholder="TOURNADE"
            required
            autoComplete="off"
          />
        </label>
        {showSuggestions && (
          <ul className="suggestions-list">
            {suggestions.map((p) => (
              <li key={`${p.patientLastName}-${p.patientFirstName}-${p.patientBirthDate}`}>
                <button
                  type="button"
                  onClick={() => selectPatient(p)}
                >
                  {p.patientLastName.toUpperCase()} {p.patientFirstName}
                  <span>{p.patientBirthDate.split('-').reverse().join('/')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label>
        Prénom du patient
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Gaspard"
          required
          autoComplete="given-name"
        />
      </label>

      <label>
        Date de naissance
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          required
        />
      </label>

      <label>
        Date de consultation
        <input
          type="date"
          value={consultationDate}
          onChange={(e) => setConsultationDate(e.target.value)}
          required
        />
      </label>

      <div className="price-badge">
        <span className={`price-tag ${isChild ? 'child' : 'adult'}`}>
          {isChild ? 'Enfant' : 'Adulte'} — {amount} €
        </span>
        <span className="price-hint">
          {profile.childPrice} € (&lt;18 ans) · {profile.adultPrice} € (adulte)
        </span>
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
        <p className="field-hint warning">
          Renseignez votre RIB dans Mon profil pour l&apos;afficher sur la facture.
        </p>
      )}

      <button type="submit" className="btn-primary">
        Générer la facture
      </button>
    </form>
  )
}
