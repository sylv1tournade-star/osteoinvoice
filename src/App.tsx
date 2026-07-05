import { useCallback, useEffect, useState } from 'react'
import type { InvoiceData, PractitionerProfile, StoredInvoice, PatientRecord } from './types'
import { getSession, clearSession, requireSession } from './lib/auth'
import { getProfile } from './lib/storage'
import { saveInvoice } from './lib/invoices'
import { LoginScreen } from './components/LoginScreen'
import { HomeScreen } from './components/HomeScreen'
import { InvoiceWizard } from './components/InvoiceWizard'
import { InvoicePreview } from './components/InvoicePreview'
import { InvoiceHistory } from './components/InvoiceHistory'
import { ProfileSettings } from './components/ProfileSettings'
import { Onboarding } from './components/Onboarding'
import { StatsDashboard } from './components/StatsDashboard'
import { FullscreenPreview } from './components/FullscreenPreview'
import { InstallBanner } from './components/InstallBanner'
import { ShareFloatingBar } from './components/ShareFloatingBar'
import { RepeatInvoiceModal } from './components/RepeatInvoiceModal'
import { SyncStatusBadge } from './components/SyncStatusBadge'
import { generatePdfFromElement, downloadBlob } from './lib/pdf'
import { sharePdf, shareViaEmail, shareViaWhatsApp } from './lib/share'
import { printInvoice } from './lib/print'
import { formatPractitionerName } from './lib/names'
import { patientDisplayName } from './lib/generateInvoicePdf'
import { todayISO, computePrice } from './lib/pricing'
import { incrementInvoiceNumber } from './lib/storage'
import { upsertPatient } from './lib/patients'
import { runAutoSync, type SyncState } from './lib/supabase/sync'
import './App.css'

type Tab = 'home' | 'invoice' | 'history' | 'stats' | 'settings'

function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    const session = getSession()
    return session !== null && getProfile(session) !== null
  })
  const [profile, setProfile] = useState<PractitionerProfile | null>(() => {
    const session = getSession()
    return session ? getProfile(session) : null
  })
  const [tab, setTab] = useState<Tab>('home')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardPatient, setWizardPatient] = useState<PatientRecord | null>(null)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [historyKey, setHistoryKey] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [createdFlash, setCreatedFlash] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('unconfigured')
  const [repeatTarget, setRepeatTarget] = useState<StoredInvoice | null>(null)

  const loadProfile = useCallback((profileId: string) => {
    const p = getProfile(profileId)
    if (p) {
      setProfile(p)
      setAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (authenticated) {
      try {
        const id = requireSession()
        const p = getProfile(id)
        if (p) setProfile(p)
        runAutoSync().then(setSyncState)
      } catch {
        handleLogout()
      }
    }
  }, [authenticated])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam === 'invoice' && profile?.onboardingDone) {
      setTab('invoice')
      setShowWizard(true)
    } else if (tabParam === 'history') {
      setTab('history')
    }
  }, [profile?.onboardingDone])

  function handleLogout() {
    clearSession()
    setAuthenticated(false)
    setProfile(null)
    setInvoice(null)
    setShowWizard(false)
    setTab('home')
  }

  function handleInvoiceCreated(inv: InvoiceData) {
    saveInvoice(inv)
    setInvoice(inv)
    setShowWizard(false)
    setWizardPatient(null)
    setTab('invoice')
    setHistoryKey((k) => k + 1)
    setCreatedFlash(`Facture n° ${inv.invoiceNumber} créée`)
    setTimeout(() => setCreatedFlash(null), 4000)
    if (profile) runAutoSync().then(setSyncState)
  }

  function handleRepeat(stored: StoredInvoice, consultationDate: string) {
    const inv = stored.invoice
    const { amount, isChild } = computePrice(
      inv.patientBirthDate,
      consultationDate,
      profile!.childPrice,
      profile!.adultPrice
    )
    upsertPatient({
      firstName: inv.patientFirstName,
      lastName: inv.patientLastName,
      birthDate: inv.patientBirthDate,
      email: inv.patientEmail ?? '',
      phone: inv.patientPhone ?? '',
    }, profile!.id)

    handleInvoiceCreated({
      ...inv,
      consultationDate,
      invoiceDate: todayISO(),
      invoiceNumber: incrementInvoiceNumber(profile!.id),
      amount,
      isChild,
    })
    setRepeatTarget(null)
  }

  function requestRepeat(stored: StoredInvoice) {
    setRepeatTarget(stored)
  }

  function startWizard(patient?: PatientRecord | null) {
    setWizardPatient(patient ?? null)
    setShowWizard(true)
    setInvoice(null)
    setTab('invoice')
  }

  function refreshProfile() {
    try {
      const id = requireSession()
      setProfile(getProfile(id))
    } catch {
      handleLogout()
    }
  }

  async function handleShare(method: 'native' | 'whatsapp' | 'email') {
    const el = document.getElementById('invoice-preview')
    if (!el || !invoice || !profile) return
    setGenerating(true)
    setMessage('')
    try {
      const blob = await generatePdfFromElement(el)
      const filename = `facture_${invoice.patientLastName}_${invoice.consultationDate}.pdf`
      const patientName = patientDisplayName(invoice)
      if (method === 'native') {
        const result = await sharePdf(blob, filename, patientName)
        if (result === 'shared') setMessage('Facture partagée !')
        else if (result === 'downloaded') setMessage('PDF téléchargé')
        else setMessage('Partage annulé')
      } else if (method === 'whatsapp') {
        downloadBlob(blob, filename)
        shareViaWhatsApp(patientName)
        setMessage('PDF téléchargé — joignez-le dans WhatsApp')
      } else {
        downloadBlob(blob, filename)
        shareViaEmail(profile.email, patientName)
        setMessage('PDF téléchargé — joignez-le à votre email')
      }
    } catch {
      setMessage('Erreur lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }

  if (!authenticated || !profile) {
    return <LoginScreen onAuthenticated={loadProfile} />
  }

  if (!profile.onboardingDone) {
    return (
      <Onboarding
        profile={profile}
        onComplete={(flash) => {
          refreshProfile()
          setTab('home')
          runAutoSync().then(setSyncState)
          if (flash) {
            setCreatedFlash(flash)
            setTimeout(() => setCreatedFlash(null), 5000)
          }
        }}
      />
    )
  }

  const darkClass = profile.darkMode ? 'dark' : ''

  return (
    <div className={`app ${darkClass}`}>
      <InstallBanner />
      <header className="app-header">
        <div className="app-brand">
          <img src="/icon-512.png" alt="" className="app-logo" />
          <div>
            <h1>OsteoFacture</h1>
            <p className="app-subtitle">{formatPractitionerName(profile.firstName, profile.lastName)}</p>
          </div>
        </div>
        <div className="header-actions">
          <SyncStatusBadge state={syncState} />
          <button type="button" className="btn-logout" onClick={handleLogout} title="Déconnexion">⏻</button>
        </div>
      </header>

      {createdFlash && <div className="flash-banner">{createdFlash}</div>}

      <nav className="app-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => { setTab('home'); setShowWizard(false) }}>Accueil</button>
        <button className={tab === 'invoice' ? 'active' : ''} onClick={() => setTab('invoice')}>Facture</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Historique</button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Stats</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Profil</button>
      </nav>

      <main className="app-main">
        {tab === 'home' && (
          <HomeScreen
            profile={profile}
            onNewInvoice={() => startWizard()}
            onResumeDraft={() => startWizard()}
            onSelectPatient={(p) => startWizard(p)}
            onRepeatInvoice={requestRepeat}
          />
        )}

        {tab === 'invoice' && showWizard && (
          <InvoiceWizard
            profile={profile}
            initialPatient={wizardPatient}
            onPreview={handleInvoiceCreated}
            onCancel={() => { setShowWizard(false); setTab('home') }}
          />
        )}

        {tab === 'invoice' && !showWizard && !invoice && (
          <div className="home-screen">
            <button type="button" className="btn-hero" onClick={() => startWizard()}>+ Nouvelle facture</button>
          </div>
        )}

        {tab === 'invoice' && invoice && !showWizard && (
          <div className="preview-panel preview-panel-with-bar">
            <button type="button" className="btn-text fullscreen-btn" onClick={() => setFullscreen(true)}>
              Agrandir l&apos;aperçu
            </button>
            <InvoicePreview profile={profile} invoice={invoice} />
            <div className="share-actions share-actions-icons">
              <button className="btn-text" onClick={() => { setInvoice(null); startWizard() }}>+ Nouvelle facture</button>
              <button className="btn-text" onClick={() => requestRepeat({ id: '', createdAt: '', invoice })}>Répéter pour ce patient</button>
            </div>
            {message && <p className="toast">{message}</p>}
            <ShareFloatingBar generating={generating} onShare={handleShare} onPrint={() => printInvoice()} />
          </div>
        )}

        {tab === 'history' && (
          <InvoiceHistory profile={profile} refreshKey={historyKey} onSelect={(s) => { setInvoice(s.invoice); setTab('invoice'); setShowWizard(false) }} onRepeat={requestRepeat} onDelete={() => setHistoryKey((k) => k + 1)} />
        )}

        {tab === 'stats' && <StatsDashboard profile={profile} />}

        {tab === 'settings' && (
          <ProfileSettings profile={profile} onSaved={refreshProfile} onLogout={handleLogout} />
        )}
      </main>

      <footer className="app-footer">
        <p>Espace privé · Enregistrement automatique</p>
      </footer>

      <FullscreenPreview open={fullscreen} onClose={() => setFullscreen(false)}>
        {invoice && <InvoicePreview profile={profile} invoice={invoice} />}
        {invoice && (
          <button type="button" className="btn-primary fullscreen-print" onClick={() => printInvoice()}>
            Imprimer
          </button>
        )}
      </FullscreenPreview>

      <RepeatInvoiceModal
        stored={repeatTarget}
        childPrice={profile.childPrice}
        adultPrice={profile.adultPrice}
        onClose={() => setRepeatTarget(null)}
        onConfirm={(date) => repeatTarget && handleRepeat(repeatTarget, date)}
      />
    </div>
  )
}

export default App
