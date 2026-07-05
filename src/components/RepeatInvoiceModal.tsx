import { useEffect, useState } from 'react'
import type { StoredInvoice } from '../types'
import { todayISO, computePrice } from '../lib/pricing'
import { VoiceInputButton } from './VoiceInputButton'

interface Props {
  stored: StoredInvoice | null
  childPrice: number
  adultPrice: number
  onClose: () => void
  onConfirm: (consultationDate: string) => void
}

export function RepeatInvoiceModal({ stored, childPrice, adultPrice, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(todayISO())

  useEffect(() => {
    if (stored) setDate(todayISO())
  }, [stored])

  if (!stored) return null

  const inv = stored.invoice
  const { amount, isChild } = computePrice(inv.patientBirthDate, date, childPrice, adultPrice)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="repeat-title" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 id="repeat-title">Répéter la facture</h3>
        <p className="modal-patient">
          {inv.patientLastName} {inv.patientFirstName}
        </p>
        <label>
          Date de consultation
          <span className="input-with-voice">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
            <VoiceInputButton mode="date" label="Dicter la date" onResult={setDate} />
          </span>
        </label>
        <p className="field-hint">
          Tarif : <strong>{amount} €</strong> ({isChild ? 'enfant' : 'adulte'})
        </p>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn-primary" disabled={!date} onClick={() => onConfirm(date)}>
            Créer la facture
          </button>
        </div>
      </div>
    </div>
  )
}
