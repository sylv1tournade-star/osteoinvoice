import { useMemo, useState } from 'react'
import type { ProfileMeta } from '../types'
import {
  hasPin,
  setPin as setProfilePin,
  setSession,
  verifyPin,
} from '../lib/auth'
import { createProfile, getProfileMetas } from '../lib/storage'
import { formatPractitionerName, searchProfiles } from '../lib/names'
import { biometricsSupported, hasBiometric, unlockWithBiometric } from '../lib/webauthn'

interface Props {
  onAuthenticated: (profileId: string) => void
}

type Mode = 'login' | 'register' | 'setup-pin'

export function LoginScreen({ onAuthenticated }: Props) {
  const [metas, setMetas] = useState<ProfileMeta[]>(() => getProfileMetas())
  const [mode, setMode] = useState<Mode>('login')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  const filteredMetas = useMemo(
    () => searchProfiles(metas, searchQuery),
    [metas, searchQuery]
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const profileId = selectedId || filteredMetas[0]?.id
    if (!profileId) {
      setError('Aucun praticien trouvé — créez un compte')
      return
    }

    if (!hasPin(profileId)) {
      setSelectedId(profileId)
      setMode('setup-pin')
      setPin('')
      setConfirmPin('')
      return
    }

    const ok = await verifyPin(profileId, pin)
    if (!ok) {
      setError('Code PIN incorrect')
      return
    }

    setSession(profileId, remember)
    onAuthenticated(profileId)
  }

  async function handleSetupPin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (pin.length < 4) {
      setError('Le PIN doit contenir au moins 4 chiffres')
      return
    }
    if (pin !== confirmPin) {
      setError('Les codes PIN ne correspondent pas')
      return
    }

    try {
      await setProfilePin(selectedId, pin)
      setSession(selectedId, remember)
      onAuthenticated(selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!newFirstName.trim() || !newLastName.trim()) {
      setError('Entrez votre prénom et nom')
      return
    }
    if (pin.length < 4) {
      setError('Le PIN doit contenir au moins 4 chiffres')
      return
    }
    if (pin !== confirmPin) {
      setError('Les codes PIN ne correspondent pas')
      return
    }

    const profile = createProfile(newFirstName.trim(), newLastName.trim())
    await setProfilePin(profile.id, pin)
    setMetas(getProfileMetas())
    setSession(profile.id, remember)
    onAuthenticated(profile.id)
  }

  async function handleBiometricLogin() {
    setError('')
    const profileId = selectedId || filteredMetas[0]?.id
    if (!profileId) return

    const ok = await unlockWithBiometric(profileId)
    if (!ok) {
      setError('Empreinte non reconnue')
      return
    }
    setSession(profileId, remember)
    onAuthenticated(profileId)
  }

  const showBiometric = biometricsSupported() && (selectedId || filteredMetas.length === 1) && hasBiometric(selectedId || filteredMetas[0]?.id || '')

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/icon-512.png" alt="" className="login-logo" />
        <h1>OsteoFacture</h1>
        <p className="login-subtitle">Connexion sécurisée</p>

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <label>
              Rechercher votre profil
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedId('')
                }}
                placeholder="Tapez votre nom…"
                autoComplete="off"
              />
            </label>

            {searchQuery.trim().length >= 2 && (
              <ul className="suggestions-list login-suggestions">
                {filteredMetas.length === 0 ? (
                  <li className="suggestion-empty">Aucun praticien trouvé</li>
                ) : (
                  filteredMetas.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={selectedId === m.id ? 'selected' : ''}
                        onClick={() => {
                          setSelectedId(m.id)
                          setSearchQuery(formatPractitionerName(m.firstName, m.lastName))
                        }}
                      >
                        {formatPractitionerName(m.firstName, m.lastName)}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {selectedId && (
              <p className="selected-profile">
                Profil sélectionné :{' '}
                <strong>
                  {formatPractitionerName(
                    metas.find((m) => m.id === selectedId)!.firstName,
                    metas.find((m) => m.id === selectedId)!.lastName
                  )}
                </strong>
                <span className="selected-hint"> — saisissez votre PIN pour vous connecter</span>
              </p>
            )}

            <label>
              Code PIN
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoComplete="current-password"
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Rester connecté sur cet appareil
            </label>

            {error && <p className="error-msg">{error}</p>}

            {showBiometric && (
              <button type="button" className="btn-secondary biometric-btn" onClick={handleBiometricLogin}>
                🔐 Déverrouiller par empreinte
              </button>
            )}

            <button type="submit" className="btn-primary">
              Se connecter
            </button>

            <button
              type="button"
              className="btn-text"
              onClick={() => {
                setMode('register')
                setError('')
                setPin('')
                setConfirmPin('')
              }}
            >
              Créer un compte praticien
            </button>
          </form>
        )}

        {mode === 'setup-pin' && (
          <form onSubmit={handleSetupPin}>
            <p className="setup-info">
              Créez un code PIN pour sécuriser votre espace.
              Personne d&apos;autre ne pourra accéder à vos factures.
            </p>

            <label>
              Nouveau code PIN (4 chiffres min.)
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="new-password"
              />
            </label>

            <label>
              Confirmer le PIN
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="new-password"
              />
            </label>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-primary">
              Activer mon espace
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <label>
              Prénom
              <input
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder="Fabrice"
                required
              />
            </label>

            <label>
              Nom
              <input
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="Hassen"
                required
              />
            </label>

            <label>
              Code PIN (4 chiffres min.)
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="new-password"
              />
            </label>

            <label>
              Confirmer le PIN
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="new-password"
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Rester connecté sur cet appareil
            </label>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-primary">
              Créer mon espace
            </button>

            <button
              type="button"
              className="btn-text"
              onClick={() => {
                setMode('login')
                setError('')
                setPin('')
                setConfirmPin('')
              }}
            >
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
