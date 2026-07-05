import { useEffect, useRef, useState } from 'react'
import type { PractitionerProfile } from '../types'
import { deleteProfile } from '../lib/storage'
import { changePin, clearSession, verifyPin } from '../lib/auth'
import { formatPractitionerName } from '../lib/names'
import { importRibDocument } from '../lib/ribDocument'
import { formatInvoiceNumber, resolveInvoicePrefix } from '../lib/invoiceNumbers'
import { useAutoSaveProfile } from '../hooks/useAutoSaveProfile'
import { getProfileStatus, profileCompletion } from '../lib/profileStatus'
import { CloudLogin } from './CloudLogin'
import { GdprPanel } from './GdprPanel'
import { biometricsSupported, hasBiometric, registerBiometric } from '../lib/webauthn'
import type { SyncState } from '../lib/supabase/sync'

interface Props {
  profile: PractitionerProfile
  onSaved: () => void
  onLogout: () => void
}

export function ProfileSettings({ profile, onSaved, onLogout }: Props) {
  const [form, setForm] = useState<PractitionerProfile>({ ...profile })
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [ribLoading, setRibLoading] = useState(false)
  const [ribError, setRibError] = useState('')
  const [syncState, setSyncState] = useState<SyncState>('local')
  const [bioMessage, setBioMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { status, saveNow } = useAutoSaveProfile(form, profile.id, onSaved)
  const statusItems = getProfileStatus(form)
  const completion = profileCompletion(form)

  useEffect(() => {
    setForm({ ...profile })
  }, [profile.id])

  function update(field: keyof PractitionerProfile, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleRibUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRibLoading(true)
    setRibError('')
    try {
      const dataUrl = await importRibDocument(file)
      const next = { ...form, ribImage: dataUrl }
      setForm(next)
      saveNow(next)
    } catch (err) {
      setRibError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setRibLoading(false)
      e.target.value = ''
    }
  }

  function handleStampUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const next = { ...form, stampImage: reader.result as string }
      setForm(next)
      saveNow(next)
    }
    reader.readAsDataURL(file)
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault()
    setPinMessage('')
    if (newPin !== confirmPin) {
      setPinMessage('Les nouveaux codes PIN ne correspondent pas')
      return
    }
    const ok = await changePin(profile.id, currentPin, newPin)
    if (ok) {
      setPinMessage('Code PIN modifié')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } else {
      setPinMessage('Code PIN actuel incorrect')
    }
  }

  function handleDelete() {
    const pin = prompt('Entrez votre code PIN pour confirmer la suppression du profil')
    if (!pin) return
    verifyPin(profile.id, pin).then((ok) => {
      if (!ok) {
        alert('Code PIN incorrect')
        return
      }
      const name = formatPractitionerName(form.firstName, form.lastName)
      if (confirm(`Supprimer définitivement le profil "${name}" et toutes ses factures ?`)) {
        deleteProfile(profile.id)
        clearSession()
        onLogout()
      }
    })
  }

  const saveLabel =
    status === 'saving' ? 'Enregistrement…' :
    status === 'saved' ? '✓ Enregistré' :
    status === 'error' ? 'Erreur' : 'Auto-save actif'

  return (
    <div className="profile-settings">
      <div className="profile-header-row">
        <h2>Mon espace praticien</h2>
        <span className={`save-indicator ${status}`}>{saveLabel}</span>
      </div>

      <div className="profile-status">
        <p>Profil complété à {completion}%</p>
        <ul className="status-chips">
          {statusItems.map((item) => (
            <li key={item.id} className={item.ok ? 'ok' : 'missing'}>{item.label}</li>
          ))}
        </ul>
      </div>

      <div className="profile-form">
        <label className="checkbox-row dark-toggle">
          <input
            type="checkbox"
            checked={form.darkMode}
            onChange={(e) => update('darkMode', e.target.checked)}
          />
          Mode sombre
        </label>

        <div className="price-row">
          <label>
            Prénom
            <input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
          </label>
          <label>
            Nom
            <input value={form.lastName} onChange={(e) => update('lastName', e.target.value.toUpperCase())} required />
          </label>
        </div>

        <label>
          Titres / diplômes
          <input value={form.subtitleLine1} onChange={(e) => update('subtitleLine1', e.target.value)} placeholder="Ostéopathe D.O." />
        </label>
        <label>
          N° professionnel (D.O.)
          <input value={form.doNumber ?? ''} onChange={(e) => update('doNumber', e.target.value)} placeholder="13 00127 92" />
        </label>
        <p className="field-hint">Le FINESS concerne surtout les kinés ; pour un ostéopathe, le n° D.O. suffit.</p>
        <label>
          Adresse ligne 1
          <input value={form.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} />
        </label>
        <label>
          Adresse ligne 2
          <input value={form.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} />
        </label>
        <label>
          Téléphone
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <label>
          Mobile
          <input type="tel" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>
        <label>
          SIRET
          <input value={form.siret} onChange={(e) => update('siret', e.target.value)} />
        </label>

        <fieldset className="rib-section">
          <legend>RIB / virement bancaire</legend>
          <label>
            Charger un RIB (PDF ou photo)
            <input type="file" accept="application/pdf,image/*,.pdf" capture="environment" onChange={handleRibUpload} disabled={ribLoading} />
          </label>
          {ribLoading && <p className="field-hint">Conversion… enregistrement auto</p>}
          {ribError && <p className="error-msg">{ribError}</p>}
          {form.ribImage && (
            <div className="rib-preview-wrap">
              <img src={form.ribImage} alt="RIB" className="rib-preview" />
              <button type="button" className="btn-text btn-remove-doc" onClick={() => update('ribImage', '')}>
                Supprimer
              </button>
            </div>
          )}
          <label>
            IBAN manuel
            <input value={form.rib ?? ''} onChange={(e) => update('rib', e.target.value)} placeholder="FR76…" />
          </label>
        </fieldset>

        <div className="price-row">
          <label>
            Tarif enfant (€)
            <input type="number" min={0} value={form.childPrice} onChange={(e) => update('childPrice', Number(e.target.value))} />
          </label>
          <label>
            Tarif adulte (€)
            <input type="number" min={0} value={form.adultPrice} onChange={(e) => update('adultPrice', Number(e.target.value))} />
          </label>
        </div>

        <fieldset className="rib-section">
          <legend>Numérotation des factures</legend>
          <label>
            Préfixe (ex: 2026-)
            <input value={form.invoiceNumberPrefix} onChange={(e) => update('invoiceNumberPrefix', e.target.value)} />
          </label>
          <label>
            Chiffres du compteur
            <input type="number" min={1} max={8} value={form.invoiceNumberPadding} onChange={(e) => update('invoiceNumberPadding', Number(e.target.value))} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.invoiceResetYearly} onChange={(e) => update('invoiceResetYearly', e.target.checked)} />
            Remise à zéro chaque année
          </label>
          <p className="field-hint">
            Prochain n° :{' '}
            <strong>
              {formatInvoiceNumber(form, form.nextInvoiceNumber)}
            </strong>
            {form.invoiceResetYearly && !form.invoiceNumberPrefix && (
              <span> (préfixe auto : {resolveInvoicePrefix(form)})</span>
            )}
          </p>
        </fieldset>

        <label>
          Cachet (photo ou scan)
          <input ref={fileRef} type="file" accept="image/*" onChange={handleStampUpload} />
        </label>
        {form.stampImage && (
          <div className="stamp-preview-wrap">
            <img src={form.stampImage} alt="Cachet" className="stamp-preview" />
          </div>
        )}
      </div>

      <CloudLogin profile={form} onSyncChange={setSyncState} onDataChanged={onSaved} />
      {syncState === 'synced' && <p className="field-hint">☁️ Données sauvegardées dans le cloud</p>}

      {biometricsSupported() && (
        <section className="pin-section">
          <h3>Déverrouillage par empreinte</h3>
          <p className="field-hint">
            {hasBiometric(profile.id)
              ? 'Empreinte activée sur cet appareil.'
              : 'Utilisez votre empreinte ou Face ID à la place du PIN.'}
          </p>
          {!hasBiometric(profile.id) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                const ok = await registerBiometric(profile.id)
                setBioMessage(ok ? 'Empreinte enregistrée' : 'Échec — réessayez sur téléphone')
              }}
            >
              Activer l&apos;empreinte
            </button>
          )}
          {bioMessage && <p className="toast">{bioMessage}</p>}
        </section>
      )}

      <section className="pin-section">
        <h3>Modifier le code PIN</h3>
        <form onSubmit={handleChangePin}>
          <label>PIN actuel<input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))} /></label>
          <label>Nouveau PIN<input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} /></label>
          <label>Confirmer<input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} /></label>
          {pinMessage && <p className="toast">{pinMessage}</p>}
          <button type="submit" className="btn-secondary">Changer le PIN</button>
        </form>
      </section>

      <GdprPanel profile={profile} />

      <div className="form-actions settings-footer">
        <button type="button" className="btn-secondary" onClick={onLogout}>Se déconnecter</button>
        <button type="button" className="btn-danger" onClick={handleDelete}>Supprimer mon profil</button>
      </div>
    </div>
  )
}
