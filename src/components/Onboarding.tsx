import { useEffect, useMemo, useState } from 'react'
import type { PractitionerProfile } from '../types'
import { hasPin, setPin as setProfilePin } from '../lib/auth'
import { saveProfile } from '../lib/storage'
import { importRibDocument } from '../lib/ribDocument'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { registerCloudAndSync } from '../lib/supabase/cloudAuth'

interface Props {
  profile: PractitionerProfile
  onComplete: (flashMessage?: string) => void
}

const BASE_STEPS = ['PIN', 'Profil', 'Cachet', 'RIB', 'Tarifs'] as const
const CLOUD_STEP = 'Cloud' as const

export function Onboarding({ profile, onComplete }: Props) {
  const cloudEnabled = isSupabaseConfigured()
  const stepLabels = useMemo(
    () => (cloudEnabled ? [...BASE_STEPS, CLOUD_STEP] : [...BASE_STEPS]),
    [cloudEnabled]
  )

  const pinExists = hasPin(profile.id)
  const [step, setStep] = useState(pinExists ? 1 : 0)
  const [error, setError] = useState('')
  const [finishing, setFinishing] = useState(false)

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const [form, setForm] = useState<PractitionerProfile>({ ...profile })
  const [ribLoading, setRibLoading] = useState(false)

  const [cloudEmail, setCloudEmail] = useState(profile.email ?? '')
  const [cloudPassword, setCloudPassword] = useState('')
  const [cloudPasswordConfirm, setCloudPasswordConfirm] = useState('')
  const [skipCloud, setSkipCloud] = useState(false)

  const cloudStepIndex = stepLabels.indexOf(CLOUD_STEP)

  useEffect(() => {
    if (form.email && !cloudEmail) setCloudEmail(form.email)
  }, [form.email, cloudEmail])

  function update(field: keyof PractitionerProfile, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleRibUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRibLoading(true)
    try {
      const dataUrl = await importRibDocument(file)
      update('ribImage', dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur RIB')
    } finally {
      setRibLoading(false)
      e.target.value = ''
    }
  }

  function handleStampUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update('stampImage', reader.result as string)
    reader.readAsDataURL(file)
  }

  async function finish() {
    setError('')
    setFinishing(true)

    try {
      if (!pinExists) {
        if (pin.length < 4) {
          setError('PIN : 4 chiffres minimum')
          setStep(0)
          return
        }
        if (pin !== confirmPin) {
          setError('Les codes PIN ne correspondent pas')
          setStep(0)
          return
        }
        await setProfilePin(profile.id, pin)
      }

      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('Renseignez prénom et nom')
        setStep(1)
        return
      }

      if (cloudEnabled && !skipCloud && stepLabels.includes(CLOUD_STEP)) {
        if (!cloudEmail.trim()) {
          setError('Email de sauvegarde requis')
          setStep(cloudStepIndex)
          return
        }
        if (cloudPassword.length < 6) {
          setError('Mot de passe cloud : 6 caractères minimum')
          setStep(cloudStepIndex)
          return
        }
        if (cloudPassword !== cloudPasswordConfirm) {
          setError('Les mots de passe cloud ne correspondent pas')
          setStep(cloudStepIndex)
          return
        }
      }

      const saved: PractitionerProfile = {
        ...form,
        email: form.email.trim() || cloudEmail.trim(),
        lastName: form.lastName.toUpperCase(),
        subtitleLine2: form.doNumber ? `n° ${form.doNumber}` : '',
        onboardingDone: true,
      }
      saveProfile(saved)

      let flash: string | undefined

      if (cloudEnabled && !skipCloud && cloudEmail && cloudPassword) {
        const cloud = await registerCloudAndSync(saved, cloudEmail, cloudPassword)
        if (cloud.state === 'synced') {
          flash = 'Configuration terminée — sauvegarde cloud activée ☁️'
        } else if (cloud.needsEmailConfirm) {
          flash = cloud.message
        } else if (cloud.state === 'error') {
          flash = `Profil enregistré. Cloud : ${cloud.message}`
        }
      }

      onComplete(flash)
    } finally {
      setFinishing(false)
    }
  }

  function next() {
    setError('')
    if (step === 0 && !pinExists) {
      if (pin.length < 4) {
        setError('4 chiffres minimum')
        return
      }
      if (pin !== confirmPin) {
        setError('Les PIN ne correspondent pas')
        return
      }
    }
    if (step === 1) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('Prénom et nom obligatoires')
        return
      }
      if (!cloudEmail && form.email) setCloudEmail(form.email)
    }
    if (step === cloudStepIndex && !skipCloud) {
      if (!cloudEmail.trim()) {
        setError('Email requis')
        return
      }
      if (cloudPassword.length < 6) {
        setError('Mot de passe : 6 caractères min.')
        return
      }
      if (cloudPassword !== cloudPasswordConfirm) {
        setError('Les mots de passe ne correspondent pas')
        return
      }
    }
    setStep((s) => Math.min(s + 1, stepLabels.length - 1))
  }

  function back() {
    setError('')
    setStep((s) => Math.max(s - 1, pinExists ? 1 : 0))
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card onboarding-setup">
        <img src="/icon-512.png" alt="" className="login-logo onboarding-logo" />
        <h1 className="onboarding-title">Configuration</h1>

        <div className="onboarding-progress onboarding-steps-row">
          {stepLabels.map((label, i) => (
            <div key={label} className={`onboarding-step-label ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}>
              <span>{i + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        {error && <p className="error-msg">{error}</p>}

        {step === 0 && (
          <div className="onboarding-fields">
            <h2>Code PIN</h2>
            <p className="field-hint">Protège vos factures et données patients.</p>
            <label>
              Choisir un PIN (4 chiffres min.)
              <input type="password" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
            </label>
            <label>
              Confirmer le PIN
              <input type="password" inputMode="numeric" maxLength={8} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-fields">
            <h2>Votre identité</h2>
            <div className="price-row">
              <label>Prénom<input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></label>
              <label>Nom<input value={form.lastName} onChange={(e) => update('lastName', e.target.value.toUpperCase())} /></label>
            </div>
            <label>
              Titres / diplômes
              <input value={form.subtitleLine1} onChange={(e) => update('subtitleLine1', e.target.value)} placeholder="Ostéopathe D.O." />
            </label>
            <label>
              N° professionnel (D.O.)
              <input value={form.doNumber ?? ''} onChange={(e) => update('doNumber', e.target.value)} placeholder="13 00127 92" />
            </label>
            <p className="field-hint">Un seul numéro suffit — celui figurant sur votre cachet.</p>
            <label>Adresse<input value={form.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} /></label>
            <label>CP + ville<input value={form.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} /></label>
            <label>Téléphone<input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
            <label>Mobile<input type="tel" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} /></label>
            <label>
              Email pro
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  update('email', e.target.value)
                  setCloudEmail(e.target.value)
                }}
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-fields">
            <h2>Cachet professionnel</h2>
            <p className="field-hint">Photo ou scan de votre cachet.</p>
            <label>
              Charger le cachet
              <input type="file" accept="image/*" capture="environment" onChange={handleStampUpload} />
            </label>
            {form.stampImage && (
              <div className="stamp-preview-wrap">
                <img src={form.stampImage} alt="Cachet" className="stamp-preview" />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-fields">
            <h2>RIB (virements)</h2>
            <label>
              PDF ou photo du RIB
              <input type="file" accept="application/pdf,image/*,.pdf" capture="environment" onChange={handleRibUpload} disabled={ribLoading} />
            </label>
            {ribLoading && <p className="field-hint">Conversion…</p>}
            {form.ribImage && (
              <div className="rib-preview-wrap">
                <img src={form.ribImage} alt="RIB" className="rib-preview" />
              </div>
            )}
            <label>
              Ou IBAN
              <input value={form.rib} onChange={(e) => update('rib', e.target.value)} placeholder="FR76…" />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-fields">
            <h2>Tarifs</h2>
            <div className="price-row">
              <label>
                Enfant (€)
                <input type="number" min={0} value={form.childPrice} onChange={(e) => update('childPrice', Number(e.target.value))} />
              </label>
              <label>
                Adulte (€)
                <input type="number" min={0} value={form.adultPrice} onChange={(e) => update('adultPrice', Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        {cloudEnabled && step === cloudStepIndex && (
          <div className="onboarding-fields">
            <h2>Sauvegarde cloud</h2>
            <p className="field-hint">
              Retrouvez vos factures sur un autre téléphone. Connexion et synchronisation automatiques à la fin.
            </p>
            <label>
              Email de connexion
              <input
                type="email"
                value={cloudEmail}
                onChange={(e) => setCloudEmail(e.target.value)}
                disabled={skipCloud}
                autoComplete="email"
              />
            </label>
            <label>
              Mot de passe cloud (6 car. min.)
              <input
                type="password"
                value={cloudPassword}
                onChange={(e) => setCloudPassword(e.target.value)}
                disabled={skipCloud}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirmer le mot de passe
              <input
                type="password"
                value={cloudPasswordConfirm}
                onChange={(e) => setCloudPasswordConfirm(e.target.value)}
                disabled={skipCloud}
                autoComplete="new-password"
              />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={skipCloud} onChange={(e) => setSkipCloud(e.target.checked)} />
              Configurer la sauvegarde cloud plus tard
            </label>
          </div>
        )}

        <div className="wizard-nav">
          {step > (pinExists ? 1 : 0) && (
            <button type="button" className="btn-text" onClick={back}>← Retour</button>
          )}
          {step < stepLabels.length - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>Continuer →</button>
          ) : (
            <button type="button" className="btn-primary" onClick={finish} disabled={finishing}>
              {finishing ? 'Finalisation…' : 'Terminer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
