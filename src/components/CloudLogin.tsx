import { useEffect, useState } from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client'
import { pullFromCloud, syncBidirectional, type SyncState } from '../lib/supabase/sync'
import type { PractitionerProfile } from '../types'

interface Props {
  profile: PractitionerProfile
  onSyncChange?: (state: SyncState) => void
  onDataChanged?: () => void
}

export function CloudLogin({ profile, onSyncChange, onDataChanged }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoggedIn(true)
        setUserEmail(session.user.email ?? '')
        onSyncChange?.('synced')
      }
    })
  }, [onSyncChange])

  if (!isSupabaseConfigured()) {
    return (
      <section className="cloud-section">
        <h3>Compte cloud (Supabase)</h3>
        <p className="field-hint">
          Non configuré. Ajoutez <code>VITE_SUPABASE_URL</code> et{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> dans Vercel ou un fichier <code>.env</code>,
          puis exécutez <code>supabase/schema.sql</code> dans votre projet Supabase.
        </p>
      </section>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sb = getSupabase()
    if (!sb) return

    setLoading(true)
    setMessage('')

    try {
      const result =
        mode === 'login'
          ? await sb.auth.signInWithPassword({ email, password })
          : await sb.auth.signUp({ email, password })

      if (result.error) throw result.error

      if (mode === 'signup' && result.data.user && !result.data.session) {
        setMessage('Compte créé — vérifiez votre email pour confirmer, puis reconnectez-vous.')
        setLoading(false)
        return
      }

      setLoggedIn(true)
      setUserEmail(email)
      const syncState = await syncBidirectional(profile)
      onSyncChange?.(syncState)
      onDataChanged?.()
      setMessage(syncState === 'synced' ? 'Connecté et synchronisé (↕ cloud)' : 'Connecté')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur de connexion')
      onSyncChange?.('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
    setLoggedIn(false)
    setUserEmail('')
    onSyncChange?.('local')
  }

  async function handleSyncNow() {
    setLoading(true)
    const state = await syncBidirectional(profile)
    onSyncChange?.(state)
    onDataChanged?.()
    setMessage(state === 'synced' ? 'Synchronisation OK (↕)' : 'Erreur de sync')
    setLoading(false)
  }

  async function handlePullOnly() {
    setLoading(true)
    const state = await pullFromCloud(profile.id)
    onSyncChange?.(state)
    onDataChanged?.()
    setMessage(state === 'synced' ? 'Données récupérées depuis le cloud' : 'Erreur')
    setLoading(false)
  }

  if (loggedIn) {
    return (
      <section className="cloud-section">
        <h3>Compte cloud</h3>
        <p className="field-hint">Connecté : {userEmail}</p>
        <div className="cloud-actions">
          <button type="button" className="btn-secondary" disabled={loading} onClick={handleSyncNow}>
            Synchroniser (↕)
          </button>
          <button type="button" className="btn-secondary" disabled={loading} onClick={handlePullOnly}>
            Récupérer depuis le cloud
          </button>
          <button type="button" className="btn-text" onClick={handleLogout}>
            Se déconnecter du cloud
          </button>
        </div>
        {message && <p className="toast">{message}</p>}
      </section>
    )
  }

  return (
    <section className="cloud-section">
      <h3>Compte cloud (sauvegarde)</h3>
      <p className="field-hint">
        Email + mot de passe pour sauvegarder et retrouver vos factures sur un autre appareil.
        Pas besoin de Brevo : Supabase envoie un email de confirmation (vérifiez les spams).
      </p>
      <form onSubmit={handleSubmit} className="cloud-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {message && <p className="error-msg">{message}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Connexion…' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
        </button>
        <button type="button" className="btn-text" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Créer un compte cloud' : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </section>
  )
}
